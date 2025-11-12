import React from 'react';
import ReactDOM from 'react-dom/client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import App from './App';
import './styles/index.css';
import { telegram } from './lib/telegram';

// Manifest URL for TON Connect
const manifestUrl = 'https://ton-connect.github.io/demo-dapp-with-react-ui/tonconnect-manifest.json';

// Initialize Telegram WebApp
console.log('🚀 Initializing Telegram Mini-App...');
console.log('Telegram available:', telegram.isAvailable());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TonConnectUIProvider manifestUrl={manifestUrl}>
      <App />
    </TonConnectUIProvider>
  </React.StrictMode>
);
