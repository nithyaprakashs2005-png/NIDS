import { useState } from 'react';
import KYCForm from '../components/KYCForm';
import { kycService } from '../services/api';
import AlertCard from '../components/AlertCard';

const TIMELINE_EVENTS = [
  { event: 'Account Created', time: '2024-01-10 09:12', color: 'green' },
  { event: 'Initial KYC Submitted', time: '2024-01-10 09:45', color: 'green' },
  { event: 'Document Verified', time: '2024-01-11 14:22', color: 'green' },
  { event: 'Suspicious Login Attempt', time: '2024-02-18 03:41', color: 'red' },
  { event: 'Manual Review Triggered', time: '2024-02-18 04:00', color: 'amber' },
  { event: 'KYC Re-verification Required', time: '2024-03-15 10:30', color: 'amber' },
];

const USER_PROFILE = {
  name: 'Arjun Sharma',
  user_id: 'USR-2024-00441',
  email: 'arjun.s@example.in',
  phone: '+91 98765 43210',
  country: 'India',
  account_type: 'Premium',
  risk_score: 42,
  threat_level: 'medium',
  kyc_status: 'Pending Re-verify',
  last_seen: '2024-03-15 10:28',
  total_sessions: 147,
};

export default function KYC() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleVerify = async payload => {
    setLoading(true);
    setResult(null);
    try {
      const data = await kycService.verify(payload);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">KYC Verification</h1>
        <p className="page-subtitle">Know Your Customer — identity verification & threat scoring</p>
      </div>

      {result && (
        <AlertCard
          type={result.status === 'verified' ? 'normal' : 'critical'}
          title={result.status === 'verified' ? 'KYC Verification Passed' : 'KYC Verification Flagged'}
          message={result.message}
          time={new Date(result.timestamp).toLocaleTimeString()}
          onDismiss={() => setResult(null)}
        />
      )}

      {result && (
        <div className="card mb-5" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <div className="section-title" style={{ marginBottom: 16 }}>Verification Results</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
              {Object.entries(result.checks).map(([key, passed]) => (
                <div
                  key={key}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid',
                    borderColor: passed ? '#A7F3D0' : '#FCA5A5',
                    background: passed ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{passed ? '✅' : '❌'}</div>
                  <div style={{
                    fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)',
                    textTransform: 'capitalize',
                    color: passed ? 'var(--accent-green)' : 'var(--accent-red)',
                  }}>
                    {key.replace(/_/g, ' ')}
                  </div>
                </div>
              ))}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--primary-dim)',
                  background: 'var(--primary-light)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--primary)', marginBottom: 2 }}>
                  {result.kyc_score}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--primary)' }}>
                  KYC Score
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="kyc-grid">
        {/* Profile Panel */}
        <div>
          <div className="kyc-profile-card">
            <div className="kyc-profile-header">
              <span className={`kyc-threat-level ${USER_PROFILE.threat_level}`}>
                {USER_PROFILE.threat_level.toUpperCase()} RISK
              </span>
              <div className="kyc-avatar-wrap">
                <div className="kyc-avatar">AS</div>
                <div className="kyc-online-dot" />
              </div>
              <div className="kyc-user-name">{USER_PROFILE.name}</div>
              <div className="kyc-user-id">{USER_PROFILE.user_id}</div>
            </div>

            <div className="kyc-profile-body">
              {[
                { label: 'Email', value: USER_PROFILE.email },
                { label: 'Phone', value: USER_PROFILE.phone },
                { label: 'Country', value: '🇮🇳 ' + USER_PROFILE.country },
                { label: 'Account Type', value: USER_PROFILE.account_type },
                { label: 'Risk Score', value: `${USER_PROFILE.risk_score}/100` },
                { label: 'KYC Status', value: USER_PROFILE.kyc_status },
                { label: 'Sessions', value: USER_PROFILE.total_sessions },
                { label: 'Last Seen', value: USER_PROFILE.last_seen },
              ].map(row => (
                <div key={row.label} className="kyc-info-row">
                  <span className="kyc-info-label">{row.label}</span>
                  <span className="kyc-info-value" style={{ textAlign: 'right', fontSize: 12 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Risk Score Bar */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 600 }}>
                <span style={{ color: 'var(--text-muted)' }}>Risk Score</span>
                <span style={{ color: USER_PROFILE.risk_score > 60 ? 'var(--accent-red)' : USER_PROFILE.risk_score > 30 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
                  {USER_PROFILE.risk_score}/100
                </span>
              </div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99, width: `${USER_PROFILE.risk_score}%`,
                  background: USER_PROFILE.risk_score > 60 ? 'var(--accent-red)' : USER_PROFILE.risk_score > 30 ? 'var(--accent-amber)' : 'var(--accent-green)',
                  transition: 'width 1s ease',
                }} />
              </div>
            </div>

            {/* Timeline */}
            <div className="kyc-timeline">
              <div className="kyc-timeline-title">Activity Timeline</div>
              {TIMELINE_EVENTS.map((ev, i) => (
                <div key={i} className="timeline-item">
                  <div className="timeline-dot-wrap">
                    <div className={`timeline-dot ${ev.color}`} />
                    {i < TIMELINE_EVENTS.length - 1 && <div className="timeline-line" />}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-event">{ev.event}</div>
                    <div className="timeline-time">{ev.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* KYC Form */}
        <div>
          <KYCForm onSubmit={handleVerify} loading={loading} />
        </div>
      </div>
    </div>
  );
}
