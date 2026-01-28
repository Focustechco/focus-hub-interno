import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TopLevelErrorBoundary } from './components/TopLevelErrorBoundary';
import { ToastProvider } from './components/Toast';
import './index.css';

import { registerSW } from 'virtual:pwa-register';

// Register PWA Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('Nova versão disponível. Recarregar?')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App pronto para funcionar offline');
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <TopLevelErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </TopLevelErrorBoundary>
  </React.StrictMode>
);