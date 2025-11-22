import { getTonClient } from './utils';
import { Address, Cell, Dictionary, beginCell } from '@ton/core';

async function main() {
    const client = await getTonClient(false); // Mainnet
    
    // Collection Address (Mới nhất)
    const collectionAddr = Address.parse('EQByNCFUBlJOziQZBI4OB61mIXiDnI10bDB71A1FD3zFMaX_');
    console.log('🔍 Checking Collection:', collectionAddr.toString());

    // 1. Get Collection Data to find nextItemIndex
    const { stack } = await client.runMethod(collectionAddr, 'get_collection_data');
    const nextItemIndex = stack.readBigNumber();
    console.log('📊 Total Items Minted:', nextItemIndex.toString());

    if (nextItemIndex === 0n) {
        console.log('❌ No NFTs minted yet.');
        return;
    }

    // 2. Get Address of NFT Index 2
    const targetIndex = 0n;
    const { stack: nftStack } = await client.runMethod(collectionAddr, 'get_nft_address_by_index', [
        { type: 'int', value: targetIndex }
    ]);
    const nftAddr = nftStack.readAddress();
    console.log(`🎨 Checking NFT Address (Index ${targetIndex}):`, nftAddr.toString());

    // 3. Get NFT Data
    const { stack: dataStack } = await client.runMethod(nftAddr, 'get_nft_data');
    dataStack.readBoolean(); // init
    dataStack.readBigNumber(); // index
    dataStack.readAddress(); // collection
    dataStack.readAddress(); // owner
    const contentCell = dataStack.readCell(); // individual_content

    // 4. Decode Content
    // Theo chuẩn TEP-64, content bắt đầu bằng 0x01 + String
    const slice = contentCell.beginParse();
    const prefix = slice.loadUint(8);
    if (prefix !== 1) {
        console.log('⚠️ Unknown content format prefix:', prefix);
        return;
    }
    const metadataUri = slice.loadStringTail();
    console.log('🔗 Metadata URI on-chain:', metadataUri);

    // 5. Fetch Metadata
    console.log('📥 Fetching metadata...');
    // Convert ipfs:// to gateway if needed for fetching
    let fetchUrl = metadataUri;
    if (metadataUri.startsWith('ipfs://')) {
        fetchUrl = metadataUri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }
    
    try {
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        console.log('📄 Metadata JSON Content:', JSON.stringify(json, null, 2));

        // 6. Check Image
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
            
            if (imgRes.ok) {
                console.log('✅ Image is accessible!');
            } else {
                console.log('❌ Image is NOT accessible via gateway.');
            }
        } else {
            console.log('❌ Metadata is missing "image" field.');
        }

    } catch (e) {
        console.error('❌ Failed to fetch metadata:', e);
    }
}

main();
