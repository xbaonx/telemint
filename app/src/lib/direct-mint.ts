/**
 * Direct Mint API Integration
 * Gửi giao dịch đơn giản tới API wallet và thông báo backend về mint request
 */

import { useTonConnectUI } from '@tonconnect/ui-react';
import type { SendTransactionResponse } from '@tonconnect/ui-react';
// Chỉ sử dụng các import cần thiết

// Lấy biến môi trường
const API_WALLET_ADDRESS = import.meta.env.VITE_API_WALLET_ADDRESS || '';
// Sử dụng API trong cùng một dự án - tự động phát hiện API endpoint
const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || '';
const MINT_PRICE_NANOTON = import.meta.env.VITE_MINT_PRICE_NANOTON || '1000000000';

/**
 * Gửi giao dịch đơn giản tới API wallet
 */
export interface MintResponse extends SendTransactionResponse {
  requestId?: string;
}

export async function sendDirectMintTransaction(
  tonConnectUI: ReturnType<typeof useTonConnectUI>[0],
  userAddress: string,
  metadataUri: string
): Promise<MintResponse> {
  if (!API_WALLET_ADDRESS) {
    throw new Error('API wallet address not configured');
  }

  // Lấy mint fee từ biến môi trường hoặc API
  // Chúng ta có thể sử dụng getMintFeeOnChain nhưng đơn giản hóa bằng cách dùng giá trị từ env
  const mintFee = BigInt(MINT_PRICE_NANOTON);
  const overhead = 350000000n; // 0.35 TON overhead
  const amount = (mintFee + overhead).toString();
  
  console.log('📤 Sending direct mint transaction:', {
    apiWallet: API_WALLET_ADDRESS,
    userAddress,
    amount: (Number(amount) / 1_000_000_000).toFixed(2),
    metadataUri
  });

  // Tạo giao dịch đơn giản - không có payload phức tạp
  const transaction = {
    validUntil: Math.floor(Date.now() / 1000) + 180,
    messages: [
      {
        address: API_WALLET_ADDRESS,
        amount: amount,
        // Không có payload phức tạp!
      },
    ],
  };

  try {
    if (!tonConnectUI.connected) {
      console.log('🔗 Không có kết nối ví, đang kết nối...');
      alert('Đang kết nối với ví TON...');
      await tonConnectUI.connectWallet();
    }
    
    // Thêm promise timeout 60s
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Yêu cầu phê duyệt giao dịch đã hết hạn sau 60 giây')), 60000);
    });
    
    // Gửi giao dịch
    const result = await Promise.race([
      tonConnectUI.sendTransaction(transaction),
      timeoutPromise
    ]);
    
    console.log('✅ Transaction sent:', result);
    
    // Thông báo cho backend về giao dịch để xử lý mint
    let requestId;
    try {
      const backendResponse = await notifyBackendOfTransaction(result, userAddress, metadataUri);
      requestId = backendResponse?.requestId;
      console.log('✅ Backend notified with request ID:', requestId);
    } catch (notifyError) {
      console.error('⚠️ Failed to notify backend (but transaction was sent):', notifyError);
      // Không throw lỗi ở đây, vì giao dịch đã được gửi thành công
    }
    
    return { ...result, requestId } as MintResponse;
  } catch (error: any) {
    console.error('❌ Transaction failed:', error);
    
    // Phân loại lỗi chi tiết
    if (error.message?.includes('user reject') || error.message?.includes('declined')) {
      throw new Error('Giao dịch bị từ chối bởi người dùng');
    } else if (error.message?.includes('timeout')) {
      throw new Error('Yêu cầu giao dịch đã hết hạn. Vui lòng thử lại.');
    } else if (error.message?.includes('network')) {
      throw new Error('Lỗi mạng. Kiểm tra kết nối và thử lại.');
    } else if (error.message?.includes('insufficient') || error.message?.includes('balance')) {
      throw new Error('Số dư không đủ để hoàn thành giao dịch.');
    }
    
    throw new Error('Giao dịch thất bại. Vui lòng thử lại.');
  }
}

/**
 * Thông báo cho backend về giao dịch để xử lý mint
 */
async function notifyBackendOfTransaction(
  txResult: SendTransactionResponse, 
  userAddress: string,
  metadataUri: string
): Promise<{ requestId: string } | undefined> {
  // Xác định endpoint API (tự động sử dụng API cùng domain nếu không cấu hình API_ENDPOINT)
  const apiUrl = API_ENDPOINT 
    ? `${API_ENDPOINT}/api/mint-request`
    : '/api/mint-request';
  
  try {
    console.log('🔗 Notifying backend at:', apiUrl);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        txHash: (txResult as any).boc || 'submitted',
        userAddress: userAddress,
        metadataUri: metadataUri,
        timestamp: Date.now()
      })
    });
    
    if (!response.ok) {
      console.error('❌ Backend notification error:', await response.text());
      throw new Error('Failed to notify backend');
    }
    
    // Parse response from backend
    const responseData = await response.json();
    console.log('✅ Backend notified successfully:', responseData);
    
    // Return requestId from backend
    if (responseData && responseData.requestId) {
      return { requestId: responseData.requestId };
    }
    
    return undefined;
  } catch (err) {
    console.error('❌ Backend notification error:', err);
    throw new Error('Failed to notify backend');
  }
}
