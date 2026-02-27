import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Layout } from './components/layout';
import { ErrorBoundary } from './components/error-boundary';

// Pages
import Dashboard from './pages/dashboard';
import LeadsHub from './pages/leads';
import LeadDetail from './pages/lead-detail';
import LiveInbox from './pages/live-inbox';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="leads" element={<LeadsHub />} />
              <Route path="leads/:id" element={<LeadDetail />} />
              <Route path="live-inbox" element={<LiveInbox />} />
              {/* Fallback routing */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors theme="system" />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;