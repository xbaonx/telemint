import { useEffect, useState } from 'react';
import { analytics, logEvent, saveUserToFirestore } from './lib/firebase';
import { TonConnectButton, useTonAddress, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Wallet, Shield } from 'lucide-react';

import { UploadCard } from './components/UploadCard';
import { MintButton } from './components/MintButton';
import { SuccessSheet } from './components/SuccessSheet';
import { Footer } from './components/Footer';
import { LandingContent } from './components/LandingContent';
import { uploadToIPFS } from './lib/ipfs';
import { getMintPriceNanoton, formatAddress, registerDebugHelpers, getCollectionAddress, buildMintPayload } from './lib/ton';
import { telegram } from './lib/telegram';

type AppState = 'idle' | 'uploading' | 'ready' | 'minting' | 'success';

function App() {
  const userAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  
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

  const [state, setState] = useState<AppState>('idle');

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // NFT metadata
  const [nftName, setNftName] = useState('My Telegram NFT');
  const [nftDescription, setNftDescription] = useState('');
  const [metadataUri, setMetadataUri] = useState<string | null>(null);
  const [uploadedImageUri, setUploadedImageUri] = useState<string | null>(null);

  // Success state
  const [txHash, setTxHash] = useState<string>('');

  const mintPrice = getMintPriceNanoton();

  useEffect(() => {
    registerDebugHelpers(tonConnectUI, userAddress);
  }, [tonConnectUI, userAddress]);

  const debugMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
  const collectionAddress = getCollectionAddress();

  const handleDebugTransferClick = async () => {
    try {
      if (!userAddress) {
        alert('Please connect your wallet before running debug transfer.');
        return;
      }
      const fn = (window as any).debugTonTransfer;
      if (typeof fn !== 'function') {
        alert('debugTonTransfer is not ready');
        return;
      }
      await fn(userAddress, '0.01');
      alert('Sent request to transfer 0.01 TON, please confirm in your wallet.');
    } catch (e: any) {
      console.error('Debug transfer error:', e);
      alert(e?.message || 'Debug transfer failed');
    }
  };

  const handleOpenWalletModal = () => {
    try {
      (tonConnectUI as any)?.openModal?.();
    } catch (e) {
      console.log('openModal not available');
    }
  };


  const handleDebugPayloadToSelf = async () => {
    try {
      if (!userAddress || !metadataUri) {
        alert('Cần kết nối ví và có metadata trước khi chạy test payload');
        return;
      }
      const payload = buildMintPayload(userAddress, metadataUri);
      const send = (window as any).debugSend;
      const amountSelf = '0.05'; // 0.05 TON để tránh ngưỡng tối thiểu
      if (typeof send === 'function') {
        await send(userAddress, amountSelf, payload);
      } else {
        console.log('⚙️ debugSend not ready, using direct fallback (payload → self)');
        const tx = {
          validUntil: Math.floor(Date.now() / 1000) + 180,
          messages: [
            {
              address: userAddress,
              amount: (5e7).toString(), // 0.05 TON
              payload,
            },
          ],
        } as const;
        console.log('🧪 Fallback tx (payload → self):', tx);
        await tonConnectUI.sendTransaction(tx as any);
      }
      alert('Sent request for 0.05 TON + payload to your own wallet, please confirm.');
    } catch (e: any) {
      console.error('Debug payload-to-self error:', e);
      alert(e?.message || 'Debug payload-to-self failed');
    }
  };

  const handleDebugCollectionNoPayload = async () => {
    try {
      const fn = (window as any).debugSend;
      if (typeof fn === 'function') {
        await fn(collectionAddress, '0.01');
      } else {
        console.log('⚙️ debugSend not ready, using direct fallback');
        const tx = {
          validUntil: Math.floor(Date.now() / 1000) + 180,
          messages: [
            {
              address: collectionAddress,
              amount: (1e7).toString(), // 0.01 TON = 10,000,000 nanoton
            },
          ],
        } as const;
        console.log('🧪 Fallback tx (no payload):', tx);
        await tonConnectUI.sendTransaction(tx as any);
      }
      alert('Sent request for 0.01 TON to collection, please confirm.');
    } catch (e: any) {
      console.error('Debug collection no-payload error:', e);
      alert(e?.message || 'Debug collection failed');
    }
  };

  const handleDebugCollectionWithPayload = async () => {
    try {
      if (!userAddress || !metadataUri) {
        alert('Cần kết nối ví và có metadata trước khi chạy test payload');
        return;
      }
      const payload = buildMintPayload(userAddress, metadataUri);
      const send = (window as any).debugSend;
      // Use the mint price from environment variables
      const onchainFee = BigInt(getMintPriceNanoton());
      const overhead = 360000000n;
      const totalNano = onchainFee + overhead;
      const amountTon = (Number(totalNano) / 1_000_000_000).toFixed(2);
      if (typeof send === 'function') {
        await send(collectionAddress, amountTon, payload);
      } else {
        console.log('⚙️ debugSend not ready, using direct fallback (with payload)');
        const tx = {
          validUntil: Math.floor(Date.now() / 1000) + 180,
          messages: [
            {
              address: collectionAddress,
              amount: totalNano.toString(),
              payload,
            },
          ],
        } as const;
        console.log('🧪 Fallback tx (with payload):', tx);
        await tonConnectUI.sendTransaction(tx as any);
      }
      alert('Sent request for 0.01 TON + payload to collection, please confirm.');
    } catch (e: any) {
      console.error('Debug collection payload error:', e);
      alert(e?.message || 'Debug collection with payload failed');
    }
  };

  // Handle file selection
  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setState('idle');
  };

  // Handle file removal
  const handleFileRemoved = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setMetadataUri(null);
    setState('idle');
  };

  // Handle IPFS upload
  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setState('uploading');
      telegram.haptic('medium');

      const result = await uploadToIPFS(selectedFile, nftName, nftDescription);
      
      setMetadataUri(result.metadataUri);
      // Use HTTP URL for Telegram Bot (Pinata Gateway)
      setUploadedImageUri(`https://gateway.pinata.cloud/ipfs/${result.imageCid}`);
      
      setState('ready');
      telegram.haptic('success');

      console.log('✅ Upload complete:', result);
    } catch (error) {
      console.error('❌ Upload failed:', error);
      setState('idle');
      telegram.haptic('error');
      telegram.showAlert('Failed to upload to IPFS. Please try again.');
    }
  };

  // Handle mint success
  const handleMintSuccess = async (hash: string) => {
    setTxHash(hash);
    setState('success');
    console.log('🖊️ Mint successful:', { hash });

    // Track Mint Event
    logEvent(analytics, "mint_success", {
      nft_name: nftName,
      price_ton: Number(getMintPriceNanoton()) / 1_000_000_000,
      transaction_hash: hash
    });

    // Notify Telegram Channel via API
    try {
      if (uploadedImageUri && userAddress) {
        console.log('📢 Sending mint notification to bot...');
        await fetch('/api/notify-mint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nftName,
            nftImage: uploadedImageUri,
            minterAddress: userAddress,
            collectionAddress
          })
        });
      }
    } catch (e) {
      console.error('Failed to notify bot:', e);
    }
  };

  // Handle reset
  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setMetadataUri(null);
    setUploadedImageUri(null);
    setNftName('My Telegram NFT');
    setNftDescription('');
    setTxHash('');
    setState('idle');
  };

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
                <p className="text-xs text-blue-400 font-medium">TON NFT MINTER</p>
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

        {/* Main Content */}
        {state === 'success' ? (
          <SuccessSheet txHash={txHash} onReset={handleReset} />
        ) : (
          <div className="space-y-6">
            {/* Debug tools */}
            {debugMode && (
              <div className="card border-dashed space-y-3 border-white/20 bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-300">
                    Debug: Send a test transaction of 0.01 TON to the connected wallet to verify wallet connection.
                  </p>
                  <button onClick={handleDebugTransferClick} className="btn-secondary whitespace-nowrap bg-white/10 text-white hover:bg-white/20 border-white/10">
                    Run Debug Transfer
                  </button>
                </div>
                <div className="text-xs text-gray-500">
                  Collection: <span className="font-mono break-all">{collectionAddress}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={handleDebugCollectionNoPayload} className="btn-outline text-xs text-gray-300 border-gray-600 hover:border-gray-400">
                    Send 0.01 TON to Collection (no payload)
                  </button>
                  <button onClick={handleDebugCollectionWithPayload} className="btn-outline text-xs text-gray-300 border-gray-600 hover:border-gray-400">
                    Send payload to Collection (mintFee + 0.35 TON)
                  </button>
                  <button onClick={handleDebugPayloadToSelf} className="btn-outline text-xs text-gray-300 border-gray-600 hover:border-gray-400">
                    Send 0.05 TON + payload to My Wallet
                  </button>
                  <button onClick={handleOpenWalletModal} className="btn-outline text-xs text-gray-300 border-gray-600 hover:border-gray-400">
                    Switch Wallet (Tonkeeper)
                  </button>
                  <button onClick={() => {
                    const mockUser = {
                      id: 123456789,
                      first_name: "Test User",
                      username: "test_user_debug",
                      language_code: "en"
                    };
                    console.log("🧪 Testing Firestore Save with mock user:", mockUser);
                    saveUserToFirestore(mockUser, userAddress || undefined);
                    alert("Sent mock user to Firestore. Check console and Firebase Console.");
                  }} className="btn-outline text-xs text-green-400 border-green-600 hover:border-green-500">
                    Test Save User (Firestore)
                  </button>
                </div>
                {wallet && (
                  <div className="text-xs text-gray-500">
                    Connected wallet: <span className="font-mono">{(wallet as any)?.device?.appName || (wallet as any)?.name || 'Unknown'}</span>
                  </div>
                )}
              </div>
            )}
            {/* Upload Card */}
            <UploadCard
              onFileSelected={handleFileSelected}
              onFileRemoved={handleFileRemoved}
              selectedFile={selectedFile}
              previewUrl={previewUrl}
            />

            {/* Metadata Form */}
            {selectedFile && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm shadow-xl">
                <h2 className="text-xl font-bold mb-6 text-white flex items-center gap-2">
                  <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                  NFT Details
                </h2>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={nftName}
                      onChange={(e) => setNftName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      placeholder="My Awesome NFT"
                      disabled={state !== 'idle'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      value={nftDescription}
                      onChange={(e) => setNftDescription(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                      rows={3}
                      placeholder="Tell us about your NFT..."
                      disabled={state !== 'idle'}
                    />
                  </div>

                  {/* Upload to IPFS Button */}
                  {!metadataUri && (
                    <button
                      onClick={handleUpload}
                      disabled={state === 'uploading' || !nftName.trim()}
                      className="btn-primary w-full py-4 text-lg font-semibold shadow-lg shadow-blue-600/20"
                    >
                      {state === 'uploading' ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Uploading to IPFS...
                        </span>
                      ) : (
                        'Upload Metadata to IPFS'
                      )}
                    </button>
                  )}

                  {/* Metadata URI Display */}
                  {metadataUri && (
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <p className="text-sm text-green-400 font-medium mb-1 flex items-center gap-2">
                        <Shield size={16} />
                        Metadata Secured on IPFS
                      </p>
                      <p className="text-xs text-green-300/70 font-mono break-all mt-1 opacity-80">
                        {metadataUri}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mint Button */}
            {selectedFile && metadataUri && (
              <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-md">
                <div className="mb-6">
                  <p className="text-lg font-semibold text-white mb-2">
                    Ready to Mint! 🚀
                  </p>
                  <p className="text-sm text-blue-200/80">
                    Ensure you have enough TON in your wallet to cover the network gas fees.
                  </p>
                </div>

                <MintButton
                  metadataUri={metadataUri}
                  mintPrice={mintPrice}
                  onSuccess={handleMintSuccess}
                  disabled={!userAddress}
                />

                {!userAddress && (
                  <p className="text-center text-sm text-red-400 mt-4 bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                    Please connect your wallet to mint NFT
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Landing Page Content - Now Integrated! */}
        <LandingContent />

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}

export default App;
