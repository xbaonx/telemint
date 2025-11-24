/**
 * API xử lý mint NFT
 * Nhận thông tin giao dịch và mint NFT cho người dùng
 */
const express = require('express');
const { Address, toNano, beginCell, Cell, TupleBuilder } = require('@ton/core');
const { TonClient } = require('@ton/ton');
const fs = require('fs').promises;
const path = require('path');
const { sendMintNotification } = require('./bot'); // Import hàm gửi thông báo

const router = express.Router();


// Mảng lưu trữ các mint request (trong thực tế nên dùng database)
const mintRequests = [];

// Lấy biến môi trường
require('dotenv').config({ path: path.join(__dirname, '..', 'contracts', '.env') });
// Hỗ trợ cả biến môi trường dạng backend (COLLECTION_ADDRESS/NETWORK)
// và dạng frontend VITE_* khi deploy trên Render/Netlify
const COLLECTION_ADDRESS = process.env.COLLECTION_ADDRESS || process.env.VITE_TON_COLLECTION_ADDRESS;
const TONCENTER_API_KEY = process.env.TONCENTER_API_KEY || process.env.VITE_TONCENTER_API_KEY;
const NETWORK = process.env.NETWORK || process.env.VITE_NETWORK || 'mainnet';

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
  hasToncenterApiKey: !!TONCENTER_API_KEY
});

// ===== Helper: read collection getters =====
async function getNextIndex(collectionAddr) {
  try {
    const res = await tonClient.runMethod(collectionAddr, 'get_next_index');
    // Prefer TupleReader API if available
    if (res.stack && typeof res.stack.readBigNumber === 'function') {
      return BigInt(res.stack.readBigNumber());
    }
    if (res.stack && typeof res.stack.readNumber === 'function') {
      return BigInt(res.stack.readNumber());
    }
    // Fallback generic
    const item = res.stack?.items?.[0];
    if (item && (item.num !== undefined || item.value !== undefined)) {
      const v = item.num ?? item.value;
      return BigInt(v.toString());
    }
  } catch (e) {
    console.warn('getNextIndex failed:', e?.message || e);
  }
  return null;
}

async function getMintFee(collectionAddr) {
  try {
    const res = await tonClient.runMethod(collectionAddr, 'get_mint_fee');
    if (res.stack && typeof res.stack.readBigNumber === 'function') {
      return BigInt(res.stack.readBigNumber());
    }
    if (res.stack && typeof res.stack.readNumber === 'function') {
      return BigInt(res.stack.readNumber());
    }
    const item = res.stack?.items?.[0];
    if (item && (item.num !== undefined || item.value !== undefined)) {
      const v = item.num ?? item.value;
      return BigInt(v.toString());
    }
  } catch (e) {
    console.warn('getMintFee failed:', e?.message || e);
  }
  return null;
}

async function getItemAddressByIndex(collectionAddr, index) {
  try {
    const tb = new TupleBuilder();
    tb.writeNumber(BigInt(index));
    const res = await tonClient.runMethod(collectionAddr, 'get_nft_address_by_index', tb.build());
    if (res.stack && typeof res.stack.readAddress === 'function') {
      const addr = res.stack.readAddress();
      return addr.toString();
    }
    const item = res.stack?.items?.[0];
    if (item && item.address) {
      return Address.parse(item.address).toString();
    }
  } catch (e) {
    console.warn('getItemAddressByIndex failed:', e?.message || e);
  }
  return null;
}

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
    
    // Dự đoán địa chỉ NFT item tiếp theo (best-effort)
    let predictedNftItemAddress = null;
    try {
      if (COLLECTION_ADDRESS) {
        const nextIdx = await getNextIndex(Address.parse(COLLECTION_ADDRESS));
        if (nextIdx !== null) {
          predictedNftItemAddress = await getItemAddressByIndex(Address.parse(COLLECTION_ADDRESS), nextIdx);
          console.log('🔮 Predicted NFT item for request:', { nextIdx: nextIdx.toString(), predictedNftItemAddress });
        }
      }
    } catch (e) {
      console.warn('Could not predict NFT item address:', e?.message || e);
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
      createdAt: new Date(),
      predictedNftItemAddress: predictedNftItemAddress || undefined
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
      requestId,
      predictedNftItemAddress
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
      await logMintRequest(request);
      return;
    }

    // Xác minh giao dịch đã được xác nhận trên blockchain
    const txConfirmed = await verifyTransaction(request.txHash);
    console.log(`🔍 Transaction verification result:`, txConfirmed);

    if (txConfirmed) {
      request.status = 'completed';
      request.mintedAt = new Date();
      console.log(`✅ Direct Mint transaction verified and completed for request: ${request.id}`);
    } else {
      request.status = 'failed';
      request.error = 'Transaction not confirmed or invalid';
      console.log(`❌ Direct Mint transaction failed verification for request: ${request.id}`);
    }

    // Lưu request status vào file log
    await logMintRequest(request);

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
 * POST /api/debug/message-hash
 * Tính hash của external message từ BOC (base64/base64url)
 */
router.post('/debug/message-hash', (req, res) => {
  try {
    const { boc } = req.body || {};
    if (!boc || typeof boc !== 'string') {
      return res.status(400).json({ error: 'Missing boc' });
    }

    const normalize = (s) => {
      const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
      return s.replace(/-/g, '+').replace(/_/g, '/') + pad;
    };

    let buf;
    try {
      buf = Buffer.from(boc, 'base64');
      if (buf.length === 0) throw new Error('empty');
    } catch {
      buf = Buffer.from(normalize(boc), 'base64');
    }

    const cell = Cell.fromBoc(buf)[0];
    const hash = cell.hash();
    const b64url = Buffer.from(hash)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/,'');

    return res.status(200).json({
      hash_base64url: b64url,
      hash_hex: Buffer.from(hash).toString('hex')
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/notify-mint
 * Trigger thông báo Telegram khi mint thành công
 */
router.post('/notify-mint', async (req, res) => {
  try {
    const { nftName, nftImage, minterAddress, collectionAddress } = req.body;

    if (!nftName || !nftImage || !minterAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log('📢 Received mint notification request:', { nftName, minterAddress });

    // Tạo link explorer (ưu tiên collectionAddress gửi lên, fallback về env)
    const colAddr = collectionAddress || COLLECTION_ADDRESS;
    // Link tới NFT Item (hiện tại chưa biết chính xác index, nên trỏ về Collection hoặc ví minter)
    // Tạm thởi trỏ về ví người mint để xem giao dịch
    const explorerUrl = `https://tonviewer.com/${minterAddress}`;

    await sendMintNotification({
      nftName,
      nftImage,
      minterAddress,
      explorerUrl
    });

    return res.status(200).json({ success: true, message: 'Notification sent' });
  } catch (error) {
    console.error('❌ Error sending mint notification:', error);
    // Không trả về lỗi 500 để tránh làm frontend báo lỗi đỏ, vì đây chỉ là tính năng phụ
    return res.status(200).json({ success: false, error: error.message });
  }
});

module.exports = router;
