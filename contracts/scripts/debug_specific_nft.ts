import { getTonClient } from './utils';
import { Address } from '@ton/core';

async function main() {
    const client = await getTonClient(false); // Mainnet
    
    // NFT Address from screenshot (EQCQyf...Ji9y)
    // Full address likely: EQCQyfpto-LSmBTMN36klCk6bx_zQS1jzmwSQFkEBgS2Ji9y
    // I need to be careful with address typing. Let's use the collection address to find Index 0.
    
    const collectionAddrStr = 'EQDL6P2VMga0K5ADkAZRYJkcc2RBlMGzq7GyrVF5Bvi7ltGM';
    const collectionAddr = Address.parse(collectionAddrStr);
    console.log('🔍 Checking Collection:', collectionAddrStr);

    // 1. Check Royalty Params
    try {
        const { stack: royaltyStack } = await client.runMethod(collectionAddr, 'get_royalty_params');
        const numerator = royaltyStack.readBigNumber();
        const denominator = royaltyStack.readBigNumber();
        const dest = royaltyStack.readAddress();
        console.log('👑 Collection Royalty Params:');
        console.log(`   - Numerator: ${numerator}`);
        console.log(`   - Denominator: ${denominator}`);
        console.log(`   - Destination: ${dest.toString()}`);
        console.log(`   - Percentage: ${(Number(numerator) / Number(denominator)) * 100}%`);
    } catch (e) {
        console.log('❌ Failed to get royalty params:', e);
    }

    // 2. Check NFT Index 0
    const index = 0n;
    const { stack: nftStack } = await client.runMethod(collectionAddr, 'get_nft_address_by_index', [{ type: 'int', value: index }]);
    const nftAddr = nftStack.readAddress();
    console.log(`🎨 NFT Address (Index 0): ${nftAddr.toString()}`);

    // 3. Get NFT Data
    try {
        const { stack: dataStack } = await client.runMethod(nftAddr, 'get_nft_data');
        // ... (rest of the code)
        const isInitialized = dataStack.readBoolean();
        const itemIndex = dataStack.readBigNumber();
        const collectionAddress = dataStack.readAddress();
        const ownerAddress = dataStack.readAddress();
        const contentCell = dataStack.readCell();

        console.log('📊 NFT Data On-Chain:');
        console.log('   - Initialized:', isInitialized);
        console.log('   - Collection:', collectionAddress.toString());
        console.log('   - Owner:', ownerAddress.toString());

        // Decode Content
        const slice = contentCell.beginParse();
        const prefix = slice.loadUint(8);
        if (prefix !== 1) {
            console.log('⚠️ Unknown content format prefix:', prefix);
            return;
        }
        const metadataUri = slice.loadStringTail();
        console.log('🔗 Metadata URI:', metadataUri);

        // Fetch Metadata
        console.log('📥 Fetching metadata...');
        let fetchUrl = metadataUri;
        if (metadataUri.startsWith('ipfs://')) {
             // Try Cloudflare first as it's what we used
             fetchUrl = metadataUri.replace('ipfs://', 'https://cloudflare-ipfs.com/ipfs/');
        }
        
        console.log(`   Fetching from: ${fetchUrl}`);
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        console.log('📄 Metadata JSON Content:', JSON.stringify(json, null, 2));

    } catch (e) {
        console.error('❌ Error checking NFT:', e);
    }
}

main();
