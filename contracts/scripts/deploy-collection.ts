#!/usr/bin/env tsx

import { Address, toNano, beginCell, Cell } from '@ton/core';
import { Buffer } from 'buffer';
import { internal } from '@ton/ton';
import { program } from 'commander';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
    getWallet,
    getTonClient,
    waitForDeploy,
    displayWalletInfo,
    saveDeployment,
    formatTon,
} from './utils';

dotenv.config();

/**
 * Deploy NftCollection contract
 */
async function deploy(fee: string, testnet: boolean) {
    console.log(chalk.blue('🚀 Deploying NftCollection...\n'));

    // Load mnemonic from env
    const mnemonic = process.env.DEPLOYER_MNEMONIC;
    if (!mnemonic) {
        throw new Error('DEPLOYER_MNEMONIC not found in .env');
    }

    // Get wallet
    const { contract: wallet, address: walletAddress, keyPair } = await getWallet(mnemonic, testnet);
    const client = await getTonClient(testnet);

    await displayWalletInfo({ address: walletAddress }, client);
    const walletState = await client.getContractState(walletAddress);
    console.log(chalk.gray(`   Wallet state: ${walletState.state}`));

    // Load build artifacts
    console.log(chalk.cyan('\n📦 Loading build artifacts...'));
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // Polyfill Cell.fromHex if missing (generated code may call it)
    if (!(Cell as any).fromHex) {
        (Cell as any).fromHex = (hex: string) => Cell.fromBoc(Buffer.from(hex, 'hex'))[0];
    }

    // Load NftItem code cell from .code.boc
    const itemCodeBocPath = path.resolve(__dirname, '../build/NftCollection_NftItem.code.boc');
    if (!fs.existsSync(itemCodeBocPath)) {
        throw new Error(`Build artifact not found: ${itemCodeBocPath}`);
    }
    const itemCodeBoc = fs.readFileSync(itemCodeBocPath);
    const itemCode = Cell.fromBoc(itemCodeBoc)[0];
    console.log(chalk.gray(`   NftItem code loaded`));
    // Load NftCollection factory from generated TS
    const NftCollectionModule = await import('../build/NftCollection_NftCollection.ts');

    // Parse mint fee
    const mintFee = toNano(fee);
    console.log(chalk.gray(`   Mint Fee: ${formatTon(mintFee)} TON`));

    // Create collection contract instance
    const collection = await NftCollectionModule.NftCollection.fromInit(
        walletAddress,
        itemCode,
        mintFee
    );

    const collectionAddress = collection.address;
    console.log(chalk.green(`\n📍 Collection Address: ${collectionAddress.toString()}`));
    console.log(chalk.gray(`   Network: ${testnet ? 'Testnet' : 'Mainnet'}`));

    // Check if already deployed
    const state = await client.getContractState(collectionAddress);
    if (state.state === 'active') {
        console.log(chalk.yellow('\n⚠️  Contract already deployed!'));
        return;
    }

    // Prepare deployment
    console.log(chalk.cyan('\n📤 Sending deployment transaction...'));

    let seqno = 0;
    try {
        seqno = walletState.state === 'active' ? await wallet.getSeqno() : 0;
    } catch {
        seqno = 0; // likely uninitialized wallet
    }
    console.log(chalk.gray(`   Using seqno=${seqno}`));
    
    await wallet.sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [
            internal({
                to: collectionAddress,
                value: toNano('0.5'), // Deploy with 0.5 TON
                init: collection.init,
                body: beginCell().endCell(), // Empty body for deployment
            }),
        ],
    });

    // Wait for deployment
    await waitForDeploy(client, collectionAddress, 90000);

    // Verify deployment
    console.log(chalk.cyan('\n🔍 Verifying deployment...'));
    const collectionData = await client.runMethod(collectionAddress, 'get_collection_data');
    const nextIndex = collectionData.stack.readNumber();
    const deployedFee = await client.runMethod(collectionAddress, 'get_mint_fee');
    const currentFee = deployedFee.stack.readBigNumber();

    console.log(chalk.green('\n✅ Deployment successful!'));
    console.log(chalk.gray(`   Next NFT Index: ${nextIndex}`));
    console.log(chalk.gray(`   Mint Fee: ${formatTon(currentFee)} TON`));

    // Save deployment info
    const deploymentInfo = {
        network: testnet ? 'testnet' : 'mainnet',
        collectionAddress: collectionAddress.toString(),
        ownerAddress: walletAddress.toString(),
        mintFee: mintFee.toString(),
        deployedAt: new Date().toISOString(),
    };

    saveDeployment('NftCollection', deploymentInfo);

    // Display next steps
    console.log(chalk.yellow('\n📝 Next Steps:'));
    console.log(chalk.yellow(`   1. Copy collection address: ${collectionAddress.toString()}`));
    console.log(chalk.yellow(`   2. Add to app/.env: VITE_TON_COLLECTION_ADDRESS=${collectionAddress.toString()}`));
    console.log(chalk.yellow(`   3. Fund the collection for operations (optional)`));
    console.log(chalk.yellow(`   4. Test minting from the web app`));

    console.log(chalk.blue('\n🔗 Explorer Links:'));
    const explorerUrl = testnet
        ? `https://testnet.tonviewer.com/${collectionAddress.toString()}`
        : `https://tonviewer.com/${collectionAddress.toString()}`;
    console.log(chalk.blue(`   ${explorerUrl}`));
}

// CLI
program
    .name('deploy-collection')
    .description('Deploy NftCollection contract to TON blockchain')
    .option('--fee <amount>', 'Initial mint fee in TON', '1')
    .option('--mainnet', 'Deploy to mainnet (default: testnet)', false)
    .action(async (options) => {
        try {
            await deploy(options.fee, !options.mainnet);
        } catch (error) {
            console.error(chalk.red('\n❌ Deployment failed:'), error);
            process.exit(1);
        }
    });

program.parse();
