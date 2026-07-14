'use client';

import { useState, useEffect } from 'react';
import { getMonthlyStats, getLocalEvents, ScheduleEvent } from '@/utils/storage';

export default function CalcPage() {
  const [stats, setStats] = useState({ count: 0, totalDuration: 0, totalFee: 0 });
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [dibePeriod, setDibePeriod] = useState({ label: '', total: 0 });
  const [listLimit, setListLimit] = useState(5);

  useEffect(() => {
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setStats(getMonthlyStats(monthStr));
    
    // 이번 달 이벤트만 필터링
    const all = getLocalEvents();
    setEvents(all.filter(e => e.date.startsWith(monthStr)));

    // 디베 15일~14일 정산 계산
    let dStartMonth = now.getMonth();
    let dStartYear = now.getFullYear();
    if (now.getDate() < 15) {
      dStartMonth -= 1;
      if (dStartMonth < 0) { dStartMonth = 11; dStartYear -= 1; }
    }
    const dibeStartDate = new Date(dStartYear, dStartMonth, 15);
    
    let dEndMonth = dStartMonth + 1;
    let dEndYear = dStartYear;
    if (dEndMonth > 11) { dEndMonth = 0; dEndYear += 1; }
    const dibeEndDate = new Date(dEndYear, dEndMonth, 14, 23, 59, 59);

    let dibePeriodTotal = 0;
    all.forEach(e => {
      if (e.institution?.includes('디베')) {
        const eDate = new Date(e.date);
        if (eDate >= dibeStartDate && eDate <= dibeEndDate) {
          dibePeriodTotal += (typeof e.totalFee === 'number' ? e.totalFee : (parseInt(e.totalFee as string) || 0));
        }
      }
    });

    const label = `${dStartYear}.${String(dStartMonth+1).padStart(2,'0')}.15 ~ ${dEndYear}.${String(dEndMonth+1).padStart(2,'0')}.14`;
    setDibePeriod({ label, total: dibePeriodTotal });
  }, []);

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
        <p style={{fontSize: '0.9rem', color: '#e65100', marginBottom: '10px'}}>{dibePeriod.label}</p>
        <div style={{fontSize: '1.8rem', fontWeight: 'bold', color: '#ff9800'}}>{dibePeriod.total.toLocaleString()}원</div>
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
