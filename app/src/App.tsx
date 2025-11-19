import { useEffect, useState } from 'react';
import { TonConnectButton, useTonAddress, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Wallet } from 'lucide-react';
import { UploadCard } from './components/UploadCard';
import { MintButton } from './components/MintButton';
import { SuccessSheet } from './components/SuccessSheet';
import { uploadToIPFS } from './lib/ipfs';
import { getMintPriceNanoton, formatAddress, registerDebugHelpers, getCollectionAddress, buildMintPayload, getMintFeeOnChain } from './lib/ton';
import { telegram } from './lib/telegram';

type AppState = 'idle' | 'uploading' | 'ready' | 'minting' | 'success';

function App() {
  const userAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [state, setState] = useState<AppState>('idle');

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // NFT metadata
  const [nftName, setNftName] = useState('My Telegram NFT');
  const [nftDescription, setNftDescription] = useState('');
  const [metadataUri, setMetadataUri] = useState<string | null>(null);

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
        alert('Hãy kết nối ví trước khi chạy debug transfer');
        return;
      }
      const fn = (window as any).debugTonTransfer;
      if (typeof fn !== 'function') {
        alert('debugTonTransfer chưa sẵn sàng');
        return;
      }
      await fn(userAddress, '0.01');
      alert('Đã gửi yêu cầu chuyển 0.01 TON, hãy xác nhận trong ví.');
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

  const handleReadMintFee = async () => {
    try {
      const fee = await getMintFeeOnChain(collectionAddress);
      const ton = Number(fee) / 1_000_000_000;
      alert(`On-chain mint fee: ${ton.toFixed(4)} TON`);
    } catch (e: any) {
      alert(e?.message || 'Failed to read on-chain mint fee');
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
        console.log('⚙️ debugSend không sẵn sàng, dùng fallback trực tiếp (payload → self)');
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
      alert('Đã gửi yêu cầu 0.05 TON + payload tới chính ví của bạn, hãy xác nhận trong ví.');
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
        console.log('⚙️ debugSend không sẵn sàng, dùng fallback trực tiếp');
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
      alert('Đã gửi yêu cầu 0.01 TON tới collection, hãy xác nhận trong ví.');
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
      // Đọc mint fee on-chain và cộng overhead 0.36 TON
      const onchainFee = await getMintFeeOnChain(collectionAddress);
      const overhead = 360000000n;
      const totalNano = onchainFee + overhead;
      const amountTon = (Number(totalNano) / 1_000_000_000).toFixed(2);
      if (typeof send === 'function') {
        await send(collectionAddress, amountTon, payload);
      } else {
        console.log('⚙️ debugSend không sẵn sàng, dùng fallback trực tiếp (with payload)');
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
      alert('Đã gửi yêu cầu 0.01 TON + payload tới collection, hãy xác nhận trong ví.');
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
  const handleMintSuccess = (hash: string) => {
    setTxHash(hash);
    setState('success');
    console.log('🖊️ Mint successful:', { hash });
  };

  // Handle reset
  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setMetadataUri(null);
    setNftName('My Telegram NFT');
    setNftDescription('');
    setTxHash('');
    setState('idle');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800">
              Mint Box
            </h1>
            <TonConnectButton />
          </div>

          {userAddress && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Wallet className="w-4 h-4" />
              <span>Connected: {formatAddress(userAddress)}</span>
            </div>
          )}
        </div>

        {/* Main Content */}
        {state === 'success' ? (
          <SuccessSheet txHash={txHash} onReset={handleReset} />
        ) : (
          <div className="space-y-4">
            {/* Debug tools */}
            {debugMode && (
              <div className="card border-dashed space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-gray-700">
                    Debug: Gửi giao dịch thử 0.01 TON tới địa chỉ ví đang kết nối để kiểm tra xác minh ví.
                  </p>
                  <button onClick={handleDebugTransferClick} className="btn-secondary whitespace-nowrap">
                    Run Debug Transfer
                  </button>
                </div>
                <div className="text-xs text-gray-600">
                  Collection: <span className="font-mono break-all">{collectionAddress}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={handleDebugCollectionNoPayload} className="btn-outline text-xs">
                    Send 0.01 TON to Collection (no payload)
                  </button>
                  <button onClick={handleDebugCollectionWithPayload} className="btn-outline text-xs">
                    Send payload to Collection (mintFee + 0.35 TON)
                  </button>
                  <button onClick={handleDebugPayloadToSelf} className="btn-outline text-xs">
                    Send 0.05 TON + payload to My Wallet
                  </button>
                  <button onClick={handleReadMintFee} className="btn-outline text-xs">
                    Read on-chain mint fee
                  </button>
                  <button onClick={handleOpenWalletModal} className="btn-outline text-xs">
                    Switch Wallet (Tonkeeper)
                  </button>
                </div>
                {wallet && (
                  <div className="text-xs text-gray-600">
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
              <div className="card">
                <h2 className="text-xl font-bold mb-4 text-gray-800">
                  NFT Details
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={nftName}
                      onChange={(e) => setNftName(e.target.value)}
                      className="input-field"
                      placeholder="My Awesome NFT"
                      disabled={state !== 'idle'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      value={nftDescription}
                      onChange={(e) => setNftDescription(e.target.value)}
                      className="input-field resize-none"
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
                      className="btn-primary w-full"
                    >
                      {state === 'uploading' ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="loader" />
                          Uploading to IPFS...
                        </span>
                      ) : (
                        'Upload to IPFS'
                      )}
                    </button>
                  )}

                  {/* Metadata URI Display */}
                  {metadataUri && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 font-medium mb-1">
                        ✅ Uploaded to IPFS
                      </p>
                      <p className="text-xs text-green-600 font-mono break-all">
                        {metadataUri}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mint Button */}
            {selectedFile && metadataUri && (
              <div className="card">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Sẵn sàng mint NFT của bạn!
                  </p>
                  <p className="text-xs text-gray-500">
                    Đảm bảo bạn có đủ TON trong ví để chi trả phí mint và gas.
                  </p>
                </div>

                <MintButton
                  metadataUri={metadataUri}
                  mintPrice={mintPrice}
                  onSuccess={handleMintSuccess}
                  disabled={!userAddress}
                />

                {!userAddress && (
                  <p className="text-center text-sm text-red-500 mt-3">
                    Vui lòng kết nối ví để mint NFT
                  </p>
                )}
                
                
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Powered by TON Blockchain 💎</p>
        </div>
      </div>
    </div>
  );
}

export default App;
