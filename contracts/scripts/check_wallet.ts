import { getWallet, getTonClient, formatTon } from './utils';
import * as dotenv from 'dotenv';

dotenv.config();

async function check() {
    try {
        const mnemonic = process.env.DEPLOYER_MNEMONIC;
        if (!mnemonic) {
            console.error('No mnemonic found');
            return;
        }
        
        const client = await getTonClient(true); // testnet
        const { wallet, address } = await getWallet(mnemonic, true);
        
        console.log('Wallet address:', address.toString());
        const balance = await client.getBalance(address);
        console.log('Balance:', formatTon(balance), 'TON');
        
        const state = await client.getContractState(address);
        console.log('State:', state.state);
        
    } catch (e) {
        console.error(e);
    }
}

check();
