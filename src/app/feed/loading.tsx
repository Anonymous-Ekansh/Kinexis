export default function FeedLoading() {
  const bar = (w: string, h: number, mb = 0) => (
    <div style={{ width: w, height: h, background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: mb }} />
  );
  const card = (i: number) => (
    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
        <div>{bar('120px', 12, 6)}{bar('80px', 10)}</div>
      </div>
      {bar('100%', 14, 8)}
      {bar('85%', 14, 8)}
      {bar('60%', 14, 16)}
      <div style={{ display: 'flex', gap: 16 }}>
        {bar('60px', 28)}{bar('60px', 28)}{bar('60px', 28)}
      </div>
    </div>
  );
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 20px 40px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24 }}>
      <div>{Array.from({ length: 4 }).map((_, i) => card(i))}</div>
      <div>
        {bar('100%', 200, 16)}
        {bar('100%', 160, 16)}
        {bar('100%', 120)}
      </div>
    </div>
  );
}
