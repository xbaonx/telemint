import { TonClient, Address, WalletContractV4, WalletContractV5R1, internal, fromNano, toNano } from '@ton/ton';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import { mnemonicToPrivateKey } from '@ton/crypto';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get TON client for testnet or mainnet
 */
export async function getTonClient(testnet: boolean = true): Promise<TonClient> {
    const network = testnet ? 'testnet' : 'mainnet';
    let discovered = '';
    
    try {
        discovered = await getHttpEndpoint({ network });
    } catch (e) {
        console.warn('⚠️ Failed to get endpoint from ton-access, using fallback.');
        discovered = testnet 
            ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
            : 'https://toncenter.com/api/v2/jsonRPC';
    }

    const apiKey = process.env.TONCENTER_API_KEY;

    // If endpoint is toncenter and apiKey is provided, append as query param
    let endpoint = discovered;
    try {
        const u = new URL(discovered);
        if (u.hostname.includes('toncenter.com') && apiKey) {
            u.searchParams.set('api_key', apiKey);
            endpoint = u.toString();
        }
    } catch {}

    console.log(`🔌 RPC Endpoint: ${endpoint.replace(/api_key=[^&]*/,'api_key=***')}`);
    console.log(`🔑 TONCENTER_API_KEY present: ${apiKey ? 'yes' : 'no'}`);

    return new TonClient({ endpoint });
}

/**
 * Get wallet from mnemonic
 */
export async function getWallet(mnemonic: string, testnet: boolean = true) {
    const client = await getTonClient(testnet);
    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 24) {
        throw new Error(`DEPLOYER_MNEMONIC must have 24 words, got ${words.length}`);
    }
    const keyPair = await mnemonicToPrivateKey(words);
    const workchain = 0;

    // Build candidates
    const candidates: { label: string; wallet: any }[] = [
        { label: 'V5R1', wallet: WalletContractV5R1.create({ workchain, publicKey: keyPair.publicKey }) },
        { label: 'V4R2 (default walletId)', wallet: WalletContractV4.create({ workchain, publicKey: keyPair.publicKey }) },
        { label: 'V4R2 (walletId=0)', wallet: WalletContractV4.create({ workchain, publicKey: keyPair.publicKey, walletId: 0 }) },
    ];

    console.log('🔎 Derived addresses from mnemonic:');
    for (const c of candidates) {
        console.log(`   ${c.label} (bounceable):     ${c.wallet.address.toString({ bounceable: true })}`);
        console.log(`   ${c.label} (non-bounceable): ${c.wallet.address.toString({ bounceable: false })}`);
    }

    // Probe balances and pick the best
    const balances: { idx: number; bal: bigint }[] = [];
    for (let i = 0; i < candidates.length; i++) {
        try {
            const bal = await client.getBalance(candidates[i].wallet.address);
            balances.push({ idx: i, bal });
        } catch {
            balances.push({ idx: i, bal: 0n });
        }
    }

    for (const b of balances) {
        console.log(`   ${candidates[b.idx].label} balance: ${formatTon(b.bal)} TON`);
    }

    let chosenIdx = balances.reduce((best, cur) => (cur.bal > balances[best].bal ? cur.idx : best), 0 as number);
    const chosen = candidates[chosenIdx];
    if (balances[chosenIdx].bal === 0n) {
        console.log('⚠️  All variants show 0 TON. Defaulting to V5R1.');
        chosenIdx = 0;
    }

    console.log(`👉 Using ${candidates[chosenIdx].label}`);
    const wallet = candidates[chosenIdx].wallet;

    const contract = client.open(wallet as any);

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
    console.log(`   Address: ${wallet.address.toString({ bounceable: true })}`);
    console.log(`   Non-bounceable: ${wallet.address.toString({ bounceable: false })}`);
    
    try {
        const balance = await client.getBalance(wallet.address);
        console.log(`   Balance: ${formatTon(balance)} TON`);
    } catch (e) {
        console.log(`   Balance: Unable to fetch`);
    }
}
