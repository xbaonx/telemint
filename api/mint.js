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
 * Nếu userAddress là 'all', trả về tất cả mint requests
 */
router.get('/user-mints/:userAddress', (req, res) => {
  const { userAddress } = req.params;
  
  // Nếu userAddress là 'all', trả về tất cả mint requests
  if (userAddress === 'all') {
    return res.status(200).json({
      success: true,
      mints: mintRequests
    });
  }
  
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
 * Ở giai đoạn này, chúng ta đơn giản hóa bằng cách giả định mọi giao dịch đều hợp lệ
 * Trong production, nên kiểm tra giao dịch thực sự đến API wallet và đã xác nhận
 */
async function verifyTransaction(txHash) {
  if (!txHash || txHash === 'submitted') {
    console.warn('⚠️ No valid txHash provided for verification');
    console.warn('⚠️ But we will proceed anyway for testing');
    return true; // For testing, proceed even without txHash
  }
  
  try {
    // Kiểm tra giao dịch trên blockchain thực tế
    console.log(`🔍 Verifying transaction: ${txHash}`);
    
    // QUAN TRỌNG: Trong phiên bản production, cần viết code kiểm tra giao dịch thực sự
    // Ví dụ: Kiểm tra giao dịch đã được xác nhận và gửi đến API wallet
    
    console.log(`✅ Transaction assumed to be valid for testing`);
    return true;
  } catch (error) {
    console.error('❌ Error verifying transaction:', error);
    console.warn('⚠️ API error, but proceeding for testing');
    return true; // For testing, proceed even if verification fails
  }
}

/**
 * Thêm API endpoint debug logs để kiểm tra lỗi mint
 */
router.get('/debug/logs', async (req, res) => {
  try {
    // Đọc file log nếu tồn tại
    const logPath = path.join(__dirname, 'logs', 'mint-requests.log');
    let logs = "No logs found";
    
    try {
      logs = await fs.readFile(logPath, 'utf8');
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    
    return res.status(200).send(`<pre>${logs}</pre>`);
  } catch (err) {
    return res.status(500).send(`Error reading logs: ${err.message}`);
  }
});

/**
 * Build mint payload theo chuẩn TON NFT - được dùng cho việc mint NFT
 */
function buildMintPayload(ownerAddress, contentUri) {
  // Format: create a mint_body payload in accordance with the collection contract
  // Đây là payload chuẩn cho việc mint NFT trên TON
  return beginCell()
    .storeUint(1, 32) // op code for mint
    .storeUint(0, 64) // query id
    .storeAddress(Address.parse(ownerAddress)) // owner address
    .storeRef(beginCell().storeURI(contentUri).endCell())
    .endCell()
    .toBoc();
}

/**
 * Mint NFT từ admin wallet
 * Thực hiện mint NFT thật sự thông qua smart contract
 */
async function mintNftForUser(userAddress, metadataUri) {
  try {
    console.log(`🔄 Starting mint NFT process for ${userAddress} with URI ${metadataUri}`);
    
    // Kiểm tra configuration
    console.log('Environment check:', { 
      COLLECTION_ADDRESS, 
      hasMnemonic: !!MNEMONIC, 
      userAddress, 
      metadataUri 
    });
    
    // Nếu không có mnemonic hoặc collection address, báo lỗi
    if (!MNEMONIC || !COLLECTION_ADDRESS) {
      console.error('❌ Missing mnemonic or collection address, cannot mint!');
      return {
        txHash: null,
        success: false,
        error: 'Missing configuration: admin mnemonic or collection address'
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
    const mintFee = toNano('0.5'); // 0.5 TON for mint
    const seqno = await tonClient.getSeqno(adminWallet.address);
    
    console.log(`🔌 Admin wallet address: ${adminWallet.address.toString()}`);
    console.log(`🔌 Collection address: ${collectionAddress.toString()}`);
    console.log(`🔌 Current seqno: ${seqno}`);
    
    // Tạo payload mint chuẩn
    const mintPayload = buildMintPayload(userAddress, metadataUri);
    console.log(`🔌 Generated mint payload:`, mintPayload);
    
    // Tạo message
    const transfer = internal({
      to: collectionAddress,
      value: mintFee, // 0.5 TON
      body: mintPayload,
      bounce: true
    });
    
    try {
      // Gửi transaction thực sự
      console.log(`📣 Sending mint transaction to collection...`);
      
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
    } catch (txError) {
      console.error(`❌ ERROR SENDING MINT TRANSACTION:`, txError);
      return {
        success: false,
        error: `Transaction error: ${txError.message}`
      };
    }
  } catch (error) {
    console.error(`❌ Error in mintNftForUser function:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * API endpoint kiểm tra admin wallet
 */
router.get('/debug/admin-balance', async (req, res) => {
  try {
    if (!MNEMONIC) {
      return res.status(400).json({
        error: 'Admin mnemonic not configured'
      });
    }
    
    // Generate admin wallet from mnemonic
    const keyPair = await mnemonicToWalletKey(MNEMONIC.split(' '));
    
    // Tạo admin wallet contract
    const adminWallet = WalletContractV4.create({
      publicKey: keyPair.publicKey,
      workchain: 0
    });
    
    const address = adminWallet.address.toString();
    
    // Get balance
    const balance = await tonClient.getBalance(adminWallet.address);
    const balanceTON = (Number(balance) / 1_000_000_000).toFixed(4);
    
    return res.status(200).json({
      success: true,
      adminWallet: {
        address,
        balance: balanceTON + ' TON',
        balanceNano: balance
      },
      collection: COLLECTION_ADDRESS || 'Not configured'
    });
  } catch (err) {
    return res.status(500).json({
      error: `Error checking admin wallet: ${err.message}`
    });
  }
});

// Hàm buildMintPayload đã được định nghĩa ở trên

module.exports = router;
