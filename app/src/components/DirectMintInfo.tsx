import { Info } from 'lucide-react';

/**
 * Component hiển thị thông tin về cách mint NFT qua Direct API
 */
export function DirectMintInfo() {
  return (
    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 mt-4">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            Cách thức Mint NFT
          </h3>
          <p className="text-xs text-blue-700 mb-2">
            Khi bạn nhấn "Mint NFT", một giao dịch đơn giản sẽ được gửi tới ví của hệ thống. 
            Sau khi xác nhận thanh toán, NFT sẽ được mint tự động và gửi đến ví của bạn trong vòng vài phút.
          </p>
          <p className="text-xs text-blue-600">
            Quá trình này đơn giản hơn và tương thích với tất cả các ví TON, bao gồm cả Telegram Wallet.
          </p>
        </div>
      </div>
    </div>
  );
}
