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

      // Inform the user to open their TON wallet for approval
      alert(
        'To mint an NFT, please approve the transaction in your TON wallet.\n\n' +
        'If you don\'t see the wallet open, check your browser settings ' +
        'and allow popups or external windows.'
      );

      // Send mint transaction directly on-chain to Collection (standard payload)
      const result = await sendMintTransaction(
        tonConnectUI,
        userAddress,
        metadataUri
      );

      telegram.haptic('success');
      
      // Get BOC/tx id returned from wallet (some wallets return `boc`)
      const txHash = (result as any)?.boc || 'submitted';
      
      console.log('🖊️ Mint transaction sent with result:', {
        txHash
      });
      
      // Call onSuccess with txHash (backend requestId is no longer used)
      onSuccess(txHash, undefined);
      
      // Notify success
      alert('Transaction successful! NFT will be minted and sent to your wallet in a few minutes.');
    } catch (error: any) {
      console.error('❌ Mint failed:', error);
      telegram.haptic('error');
      
      // Chi tiết hóa lỗi
      let errorMessage = error.message || 'Failed to send NFT mint request. Please try again.';
      
      // Check details based on TON Connect error
      if (error.message?.includes('timeout')) {
        errorMessage = 'Wallet connection timed out. Please try again.';
      } else if (error.message?.includes('user reject') || error.message?.includes('declined')) {
        errorMessage = 'Transaction was rejected in the wallet.';
      } else if (error.message?.includes('insufficient') || error.message?.includes('balance')) {
        errorMessage = 'Insufficient balance to mint NFT.';
      } else if (error.message?.includes('backend') || error.message?.includes('notify')) {
        errorMessage = 'Transaction sent but failed to notify system. NFT might still be minted, please check later.';
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
