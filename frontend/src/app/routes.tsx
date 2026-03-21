import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { Loader2 } from 'lucide-react';

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
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

const PageLoader = () => (
  <div className="w-full h-[60vh] flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<Navigate to="/" replace />} />
          
          {/* Leads */}
          <Route path="leads" element={<LeadsExplorerPage />} />
          <Route path="leads/:id" element={<LeadDetailPage />} />
          
          {/* Calls */}
          <Route path="calls" element={<CallsPage />} />
          
          {/* Workflow */}
          <Route path="live-calls" element={<LiveCallsPage />} />
          <Route path="call-insights" element={<CallInsightsPage />} />
          <Route path="tasks" element={<TasksFollowupsPage />} />
          
          {/* Ops */}
          <Route path="reports" element={<ReportsPage />} />
          <Route path="exports" element={<ExportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          
          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
};
