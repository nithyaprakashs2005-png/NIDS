export default function StatusCard({ label, value, delta, deltaDir, icon, color = 'blue', sub }) {
  return (
    <div className={`stat-card ${color}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className={`stat-card-icon ${color}`}>{icon}</div>
        {delta !== undefined && (
          <span className={`stat-card-delta ${deltaDir}`}>
            {deltaDir === 'up' ? '↑' : '↓'} {delta}
          </span>
        )}
      </div>
      <div>
        <div className="stat-card-label">{label}</div>
        <div className="stat-card-value">{value}</div>
        {sub && <div className="card-sub" style={{ marginTop: 4 }}>{sub}</div>}
      </div>
    </div>
  );
}
