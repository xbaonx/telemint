/**
 * IPFS Upload using web3.storage
 */

import { Web3Storage } from 'web3.storage';
import { NFTStorage } from 'nft.storage';

const WEB3STORAGE_TOKEN = import.meta.env.VITE_WEB3STORAGE_TOKEN;
const IPFS_PROVIDER = (import.meta.env.VITE_IPFS_PROVIDER || 'web3') as 'web3' | 'nft' | 'pinata';
const NFT_STORAGE_TOKEN = import.meta.env.VITE_NFT_STORAGE_TOKEN as string | undefined;
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT as string | undefined;

if (IPFS_PROVIDER === 'web3' && !WEB3STORAGE_TOKEN) {
  console.warn('⚠️ VITE_WEB3STORAGE_TOKEN not set in .env');
}
if (IPFS_PROVIDER === 'nft' && !NFT_STORAGE_TOKEN) {
  console.warn('⚠️ VITE_NFT_STORAGE_TOKEN not set in .env');
}
if (IPFS_PROVIDER === 'pinata' && !PINATA_JWT) {
  console.warn('⚠️ VITE_PINATA_JWT not set in .env');
}

// Debug provider selection (do not print secrets)
try {
  console.log('🧩 IPFS provider selected:', IPFS_PROVIDER, {
    web3Token: !!WEB3STORAGE_TOKEN,
    nftToken: !!NFT_STORAGE_TOKEN,
    pinataJwt: !!PINATA_JWT,
  });
} catch {}

/**
 * NFT Metadata structure
 */
export interface NFTMetadata {
  name: string;
  description?: string;
  image: string; // ipfs:// URI
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

/**
 * Upload result
 */
export interface UploadResult {
  imageUri: string; // ipfs://...
  metadataUri: string; // ipfs://...
  imageCid: string;
  metadataCid: string;
}

/**
 * Get Web3Storage client
 */
function getWeb3Client(): Web3Storage {
  if (!WEB3STORAGE_TOKEN) {
    throw new Error('Web3.Storage token not configured');
  }
  return new Web3Storage({ token: WEB3STORAGE_TOKEN });
}

function getNftClient(): NFTStorage {
  if (!NFT_STORAGE_TOKEN) {
    throw new Error('NFT.Storage token not configured');
  }
  return new NFTStorage({ token: NFT_STORAGE_TOKEN });
}

/**
 * Upload file to IPFS
 */
async function uploadFile(file: File): Promise<string> {
  const t0 = performance.now?.() ?? Date.now();
  console.log('⬆️  IPFS uploadFile start', {
    provider: IPFS_PROVIDER,
    name: file.name,
    size: file.size,
    type: file.type,
  });
  if (IPFS_PROVIDER === 'nft') {
    const client = getNftClient();
    const cid = await client.storeBlob(file);
    const t1 = performance.now?.() ?? Date.now();
    console.log('✅ IPFS uploadFile (nft.storage) done', { cid, ms: Math.round(t1 - t0) });
    return cid;
  } else if (IPFS_PROVIDER === 'pinata') {
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT not configured');
    }
    const form = new FormData();
    form.append('file', file, file.name);

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: form,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Pinata upload failed: ${res.status} ${txt}`);
    }
    const json = await res.json();
    const cid = json?.IpfsHash as string;
    if (!cid) throw new Error('Pinata response missing IpfsHash');
    const t1 = performance.now?.() ?? Date.now();
    console.log('✅ IPFS uploadFile (pinata) done', { cid, ms: Math.round(t1 - t0) });
    return cid;
  } else {
    const client = getWeb3Client();
    const cid = await client.put([file], {
      wrapWithDirectory: false,
      name: file.name,
    });
    const t1 = performance.now?.() ?? Date.now();
    console.log('✅ IPFS uploadFile (web3.storage) done', { cid, ms: Math.round(t1 - t0) });
    return cid;
  }
}

/**
 * Create and upload metadata JSON
 */
async function uploadMetadata(metadata: NFTMetadata): Promise<string> {
  const metadataJson = JSON.stringify(metadata, null, 2);
  const metadataFile = new File([metadataJson], 'metadata.json', {
    type: 'application/json',
  });
  const t0 = performance.now?.() ?? Date.now();
  console.log('⬆️  IPFS uploadMetadata start', {
    provider: IPFS_PROVIDER,
    bytes: metadataJson.length,
  });
  if (IPFS_PROVIDER === 'nft') {
    const client = getNftClient();
    const cid = await client.storeBlob(new Blob([metadataJson], { type: 'application/json' }));
    const t1 = performance.now?.() ?? Date.now();
    console.log('✅ IPFS uploadMetadata (nft.storage) done', { cid, ms: Math.round(t1 - t0) });
    return cid;
  } else if (IPFS_PROVIDER === 'pinata') {
    if (!PINATA_JWT) {
      throw new Error('Pinata JWT not configured');
    }
    const res = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: metadataJson,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Pinata metadata upload failed: ${res.status} ${txt}`);
    }
    const json = await res.json();
    const cid = json?.IpfsHash as string;
    if (!cid) throw new Error('Pinata response missing IpfsHash');
    const t1 = performance.now?.() ?? Date.now();
    console.log('✅ IPFS uploadMetadata (pinata) done', { cid, ms: Math.round(t1 - t0) });
    return cid;
  } else {
    const client = getWeb3Client();
    const cid = await client.put([metadataFile], {
      wrapWithDirectory: false,
      name: 'metadata.json',
    });
    const t1 = performance.now?.() ?? Date.now();
    console.log('✅ IPFS uploadMetadata (web3.storage) done', { cid, ms: Math.round(t1 - t0) });
    return cid;
  }
}

/**
 * Upload image and metadata to IPFS
 * Returns both IPFS URIs
 */
export async function uploadToIPFS(
  file: File,
  name: string,
  description?: string
): Promise<UploadResult> {
  try {
    const tAll0 = performance.now?.() ?? Date.now();
    console.log('🧪 IPFS flow start');
    // 1. Upload image
    console.log('📤 Uploading image to IPFS...');
    const imageCid = await uploadFile(file);
    const imageUri = `ipfs://${imageCid}`;
    console.log('✅ Image uploaded:', imageUri);

    // 2. Create metadata
    // Use Cloudflare IPFS Gateway for image to ensure best compatibility and speed
    // https://cloudflare-ipfs.com/ipfs/
    let imageUrlForMetadata = imageUri;
    if (IPFS_PROVIDER === 'pinata' || IPFS_PROVIDER === 'web3') {
      imageUrlForMetadata = `https://cloudflare-ipfs.com/ipfs/${imageCid}`;
    } else if (IPFS_PROVIDER === 'nft') {
      imageUrlForMetadata = `https://${imageCid}.ipfs.nftstorage.link/`;
    }

    const metadata: NFTMetadata = {
      name,
      description: description || '',
      image: imageUrlForMetadata,
    };

    // 3. Upload metadata
    console.log('📤 Uploading metadata to IPFS...');
    const metadataCid = await uploadMetadata(metadata);
    const metadataUri = `ipfs://${metadataCid}`;
    console.log('✅ Metadata uploaded:', metadataUri);

    const tAll1 = performance.now?.() ?? Date.now();
    console.log('🏁 IPFS flow done', { ms: Math.round(tAll1 - tAll0) });

    return {
      imageUri,
      metadataUri,
      imageCid,
      metadataCid,
    };
  } catch (error: any) {
    console.error('❌ IPFS upload failed:', error);
    const msg = typeof error?.message === 'string' ? error.message : '';
    if (msg.includes('503') || msg.toLowerCase().includes('maintenance')) {
      throw new Error('Failed to upload to IPFS (service unavailable). Please try again later.');
    }
    throw new Error('Failed to upload to IPFS. Please check your token and network.');
  }
}

/**
 * Get IPFS gateway URL for viewing
 */
export function getIPFSGatewayUrl(ipfsUri: string): string {
  if (!ipfsUri.startsWith('ipfs://')) {
    return ipfsUri;
  }

  const cid = ipfsUri.replace('ipfs://', '');
  return `https://${cid}.ipfs.w3s.link`;
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPG, PNG, GIF, or WebP.',
    };
  }

  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 5MB.',
    };
  }

  return { valid: true };
}
