import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSecurity } from '../context/SecurityContext';

/**
 * ProtectedRoute — Guards routes based on:
 * 1. Authentication (must be logged in)
 * 2. Role (if `requiredRole` is set, user must match)
 * 3. KYC gate (if `requireKyc` is true, USER must have VERIFIED status)
 */
const ProtectedRoute = ({ children, requiredRole = null, requireKyc = false }) => {
  const { isAuthenticated, user, kycStatus } = useSecurity();
  const location = useLocation();

  // 1. Must be logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Role check
  if (requiredRole && user?.role !== requiredRole) {
    // USER trying to access ADMIN area — redirect to their home
    if (user?.role === 'USER') return <Navigate to="/kyc" replace />;
    return <Navigate to="/" replace />;
  }

  // 3. KYC gate — only for USER role on KYC-required pages
  if (requireKyc && user?.role === 'USER' && kycStatus !== 'VERIFIED') {
    return <Navigate to="/kyc" replace />;
  }

  return children;
};

export default ProtectedRoute;
