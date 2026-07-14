'use client';

import { useState, useEffect, useRef } from 'react';
import { parseKoreanVoice } from '@/utils/nlp';
import { getMonthlyStats, saveEventToLocal, getLocalEvents, ScheduleEvent } from '@/utils/storage';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('마이크 버튼을 누르고 교육 일정을 말해주세요.');
  
  const [stats, setStats] = useState({ count: 0, totalDuration: 0, totalFee: 0 });
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [searchResults, setSearchResults] = useState<ScheduleEvent[] | null>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');

  useEffect(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setStats(getMonthlyStats(monthStr));
    setEvents(getLocalEvents());
  }, []);

  const processVoiceCommand = (transcript: string) => {
      // 대시보드 마이크는 '검색' 전용으로 사용
      let keyword = transcript.replace(/검색해줘|검색|찾아줘|보여줘|일정/g, '').trim();
      if (!keyword) {
         setVoiceText('검색어를 인식하지 못했습니다. 다시 말씀해주세요.');
         return;
      }

      const allEvents = getLocalEvents();
      const matchedEvents = allEvents.filter(e => 
         e.institution.includes(keyword) || 
         e.course.includes(keyword) || 
         e.date.includes(keyword)
      );

      setSearchResults(matchedEvents);
      
      const msg = `"${keyword}" 검색 결과, 총 ${matchedEvents.length}건이 있습니다.`;
      setVoiceText(msg);

      try {
         const utterance = new SpeechSynthesisUtterance(msg);
         utterance.lang = 'ko-KR';
         window.speechSynthesis.speak(utterance);
      } catch (e) {
         console.log(e);
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

      {/* Recent Events / Search Results Section */}
      <div className="stat-card" style={{marginTop: '20px', marginBottom: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px'}}>
           <h3 style={{margin: 0}}>{searchResults ? '검색 결과' : '최근 등록한 일정'}</h3>
           {searchResults && (
             <button onClick={() => setSearchResults(null)} style={{background: '#f0f0f0', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'}}>초기화</button>
           )}
        </div>
        
        {(searchResults || events).length === 0 ? (
          <p style={{fontSize: '0.9rem', color: '#999', textAlign: 'center', padding: '20px 0'}}>
            {searchResults ? '검색 결과가 없습니다.' : '등록된 일정이 없습니다.'}
          </p>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            {(searchResults || events.slice(-5).reverse()).map(e => (
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
