import { PinataSDK } from "pinata-web3";

const pinata = new PinataSDK({
  pinataJwt: import.meta.env.VITE_PINATA_JWT,
  pinataGateway: "gateway.pinata.cloud",
});

export interface NFTMetadata {
  name: string;
  description?: string;
  image: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

export interface UploadResult {
  imageUri: string;
  metadataUri: string;
  imageCid: string;
  metadataCid: string;
}

async function uploadFileToPinata(file: File): Promise<string> {
  try {
    const upload = await pinata.upload.file(file);
    return upload.IpfsHash;
  } catch (error) {
    console.error('Error uploading file to Pinata:', error);
    throw error;
  }
}

async function uploadJsonToPinata(json: any): Promise<string> {
  try {
    const upload = await pinata.upload.json(json);
    return upload.IpfsHash;
  } catch (error) {
    console.error('Error uploading JSON to Pinata:', error);
    throw error;
  }
}

export async function uploadToIPFS(
  file: File,
  name: string,
  description?: string
): Promise<UploadResult> {
  try {
    console.log('🧪 Pinata IPFS flow start');
    console.log('📤 Uploading image to Pinata...');
    const imageCid = await uploadFileToPinata(file);
    const imageUri = `ipfs://${imageCid}`;
    console.log('✅ Image uploaded:', imageUri);

    const metadata: NFTMetadata = {
      name,
      description: description || '',
      image: `https://gateway.pinata.cloud/ipfs/${imageCid}`, // Use HTTP URL for better compatibility
    };

    console.log('📤 Uploading metadata to Pinata...');
    const metadataCid = await uploadJsonToPinata(metadata);
    const metadataUri = `ipfs://${metadataCid}`;
    console.log('✅ Metadata uploaded:', metadataUri);

    return { metadataUri, imageUri, imageCid, metadataCid };
  } catch (error) {
    console.error('Error uploading to Pinata:', error);
    throw error;
  }
}

export function getIPFSGatewayUrl(ipfsUri: string): string {
  if (!ipfsUri) return '';
  if (!ipfsUri.startsWith('ipfs://')) return ipfsUri;
  const cid = ipfsUri.replace('ipfs://', '');
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) return { valid: false, error: 'Invalid file type.' };
  if (file.size > 10 * 1024 * 1024) return { valid: false, error: 'File too large (max 10MB).' };
  return { valid: true };
}
