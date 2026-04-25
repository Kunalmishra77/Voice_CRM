import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../state/authStore';

// Lazy load pages for performance
const DashboardPage = lazy(() => import('../pages/Dashboard/DashboardPage'));
const LeadsExplorerPage = lazy(() => import('../pages/Leads/LeadsExplorerPage'));
const LeadDetailPage = lazy(() => import('../pages/Leads/LeadDetailPage'));
const CallsPage = lazy(() => import('../pages/Calls/CallsPage'));
const LiveCallsPage = lazy(() => import('../pages/LiveCalls/LiveCallsPage'));
const CallInsightsPage = lazy(() => import('../pages/CallInsights/CallInsightsPage'));
const TasksFollowupsPage = lazy(() => import('../pages/Tasks/TasksFollowupsPage'));
const ReportsPage = lazy(() => import('../pages/Reports/ReportsPage'));
const ExportsPage = lazy(() => import('../pages/Exports/ExportsPage'));
const SettingsPage = lazy(() => import('../pages/Settings/SettingsPage'));
const ProfilePage = lazy(() => import('../pages/Profile/ProfilePage'));
const LoginPage = lazy(() => import('../pages/Auth/LoginPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

const PageLoader = () => (
  <div className="w-full h-[60vh] flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />

          {/* Leads — all roles */}
          <Route path="leads" element={<LeadsExplorerPage />} />
          <Route path="leads/:id" element={<LeadDetailPage />} />

          {/* Tasks — all roles (employees see their own) */}
          <Route path="tasks" element={<TasksFollowupsPage />} />

          {/* Admin-only routes */}
          <Route path="calls" element={<AdminRoute><CallsPage /></AdminRoute>} />
          <Route path="live-calls" element={<AdminRoute><LiveCallsPage /></AdminRoute>} />
          <Route path="call-insights" element={<AdminRoute><CallInsightsPage /></AdminRoute>} />
          <Route path="reports" element={<AdminRoute><ReportsPage /></AdminRoute>} />
          <Route path="exports" element={<AdminRoute><ExportsPage /></AdminRoute>} />
          <Route path="settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />

          {/* Profile — all roles */}
          <Route path="profile" element={<ProfilePage />} />

          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};
