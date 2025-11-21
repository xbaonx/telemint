/**
 * TON blockchain integration
 * Build mint payload and send transaction via TON Connect
 */

import { Address, beginCell, toNano } from '@ton/core';
import { useTonConnectUI } from '@tonconnect/ui-react';
import type { SendTransactionResponse } from '@tonconnect/ui-react';

const COLLECTION_ADDRESS = import.meta.env.VITE_TON_COLLECTION_ADDRESS;
const MINT_PRICE_NANOTON = import.meta.env.VITE_MINT_PRICE_NANOTON || '1000000000';
const NETWORK = (import.meta.env.VITE_NETWORK || 'mainnet').toLowerCase();

/**
 * Build mint message payload
 * Format: op=0x01 (32bit) + to (address) + ref(content cell)
 */
export function buildMintPayload(toAddress: string, metadataUri: string): string {
  try {
    const to = Address.parse(toAddress);

    const contentCell = beginCell()
      .storeUint(0x01, 8) // TIP-64 off-chain content prefix
      .storeStringTail(metadataUri)
      .endCell();

    // Build main message body according to NftCollection.tact: op, query_id, to, content
    const messageBody = beginCell()
      .storeUint(1, 32) // op: mint
      .storeUint(0, 64) // query_id
      .storeAddress(to)
      .storeRef(contentCell)
      .endCell();

    // Convert to base64 for TON Connect
    const payload = messageBody.toBoc().toString('base64');
    console.log('💼 Mint payload generated:', payload);
    return payload;
  } catch (error) {
    console.error('❌ Error building mint payload:', error);
    throw new Error('Failed to build mint transaction');
  }
}

/**
 * Get the full price for minting from the smart contract.
 */
export async function getFullPriceOnChain(collection: string): Promise<bigint> {
  const toncenterUrl = NETWORK === 'testnet' 
    ? 'https://testnet.toncenter.com/api/v3'
    : 'https://toncenter.com/api/v3';

  // Use Toncenter to run the get method
  try {
    const url = `${toncenterUrl}/runGetMethod?address=${collection}&method=get_full_price`;
    const apiKey = import.meta.env.VITE_TONCENTER_API_KEY;
    const headers: HeadersInit = {};
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }
    const res = await fetch(url, { headers });
    if (res.ok) {
      const json = await res.json();
      const stack = json?.result?.stack || [];
      const raw = Array.isArray(stack) ? (stack[0]?.[1] ?? stack[0]?.value ?? stack[0]) : undefined;
      if (raw !== undefined && raw !== null) {
        const price = BigInt(raw.toString());
        console.log('🔎 On-chain full price (Toncenter):', price.toString());
        return price;
      }
    }
  } catch (e) {
    console.warn('Toncenter get_full_price failed, using fallback');
  }

  // Fallback to a reasonable default if on-chain call fails
  // Contract mint fee is 1 TON + gas
  const fallbackPrice = toNano('1.1');
  console.log('🔎 Using fallback full price:', fallbackPrice.toString());
  return fallbackPrice;
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

  // Get the full price from the smart contract
  const amount = (await getFullPriceOnChain(COLLECTION_ADDRESS)).toString();

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

  console.log('🔴 DEBUG: Transaction object sent to wallet:', JSON.stringify(transaction, null, 2));

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
    
    // Thử gọi transaction với cơ chế retry
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        if (attempts > 1) {
          console.log(`🔄 Retry attempt ${attempts}/${maxAttempts}...`);
        }

        // Race giữa gọi transaction và timeout
        const result = await Promise.race([
          tonConnectUI.sendTransaction(transaction),
          timeoutPromise
        ]);
        
        console.log('✅ Transaction sent:', result);
        return result as SendTransactionResponse;
      } catch (err: any) {
        // Nếu là lỗi verification hoặc BadRequestError, thử lại
        if ((err.message?.includes('verification') || err.message?.includes('BadRequestError')) 
            && attempts < maxAttempts) {
          console.log('♻️ Transaction verification failed, retrying...');
          // Chờ ngắn trước khi thử lại
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        // Nếu lỗi khác hoặc đã hết số lần retry, throw lỗi
        throw err;
      }
    }
    
    // Fallback trong trường hợp vòng lặp kết thúc mà không có return/throw
    throw new Error('Failed to send transaction after multiple attempts');
  } catch (error: any) {
    console.error('❌ Transaction failed:', error);
    
    // Phân loại lỗi chi tiết hơn
    if (error.message?.includes('user reject') || error.message?.includes('declined')) {
      throw new Error('Transaction rejected by user');
    } else if (error.message?.includes('timeout')) {
      throw new Error('Transaction request timed out. Please try again.');
    } else if (error.message?.includes('network')) {
      throw new Error('Network issue. Check your connection and try again.');
    } else if (error.message?.includes('insufficient') || error.message?.includes('balance')) {
      throw new Error('Insufficient balance to complete transaction.');
    } else if (error.message?.includes('verification failed')) {
      // Lỗi Transaction verification failed
      console.error('❌ Transaction verification failed:', error);
      throw new Error('Giao dịch không được xác thực. Hãy kiểm tra ví của bạn và thử lại.');
    } else if (error.message?.includes('contains errors') || error.message?.includes('BadRequestError')) {
      // Xử lý riêng cho lỗi BadRequestError
      console.error('❌ BadRequestError details:', error);
      
      // Kiểm tra xem có phải là lỗi format payload
      if (error.message?.includes('payload')) {
        throw new Error('Invalid transaction format. Please try again later.');
      } else if (error.message?.includes('wallet')) {
        throw new Error('Lỗi kết nối với ví TON. Hãy kết nối lại ví.');
      } else {
        throw new Error('Yêu cầu chứa lỗi. Vui lòng thử lại sau.');
      }
    }
    
    // Log chi tiết hơn
    console.error('🛑 Detailed error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
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
export function getTonViewerUrl(address: string, testnet: boolean = NETWORK === 'testnet'): string {
  const base = testnet ? 'https://testnet.tonviewer.com' : 'https://tonviewer.com';
  return `${base}/${address}`;
}

/**
 * Get transaction explorer URL
 */
export function getTxExplorerUrl(txHash: string, testnet: boolean = NETWORK === 'testnet'): string {
  const base = testnet ? 'https://testnet.tonviewer.com' : 'https://tonviewer.com';
  if (!txHash) return base;
  // If it's a BOC (starts with te6cc...) returned by wallet, explorers can't open it as tx id.
  // Fallback to explorer home to avoid 404.
  if (txHash.startsWith('te6cc')) {
    return base;
  }
  return `${base}/transaction/${txHash}`;
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

/**
 * Register debug helpers on window for diagnosis.
 * Usage in console:
 *   debugTonTransfer('<your_address>', '0.01')
 */
export function registerDebugHelpers(
  tonConnectUI: ReturnType<typeof useTonConnectUI>[0],
  defaultTo?: string
) {
  try {
    (window as any).debugTonTransfer = async (
      to: string = defaultTo || '',
      amountTon: string = '0.01'
    ) => {
      if (!to) throw new Error('Provide recipient address to debugTonTransfer(to, amountTon)');
      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 180,
        messages: [
          {
            address: to,
            amount: toNano(amountTon).toString(),
          },
        ],
      };
      console.log('🧪 Debug transfer transaction:', tx);
      const res = await tonConnectUI.sendTransaction(tx);
      console.log('🧪 Debug transfer result:', res);
      return res;
    };
    (window as any).debugSend = async (
      address: string,
      amountTon: string = '0.05',
      payloadBase64?: string
    ) => {
      if (!address) throw new Error('debugSend requires address');
      const msg: any = {
        address,
        amount: toNano(amountTon).toString(),
      };
      if (payloadBase64) msg.payload = payloadBase64;
      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 180,
        messages: [msg],
      };
      console.log('🧪 Debug send transaction:', tx);
      const res = await tonConnectUI.sendTransaction(tx);
      console.log('🧪 Debug send result:', res);
      return res;
    };
    (window as any).buildMintPayload = (to: string, uri: string) => buildMintPayload(to, uri);
    (window as any).COLLECTION_ADDRESS = COLLECTION_ADDRESS;
    (window as any).MINT_PRICE_NANOTON = MINT_PRICE_NANOTON;
    (window as any).userAddress = defaultTo || '';
    console.log('🧪 Registered debug helpers on window');
  } catch (e) {
    console.error('Failed to register debug helpers:', e);
  }
}
