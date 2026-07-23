import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSecurity } from '../context/SecurityContext';

const Signup = () => {
  const { registerUser, isAuthenticated, user } = useSecurity();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]       = useState('');
  const [successMsg, setSuccessMsg] = useState('');
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
    setEmailError(val && !re.test(val) ? 'Please enter a valid email address' : '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (emailError || !email || !password || !username) {
      setError('Please fill in all fields correctly.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccessMsg('');
    const result = await registerUser(username, email, password);
    setIsLoading(false);
    if (result.success) {
      setSuccessMsg('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setError(result.message);
    }
  };

  return (
    <div style={styles.page}>
      {/* Left branding panel */}
      <div style={styles.leftPanel}>
        <div style={styles.brandLogo}>
          <div style={styles.logoIcon}>S</div>
          <span style={styles.logoText}>Sentinel<span style={styles.logoAccent}>Gate</span></span>
        </div>
        <h1 style={styles.brandTitle}>AI-Powered Network<br />Security Platform</h1>
        <p style={styles.brandDesc}>Real-time intrusion detection, identity verification, and intelligent threat scoring — all in one unified dashboard.</p>
        <div style={styles.featureList}>
          {['JWT-Secured Access Control', 'Real-time KYC Verification', 'NIDS Threat Detection', 'Risk-Based Alert System'].map(f => (
            <div key={f} style={styles.featureItem}>
              <span style={styles.featureCheck}>✓</span> {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right signup form */}
      <div style={styles.rightPanel}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Create Account</h2>
            <p style={styles.cardSubtitle}>Register for SentinelGate</p>
          </div>

          {error && (
            <div style={styles.errorBanner}>
              <span>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Registration Failed</div>
                <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>{error}</div>
              </div>
            </div>
          )}

          {successMsg && (
            <div style={styles.successBanner}>
              <span>✅</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Success</div>
                <div style={{ fontSize: 12, marginTop: 2, opacity: 0.85 }}>{successMsg}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={styles.field}>
              <label style={styles.label}>Username</label>
              <input
                type="text"
                style={styles.input}
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="johndoe"
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                style={{ ...styles.input, ...(emailError ? styles.inputError : {}) }}
                value={email}
                onChange={e => { setEmail(e.target.value); validateEmail(e.target.value); }}
                placeholder="john@example.com"
                required
              />
              {emailError && <span style={styles.fieldError}>{emailError}</span>}
            </div>

            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  style={styles.input}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={styles.pwToggle}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" style={styles.submitBtn} disabled={isLoading || successMsg}>
              {isLoading ? <span style={styles.spinner} /> : 'Sign Up →'}
            </button>
          </form>

          <div style={styles.signUpPrompt}>
            Already have an account? <Link to="/login" style={styles.signUpLink}>Log in</Link>
          </div>

          <p style={styles.footerNote}>Protected by Advanced Threat Intelligence. All sessions are monitored.</p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input { font-family: 'Outfit', sans-serif; }
        input::placeholder { color: #94A3B8; }
        input:focus { outline: none; border-color: #2563EB !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
      `}</style>
    </div>
  );
};

const styles = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: "'Outfit', sans-serif" },
  leftPanel: {
    flex: 1, background: 'linear-gradient(160deg, #0F172A 0%, #1E3A5F 100%)',
    color: 'white', padding: '60px 48px', display: 'flex', flexDirection: 'column',
    justifyContent: 'center', minWidth: 0,
  },
  brandLogo: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 },
  logoIcon: {
    width: 44, height: 44, background: '#2563EB', borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 22, fontWeight: 800, color: 'white',
  },
  logoText: { fontSize: 22, fontWeight: 800 },
  logoAccent: { color: '#60A5FA' },
  brandTitle: { fontSize: 36, fontWeight: 800, lineHeight: 1.2, marginBottom: 16 },
  brandDesc: { fontSize: 15, color: '#94A3B8', lineHeight: 1.7, marginBottom: 40, maxWidth: 400 },
  featureList: { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 48 },
  featureItem: { fontSize: 14, color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: 10 },
  featureCheck: { width: 20, height: 20, background: 'rgba(37,99,235,0.3)', borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60A5FA', fontSize: 11, fontWeight: 700, flexShrink: 0 },
  rightPanel: {
    width: '420px', flexShrink: 0, background: '#F4F7FE',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
  },
  card: {
    background: '#FFFFFF', borderRadius: 20, padding: '40px 36px',
    boxShadow: '0 10px 40px rgba(15,23,42,0.08)', border: '1px solid #E2E8F0', width: '100%',
  },
  cardHeader: { marginBottom: 28 },
  cardTitle: { fontSize: 22, fontWeight: 800, color: '#0F172A', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: '#64748B' },
  errorBanner: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
    padding: '12px 14px', marginBottom: 20, color: '#991B1B',
  },
  successBanner: {
    display: 'flex', gap: 10, alignItems: 'flex-start',
    background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10,
    padding: '12px 14px', marginBottom: 20, color: '#166534',
  },
  field: { marginBottom: 20 },
  label: { display: 'block', fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  input: {
    width: '100%', background: '#F8FAFC', border: '1px solid #E2E8F0',
    borderRadius: 10, padding: '11px 14px', fontSize: 14, color: '#0F172A',
    transition: 'all 0.2s', boxSizing: 'border-box',
  },
  inputError: { borderColor: '#EF4444', background: '#FFFBFB' },
  fieldError: { fontSize: 11, color: '#EF4444', fontWeight: 600, marginTop: 4, display: 'block' },
  pwToggle: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 4px',
  },
  submitBtn: {
    width: '100%', background: '#2563EB', color: 'white', border: 'none',
    borderRadius: 10, padding: '13px', fontSize: 14, fontWeight: 700,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 8, transition: 'all 0.2s', fontFamily: "'Outfit', sans-serif",
  },
  spinner: {
    width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: 'white', borderRadius: '50%', display: 'inline-block',
    animation: 'spin 0.8s linear infinite',
  },
  signUpPrompt: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 24, fontWeight: 500 },
  signUpLink: { color: '#2563EB', fontWeight: 700, textDecoration: 'none' },
  footerNote: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 28 },
};

export default Signup;
