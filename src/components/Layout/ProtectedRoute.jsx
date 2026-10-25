import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, loading, getDashboardUrl } = useAuth();

  if (loading && !user) {
    return <div className="min-h-[100dvh] w-full bg-surface-container-low" />;
  }

  if (!user) {
    let targetLogin = '/login/student';
    if (allowedRoles.includes('institution') && !allowedRoles.includes('student')) {
      targetLogin = '/login/institution';
    } else if (allowedRoles.includes('hiring_organization') && !allowedRoles.includes('student')) {
      targetLogin = '/login/organization';
    }
    return <Navigate to={targetLogin} replace />;
  }

  const userRole = user.role_name || user.role;
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <Navigate to={getDashboardUrl(userRole)} replace />;
  }

  return <Outlet />;
}
