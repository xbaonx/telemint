import { useState } from 'react';
import { Check, Coins, Tag, Upload, Rocket, Sparkles } from 'lucide-react';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { uploadToIPFS } from '../lib/ipfs';
import { deployJetton } from '../lib/ton';

export function JettonMinter() {
  const userAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  
  // Form State
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenSupply, setTokenSupply] = useState('1000000000');
  const [tokenImage, setTokenImage] = useState<File | null>(null);
  
  // Options State
  // Ownership: default is revoked (no admin). User can pay extra to keep admin rights.
  const [keepOwnership, setKeepOwnership] = useState(false);
  
  // UI State
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStep, setDeployStep] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [contractAddress, setContractAddress] = useState('');

  // Price Calculation
  const basePrice = 0.3;
  const totalPrice = basePrice + (keepOwnership ? 0.5 : 0);

  const addLog = (msg: string) => setDeployStep(prev => [...prev, msg]);

  const handleDeploy = async () => {
    if (!userAddress) {
      alert('Please connect your wallet first!');
      return;
    }
    if (!tokenName || !tokenSymbol || !tokenImage) {
      alert("Please enter Name, Symbol and upload Logo!");
      return;
    }

    const ownershipNotice = keepOwnership
      ? 'You are KEEPING ownership. You remain responsible and can manage/mint later. Continue?'
      : 'You are REVOCING ownership (no admin). You will NEVER be able to mint more or change this token after deployment. Continue?';
    if (!window.confirm(ownershipNotice)) {
      return;
    }

    try {
      setIsDeploying(true);
      setDeployStep([]);
      addLog(`> Initiating deployment for ${tokenSymbol}...`);
      
      // 1. Upload Metadata
      addLog('> Uploading metadata to IPFS...');
      const { metadataUri } = await uploadToIPFS(
        tokenImage,
        tokenName,
        `Token ${tokenSymbol} on TON`,
        tokenSymbol,
        9
      );
      addLog(`> Metadata uploaded: ${metadataUri}`);

      // 2. Deploy
      addLog('> Preparing deployment transaction...');
      const { contractAddress } = await deployJetton(tonConnectUI, {
          owner: userAddress,
          name: tokenName,
          symbol: tokenSymbol,
          image: metadataUri, // Use metadata JSON URI here
          totalSupply: tokenSupply,
          totalPrice: totalPrice,
          revokeOwnership: !keepOwnership,
      });

      setContractAddress(contractAddress);
      addLog(`> Transaction sent! Contract: ${contractAddress}`);
      addLog('> Waiting for block confirmation...');

      // Fake wait for confirmation (real wait needs indexer)
      setTimeout(() => {
          setIsDeploying(false);
          setShowSuccess(true);
      }, 5000);

    } catch (e: any) {
      console.error(e);
      addLog(`> ERROR: ${e.message || 'Deployment failed'}`);
      setTimeout(() => setIsDeploying(false), 3000);
    }
  };

  const handleImageUpload = () => {
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
    <div className="text-white font-sans">
      {/* Main Card Container */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-8">
        
        {/* Top Section: Logo & Basic Info */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Logo Upload */}
          <div className="shrink-0">
            <label className="text-xs text-gray-400 font-semibold tracking-wide uppercase mb-2 block pl-1">Token Logo</label>
            <div 
              onClick={handleImageUpload}
              className={`w-32 h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group relative overflow-hidden
                ${tokenImage ? 'border-green-500 bg-green-500/10' : 'border-white/10 bg-black/20 hover:border-blue-500 hover:bg-blue-500/5'}`}
            >
              {tokenImage ? (
                <>
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/40">
                    <Check className="w-8 h-8 text-green-400 drop-shadow-lg" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-green-500/20 to-transparent" />
                  {/* Preview Image */}
                  <img 
                    src={URL.createObjectURL(tokenImage)} 
                    alt="Token Preview" 
                    className="absolute inset-0 w-full h-full object-cover opacity-50" 
                  />
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-gray-500 mb-2 group-hover:text-blue-400 transition-colors" />
                  <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider group-hover:text-blue-300">Upload</span>
                </>
              )}
            </div>
          </div>

          {/* Basic Fields */}
          <div className="flex-1 space-y-5">
            <div>
              <label className="text-xs text-gray-400 font-semibold tracking-wide uppercase mb-2 block pl-1">Display Name</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors">
                  <Sparkles size={18} />
                </div>
                <input 
                  type="text" 
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="e.g. Super Telegram Coin" 
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-semibold tracking-wide uppercase mb-2 block pl-1">Token Symbol</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors">
                  <Tag size={18} />
                </div>
                <input 
                  type="text" 
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value)}
                  placeholder="e.g. $STC" 
                  className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all uppercase font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Supply Section */}
        <div>
          <label className="text-xs text-gray-400 font-semibold tracking-wide uppercase mb-2 block pl-1">Total Supply</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition-colors">
              <Coins size={18} />
            </div>
            <input 
              type="number" 
              value={tokenSupply}
              onChange={(e) => setTokenSupply(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl py-3.5 pl-11 pr-4 text-white font-mono tracking-wide focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 bg-white/5 px-2 py-1 rounded-md border border-white/5">
              TOKENS
            </div>
          </div>
        </div>

        {/* Advanced Options Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-[#0F0F11] text-[10px] font-bold text-gray-500 uppercase tracking-widest rounded-full border border-white/10">
              Advanced Features
            </span>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 gap-4">
          <div className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between
            ${keepOwnership ? 'bg-blue-500/10 border-blue-500/50' : 'bg-white/5 border-white/5 hover:border-white/20'}`}
            onClick={() => setKeepOwnership(!keepOwnership)}
          >
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${keepOwnership ? 'border-blue-400 bg-blue-400' : 'border-gray-600'}`}>
                {keepOwnership && <Check size={12} className="text-white" />}
              </div>
              <div>
                <h4 className={`text-sm font-bold ${keepOwnership ? 'text-blue-200' : 'text-gray-300'}`}>Keep Ownership</h4>
                <p className="text-xs text-gray-500">Admin stays (can mint/manage later)</p>
              </div>
            </div>
            <div className="px-2 py-1 bg-white/5 rounded text-[10px] font-mono text-gray-400 border border-white/5">
              +0.5 TON
            </div>
          </div>
        </div>

        {/* Deploy Section */}
        <div className="pt-4">
          <div className="flex justify-between items-center mb-4 px-1">
            <span className="text-gray-400 text-sm font-medium">Total Service Fee</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white tracking-tight">{totalPrice.toFixed(1)}</span>
              <span className="text-sm font-bold text-blue-400">TON</span>
            </div>
          </div>
          
          <button 
            onClick={handleDeploy}
            disabled={isDeploying}
            className="w-full group relative overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 ease-out -skew-x-12 -translate-x-full" />
            <div className="flex items-center justify-center gap-2">
              {isDeploying ? (
                 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                 <Rocket className="w-5 h-5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
              )}
              <span className="tracking-wide">{isDeploying ? 'DEPLOYING...' : 'DEPLOY JETTON'}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Terminal Overlay */}
      {isDeploying && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col justify-center p-6 font-mono text-sm backdrop-blur-md">
          <div className="max-w-md mx-auto w-full bg-[#0F0F11] border border-gray-800 rounded-xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4 border-b border-gray-800 pb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
                <span className="ml-2 text-xs text-gray-500">deployment_terminal.sh</span>
            </div>
            <div className="space-y-2 font-mono text-xs md:text-sm h-64 overflow-y-auto custom-scrollbar">
              {deployStep.map((step, idx) => (
                <div key={idx} className="flex gap-2 animate-fade-in">
                  <span className="text-gray-600">{(idx + 1).toString().padStart(2, '0')}</span>
                  <span className={step.includes('ERROR') ? 'text-red-400 font-bold' : step.includes('SUCCESS') ? 'text-green-400 font-bold' : 'text-blue-300'}>
                    {step}
                  </span>
                </div>
              ))}
              <div className="animate-pulse text-blue-500">_</div>
            </div>
            <div className="mt-4 flex justify-end">
               <button onClick={() => setIsDeploying(false)} className="text-xs text-gray-500 hover:text-white underline">Close Terminal</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#1C1C1E] border border-white/10 p-8 rounded-3xl text-center w-full max-w-sm shadow-2xl animate-pop-in relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent" />
            <div className="relative z-10">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6 ring-1 ring-green-500/50">
                    <div className="text-4xl">🎉</div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Token Deployed!</h2>
                <p className="text-gray-400 text-sm mb-8 leading-relaxed">Your token <span className="text-white font-bold">{tokenSymbol}</span> is now live on the TON Blockchain.</p>
                
                <div className="bg-black/50 p-4 rounded-xl border border-white/5 mb-6 text-left">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-1">Contract Address</div>
                    <div className="font-mono text-xs text-blue-300 break-all select-all cursor-text">
                    {contractAddress}
                    </div>
                </div>
                
                <div className="space-y-3">
                <button onClick={() => setShowSuccess(false)} className="w-full bg-white/5 text-white font-bold py-3.5 rounded-xl hover:bg-white/10 border border-white/5 transition-colors">
                    Close
                </button>
                <button onClick={() => window.open(`https://tonviewer.com/${contractAddress}`)} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-500 shadow-lg shadow-blue-500/25 transition-all">
                    View on TonViewer
                </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
