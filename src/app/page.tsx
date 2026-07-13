'use client';

import { useState } from 'react';
import { parseKoreanVoice } from '@/utils/nlp';

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('마이크 버튼을 누르고 교육 일정을 말해주세요.');

  const handleMicClick = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert('음성 인식을 지원하지 않는 브라우저입니다. 안드로이드는 Chrome, 아이폰은 Safari를 이용해주세요.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1; // 모바일 최적화 옵션
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setVoiceText('듣고 있습니다...');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceText(`인식됨: "${transcript}"`);
      setIsRecording(false);
      
      // 자체 NLP 엔진으로 분석
      const parsedData = parseKoreanVoice(transcript);
      console.log('분석 결과:', parsedData);
      
      if (parsedData.intent === 'SEARCH') {
        const msg = `${parsedData.searchDate} 일정을 검색합니다.`;
        const utterance = new SpeechSynthesisUtterance(msg);
        utterance.lang = 'ko-KR';
        window.speechSynthesis.speak(utterance);
        alert(msg);
      } else {
        setVoiceText('일정을 구글 캘린더와 시트에 저장하는 중...');
        
        // 캘린더에 저장
        fetch('/api/calendar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedData)
        })
        .then(res => res.json())
        .then(calendarRes => {
          if (calendarRes.success) {
            // 시트에 기록 (강사료 계산 로직)
            const duration = parsedData.duration || 2;
            const isDibe = parsedData.course?.includes('디베') || transcript.includes('디베');
            
            let hourlyRate = 30000;
            let basePay = 0;
            let totalFee = duration * hourlyRate;
            
            // '디베' 일정이면 기본급(12,100 * 0.5 = 6050원)을 2시간 단위(각각)로 추가
            if (isDibe) {
              const blocks = Math.ceil(duration / 2); // 2시간당 1블럭
              basePay = 12100 * 0.5; // 6050원
              totalFee = (duration * hourlyRate) + (blocks * basePay);
            }

            const feeData = {
              ...parsedData,
              duration: duration,
              fee: hourlyRate,
              basePay: isDibe ? basePay : 0,
              totalFee: totalFee
            };
            
            return fetch('/api/sheets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(feeData)
            });
          } else {
            throw new Error('캘린더 저장 실패');
          }
        })
        .then(res => res.json())
        .then(sheetsRes => {
          if (sheetsRes.success) {
            setVoiceText('✅ 캘린더 및 시트 등록이 완료되었습니다!');
            alert('일정이 성공적으로 등록되고 강사료가 기록되었습니다.');
          } else {
            throw new Error('시트 저장 실패');
          }
        })
        .catch(err => {
          console.error(err);
          setVoiceText('❌ 저장 중 오류가 발생했습니다.');
        });
      }
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      if (event.error !== 'no-speech') {
        setVoiceText(`오류 발생: ${event.error}`);
        alert(`마이크 권한 오류가 발생했습니다 (${event.error}). 브라우저 설정에서 마이크를 허용해주시거나 Chrome 브라우저를 이용해주세요.`);
      } else {
        setVoiceText('마이크 버튼을 누르고 교육 일정을 말해주세요.');
      }
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

      {/* Stats Row (Desktop mainly, 2x2 on Mobile) */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-title">이번 달 교육 일정</span>
          <span className="stat-value">0<span style={{fontSize: '1rem'}}>건</span></span>
          <span className="stat-sub">예정 0건 / 완료 0건</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">이번 달 총 교육시간</span>
          <span className="stat-value">0<span style={{fontSize: '1rem'}}>시간</span></span>
          <span className="stat-sub" style={{color: 'var(--text-muted)'}}>데이터 없음</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">이번 달 총 강사료</span>
          <span className="stat-value">0<span style={{fontSize: '1rem'}}>원</span></span>
          <span className="stat-sub" style={{color: 'var(--text-muted)'}}>데이터 없음</span>
        </div>
        <div className="stat-card">
          <span className="stat-title">미정산 금액</span>
          <span className="stat-value" style={{color: 'var(--warning)'}}>0<span style={{fontSize: '1rem'}}>원</span></span>
          <span className="stat-sub">정산 필요 0건</span>
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
