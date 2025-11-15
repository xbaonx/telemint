/**
 * TON blockchain integration
 * Build mint payload and send transaction via TON Connect
 */

import { Address, beginCell, toNano } from '@ton/core';
import { useTonConnectUI } from '@tonconnect/ui-react';
import type { SendTransactionResponse } from '@tonconnect/ui-react';

const COLLECTION_ADDRESS = import.meta.env.VITE_TON_COLLECTION_ADDRESS;
const MINT_PRICE_NANOTON = import.meta.env.VITE_MINT_PRICE_NANOTON || '1000000000';

/**
 * Build mint message payload
 * Format: op=0x01 (32bit) + to (address) + ref(content cell)
 */
export function buildMintPayload(toAddress: string, metadataUri: string): string {
  try {
    const to = Address.parse(toAddress);

    // Build content cell containing metadata URI
    const contentCell = beginCell()
      .storeUint(0, 8) // Prefix for off-chain content
      .storeStringTail(metadataUri) // IPFS URI as string
      .endCell();

    // Build main message body
    // Mint message: to Address + content Cell
    const messageBody = beginCell()
      .storeAddress(to)
      .storeRef(contentCell)
      .endCell();

    // Convert to base64 for TON Connect
    const payload = messageBody.toBoc().toString('base64');
    return payload;
  } catch (error) {
    console.error('❌ Error building mint payload:', error);
    throw new Error('Failed to build mint transaction');
  }
}

/**
 * Send mint transaction via TON Connect
 */
export async function sendMintTransaction(
  tonConnectUI: ReturnType<typeof useTonConnectUI>[0],
  toAddress: string,
  metadataUri: string
): Promise<SendTransactionResponse> {
  if (!COLLECTION_ADDRESS) {
    throw new Error('Collection address not configured');
  }

  // Build payload
  const payload = buildMintPayload(toAddress, metadataUri);

  // Calculate amount: mint fee + buffer
  const amount = MINT_PRICE_NANOTON;

  console.log('📤 Sending mint transaction:', {
    collection: COLLECTION_ADDRESS,
    to: toAddress,
    amount: formatNanoTon(amount),
    metadataUri,
  });

  // Send transaction
  const transaction = {
    validUntil: Math.floor(Date.now() / 1000) + 180, // 3 minutes
    messages: [
      {
        address: COLLECTION_ADDRESS,
        amount: amount,
        payload: payload,
      },
    ],
  };

  try {
    // Kiểm tra xem đã kết nối ví TON chưa
    if (!tonConnectUI.connected) {
      console.log('🔗 Không có kết nối ví, đang kết nối...');
      // Thông báo cho người dùng
      alert('Connecting to TON wallet...');
      
      // Chờ để kết nối ví hoàn tất trước khi gửi giao dịch
      try {
        await tonConnectUI.connectWallet();
        console.log('✅ Đã kết nối ví TON thành công');
      } catch (connError) {
        console.error('❌ Lỗi kết nối ví:', connError);
        throw new Error('Could not connect to TON wallet. Please try again.');
      }
    }
    
    // Kiểm tra lại kết nối
    if (!tonConnectUI.connected) {
      throw new Error('Wallet connection required');
    }
    
    console.log('💰 Sending to wallet for approval...');

    // Thêm promise timeout 60s (tăng lên so với 45s trước đó)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Transaction approval timed out after 60s')), 60000);
    });
    
    // Race giữa gọi transaction và timeout
    const result = await Promise.race([
      tonConnectUI.sendTransaction(transaction),
      timeoutPromise
    ]);
    
    console.log('✅ Transaction sent:', result);
    return result as SendTransactionResponse;
  } catch (error: any) {
    console.error('❌ Transaction failed:', error);
    
    // Phân loại lỗi chi tiết hơn
    if (error.message?.includes('user reject')) {
      throw new Error('Transaction rejected by user');
    } else if (error.message?.includes('timeout')) {
      throw new Error('Transaction request timed out. Please try again.');
    } else if (error.message?.includes('network')) {
      throw new Error('Network issue. Check your connection and try again.');
    } else if (error.message?.includes('insufficient') || error.message?.includes('balance')) {
      throw new Error('Insufficient balance to complete transaction.');
    }
    
    // Log chi tiết hơn
    console.error('🛑 Detailed error:', JSON.stringify(error, null, 2));
    throw new Error('Transaction failed. Please try again.');
  }
}

/**
 * Get collection address from env
 */
export function getCollectionAddress(): string {
  if (!COLLECTION_ADDRESS) {
    throw new Error('VITE_TON_COLLECTION_ADDRESS not set in .env');
  }
  return COLLECTION_ADDRESS;
}

/**
 * Get mint price in nanoton
 */
export function getMintPriceNanoton(): string {
  return MINT_PRICE_NANOTON;
}

/**
 * Convert nanoton to TON
 */
export function formatNanoTon(nanoton: string | number | bigint): string {
  const nano = typeof nanoton === 'string' ? BigInt(nanoton) : BigInt(nanoton);
  const ton = Number(nano) / 1_000_000_000;
  return ton.toFixed(2);
}

/**
 * Format address for display (shortened)
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get TON viewer URL
 */
export function getTonViewerUrl(address: string, testnet: boolean = true): string {
  const base = testnet ? 'https://testnet.tonviewer.com' : 'https://tonviewer.com';
  return `${base}/${address}`;
}

/**
 * Get transaction explorer URL
 */
export function getTxExplorerUrl(txHash: string, testnet: boolean = true): string {
  const base = testnet ? 'https://testnet.tonviewer.com/transaction' : 'https://tonviewer.com/transaction';
  return `${base}/${txHash}`;
}

/**
 * Parse TON amount from string
 */
export function parseTonAmount(ton: string): string {
  try {
    const nanoton = toNano(ton);
    return nanoton.toString();
  } catch (error) {
    throw new Error('Invalid TON amount');
  }
}
