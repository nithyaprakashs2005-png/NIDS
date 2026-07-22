import { useState, useEffect, useCallback } from 'react';
import { predictService } from '../services/api';
import { useSecurity } from '../context/SecurityContext';

const FEATURE_DEFAULTS = {
  duration: 0,
  protocol_type: 'tcp',
  service: 'http',
  flag: 'SF',
  src_bytes: 181,
  dst_bytes: 5450,
  land: 0,
  wrong_fragment: 0,
  urgent: 0,
  hot: 0,
  num_failed_logins: 0,
  logged_in: 1,
  count: 8,
  srv_count: 8,
  same_srv_rate: 1.0,
  diff_srv_rate: 0.0,
  dst_host_diff_srv_rate: 0.0,
};

const PRESETS = {
  'Normal Traffic': FEATURE_DEFAULTS,
  'DoS (Syn Flood)': { ...FEATURE_DEFAULTS, flag: 'S0', count: 120 },
  'Probe Attack': { ...FEATURE_DEFAULTS, diff_srv_rate: 0.9, dst_host_diff_srv_rate: 0.9, same_srv_rate: 0.1 },
  'U2R (Root Exploit)': { ...FEATURE_DEFAULTS, hot: 4, logged_in: 1, count: 1 },
  'R2L (Password Guess)': { ...FEATURE_DEFAULTS, num_failed_logins: 4, count: 2, src_bytes: 600, dst_bytes: 600 }
};

const OPTIONS = {
  protocol_type: ['tcp', 'udp', 'icmp'],
  flag: ['SF', 'S0', 'REJ', 'RSTR', 'RSTO', 'SH', 'S1', 'S2', 'S3', 'OTH'],
  service: ['http', 'ftp_data', 'other', 'private', 'domain_u', 'smtp', 'ftp', 'eco_i', 'ssh', 'pop_3', 'imap4']
};

const FULL_FEATURE_ORDER = [
  "duration", "protocol_type", "service", "flag", "src_bytes", "dst_bytes",
  "land", "wrong_fragment", "urgent", "hot", "num_failed_logins", "logged_in",
  "num_compromised", "root_shell", "su_attempted", "num_root", "num_file_creations",
  "num_shells", "num_access_files", "num_outbound_cmds", "is_host_login",
  "is_guest_login", "count", "srv_count", "serror_rate", "srv_serror_rate",
  "rerror_rate", "srv_rerror_rate", "same_srv_rate", "diff_srv_rate",
  "srv_diff_host_rate", "dst_host_count", "dst_host_srv_count",
  "dst_host_same_srv_rate", "dst_host_diff_srv_rate", "dst_host_same_src_port_rate",
  "dst_host_srv_diff_host_rate", "dst_host_serror_rate", "dst_host_srv_serror_rate",
  "dst_host_rerror_rate", "dst_host_srv_rerror_rate"
];

// Cyber alarm (reused from AdminDashboard)
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
      gain.gain.linearRampToValueAtTime(0, t + 0.05);
      osc.start(t); osc.stop(t + 0.05);
    }
  } catch(e) {}
};

const speakThreat = (msg) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(msg);
  const voices = window.speechSynthesis.getVoices();
  const voice = voices.find(v => v.name.includes('Female') || v.name.includes('Google US English') || v.name.includes('Zira')) || voices[0];
  if (voice) utterance.voice = voice;
  utterance.pitch = 1.1;
  utterance.rate = 1.0;
  window.speechSynthesis.speak(utterance);
};

export default function Predict() {
  const { addPrediction, recentPredictions: history } = useSecurity();
  const [activeMode, setActiveMode] = useState('manual');
  const [selectedModel, setSelectedModel] = useState('random_forest');
  const [result, setResult] = useState(null);
  const [bulkResults, setBulkResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [features, setFeatures] = useState(FEATURE_DEFAULTS);
  const [showFeatures, setShowFeatures] = useState(false);
  const [packetStr, setPacketStr] = useState('');
  const [simBanner, setSimBanner] = useState(null);
  const [activePreset, setActivePreset] = useState(null); // tracks which Quick Preset is active

  const runPrediction = useCallback(async (featureOverride) => {
    setLoading(true);
    setResult(null);
    playCyberSound('sonar');
    try {
      // Ensure we don't pass a React event object as features
      const payload = (featureOverride && typeof featureOverride === 'object' && !featureOverride.nativeEvent) 
        ? featureOverride 
        : features;
      const data = await predictService.runPrediction(payload, selectedModel);
      setResult(data);
      addPrediction(data);
      if (data.prediction !== 'Attack') playCyberSound('chirp');
      return data;
    } finally {
      setLoading(false);
    }
  }, [features, addPrediction, selectedModel]);

  // On mount: check if Attack Simulator sent us a preset
  useEffect(() => {
    const pendingPreset = localStorage.getItem('sim_preset');
    const pendingAttack = localStorage.getItem('sim_attack');
    const pendingCity   = localStorage.getItem('sim_city');
    if (pendingPreset && PRESETS[pendingPreset]) {
      const presetFeatures = { ...PRESETS[pendingPreset] };
      setFeatures(presetFeatures);
      setShowFeatures(true);
      setSimBanner({ attack: pendingAttack, preset: pendingPreset, city: pendingCity });
      setActivePreset(pendingPreset);
      localStorage.removeItem('sim_preset');
      localStorage.removeItem('sim_attack');
      localStorage.removeItem('sim_city');
      // Auto-run after a short delay so state settles
      setTimeout(async () => {
        const data = await predictService.runPrediction(presetFeatures);
        if (data) {
          addPrediction(data);
          setResult(data);
          if (data.prediction === 'Attack') speakThreat('Threat Detected. Check SOC Dashboard.');
        }
      }, 600);
    }
  }, []);

  const handleRawParse = async () => {
    if (!packetStr.trim()) return;
    setLoading(true);
    try {
      const { features: parsed } = await predictService.parsePacketStr(packetStr);
      setFeatures(parsed);
      setShowFeatures(true);
      // Auto run prediction after parsing
      const data = await predictService.runPrediction(parsed);
      setResult(data);
      addPrediction(data);
    } catch (e) {
      alert("Failed to parse packet string. Ensure it is comma-separated.");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setLoading(true);
    setBulkResults(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const csv = event.target.result;
      const lines = csv.split('\n').filter(l => l.trim().length > 0);
      const packets = lines.map(line => {
        const parts = line.split(',').map(p => p.trim());
        const pDict = {};
        
        // Smart Format Detection (Mirroring Backend)
        const simplifiedKeys = Object.keys(FEATURE_DEFAULTS);
        const mappingOrder = parts.length <= 20 ? simplifiedKeys : FULL_FEATURE_ORDER;
        
        mappingOrder.forEach((feat, i) => {
          if (i < parts.length) pDict[feat] = parts[i];
          else pDict[feat] = 0;
        });
        return pDict;
      });

      try {
        const data = await predictService.runBulkPrediction(packets.slice(0, 500), selectedModel);
        setBulkResults(data);
      } catch (err) {
        alert("Bulk analysis failed.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const isAttack = result?.prediction === 'Attack';

  return (
    <div className="page-content">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="page-title">Threat Prediction</h1>
          <p className="page-subtitle">Analyze network features and classify traffic in real-time</p>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-card)', padding: 4, borderRadius: 10, border: '1px solid var(--border)' }}>
          {[
            { id: 'manual', label: 'Manual' },
            { id: 'paste', label: 'Easy Paste' },
            { id: 'bulk', label: 'Bulk CSV' }
          ].map(m => (
            <button key={m.id} onClick={() => setActiveMode(m.id)} style={{
              padding: '6px 12px', fontSize: 12, fontWeight: 700, borderRadius: 8, border: 'none',
              background: activeMode === m.id ? 'var(--primary)' : 'transparent',
              color: activeMode === m.id ? 'white' : 'var(--text-muted)',
              cursor: 'pointer', transition: 'all 0.2s'
            }}>{m.label}</button>
          ))}
        </div>
      </div>

      {/* ── Simulator Banner ── */}
      {simBanner && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px',
          background: 'linear-gradient(90deg, #1E3A8A 0%, #1D4ED8 100%)',
          borderRadius: 10, marginBottom: 16, color: '#FFF', fontSize: 13,
          boxShadow: '0 4px 16px rgba(37,99,235,0.25)'
        }}>
          <span style={{ fontSize: 22 }}>⚡</span>
          <div style={{ flex: 1 }}>
            <b>Attack Simulator Injection</b> — <span style={{ opacity: 0.85 }}>{simBanner.attack}</span> from <b>{simBanner.city}</b>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>Features auto-filled with preset: <b>{simBanner.preset}</b> · Running prediction…</div>
          </div>
          <button onClick={() => setSimBanner(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#FFF', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>✕ Dismiss</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Hero / Input Section */}
          <div className="predict-hero" style={{ minHeight: 280, justifyContent: 'center' }}>
            {activeMode === 'manual' ? (
              <>
                <div className={`scan-ring${loading ? ' active' : ''}`}>
                  <span className="scan-icon">
                    {loading ? '⚡' : result ? (isAttack ? '🚨' : '✅') : '🔍'}
                  </span>
                </div>
                <h2 className="predict-title">
                  {loading ? 'Analyzing...' : result ? (isAttack ? 'Attack Detected!' : 'Traffic is Normal') : 'Manual Analysis'}
                </h2>
                <button
                  className={`btn btn-lg${isAttack ? ' btn-danger' : ' btn-primary'}`}
                  onClick={() => runPrediction()}
                  disabled={loading}
                  style={{ minWidth: 200, justifyContent: 'center', marginTop: 10 }}
                >
                  {loading ? <div className="spinner" /> : '▶ Run Prediction'}
                </button>
              </>
            ) : activeMode === 'paste' ? (
              <div style={{ width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>📋</div>
                <h2 className="predict-title">Easy Paste Console</h2>
                <p className="predict-sub">Paste a raw NSL-KDD comma-separated string below</p>
                <textarea 
                  value={packetStr}
                  onChange={e => setPacketStr(e.target.value)}
                  placeholder="e.g. 0,tcp,private,S0,0,0,0,0,0,0,0,0,123,6 (Neptune DoS)"
                  style={{ 
                    width: '100%', height: 80, marginTop: 16, borderRadius: 12, border: '1px solid var(--border)',
                    background: 'var(--bg-base)', padding: 12, color: 'var(--text)', fontFamily: 'var(--font-mono)',
                    fontSize: 12, resize: 'none', outline: 'none'
                  }}
                />
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleRawParse}
                  disabled={loading || !packetStr}
                  style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}
                >
                  {loading ? <div className="spinner" /> : '🚀 Parse & Predict'}
                </button>
              </div>
            ) : (
              <div style={{ width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>📊</div>
                <h2 className="predict-title">Bulk Dataset Analysis</h2>
                <p className="predict-sub">Upload a CSV log file to classify multiple packets at once</p>
                <label className="btn btn-primary btn-lg" style={{ marginTop: 20, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                  📁 {loading ? 'Processing...' : 'Select CSV File'}
                  <input type="file" accept=".csv" onChange={handleBulkUpload} hidden disabled={loading} />
                </label>
              </div>
            )}
          </div>

          {/* Individual Result Card */}
          {result && activeMode !== 'bulk' && (
            <div className={`result-card ${isAttack ? 'attack' : 'normal'}`}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>{isAttack ? '🚨' : '✅'}</div>
              <div className="result-label">
                {result.prediction}
                {isAttack && result.attack_type && ` — ${result.attack_type}`}
              </div>
              <p style={{ fontSize: 14, opacity: 0.8, marginBottom: 16, fontFamily: 'var(--font-display)' }}>
                Confidence: {result.confidence}%
              </p>
              <div className="confidence-bar-wrap">
                <div className="confidence-bar" style={{ width: `${result.confidence}%` }} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                {[
                  { label: 'Model', value: result.is_pipeline ? 'AI Pipeline' : result.model_used },
                  { label: 'Latency', value: `${result.inference_time_ms}ms` },
                  { label: 'Source', value: activeMode === 'paste' ? 'Raw Paste' : 'Manual' },
                ].map(item => (
                  <div key={item.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 11, opacity: 0.6, fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-display)', marginTop: 2 }}>{item.value}</div>
                  </div>
                ))}
              </div>
              
              {result.top_indicators && result.top_indicators.length > 0 && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 11, opacity: 0.6, fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Threat Analysis Indicators</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {result.top_indicators.map((ind, i) => (
                      <div key={i} style={{ padding: '4px 8px', borderRadius: 4, background: isAttack ? 'rgba(239, 68, 68,0.1)' : 'rgba(16, 185, 129, 0.1)', color: isAttack ? 'var(--accent-red)' : 'var(--accent-green)', fontSize: 10, fontWeight: 700, border: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {isAttack ? '⚠️' : '🔍'} {ind}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.is_pipeline && result.pipeline_steps && (
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                  <div style={{ fontSize: 11, opacity: 0.6, fontFamily: 'var(--font-display)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Pipeline Execution Trace</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {result.pipeline_steps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-base)', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'var(--primary)', flexShrink: 0 }}>
                          {step.step}
                        </div>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.4)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 6 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{step.role}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{step.time_ms}ms</span>
                          </div>
                          <div style={{ fontSize: 11, color: step.action.includes('Cleared') ? 'var(--accent-green)' : step.action.includes('Flagged') || step.action.includes('Confirmed') ? 'var(--accent-red)' : 'var(--text-muted)' }}>
                            {step.action}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bulk Results Table */}
          {bulkResults && activeMode === 'bulk' && (
            <div className="card">
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Analysis Report: {bulkResults.total} Packets</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)' }}>{bulkResults.total_elapsed_ms}ms TOTAL</div>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
                      {['#', 'Prediction', 'Attack Type', 'Confidence', 'Latency'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResults.results.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: r.prediction === 'Attack' ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>
                        <td style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{i+1}</td>
                        <td style={{ padding: '8px 16px', fontSize: 12, fontWeight: 700, color: r.prediction === 'Attack' ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                          {r.prediction === 'Attack' ? '🚨 Attack' : '✅ Normal'}
                        </td>
                        <td style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text)' }}>{r.attack_type || '—'}</td>
                        <td style={{ padding: '8px 16px', fontSize: 12, color: 'var(--text)' }}>{r.confidence}%</td>
                        <td style={{ padding: '8px 16px', fontSize: 11, color: 'var(--text-muted)' }}>{r.inference_time_ms}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Feature Inputs */}
          <div className="card">
            <div
              className="card-header"
              style={{ cursor: 'pointer', paddingBottom: 20 }}
              onClick={() => setShowFeatures(!showFeatures)}
            >
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>
                  Network Feature Inputs
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  Customize NSL-KDD features for prediction
                </div>
              </div>
              <span style={{ fontSize: 20, color: 'var(--text-muted)' }}>
                {showFeatures ? '▲' : '▼'}
              </span>
            </div>

            {showFeatures && (
              <div className="card-body" style={{ borderTop: '1px solid var(--border)' }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', fontFamily: 'var(--font-display)', letterSpacing: '0.5px' }}>
                    Quick Presets
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.keys(PRESETS).map(name => {
                      const isActive = activePreset === name;
                      return (
                        <button 
                          key={name}
                          onClick={() => { setFeatures(PRESETS[name]); setActivePreset(name); }}
                          style={{
                            padding: '6px 12px', fontSize: 13, borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                            background: isActive ? 'var(--primary-light)' : 'var(--bg-surface)',
                            cursor: 'pointer', fontFamily: 'var(--font-display)', fontWeight: isActive ? 700 : 500,
                            transition: 'all 0.2s', color: isActive ? 'var(--primary)' : 'var(--text)',
                            boxShadow: isActive ? '0 0 0 2px rgba(37,99,235,0.25)' : 'none'
                          }}
                        >
                          {isActive ? '⚡ ' : ''}{name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  {Object.entries(features).map(([key, val]) => (
                    <div key={key}>
                      <label className="form-label">{key.replace(/_/g, ' ')}</label>
                      {OPTIONS[key] ? (
                        <select
                          value={val}
                          onChange={e => setFeatures(prev => ({ ...prev, [key]: e.target.value }))}
                          style={{
                            width: '100%', height: 36, padding: '0 10px',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                            fontSize: 13, fontFamily: 'var(--font-mono)',
                            background: 'var(--bg-base)', outline: 'none', color: 'var(--text)',
                            transition: 'border-color 0.2s',
                          }}
                          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                          onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        >
                          {OPTIONS[key].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input
                          type={typeof val === 'number' ? 'number' : 'text'}
                          value={val}
                          onChange={e => setFeatures(prev => ({
                            ...prev,
                            [key]: typeof val === 'number' ? Number(e.target.value) : e.target.value,
                          }))}
                          style={{
                            width: '100%', height: 36, padding: '0 10px',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                            fontSize: 13, fontFamily: 'var(--font-mono)',
                            background: 'var(--bg-base)', outline: 'none', color: 'var(--text)',
                            transition: 'border-color 0.2s',
                          }}
                          onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                          onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Controls */}
        <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* History Panel */}
          <div className="card">
            <div className="card-header" style={{ paddingBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>Recent Predictions</div>
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                {history.length}/5
              </span>
            </div>
          <div className="card-body" style={{ borderTop: '1px solid var(--border)' }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '24px 0', fontFamily: 'var(--font-display)' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                No predictions yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {history.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      background: h.prediction === 'Attack' ? 'var(--accent-red-light)' : 'var(--accent-green-light)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
                        color: h.prediction === 'Attack' ? 'var(--accent-red)' : 'var(--accent-green)',
                      }}>
                        {h.prediction === 'Attack' ? '🚨' : '✅'} {h.prediction}
                      </span>
                      <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        {h.time}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-display)' }}>
                      {h.confidence}% confidence · {h.model_used}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
