import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Providers } from './providers';
import { AppRoutes } from './routes';
import { DiagnosticsPanel } from '../components/Diagnostics/DiagnosticsPanel';

function App() {
  return (
    <Providers>
      <BrowserRouter>
        <AppRoutes />
        <DiagnosticsPanel />
      </BrowserRouter>
    </Providers>
  );
}

export default App;
