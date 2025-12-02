import { Address, TonClient4 } from "@ton/ton";
import { fromNano } from "@ton/core";

async function main() {
    // Collection address provided by user
    const addressString = "EQDD8lzFn8TTikz_FJmqqgq3Qz4G58HeP6Au70uq-Vs2bdp9";
    
    console.log(`Checking balance for: ${addressString}`);

    // Connect to TON Mainnet (using ton-access or public endpoint if needed, but TonClient4 is reliable)
    // Using a public v4 endpoint
    const client = new TonClient4({
        endpoint: "https://mainnet-v4.tonhubapi.com",
    });

    try {
        const address = Address.parse(addressString);
        
        // Get last block to ensure fresh data
        const lastBlock = await client.getLastBlock();
        const account = await client.getAccount(lastBlock.last.seqno, address);

        if (account.account.state.type === 'active') {
            const balanceNano = account.account.balance.coins;
            const balance = fromNano(balanceNano);
            
            console.log("---------------------------------------------------");
            console.log(`✅ Status: ACTIVE`);
            console.log(`💰 Balance: ${balance} TON`);
            console.log("---------------------------------------------------");
        } else {
            console.log(`❌ Account is ${account.account.state.type}`);
            if (account.account.balance) {
                 console.log(`💰 Balance: ${fromNano(account.account.balance.coins)} TON`);
            }
        }

    } catch (e) {
        console.error("Error fetching balance:", e);
    }
}

main();
