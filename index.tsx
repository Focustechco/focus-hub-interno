import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { TopLevelErrorBoundary } from './components/TopLevelErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <TopLevelErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </TopLevelErrorBoundary>
  </React.StrictMode>
);