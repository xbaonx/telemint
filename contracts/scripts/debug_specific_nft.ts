import { getTonClient } from './utils';
import { Address } from '@ton/core';

async function main() {
    const client = await getTonClient(false); // Mainnet
    
    // Other NFT (EQAgrbLU...)
    const nftAddrStr = 'EQAgrbLUvX43kNq7mG6dm2ZzU858kVHs4eu66POt28aNA79o';
    const nftAddr = Address.parse(nftAddrStr);
    console.log('🔍 Checking Competitor NFT 2:', nftAddrStr);

    // 1. Get NFT Data
    try {
        const { stack: dataStack } = await client.runMethod(nftAddr, 'get_nft_data');
        // ... (rest of logic same)
        const isInitialized = dataStack.readBoolean();
        const index = dataStack.readBigNumber();
        const collectionAddr = dataStack.readAddress();
        const ownerAddr = dataStack.readAddress();
        const contentCell = dataStack.readCell();

        console.log('📊 NFT Data On-Chain:');
        console.log('   - Collection:', collectionAddr.toString());

        // 2. Decode Content
        const slice = contentCell.beginParse();
        const prefix = slice.loadUint(8);
        console.log('   - Content Prefix:', prefix);
        
        let metadataUri = '';
        if (prefix === 1) {
            metadataUri = slice.loadStringTail();
        } else {
            // Try to read remaining string if snake format isn't standard
             metadataUri = slice.loadStringTail();
        }
        console.log('🔗 Metadata URI:', metadataUri);

        // 3. Fetch Metadata
        console.log('📥 Fetching metadata...');
        let fetchUrl = metadataUri;
        if (metadataUri.startsWith('ipfs://')) {
            fetchUrl = metadataUri.replace('ipfs://', 'https://ipfs.io/ipfs/');
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
