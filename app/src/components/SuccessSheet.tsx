// Loại bỏ import không sử dụng
import { CheckCircle2, ExternalLink, RotateCcw } from 'lucide-react';
import { getTxExplorerUrl } from '../lib/ton';
import { telegram } from '../lib/telegram';
import { MintStatusChecker } from './MintStatusChecker';

interface SuccessSheetProps {
  txHash: string;
  onReset: () => void;
  requestId?: string;
}

export function SuccessSheet({ txHash, onReset, requestId }: SuccessSheetProps) {
  const isTestnet = import.meta.env.VITE_NETWORK === 'testnet';
  const explorerUrl = getTxExplorerUrl(txHash, isTestnet);

  const handleViewTransaction = () => {
    telegram.haptic('light');
    telegram.openLink(explorerUrl);
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
          Giao dịch thành công! 🎉
        </h2>

        <p className="text-gray-600 mb-6">
          Giao dịch đã được xác nhận. NFT sẽ được mint và gửi đến ví của bạn trong vòng vài phút.
        </p>

        <div className="w-full bg-white rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-500 mb-2">Transaction Hash</p>
          <p className="text-xs font-mono text-gray-800 break-all">
            {txHash.slice(0, 50)}...
          </p>
        </div>

        {/* Kiểm tra trạng thái mint nếu có requestId */}
        {requestId && (
          <div className="w-full mb-4">
            <MintStatusChecker requestId={requestId} />
          </div>
        )}

        {!requestId && (
          <p className="text-xs text-gray-500 mb-4">
            Việc mint NFT sẽ được xử lý tự động trên hệ thống của chúng tôi. Vui lòng đợi vài phút để NFT xuất hiện trong ví của bạn.
          </p>
        )}

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={handleViewTransaction}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            <span>View on Explorer</span>
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
