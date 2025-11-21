import { getTonClient, formatTon } from './utils';
import { Address } from '@ton/core';
import * as dotenv from 'dotenv';

dotenv.config();

async function check() {
    try {
        console.log('🌍 Connecting to MAINNET...');
        const client = await getTonClient(false); 
        
        // 1. Check User Wallet Balance
        const userAddress = Address.parse('UQBCx1FnpfyWNoMpfh5RNDXPYLopwE7d7fARy00LrleWcTO3');
        console.log('\n👤 Checking User Wallet:', userAddress.toString());
        
        const userBalance = await client.getBalance(userAddress);
        console.log('   Balance:', formatTon(userBalance), 'TON');
        const userState = await client.getContractState(userAddress);
        console.log('   State:', userState.state);
        
        if (userBalance < 1100000000n) {
             console.log('⚠️  WARNING: User balance is less than 1.1 TON. Transaction will fail due to insufficient funds.');
        }

        // 2. Check Collection Contract
        const collectionAddr = Address.parse('EQByNCFUBlJOziQZBI4OB61mIXiDnI10bDB71A1FD3zFMaX_');
        console.log('\nPX Checking Collection:', collectionAddr.toString());
        
        const colState = await client.getContractState(collectionAddr);
        console.log('   State:', colState.state);
        console.log('   Balance:', formatTon(await client.getBalance(collectionAddr)), 'TON');

        if (colState.state !== 'active') {
            console.log('⚠️  WARNING: Collection contract is NOT active.');
        }

    } catch (e) {
        console.error('Check failed:', e);
    }
}

check();
