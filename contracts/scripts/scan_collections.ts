import { getWallet, getTonClient, formatTon } from './utils';
import { Address, Cell } from '@ton/core';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const SLEEP_MS = 1000; // 1s delay between requests to avoid rate limit

async function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const mnemonic = process.env.MNEMONIC || process.env.WALLET_MNEMONIC || process.env.DEPLOYER_MNEMONIC;
    if (!mnemonic) throw new Error('MNEMONIC not set in .env');

    const { address: walletAddress } = await getWallet(mnemonic, false);
    const client = await getTonClient(false);

    console.log(chalk.blue('🔍 Scanning transactions for wallet:'), walletAddress.toString());

    // 1. Get Transactions (Limit 100 latest)
    // Note: For a full scan, we would need pagination, but 100 is usually enough for recent deployments.
    const transactions = await client.getTransactions(walletAddress, { limit: 100 });

    console.log(chalk.gray(`   Found ${transactions.length} transactions. Analyzing...`));

    const possibleCollections = new Set<string>();

    for (const tx of transactions) {
        // Check outgoing messages
        if (tx.outMessages) {
            for (let msg of tx.outMessages.values()) {
                if (msg.info.type === 'internal' && msg.info.dest) {
                    // Logic: We sent money/message TO this address.
                    possibleCollections.add(msg.info.dest.toString());
                }
            }
        }
    }

    console.log(chalk.blue(`\n🔎 Found ${possibleCollections.size} unique interaction addresses.`));
    console.log(chalk.gray('   Checking which ones are active NftCollections...'));

    const confirmedCollections: string[] = [];

    let i = 0;
    for (const addrStr of possibleCollections) {
        i++;
        process.stdout.write(`   [${i}/${possibleCollections.size}] Checking ${addrStr.slice(0, 15)}... `);
        
        try {
            const addr = Address.parse(addrStr);
            
            // Avoid checking the wallet itself
            if (addr.equals(walletAddress)) {
                console.log(chalk.gray('Skipped (Self)'));
                continue;
            }

            // Check contract state
            const state = await client.getContractState(addr);
            if (state.state !== 'active') {
                console.log(chalk.gray('Inactive/Uninitialized'));
                await sleep(200);
                continue;
            }

            // Try to run 'get_collection_data'
            try {
                const res = await client.runMethod(addr, 'get_collection_data');
                // If successful, it's likely a collection
                console.log(chalk.green('✅ FOUND COLLECTION!'));
                
                const balance = await client.getBalance(addr);
                console.log(chalk.green(`      Balance: ${formatTon(balance)} TON`));
                
                confirmedCollections.push(addrStr);
            } catch (e) {
                // Method not found -> Not a collection
                console.log(chalk.gray('Not a collection'));
            }

            await sleep(500); // Respect rate limits
        } catch (e) {
            console.log(chalk.red('Error checking'));
        }
    }

    console.log(chalk.bold.green(`\n🎉 Scan Complete!`));
    console.log(chalk.bold(`   Found ${confirmedCollections.length} Collections:`));
    
    confirmedCollections.forEach(c => console.log(`   - ${c}`));

    console.log(chalk.yellow('\n💡 Tip: Compare this list with withdraw_all.ts to ensure you missed nothing.'));
}

main();
