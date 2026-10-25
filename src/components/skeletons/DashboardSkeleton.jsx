import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { AdminDashboardSkeleton } from './AdminDashboardSkeleton';
import { InstitutionDashboardSkeleton } from './InstitutionDashboardSkeleton';
import { OrgDashboardSkeleton } from './OrgDashboardSkeleton';
import { StudentDashboardSkeleton } from './StudentDashboardSkeleton';

/**
 * Universal Dashboard Skeleton Router.
 * Dynamically renders the exact 1:1 structural skeleton corresponding to the user's role
 * and active dashboard route, preventing layout shifts and generic placeholder mismatches.
 */
export function DashboardSkeleton({ forcedRole }) {
  let user = null;
  let pathname = '';

  try {
    const auth = useAuth();
    user = auth?.user;
  } catch {
    // Context unavailable during isolated testing
  }

  try {
    const location = useLocation();
    pathname = location?.pathname || '';
  } catch {
    // Router unavailable during isolated testing
  }

  const role = forcedRole || user?.role_name || user?.role || '';
  const isMentor = role === 'workplace_mentor' || role === 'mentor';

  // 1. Path-based detection takes precedence for deep dashboard navigation
  if (pathname.startsWith('/dashboard/admin') || role === 'system_admin') {
    return <AdminDashboardSkeleton />;
  }

  if (pathname.startsWith('/dashboard/institution') || role === 'institution' || role === 'institution_staff') {
    return <InstitutionDashboardSkeleton />;
  }

  if (pathname.startsWith('/dashboard/organization') || role === 'hiring_organization' || isMentor) {
    return <OrgDashboardSkeleton isMentor={isMentor} />;
  }

  if (pathname.startsWith('/dashboard/student') || role === 'student') {
    return <StudentDashboardSkeleton />;
  }

  // 2. Default fallback based on role if pathname is generic
  if (role === 'system_admin') return <AdminDashboardSkeleton />;
  if (role === 'institution' || role === 'institution_staff') return <InstitutionDashboardSkeleton />;
  if (role === 'hiring_organization' || isMentor) return <OrgDashboardSkeleton isMentor={isMentor} />;
  if (role === 'student') return <StudentDashboardSkeleton />;

  // 3. Clean fallback
  return <StudentDashboardSkeleton />;
}

export default DashboardSkeleton;

