import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import type { SendTransactionResponse } from '@tonconnect/ui-react';
import { sendMintTransaction, formatNanoTon } from '../lib/ton';
import { telegram } from '../lib/telegram';

interface MintButtonProps {
  metadataUri: string | null;
  mintPrice: string;
  onSuccess: (txHash: string) => void;
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

      // Send mint transaction
      const result: SendTransactionResponse = await sendMintTransaction(
        tonConnectUI,
        userAddress,
        metadataUri
      );

      telegram.haptic('success');
      
      // Extract tx hash/BOC from result if available
      // Some wallets return `boc` in the response; fallback to a placeholder string
      const txHash = (result as any)?.boc || 'submitted';
      onSuccess(txHash);
      
      // Thông báo thành công
      alert('NFT successfully minted! It will appear in your wallet soon.');
    } catch (error: any) {
      console.error('❌ Mint failed:', error);
      telegram.haptic('error');
      
      // Chi tiết hóa lỗi
      let errorMessage = error.message || 'Failed to mint NFT. Please try again.';
      
      // Kiểm tra chi tiết hơn dựa theo lỗi TON Connect
      if (error.message?.includes('timeout')) {
        errorMessage = 'Wallet connection timed out. Please try again.';
      } else if (error.message?.includes('user reject')) {
        errorMessage = 'Transaction was rejected in wallet.';
      } else if (error.message?.includes('insufficient')) {
        errorMessage = 'Insufficient balance to mint NFT.';
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
