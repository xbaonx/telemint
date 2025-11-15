import './shims/buffer';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import App from './App';
import './styles/index.css';
import { telegram } from './lib/telegram';

// Manifest URL for TON Connect (absolute to avoid issues inside Telegram WebApp)
const manifestUrl = `${window.location.origin}/tonconnect-manifest.json`;

// Initialize Telegram WebApp
console.log('🚀 Initializing Telegram Mini-App...');
console.log('Telegram available:', telegram.isAvailable());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl} restoreConnection>
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>
);
