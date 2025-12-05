import { PinataSDK } from "pinata-web3";

// Initialize Pinata SDK
// We rely on VITE_PINATA_JWT being set in .env
const pinata = new PinataSDK({
  pinataJwt: import.meta.env.VITE_PINATA_JWT,
  pinataGateway: "gateway.pinata.cloud",
});

/**
 * NFT Metadata structure
 */
export interface NFTMetadata {
  name: string;
  description?: string;
  image: string; // ipfs://CID
  symbol?: string;
  decimals?: string | number;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
}

/**
 * Upload result
 */
export interface UploadResult {
  imageUri: string;
  metadataUri: string;
  imageCid: string;
  metadataCid: string;
}

/**
 * Upload file to IPFS via Pinata
 */
async function uploadFileToPinata(file: File): Promise<string> {
  try {
    const upload = await pinata.upload.file(file);
    return upload.IpfsHash;
  } catch (error) {
    console.error('Error uploading file to Pinata:', error);
    throw error;
  }
}

/**
 * Upload JSON to IPFS via Pinata
 */
async function uploadJsonToPinata(json: any): Promise<string> {
  try {
    const upload = await pinata.upload.json(json);
    return upload.IpfsHash;
  } catch (error) {
    console.error('Error uploading JSON to Pinata:', error);
    throw error;
  }
}

/**
 * Main Upload Function
 */
export async function uploadToIPFS(
  file: File,
  name: string,
  description?: string,
  symbol?: string,
  decimals: string | number = 9
): Promise<UploadResult> {
  try {
    console.log('🧪 Pinata IPFS flow start');
    
    // 1. Upload image
    console.log('📤 Uploading image to Pinata...');
    const imageCid = await uploadFileToPinata(file);
    const imageUri = `ipfs://${imageCid}`;
    console.log('✅ Image uploaded:', imageUri);

    // 2. Create metadata
    // Standard TEP-64: image should be ipfs://<cid>
    const metadata: NFTMetadata = {
      name,
      description: description || '',
      image: imageUri,
      ...(symbol ? { symbol } : {}),
      ...(decimals !== undefined ? { decimals } : {}),
    };

    // 3. Upload metadata
    console.log('📤 Uploading metadata to Pinata...');
    const metadataCid = await uploadJsonToPinata(metadata);
    const metadataUri = `ipfs://${metadataCid}`;
    console.log('✅ Metadata uploaded:', metadataUri);

    return {
      metadataUri,
      imageUri,
      imageCid,
      metadataCid,
    };
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    throw error;
  }
}

/**
 * Helper to get Gateway URL for display
 */
export function getIPFSGatewayUrl(ipfsUri: string): string {
  if (!ipfsUri) return '';
  if (!ipfsUri.startsWith('ipfs://')) {
    return ipfsUri;
  }
  const cid = ipfsUri.replace('ipfs://', '');
  // Use Pinata Gateway for display
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Please upload JPG, PNG, GIF, or WebP.',
    };
  }
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File too large. Maximum size is 10MB.',
    };
  }
  return { valid: true };
}
