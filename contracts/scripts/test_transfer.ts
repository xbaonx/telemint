import { getWallet, getTonClient, waitForTransaction, displayWalletInfo } from './utils';
import { Address, toNano, beginCell, internal } from '@ton/core';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    const mnemonic = process.env.MNEMONIC || process.env.WALLET_MNEMONIC || process.env.DEPLOYER_MNEMONIC;
    if (!mnemonic) throw new Error('MNEMONIC not set in .env');

    // Collection Mới Nhất
    const collectionAddrStr = 'EQAnesrKquzkHfG5qIv0saSgSF9OXSSwAX4OsEvHbyYb5CUm';
    const collectionAddr = Address.parse(collectionAddrStr);
    
    const { contract: wallet, address: walletAddress, keyPair } = await getWallet(mnemonic, false);
    const client = await getTonClient(false);

    console.log('👤 Wallet:', walletAddress.toString());
    
    // 1. Get NFT Index 0
    console.log('🔍 Getting NFT Index 0 address...');
    const { stack } = await client.runMethod(collectionAddr, 'get_nft_address_by_index', [{ type: 'int', value: 0n }]);
    const nftAddr = stack.readAddress();
    console.log('🎨 NFT Address:', nftAddr.toString());

    // 2. Check Owner
    const { stack: nftData } = await client.runMethod(nftAddr, 'get_nft_data');
    nftData.readBoolean(); 
    nftData.readBigNumber();
    nftData.readAddress();
    const currentOwner = nftData.readAddress();
    console.log('👤 Current Owner:', currentOwner.toString());

    if (!currentOwner.equals(walletAddress)) {
        console.log('⚠️ You are not the owner of this NFT. Cannot test transfer.');
        // return; 
        // Vẫn chạy nếu là deployer test, nhưng khả năng cao sẽ fail nếu ko phải owner.
    }

    // 3. Build Transfer Message
    // transfer#5fcc3d14 query_id:uint64 new_owner:MsgAddress response_destination:MsgAddress 
    // custom_payload:(Maybe ^Cell) forward_amount:(VarUInteger 16) forward_payload:(Either Cell ^Cell) 
    // = InternalMsgBody;

    const newOwner = walletAddress; // Transfer to self
    const forwardAmount = toNano('0.01');

    const transferBody = beginCell()
        .storeUint(0x5fcc3d14, 32) // Opcode Transfer
        .storeUint(0, 64) // QueryId
        .storeAddress(newOwner)
        .storeAddress(walletAddress) // Response Destination
        .storeMaybeRef(null) // Custom Payload
        .storeCoins(forwardAmount) // Forward Amount
        .storeMaybeRef(null) // Forward Payload (empty slice/cell)
        .endCell();

    console.log('📤 Sending Transfer Transaction...');
    try {
        const seqno = await wallet.getSeqno();
        await wallet.sendTransfer({
            seqno,
            secretKey: keyPair.secretKey,
            messages: [
                internal({
                    to: nftAddr,
                    value: toNano('0.1'), // Value > forwardAmount + gas
                    body: transferBody,
                })
            ]
        });
        console.log('⏳ Waiting for transaction...');
        await waitForTransaction(client, walletAddress, seqno);
        console.log('✅ Transfer Sent Successfully!');
    } catch (e: any) {
        console.error('❌ Transfer Failed:', e.message || e);
    }
}

main();
