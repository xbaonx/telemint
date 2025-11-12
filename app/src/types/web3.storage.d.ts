declare module 'web3.storage' {
  export class Web3Storage {
    constructor(config: { token: string });
    put(files: File[] | Blob[], options?: any): Promise<string>;
  }
}
