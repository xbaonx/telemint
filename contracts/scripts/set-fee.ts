#!/usr/bin/env tsx

import { Address, toNano, beginCell } from '@ton/core';
import { WalletContractV4, internal } from '@ton/ton';
import { program } from 'commander';
import chalk from 'chalk';
import * as dotenv from 'dotenv';
import {
    getWallet,
    getTonClient,
    waitForTransaction,
    displayWalletInfo,
    formatTon,
} from './utils';

dotenv.config();

/**
 * Set new mint fee for NftCollection
 */
async function setFee(collectionAddr: string, newFee: string, testnet: boolean) {
    console.log(chalk.blue('💰 Setting new mint fee...\n'));

    // Load mnemonic from env
    const mnemonic = process.env.DEPLOYER_MNEMONIC;
    if (!mnemonic) {
        throw new Error('DEPLOYER_MNEMONIC not found in .env');
    }

    // Get wallet
    const { contract: wallet, address: walletAddress, keyPair } = await getWallet(mnemonic, testnet);
    const client = await getTonClient(testnet);

    await displayWalletInfo({ address: walletAddress }, client);

    // Parse addresses and fee
    const collectionAddress = Address.parse(collectionAddr);
    const feeAmount = toNano(newFee);

    console.log(chalk.cyan('\n📍 Collection Address:'), collectionAddress.toString());
    console.log(chalk.cyan('💵 New Mint Fee:'), formatTon(feeAmount), 'TON');

    // Verify collection exists
    const walletContract = client.open(wallet as WalletContractV4);
    const seqno = await walletContract.getSeqno();

    // Build SetFee message
    const messageBody = beginCell()
        .storeUint(0, 32) // op for SetFee, assuming 0 for this example
        .storeCoins(feeAmount)
        .endCell();

    console.log(chalk.cyan('\n📤 Sending set_fee transaction...'));

    await walletContract.sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [
            internal({
                to: collectionAddress,
                value: toNano('0.05'), // Gas for processing
                body: messageBody,
            }),
        ],
    });

    // Wait for confirmation
    await waitForTransaction(client, walletAddress, seqno);

    // Verify new fee
    console.log(chalk.cyan('\n🔍 Verifying new fee...'));
    const updatedFeeResult = await client.runMethod(collectionAddress, 'get_mint_fee');
    const updatedFee = updatedFeeResult.stack.readBigNumber();

    console.log(chalk.green('\n✅ Fee updated successfully!'));
    console.log(chalk.gray('📊 New Fee:'), formatTon(updatedFee), 'TON');

    // Update app .env reminder
    console.log(chalk.yellow('\n📝 Don\'t forget to update app/.env:'));
    console.log(chalk.yellow(`   VITE_MINT_PRICE_NANOTON=${updatedFee.toString()}`));
}

// CLI
program
    .name('set-fee')
    .description('Set new mint fee for NftCollection')
    .requiredOption('--addr <address>', 'Collection contract address')
    .requiredOption('--fee <amount>', 'New mint fee in TON')
    .option('--mainnet', 'Use mainnet (default: testnet)', false)
    .action(async (options) => {
        try {
            await setFee(options.addr, options.fee, !options.mainnet);
        } catch (error) {
            console.error(chalk.red('\n❌ Failed to set fee:'), error);
            process.exit(1);
        }
    });

program.parse();
