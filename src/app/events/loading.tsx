export default function EventsLoading() {
  const bar = (w: string, h: number, mb = 0) => (
    <div style={{ width: w, height: h, background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: mb }} />
  );
  const card = (i: number) => (
    <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        {bar('80px', 10)}{bar('60px', 10)}
      </div>
      {bar('90%', 16, 8)}
      {bar('60%', 12, 16)}
      {bar('100%', 1, 12)}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {bar('100px', 28)}{bar('80px', 32)}
      </div>
    </div>
  );
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 20px 40px' }}>
      {bar('200px', 28, 8)}
      {bar('320px', 14, 24)}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ width: 70, height: 32, background: 'rgba(255,255,255,0.04)', borderRadius: 16 }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => card(i))}
      </div>
    </div>
  );
}
