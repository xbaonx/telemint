// Remove unused import
import { CheckCircle2, ExternalLink, RotateCcw } from 'lucide-react';
import { telegram } from '../lib/telegram';
import { useTonAddress } from '@tonconnect/ui-react';

interface SuccessSheetProps {
  txHash: string;
  onReset: () => void;
}

export function SuccessSheet({ txHash, onReset }: SuccessSheetProps) {
  const isTestnet = import.meta.env.VITE_NETWORK === 'testnet';
  const userAddress = useTonAddress();
  
  // URL for NFT in wallet (display all NFTs of the user)
  const nftExplorerUrl = userAddress ? 
    `${isTestnet ? 'https://testnet.tonviewer.com' : 'https://tonviewer.com'}/address/${userAddress}/nfts` : 
    `${isTestnet ? 'https://testnet.tonviewer.com' : 'https://tonviewer.com'}`;

  const handleViewNFTs = () => {
    telegram.haptic('light');
    telegram.openLink(nftExplorerUrl);
  };

  const handleReset = () => {
    telegram.haptic('medium');
    onReset();
  };

  return (
    <div className="card bg-green-50 border-2 border-green-200">
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>

        <h2 className="text-2xl font-bold text-green-800 mb-2">
          Transaction Successful! 🎉
        </h2>

        <p className="text-gray-600 mb-6">
          Transaction verified. NFT will be minted and sent to your wallet in a few minutes.
        </p>

        <div className="w-full bg-white rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-500 mb-2">Transaction Hash</p>
          <p className="text-xs font-mono text-gray-800 break-all">
            {txHash.slice(0, 50)}...
          </p>
        </div>

        

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={handleViewNFTs}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            <span>View NFTs in Wallet</span>
          </button>

          <button
            onClick={handleReset}
            className="btn-secondary flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Mint Another NFT</span>
          </button>
        </div>
      </div>
    </div>
  );
}
