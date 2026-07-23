import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import StatusCard from '../components/StatusCard';
import AlertCard from '../components/AlertCard';
import ChartCard from '../components/ChartCard';
import { useSecurity } from '../context/SecurityContext';

const MODELS = [
  { name: 'Random Forest', accuracy: 99.2, best: true },
  { name: 'ANN', accuracy: 98.7, best: false },
  { name: 'Decision Tree', accuracy: 97.8, best: false },
  { name: 'KNN', accuracy: 97.1, best: false },
  { name: 'SVM', accuracy: 96.5, best: false },
  { name: 'Logistic Reg.', accuracy: 92.3, best: false },
  { name: 'Naive Bayes', accuracy: 88.4, best: false },
];

export default function Dashboard() {
  const { 
    user, 
    systemStatus: status, 
    alerts, 
    dismissAlert, 
    recentPredictions,
    toggleSimulation 
  } = useSecurity();
  const isAdmin = user?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🔐</div>
        <h1 className="page-title">Restricted Access</h1>
        <p className="page-subtitle">The Network Intrusion Detection System is only accessible to security administrators.</p>
        <div style={{ marginTop: 24, padding: '16px 24px', background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', maxWidth: 400 }}>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Please return to your <a href="/" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Account Dashboard</a> to manage your identity verification.
          </p>
        </div>
      </div>
    );
  }

  const trafficHistory = status?.traffic_history || [];
  const latestPackets = trafficHistory[trafficHistory.length - 1]?.packets ?? 0;
  const attackDistribution = status?.attack_distribution || [{ name: 'No Data', value: 1, color: '#E2E8F0' }];

  return (
    <div className="page-content">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Security Dashboard</h1>
          <p className="page-subtitle">Real-time network intrusion detection & analytics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Live Sniffer: <span style={{ color: 'var(--accent-green)' }}>ACTIVE</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 2 }}>
              Simulation: <span style={{ color: status?.simulation_active ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                {status?.simulation_active ? 'ENABLED' : 'DISABLED'}
              </span>
            </div>
          </div>
          <button 
            onClick={async () => {
              const next = !status?.simulation_active;
              await toggleSimulation(next);
            }}
            style={{
              padding: '8px 16px', borderRadius: 10, border: 'none',
              background: status?.simulation_active ? 'var(--accent-red)' : 'var(--primary)',
              color: 'white', fontSize: 11, fontWeight: 800, cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.5px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={e => e.target.style.transform = 'translateY(-1px)'}
            onMouseOut={e => e.target.style.transform = 'translateY(0)'}
          >
            {status?.simulation_active ? '⏹ Stop Sim' : '▶ Start Sim'}
          </button>
        </div>
      </div>

      <div className="alerts-container" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {alerts.map(alert => (
          <AlertCard
            key={alert.id}
            type={alert.type}
            title={alert.title}
            message={alert.message}
            time={alert.time}
            onDismiss={() => dismissAlert(alert.id)}
          />
        ))}
      </div>

      <div className="stats-grid">
        <StatusCard
          label="Packets / Sec"
          value={latestPackets.toLocaleString()}
          delta="12.4%"
          deltaDir="up"
          icon="📶"
          color="blue"
          sub="Live network traffic"
        />
        <StatusCard
          label="Threats Detected"
          value={status?.threats_detected ?? 342}
          delta="3"
          deltaDir="up"
          icon="🚨"
          color="red"
          sub="Last 24 hours"
        />
        <StatusCard
          label="Packets Analyzed"
          value={(status?.packets_analyzed ?? 1482931).toLocaleString()}
          icon="🔍"
          color="green"
          sub="Total since deployment"
        />
        <StatusCard
          label="False Positives"
          value={status?.false_positives ?? 12}
          delta="2"
          deltaDir="down"
          icon="✅"
          color="amber"
          sub="This week"
        />
        <StatusCard
          label="System Uptime"
          value={status?.uptime ?? '14d 6h'}
          icon="⏱"
          color="cyan"
          sub="No outages recorded"
        />
      </div>

      <div className="charts-grid">
        <ChartCard
          title="Live Traffic Monitor"
          subtitle="Packets per second — auto-refreshing"
          badge="● LIVE"
          badgeType="live"
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trafficHistory} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="packetsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="threatsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94A3B8', fontFamily: 'DM Mono' }} tickLine={false} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, fontFamily: 'DM Mono' }}
                labelStyle={{ color: '#0F172A', fontWeight: 600 }}
              />
              <Area type="monotone" dataKey="packets" stroke="#2563EB" strokeWidth={2} fill="url(#packetsGrad)" name="Packets/s" dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="threats" stroke="#EF4444" strokeWidth={1.5} fill="url(#threatsGrad)" name="Threats" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Attack Distribution"
          subtitle="Threat type breakdown — current session"
        >
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={attackDistribution}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                isAnimationActive={false}
              >
                {attackDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12 }}
                formatter={(val, name) => [`${val}%`, name]}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, fontFamily: 'Outfit, sans-serif' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard
        title="Recent Security Activity"
        subtitle="Last 5 classification events from the network"
        action={<a href="/logs" style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>View All →</a>}
      >
        <div className="activity-feed">
          {recentPredictions.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: 14 }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>🛡️</div>
              Waiting for live traffic analysis...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {recentPredictions.map((event, i) => (
                <div key={i} className="activity-item" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderBottom: i === recentPredictions.length - 1 ? 'none' : '1px solid var(--border)',
                  background: event.prediction === 'Attack' ? 'rgba(239, 68, 68, 0.03)' : 'transparent'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: event.prediction === 'Attack' ? '#FEE2E2' : '#D1FAE5',
                      fontSize: 16
                    }}>
                      {event.prediction === 'Attack' ? '🚨' : '✅'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: event.prediction === 'Attack' ? '#B91C1C' : '#065F46' }}>
                        {event.prediction === 'Attack' ? 'Threat Detected' : 'Normal Traffic'}
                        {event.attack_type && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>· {event.attack_type}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {event.model_used} · Confidence: {event.confidence}% · Latency: {event.inference_time_ms}ms
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{event.time}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Handled Auto</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ChartCard>

    </div>
  );
}
