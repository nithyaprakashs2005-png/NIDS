import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSecurity } from '../context/SecurityContext';
import { adminService } from '../services/api';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Helpers ──────────────────────────────────────────────────────────────
const riskColor = (score) => score > 70 ? '#EF4444' : score > 30 ? '#F59E0B' : '#10B981';
const riskBg    = (score) => score > 70 ? '#FEF2F2' : score > 30 ? '#FFFBEB' : '#ECFDF5';
const riskLabel = (score) => score > 70 ? 'HIGH' : score > 30 ? 'MED' : 'LOW';
const kycColor  = (s) => ({ VERIFIED: '#059669', PENDING: '#D97706', REJECTED: '#DC2626' }[s] || '#64748B');
const kycBg     = (s) => ({ VERIFIED: '#ECFDF5', PENDING: '#FFFBEB', REJECTED: '#FEF2F2' }[s] || '#F1F5F9');
const alertColor = { HIGH_REQUEST_RATE: '#EF4444', BRUTE_FORCE: '#DC2626', IP_CHANGE_ANOMALY: '#F59E0B', UNAUTHORIZED_ACCESS: '#7C3AED' };
const alertIcon  = { HIGH_REQUEST_RATE: '🔥', BRUTE_FORCE: '🔐', IP_CHANGE_ANOMALY: '🌐', UNAUTHORIZED_ACCESS: '🚫' };

const fmtDate = (d) => d ? new Date(d).toLocaleString() : '—';

// ── Audio Context for Cyber Vibration ────────────────────────────────────
let audioCtx = null;
const playCyberAlarm = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  // Create a deep, buzzing saw wave vibration
  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(55, audioCtx.currentTime); // Low fundamental
  osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.1);
  osc.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 0.2);
  
  // Modulate it to sound like a digital distress alarm
  const osc2 = audioCtx.createOscillator();
  const gainNode2 = audioCtx.createGain();
  osc2.type = 'square';
  osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch squawk
  osc2.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.1);
  
  osc.connect(gainNode);
  osc2.connect(gainNode2);
  gainNode.connect(audioCtx.destination);
  gainNode2.connect(audioCtx.destination);
  
  // Volume envelopes
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05); // quick attack
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3); // decay
  
  gainNode2.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode2.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.05);
  gainNode2.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);

  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.4);
  osc2.start(audioCtx.currentTime);
  osc2.stop(audioCtx.currentTime + 0.4);

  // Trigger double pulse
  setTimeout(() => {
    if(!audioCtx) return;
    const osc3 = audioCtx.createOscillator();
    const g3 = audioCtx.createGain();
    osc3.type = 'sawtooth';
    osc3.frequency.setValueAtTime(55, audioCtx.currentTime);
    osc3.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.1);
    osc3.frequency.exponentialRampToValueAtTime(55, audioCtx.currentTime + 0.2);
    osc3.connect(g3);
    g3.connect(audioCtx.destination);
    
    g3.gain.setValueAtTime(0, audioCtx.currentTime);
    g3.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
    g3.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
    
    osc3.start(audioCtx.currentTime);
    osc3.stop(audioCtx.currentTime + 0.4);
  }, 150);
};

// ── PDF Export Function ──────────────────────────────────────────────────
const generatePDF = (alertsList) => {
  const doc = new jsPDF();
  
  // Header Background
  doc.setFillColor(37, 99, 235); // #2563EB Blue
  doc.rect(0, 0, 210, 30, 'F');
  
  // Header Text
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("SentinelGate Security Report", 14, 20);
  
  // Details
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 40);
  doc.text(`Total Recorded Threats: ${alertsList.length}`, 14, 46);
  
  const tableData = alertsList.slice(0, 50).map(a => [
    a.type?.replace(/_/g, ' ') || 'UNKNOWN',
    a.username || `User ${a.user_id}`,
    `${a.risk_level} (+${a.risk_score})`,
    a.ip_address || '—',
    new Date(a.timestamp).toLocaleString()
  ]);

  autoTable(doc, {
    startY: 55,
    head: [['Threat Type', 'Target', 'Severity', 'Source IP', 'Timestamp']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42], fontSize: 10, cellPadding: 4 },
    bodyStyles: { fontSize: 9, cellPadding: 3 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 0: { fontStyle: 'bold', textColor: [220, 38, 38] } } // Red text for Threat Type
  });

  doc.save(`SentinelGate_Threat_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ background: 'white', borderRadius: 14, padding: '20px 22px', border: '1px solid #E2E8F0',
      boxShadow: '0 2px 8px rgba(15,23,42,0.05)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
      <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 14px', borderRadius: 20, border: `1px solid ${active ? '#2563EB' : '#E2E8F0'}`,
      background: active ? '#EFF6FF' : 'white', color: active ? '#2563EB' : '#64748B',
      fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
    }}>{label}</button>
  );
}

export default function AdminDashboard() {
  const { user, logout, isOnline } = useSecurity();
  const navigate = useNavigate();

  const [tab, setTab]           = useState('users');
  const [stats, setStats]       = useState(null);
  const [users, setUsers]       = useState([]);
  const [alerts, setAlerts]     = useState([]);
  const [activity, setActivity] = useState([]);
  const [dbStatus, setDbStatus] = useState([]);
  const [activeTable, setActiveTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [kycFilter, setKycFilter]   = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [alertFilter, setAlertFilter] = useState('ALL');
  const [loading, setLoading]   = useState(false);
  const prevAlertCount = React.useRef(0);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, u, a, act, db] = await Promise.all([
        adminService.getStats(),
        adminService.getUsers(),
        adminService.getAlerts(),
        adminService.getActivity(),
        adminService.getDbStatus(),
      ]);
      setStats(s);
      setUsers(u);
      setAlerts(a);
      setActivity(act.logs || []);
      setDbStatus(db);
    } catch (e) {
      console.error('Admin load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTable = async (tableName) => {
    try {
      setLoading(true);
      const data = await adminService.getTableData(tableName);
      setTableData(data);
      setActiveTable(tableName);
    } catch (e) {
      alert("Error loading table data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRow = async (id) => {
    if (!window.confirm(`Delete record ID:${id} from ${activeTable}?`)) return;
    try {
      await adminService.deleteRow(activeTable, id);
      loadTable(activeTable);
      loadAll();
    } catch (e) {
      alert("Deletion failed");
    }
  };

  const handleClearTable = async (tableName) => {
    if (!window.confirm(`WARNING: Wipe all data from ${tableName}? This cannot be undone.`)) return;
    try {
      await adminService.clearTable(tableName);
      if (activeTable === tableName) loadTable(tableName);
      loadAll();
    } catch (e) {
      alert("Clear failed");
    }
  };

  useEffect(() => { loadAll(); const t = setInterval(loadAll, 15000); return () => clearInterval(t); }, [loadAll]);

  // Trigger Cyber Alarm when new alerts arrive
  useEffect(() => {
    if (alerts.length > prevAlertCount.current && prevAlertCount.current !== 0) {
      if (typeof window !== 'undefined') playCyberAlarm();
    }
    prevAlertCount.current = alerts.length;
  }, [alerts]);

  const applyUserFilters = () => {
    return users.filter(u => {
      const kycOk  = kycFilter  === 'ALL' || u.kyc_status === kycFilter;
      const riskOk = riskFilter === 'ALL' ||
        (riskFilter === 'High' && u.risk_score > 70) ||
        (riskFilter === 'Medium' && u.risk_score > 30 && u.risk_score <= 70) ||
        (riskFilter === 'Low'  && u.risk_score <= 30);
      return kycOk && riskOk;
    });
  };

  const filteredAlerts = alerts.filter(a => alertFilter === 'ALL' || a.risk_level === alertFilter);

  const handleApprove = async (userId) => {
    try { await adminService.approveKyc(userId); await loadAll(); } catch (e) { console.error(e); }
  };
  const handleReject = async (userId) => {
    try { await adminService.rejectKyc(userId); await loadAll(); } catch (e) { console.error(e); }
  };
  const handleResolve = async (alertId) => {
    try { await adminService.resolveAlert(alertId); await loadAll(); } catch (e) { console.error(e); }
  };

  const handleRetrain = async () => {
    if(!window.confirm("Initiating NIDS Core Resynthesis... This background job takes ~5-10 minutes. The model will hot-swap upon completion. Proceed?")) return;
    try {
      const res = await fetch('/api/admin/retrain', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      alert(`⚡ ${data.message || "Retraining Initiated in Background."}`);
    } catch (e) {
      alert("❌ Retraining API unavailable.");
    }
  };

  const getRadarData = () => {
    const counts = { 'DoS': 0, 'Probe': 0, 'R2L': 0, 'U2R': 0, 'Brute Force': 0, 'Anomaly': 0 };
    alerts.forEach(a => {
        const type = (a.type || '').toUpperCase();
        if (type.includes('DOS')) counts['DoS']++;
        else if (type.includes('PROBE')) counts['Probe']++;
        else if (type.includes('BRUTE_FORCE')) counts['Brute Force']++;
        else if (type.includes('HIGH_REQUEST') || type.includes('ANOMALY')) counts['Anomaly']++;
        else counts['U2R']++;
    });
    const max = Math.max(10, alerts.length);
    return [
        { subject: 'DoS Attacks', A: counts['DoS'] || 2, fullMark: max },
        { subject: 'Probing / Scans', A: counts['Probe'] || 5, fullMark: max },
        { subject: 'R2L Escalations', A: counts['R2L'] || 1, fullMark: max },
        { subject: 'U2R Compromises', A: counts['U2R'] || 0, fullMark: max },
        { subject: 'Brute Force', A: counts['Brute Force'] || 4, fullMark: max },
        { subject: 'Traffic Anomalies', A: counts['Anomaly'] || 2, fullMark: max },
    ];
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Outfit', sans-serif", background: '#F4F7FE' }}>
      {/* Sidebar */}
      <aside style={{ width: 228, background: 'white', borderRight: '1px solid #E2E8F0', display: 'flex',
        flexDirection: 'column', position: 'fixed', height: '100vh', boxShadow: '2px 0 8px rgba(15,23,42,0.04)' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: '#2563EB', borderRadius: 9, display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 17 }}>S</div>
          <span style={{ fontWeight: 800, fontSize: 16, color: '#0F172A' }}>Sentinel<span style={{ color: '#2563EB' }}>Gate</span></span>
        </div>
        <nav style={{ flex: 1, padding: '14px 10px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, padding: '8px 10px 4px' }}>Admin Panel</div>
          {[
            { id: 'users',    icon: '👥', label: 'User Management' },
            { id: 'alerts',   icon: '🚨', label: 'Security Alerts' },
            { id: 'activity', icon: '📋', label: 'Activity Logs' },
            { id: 'database', icon: '🗄️', label: 'Database' },
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
              borderRadius: 8, border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 500,
              fontFamily: "'Outfit', sans-serif",
              background: tab === item.id ? '#EFF6FF' : 'transparent',
              color: tab === item.id ? '#2563EB' : '#475569',
              marginBottom: 2,
            }}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, padding: '8px 10px 4px' }}>NIDS Tools</div>
            <button onClick={() => navigate('/')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent',
              color: '#475569', fontSize: 13, fontWeight: 500, fontFamily: "'Outfit', sans-serif", marginBottom: 2 }}>
              <span>⬡</span> Network Dashboard
            </button>
            <button onClick={() => navigate('/predict')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent',
              color: '#475569', fontSize: 13, fontWeight: 500, fontFamily: "'Outfit', sans-serif" }}>
              <span>⚡</span> ML Predict
            </button>
          </div>
        </nav>
        <div style={{ padding: '14px 10px', borderTop: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
            background: '#ECFDF5', borderRadius: 8, marginBottom: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981',
              animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#059669' }}>System Operational</span>
          </div>
          <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', border: 'none', borderRadius: 8, cursor: 'pointer',
            background: 'transparent', color: '#EF4444', fontSize: 13, fontWeight: 600,
            fontFamily: "'Outfit', sans-serif" }}>🚪 Logout</button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: 228, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Topbar */}
        <header style={{ height: 60, background: 'white', borderBottom: '1px solid #E2E8F0', padding: '0 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: '#0F172A' }}>NIDS Admin Dashboard</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontFamily: "'DM Mono', monospace",
              color: '#64748B', background: '#F8FAFC', padding: '4px 10px', borderRadius: 20, border: '1px solid #E2E8F0' }}>
              <span style={{ color: isOnline ? '#10B981' : '#EF4444' }}>●</span> {isOnline ? 'LIVE' : 'OFFLINE'}
            </div>
            {stats?.unresolved_alerts > 0 && (
              <div style={{ background: '#FEF2F2', color: '#DC2626', fontSize: 11, fontWeight: 700,
                padding: '3px 9px', borderRadius: 20, border: '1px solid #FECACA' }}>
                🚨 {stats.unresolved_alerts} unresolved
              </div>
            )}
            <button onClick={loadAll} style={{ background: '#EFF6FF', border: '1px solid #BFDBFE',
              color: '#2563EB', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>↻ Refresh</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderLeft: '1px solid #E2E8F0', paddingLeft: 14 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{user?.username}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '1px 6px', borderRadius: 4 }}>ADMIN</div>
              </div>
              <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg,#2563EB,#8B5CF6)',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: 13 }}>{user?.username?.[0]?.toUpperCase()}</div>
            </div>
          </div>
        </header>

        <div style={{ padding: '28px 28px', flex: 1 }}>
          {/* Intelligence & Core Controls Container */}
          <div style={{ display: 'flex', gap: 28, marginBottom: 28 }}>
            
            {/* Live Threat Radar */}
            <div style={{ flex: 1, background: 'white', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 20px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A', marginBottom: 4 }}>Live Threat Topography</div>
              <div style={{ fontSize: 11, color: '#64748B', marginBottom: 12 }}>Distribution of detected vectors across SentinelGate framework</div>
              <div style={{ flex: 1, minHeight: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={getRadarData()}>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700, fontFamily: "'Outfit', sans-serif" }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontFamily: "'Outfit', sans-serif", fontSize: 12, fontWeight: 700 }} />
                    <Radar name="Threat Density" dataKey="A" stroke="#2563EB" strokeWidth={2} fill="#3B82F6" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* System Actions */}
            <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E2E8F0', padding: '16px 20px', flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A', marginBottom: 8 }}>Core Management</div>
                <button onClick={handleRetrain} style={{ width: '100%', padding: '12px 0', background: 'linear-gradient(135deg,#1E293B,#0F172A)', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 12px rgba(15,23,42,0.15)', marginBottom: 12 }}>
                  <span>⚙️</span> Retrain ML Infrastructure
                </button>
                <div style={{ fontSize: 11, color: '#64748B', lineHeight: 1.4 }}>
                  Triggering a retrain initiates a localized Optuna SMOTENC optimization matrix. Models hot-swap dynamically in memory via the Autoencoder.
                </div>
              </div>
            </div>
            
          </div>

          {/* Stats Row */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 16, marginBottom: 28 }}>
              <StatCard label="Total Users"    value={stats.total_users}    icon="👥" color="#2563EB" />
              <StatCard label="Pending KYC"   value={stats.pending_kyc}    icon="⏳" color="#F59E0B" />
              <StatCard label="Verified KYC"  value={stats.verified_kyc}   icon="✅" color="#10B981" />
              <StatCard label="High Risk"     value={stats.high_risk}      icon="🔴" color="#EF4444" />
              <StatCard label="Total Alerts"  value={stats.total_alerts}   icon="🚨" color="#8B5CF6" />
              <StatCard label="Unresolved"    value={stats.unresolved_alerts} icon="⚠️" color="#F97316" />
            </div>
          )}

          {/* Tab Header */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {[
              { id: 'users', label: '👥 Users' },
              { id: 'alerts', label: '🚨 Alerts' }, 
              { id: 'activity', label: '📋 Activity' },
              { id: 'database', label: '🗄️ Database Management' }
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '8px 18px', borderRadius: 10, border: `1px solid ${tab === t.id ? '#2563EB' : '#E2E8F0'}`,
                background: tab === t.id ? '#2563EB' : 'white', color: tab === t.id ? 'white' : '#475569',
                fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: "'Outfit', sans-serif",
              }}>{t.label}</button>
            ))}
          </div>

          {/* ── Users Tab ── */}
          {tab === 'users' && (
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginRight: 8 }}>KYC Filter:</span>
                {['ALL', 'PENDING', 'VERIFIED', 'REJECTED'].map(f => (
                  <FilterChip key={f} label={f} active={kycFilter === f} onClick={() => setKycFilter(f)} />
                ))}
                <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginLeft: 16, marginRight: 8 }}>Risk:</span>
                {['ALL', 'High', 'Medium', 'Low'].map(f => (
                  <FilterChip key={f} label={f} active={riskFilter === f} onClick={() => setRiskFilter(f)} />
                ))}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#F8FAFC' }}>
                    {['User', 'Email', 'KYC Status', 'Risk Score', 'Failed Logins', 'Last IP', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                        color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {applyUserFilters().map(u => (
                      <tr key={u.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13, color: '#0F172A' }}>{u.username}</td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748B', fontFamily: "'DM Mono', monospace" }}>{u.email}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: kycBg(u.kyc_status), color: kycColor(u.kyc_status),
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{u.kyc_status}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden', minWidth: 60 }}>
                              <div style={{ height: '100%', width: `${u.risk_score}%`, borderRadius: 99, background: riskColor(u.risk_score) }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: riskColor(u.risk_score), minWidth: 28 }}>{u.risk_score}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, background: riskBg(u.risk_score), color: riskColor(u.risk_score),
                              padding: '1px 6px', borderRadius: 4 }}>{riskLabel(u.risk_score)}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: u.failed_attempts >= 5 ? '#EF4444' : '#64748B', fontWeight: u.failed_attempts >= 5 ? 700 : 400 }}>
                          {u.failed_attempts} {u.failed_attempts >= 5 && '⚠️'}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 11, color: '#94A3B8', fontFamily: "'DM Mono', monospace" }}>{u.last_ip || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          {u.kyc_status === 'PENDING' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => handleApprove(u.id)} style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0',
                                borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>✓ Approve</button>
                              <button onClick={() => handleReject(u.id)}  style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                                borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>✗ Reject</button>
                            </div>
                          )}
                          {u.kyc_status !== 'PENDING' && <span style={{ fontSize: 11, color: '#94A3B8' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                    {applyUserFilters().length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: 14 }}>No users match the selected filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Alerts Tab ── */}
          {tab === 'alerts' && (
              <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginRight: 8 }}>Risk Level:</span>
                  {['ALL', 'High', 'Medium', 'Low'].map(f => (
                    <FilterChip key={f} label={f} active={alertFilter === f} onClick={() => setAlertFilter(f)} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={playCyberAlarm} style={{ background: '#FEF2F2', border: '1px solid #EF4444', color: '#DC2626', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
                    🔊 Test Audio
                  </button>
                  <button onClick={() => generatePDF(alerts)} style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#059669', padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
                    📥 Export PDF Report
                  </button>
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#F8FAFC' }}>
                    {['Type', 'User', 'Risk', 'Description', 'IP', 'Time', 'Action'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                        color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filteredAlerts.map(a => (
                      <tr key={a.id} style={{ borderTop: '1px solid #F1F5F9', opacity: a.is_resolved ? 0.5 : 1 }}>
                        <td style={{ padding: '11px 16px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700,
                            color: alertColor[a.type] || '#64748B' }}>
                            {alertIcon[a.type] || '⚡'} {a.type?.replace(/_/g, ' ')}
                          </div>
                        </td>
                        <td style={{ padding: '11px 16px', fontSize: 12, color: '#475569' }}>{a.username || `User ${a.user_id}`}</td>
                        <td style={{ padding: '11px 16px' }}>
                          <span style={{ background: riskBg(a.risk_score), color: riskColor(a.risk_score),
                            padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{a.risk_level} +{a.risk_score}</span>
                        </td>
                        <td style={{ padding: '11px 16px', fontSize: 12, color: '#64748B', maxWidth: 280 }}>{a.description}</td>
                        <td style={{ padding: '11px 16px', fontSize: 11, color: '#94A3B8', fontFamily: "'DM Mono', monospace" }}>{a.ip_address}</td>
                        <td style={{ padding: '11px 16px', fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{fmtDate(a.timestamp)}</td>
                        <td style={{ padding: '11px 16px' }}>
                          {!a.is_resolved
                            ? <button onClick={() => handleResolve(a.id)} style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
                                borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>Resolve</button>
                            : <span style={{ fontSize: 11, color: '#10B981', fontWeight: 700 }}>✓ Resolved</span>}
                        </td>
                      </tr>
                    ))}
                    {filteredAlerts.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: 14 }}>
                        {loading ? 'Loading alerts...' : '✅ No alerts found.'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Activity Tab ── */}
          {tab === 'activity' && (
            <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>Recent Activity Logs</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ background: '#F8FAFC' }}>
                    {['User', 'Action', 'Endpoint', 'Method', 'Status', 'IP', 'Time'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                        color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {activity.map((l, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{l.username || `ID:${l.user_id}`}</td>
                        <td style={{ padding: '10px 16px', fontSize: 12, color: l.action?.includes('FAILED') ? '#EF4444' : '#475569', fontWeight: l.action?.includes('FAILED') ? 700 : 400 }}>{l.action}</td>
                        <td style={{ padding: '10px 16px', fontSize: 11, color: '#94A3B8', fontFamily: "'DM Mono', monospace" }}>{l.endpoint}</td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                            background: l.method === 'POST' ? '#EEF2FF' : '#F0FDF4', color: l.method === 'POST' ? '#4F46E5' : '#16A34A' }}>{l.method}</span>
                        </td>
                        <td style={{ padding: '10px 16px' }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                            background: l.status === 'ok' ? '#ECFDF5' : '#FEF2F2', color: l.status === 'ok' ? '#059669' : '#DC2626' }}>{l.status}</span>
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 11, color: '#94A3B8', fontFamily: "'DM Mono', monospace" }}>{l.ip_address}</td>
                        <td style={{ padding: '10px 16px', fontSize: 11, color: '#94A3B8', whiteSpace: 'nowrap' }}>{fmtDate(l.timestamp)}</td>
                      </tr>
                    ))}
                    {activity.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8', fontSize: 14 }}>
                        {loading ? 'Loading activity...' : 'No activity logs yet.'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Database Tab ── */}
          {tab === 'database' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Table Status Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {dbStatus.map(t => (
                  <div key={t.table} onClick={() => loadTable(t.table)} style={{ 
                    background: activeTable === t.table ? '#EFF6FF' : 'white', 
                    borderRadius: 14, padding: '20px', border: `1px solid ${activeTable === t.table ? '#2563EB' : '#E2E8F0'}`,
                    cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                  }}>
                    <div style={{ fontWeight: 800, color: activeTable === t.table ? '#2563EB' : '#0F172A', fontSize: 13, textTransform: 'uppercase', marginBottom: 4 }}>{t.table.replace('_', ' ')}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>{t.count} <span style={{ fontSize: 12, color: '#94A3B8', fontWeight: 600 }}>Rows</span></div>
                    {['activity_logs', 'alerts'].includes(t.table) && (
                      <button onClick={(e) => { e.stopPropagation(); handleClearTable(t.table); }} style={{ 
                        marginTop: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', 
                        padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 800, cursor: 'pointer' 
                      }}>WIPE TABLE</button>
                    )}
                  </div>
                ))}
              </div>

              {/* Data Table View */}
              {activeTable && (
                <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#0F172A' }}>RAW DATA: {activeTable.toUpperCase()}</div>
                    <button onClick={() => loadTable(activeTable)} style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', background: 'transparent', border: 'none', cursor: 'pointer' }}>Refresh Table</button>
                  </div>
                  <div style={{ overflowX: 'auto', maxHeight: 600 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC', position: 'sticky', top: 0, zIndex: 5 }}>
                          {tableData.length > 0 && Object.keys(tableData[0]).map(k => (
                            <th key={k} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0' }}>{k}</th>
                          ))}
                          <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', borderBottom: '1px solid #E2E8F0' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.map((row, idx) => (
                          <tr key={idx} style={{ borderTop: '1px solid #F1F5F9', background: idx % 2 === 0 ? 'white' : '#F9FAFB' }}>
                            {Object.values(row).map((val, vIdx) => (
                              <td key={vIdx} style={{ padding: '10px 16px', fontSize: 12, color: '#475569', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {val === null ? <em style={{color:'#CBD5E1'}}>null</em> : String(val)}
                              </td>
                            ))}
                            <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                              <button onClick={() => handleDeleteRow(row.id || row.user_id)} style={{ padding: '4px 8px', borderRadius: 4, background: '#FEF2F2', color: '#EF4444', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>Delete</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {tableData.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No records found in this table.</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(.85)} }`}</style>
    </div>
  );
}
