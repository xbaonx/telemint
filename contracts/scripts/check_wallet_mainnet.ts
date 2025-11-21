import { getWallet, getTonClient, formatTon } from './utils';
import * as dotenv from 'dotenv';

dotenv.config();

async function check() {
    try {
        const mnemonic = process.env.DEPLOYER_MNEMONIC;
        if (!mnemonic) {
            console.error('❌ Error: No DEPLOYER_MNEMONIC found in .env');
            return;
        }
        
        console.log('🌍 Connecting to MAINNET...');
        // Tham số false nghĩa là Mainnet
        const client = await getTonClient(false); 
        const { wallet, address } = await getWallet(mnemonic, false);
        
        console.log('\n📱 Wallet Info (Mainnet):');
        console.log('   Address:', address.toString());
        
        const balance = await client.getBalance(address);
        console.log('   Balance:', formatTon(balance), 'TON');
        
        const state = await client.getContractState(address);
        console.log('   State:', state.state);
        
        if (balance === 0n) {
            console.log('\n⚠️  Warning: Wallet has 0 TON. You need TON to deploy contracts.');
        } else {
            console.log('\n✅ Wallet is ready for deployment!');
        }
        
    } catch (e) {
        console.error('Check failed:', e);
    }
}

check();
