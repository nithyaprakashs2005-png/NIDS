import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSecurity } from '../context/SecurityContext';

const Login = () => {
  const { login, isAuthenticated, user } = useSecurity();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState('');
  const [emailError, setEmailError] = useState('');

  // Redirect already-authenticated users
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN') navigate('/admin', { replace: true });
      else navigate('/kyc', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const validateEmail = (val) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(val && !re.test(val) ? 'INVALID OPERATOR ID' : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (emailError || !email || !password) {
      setError('AUTHORIZATION REFUSED: INVALID CREDENTIALS.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    const result = await login(email, password);
    
    setTimeout(() => {
      setIsLoading(false);
      if (result.success) {
        if (result.user.role === 'ADMIN') navigate('/admin', { replace: true });
        else navigate('/kyc', { replace: true });
      } else {
        setError(`ACCESS DENIED: ${result.message?.toUpperCase() || 'UNKNOWN ERROR'}`);
      }
    }, 1000);
  };

  return (
    <div style={styles.page}>
      <div style={styles.gridOverlay}></div>
      <div style={styles.scanline}></div>

      {/* Left branding panel */}
      <div style={styles.leftPanel}>
        <div style={styles.sysStatus}>
          <span style={styles.statusDot}></span> SYSTEM STATUS: SECURE & ONLINE
        </div>
        
        <div style={styles.brandLogo}>
          <div style={styles.logoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={styles.logoText}>SENTINEL<span style={styles.logoAccent}>GATE</span></span>
        </div>
        <h1 style={styles.brandTitle}>ADVANCED THREAT<br />DETECTION NEXUS</h1>
        <p style={styles.brandDesc}>Authorized personnel only. Monitoring local and global traffic heuristics in real-time. Unauthorized access will be traced and reported to grid authority.</p>
        <div style={styles.featureList}>
          {['JWT END-TO-END ENCRYPTION', 'BIOMETRIC KYC PROTOCOLS', 'NEURAL NIDS ACTIVE', 'HEURISTIC THREAT SCORING'].map(f => (
            <div key={f} style={styles.featureItem}>
              <span style={styles.featureCheck}>//</span> {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right login form */}
      <div style={styles.rightPanel}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.sysLabel}>TAMIL NADU SOC_GATEWAY</div>
            <h1 style={styles.cardTitle}>OPERATOR AUTH</h1>
            <p style={styles.cardSubtitle}>Real-time Network Intelligence & Threat Detection</p>
          </div>

          {error && (
            <div style={styles.errorBanner}>
              <span style={styles.errorIcon}>!</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>BREACH ATTEMPT</div>
                <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85, fontFamily: "'DM Mono', monospace" }}>{error}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={styles.field}>
              <label style={styles.label}>OPERATOR ID</label>
              <input
                type="email"
                style={{ ...styles.input, ...(emailError ? styles.inputError : {}) }}
                value={email}
                onChange={e => { setEmail(e.target.value); validateEmail(e.target.value); }}
                placeholder="analyst@soc.local"
                required
              />
              {emailError && <span style={styles.fieldError}>{emailError}</span>}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>SECURITY KEY</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  style={styles.input}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={styles.pwToggle}>
                  {showPw ? '[HIDE]' : '[SHOW]'}
                </button>
              </div>
            </div>

            <button type="submit" style={styles.submitBtn} disabled={isLoading}>
              {isLoading ? 'INIT_SEQUENCE...' : 'INITIALIZE CONNECTION_'}
            </button>
          </form>

          <div style={styles.signUpPrompt}>
            NEW OPERATOR? <Link to="/signup" style={styles.signUpLink}>REQUEST ACCESS</Link>
          </div>
          
          <div style={styles.terminalFooter}>
             &gt; ACCESS_LEVEL: RESTRICTED <br />
             &gt; STATUS: {isLoading ? 'AUTHENTICATING...' : 'ENCRYPTED_STANDBY'}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(100vh); } }
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono&family=Outfit:wght@400;700;800&display=swap');
        
        input { font-family: 'DM Mono', monospace; }
        input:focus { outline: none; border-color: #2563EB !important; box-shadow: 0 0 10px rgba(37,99,235,0.2); }
      `}</style>
    </div>
  );
};

const styles = {
  page: { 
    display: 'flex', minHeight: '100vh', fontFamily: "'Outfit', sans-serif",
    backgroundColor: '#050B14', position: 'relative', overflow: 'hidden'
  },
  gridOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)`,
    backgroundSize: '40px 40px', pointerEvents: 'none', zIndex: 1
  },
  scanline: {
    position: 'absolute', top: 0, left: 0, right: 0, height: '10px',
    background: 'rgba(37, 99, 235, 0.05)', opacity: 0.3, pointerEvents: 'none', zIndex: 2, animation: 'scanline 10s linear infinite'
  },
  leftPanel: {
    flex: 1, padding: '80px', display: 'flex', flexDirection: 'column',
    justifyContent: 'center', position: 'relative', zIndex: 3,
    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0) 0%, rgba(37, 99, 235, 0.05) 100%)'
  },
  sysStatus: {
    display: 'flex', alignItems: 'center', gap: '10px', 
    fontSize: '11px', fontWeight: 700, color: '#10B981', 
    marginBottom: '40px', letterSpacing: '1px'
  },
  statusDot: {
    width: '8px', height: '8px', background: '#10B981', 
    borderRadius: '50%', boxShadow: '0 0 10px #10B981',
    animation: 'pulseDot 2s infinite'
  },
  brandLogo: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  logoIcon: { width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '1px solid rgba(37,99,235,0.2)', background: 'rgba(0,0,0,0.3)' },
  logoText: { fontSize: '24px', fontWeight: 800, color: '#FFF', letterSpacing: '1px' },
  logoAccent: { color: '#2563EB' },
  brandTitle: { fontSize: '48px', fontWeight: 800, color: '#FFF', marginBottom: '24px', lineHeight: 1.1 },
  brandDesc: { fontSize: '16px', color: '#64748B', lineHeight: 1.6, maxWidth: '500px', marginBottom: '40px' },
  featureList: { display: 'flex', flexDirection: 'column', gap: '16px' },
  featureItem: { fontSize: '12px', fontWeight: 600, color: '#94A3B8', fontFamily: "'DM Mono', monospace", letterSpacing: '1px' },
  featureCheck: { color: '#2563EB' },
  rightPanel: {
    width: '560px', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px',
    position: 'relative', zIndex: 3, background: 'rgba(10, 15, 30, 0.95)', backdropFilter: 'blur(20px)',
    borderLeft: '1px solid rgba(255,255,255,0.05)'
  },
  card: { width: '100%', maxWidth: '380px' },
  cardHeader: { marginBottom: 36 },
  sysLabel: { fontSize: '10px', color: '#2563EB', fontFamily: "'DM Mono', monospace", letterSpacing: '2px', marginBottom: '8px', fontWeight: 700 },
  cardTitle: { fontSize: '32px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px', letterSpacing: '1px' },
  cardSubtitle: { fontSize: '14px', color: '#64748B' },
  errorBanner: {
    display: 'flex', gap: 12, alignItems: 'center',
    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #EF4444', borderRadius: '4px',
    padding: '12px 16px', marginBottom: 24, color: '#F87171'
  },
  errorIcon: { fontWeight: 800, fontFamily: "'DM Mono', monospace" },
  field: { marginBottom: 24 },
  label: { display: 'block', fontSize: '11px', fontWeight: 600, color: '#2563EB', fontFamily: "'DM Mono', monospace", letterSpacing: '1px', marginBottom: '8px' },
  input: {
    width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '4px', padding: '14px 16px', fontSize: '14px', color: '#FFFFFF',
    transition: 'all 0.2s', boxSizing: 'border-box',
  },
  inputError: { borderColor: '#EF4444' },
  fieldError: { fontSize: '11px', color: '#EF4444', fontWeight: 600, marginTop: '6px', display: 'block', fontFamily: "'DM Mono', monospace" },
  pwToggle: {
    position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#64748B',
    fontFamily: "'DM Mono', monospace", letterSpacing: '1px'
  },
  submitBtn: {
    width: '100%', background: '#2563EB', color: '#FFFFFF', 
    border: 'none', borderRadius: '4px', padding: '16px', 
    fontSize: '13px', fontWeight: 800, fontFamily: "'DM Mono', monospace", letterSpacing: '1px',
    cursor: 'pointer', transition: 'all 0.2s', marginTop: '10px'
  },
  signUpPrompt: { fontSize: '12px', color: '#64748B', textAlign: 'center', marginTop: '30px', fontFamily: "'DM Mono', monospace" },
  signUpLink: { color: '#2563EB', textDecoration: 'none', fontWeight: 700 },
  terminalFooter: { 
    fontSize: '10px', color: '#334155', fontFamily: "'DM Mono', monospace", 
    marginTop: '40px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '20px', lineHeight: '1.6'
  }
};

export default Login;
