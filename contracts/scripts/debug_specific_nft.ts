import { getTonClient } from './utils';
import { Address } from '@ton/core';

async function main() {
    const client = await getTonClient(false); // Mainnet
    
    // YOUR NEW NFT (Firebase)
    const nftAddrStr = 'EQDV88bIcD76tITL29ab-bkNwkkgw0IHs-DHKbyIq2rheSPI';
    const nftAddr = Address.parse(nftAddrStr);
    console.log('🔍 Checking YOUR NEW NFT:', nftAddrStr);

    // 1. Get NFT Data
    try {
        const { stack: dataStack } = await client.runMethod(nftAddr, 'get_nft_data');
        const isInitialized = dataStack.readBoolean();
        const index = dataStack.readBigNumber();
        const collectionAddr = dataStack.readAddress();
        const ownerAddr = dataStack.readAddress();
        const contentCell = dataStack.readCell();

        console.log('📊 NFT Data On-Chain:');
        console.log('   - Initialized:', isInitialized);
        console.log('   - Index:', index.toString());
        console.log('   - Collection:', collectionAddr.toString());
        console.log('   - Owner:', ownerAddr.toString());

        // 2. Decode Content
        const slice = contentCell.beginParse();
        const prefix = slice.loadUint(8);
        console.log('   - Content Prefix:', prefix);
        
        let metadataUri = '';
        if (prefix === 1) {
            metadataUri = slice.loadStringTail();
        } else {
             metadataUri = slice.loadStringTail();
        }
        console.log('🔗 Metadata URI:', metadataUri);

        // 3. Fetch Metadata
        console.log('📥 Fetching metadata...');
        let fetchUrl = metadataUri;
        // No IPFS replacement needed for Firebase
        
        console.log(`   Fetching from: ${fetchUrl}`);
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        console.log('📄 Metadata JSON Content:', JSON.stringify(json, null, 2));
        
        if (json.image) {
             console.log('🖼 Image URL:', json.image);
        }

    } catch (e) {
        console.error('❌ Error checking NFT:', e);
    }
}

main();
