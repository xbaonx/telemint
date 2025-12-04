/**
 * TON blockchain integration
 * Build mint payload and send transaction via TON Connect
 */

import { Address, beginCell, toNano, Cell, contractAddress as getContractAddress, StateInit, storeStateInit } from '@ton/core';
import { Buffer } from 'buffer';
import { useTonConnectUI } from '@tonconnect/ui-react';
import type { SendTransactionResponse } from '@tonconnect/ui-react';
import { JETTON_MINTER_CODE_BOC, JETTON_WALLET_CODE_BOC } from './jetton-contracts';
import minterCompiledRaw from './contracts/jetton-minter.compiled.json?raw';
import walletCompiledRaw from './contracts/jetton-wallet.compiled.json?raw';

const COLLECTION_ADDRESS = import.meta.env.VITE_TON_COLLECTION_ADDRESS;
const MINT_PRICE_NANOTON = import.meta.env.VITE_MINT_PRICE_NANOTON || '1000000000';
const NETWORK = (import.meta.env.VITE_NETWORK || 'mainnet').toLowerCase();
const PLATFORM_WALLET = import.meta.env.VITE_PLATFORM_WALLET; // Wallet to receive service fees

// Load Jetton codes from bundled compiled JSON (fallback to local constants)
async function loadJettonCodes(): Promise<{ minterCode: Cell; walletCode: Cell }>{
  try {
    const minterHex: string = String(JSON.parse(minterCompiledRaw).hex || '');
    const walletHex: string = String(JSON.parse(walletCompiledRaw).hex || '');
    console.log('🔎 Bundled jetton codes:', { mlen: minterHex.length, wlen: walletHex.length, mprefix: minterHex.slice(0, 8), wprefix: walletHex.slice(0, 8) });
    const minterCode = Cell.fromBoc(Buffer.from(minterHex, 'hex'))[0];
    const walletCode = Cell.fromBoc(Buffer.from(walletHex, 'hex'))[0];
    return { minterCode, walletCode };
  } catch (e) {
    console.warn('Failed to parse bundled jetton codes, fallback to local constants', e);
    return {
      minterCode: Cell.fromBoc(Buffer.from(JETTON_MINTER_CODE_BOC, 'hex'))[0],
      walletCode: Cell.fromBoc(Buffer.from(JETTON_WALLET_CODE_BOC, 'hex'))[0],
    };
  }
}

 

/**
 * Build mint message payload for NFT
 */
export function buildMintPayload(toAddress: string, metadataUri: string): string {
  try {
    const to = Address.parse(toAddress);

    const contentCell = beginCell()
      .storeUint(0x01, 8) // TIP-64 off-chain content prefix
      .storeStringTail(metadataUri)
      .endCell();

    const messageBody = beginCell()
      .storeUint(0x1, 32) // op: mint (explicit 0x1)
      .storeAddress(to)
      .storeRef(contentCell)
      .endCell();

    return messageBody.toBoc().toString('base64');
  } catch (error) {
    console.error('❌ Error building mint payload:', error);
    throw new Error('Failed to build mint transaction');
  }
}

/**
 * Get full price for NFT minting
 */
export async function getFullPriceOnChain(_collection: string): Promise<bigint> {
  return toNano('0.05'); // NFT Mint fee usually low + gas
}

/**
 * Get the full price for minting from the smart contract (Legacy helper)
 */
async function getFullPriceOnChainLegacy(collection: string): Promise<bigint> {
  const toncenterUrl = NETWORK === 'testnet' 
    ? 'https://testnet.toncenter.com/api/v3'
    : 'https://toncenter.com/api/v3';

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
        return BigInt(raw.toString());
      }
    }
  } catch (e) {
    console.warn('Toncenter get_full_price failed');
  }
  return toNano('1.5');
}

/**
 * Send mint transaction via TON Connect (NFT)
 */
export async function sendMintTransaction(
  tonConnectUI: ReturnType<typeof useTonConnectUI>[0],
  toAddress: string,
  metadataUri: string
): Promise<SendTransactionResponse> {
  if (!COLLECTION_ADDRESS) throw new Error('Collection address not configured');
  const payload = buildMintPayload(toAddress, metadataUri);
  const amount = (await getFullPriceOnChainLegacy(COLLECTION_ADDRESS)).toString();

  const transaction = {
    validUntil: Math.floor(Date.now() / 1000) + 300,
    messages: [
      {
        address: COLLECTION_ADDRESS,
        amount: amount,
        payload: payload,
      },
    ],
  };

  return tonConnectUI.sendTransaction(transaction);
}

// ==========================================
// JETTON DEPLOYMENT LOGIC
// ==========================================

export interface JettonDeployParams {
    owner: string;
    name: string;
    symbol: string;
    image: string; // IPFS URL
    description?: string;
    totalSupply: string; // Number string, e.g. "1000000"
    totalPrice?: number; // Total price user agrees to pay (Service Fee included)
}

export async function deployJetton(
    tonConnectUI: ReturnType<typeof useTonConnectUI>[0],
    params: JettonDeployParams
): Promise<{ contractAddress: string, result: SendTransactionResponse }> {
    console.log('🚀 Preparing Jetton Deployment...', params);
    
    const ownerAddress = Address.parse(params.owner);
    const totalSupply = toNano(params.totalSupply); 
    const metadataUri = params.image; // JSON URI
    
    // 2. Load Code (prefer remote official bytes; fallback to local)
    const { minterCode, walletCode } = await loadJettonCodes();

    // 2. Build Initial Data
    const contentCell = beginCell()
        .storeUint(0x01, 8) // offchain marker
        .storeStringTail(metadataUri)
        .endCell();

    const minterData = beginCell()
        .storeCoins(0) // Initial supply (0)
        .storeAddress(ownerAddress) // Admin
        .storeRef(contentCell)
        .storeRef(walletCode)
        .endCell();

    // 3. Calculate Address
    const stateInit: StateInit = {
        code: minterCode,
        data: minterData
    };
    
    // Build StateInit Cell (proper TL-B serialization)
    const stateInitCell = beginCell()
        .store(storeStateInit(stateInit))
        .endCell();

    const contractAddr = getContractAddress(0, stateInit);
    const contractAddrStr = contractAddr.toString();
    console.log('📍 Calculated Jetton Master Address:', contractAddrStr);

    // 4. Build Deploy + Mint Payload
    const internalTransferBody = beginCell()
        .storeUint(0x178d4519, 32) // op: internal_transfer
        .storeUint(0, 64) // query_id
        .storeCoins(totalSupply) // Jetton Amount
        .storeAddress(ownerAddress) // from (admin)
        .storeAddress(ownerAddress) // response_address
        .storeCoins(0) // forward_ton_amount
        .storeBit(0) // forward_payload
        .endCell();

    const mintBody = beginCell()
        .storeUint(21, 32) // op: mint
        .storeUint(0, 64) // query_id
        .storeAddress(ownerAddress) // to_address
        .storeCoins(toNano('0.1')) // ton_amount
        .storeRef(internalTransferBody) // master_msg
        .endCell();

    // 5. Prepare Transaction Messages
    const deployAmount = 0.25; // 0.25 TON fixed for deploy cost
    const messages = [];

    // Message 1: Deploy Contract
    messages.push({
        address: contractAddrStr,
        amount: toNano(deployAmount.toString()).toString(),
        stateInit: stateInitCell.toBoc().toString('base64'),
        payload: mintBody.toBoc().toString('base64')
    });

    // Message 2: Service Fee (if any)
    // Calculate remaining fee: Total - DeployCost
    if (params.totalPrice && params.totalPrice > deployAmount) {
        const serviceFee = params.totalPrice - deployAmount;
        
        if (PLATFORM_WALLET) {
            console.log(`💰 Adding service fee message: ${serviceFee.toFixed(4)} TON to ${PLATFORM_WALLET}`);
            messages.push({
                address: PLATFORM_WALLET,
                amount: toNano(serviceFee.toFixed(4)).toString(),
            });
        } else {
            console.warn('⚠️ VITE_PLATFORM_WALLET not set! Skipping service fee collection.');
        }
    }

    // 6. Send Transaction
    const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: messages
    };

    try {
        const result = await tonConnectUI.sendTransaction(transaction);
        return {
            contractAddress: contractAddrStr,
            result
        };
    } catch (e) {
        console.error('Deploy failed:', e);
        throw e;
    }
}

export function getCollectionAddress(): string {
  return COLLECTION_ADDRESS || '';
}

export function getMintPriceNanoton(): string {
  return MINT_PRICE_NANOTON;
}

export function formatNanoTon(nanoton: string | number | bigint): string {
  const nano = typeof nanoton === 'string' ? BigInt(nanoton) : BigInt(nanoton);
  const ton = Number(nano) / 1_000_000_000;
  return ton.toFixed(2);
}

export function formatAddress(address: string): string {
  if (!address) return '';
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getTonViewerUrl(address: string, testnet: boolean = NETWORK === 'testnet'): string {
  const base = testnet ? 'https://testnet.tonviewer.com' : 'https://tonviewer.com';
  return `${base}/${address}`;
}

export function registerDebugHelpers(tonConnectUI: any, userAddress: string | null) {
    // Simplified stub
    (window as any).tonDebug = { tonConnectUI, userAddress };
}
