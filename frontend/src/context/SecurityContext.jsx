import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { authService, kycService, statusService } from '../services/api';

const SecurityContext = createContext();

export const SecurityProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('sentinel_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('sentinel_token'));
  const [kycStatus, setKycStatus] = useState(user?.kyc_status || 'PENDING');
  const [systemStatus, setSystemStatus] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [recentPredictions, setRecentPredictions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const pollingRef = useRef(null);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await statusService.getStatus();
      setSystemStatus(data);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    pollingRef.current = setInterval(fetchStatus, 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const data = await authService.login(email, password);
      const { token, user: userData } = data;

      localStorage.setItem('sentinel_token', token);
      localStorage.setItem('sentinel_user', JSON.stringify(userData));
      setUser(userData);
      setKycStatus(userData.kyc_status || 'PENDING');
      setIsAuthenticated(true);
      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Check credentials.';
      return { success: false, message: msg };
    }
  }, []);

  const registerUser = useCallback(async (username, email, password) => {
    try {
      const data = await authService.register(username, email, password);
      return { success: true, message: data.message };
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed.';
      return { success: false, message: msg };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sentinel_token');
    localStorage.removeItem('sentinel_user');
    setUser(null);
    setKycStatus('PENDING');
    setIsAuthenticated(false);
  }, []);

  const refreshKycStatus = useCallback(async () => {
    try {
      const data = await kycService.getStatus();
      setKycStatus(data.kyc_status);
      setUser(prev => prev ? { ...prev, kyc_status: data.kyc_status, risk_score: data.risk_score } : prev);
      // Update localStorage
      const saved = localStorage.getItem('sentinel_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        localStorage.setItem('sentinel_user', JSON.stringify({ ...parsed, kyc_status: data.kyc_status }));
      }
      return data;
    } catch (err) {
      console.error('Failed to refresh KYC status:', err);
    }
  }, []);

  const dismissAlert = (id) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));
  };

  const toggleSimulation = useCallback(async (active) => {
    try {
      await statusService.toggleSimulation(active);
      await fetchStatus();
      return { success: true };
    } catch (err) {
      console.error('Failed to toggle simulation:', err);
      return { success: false, message: 'Failed to toggle simulation' };
    }
  }, [fetchStatus]);

  const playSocAlarm = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sawtooth';
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      const now = audioCtx.currentTime;
      
      // Classic SOC Red Alert Siren Sweep
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
      osc.frequency.linearRampToValueAtTime(600, now + 0.6);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.9);
      osc.frequency.linearRampToValueAtTime(600, now + 1.2);
      
      // Volume Envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05); // Not too loud
      gainNode.gain.setValueAtTime(0.15, now + 1.15);
      gainNode.gain.linearRampToValueAtTime(0, now + 1.2);
      
      osc.start(now);
      osc.stop(now + 1.2);
    } catch (e) {
      console.warn("Audio play blocked by browser.");
    }
  };

  const addPrediction = (prediction) => {
    if (prediction.prediction === 'Attack') {
       playSocAlarm();
    }
    setRecentPredictions(prev => [
      { ...prediction, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 4)
    ]);
  };

  const value = {
    user,
    isAuthenticated,
    kycStatus,
    login,
    registerUser,
    logout,
    refreshKycStatus,
    systemStatus,
    isOnline,
    alerts: alerts.filter(a => !a.dismissed),
    recentPredictions,
    dismissAlert,
    addPrediction,
    toggleSimulation,
  };

  return (
    <SecurityContext.Provider value={value}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) throw new Error('useSecurity must be used within a SecurityProvider');
  return context;
};
