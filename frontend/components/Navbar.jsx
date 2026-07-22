import { NavLink, useLocation } from 'react-router-dom';
import { useSecurity } from '../context/SecurityContext';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '⬡', exact: true },
  { path: '/predict', label: 'Predict', icon: '⚡' },
  { path: '/logs', label: 'Event Logs', icon: '📋' },
  { path: '/kyc', label: 'KYC Verify', icon: '🛡' },
];

export default function Navbar() {
  const location = useLocation();
  const { user, logout, isOnline } = useSecurity();

  const currentPage = NAV_ITEMS.find(item =>
    item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path)
  );

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">S</div>
          <div className="logo-text">
            Sentinel<span>Gate</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Core</div>
          {NAV_ITEMS.slice(0, 2).map(item => (
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

          <div className="nav-section-label" style={{ marginTop: 8 }}>Security</div>
          {NAV_ITEMS.slice(2).map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span style={{ fontSize: 16 }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="system-status-pill" style={{ marginBottom: '12px' }}>
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

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-title">
            {currentPage?.label ?? 'Dashboard'}
          </div>
          <div className="topbar-right">
            <div className={`topbar-badge ${isOnline ? 'online' : 'offline'}`}>
              <span style={{ color: isOnline ? '#10B981' : '#EF4444' }}>●</span>
              {isOnline ? 'LIVE' : 'OFFLINE'}
            </div>
            <div className="topbar-badge">
              🕐 {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
               <div className="user-info" style={{ textAlign: 'right' }}>
                 <div style={{ fontSize: '13px', fontWeight: '700' }}>{user?.name || 'Guest'}</div>
                 <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user?.role || 'Visitor'}</div>
               </div>
               <div className="avatar">{user?.name?.substring(0, 2)?.toUpperCase() || 'SG'}</div>
            </div>
          </div>
        </header>
      </div>
    </>
  );
}
