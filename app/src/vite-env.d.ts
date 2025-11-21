/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_TG_BOT_USERNAME: string;
  readonly VITE_TON_COLLECTION_ADDRESS: string;
  readonly VITE_MINT_PRICE_NANOTON: string;
  readonly VITE_WEB3STORAGE_TOKEN: string;
  readonly VITE_IPFS_PROVIDER?: 'web3' | 'nft' | 'pinata';
  readonly VITE_NFT_STORAGE_TOKEN?: string;
  readonly VITE_PINATA_JWT?: string;
  readonly VITE_NETWORK: 'testnet' | 'mainnet';
  readonly VITE_TONCENTER_API_KEY: string;
  readonly VITE_API_WALLET_ADDRESS?: string;
  readonly VITE_API_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
