import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';

// Pages
import DashboardPage from '../pages/Dashboard/DashboardPage';
import LeadsExplorerPage from '../pages/Leads/LeadsExplorerPage';
import LeadDetailPage from '../pages/Leads/LeadDetailPage';
import CallsPage from '../pages/Calls/CallsPage';
import LiveCallsPage from '../pages/LiveCalls/LiveCallsPage';
import CallInsightsPage from '../pages/CallInsights/CallInsightsPage';
import TasksFollowupsPage from '../pages/Tasks/TasksFollowupsPage';
import ReportsPage from '../pages/Reports/ReportsPage';
import ExportsPage from '../pages/Exports/ExportsPage';
import SettingsPage from '../pages/Settings/SettingsPage';
import NotFoundPage from '../pages/NotFoundPage';

export const AppRoutes: React.FC = () => {
  return (
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
  );
};
