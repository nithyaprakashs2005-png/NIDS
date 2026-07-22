import { BrowserRouter, Routes, Route, useLocation, NavLink, Navigate } from 'react-router-dom';
import Dashboard      from './pages/Dashboard';
import Predict        from './pages/Predict';
import Logs           from './pages/Logs';
import KYC            from './pages/KYC';
import Login          from './pages/Login';
import Signup         from './pages/Signup';
import KYCDashboard   from './pages/KYCDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AttackSimulator from './pages/AttackSimulator';
import ProtectedRoute from './components/ProtectedRoute';
import { SecurityProvider, useSecurity } from './context/SecurityContext';
import './styles/theme.css';

// ── Nav items per role ────────────────────────────────────────────────────
const ADMIN_NAV = [
  { path: '/',        label: 'Dashboard',  icon: '⬡', exact: true, section: 'Core' },
  { path: '/predict', label: 'Predict',    icon: '⚡', section: 'Core' },
  { path: '/logs',    label: 'Event Logs', icon: '📋', section: 'Security' },
  { path: '/attack-sim', label: 'Attack Simulator', icon: '🌐', section: 'Security' },
  { path: '/admin',   label: 'Admin Panel', icon: '🔐', section: 'Security' },
];
const USER_NAV = [
  { path: '/',        label: 'Account Dashboard', icon: '👤', exact: true, section: 'Platform' },
  { path: '/kyc',     label: 'KYC Verify', icon: '🛡', exact: true, section: 'Identity' },
];

// ── Sidebar ───────────────────────────────────────────────────────────────
function Sidebar() {
  const { user, logout, kycStatus } = useSecurity();
  const isAdmin = user?.role === 'ADMIN';
  const navItems = isAdmin ? ADMIN_NAV : USER_NAV;

  const sections = navItems.reduce((acc, item) => {
    (acc[item.section] = acc[item.section] || []).push(item);
    return acc;
  }, {});

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">S</div>
        <div className="logo-text">Sentinel<span>Gate</span></div>
      </div>

      <nav className="sidebar-nav">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section}>
            <div className="nav-section-label">{section}</div>
            {items.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.exact}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {!isAdmin && (
          <div style={{
            padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
            fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: 7,
            background: kycStatus === 'VERIFIED' ? 'var(--accent-green-light)' : kycStatus === 'REJECTED' ? 'var(--accent-red-light)' : 'var(--accent-amber-light)',
            color:      kycStatus === 'VERIFIED' ? 'var(--accent-green)'       : kycStatus === 'REJECTED' ? 'var(--accent-red)'       : 'var(--accent-amber)',
          }}>
            <div className={`pulse-dot ${kycStatus === 'VERIFIED' ? '' : 'warning'}`} />
            KYC: {kycStatus}
          </div>
        )}
        <div className="system-status-pill">
          <div className="pulse-dot" />
          System Operational
        </div>
        <button
          onClick={logout}
          className="btn btn-ghost btn-sm w-full"
          style={{ justifyContent: 'flex-start', color: 'var(--accent-red)' }}
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}

// ── TopBar ────────────────────────────────────────────────────────────────
function TopBar() {
  const location = useLocation();
  const { isOnline, user } = useSecurity();
  const isAdmin  = user?.role === 'ADMIN';
  const allNav   = isAdmin ? ADMIN_NAV : USER_NAV;
  const current  = allNav.find(item =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  );

  return (
    <header className="topbar">
      <div className="topbar-title">{current?.label ?? 'Dashboard'}</div>
      <div className="topbar-right">
        <div className={`topbar-badge ${isOnline ? 'online' : 'offline'}`}>
          <span style={{ color: isOnline ? '#10B981' : '#EF4444' }}>●</span> {isOnline ? 'LIVE' : 'OFFLINE'}
        </div>
        <div className="topbar-badge">
          🕐 {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="user-profile">
          <div className="user-info">
            <span className="user-name">{user?.username || user?.name || 'User'}</span>
            <span className="user-role-badge">{user?.role || 'Guest'}</span>
          </div>
          <div className="avatar">
            {(user?.username || user?.name || 'SG').substring(0, 2).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}

// ── AppShell (sidebar + topbar layout) ───────────────────────────────────
function AppShell() {
  const { user } = useSecurity();
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <TopBar />
        <Routes>
          <Route path="/" element={
            <ProtectedRoute requireKyc={!isAdmin}>
              {isAdmin ? <Dashboard /> : <KYCDashboard isEmbedded={true} />}
            </ProtectedRoute>
          } />
          <Route path="/predict" element={
            <ProtectedRoute requiredRole="ADMIN"><Predict /></ProtectedRoute>
          } />
          <Route path="/logs" element={
            <ProtectedRoute requiredRole="ADMIN"><Logs /></ProtectedRoute>
          } />
          <Route path="/attack-sim" element={
            <ProtectedRoute requiredRole="ADMIN"><AttackSimulator /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// ── Inner router (inside SecurityProvider) ────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Standalone pages (no sidebar shell) */}
      <Route path="/kyc" element={
        <ProtectedRoute><KYCDashboard /></ProtectedRoute>
      } />
      <Route path="/admin" element={
        <ProtectedRoute requiredRole="ADMIN"><AdminDashboard /></ProtectedRoute>
      } />

      {/* Everything else in the AppShell */}
      <Route path="*" element={
        <ProtectedRoute><AppShell /></ProtectedRoute>
      } />
    </Routes>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <SecurityProvider>
        <AppRoutes />
      </SecurityProvider>
    </BrowserRouter>
  );
}
