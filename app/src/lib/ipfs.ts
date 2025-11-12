/**
 * IPFS Upload using web3.storage
 */

import { Web3Storage } from 'web3.storage';

const WEB3STORAGE_TOKEN = import.meta.env.VITE_WEB3STORAGE_TOKEN;

if (!WEB3STORAGE_TOKEN) {
  console.warn('⚠️ VITE_WEB3STORAGE_TOKEN not set in .env');
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
function getClient(): Web3Storage {
  if (!WEB3STORAGE_TOKEN) {
    throw new Error('Web3.Storage token not configured');
  }
  return new Web3Storage({ token: WEB3STORAGE_TOKEN });
}

/**
 * Upload file to IPFS
 */
async function uploadFile(file: File): Promise<string> {
  const client = getClient();
  const cid = await client.put([file], {
    wrapWithDirectory: false,
    name: file.name,
  });
  return cid;
}

/**
 * Create and upload metadata JSON
 */
async function uploadMetadata(metadata: NFTMetadata): Promise<string> {
  const client = getClient();
  const metadataJson = JSON.stringify(metadata, null, 2);
  const metadataFile = new File([metadataJson], 'metadata.json', {
    type: 'application/json',
  });

  const cid = await client.put([metadataFile], {
    wrapWithDirectory: false,
    name: 'metadata.json',
  });

  return cid;
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
  } catch (error) {
    console.error('❌ IPFS upload failed:', error);
    throw new Error('Failed to upload to IPFS. Please check your web3.storage token.');
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
