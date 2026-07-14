'use client';

import { useState, useEffect, useRef } from 'react';
import { parseKoreanVoice } from '@/utils/nlp';
import { getMonthlyStats, saveEventToLocal, getLocalEvents, ScheduleEvent } from '@/utils/storage';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('마이크 버튼을 누르고 교육 일정을 말해주세요.');
  
  const [stats, setStats] = useState({ count: 0, totalDuration: 0, totalFee: 0 });
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');

  useEffect(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setStats(getMonthlyStats(monthStr));
    setEvents(getLocalEvents());
  }, []);

  const processVoiceCommand = (transcript: string) => {
      const parsedData = parseKoreanVoice(transcript);
      console.log('분석 결과:', parsedData);
      
      if (parsedData.intent === 'SEARCH') {
        const msg = `${parsedData.searchDate} 일정을 검색합니다.`;
        const utterance = new SpeechSynthesisUtterance(msg);
        utterance.lang = 'ko-KR';
        window.speechSynthesis.speak(utterance);
        alert(msg);
      } else {
        const duration = parsedData.duration || 2;
        const isDibe = parsedData.institution?.includes('디베') || transcript.includes('디베');
        
        let hourlyRate: number | string = '';
        let basePay: number | string = '';
        let totalFee: number | string = '';
        let formula = '';
        let dibeSumFormula = '';
        
        if (isDibe) {
          hourlyRate = 30000;
          const blocks = Math.ceil(duration / 2);
          basePay = 6050 * blocks;
          totalFee = (duration * hourlyRate) + basePay;
          formula = `=(${duration}*30000)+(${blocks}*6050)`;
          
          const rDate = new Date(parsedData.date || new Date().toISOString().split('T')[0]);
          let sMonth = rDate.getMonth();
          let sYear = rDate.getFullYear();
          if (rDate.getDate() < 15) {
            sMonth -= 1;
            if (sMonth < 0) { sMonth = 11; sYear -= 1; }
          }
          const sDate = `${sYear}-${String(sMonth + 1).padStart(2, '0')}-15`;
          let eMonth = sMonth + 1;
          let eYear = sYear;
          if (eMonth > 11) { eMonth = 0; eYear += 1; }
          const eDate = `${eYear}-${String(eMonth + 1).padStart(2, '0')}-14`;
          dibeSumFormula = `=SUMIFS(I:I, B:B, "*디베*", A:A, ">=${sDate}", A:A, "<=${eDate}")`;
        } else if (parsedData.fee) {
          hourlyRate = parsedData.fee;
          basePay = 0;
          totalFee = duration * Number(hourlyRate);
          formula = `=${duration}*${hourlyRate}`;
        }

        const feeData = {
          ...parsedData,
          date: parsedData.date || new Date().toISOString().split('T')[0],
          start: parsedData.start || '09:00',
          end: parsedData.end || '11:00',
          duration: duration,
          fee: hourlyRate,
          basePay: isDibe ? basePay : 0,
          totalFee: totalFee,
          formula: formula,
          dibeSumFormula: dibeSumFormula
        };
        
        saveEventToLocal(feeData as any);
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        setStats(getMonthlyStats(monthStr));
        setEvents(getLocalEvents());

        setVoiceText('✅ 일정이 정상적으로 등록되었습니다!');

        fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feeData)
        }).catch(e => console.log('시트 에러 무시', e));
      }
  };

  const handleMicClick = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      if (transcriptRef.current.trim().length > 0) {
        processVoiceCommand(transcriptRef.current);
      } else {
        setVoiceText('음성 인식을 중지했습니다.');
      }
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('음성 인식을 지원하지 않는 브라우저입니다. 안드로이드는 Chrome, 아이폰은 Safari를 이용해주세요.');
      return;
    }

    transcriptRef.current = '';
    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsRecording(true);
      setVoiceText('듣고 있습니다... 말씀을 모두 마치신 후 마이크를 한 번 더 눌러주세요.');
    };

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript + ' ';
      }
      transcriptRef.current = currentTranscript.trim();
      setVoiceText(`"${transcriptRef.current}"\n(완료 시 마이크를 다시 눌러주세요)`);
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        setIsRecording(false);
        setVoiceText(`오류 발생: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (isRecording) {
         setIsRecording(false);
         if (transcriptRef.current.trim().length > 0) {
            processVoiceCommand(transcriptRef.current);
         } else {
            setVoiceText('음성 인식이 종료되었습니다.');
         }
      }
    };

    recognition.start();
  };

  return (
    <div>
      <div className="top-bar">
        <h1>대시보드</h1>
        <button 
          className={`mic-btn-small ${isRecording ? 'recording' : ''}`}
          onClick={handleMicClick}
          style={{
            background: isRecording ? '#ff4d4f' : 'var(--primary)',
            color: 'white',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }}
        >
          <i className="material-icons">mic</i>
        </button>
      </div>

      {voiceText && voiceText !== '마이크 버튼을 누르고 교육 일정을 말해주세요.' && (
        <p style={{color: 'var(--primary)', fontSize: '0.9rem', marginBottom: '15px', padding: '10px', background: '#e6f7ff', borderRadius: '5px'}}>
          {voiceText}
        </p>
      )}

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-title">이번 달 교육 일정</span>
          <span className="stat-value">{stats.count}<span style={{fontSize: '1rem'}}>건</span></span>
          <span className="stat-sub" style={{color: 'var(--primary)'}}>나의 캘린더 연동됨</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">이번 달 총 교육시간</span>
          <span className="stat-value">{stats.totalDuration}<span style={{fontSize: '1rem'}}>시간</span></span>
        </div>
        <div className="stat-card">
          <span className="stat-title">이번 달 예상 강사료</span>
          <span className="stat-value">{stats.totalFee.toLocaleString()}<span style={{fontSize: '1rem'}}>원</span></span>
        </div>
        <div className="stat-card">
          <span className="stat-title">미정산 금액</span>
          <span className="stat-value" style={{color: 'var(--warning)'}}>0<span style={{fontSize: '1rem'}}>원</span></span>
        </div>
      </div>

      {/* Recent Events Section */}
      <div className="stat-card" style={{marginTop: '20px', marginBottom: '20px'}}>
        <h3 style={{marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px'}}>최근 등록한 일정</h3>
        {events.length === 0 ? (
          <p style={{fontSize: '0.9rem', color: '#999', textAlign: 'center', padding: '20px 0'}}>등록된 일정이 없습니다.</p>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            {events.slice(-5).reverse().map(e => (
              <div key={e.id} style={{padding: '12px', background: '#f5f5f5', borderRadius: '8px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '5px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                  <strong>{e.date} {e.start}~{e.end}</strong>
                  <span style={{fontSize: '0.85rem', color: '#666', background: '#e0e0e0', padding: '2px 6px', borderRadius: '4px'}}>{e.duration}시간</span>
                </div>
                <div style={{color: '#444'}}>
                  기관명: {e.institution} | 과정명: {e.course}
                </div>
                <div style={{fontSize: '0.85rem', color: '#666'}}>
                  반복일정: {e.repeat || '없음'} | 알림: {e.notification || '없음'}
                </div>
                <div style={{fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 'bold', alignSelf: 'flex-end'}}>
                  강사료: {e.totalFee === '' ? '미정' : `${Number(e.totalFee).toLocaleString()}원`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
