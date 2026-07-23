import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSecurity } from '../context/SecurityContext';
import { kycService } from '../services/api';

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

export default function KYCDashboard({ isEmbedded = false }) {
  const { user, kycStatus, refreshKycStatus, logout } = useSecurity();
  const isAdmin = user?.role === 'ADMIN';
  const navigate = useNavigate();

  // Controlled fields
  const [name, setName]           = useState('');
  const [dob, setDob]             = useState('');
  const [address, setAddress]     = useState('');
  const [idNumber, setIdNumber]   = useState('');
  const [idError, setIdError]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);

  // Uncontrolled file input
  const fileRef = useRef(null);
  const photoRef = useRef(null);
  const [filePreview, setFilePreview] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    loadStatus();
  }, [kycStatus]);

  const loadStatus = async () => {
    try {
      const data = await kycService.getStatus();
      if (data.record) {
        setName(data.record.name || '');
        setDob(data.record.dob || '');
        setAddress(data.record.address || '');
        setIdNumber(data.record.id_number || '');
      }
    } catch (e) {
      console.error('Failed to load KYC status', e);
    }
  };

  const handleFile = e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFilePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoFile = e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const validateId = (val) => {
    const upper = val?.toUpperCase() || '';
    if (!upper) { setIdError('ID number is required'); return; }
    if (!PAN_REGEX.test(upper)) {
      setIdError('Invalid PAN format (e.g. ABCDE1234F)');
    } else {
      setIdError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (idError || !name || !dob || !address || !idNumber) {
      setSubmitMsg({ type: 'error', text: 'Please fill all fields and fix errors.' });
      return;
    }
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const fileName = fileRef.current?.files?.[0]?.name || 'no_file';
      const photoName = photoRef.current?.files?.[0]?.name || 'no_photo';
      await kycService.submit({ 
        name, 
        dob,
        address,
        id_number: idNumber?.toUpperCase() || '', 
        document_path: `uploads/${fileName}`,
        photo_path: `uploads/${photoName}`
      });
      await refreshKycStatus();
      await loadStatus();
      setSubmitMsg({ type: 'success', text: 'KYC submitted successfully!' });
    } catch (err) {
      const msg = err.response?.data?.error || 'Submission failed. Please try again.';
      setSubmitMsg({ type: 'error', text: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const isVerified = kycStatus === 'VERIFIED';

  return (
    <div style={{ minHeight: '100vh', background: 'white', fontFamily: "sans-serif" }}>
      
      {/* Header (applies if directly accessed usually, but layout is simpler now) */}
      {!isEmbedded && (
        <div style={{ background: '#3F51B5', padding: '15px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'white' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🪪</span>
            <span style={{ fontSize: 20, fontWeight: 600 }}>KYC Dashboard</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <span>Welcome, {user?.username || 'User'}</span>
            <button onClick={logout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: 4, cursor: 'pointer' }}>Logout</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex' }}>
        {/* Only show simplistic sidebar if not embedded in AppShell */}
        {!isEmbedded && (
          <div style={{ width: 250, borderRight: '1px solid #E5E7EB', minHeight: 'calc(100vh - 60px)', background: '#F9FAFB' }}>
            <div style={{ padding: '20px' }}>
              <div style={{ background: '#3F51B5', color: 'white', padding: '12px', borderRadius: 4, marginBottom: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                🪪 KYC Verification
              </div>
              <div style={{ padding: '12px', display: 'flex', gap: 10, alignItems: 'center', color: '#4B5563' }}>
                📋 KYC Status
              </div>
            </div>
          </div>
        )}

        {/* Main Content Form */}
        <div style={{ flex: 1, padding: '40px 60px' }}>
          
          <h1 style={{ fontSize: 28, margin: '0 0 10px 0', color: '#1F2937' }}>KYC Verification</h1>
          <hr style={{ border: 'none', borderBottom: '1px solid #E5E7EB', marginBottom: 20 }} />

          {isVerified ? (
            <div style={{ background: '#E0F2FE', padding: '20px', borderRadius: 8, color: '#0369A1' }}>
              <h2>Verification Complete</h2>
              <p>Your identity has been verified. You now have full access.</p>
            </div>
          ) : (
            <div>
              <h3 style={{ fontSize: 18, color: '#1F2937', marginBottom: 5 }}>Complete Your KYC Process</h3>
              <p style={{ fontSize: 14, color: '#4B5563', marginBottom: 25 }}>Please upload your documents and fill in the details below.</p>

              {submitMsg && (
                <div style={{ padding: 15, marginBottom: 20, background: submitMsg.type === 'success' ? '#DEF7EC' : '#FDE8E8', color: submitMsg.type === 'success' ? '#03543F' : '#9B1C1C', borderRadius: 4 }}>
                  {submitMsg.text}
                </div>
              )}

              {/* Upload Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 30 }}>
                {/* ID Document */}
                <div style={{ background: '#F3F4F6', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', fontWeight: 600, color: '#1F2937', borderBottom: '1px solid #E5E7EB' }}>
                    Upload ID Document
                  </div>
                  <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => fileRef.current?.click()} style={uploadBtnStyle}>Upload ID Proof</button>
                    <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleFile} />
                    
                    <div style={previewBoxStyle}>
                      {filePreview ? (
                        <img src={filePreview} style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'contain' }} alt="ID Proof" />
                      ) : (
                        <>
                          <div style={{ fontSize: 32, color: '#9CA3AF' }}>🪪</div>
                          <span style={{ fontSize: 14, color: '#4B5563', marginTop: 4 }}>Upload ID Document</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Selfie Photo */}
                <div style={{ background: '#F3F4F6', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', fontWeight: 600, color: '#1F2937', borderBottom: '1px solid #E5E7EB' }}>
                    Upload Selfie Photo
                  </div>
                  <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={() => photoRef.current?.click()} style={uploadBtnStyle}>Upload Selfie</button>
                    <input ref={photoRef} type="file" accept=".jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handlePhotoFile} />
                    
                    <div style={previewBoxStyle}>
                      {photoPreview ? (
                        <img src={photoPreview} style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'cover' }} alt="Selfie" />
                      ) : (
                        <>
                          <div style={{ fontSize: 32, color: '#9CA3AF' }}>📷</div>
                          <span style={{ fontSize: 14, color: '#4B5563', marginTop: 4 }}>Upload Selfie</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Section */}
              <h3 style={{ fontSize: 16, color: '#1F2937', marginBottom: 10 }}>Personal Information</h3>
              <hr style={{ border: 'none', borderBottom: '1px solid #E5E7EB', marginBottom: 20 }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 600, marginBottom: 30 }}>
                <div style={formRow}>
                  <label style={formLabel}>Full Name</label>
                  <input style={formInput} type="text" value={name} onChange={e => setName(e.target.value)} />
                </div>
                
                <div style={formRow}>
                  <label style={formLabel}>Date of Birth</label>
                  <input style={formInput} type="date" value={dob} onChange={e => setDob(e.target.value)} />
                </div>

                {/* Maintained for backend compatibility */}
                <div style={formRow}>
                  <label style={formLabel}>PAN / ID Number</label>
                  <div style={{ flex: 1 }}>
                     <input style={{...formInput, width: '100%', borderColor: idError ? '#EF4444' : '#D1D5DB'}} type="text" value={idNumber} onChange={e => { setIdNumber(e.target.value?.toUpperCase() || ''); validateId(e.target.value); }} />
                     {idError && <span style={{ color: '#EF4444', fontSize: 12, marginTop: 4, display: 'block' }}>{idError}</span>}
                  </div>
                </div>

                <div style={formRow}>
                  <label style={formLabel}>Address</label>
                  <textarea style={{...formInput, height: 80, resize: 'vertical'}} value={address} onChange={e => setAddress(e.target.value)} />
                </div>
              </div>
              
              <hr style={{ border: 'none', borderBottom: '1px solid #E5E7EB', marginBottom: 20 }} />

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 40 }}>
                <button 
                  onClick={handleSubmit} 
                  disabled={submitting || !filePreview || !photoPreview || idError}
                  style={{ background: '#3F51B5', color: 'white', border: 'none', padding: '12px 30px', borderRadius: 4, fontSize: 16, fontWeight: 600, cursor: 'pointer', width: 300, opacity: submitting ? 0.7 : 1 }}>
                  {submitting ? 'Submitting...' : 'Submit KYC Request'}
                </button>
              </div>

              {/* Status Indicator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14, color: '#374151', fontWeight: 600 }}>KYC Status:</span>
                {kycStatus === 'PENDING' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FDF6B2', color: '#723B13', padding: '6px 12px', borderRadius: 4, fontSize: 13, fontWeight: 600 }}>
                    🕒 Pending Verification
                  </span>
                ) : kycStatus === 'REJECTED' ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FDE8E8', color: '#9B1C1C', padding: '6px 12px', borderRadius: 4, fontSize: 13, fontWeight: 600 }}>
                    ❌ Rejected
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F3F4F6', color: '#374151', padding: '6px 12px', borderRadius: 4, fontSize: 13, fontWeight: 600 }}>
                    Not Submitted
                  </span>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable inline styles
const uploadBtnStyle = {
  background: '#3F51B5', color: 'white', padding: '10px 20px', borderRadius: 4, border: 'none', fontWeight: 600, cursor: 'pointer'
};

const previewBoxStyle = {
  background: 'white', border: '1px solid #E5E7EB', borderRadius: 4, padding: '15px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 140, height: 90
};

const formRow = {
  display: 'flex', alignItems: 'flex-start',
};

const formLabel = {
  width: 150, fontSize: 14, color: '#374151', paddingTop: 8
};

const formInput = {
  flex: 1, padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 4, fontSize: 14, width: '100%', boxSizing: 'border-box'
};
