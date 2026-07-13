export default function SettingsPage() {
  return (
    <div>
      <div className="top-bar">
        <h1>설정</h1>
      </div>
      <div className="stat-card" style={{marginTop: '20px'}}>
        <h3 style={{marginBottom: '15px'}}>환경 설정</h3>
        
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #eee'}}>
          <span>구글 캘린더 자동 연동</span>
          <span style={{color: 'var(--primary)', fontWeight: 'bold'}}>활성화 됨 (ON)</span>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #eee'}}>
          <span>구글 시트 자동 저장</span>
          <span style={{color: 'var(--primary)', fontWeight: 'bold'}}>활성화 됨 (ON)</span>
        </div>
        <div style={{display: 'flex', justifyContent: 'space-between', padding: '15px 0'}}>
          <span>버전 정보</span>
          <span style={{color: 'var(--text-muted)'}}>v1.0.0 (최신)</span>
        </div>
        
      </div>
    </div>
  );
}
