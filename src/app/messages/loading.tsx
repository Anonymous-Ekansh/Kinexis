export default function MessagesLoading() {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#1C1C28' }}>
      {/* Sidebar skeleton */}
      <div style={{ width: 320, borderRight: '1px solid rgba(255,255,255,0.07)', padding: 20 }}>
        <div style={{ width: 140, height: 24, background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 16 }} />
        <div style={{ width: '100%', height: 36, background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 20 }} />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: '60%', height: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 6, marginBottom: 6 }} />
              <div style={{ width: '80%', height: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>
      {/* Chat panel skeleton */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
          <div style={{ fontSize: 14 }}>Loading messages...</div>
        </div>
      </div>
    </div>
  );
}
