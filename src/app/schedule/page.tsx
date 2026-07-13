'use client';

import { useState, useEffect } from 'react';
import { parseKoreanVoice } from '@/utils/nlp';
import { saveEventToLocal, getLocalEvents, ScheduleEvent } from '@/utils/storage';

export default function SchedulePage() {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('마이크 버튼을 누르고 일정을 말해주세요.');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [events, setEvents] = useState<ScheduleEvent[]>([]);

  useEffect(() => {
    setEvents(getLocalEvents());
  }, []);

  // 수동 입력 폼 상태
  const [manualForm, setManualForm] = useState({
    date: new Date().toISOString().split('T')[0],
    start: '14:00',
    end: '16:00',
    course: '',
    institution: ''
  });

  const handleMicClick = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('음성 인식을 지원하지 않는 브라우저입니다. 스마트폰의 Chrome 브라우저를 이용해주세요.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setVoiceText('듣고 있습니다...');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceText(`인식됨: "${transcript}"`);
      setIsRecording(false);
      
      const parsedData = parseKoreanVoice(transcript);
      
      setVoiceText('일정을 시트에 자동 기록하는 중...');
      
      const duration = parsedData.duration || 2;
      const isDibe = parsedData.course?.includes('디베') || transcript.includes('디베');
      let hourlyRate = 30000;
      let basePay = 0;
      let totalFee = duration * hourlyRate;
      
      if (isDibe) {
        const blocks = Math.ceil(duration / 2);
        basePay = 12100 * 0.5;
        totalFee = (duration * hourlyRate) + (blocks * basePay);
      }

      const feeData = {
        ...parsedData,
        date: parsedData.date || new Date().toISOString().split('T')[0],
        start: parsedData.start || '09:00',
        end: parsedData.end || '11:00',
        duration, fee: hourlyRate, basePay: isDibe ? basePay : 0, totalFee
      };
      
      fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feeData)
      }).then(async res => {
        const data = await res.json();
        if (!data.success) throw new Error(`[시트 에러] ${data.error || data.message || '알 수 없는 에러'}`);
        return data;
      })
      .then(sheetsRes => {
        saveEventToLocal(feeData as any);
        setEvents(getLocalEvents());
        setVoiceText('✅ 시트 등록 및 내 캘린더 저장 완료!');
        alert('일정이 성공적으로 등록되었습니다.');
      })
      .catch(err => {
        console.error(err);
        setVoiceText(`❌ 에러: ${err.message}`);
        alert(`에러 원인: ${err.message}`);
      });
    };

    recognition.onerror = (event: any) => {
      setIsRecording(false);
      if (event.error !== 'no-speech') {
        setVoiceText(`오류 발생: ${event.error}`);
        alert(`마이크 권한 오류 (${event.error}). 폰의 Chrome 브라우저에서 마이크 접근을 허용해주세요.`);
      } else {
        setVoiceText('마이크 버튼을 누르고 일정을 말해주세요.');
      }
    };

    recognition.start();
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.course || !manualForm.institution) {
      alert('과정명과 기관명을 입력해주세요.');
      return;
    }

    const startH = parseInt(manualForm.start.split(':')[0]);
    const endH = parseInt(manualForm.end.split(':')[0]);
    const duration = Math.max(1, endH - startH);

    const parsedData = {
      date: manualForm.date,
      start: manualForm.start,
      end: manualForm.end,
      duration: duration,
      course: manualForm.course,
      institution: manualForm.institution,
      location: manualForm.institution
    };

    setVoiceText('구글 캘린더와 시트에 수동 일정을 저장하는 중...');
    
    fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsedData)
    })
    .then(async res => {
      const data = await res.json();
      if (!data.success) throw new Error(`[캘린더 에러] ${data.error || data.message || '알 수 없는 에러'}`);
      return data;
    })
    .then(calendarRes => {
      const isDibe = parsedData.course?.includes('디베') || parsedData.institution?.includes('디베');
      let hourlyRate = 30000;
      let basePay = 0;
      let totalFee = duration * hourlyRate;
      
      if (isDibe) {
        const blocks = Math.ceil(duration / 2);
        basePay = 12100 * 0.5;
        totalFee = (duration * hourlyRate) + (blocks * basePay);
      }

      const feeData = {
        ...parsedData, duration, fee: hourlyRate, basePay: isDibe ? basePay : 0, totalFee
      };
      
      return fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feeData)
      }).then(async res => {
        const data = await res.json();
        if (!data.success) throw new Error(`[시트 에러] ${data.error || data.message || '알 수 없는 에러'}`);
        
        // 로컬에 저장
        saveEventToLocal(feeData as any);
        setEvents(getLocalEvents());
        return data;
      });
    })
    .then(sheetsRes => {
      setVoiceText('✅ 캘린더 및 시트 수동 등록 완료!');
      alert('일정이 구글 캘린더와 시트에 성공적으로 동기화되었습니다.');
      setManualForm({...manualForm, course: '', institution: ''}); // 폼 초기화
    })
    .catch(err => {
      console.error(err);
      setVoiceText(`❌ 에러: ${err.message}`);
      alert(`에러 원인: ${err.message}`);
    });
  };

  // 7월 달력 렌더링용 배열
  const daysInMonth = Array.from({length: 31}, (_, i) => i + 1);

  return (
    <div>
      <div className="top-bar">
        <h1>일정 관리</h1>
      </div>

      <div className="mic-section" style={{marginBottom: '20px'}}>
        <h3 style={{fontSize: '1.2rem', marginBottom: '10px'}}>음성으로 시트에 바로 등록</h3>
        <p className="grey-text" style={{color: 'var(--text-muted)'}}>{voiceText}</p>
        <p style={{fontSize: '0.8rem', color: 'var(--primary)'}}>※ 음성 등록은 에러 방지를 위해 캘린더를 건너뛰고 시트에만 즉시 저장됩니다.</p>
        
        <button 
          className={`mic-btn-huge ${isRecording ? 'recording' : ''}`}
          onClick={handleMicClick}
        >
          <i className="material-icons">mic</i>
        </button>
      </div>

      <div className="stat-card" style={{marginBottom: '20px'}}>
        <h3 style={{marginBottom: '15px'}}>수동으로 구글 캘린더/시트 동기화</h3>
        <form onSubmit={handleManualSubmit} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          <input type="date" value={manualForm.date} onChange={e => setManualForm({...manualForm, date: e.target.value})} style={{padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}} />
          <div style={{display: 'flex', gap: '10px'}}>
            <input type="time" value={manualForm.start} onChange={e => setManualForm({...manualForm, start: e.target.value})} style={{flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}} />
            <span style={{lineHeight: '40px'}}>~</span>
            <input type="time" value={manualForm.end} onChange={e => setManualForm({...manualForm, end: e.target.value})} style={{flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}} />
          </div>
          <input type="text" placeholder="과정명 (예: 스마트폰 기초, 디베)" value={manualForm.course} onChange={e => setManualForm({...manualForm, course: e.target.value})} style={{padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}} />
          <input type="text" placeholder="기관명 (예: 연산4동)" value={manualForm.institution} onChange={e => setManualForm({...manualForm, institution: e.target.value})} style={{padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}} />
          <button type="submit" className="btn-primary" style={{width: '100%', padding: '15px', marginTop: '10px', fontSize: '1rem', fontWeight: 'bold'}}>
            📅 일정을 구글캘린더로 보내줘
          </button>
        </form>
      </div>

      <div className="stat-card">
        <h3 style={{marginBottom: '15px'}}>이번 달 일정 달력</h3>
        <div style={{
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: '5px',
          textAlign: 'center'
        }}>
          {['일', '월', '화', '수', '목', '금', '토'].map(day => (
            <div key={day} style={{fontWeight: 'bold', color: 'var(--text-muted)'}}>{day}</div>
          ))}
          {/* 공백 3칸 */}
          <div/><div/><div/>
          {daysInMonth.map(day => {
            const dateStr = `2026-07-${String(day).padStart(2, '0')}`;
            const hasEvent = events.some(e => e.date === dateStr);
            const isToday = day === new Date().getDate();

            return (
              <div key={day} style={{
                padding: '10px 0', 
                borderRadius: '5px', 
                background: isToday ? 'var(--primary)' : '#f9f9f9',
                color: isToday ? 'white' : 'black',
                position: 'relative',
                cursor: 'pointer'
              }}>
                {day}
                {hasEvent && (
                  <div style={{
                    position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)',
                    width: '6px', height: '6px', borderRadius: '50%', background: isToday ? 'white' : 'var(--primary)'
                  }}></div>
                )}
              </div>
            );
          })}
        </div>
        
        {/* 선택한 날짜 일정 표시 */}
        <div style={{marginTop: '20px'}}>
          <h4 style={{borderBottom: '1px solid #eee', paddingBottom: '10px'}}>내 일정 리스트 (최근 순)</h4>
          {events.slice().reverse().map(e => (
            <div key={e.id} style={{padding: '10px', background: '#f5f5f5', borderRadius: '5px', marginTop: '10px', textAlign: 'left'}}>
              <strong>{e.date} {e.start}</strong> - {e.course} ({e.institution})<br/>
              <span style={{fontSize: '0.85rem', color: '#666'}}>강사료: {e.totalFee?.toLocaleString()}원</span>
            </div>
          ))}
          {events.length === 0 && <p style={{fontSize: '0.9rem', color: '#999', marginTop: '10px'}}>저장된 일정이 없습니다.</p>}
        </div>
      </div>
    </div>
  );
}
