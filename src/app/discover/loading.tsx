import TopNav from "@/components/TopNav"

export default function DiscoverLoading() {
  const bar = (w: string, h: number, mb = 0) => (
    <div style={{ width: w, height: h, background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: mb }} />
  );
  return (
    <div className="disc-page">
      <TopNav />
      <div className="disc-layout">
        {/* Sidebar */}
        <div className="disc-l">
          <div className="disc-nav-panel">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 16px' }}>
                <div style={{ width: 20, height: 20, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
                {bar('100px', 16)}
              </div>
            ))}
          </div>
        </div>
        
        {/* Main feed */}
        <div className="disc-c">
          <div className="disc-post-box">
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
              {bar('100%', 40)}
            </div>
          </div>
          
          <div className="disc-feed-list">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="disc-feed-card">
                <div className="df-card-top">
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                  <div>
                    {bar('120px', 14, 4)}
                    {bar('80px', 12)}
                  </div>
                </div>
                {bar('100%', 14, 8)}
                {bar('80%', 14, 16)}
                <div className="df-card-media" style={{ height: 200, background: 'rgba(255,255,255,0.03)' }} />
              </div>
            ))}
          </div>
        </div>
        
        {/* Right Panel */}
        <div className="disc-r">
          <div className="disc-panel">
            {bar('100px', 14, 16)}
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="disc-match-card">
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                  <div>{bar('100px', 14, 4)}{bar('60px', 12)}</div>
                </div>
                {bar('100%', 32)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
