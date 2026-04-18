export default function CollabsLoading() {
  const bar = (w: string, h: number, mb = 0) => (
    <div style={{ width: w, height: h, background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: mb }} />
  );
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 20px 40px' }}>
      {/* Header */}
      {bar('180px', 12, 8)}
      {bar('260px', 28, 8)}
      {bar('400px', 14, 24)}
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, textAlign: 'center' }}>
            {bar('60px', 28, 6)}
            {bar('80px', 10)}
          </div>
        ))}
      </div>
      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ width: 70, height: 32, background: 'rgba(255,255,255,0.04)', borderRadius: 16 }} />)}
      </div>
      {/* Grid + sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20 }}>
              {bar('80px', 10, 10)}
              {bar('90%', 16, 6)}
              {bar('100%', 12, 6)}
              {bar('60%', 12, 16)}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                {bar('80px', 12)}{bar('60px', 28)}
              </div>
            </div>
          ))}
        </div>
        <div>
          {bar('100%', 180, 16)}
          {bar('100%', 160, 16)}
          {bar('100%', 120)}
        </div>
      </div>
    </div>
  );
}
