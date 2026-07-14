'use client';

import { useState, useEffect, useRef } from 'react';
import { parseKoreanVoice } from '@/utils/nlp';
import { getMonthlyStats, saveEventToLocal } from '@/utils/storage';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('마이크 버튼을 누르고 교육 일정을 말해주세요.');
  
  const [stats, setStats] = useState({ count: 0, totalDuration: 0, totalFee: 0 });
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // 현재 달(예: '2026-07') 기준으로 통계 불러오기
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setStats(getMonthlyStats(monthStr));
  }, []);

  const handleMicClick = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      setVoiceText('음성 인식을 중지했습니다.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('음성 인식을 지원하지 않는 브라우저입니다. 안드로이드는 Chrome, 아이폰은 Safari를 이용해주세요.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsRecording(true);
      setVoiceText('듣고 있습니다... 마이크를 다시 누르면 정지됩니다.');
    };

    recognition.onresult = (event: any) => {
      const lastIndex = event.results.length - 1;
      const transcript = event.results[lastIndex][0].transcript;
      setVoiceText(`인식됨: "${transcript}"`);
      
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

        setVoiceText('✅ 일정이 저장되었습니다! (마이크를 다시 눌러 정지할 수 있습니다)');

        fetch('/api/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feeData)
        }).catch(e => console.log('시트 에러 무시', e));
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== 'no-speech') {
        setIsRecording(false);
        setVoiceText(`오류 발생: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  return (
    <div>
      <div className="top-bar">
        <h1>대시보드</h1>
        <button className="btn-primary" onClick={handleMicClick}>
          <i className="material-icons">add</i> 음성으로 일정 등록
        </button>
      </div>

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

      {/* Voice Mic Section */}
      <div className="mic-section">
        <h3 style={{fontSize: '1.2rem', marginBottom: '10px'}}>음성으로 교육 일정 등록</h3>
        <p className="grey-text" style={{color: 'var(--text-muted)'}}>{voiceText}</p>
        
        <button 
          className={`mic-btn-huge ${isRecording ? 'recording' : ''}`}
          onClick={handleMicClick}
        >
          <i className="material-icons">mic</i>
        </button>

        <div style={{marginTop: '20px', textAlign: 'left', background: '#f9f9f9', padding: '15px', borderRadius: '8px', display: 'inline-block', minWidth: '300px'}}>
          <p style={{fontSize: '0.9rem', marginBottom: '5px'}}><b>예시</b></p>
          <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px'}}>
            "7월 18일 오후 2시부터 4시까지<br/>연산4동 행정복지센터에서<br/>스마트폰 기초교육 등록해줘"
          </p>
          <p style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>
            "오늘 일정이 어떻게 돼?"
          </p>
        </div>
      </div>
      
      <div style={{textAlign: 'center', marginTop: '50px', color: 'var(--text-muted)'}}>
        <p>※ 캘린더 연동 및 시트 저장 기능 작업 중...</p>
      </div>

    </div>
  );
}
