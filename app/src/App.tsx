import { useEffect } from 'react';
import { analytics, logEvent, saveUserToFirestore } from './lib/firebase';
import { TonConnectButton, useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import { Wallet } from 'lucide-react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';

import { JettonMinter } from './components/JettonMinter';
import { NFTMinter } from './components/NFTMinter';
import { Footer } from './components/Footer';
import { formatAddress } from './lib/ton';
import { telegram } from './lib/telegram';

function App() {
  const userAddress = useTonAddress();
  const wallet = useTonWallet();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab based on current path
  const activeTab = location.pathname === '/create-token' ? 'jetton' : 'nft';
  
  // Track User Login & Save to DB
  useEffect(() => {
    // Identify User if available from Telegram
    const telegramUser = telegram.getUser();
    if (telegramUser) {
        // 1. Log Analytics
        logEvent(analytics, "app_open_telegram", {
            username: telegramUser.username || telegramUser.first_name,
            user_id: telegramUser.id.toString()
        });
        
        // 2. Save to Firestore Database (For Marketing)
        saveUserToFirestore(telegramUser);
    } else {
        logEvent(analytics, "app_open_web");
    }
  }, []);

  // Track Wallet Connection & Update DB
  useEffect(() => {
    if (userAddress) {
        logEvent(analytics, "connect_wallet", {
            wallet_address: userAddress
        });

        // Update User with Wallet Address
        const telegramUser = telegram.getUser();
        if (telegramUser) {
            saveUserToFirestore(telegramUser, userAddress);
        }
    }
  }, [userAddress]);

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8 mt-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Mint Box Logo" className="w-12 h-12 object-contain rounded-xl shadow-lg shadow-blue-500/20" />
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Mint Box
                </h1>
                <p className="text-xs text-blue-400 font-medium">TON {activeTab === 'nft' ? 'NFT' : 'JETTON'} MINTER</p>
              </div>
            </div>
            <TonConnectButton />
          </div>

          {userAddress && (
            <div className="flex items-center gap-2 text-sm text-gray-400 bg-white/5 w-fit px-3 py-1.5 rounded-full border border-white/10">
              <Wallet className="w-4 h-4 text-blue-400" />
              <span>Connected: <span className="font-mono text-gray-200">{formatAddress(userAddress)}</span></span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex p-1 bg-white/5 rounded-xl mb-8 border border-white/10">
            <button 
                onClick={() => navigate('/')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'nft' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'text-gray-400 hover:text-white'}`}
            >
                Mint NFT
            </button>
            <button 
                onClick={() => navigate('/create-token')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'jetton' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : 'text-gray-400 hover:text-white'}`}
            >
                Create Token
            </button>
        </div>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<NFTMinter />} />
          <Route path="/create-token" element={<JettonMinter />} />
        </Routes>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}

export default App;
