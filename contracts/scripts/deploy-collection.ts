#!/usr/bin/env tsx

import { Address, toNano, beginCell, Cell } from '@ton/core';
import { program } from 'commander';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
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
    const client = getTonClient(testnet);

    await displayWalletInfo({ address: walletAddress }, client);

    // Load build artifacts
    console.log(chalk.cyan('\n📦 Loading build artifacts...'));
    const NftCollectionModule = await import('../build/NftCollection.ts');
    const NftItemModule = await import('../build/NftItem.ts');

    // Parse mint fee
    const mintFee = toNano(fee);
    console.log(chalk.gray(`   Mint Fee: ${formatTon(mintFee)} TON`));

    // Get NftItem code cell
    const itemCode = Cell.fromBase64(NftItemModule.NftItem.code);
    console.log(chalk.gray(`   NftItem code loaded`));

    // Create collection contract instance
    const collection = NftCollectionModule.NftCollection.fromInit(
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

    const seqno = await wallet.getSeqno();
    
    await wallet.sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [
            {
                to: collectionAddress,
                value: toNano('0.5'), // Deploy with 0.5 TON
                init: collection.init,
                body: beginCell().endCell(), // Empty body for deployment
            },
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
