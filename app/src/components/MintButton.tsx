import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
// Loại bỏ import không cần thiết 
// import type { SendTransactionResponse } from '@tonconnect/ui-react';
import { formatNanoTon, sendMintTransaction } from '../lib/ton';
import { telegram } from '../lib/telegram';

interface MintButtonProps {
  metadataUri: string | null;
  mintPrice: string;
  onSuccess: (txHash: string, requestId?: string) => void;
  disabled?: boolean;
}

export function MintButton({
  metadataUri,
  mintPrice,
  onSuccess,
  disabled,
}: MintButtonProps) {
  const [tonConnectUI] = useTonConnectUI();
  const userAddress = useTonAddress();
  const [isMinting, setIsMinting] = useState(false);

  const handleMint = async () => {
    if (!metadataUri) {
      telegram.showAlert('Please upload an image first');
      return;
    }

    if (!userAddress) {
      telegram.showAlert('Please connect your wallet first');
      telegram.haptic('error');
      return;
    }

    try {
      setIsMinting(true);
      telegram.haptic('medium');

      // Thông báo rõ ràng hơn về quá trình mint
      console.log('🎨 Preparing NFT mint...', {
        to: userAddress,
        metadataUri,
      });

      // Thông báo cho người dùng cần mở ví TON để phê duyệt
      alert(
        'To mint an NFT, please approve the transaction in your TON wallet.\n\n' +
        'If you don\'t see the wallet open, check your browser settings ' +
        'and allow popups or external windows.'
      );

      // Gửi giao dịch mint trực tiếp on-chain tới Collection (payload chuẩn)
      const result = await sendMintTransaction(
        tonConnectUI,
        userAddress,
        metadataUri
      );

      telegram.haptic('success');
      
      // Lấy BOC/tx id trả về từ wallet (một số ví trả về `boc`)
      const txHash = (result as any)?.boc || 'submitted';
      
      console.log('🖊️ Mint transaction sent with result:', {
        txHash
      });
      
      // Gọi hàm onSuccess với txHash (không dùng backend requestId nữa)
      onSuccess(txHash, undefined);
      
      // Thông báo thành công
      alert('Giao dịch thành công! NFT sẽ được mint và gửi đến ví của bạn trong ít phút.');
    } catch (error: any) {
      console.error('❌ Mint failed:', error);
      telegram.haptic('error');
      
      // Chi tiết hóa lỗi
      let errorMessage = error.message || 'Không thể gửi yêu cầu mint NFT. Vui lòng thử lại.';
      
      // Kiểm tra chi tiết hơn dựa theo lỗi TON Connect
      if (error.message?.includes('timeout')) {
        errorMessage = 'Kết nối ví hết thời gian. Vui lòng thử lại.';
      } else if (error.message?.includes('user reject') || error.message?.includes('từ chối')) {
        errorMessage = 'Giao dịch đã bị từ chối trong ví.';
      } else if (error.message?.includes('insufficient') || error.message?.includes('không đủ')) {
        errorMessage = 'Số dư không đủ để mint NFT.';
      } else if (error.message?.includes('backend') || error.message?.includes('notify')) {
        errorMessage = 'Giao dịch được gửi nhưng không thể thông báo cho hệ thống. NFT có thể vẫn sẽ được mint, vui lòng kiểm tra sau.';
      }
      
      console.log('🛑 Error details:', { message: errorMessage, originalError: error });
      telegram.showAlert(errorMessage);
    } finally {
      setIsMinting(false);
    }
  };

  const isDisabled = disabled || isMinting || !metadataUri || !userAddress;

  return (
    <button
      onClick={handleMint}
      disabled={isDisabled}
      className="btn-primary w-full flex items-center justify-center gap-2"
    >
      {isMinting ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Minting...</span>
        </>
      ) : (
        <>
          <Sparkles className="w-5 h-5" />
          <span>Mint NFT for {formatNanoTon(mintPrice)} TON</span>
        </>
      )}
    </button>
  );
}
