export default function AlertCard({ type = 'normal', title, message, time, onDismiss }) {
  const icons = { critical: '🚨', warning: '⚠️', normal: '✅' };

  return (
    <div className={`alert-banner ${type}`}>
      <span className="alert-banner-icon">{icons[type]}</span>
      <div>
        <div className="alert-banner-title">{title}</div>
        <div className="alert-banner-msg">{message}</div>
      </div>
      {time && <span className="alert-banner-time">{time}</span>}
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            marginLeft: 8,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            opacity: 0.6,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
