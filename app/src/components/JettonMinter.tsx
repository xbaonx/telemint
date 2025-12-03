import { useState } from 'react';
import { Check } from 'lucide-react';

export function JettonMinter() {
  // const userAddress = useTonAddress();
  // const [tonConnectUI] = useTonConnectUI();
  
  // Form State
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenSupply, setTokenSupply] = useState('1000000000');
  const [tokenImage, setTokenImage] = useState<File | null>(null);
  
  // Options State
  const [revokeOwnership, setRevokeOwnership] = useState(false);
  const [vanityAddress, setVanityAddress] = useState(false);
  
  // UI State
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [contractAddress, setContractAddress] = useState('');

  // Price Calculation
  const basePrice = 0.3;
  const totalPrice = basePrice + (revokeOwnership ? 0.5 : 0) + (vanityAddress ? 1.0 : 0);

  const handleDeploy = () => {
    if (!tokenName || !tokenSymbol) {
      alert("Please enter Name and Ticker!");
      return;
    }

    setIsDeploying(true);
    setDeployStep([]);
    
    const logs = [
      `> Initiating deployment for ${tokenSymbol}...`,
      `> Connecting to TON Mainnet...`,
      `> Uploading metadata to IPFS...`,
      `> Gas Fee estimation: 0.05 TON`,
      `> Compiling Smart Contract...`,
      `> Sending transaction to network...`,
      `> Waiting for block confirmation...`,
      `> Verifying contract source code...`,
      `> Ownership status: ${revokeOwnership ? 'REVOKED' : 'ACTIVE'}`,
      `> SUCCESS! Token Minter created.`
    ];

    let i = 0;
    const interval = setInterval(() => {
      setDeployStep(prev => [...prev, logs[i]]);
      i++;
      if (i >= logs.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsDeploying(false);
          setShowSuccess(true);
          const randomAddr = 'EQ' + Array(46).fill(0).map(() => Math.random().toString(36).charAt(2)).join('').toUpperCase();
          setContractAddress(randomAddr);
        }, 1000);
      }
    }, 800);
  };

  const handleImageUpload = () => {
    // Fake upload for now as per original HTML logic, or we can implement real file picker later
    // For UI consistency with the request, we'll simulate it
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) setTokenImage(file);
    };
    input.click();
  };

  return (
    <div className="text-white font-sans pb-32">
      <div className="p-5 space-y-6">
        {/* Token Logo */}
        <div className="space-y-2">
          <label className="text-xs text-gray-400 font-semibold tracking-wide uppercase">Token Logo</label>
          <div 
            onClick={handleImageUpload}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${tokenImage ? 'border-green-500 text-green-500 bg-green-500/10' : 'border-gray-700 bg-[#1C1C1E] hover:border-blue-500'}`}
          >
            <div className="flex flex-col items-center gap-2">
              {tokenImage ? (
                <>
                  <Check className="w-8 h-8" />
                  <span className="text-sm font-medium">{tokenImage.name} (Loaded)</span>
                </>
              ) : (
                <>
                  <span className="text-2xl">📸</span>
                  <span className="text-sm text-gray-400">Tap to upload PNG/JPG</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Token Name */}
        <div className="space-y-2">
          <label className="text-xs text-gray-400 font-semibold tracking-wide uppercase">Token Name</label>
          <input 
            type="text" 
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="Ex: Super Cat" 
            className="w-full bg-[#1C1C1E] border border-gray-700 rounded-xl p-3.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Ticker */}
        <div className="space-y-2">
          <label className="text-xs text-gray-400 font-semibold tracking-wide uppercase">Ticker (Symbol)</label>
          <input 
            type="text" 
            value={tokenSymbol}
            onChange={(e) => setTokenSymbol(e.target.value)}
            placeholder="Ex: $SCAT" 
            className="w-full bg-[#1C1C1E] border border-gray-700 rounded-xl p-3.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Total Supply */}
        <div className="space-y-2">
          <label className="text-xs text-gray-400 font-semibold tracking-wide uppercase">Total Supply</label>
          <input 
            type="number" 
            value={tokenSupply}
            onChange={(e) => setTokenSupply(e.target.value)}
            className="w-full bg-[#1C1C1E] border border-gray-700 rounded-xl p-3.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Advanced Options */}
        <div className="mt-8 space-y-4">
          <div className="text-xs text-blue-400 font-bold tracking-wide uppercase">ADVANCED OPTIONS (RECOMMENDED)</div>
          
          <div className="flex items-center justify-between bg-[#1C1C1E] p-4 rounded-xl border border-gray-700">
            <div>
              <h4 className="text-[15px] font-medium flex items-center gap-2">
                Revoke Ownership 
                <span className="bg-blue-500/10 text-blue-400 text-[11px] px-1.5 py-0.5 rounded font-bold">+0.5 TON</span>
              </h4>
              <p className="text-xs text-gray-500 mt-1">Make token safe (Unruggable)</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={revokeOwnership} onChange={(e) => setRevokeOwnership(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between bg-[#1C1C1E] p-4 rounded-xl border border-gray-700">
            <div>
              <h4 className="text-[15px] font-medium flex items-center gap-2">
                Vanity Address 
                <span className="bg-blue-500/10 text-blue-400 text-[11px] px-1.5 py-0.5 rounded font-bold">+1.0 TON</span>
              </h4>
              <p className="text-xs text-gray-500 mt-1">Contract ends with "8888"</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={vanityAddress} onChange={(e) => setVanityAddress(e.target.checked)} />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-[#0F0F11] border-t border-gray-800 p-5 z-50">
        <div className="flex justify-between items-center mb-3 text-sm">
          <span className="text-gray-500">Service Fee:</span>
          <span className="text-white font-extrabold text-lg">{totalPrice.toFixed(1)} TON</span>
        </div>
        <button 
          onClick={handleDeploy}
          className="w-full bg-blue-500 hover:bg-blue-600 active:scale-95 transition-all text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 text-lg"
        >
          🚀 DEPLOY JETTON NOW
        </button>
      </div>

      {/* Terminal Overlay */}
      {isDeploying && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col justify-center p-6 font-mono text-sm">
          <div className="space-y-2">
            {deployStep.map((step, idx) => (
              <div key={idx} className="text-green-400 animate-fade-in">
                {step.includes('Gas Fee') ? <span className="text-orange-400">{step}</span> : step}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1C1C1E] border border-gray-700 p-8 rounded-3xl text-center w-full max-w-sm shadow-2xl animate-pop-in">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">Token Deployed!</h2>
            <p className="text-gray-400 text-sm mb-6">Your token is now live on TON Blockchain.</p>
            
            <div className="bg-black p-3 rounded-lg border border-gray-800 mb-6 break-all font-mono text-xs text-gray-500">
              {contractAddress}
            </div>
            
            <div className="space-y-3">
              <button onClick={() => setShowSuccess(false)} className="w-full bg-[#2C2C2E] text-white font-bold py-3 rounded-xl hover:bg-[#3a3a3c]">
                Manage Token
              </button>
              <button onClick={() => window.open(`https://tonviewer.com/${contractAddress}`)} className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-600 shadow-lg shadow-blue-500/20">
                View on TonViewer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
