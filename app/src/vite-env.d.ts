/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_TG_BOT_USERNAME: string;
  readonly VITE_TON_COLLECTION_ADDRESS: string;
  readonly VITE_MINT_PRICE_NANOTON: string;
  readonly VITE_WEB3STORAGE_TOKEN: string;
  readonly VITE_NETWORK: 'testnet' | 'mainnet';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
