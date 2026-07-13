export default function StatsPage() {
  return (
    <div>
      <div className="top-bar">
        <h1>통계</h1>
      </div>
      <div className="stat-card" style={{marginTop: '20px', textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)'}}>
        <i className="material-icons" style={{fontSize: '48px', marginBottom: '10px', color: '#ccc'}}>bar_chart</i>
        <h2>통계 준비 중입니다.</h2>
        <p>추후 구글 시트에 쌓인 데이터를 바탕으로 예쁜 그래프가 제공될 예정입니다.</p>
      </div>
    </div>
  );
}
