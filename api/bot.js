const { Telegraf, Markup } = require('telegraf');

// Khởi tạo bot với token từ biến môi trường
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// URL của Mini App (Web App)
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://telemint-1.onrender.com';

// Lệnh /start
bot.start((ctx) => {
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
        // Trong môi trường dev thì dùng polling, prod thì có thể dùng webhook nếu cấu hình
        console.log('🤖 Starting Telegram Bot...');
        bot.launch();
        console.log('✅ Telegram Bot started!');
        
        // Graceful stop
        process.once('SIGINT', () => bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot.stop('SIGTERM'));
    } catch (error) {
        console.error('❌ Failed to start bot:', error);
    }
};

module.exports = { bot, launchBot };
