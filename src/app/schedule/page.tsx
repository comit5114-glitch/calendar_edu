'use client';

import { useState, useEffect, useRef } from 'react';
import { parseKoreanVoice } from '@/utils/nlp';
import { saveEventToLocal, getLocalEvents, ScheduleEvent, deleteEventFromLocal, updateEventInLocal } from '@/utils/storage';

export default function SchedulePage() {
  const [isRecording, setIsRecording] = useState(false);
  const [voiceText, setVoiceText] = useState('마이크 버튼을 누르고 일정을 말해주세요.');
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    setEvents(getLocalEvents());
  }, []);

  // 수동 입력 폼 상태
  const [manualForm, setManualForm] = useState({
    date: new Date().toISOString().split('T')[0],
    start: '14:00',
    end: '16:00',
    institution: '',
    course: '',
    repeat: '없음',
    notification: '없음'
  });

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
      alert('음성 인식을 지원하지 않는 브라우저입니다. 스마트폰의 Chrome 브라우저를 이용해주세요.');
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
        duration, fee: hourlyRate, basePay: isDibe ? basePay : 0, totalFee, formula, dibeSumFormula
      };
      
      saveEventToLocal(feeData as any);
      setEvents(getLocalEvents());
      setVoiceText('✅ 일정이 저장되었습니다! (마이크를 다시 눌러 정지할 수 있습니다)');
      
      fetch('/api/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feeData)
      }).catch(e => console.log('시트 API 에러 무시', e));
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
      institution: manualForm.institution,
      course: manualForm.course,
      location: manualForm.institution,
      repeat: manualForm.repeat,
      notification: manualForm.notification
    };

    const isDibe = parsedData.institution?.includes('디베');
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

      const rDate = new Date(parsedData.date);
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
    }

    const feeData = {
      ...parsedData, duration, fee: hourlyRate, basePay: isDibe ? basePay : 0, totalFee, formula, dibeSumFormula
    };

    if (editId) {
      updateEventInLocal(editId, feeData as any);
      setEditId(null);
      setVoiceText('✅ 일정 수정 완료!');
      alert('일정이 성공적으로 수정되었습니다.');
    } else {
      saveEventToLocal(feeData as any);
      setVoiceText('✅ 수동 일정 등록 완료!');
      alert('일정이 성공적으로 등록되었습니다.');
    }
    
    setEvents(getLocalEvents());
    setManualForm({...manualForm, course: '', institution: '', repeat: '없음', notification: '없음'});

    fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsedData)
    }).catch(e => console.log('캘린더 에러 무시', e));

    fetch('/api/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feeData)
    }).catch(e => console.log('시트 에러 무시', e));
  };

  const handleDeleteEvent = (id: string) => {
    if (confirm('이 일정을 앱에서 삭제하시겠습니까?\n(※ 구글 시트에 전송된 기록은 수동으로 지워주셔야 합니다)')) {
      deleteEventFromLocal(id);
      setEvents(getLocalEvents());
    }
  };

  const handleEditEvent = (event: ScheduleEvent) => {
    setEditId(event.id);
    setManualForm({
      date: event.date,
      start: event.start,
      end: event.end,
      institution: event.institution,
      course: event.course,
      repeat: event.repeat || '없음',
      notification: event.notification || '없음'
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setVoiceText('선택한 일정을 폼으로 불러왔습니다. 수정 후 저장 버튼을 누르면 업데이트됩니다.');
  };

  // 7월 달력 렌더링용 배열
  const daysInMonth = Array.from({length: 31}, (_, i) => i + 1);

  return (
    <div>
      <div className="top-bar">
        <h1>일정 관리</h1>
      </div>

      <div className="stat-card" style={{marginBottom: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
          <h3 style={{margin: 0}}>이번 달 일정 달력</h3>
          <button 
            onClick={handleMicClick} 
            className={`mic-btn-small ${isRecording ? 'recording' : ''}`}
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
        
        {voiceText !== '마이크 버튼을 누르고 일정을 말해주세요.' && (
          <p style={{color: 'var(--primary)', fontSize: '0.9rem', marginBottom: '15px', padding: '10px', background: '#e6f7ff', borderRadius: '5px'}}>
            {voiceText}
          </p>
        )}

        <div style={{
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          gap: '5px',
          textAlign: 'center'
        }}>
          {['일', '월', '화', '수', '목', '금', '토'].map(day => (
            <div key={day} style={{fontWeight: 'bold', color: 'var(--text-muted)'}}>{day}</div>
          ))}
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
        
        <div style={{marginTop: '20px'}}>
          <h4 style={{borderBottom: '1px solid #eee', paddingBottom: '10px'}}>내 일정 리스트 (최근 순)</h4>
          {events.slice().reverse().map(e => (
            <div key={e.id} style={{padding: '10px', background: '#f5f5f5', borderRadius: '5px', marginTop: '10px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '5px'}}>
              <div>
                <strong>{e.date} {e.start}</strong> - {e.course} ({e.institution})
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span style={{fontSize: '0.85rem', color: '#666'}}>강사료: {e.totalFee?.toLocaleString()}원</span>
                <div>
                  <button onClick={() => handleEditEvent(e)} style={{padding: '4px 8px', marginRight: '5px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer', fontSize: '0.8rem'}}>수정</button>
                  <button onClick={() => handleDeleteEvent(e.id)} style={{padding: '4px 8px', border: 'none', borderRadius: '4px', background: '#ff4d4f', color: 'white', cursor: 'pointer', fontSize: '0.8rem'}}>삭제</button>
                </div>
              </div>
            </div>
          ))}
          {events.length === 0 && <p style={{fontSize: '0.9rem', color: '#999', marginTop: '10px'}}>저장된 일정이 없습니다.</p>}
        </div>
      </div>

      <div className="stat-card" style={{marginBottom: '20px'}}>
        <h3 style={{marginBottom: '15px'}}>{editId ? '일정 수정' : '수동으로 일정 등록'}</h3>
        <form onSubmit={handleManualSubmit} style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
          {/* 1. 날짜 */}
          <input type="date" value={manualForm.date} onChange={e => setManualForm({...manualForm, date: e.target.value})} style={{padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}} />
          
          {/* 2. 시간 */}
          <div style={{display: 'flex', gap: '10px'}}>
            <input type="time" value={manualForm.start} onChange={e => setManualForm({...manualForm, start: e.target.value})} style={{flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}} />
            <span style={{lineHeight: '40px'}}>~</span>
            <input type="time" value={manualForm.end} onChange={e => setManualForm({...manualForm, end: e.target.value})} style={{flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}} />
          </div>

          {/* 3. 기관명 */}
          <input type="text" placeholder="기관명 (예: 연산4동)" value={manualForm.institution} onChange={e => setManualForm({...manualForm, institution: e.target.value})} style={{padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}} />

          {/* 4. 과정명 */}
          <input type="text" placeholder="과정명 (예: 스마트폰 기초, 디베)" value={manualForm.course} onChange={e => setManualForm({...manualForm, course: e.target.value})} style={{padding: '10px', borderRadius: '5px', border: '1px solid #ccc'}} />
          
          {/* 5. 반복설정 */}
          <select value={manualForm.repeat} onChange={e => setManualForm({...manualForm, repeat: e.target.value})} style={{padding: '10px', borderRadius: '5px', border: '1px solid #ccc', background: 'white'}}>
            <option value="없음">반복 없음</option>
            <option value="매주">매주 반복</option>
            <option value="매월">매월 반복</option>
          </select>

          {/* 6. 알림설정 */}
          <select value={manualForm.notification} onChange={e => setManualForm({...manualForm, notification: e.target.value})} style={{padding: '10px', borderRadius: '5px', border: '1px solid #ccc', background: 'white'}}>
            <option value="없음">알림 없음</option>
            <option value="10분전">10분 전</option>
            <option value="30분전">30분 전</option>
            <option value="1시간전">1시간 전</option>
            <option value="1일전">1일 전</option>
          </select>

          <button type="submit" className="btn-primary" style={{width: '100%', padding: '15px', marginTop: '10px', fontSize: '1rem', fontWeight: 'bold'}}>
            {editId ? '💾 일정 수정 저장' : '📅 일정 등록 저장'}
          </button>
          {editId && (
            <button type="button" onClick={() => { setEditId(null); setManualForm({...manualForm, course: '', institution: '', repeat: '없음', notification: '없음'}); }} className="btn-secondary" style={{width: '100%', padding: '15px', fontSize: '1rem', background: '#ccc', color: '#333', border: 'none', borderRadius: '5px', marginTop: '5px'}}>
              취소
            </button>
          )}
        </form>
      </div>

    </div>
  );
}
