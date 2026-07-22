import { useState, useRef } from 'react';

const DOC_TYPES = [
  { id: 'aadhaar', label: 'Aadhaar Card', icon: '🪪' },
  { id: 'pan', label: 'PAN Card', icon: '💳' },
  { id: 'passport', label: 'Passport', icon: '📗' },
  { id: 'dl', label: "Driver's License", icon: '🚗' },
];

const LIVENESS_CHECKS = [
  { label: 'Face Detected', key: 'face' },
  { label: 'Blink Verified', key: 'blink' },
  { label: 'Liveness Confirmed', key: 'liveness' },
  { label: 'Spoofing Clear', key: 'spoof' },
];

export default function KYCForm({ onSubmit, loading }) {
  const [selectedDoc, setSelectedDoc] = useState('aadhaar');
  const [file, setFile] = useState(null);
  const [livenessProgress, setLivenessProgress] = useState(0);
  const [livenessChecks, setLivenessChecks] = useState({
    face: false, blink: false, liveness: false, spoof: false,
  });
  const [scanStarted, setScanStarted] = useState(false);
  const fileRef = useRef();

  const handleFile = e => {
    if (e.target.files[0]) setFile(e.target.files[0]);
  };

  const startScan = () => {
    setScanStarted(true);
    setLivenessProgress(0);
    setLivenessChecks({ face: false, blink: false, liveness: false, spoof: false });

    const keys = ['face', 'blink', 'liveness', 'spoof'];
    keys.forEach((k, i) => {
      setTimeout(() => {
        setLivenessChecks(prev => ({ ...prev, [k]: true }));
        setLivenessProgress((i + 1) * 25);
      }, (i + 1) * 800);
    });
  };

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({ doc_type: selectedDoc, file_name: file?.name, liveness_score: livenessProgress });
    }
  };

  const circumference = 2 * Math.PI * 30;
  const strokeOffset = circumference - (livenessProgress / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Document Selection */}
      <div className="card">
        <div className="card-body">
          <div className="section-title">Select Document Type</div>
          <div className="doc-select-grid">
            {DOC_TYPES.map(doc => (
              <div
                key={doc.id}
                className={`doc-option${selectedDoc === doc.id ? ' selected' : ''}`}
                onClick={() => setSelectedDoc(doc.id)}
              >
                <span className="doc-option-icon">{doc.icon}</span>
                {doc.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="card">
        <div className="card-body">
          <div className="section-title">Upload Document</div>
          <div
            className={`file-upload-zone${file ? ' has-file' : ''}`}
            onClick={() => fileRef.current.click()}
          >
            <div className="file-upload-icon">{file ? '✅' : '📁'}</div>
            <div className="file-upload-text">
              {file ? file.name : 'Click to upload document'}
            </div>
            <div className="file-upload-sub">
              {file
                ? `${(file.size / 1024).toFixed(1)} KB · Ready`
                : 'JPG, PNG, PDF — Max 10 MB'}
            </div>
            <input
              type="file"
              ref={fileRef}
              className="file-upload-input"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFile}
            />
          </div>
        </div>
      </div>

      {/* Facial Scan */}
      <div className="facial-scan-card">
        <div className="section-title" style={{ marginBottom: 16 }}>Facial Biometric Scan</div>
        <div className="facial-scan-body">
          <div className="facial-scan-preview">
            {scanStarted ? '🧑' : '👤'}
          </div>

          <div className="liveness-section">
            <div className="liveness-title">Liveness Detection</div>
            <div className="liveness-circle-wrap">
              <div className="liveness-ring">
                <svg width="72" height="72" viewBox="0 0 72 72">
                  <circle
                    className="liveness-ring-track"
                    cx="36" cy="36" r="30"
                  />
                  <circle
                    className="liveness-ring-fill"
                    cx="36" cy="36" r="30"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                  />
                </svg>
                <div className="liveness-ring-text">{livenessProgress}%</div>
              </div>

              <div className="liveness-checks">
                {LIVENESS_CHECKS.map(check => (
                  <div key={check.key} className="liveness-check">
                    <span className={`check-icon ${livenessChecks[check.key] ? 'pass' : 'pending'}`}>
                      {livenessChecks[check.key] ? '✓' : '○'}
                    </span>
                    <span style={{ color: livenessChecks[check.key] ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 12 }}>
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {!scanStarted && (
              <button className="btn btn-outline btn-sm" style={{ marginTop: 14 }} onClick={startScan}>
                ▶ Start Facial Scan
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        className="btn btn-danger btn-lg w-full"
        onClick={handleSubmit}
        disabled={loading || livenessProgress < 100}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {loading ? (
          <><div className="spinner" /> Processing KYC...</>
        ) : (
          '🛡 Challenge User (KYC)'
        )}
      </button>

      {livenessProgress < 100 && (
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-display)' }}>
          Complete the facial scan to proceed
        </p>
      )}
    </div>
  );
}
