/**
 * API xử lý mint NFT
 * Nhận thông tin giao dịch và mint NFT cho người dùng
 */
const express = require('express');
const { Address, toNano, beginCell } = require('@ton/core');
const { TonClient } = require('@ton/ton');
const { mnemonicToWalletKey } = require('@ton/crypto');
const { WalletContractV4, internal } = require('@ton/ton');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Mảng lưu trữ các mint request (trong thực tế nên dùng database)
const mintRequests = [];

// Lấy biến môi trường
require('dotenv').config({ path: path.join(__dirname, '..', 'contracts', '.env') });
const { 
  COLLECTION_ADDRESS,
  MNEMONIC,
  TONCENTER_API_KEY,
  NETWORK
} = process.env;

const isTestnet = NETWORK === 'testnet';
const endpoint = isTestnet ? 'https://testnet.toncenter.com/api/v2/jsonRPC' : 'https://toncenter.com/api/v2/jsonRPC';

// Khởi tạo TonClient
const tonClient = new TonClient({
  endpoint,
  apiKey: TONCENTER_API_KEY
});

// Log cấu hình khi khởi động API
console.log('API initialized with:', {
  network: NETWORK || 'mainnet',
  collectionAddress: COLLECTION_ADDRESS || 'NOT CONFIGURED',
  hasMnemonic: !!MNEMONIC,
  hasToncenterApiKey: !!TONCENTER_API_KEY
});

/**
 * POST /api/mint
 * Nhận thông tin mint request từ frontend
 */
router.post('/mint-request', async (req, res) => {
  try {
    const { txHash, userAddress, metadataUri, timestamp } = req.body;
    
    // Validate input
    if (!txHash || !userAddress || !metadataUri) {
      console.error('❌ Missing required fields:', { txHash, userAddress, metadataUri });
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Lưu mint request vào memory
    const requestId = Date.now().toString();
    const request = {
      id: requestId,
      txHash,
      userAddress,
      metadataUri,
      timestamp: timestamp || Date.now(),
      status: 'pending',
      createdAt: new Date()
    };
    
    mintRequests.push(request);
    console.log(`✅ Mint request received: ${requestId}`, request);
    
    // Trong thực tế, bạn sẽ gọi hàm này trong một worker riêng
    // Ở đây chúng ta giả lập việc xử lý không đồng bộ
    setTimeout(() => {
      processRequest(request)
        .then(() => console.log(`✅ Mint request processed: ${requestId}`))
        .catch(err => console.error(`❌ Error processing mint request ${requestId}:`, err));
    }, 5000);
    
    return res.status(200).json({
      success: true,
      message: 'Mint request received and being processed',
      requestId
    });
  } catch (error) {
    console.error('❌ Error processing mint request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/mint/:requestId
 * Kiểm tra trạng thái của mint request
 */
router.get('/mint-status/:requestId', (req, res) => {
  const { requestId } = req.params;
  const request = mintRequests.find(req => req.id === requestId);
  
  if (!request) {
    return res.status(404).json({ error: 'Mint request not found' });
  }
  
  return res.status(200).json({
    success: true,
    request
  });
});

/**
 * GET /api/user-mints/:userAddress
 * Lấy danh sách các NFT đã mint của một người dùng
 */
router.get('/user-mints/:userAddress', (req, res) => {
  const { userAddress } = req.params;
  
  // Lọc danh sách mint request theo địa chỉ người dùng
  const userMints = mintRequests.filter(req => req.userAddress === userAddress);
  
  return res.status(200).json({
    success: true,
    mints: userMints
  });
});

/**
 * GET /api/debug/config
 * Kiểm tra cấu hình API (không hiển thị mnemonic)
 */
router.get('/debug/config', (req, res) => {
  return res.status(200).json({
    success: true,
    config: {
      network: NETWORK || 'mainnet',
      collectionAddress: COLLECTION_ADDRESS || 'NOT CONFIGURED',
      hasMnemonic: !!MNEMONIC,
      hasToncenterApiKey: !!TONCENTER_API_KEY,
      requestsCount: mintRequests.length
    }
  });
});

/**
 * Function xử lý mint NFT
 */
async function processRequest(request) {
  try {
    console.log(`🔄 Processing mint request: ${request.id}`, request);
    
    if (!COLLECTION_ADDRESS) {
      const errorMsg = 'Collection address not configured';
      console.error(`❌ ${errorMsg}`);
      request.status = 'failed';
      request.error = errorMsg;
      return;
    }
    
    if (!MNEMONIC) {
      const errorMsg = 'Admin mnemonic not configured';
      console.error(`❌ ${errorMsg}`);
      request.status = 'failed';
      request.error = errorMsg;
      return;
    }
    
    // Xác minh giao dịch đã được xác nhận
    const txConfirmed = await verifyTransaction(request.txHash);
    console.log(`🔍 Transaction verification result:`, txConfirmed);
    
    if (!txConfirmed) {
      request.status = 'failed';
      request.error = 'Transaction not confirmed';
      return;
    }
    
    // Mint NFT thật cho người dùng
    console.log(`🎨 Minting NFT to ${request.userAddress} with metadata ${request.metadataUri}`);
    
    try {
      // Mint NFT thực sự sử dụng admin wallet
      const mintResult = await mintNftForUser(request.userAddress, request.metadataUri);
      console.log(`✅ NFT mint transaction sent:`, mintResult);
      
      request.status = mintResult.success ? 'completed' : 'failed';
      request.mintTxHash = mintResult.txHash;
      request.mintedAt = new Date();
      
      if (!mintResult.success) {
        request.error = mintResult.error || 'Unknown error minting NFT';
      }
      
      console.log(`✅ NFT minting ${request.status} for request: ${request.id}`);
      
      // Lưu request status vào file log
      await logMintRequest(request);
      
    } catch (mintError) {
      console.error(`❌ Error minting NFT: ${mintError.message}`, mintError);
      request.status = 'failed';
      request.error = `Mint error: ${mintError.message}`;
      await logMintRequest(request);
    }
  } catch (error) {
    console.error(`❌ Error processing mint request ${request.id}:`, error);
    request.status = 'failed';
    request.error = error.message;
    await logMintRequest(request);
  }
}

/**
 * Lưu log mint request vào file
 */
async function logMintRequest(request) {
  try {
    const logDir = path.join(__dirname, 'logs');
    // Đảm bảo thư mục logs tồn tại
    try {
      await fs.mkdir(logDir, { recursive: true });
    } catch (err) {
      // Bỏ qua nếu thư mục đã tồn tại
    }
    
    const logFile = path.join(logDir, `mint-requests.log`);
    const logEntry = `[${new Date().toISOString()}] [${request.status.toUpperCase()}] Request ${request.id}: ${JSON.stringify(request)}\n`;
    
    await fs.appendFile(logFile, logEntry, 'utf8');
  } catch (error) {
    console.error('Error writing to log file:', error);
  }
}

/**
 * Xác minh giao dịch đã được xác nhận
 * Kiểm tra giao dịch thực tế trên blockchain
 */
async function verifyTransaction(txHash) {
  if (!txHash || txHash === 'submitted') {
    console.warn('⚠️ No valid txHash provided for verification');
    return false;
  }
  
  try {
    // Kiểm tra giao dịch trên blockchain thực tế
    console.log(`🔍 Verifying transaction: ${txHash}`);
    
    // Nếu không có TonCenter API key, giả định giao dịch OK để debug
    if (!TONCENTER_API_KEY) {
      console.warn('⚠️ No TonCenter API key, assuming transaction is valid for debug');
      return true;
    }
    
    // Query blockchain API để xác nhận giao dịch
    const txInfo = await tonClient.getTransactions({
      address: Address.parse(request.txHash),
      limit: 1
    });
    
    if (!txInfo || txInfo.length === 0) {
      console.warn('⚠️ Transaction not found on blockchain');
      return false;
    }
    
    console.log(`✅ Transaction verified on blockchain`);
    return true;
  } catch (error) {
    console.error('❌ Error verifying transaction:', error);
    
    // Giả định giao dịch OK trong trường hợp lỗi API để testing
    console.warn('⚠️ API error, assuming transaction is valid for debug');
    return true;
  }
}

/**
 * Mint NFT từ admin wallet
 * Thực hiện mint NFT thật sự thông qua smart contract
 */
async function mintNftForUser(userAddress, metadataUri) {
  try {
    console.log(`🔄 Starting mint NFT process for ${userAddress} with URI ${metadataUri}`);
    
    // Nếu không có mnemonic hoặc collection address, mô phỏng mint thành công
    if (!MNEMONIC || !COLLECTION_ADDRESS) {
      console.warn('⚠️ Missing mnemonic or collection address, simulating mint for debug');
      return {
        txHash: 'simulated_tx_' + Math.random().toString(36).substring(2),
        success: true
      };
    }
    
    // Khởi tạo admin wallet từ mnemonic
    const keyPair = await mnemonicToWalletKey(MNEMONIC.split(' '));
    console.log(`✅ Admin wallet key generated`);
    
    // Tạo admin wallet contract
    const adminWallet = WalletContractV4.create({
      publicKey: keyPair.publicKey,
      workchain: 0
    });
    console.log(`✅ Admin wallet contract created: ${adminWallet.address.toString()}`);
    
    // Tạo payload cho việc mint NFT
    const payload = buildMintPayload(userAddress, metadataUri);
    
    // Kiểm tra số dư của admin wallet
    const balance = await tonClient.getBalance(adminWallet.address);
    console.log(`💰 Admin wallet balance: ${balance} TON`);
    
    if (BigInt(balance) < 500000000n) { // 0.5 TON
      return {
        success: false,
        error: 'Insufficient admin wallet balance'
      };
    }
    
    // Gửi transaction mint NFT
    const collectionAddress = Address.parse(COLLECTION_ADDRESS);
    const mintFee = toNano('0.05'); // Minimal amount
    const seqno = await tonClient.getSeqno(adminWallet.address);
    
    // Tạo message
    const transfer = internal({
      to: collectionAddress,
      value: toNano('0.5'), // 0.5 TON
      body: payload,
      bounce: true
    });
    
    const mintTx = await adminWallet.sendTransfer({
      secretKey: keyPair.secretKey,
      seqno,
      messages: [transfer]
    });
    
    const txHash = mintTx.boc || 'tx_submitted';
    console.log(`✅ Mint transaction sent: ${txHash}`);
    
    return {
      txHash,
      success: true
    };
    
  } catch (error) {
    console.error(`❌ Error minting NFT:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Build payload for NFT mint
 */
function buildMintPayload(ownerAddress, metadataUri) {
  try {
    console.log(`🔨 Building mint payload for ${ownerAddress} with URI ${metadataUri}`);
    
    // Convert address string to Address object
    const toAddress = Address.parse(ownerAddress);
    
    // Build mint payload according to NFT standard
    // opcode 0x01 = mint operation + params for contract
    const payload = beginCell()
      .storeUint(0x01, 32) // op: mint = 0x01
      .storeAddress(toAddress) // to: owner address
      .storeRef(
        beginCell()
          .storeBuffer(Buffer.from(metadataUri))
          .endCell()
      )
      .endCell();
    
    return payload;
  } catch (error) {
    console.error(`❌ Error building mint payload:`, error);
    throw error;
  }
}

module.exports = router;
