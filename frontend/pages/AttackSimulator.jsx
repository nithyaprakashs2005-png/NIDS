import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import TamilNaduMap, { TN_CITIES } from '../components/TamilNaduMap';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ── NSL-KDD Feature Presets per attack type ──────────────────────────────
const FEATURE_PRESETS = {
  'DDoS': {
    label: 'DoS / SYN Flood', icon: '💥',
    features: { duration: 0, protocol_type: 'tcp', service: 'http', flag: 'S0',
      src_bytes: 0, dst_bytes: 0, land: 0, wrong_fragment: 0, urgent: 0,
      hot: 0, num_failed_logins: 0, logged_in: 0, count: 511, srv_count: 511,
      same_srv_rate: 1.0, diff_srv_rate: 0.0, dst_host_diff_srv_rate: 0.0 }
  },
  'Brute Force': {
    label: 'R2L / Password Guess', icon: '🔐',
    features: { duration: 0, protocol_type: 'tcp', service: 'ftp', flag: 'SF',
      src_bytes: 600, dst_bytes: 600, land: 0, wrong_fragment: 0, urgent: 0,
      hot: 0, num_failed_logins: 4, logged_in: 0, count: 2, srv_count: 2,
      same_srv_rate: 1.0, diff_srv_rate: 0.0, dst_host_diff_srv_rate: 0.0 }
  },
  'SQL Injection': {
    label: 'U2R / Root Exploit', icon: '💉',
    features: { duration: 0, protocol_type: 'tcp', service: 'http', flag: 'SF',
      src_bytes: 181, dst_bytes: 5450, land: 0, wrong_fragment: 0, urgent: 0,
      hot: 4, num_failed_logins: 0, logged_in: 1, count: 1, srv_count: 1,
      same_srv_rate: 1.0, diff_srv_rate: 0.0, dst_host_diff_srv_rate: 0.0 }
  },
  'Port Scan': {
    label: 'Probe / Reconnaissance', icon: '🔍',
    features: { duration: 0, protocol_type: 'tcp', service: 'private', flag: 'REJ',
      src_bytes: 0, dst_bytes: 0, land: 0, wrong_fragment: 0, urgent: 0,
      hot: 0, num_failed_logins: 0, logged_in: 0, count: 200, srv_count: 4,
      same_srv_rate: 0.06, diff_srv_rate: 0.06, dst_host_diff_srv_rate: 0.9 }
  },
  'Zero-Day': {
    label: 'Unknown / Heuristic', icon: '☢️',
    features: { duration: 1, protocol_type: 'tcp', service: 'other', flag: 'SF',
      src_bytes: 9999, dst_bytes: 9999, land: 0, wrong_fragment: 1, urgent: 1,
      hot: 9, num_failed_logins: 3, logged_in: 1, count: 512, srv_count: 100,
      same_srv_rate: 0.5, diff_srv_rate: 0.5, dst_host_diff_srv_rate: 0.5 }
  },
};

const ATTACK_TYPES = Object.keys(FEATURE_PRESETS);

// ── Cyber Alarm ──────────────────────────────────────────────────────────

const playCyberSound = (type = 'sonar') => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const t = ctx.currentTime;
    if (type === 'sonar') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(200, t + 0.5);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
      osc.start(t); osc.stop(t + 0.8);
    } else if (type === 'chirp') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.02);
      gain.gain.linearRampToValueAtTime(0, t + 0.08);
      osc.start(t); osc.stop(t + 0.1);
    } else if (type === 'siren') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.linearRampToValueAtTime(880, t + 0.2);
      osc.frequency.linearRampToValueAtTime(440, t + 0.4);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.05);
      gain.gain.linearRampToValueAtTime(0, t + 0.4);
      osc.start(t); osc.stop(t + 0.4);
    }
  } catch(e) {}
};

const speakThreat = (msg) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel(); // stop any current speech
  const utterance = new SpeechSynthesisUtterance(msg);
  const voices = window.speechSynthesis.getVoices();
  // Find a clear female voice
  const voice = voices.find(v => v.name.includes('Female') || v.name.includes('Google US English') || v.name.includes('Zira')) || voices[0];
  if (voice) utterance.voice = voice;
  utterance.pitch = 1.1;
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
};

// ── Feature Key Display Names ────────────────────────────────────────────
const FEATURE_LABELS = {
  duration: 'Duration', protocol_type: 'Protocol', service: 'Service', flag: 'Flag',
  src_bytes: 'Src Bytes', dst_bytes: 'Dst Bytes', land: 'Land', wrong_fragment: 'Wrong Frag',
  urgent: 'Urgent', hot: 'Hot', num_failed_logins: 'Failed Logins', logged_in: 'Logged In',
  count: 'Count', srv_count: 'Srv Count', same_srv_rate: 'Same Srv Rate',
  diff_srv_rate: 'Diff Srv Rate', dst_host_diff_srv_rate: 'DST Diff Srv'
};

// Maps simulator attack types → Predict.jsx Quick Preset names
const ATTACK_TO_PRESET = {
    'DDoS':          'DoS (Syn Flood)',
    'Brute Force':   'R2L (Password Guess)',
    'SQL Injection': 'U2R (Root Exploit)',
    'Port Scan':     'Probe Attack',
    'Zero-Day':      'Probe Attack',
};

const AttackSimulator = () => {
    const defaultCenter = [13.0827, 80.2707]; // Default to Chennai Hub if geolocation is pending
    const navigate = useNavigate();
    const [selectedCity, setSelectedCity] = useState(TN_CITIES[0]);
    const setSelectedCitySafe = (city) => {
        if (!city) return;
        setSelectedCity(city);
    };
    const [attackType, setAttackType] = useState('DDoS');
    const [simStatus, setSimStatus] = useState('idle');
    const [report, setReport] = useState(null);
    const [logLines, setLogLines] = useState(['> AWAITING OPERATOR INPUT...']);
    const [userLocation, setUserLocation] = useState(() => {
        const saved = localStorage.getItem('admin_location');
        return saved ? JSON.parse(saved) : null;
    });
    const currentCenter = userLocation || defaultCenter;
    const [activeFeatures, setActiveFeatures] = useState(null);
    const [showFeatures, setShowFeatures] = useState(false);
    const logEndRef = useRef(null);

    useEffect(() => {
        const storedLoc = localStorage.getItem('admin_location');
        if (storedLoc) {
            setUserLocation(JSON.parse(storedLoc));
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const loc = [pos.coords.latitude, pos.coords.longitude];
                    setUserLocation(loc);
                    localStorage.setItem('admin_location', JSON.stringify(loc));
                },
                () => {
                    if (!storedLoc) setUserLocation([13.0827, 80.2707]);
                }
            );
        }
    }, []);

    const addLog = (line) => {
        setLogLines(prev => [...prev, `> [${new Date().toLocaleTimeString()}] ${line}`]);
    };

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logLines]);

    // Auto-select features when attack type changes
    useEffect(() => {
        setActiveFeatures({ ...FEATURE_PRESETS[attackType].features });
    }, [attackType]);

    const handleSimulate = async () => {
        if (!userLocation) { addLog('ERROR: GEOLOCATION NOT ACQUIRED'); return; }

        setSimStatus('analyzing');
        setReport(null);
        setShowFeatures(true);
        setLogLines(['> SIMULATION INITIALIZED...']);
        playCyberSound('sonar');

        const preset = FEATURE_PRESETS[attackType];
        setActiveFeatures({ ...preset.features });
        const predictPreset = ATTACK_TO_PRESET[attackType];

        const isCustomHub = selectedCity?.id === 'MY_LOCATION';
        const originName = isCustomHub ? 'User Hub (Custom)' : selectedCity.name;
        const originId = isCustomHub ? 'HUB_STATION' : selectedCity.id;

        localStorage.setItem('sim_preset', predictPreset);
        localStorage.setItem('sim_attack', attackType);
        localStorage.setItem('sim_city', originName);

        setTimeout(() => addLog(`ORIGIN: ${originName} (${originId})`), 200);
        setTimeout(() => addLog(`VECTOR: ${attackType} — ${preset.label}`), 400);
        setTimeout(() => { 
            addLog(`INJECTING NSL-KDD FEATURES INTO PREDICT ENGINE...`);
            playCyberSound('chirp');
        }, 600);
        setTimeout(() => addLog(`PRESET: "${predictPreset}" loaded`), 800);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ 
                    city_id: isCustomHub ? 'CHENNAI' : selectedCity.id, 
                    attack_type: attackType,
                    // Pass coordinates if it's a custom hub to 'cheat' the backend into returning correct lat/lng
                    custom_coords: isCustomHub ? userLocation : null
                })
            });
            const data = await res.json();

            setTimeout(() => {
                setReport(data);
                setSimStatus('finished');

                const isAttack = data.prediction === 'Attack';
                addLog(`RESULT: ${data.prediction?.toUpperCase() || 'UNKNOWN'} DETECTED`);
                addLog(`CONFIDENCE: ${data.confidence}%`);
                addLog(`FIREWALL: ${isAttack ? '🔴 BLOCKING IP — ' + data.origin_ip : '🟢 NORMAL TRAFFIC'}`);
                if (isAttack) {
                    const msg = attackType === 'DDoS' ? 'D-DoS Attack Detected' : 
                                attackType === 'Brute Force' ? 'Brute Force Attack Detected' : 
                                attackType === 'SQL Injection' ? 'Injection Attack Detected' :
                                `${attackType} Attack Detected`;
                    speakThreat(msg);
                }

                // After 2s navigate to Predict page so user can see auto-filled inputs
                addLog(`→ REDIRECTING TO PREDICT ENGINE...`);
                setTimeout(() => navigate('/predict'), 1800);
            }, 1600);

        } catch (err) {
            addLog(`ERROR: BACKEND COMMUNICATION FAILURE`);
            setSimStatus('idle');
        }
    };

    const preset = FEATURE_PRESETS[attackType];

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>⚡ TAMIL NADU ATTACK SIMULATOR</h1>
                    <p style={styles.subtitle}>Inject NSL-KDD packets — analyze real threat signatures</p>
                </div>
                <div style={styles.statusPill}>
                    <div style={{
                        ...styles.statusDot,
                        background: simStatus === 'analyzing' ? '#F59E0B' : simStatus === 'finished' && report?.prediction === 'Attack' ? '#EF4444' : '#10B981',
                        boxShadow: simStatus === 'analyzing' ? '0 0 8px #F59E0B' : ''
                    }}></div>
                    {simStatus === 'idle' ? 'SYSTEM READY' : simStatus === 'analyzing' ? 'ANALYZING...' : report?.prediction === 'Attack' ? '🚨 THREAT DETECTED' : '✅ CLEAR'}
                </div>
            </div>

            <div style={styles.mainLayout}>
                {/* === LEFT SIDEBAR === */}
                <div style={styles.sidebar}>
                    {/* City Selector */}
                    <div style={styles.panelBox}>
                        <label style={styles.label}>1. ORIGIN CITY</label>
                        <select style={styles.select} value={selectedCity?.id}
                            onChange={(e) => {
                                setSelectedCity(TN_CITIES.find(c => c.id === e.target.value));
                            }}>
                            {TN_CITIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            <option value="MY_LOCATION">📍 MY CURRENT HUB LOCATION</option>
                        </select>
                    </div>

                    {/* Attack Type */}
                    <div style={styles.panelBox}>
                        <label style={styles.label}>2. ATTACK VECTOR</label>
                        <div style={styles.radioGroup}>
                            {ATTACK_TYPES.map(t => (
                                <label key={t} style={{
                                    ...styles.radioLabel,
                                    background: attackType === t ? '#EFF6FF' : 'transparent',
                                    border: `1px solid ${attackType === t ? '#2563EB' : '#E2E8F0'}`,
                                    borderRadius: '6px', padding: '8px 10px', transition: 'all 0.15s'
                                }}>
                                    <input type="radio" name="attack" checked={attackType === t}
                                        onChange={() => setAttackType(t)} style={{ accentColor: '#2563EB' }} />
                                    <span style={{ fontSize: '13px' }}>{FEATURE_PRESETS[t].icon}</span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '13px' }}>{t}</div>
                                        <div style={{ fontSize: '10px', color: '#94A3B8' }}>{FEATURE_PRESETS[t].label}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button
                        style={{ ...styles.simBtn, background: simStatus === 'analyzing' ? '#64748B' : 'linear-gradient(135deg, #1D4ED8, #2563EB)' }}
                        onClick={handleSimulate}
                        disabled={simStatus === 'analyzing'}
                    >
                        {simStatus === 'analyzing' ? '⏳ RUNNING...' : '▶ EXECUTE SIMULATION'}
                    </button>

                    {/* Intel Report */}
                    {report && (
                        <div style={{ ...styles.reportArea, borderLeft: `3px solid ${report.prediction === 'Attack' ? '#EF4444' : '#10B981'}` }}>
                            <h3 style={styles.reportTitle}>INTEL EXTRACTED</h3>
                            <div style={styles.reportRow}><span>CITY</span> <span>{report.origin_city}</span></div>
                            <div style={styles.reportRow}><span>IP</span> <span style={{ fontFamily: 'monospace' }}>{report.origin_ip}</span></div>
                            <div style={styles.reportRow}><span>CONF</span> <span>{report.confidence}%</span></div>
                            <div style={{ ...styles.reportRow, marginBottom: 0 }}>
                                <span>RESULT</span>
                                <b style={{ color: report.prediction === 'Attack' ? '#F87171' : '#34D399', fontSize: '13px' }}>
                                    {report.prediction === 'Attack' ? '🔴' : '🟢'} {report.prediction?.toUpperCase()}
                                </b>
                            </div>
                        </div>
                    )}
                </div>

                {/* === CENTER: Map + Panels === */}
                <div style={styles.centerArea}>
                    {/* Map */}
                    <div style={styles.mapFrame}>
                        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, background: 'rgba(255,255,255,0.92)', padding: '6px 12px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '10px', color: '#2563EB', pointerEvents: 'none', fontWeight: 800, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            🎯 CLICK ANYWHERE ON MAP TO RELOCATE ADMIN HUB
                        </div>
                        <TamilNaduMap
                            userLocation={userLocation}
                            selectedCity={selectedCity}
                            onCityClick={setSelectedCity}
                            onMapClick={(loc) => {
                                setUserLocation(loc);
                                localStorage.setItem('admin_location', JSON.stringify(loc));
                                addLog(`ADMIN HUB RELOCATED: ${loc[0].toFixed(4)}, ${loc[1].toFixed(4)}`);
                                playCyberSound('chirp');
                            }}
                            onHubRelocate={(loc) => {
                                setUserLocation(loc);
                                localStorage.setItem('admin_location', JSON.stringify(loc));
                                addLog(`ADMIN HUB MOVED TO STATION: ${loc[0].toFixed(2)}, ${loc[1].toFixed(2)}`);
                                playCyberSound('chirp');
                            }}
                            simulationPath={simStatus !== 'idle' ? [selectedCity?.lat, selectedCity?.lng] : null}
                        />
                    </div>

                    {/* Bottom Bar */}
                    <div style={styles.bottomBar}>
                        {/* Terminal */}
                        <div style={styles.logPanel}>
                            <div style={styles.panelHeader}>TERMINAL FEED</div>
                            <div style={styles.logScroll}>
                                {logLines.map((l, i) => (
                                    <div key={i} style={{ ...styles.logLine, color: l.includes('ERROR') ? '#F87171' : l.includes('RESULT') ? '#FBBF24' : '#10B981' }}>{l}</div>
                                ))}
                                <div ref={logEndRef} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* === RIGHT: Network Feature Panel === */}
                <div style={styles.featurePanel}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <div style={styles.label}>NETWORK FEATURES</div>
                            <div style={{ fontSize: '10px', color: '#94A3B8' }}>NSL-KDD Packet Signature</div>
                        </div>
                        <span style={{ fontSize: '20px' }}>{preset.icon}</span>
                    </div>

                    <div style={{ ...styles.featureBadge, background: '#EFF6FF', color: '#2563EB', marginBottom: '16px' }}>
                        {preset.label}
                    </div>

                    <div style={styles.featureGrid}>
                        {activeFeatures && Object.entries(activeFeatures).map(([key, val]) => (
                            <div key={key} style={styles.featureRow}>
                                <div style={styles.featureKey}>{FEATURE_LABELS[key] || key}</div>
                                <div style={{
                                    ...styles.featureVal,
                                    color: showFeatures && simStatus !== 'idle' ? '#2563EB' : '#0F172A',
                                    fontWeight: showFeatures && simStatus !== 'idle' ? 700 : 500,
                                }}>
                                    {typeof val === 'number' ? val : String(val)}
                                </div>
                            </div>
                        ))}
                    </div>

                    {showFeatures && (
                        <div style={{ marginTop: '12px', padding: '8px', background: '#ECFDF5', borderRadius: '6px', fontSize: '10px', color: '#059669', fontWeight: 700 }}>
                            ✓ Injected into NIDS engine
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Mono&family=Outfit:wght@400;700;800&display=swap');
                select, button { font-family: 'Outfit', sans-serif; }
                @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
            `}</style>
        </div>
    );
};

const styles = {
    container: { height: 'calc(100vh - 64px)', background: '#F8FAFC', padding: '20px', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', sans-serif", overflow: 'hidden' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
    title: { fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 },
    subtitle: { fontSize: '12px', color: '#64748B', margin: '3px 0 0 0' },
    statusPill: { background: '#FFF', padding: '8px 16px', borderRadius: '30px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, border: '1px solid #E2E8F0' },
    statusDot: { width: '8px', height: '8px', borderRadius: '50%', transition: 'all 0.4s' },
    mainLayout: { display: 'flex', gap: '16px', flex: 1, minHeight: 0 },
    sidebar: { width: '260px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' },
    panelBox: { background: '#FFF', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #E2E8F0' },
    label: { display: 'block', fontSize: '10px', fontWeight: 800, color: '#2563EB', marginBottom: '10px', letterSpacing: '1px' },
    select: { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0', fontSize: '13px', background: '#F8FAFC' },
    radioGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
    radioLabel: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' },
    simBtn: { border: 'none', color: '#FFF', padding: '14px', borderRadius: '8px', fontWeight: 800, letterSpacing: '1px', cursor: 'pointer', transition: 'all 0.2s', fontSize: '13px', textAlign: 'center' },
    reportArea: { background: '#0F172A', padding: '16px', borderRadius: '8px', color: '#FFF' },
    reportTitle: { fontSize: '9px', color: '#60A5FA', margin: '0 0 12px 0', letterSpacing: '2px' },
    reportRow: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '8px', opacity: 0.9 },
    centerArea: { flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 },
    mapFrame: { flex: 1, background: '#FFF', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', position: 'relative', overflow: 'hidden', minHeight: 0 },
    bottomBar: { height: '190px', display: 'flex', gap: '12px', flexShrink: 0 },
    logPanel: { flex: 1, background: '#0F172A', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column' },
    panelHeader: { fontSize: '9px', fontWeight: 800, color: '#475569', marginBottom: '8px', letterSpacing: '1.5px' },
    logScroll: { flex: 1, overflowY: 'auto', fontFamily: "'DM Mono', monospace", fontSize: '10px', lineHeight: '1.6' },
    logLine: { marginBottom: '1px' },
    featurePanel: { width: '240px', background: '#FFF', borderRadius: '10px', padding: '16px', border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
    featureBadge: { fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '20px', display: 'inline-block', letterSpacing: '0.5px' },
    featureGrid: { display: 'flex', flexDirection: 'column', gap: '4px' },
    featureRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', borderRadius: '4px', background: '#F8FAFC' },
    featureKey: { fontSize: '10px', color: '#64748B', fontWeight: 600 },
    featureVal: { fontSize: '11px', fontFamily: "'DM Mono', monospace", transition: 'color 0.4s' },
};

export default AttackSimulator;
