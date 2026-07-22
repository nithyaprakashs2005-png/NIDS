export default function ChartCard({ title, subtitle, badge, badgeType, children, action }) {
  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <div>
          <div className="chart-card-title">{title}</div>
          {subtitle && <div className="chart-card-sub">{subtitle}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {badge && <span className={`chart-badge ${badgeType || ''}`}>{badge}</span>}
          {action}
        </div>
      </div>
      <div className="chart-card-body">{children}</div>
    </div>
  );
}
