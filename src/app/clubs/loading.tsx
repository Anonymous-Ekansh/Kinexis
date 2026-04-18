export default function ClubsLoading() {
  const bar = (w: string, h: number, mb = 0) => (
    <div style={{ width: w, height: h, background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: mb }} />
  );
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 20px 40px' }}>
      {bar('180px', 28, 8)}
      {bar('300px', 14, 24)}
      {bar('100%', 40, 24)}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
              <div>{bar('120px', 14, 6)}{bar('80px', 10)}</div>
            </div>
            {bar('100%', 12, 6)}
            {bar('70%', 12, 12)}
            {bar('80px', 30)}
          </div>
        ))}
      </div>
    </div>
  );
}
