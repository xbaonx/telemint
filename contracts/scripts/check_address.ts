import { Address, beginCell, Cell, contractAddress } from '@ton/core';
import { NftCollection } from '../build/NftCollection_NftCollection';
import { NftItem } from '../build/NftCollection_NftItem';

// Collection Address: EQDD8lzFn8TTikz_FJmqqgq3Qz4G58HeP6Au70uq-Vs2bdp9
const collectionAddressStr = 'EQDD8lzFn8TTikz_FJmqqgq3Qz4G58HeP6Au70uq-Vs2bdp9';
const targetAddressStr = 'UQDCk7_382HlKwsky6rYQuBmKjQKv8jg9fpjzhI2SBdPuRXM';

async function main() {
    const collectionAddress = Address.parse(collectionAddressStr);
    const targetAddress = Address.parse(targetAddressStr);

    console.log(`Checking if ${targetAddressStr} is an item of collection ${collectionAddressStr}...`);

    // Need to reconstruct the StateInit of the Item to calculate its address.
    // In Tact, the Item address is derived from the Collection Address and the Item Index.
    // We need the Item Code which is in the build artifacts.
    
    // Since we don't have easy access to the exact 'init' function logic from here without instantiating the contract wrapper
    // correctly with the right code, we will iterate and use the NftCollection wrapper's static method if available
    // or manually construct it if we know the logic.
    
    // Better approach: The NftCollection contract has a method `get_nft_address_by_index`.
    // We can call this on-chain if we want, but we want to check offline if possible.
    // OR we can just run a script that calls the on-chain getter for indices 0..1000.
    
    // Let's try the offline calculation using the NftCollection wrapper logic if possible.
    // However, to be 100% sure, calling the on-chain getter is safest.
    
    // Let's use a public endpoint to check.
    
    const { getHttpEndpoint } = require("@orbs-network/ton-access");
    const { TonClient } = require("@ton/ton");

    const endpoint = await getHttpEndpoint({ network: "mainnet" }); // Assuming mainnet based on addresses
    const client = new TonClient({ endpoint });

    const collectionContract = client.open(NftCollection.fromAddress(collectionAddress));

    // Let's check the first 50 items. It's likely a recent mint.
    // Or we can try to guess the index if we know the total supply.
    
    try {
        const data = await collectionContract.getGetCollectionData();
        const nextItemIndex = data.next_item_index;
        console.log(`Collection has ${nextItemIndex} items.`);

        // Search backwards from the latest item
        console.log("Searching recent items...");
        const start = nextItemIndex - 1n;
        const limit = 50n; // Check last 50 items
        
        for (let i = 0n; i < limit; i++) {
            const index = start - i;
            if (index < 0n) break;

            const itemAddr = await collectionContract.getGetNftAddressByIndex(index);
            // Convert to user-friendly string to compare
            // targetAddressStr starts with UQ -> non-bounceable.
            // itemAddr usually returns bounceable or raw.
            
            // Let's compare hash
            if (itemAddr.hash.equals(targetAddress.hash)) {
                console.log(`\n✅ MATCH FOUND!`);
                console.log(`The address ${targetAddressStr} is NFT Item #${index} of the collection.`);
                console.log(`This confirms the TON deducted is the storage fee/balance of your NFT.`);
                return;
            }
            
            if (i % 10n === 0n) process.stdout.write('.');
        }
        
        console.log("\n❌ Address not found in the last 50 items.");

    } catch (e) {
        console.error("Error checking on-chain:", e);
    }
}

main();
