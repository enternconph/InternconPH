import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Layout
import DashboardLayout from './components/Layout/DashboardLayout';
import ProtectedRoute from './components/Layout/ProtectedRoute';
import { DashboardSkeleton } from './components/ui/Skeleton';

// Public Pages (Lazy Loaded)
const LandingPage = lazy(() => import('./pages/public/LandingPage'));
const LoginPage = lazy(() => import('./pages/public/LoginPage'));
const GetStartedPage = lazy(() => import('./pages/public/GetStartedPage'));
const RegisterStudentPage = lazy(() => import('./pages/public/RegisterStudentPage'));
const RegisterStaffPage = lazy(() => import('./pages/public/RegisterStaffPage'));
const RegisterOrganizationPage = lazy(() => import('./pages/public/RegisterOrganizationPage'));
const RegisterInstitutionPage = lazy(() => import('./pages/public/RegisterInstitutionPage'));
const RegisterMentorPage = lazy(() => import('./pages/public/RegisterMentorPage'));

// Shared User Settings Page
const UserSettingsPage = lazy(() => import('./pages/shared/UserSettingsPage'));

// Student Pages (Lazy Loaded)
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const StudentJobs = lazy(() => import('./pages/student/StudentJobs'));
const StudentApplications = lazy(() => import('./pages/student/StudentApplications'));
const StudentOJT = lazy(() => import('./pages/student/StudentOJT'));
const StudentSkills = lazy(() => import('./pages/student/StudentSkills'));
const StudentPortfolio = lazy(() => import('./pages/student/StudentPortfolio'));
const StudentComplaints = lazy(() => import('./pages/student/StudentComplaints'));
const StudentProfile = lazy(() => import('./pages/student/StudentProfile'));

// Organization Pages (Lazy Loaded)
const OrgDashboard = lazy(() => import('./pages/organization/OrgDashboard'));
const OrgJobs = lazy(() => import('./pages/organization/OrgJobs'));
const OrgApplicants = lazy(() => import('./pages/organization/OrgApplicants'));
const OrgInterviews = lazy(() => import('./pages/organization/OrgInterviews'));
const OrgOffers = lazy(() => import('./pages/organization/OrgOffers'));
const OrgOJT = lazy(() => import('./pages/organization/OrgOJT'));
const OrgEvaluations = lazy(() => import('./pages/organization/OrgEvaluations'));
const OrgMentors = lazy(() => import('./pages/organization/OrgMentors'));
const OrgGrievances = lazy(() => import('./pages/organization/OrgGrievances'));

// Institution Pages (Lazy Loaded)
const InstitutionDashboard = lazy(() => import('./pages/institution/InstitutionDashboard'));
const InstStudents = lazy(() => import('./pages/institution/InstStudents'));
const InstStaff = lazy(() => import('./pages/institution/InstStaff'));
const InstPrograms = lazy(() => import('./pages/institution/InstPrograms'));
const InstRequirements = lazy(() => import('./pages/institution/InstRequirements'));
const InstMonitoring = lazy(() => import('./pages/institution/InstMonitoring'));
const InstOJTOffers = lazy(() => import('./pages/institution/InstOJTOffers'));

// Admin Pages (Lazy Loaded)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminInstitutions = lazy(() => import('./pages/admin/AdminInstitutions'));
const AdminOrganizations = lazy(() => import('./pages/admin/AdminOrganizations'));
const AdminJobs = lazy(() => import('./pages/admin/AdminJobs'));
const AdminComplaints = lazy(() => import('./pages/admin/AdminComplaints'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminAuditLogs = lazy(() => import('./pages/admin/AdminAuditLogs'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/get-started" element={<GetStartedPage />} />
        <Route path="/register/student" element={<RegisterStudentPage />} />
        <Route path="/register/staff" element={<RegisterStaffPage />} />
        <Route path="/register/organization" element={<RegisterOrganizationPage />} />
        <Route path="/register/institution" element={<RegisterInstitutionPage />} />
        <Route path="/register/mentor" element={<RegisterMentorPage />} />

        {/* Shared Universal Settings Route */}
        <Route element={<ProtectedRoute allowedRoles={['student', 'hiring_organization', 'workplace_mentor', 'mentor', 'hr_staff', 'institution', 'institution_staff', 'system_admin']} />}>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route path="settings" element={<UserSettingsPage />} />
          </Route>
        </Route>

        {/* Student Dashboard Routes */}
        <Route element={<ProtectedRoute allowedRoles={['student']} />}>
          <Route path="/dashboard/student" element={<DashboardLayout />}>
            <Route index element={<StudentDashboard />} />
            <Route path="jobs" element={<StudentJobs />} />
            <Route path="applications" element={<StudentApplications />} />
            <Route path="ojt" element={<StudentOJT />} />
            <Route path="requirements" element={<Navigate to="/dashboard/student/ojt" replace />} />
            <Route path="skills" element={<StudentSkills />} />
            <Route path="portfolio" element={<StudentPortfolio />} />
            <Route path="complaints" element={<StudentComplaints />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="settings" element={<UserSettingsPage />} />
          </Route>
        </Route>

        {/* Organization & Workplace Mentor Dashboard Routes */}
        <Route element={<ProtectedRoute allowedRoles={['hiring_organization', 'workplace_mentor', 'mentor', 'hr_staff', 'system_admin']} />}>
          <Route path="/dashboard/organization" element={<DashboardLayout />}>
            {/* Shared: Overview, Deployed Interns, Evaluations */}
            <Route index element={<OrgDashboard />} />
            <Route path="ojt" element={<OrgOJT />} />
            <Route path="evaluations" element={<OrgEvaluations />} />
            <Route path="grievances" element={<OrgGrievances />} />
            <Route path="settings" element={<UserSettingsPage />} />

            {/* HR Exclusive: Jobs, Applicants, Interviews, Offers, Mentors */}
            <Route element={<ProtectedRoute allowedRoles={['hiring_organization', 'hr_staff', 'system_admin']} />}>
              <Route path="jobs" element={<OrgJobs />} />
              <Route path="applicants" element={<OrgApplicants />} />
              <Route path="interviews" element={<OrgInterviews />} />
              <Route path="offers" element={<OrgOffers />} />
              <Route path="mentors" element={<OrgMentors />} />
            </Route>
          </Route>
        </Route>

        {/* Institution Dashboard Routes */}
        <Route element={<ProtectedRoute allowedRoles={['institution', 'institution_staff']} />}>
          <Route path="/dashboard/institution" element={<DashboardLayout />}>
            <Route index element={<InstitutionDashboard />} />
            <Route path="students" element={<InstStudents />} />
            <Route path="staff" element={<InstStaff />} />
            <Route path="programs" element={<InstPrograms />} />
            <Route path="requirements" element={<InstRequirements />} />
            <Route path="monitoring" element={<InstMonitoring />} />
            <Route path="ojt-offers" element={<InstOJTOffers />} />
            <Route path="settings" element={<UserSettingsPage />} />
          </Route>
        </Route>

        {/* Admin Dashboard Routes */}
        <Route element={<ProtectedRoute allowedRoles={['system_admin']} />}>
          <Route path="/dashboard/admin" element={<DashboardLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="institutions" element={<AdminInstitutions />} />
            <Route path="organizations" element={<AdminOrganizations />} />
            <Route path="jobs" element={<AdminJobs />} />
            <Route path="complaints" element={<AdminComplaints />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="settings" element={<UserSettingsPage />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
