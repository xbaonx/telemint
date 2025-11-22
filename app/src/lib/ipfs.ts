import { uploadFileToFirebase, uploadMetadataToFirebase } from './firebase';

export interface NFTMetadata {
  name: string;
  description?: string;
  image: string;
  attributes?: Array<{ trait_type: string; value: string | number }>;
}

export interface UploadResult {
  imageUri: string;
  metadataUri: string;
  imageCid?: string;
  metadataCid?: string;
}

export async function uploadToIPFS(
  file: File,
  name: string,
  description?: string
): Promise<UploadResult> {
  try {
    console.log('🧪 Firebase Storage flow start');
    const imageUri = await uploadFileToFirebase(file);
    const metadata: NFTMetadata = { name, description: description || '', image: imageUri };
    const metadataUri = await uploadMetadataToFirebase(metadata);
    return { metadataUri, imageUri, imageCid: '', metadataCid: '' };
  } catch (error) {
    console.error('Error uploading to Firebase:', error);
    throw error;
  }
}

export function getIPFSGatewayUrl(ipfsUri: string): string {
  if (!ipfsUri.startsWith('ipfs://')) return ipfsUri;
  const cid = ipfsUri.replace('ipfs://', '');
  return `https://${cid}.ipfs.w3s.link`;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) return { valid: false, error: 'Invalid file type.' };
  if (file.size > 10 * 1024 * 1024) return { valid: false, error: 'File too large (max 10MB).' };
  return { valid: true };
}
