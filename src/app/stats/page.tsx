'use client';

import { useState, useEffect } from 'react';
import { getLocalEvents, ScheduleEvent } from '@/utils/storage';

export default function StatsPage() {
  const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
  const [institutionStats, setInstitutionStats] = useState<{name: string; total: number; count: number}[]>([]);
  const [totalSum, setTotalSum] = useState(0);

  useEffect(() => {
    const allEvents = getLocalEvents();
    const y = currentMonthDate.getFullYear();
    const m = String(currentMonthDate.getMonth() + 1).padStart(2, '0');
    const monthStr = `${y}-${m}`;

    // 디베를 제외하고, 해당 월(1일~말일)의 일정만 필터링
    const filteredEvents = allEvents.filter(e => 
      e.date.startsWith(monthStr) && 
      (!e.institution || !e.institution.includes('디베'))
    );

    const statsMap: Record<string, {total: number; count: number}> = {};
    let sum = 0;

    filteredEvents.forEach(e => {
      const instName = e.institution || '기타';
      if (!statsMap[instName]) {
        statsMap[instName] = { total: 0, count: 0 };
      }
      const fee = typeof e.totalFee === 'number' ? e.totalFee : (parseInt(e.totalFee as string) || 0);
      statsMap[instName].total += fee;
      statsMap[instName].count += 1;
      sum += fee;
    });

    const statsArray = Object.keys(statsMap).map(key => ({
      name: key,
      total: statsMap[key].total,
      count: statsMap[key].count
    })).sort((a, b) => b.total - a.total); // 내림차순 정렬

    setInstitutionStats(statsArray);
    setTotalSum(sum);
  }, [currentMonthDate]);

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1));
  };

  const calYear = currentMonthDate.getFullYear();
  const calMonth = currentMonthDate.getMonth() + 1;

  return (
    <div>
      <div className="top-bar">
        <h1>월별 기관 통계</h1>
      </div>

      <div className="stat-card" style={{marginBottom: '20px'}}>
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '20px'}}>
          <button onClick={handlePrevMonth} style={{background: '#f0f0f0', border: 'none', borderRadius: '5px', padding: '10px 15px', cursor: 'pointer', fontSize: '1rem'}}>◀</button>
          <h2 style={{margin: 0}}>{calYear}년 {calMonth}월</h2>
          <button onClick={handleNextMonth} style={{background: '#f0f0f0', border: 'none', borderRadius: '5px', padding: '10px 15px', cursor: 'pointer', fontSize: '1rem'}}>▶</button>
        </div>

        <div style={{background: 'var(--primary)', color: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center', marginBottom: '20px'}}>
          <h3 style={{margin: 0, opacity: 0.9, fontSize: '1.1rem'}}>총 강의료 합계 (디베 제외)</h3>
          <div style={{fontSize: '2.2rem', fontWeight: 'bold', marginTop: '10px'}}>{totalSum.toLocaleString()}원</div>
        </div>

        <h3 style={{borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '15px'}}>기관별 강의료 상세</h3>
        
        {institutionStats.length === 0 ? (
          <p style={{textAlign: 'center', color: '#999', padding: '20px 0'}}>이번 달에 등록된 기관별 일정이 없습니다.</p>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
            {institutionStats.map(stat => (
              <div key={stat.name} style={{background: '#f9f9f9', padding: '15px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid var(--primary)'}}>
                <div>
                  <strong style={{fontSize: '1.1rem'}}>{stat.name}</strong>
                  <div style={{color: '#666', fontSize: '0.9rem', marginTop: '5px'}}>총 {stat.count}건 진행</div>
                </div>
                <div style={{fontSize: '1.2rem', fontWeight: 'bold', color: '#333'}}>
                  {stat.total.toLocaleString()}원
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <p style={{textAlign: 'center', fontSize: '0.85rem', color: '#888', padding: '0 10px'}}>
        ※ '디베' 관련 일정은 정산 기간이 달라(15일~익월14일) 통계의 정확성을 위해 위 월별 합계(1일~말일)에서 제외됩니다.<br/>
        디베 정산 내역은 <strong>[강사료 계산]</strong> 메뉴를 참고해주세요.
      </p>
    </div>
  );
}
