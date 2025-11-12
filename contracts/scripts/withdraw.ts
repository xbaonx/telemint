#!/usr/bin/env tsx

import { Address, toNano, beginCell } from '@ton/core';
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
 * Withdraw collected fees from NftCollection
 */
async function withdraw(
    collectionAddr: string,
    toAddr: string,
    amount: string,
    testnet: boolean
) {
    console.log(chalk.blue('💸 Withdrawing funds from collection...\n'));

    // Load mnemonic from env
    const mnemonic = process.env.DEPLOYER_MNEMONIC;
    if (!mnemonic) {
        throw new Error('DEPLOYER_MNEMONIC not found in .env');
    }

    // Get wallet
    const { contract: wallet, address: walletAddress, keyPair } = await getWallet(mnemonic, testnet);
    const client = getTonClient(testnet);

    await displayWalletInfo({ address: walletAddress }, client);

    // Parse addresses and amount
    const collectionAddress = Address.parse(collectionAddr);
    const toAddress = Address.parse(toAddr);
    const withdrawAmount = toNano(amount);

    console.log(chalk.cyan('\n📍 Collection Address:'), collectionAddress.toString());
    console.log(chalk.cyan('👛 Withdraw To:'), toAddress.toString());
    console.log(chalk.cyan('💵 Amount:'), formatTon(withdrawAmount), 'TON');

    // Verify collection exists
    const state = await client.getContractState(collectionAddress);
    if (state.state !== 'active') {
        throw new Error('Collection contract not found or not active');
    }

    // Get collection balance
    const balance = await client.getBalance(collectionAddress);
    console.log(chalk.gray('💰 Collection Balance:'), formatTon(balance), 'TON');

    if (BigInt(balance) < BigInt(withdrawAmount)) {
        throw new Error('Insufficient balance in collection');
    }

    // Build Withdraw message
    // Message format: op + to:Address + amount:coins
    const messageBody = beginCell()
        .storeUint(0, 32) // Will be parsed by receive(msg: Withdraw)
        .storeAddress(toAddress)
        .storeCoins(BigInt(withdrawAmount))
        .endCell();

    console.log(chalk.cyan('\n📤 Sending withdrawal transaction...'));

    const seqno = await wallet.getSeqno();

    await wallet.sendTransfer({
        seqno,
        secretKey: keyPair.secretKey,
        messages: [
            {
                to: collectionAddress,
                value: toNano('0.05'), // Gas for processing
                body: messageBody,
            },
        ],
    });

    // Wait for confirmation
    await waitForTransaction(client, walletAddress, seqno);

    // Verify withdrawal
    console.log(chalk.cyan('\n🔍 Verifying withdrawal...'));
    const newBalance = await client.getBalance(collectionAddress);
    const recipientBalance = await client.getBalance(toAddress);

    console.log(chalk.green('\n✅ Withdrawal successful!'));
    console.log(chalk.gray('💰 Collection Balance:'), formatTon(newBalance), 'TON');
    console.log(chalk.gray('👛 Recipient Balance:'), formatTon(recipientBalance), 'TON');

    console.log(chalk.blue('\n🔗 Explorer Links:'));
    const baseUrl = testnet ? 'https://testnet.tonviewer.com' : 'https://tonviewer.com';
    console.log(chalk.blue(`   Collection: ${baseUrl}/${collectionAddress.toString()}`));
    console.log(chalk.blue(`   Recipient: ${baseUrl}/${toAddress.toString()}`));
}

// CLI
program
    .name('withdraw')
    .description('Withdraw collected fees from NftCollection')
    .requiredOption('--addr <address>', 'Collection contract address')
    .requiredOption('--to <address>', 'Recipient address')
    .requiredOption('--amount <ton>', 'Amount to withdraw in TON')
    .option('--mainnet', 'Use mainnet (default: testnet)', false)
    .action(async (options) => {
        try {
            await withdraw(options.addr, options.to, options.amount, !options.mainnet);
        } catch (error) {
            console.error(chalk.red('\n❌ Withdrawal failed:'), error);
            process.exit(1);
        }
    });

program.parse();
