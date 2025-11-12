import { TonClient, Address, WalletContractV4, internal, fromNano, toNano } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

/**
 * Get TON client for testnet or mainnet
 */
export function getTonClient(testnet: boolean = true): TonClient {
    const endpoint = testnet
        ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
        : 'https://toncenter.com/api/v2/jsonRPC';
    
    return new TonClient({
        endpoint,
        apiKey: process.env.TONCENTER_API_KEY,
    });
}

/**
 * Get wallet from mnemonic
 */
export async function getWallet(mnemonic: string, testnet: boolean = true) {
    const client = getTonClient(testnet);
    const keyPair = await mnemonicToPrivateKey(mnemonic.split(' '));
    const workchain = 0;
    const wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
    const contract = client.open(wallet);

    return {
        wallet,
        contract,
        keyPair,
        address: wallet.address,
    };
}

/**
 * Wait for transaction to be confirmed
 */
export async function waitForTransaction(
    client: TonClient,
    address: Address,
    initialSeqno: number,
    timeout: number = 60000
): Promise<void> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
        await sleep(1500);
        
        try {
            const state = await client.getContractState(address);
            if (!state.lastTransaction) continue;
            
            const seqno = await client.runMethod(address, 'seqno');
            const currentSeqno = seqno.stack.readNumber();
            
            if (currentSeqno > initialSeqno) {
                console.log('✅ Transaction confirmed!');
                return;
            }
        } catch (e) {
            // Contract might not be deployed yet
            continue;
        }
    }
    
    throw new Error('Transaction timeout');
}

/**
 * Wait for contract deployment
 */
export async function waitForDeploy(
    client: TonClient,
    address: Address,
    timeout: number = 60000
): Promise<void> {
    console.log(`⏳ Waiting for contract deployment at ${address.toString()}...`);
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
        await sleep(2000);
        
        const state = await client.getContractState(address);
        if (state.state === 'active') {
            console.log('✅ Contract deployed and active!');
            return;
        }
    }
    
    throw new Error('Deployment timeout');
}

/**
 * Sleep helper
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format TON amount
 */
export function formatTon(nanoton: bigint | string): string {
    return fromNano(nanoton);
}

/**
 * Parse TON amount
 */
export function parseTon(ton: string): bigint {
    return toNano(ton);
}

/**
 * Load build artifacts
 */
export function loadBuildArtifact(contractName: string): any {
    const buildPath = path.resolve(__dirname, '../build', `${contractName}.ts`);
    
    if (!fs.existsSync(buildPath)) {
        throw new Error(`Build artifact not found: ${buildPath}. Run build first.`);
    }
    
    // Use dynamic import for ES modules
    return import(buildPath);
}

/**
 * Save deployment info
 */
export function saveDeployment(contractName: string, data: any): void {
    const outputDir = path.resolve(__dirname, '../output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, `${contractName}-deployment.json`);
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`💾 Deployment info saved to ${outputPath}`);
}

/**
 * Load deployment info
 */
export function loadDeployment(contractName: string): any {
    const outputPath = path.resolve(__dirname, '../output', `${contractName}-deployment.json`);
    
    if (!fs.existsSync(outputPath)) {
        throw new Error(`Deployment not found: ${outputPath}`);
    }
    
    return JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
}

/**
 * Display wallet info
 */
export async function displayWalletInfo(wallet: any, client: TonClient): Promise<void> {
    console.log('\n📱 Wallet Info:');
    console.log(`   Address: ${wallet.address.toString()}`);
    
    try {
        const balance = await client.getBalance(wallet.address);
        console.log(`   Balance: ${formatTon(balance)} TON`);
    } catch (e) {
        console.log(`   Balance: Unable to fetch`);
    }
}
