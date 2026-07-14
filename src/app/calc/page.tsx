'use client';

import { useState, useEffect } from 'react';
import { getMonthlyStats, getLocalEvents, ScheduleEvent } from '@/utils/storage';

export default function CalcPage() {
  const [stats, setStats] = useState({ count: 0, totalDuration: 0, totalFee: 0 });
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [dibePeriod, setDibePeriod] = useState({ label: '', total: 0 });
  const [listLimit, setListLimit] = useState(5);
  const [dibeStart, setDibeStart] = useState('');
  const [dibeEnd, setDibeEnd] = useState('');

  useEffect(() => {
    const now = new Date();
    let dStartMonth = now.getMonth();
    let dStartYear = now.getFullYear();
    if (now.getDate() < 15) {
      dStartMonth -= 1;
      if (dStartMonth < 0) { dStartMonth = 11; dStartYear -= 1; }
    }
    const defStart = `${dStartYear}-${String(dStartMonth+1).padStart(2,'0')}-15`;
    
    let dEndMonth = dStartMonth + 1;
    let dEndYear = dStartYear;
    if (dEndMonth > 11) { dEndMonth = 0; dEndYear += 1; }
    const defEnd = `${dEndYear}-${String(dEndMonth+1).padStart(2,'0')}-14`;
    
    setDibeStart(defStart);
    setDibeEnd(defEnd);
  }, []);

  useEffect(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setStats(getMonthlyStats(monthStr));
    
    const all = getLocalEvents();
    setEvents(all.filter(e => e.date.startsWith(monthStr)));

    if (dibeStart && dibeEnd) {
      let dibePeriodTotal = 0;
      all.forEach(e => {
        if (e.institution?.includes('디베')) {
          if (e.date >= dibeStart && e.date <= dibeEnd) {
            dibePeriodTotal += (typeof e.totalFee === 'number' ? e.totalFee : (parseInt(e.totalFee as string) || 0));
          }
        }
      });
      setDibePeriod({ label: `${dibeStart} ~ ${dibeEnd}`, total: dibePeriodTotal });
    }
  }, [dibeStart, dibeEnd]);

  return (
    <div>
      <div className="top-bar">
        <h1>강사료 계산</h1>
      </div>

      <div className="stat-card" style={{marginBottom: '20px', background: 'var(--primary)', color: 'white'}}>
        <h3 style={{marginBottom: '10px'}}>이번 달 총 예상 강사료</h3>
        <div style={{fontSize: '2rem', fontWeight: 'bold'}}>{stats.totalFee.toLocaleString()}원</div>
        <p style={{marginTop: '10px', opacity: 0.9}}>총 {stats.count}건 / {stats.totalDuration}시간 교육 진행</p>
      </div>

      <div className="stat-card" style={{marginBottom: '20px', background: '#fff3e0', border: '1px solid #ff9800'}}>
        <h3 style={{marginBottom: '10px', color: '#e65100'}}>디베 정산 기간 합계</h3>
        <div style={{display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center'}}>
          <input type="date" value={dibeStart} onChange={e => setDibeStart(e.target.value)} style={{padding: '5px', borderRadius: '4px', border: '1px solid #ccc', flex: 1}}/>
          <span style={{color: '#e65100'}}>~</span>
          <input type="date" value={dibeEnd} onChange={e => setDibeEnd(e.target.value)} style={{padding: '5px', borderRadius: '4px', border: '1px solid #ccc', flex: 1}}/>
        </div>
        <div style={{fontSize: '1.8rem', fontWeight: 'bold', color: '#ff9800'}}>{dibePeriod.total.toLocaleString()}원</div>
        <div style={{marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #ffb74d', display: 'flex', justifyContent: 'space-between', color: '#e65100'}}>
          <span>고용보험 (0.9%)</span>
          <span>-{Math.floor(dibePeriod.total * 0.009).toLocaleString()}원</span>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2rem', color: '#e65100', marginTop: '5px'}}>
          <span>실수령액</span>
          <span>{Math.floor(dibePeriod.total * 0.991).toLocaleString()}원</span>
        </div>
      </div>

      <div className="stat-card">
        <h3 style={{marginBottom: '15px', borderBottom: '2px solid #eee', paddingBottom: '10px'}}>강사료 상세 내역</h3>
        
        {events.length === 0 ? (
          <p style={{color: '#999', textAlign: 'center', padding: '20px 0'}}>이번 달 등록된 일정이 없습니다.</p>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
            {events.slice().reverse().slice(0, listLimit).map(e => {
              const isDibe = Number(e.basePay) > 0;
              return (
                <div key={e.id} style={{background: '#f9f9f9', padding: '15px', borderRadius: '8px', borderLeft: isDibe ? '4px solid #ff9800' : '4px solid #ccc'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <strong style={{fontSize: '1.1rem'}}>{e.course}</strong>
                    <span style={{color: '#666'}}>{e.date}</span>
                  </div>
                  <div style={{color: '#555', marginBottom: '10px'}}>{e.institution} | {e.duration}시간 ({e.start}~{e.end})</div>
                  
                  <div style={{background: '#fff', padding: '10px', borderRadius: '5px', fontSize: '0.9rem'}}>
                    {e.fee === '' ? (
                      <div style={{display: 'flex', justifyContent: 'space-between', color: '#888'}}>
                        <span>강사료 미지정</span>
                        <span>-</span>
                      </div>
                    ) : (
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px'}}>
                        <span>기본 강사료 ({e.duration}시간 × {Number(e.fee).toLocaleString()}원)</span>
                        <span>{((e.duration || 0) * Number(e.fee)).toLocaleString()}원</span>
                      </div>
                    )}
                    {isDibe && (
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#ff9800'}}>
                        <span>디베 기본급 (2시간당 6,050원)</span>
                        <span>+{Number(e.basePay).toLocaleString()}원</span>
                      </div>
                    )}
                    <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee', fontWeight: 'bold', fontSize: '1rem', color: 'var(--primary)'}}>
                      <span>합계</span>
                      <span>{e.totalFee === '' ? '미정' : `${Number(e.totalFee).toLocaleString()}원`}</span>
                    </div>
                    {!isDibe && e.totalFee !== '' && (
                      <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '5px', fontSize: '0.9rem', color: '#00897b'}}>
                        <span>실수령액 (3.3% 공제)</span>
                        <span>{Math.floor(Number(e.totalFee) * 0.967).toLocaleString()}원</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {events.length > listLimit && (
              <button onClick={() => setListLimit(listLimit + 5)} style={{width: '100%', padding: '12px', marginTop: '10px', background: 'white', border: '1px solid #ccc', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', color: '#555'}}>
                더보기 ∨
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
