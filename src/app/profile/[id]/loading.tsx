import TopNav from "@/components/TopNav"

export default function ProfileLoading() {
  const bar = (w: string, h: number, mb = 0) => (
    <div style={{ width: w, height: h, background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: mb }} />
  );
  return (
    <>
      <TopNav />
      <div className="pf-page">
        <div className="pf-cover"></div>
        <div className="pf-container">
          <div className="pf-header">
            <div className="pf-avatar-wrapper" style={{ background: '#1C1C28' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div className="pf-header-info">
              {bar('200px', 24, 8)}
              {bar('150px', 14, 16)}
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                {bar('80px', 28)}{bar('80px', 28)}{bar('80px', 28)}
              </div>
              {bar('80%', 14, 8)}
              {bar('60%', 14, 16)}
              <div style={{ display: 'flex', gap: 24 }}>
                {bar('60px', 14)}{bar('60px', 14)}
              </div>
            </div>
          </div>
          
          <div className="pf-nav">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="pf-nav-item">{bar('60px', 16)}</div>
            ))}
          </div>

          <div style={{ padding: '32px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, height: 200, padding: 20 }}>
                  {bar('100px', 16, 12)}
                  {bar('100%', 12, 8)}
                  {bar('80%', 12, 16)}
                  <div style={{ display: 'flex', gap: 8 }}>
                     {bar('40px', 20)}{bar('40px', 20)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
