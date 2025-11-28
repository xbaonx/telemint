const { Telegraf, Markup } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// --- Firebase Setup ---
const firebaseConfig = {
  apiKey: "AIzaSyDEpYVturfJb_5W-WeERRr8uIzv-oIcnjA",
  authDomain: "telemint-storage.firebaseapp.com",
  projectId: "telemint-storage",
  storageBucket: "telemint-storage.firebasestorage.app",
  messagingSenderId: "375370707608",
  appId: "1:375370707608:web:67631c7c4680a8602296ed",
  measurementId: "G-KBZTSEW89F"
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// Save User Helper
async function saveUserFromBot(user) {
    if (!user || !user.id) return;
    try {
        const userRef = doc(db, "users", user.id.toString());
        const userData = {
            id: user.id,
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            username: user.username || "",
            language_code: user.language_code || "en",
            is_premium: user.is_premium || false,
            last_seen: serverTimestamp(),
            from_source: 'bot_start' // Mark source
        };
        // Merge to avoid overwriting existing fields like wallet_address
        await setDoc(userRef, userData, { merge: true });
        console.log(`💾 [Bot] User saved: ${user.id} (${user.username})`);
    } catch (error) {
        console.error("❌ [Bot] Error saving user:", error);
    }
}

// Khởi tạo bot với token từ biến môi trường
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// URL của Mini App (Web App)
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://telemint-1.onrender.com';

// Lệnh /start
bot.start(async (ctx) => {
    // Save user to DB immediately
    if (ctx.from) {
        saveUserFromBot(ctx.from);
    }

    const welcomeMessage = `
🎨 *Welcome to Mint Box - The Easiest NFT Minter on TON!*

Mint Box allows you to turn your images into NFTs on the TON Blockchain in seconds, directly from Telegram.

🚀 *Key Features:*
- **Fast Minting:** Create NFTs instantly.
- **Low Fees:** Optimized for low gas fees.
- **Secure:** Powered by TON Blockchain smart contracts.
- **User Friendly:** No coding required.

👇 *Click the button below to start minting!*
    `;

    ctx.replyWithPhoto(
        { url: 'https://raw.githubusercontent.com/xbaonx/telemint/main/app/public/logo.png' }, // Logo ảnh bìa
        {
            caption: welcomeMessage,
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.webApp('🚀 Open Mint Box App', WEBAPP_URL)],
                [Markup.button.url('📢 Join Community', 'https://t.me/telemint_updates')], // Thay bằng link kênh của bạn
                [Markup.button.callback('ℹ️ How it works', 'help')]
            ])
        }
    );
});

// Lệnh /help hoặc callback 'help'
const helpMessage = `
*How to use Mint Box:*

1. Open the Mini App by clicking "Open Mint Box App".
2. Connect your TON Wallet (Tonkeeper, etc.).
3. Upload an image you want to mint.
4. Enter a name and description for your NFT.
5. Click "Mint NFT" and approve the transaction in your wallet.
6. Done! Your NFT will appear in your wallet shortly.

Need support? Contact @admin
`;

bot.help((ctx) => {
    ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

bot.action('help', (ctx) => {
    ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// Xử lý các tin nhắn khác
bot.on('message', (ctx) => {
    ctx.reply('Please use /start to open the menu.');
});

// Hàm khởi động bot (dùng cho polling hoặc webhook)
const launchBot = async () => {
    try {
        console.log('🤖 Starting Telegram Bot...');
        
        // Thêm dropPendingUpdates để bỏ qua tin nhắn cũ khi khởi động lại
        await bot.launch({ dropPendingUpdates: true });
        console.log('✅ Telegram Bot started!');
        
        // Graceful stop
        process.once('SIGINT', () => bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot.stop('SIGTERM'));
    } catch (error) {
        console.error('❌ Failed to start bot:', error);
        if (error.response && error.response.error_code === 409) {
            console.warn('⚠️ Conflict detected: Another bot instance is running. Keeping server alive without bot.');
            // Không exit process để server vẫn chạy được API/Web
        }
    }
};

// Hàm gửi thông báo Mint mới vào Channel
const sendMintNotification = async (mintData) => {
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    if (!channelId) {
        console.warn('⚠️ TELEGRAM_CHANNEL_ID not set. Skipping notification.');
        return;
    }

    const { nftName, nftImage, minterAddress, explorerUrl } = mintData;
    
    // Rút gọn địa chỉ ví (VD: EQ...1234)
    const shortAddress = minterAddress 
        ? `${minterAddress.slice(0, 4)}...${minterAddress.slice(-4)}`
        : 'Unknown';

    const message = `
🎉 *NEW NFT MINTED!*

💎 *Name:* ${nftName}
👤 *Minter:* \`${shortAddress}\`
🚀 *Collection:* Mint Box

👇 *View on Explorer:*
[Tonviewer](${explorerUrl})
    `;

    try {
        await bot.telegram.sendPhoto(channelId, nftImage, {
            caption: message,
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                // Channel không hỗ trợ WebApp button, phải dùng URL button
                [Markup.button.url('🔨 Mint Your Own', WEBAPP_URL)]
            ])
        });
        console.log(`✅ Notification sent to channel ${channelId}`);
    } catch (error) {
        console.error('❌ Failed to send channel notification:', error);
    }
};

module.exports = { bot, launchBot, sendMintNotification };
