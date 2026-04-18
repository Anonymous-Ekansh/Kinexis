export default function ChannelsLoading() {
  const bar = (w: string, h: number, mb = 0) => (
    <div style={{ width: w, height: h, background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: mb }} />
  );
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#111118' }}>
      {/* Club sidebar */}
      <div style={{ width: 72, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>
      {/* Channel list */}
      <div style={{ width: 260, borderRight: '1px solid rgba(255,255,255,0.06)', padding: 16 }}>
        {bar('140px', 20, 16)}
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ padding: '10px 0' }}>{bar('80%', 12, 6)}{bar('50%', 10)}</div>
        ))}
      </div>
      {/* Main chat */}
      <div style={{ flex: 1, padding: 20 }}>
        {bar('200px', 20, 20)}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 20 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
                {bar('100px', 12)}
              </div>
              {bar('90%', 12, 4)}
              {bar('60%', 12)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
