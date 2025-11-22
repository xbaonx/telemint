import { getTonClient } from './utils';
import { Address } from '@ton/core';

async function main() {
    const client = await getTonClient(false); // Mainnet
    
    // NFT Address from screenshot
    const nftAddrStr = 'EQAVNdXcTUS-xT25QaMmK121zD51_K-j43j5mZNzJ5ODvGvP';
    const nftAddr = Address.parse(nftAddrStr);
    console.log('🔍 Checking Specific NFT:', nftAddrStr);

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
        if (prefix !== 1) {
            console.log('⚠️ Unknown content format prefix:', prefix);
            return;
        }
        const metadataUri = slice.loadStringTail();
        console.log('🔗 Metadata URI:', metadataUri);

        // 3. Fetch Metadata
        console.log('📥 Fetching metadata...');
        let fetchUrl = metadataUri;
        if (metadataUri.startsWith('ipfs://')) {
            fetchUrl = metadataUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
        }
        
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        console.log('📄 Metadata JSON Content:', JSON.stringify(json, null, 2));

        // 4. Check Image
        if (json.image) {
            console.log('🖼 Image URL in JSON:', json.image);
            
            let imgUrl = json.image;
            if (imgUrl.startsWith('ipfs://')) {
                imgUrl = imgUrl.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
            }
            
            console.log(`🚀 Testing Image Load from: ${imgUrl}`);
            const imgRes = await fetch(imgUrl, { method: 'HEAD' });
            console.log(`   Response Status: ${imgRes.status} ${imgRes.statusText}`);
            console.log(`   Content-Type: ${imgRes.headers.get('content-type')}`);
            console.log(`   Content-Length: ${imgRes.headers.get('content-length')}`);
        } else {
            console.log('❌ Metadata is missing "image" field.');
        }

    } catch (e) {
        console.error('❌ Error checking NFT:', e);
    }
}

main();
