import { getWallet, getTonClient, waitForTransaction, formatTon } from './utils';
import { Address, toNano, beginCell, internal } from '@ton/core';
import * as dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

async function main() {
    const mnemonic = process.env.MNEMONIC || process.env.WALLET_MNEMONIC || process.env.DEPLOYER_MNEMONIC;
    if (!mnemonic) throw new Error('MNEMONIC not set in .env');

    const { contract: wallet, address: walletAddress, keyPair } = await getWallet(mnemonic, false);
    const client = await getTonClient(false);
    
    console.log('👤 Wallet:', walletAddress.toString());
    const balance = await client.getBalance(walletAddress);
    console.log('💰 Wallet Balance:', formatTon(balance), 'TON');

    if (balance < toNano('0.05')) {
        console.log(chalk.red('❌ Wallet balance too low to pay gas fees. Please top up at least 0.05 TON.'));
        // return; // Try anyway?
    }

    const collections = [
        'EQB5oZjoOwSKDQf7xjC7BY9lz3wv0voBRxAYvLXx7cGJU4Jo',
        'EQAdMIvlQbOo6XzIonf6z_u-ehWv5rnl__EACA1RkjnchTOV',
        'EQDL6P2VMga0K5ADkAZRYJkcc2RBlMGzq7GyrVF5Bvi7ltGM',
        'EQAnesrKquzkHfG5qIv0saSgSF9OXSSwAX4OsEvHbyYb5CUm',
        'EQDAWv2zh6Krad5mR1ItCU9jE100S8GpwOKdSMkAw6fmYvoJ'
    ];

    let seqno = await wallet.getSeqno();

    for (const addrStr of collections) {
        try {
            const colAddr = Address.parse(addrStr);
            console.log(chalk.blue(`\n🔍 Checking Collection: ${addrStr}`));
            
            const colBalance = await client.getBalance(colAddr);
            console.log(`   Balance: ${formatTon(colBalance)} TON`);

            if (colBalance < toNano('0.05')) {
                console.log(chalk.yellow('   ⚠️ Balance too low to withdraw (min 0.05 TON reserve). Skipping.'));
                continue;
            }

            const amountToWithdraw = colBalance - toNano('0.05'); // Leave 0.05 TON reserve
            console.log(chalk.green(`   💸 Withdrawing ${formatTon(amountToWithdraw)} TON...`));

            // Build Withdraw message
            // Opcode: withdraw#27e60a88 to:address amount:coins = Withdraw
            const messageBody = beginCell()
                .storeUint(0x27e60a88, 32)
                .storeAddress(walletAddress)
                .storeCoins(amountToWithdraw)
                .endCell();

            await wallet.sendTransfer({
                seqno,
                secretKey: keyPair.secretKey,
                messages: [
                    internal({
                        to: colAddr,
                        value: toNano('0.02'), // Gas for withdrawal request
                        body: messageBody,
                    })
                ]
            });

            console.log('   ✅ Withdrawal request sent.');
            
            // Increase seqno manually or wait? 
            // To speed up, we just increment local seqno assumption or wait a bit.
            // But wallet.sendTransfer checks on-chain seqno. We must wait.
            // Actually, let's just wait for seqno to change.
            
            let currentSeqno = seqno;
            while (currentSeqno == seqno) {
                await new Promise(r => setTimeout(r, 2000));
                currentSeqno = await wallet.getSeqno();
            }
            seqno = currentSeqno;
            console.log('   Transaction confirmed.');

        } catch (e: any) {
            console.error(chalk.red(`   ❌ Error: ${e.message}`));
        }
    }

    console.log(chalk.bold('\n🏁 All withdrawal attempts finished.'));
}

main();
