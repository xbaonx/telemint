/**
 * IPFS Upload using web3.storage
 */

import { Web3Storage } from 'web3.storage';
import { NFTStorage } from 'nft.storage';

const WEB3STORAGE_TOKEN = import.meta.env.VITE_WEB3STORAGE_TOKEN;
const IPFS_PROVIDER = (import.meta.env.VITE_IPFS_PROVIDER || 'web3') as 'web3' | 'nft';
const NFT_STORAGE_TOKEN = import.meta.env.VITE_NFT_STORAGE_TOKEN as string | undefined;

if (IPFS_PROVIDER === 'web3' && !WEB3STORAGE_TOKEN) {
  console.warn('⚠️ VITE_WEB3STORAGE_TOKEN not set in .env');
}
if (IPFS_PROVIDER === 'nft' && !NFT_STORAGE_TOKEN) {
  console.warn('⚠️ VITE_NFT_STORAGE_TOKEN not set in .env');
}

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
  if (IPFS_PROVIDER === 'nft') {
    const client = getNftClient();
    const cid = await client.storeBlob(file);
    return cid;
  } else {
    const client = getWeb3Client();
    const cid = await client.put([file], {
      wrapWithDirectory: false,
      name: file.name,
    });
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
  if (IPFS_PROVIDER === 'nft') {
    const client = getNftClient();
    const cid = await client.storeBlob(new Blob([metadataJson], { type: 'application/json' }));
    return cid;
  } else {
    const client = getWeb3Client();
    const cid = await client.put([metadataFile], {
      wrapWithDirectory: false,
      name: 'metadata.json',
    });
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
    // 1. Upload image
    console.log('📤 Uploading image to IPFS...');
    const imageCid = await uploadFile(file);
    const imageUri = `ipfs://${imageCid}`;
    console.log('✅ Image uploaded:', imageUri);

    // 2. Create metadata
    const metadata: NFTMetadata = {
      name,
      description: description || '',
      image: imageUri,
    };

    // 3. Upload metadata
    console.log('📤 Uploading metadata to IPFS...');
    const metadataCid = await uploadMetadata(metadata);
    const metadataUri = `ipfs://${metadataCid}`;
    console.log('✅ Metadata uploaded:', metadataUri);

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
