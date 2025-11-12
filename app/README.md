# TON NFT Minting Mini-App

Telegram Mini-App for minting NFTs on TON blockchain with client-side IPFS upload.

## Features

- 🎨 Upload images and mint as NFTs
- 💎 Direct on-chain payment via TON Connect
- 📦 Client-side IPFS upload (web3.storage)
- 📱 Telegram WebApp SDK integration
- 🎯 Mobile-first responsive UI
- ⚡ No backend required (fully client-side)

## Prerequisites

1. **Node.js & pnpm**
   ```bash
   node -v  # v18+ required
   pnpm -v  # or npm/yarn
   ```

2. **Web3.Storage Account**
   - Sign up at https://web3.storage
   - Get API token from dashboard

3. **Deployed NFT Collection Contract**
   - Follow instructions in `../contracts/scripts/README.md`
   - Get collection address after deployment

## Installation

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` file:**
   ```env
   VITE_APP_NAME=Mint NFT
   VITE_TG_BOT_USERNAME=your_bot_username
   VITE_TON_COLLECTION_ADDRESS=EQD4K...  # From contract deployment
   VITE_MINT_PRICE_NANOTON=1000000000     # 1 TON
   VITE_WEB3STORAGE_TOKEN=YOUR_TOKEN      # From web3.storage
   VITE_NETWORK=testnet                   # or mainnet
   ```

## Development

**Start dev server:**
```bash
pnpm dev
```

The app will run at `http://localhost:5173`

## Testing in Telegram

### 1. Create Telegram Bot

Talk to [@BotFather](https://t.me/botfather):

```
/newbot
# Follow prompts to create bot

/setdomain
# Select your bot
# Set domain: your-dev-server.com (or use ngrok for local testing)

/setmenubutton
# Select your bot
# Button text: Open App
# Button URL: https://your-app-url
```

### 2. Local Testing with ngrok

```bash
# Install ngrok
brew install ngrok  # or download from ngrok.com

# Run your app
pnpm dev

# In another terminal, expose localhost
ngrok http 5173

# Copy the https URL and set it in BotFather
```

### 3. Test the Mini-App

1. Open your bot in Telegram
2. Click the menu button or send `/start`
3. The mini-app should load in Telegram's WebView

## Building for Production

```bash
pnpm build
```

Build output will be in `dist/` directory.

## Deployment Options

### Option 1: Netlify (Recommended)

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
pnpm build
netlify deploy --prod --dir=dist
```

### Option 2: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Option 3: GitHub Pages

```bash
# Add to package.json:
# "homepage": "https://yourusername.github.io/repo-name"

pnpm build
# Push dist/ to gh-pages branch
```

## Project Structure

```
app/
├── src/
│   ├── components/
│   │   ├── UploadCard.tsx      # Image upload component
│   │   ├── MintButton.tsx      # Mint NFT button
│   │   └── SuccessSheet.tsx    # Success modal
│   ├── lib/
│   │   ├── telegram.ts         # Telegram WebApp integration
│   │   ├── ipfs.ts             # IPFS upload (web3.storage)
│   │   └── ton.ts              # TON blockchain & wallet
│   ├── styles/
│   │   └── index.css           # Global styles + Tailwind
│   ├── App.tsx                 # Main app component
│   ├── main.tsx                # Entry point
│   └── vite-env.d.ts           # TypeScript env types
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── .env
```

## Key Components

### UploadCard
- Drag & drop image upload
- File validation (type, size)
- Image preview

### MintButton
- TON Connect integration
- Transaction building
- Error handling

### SuccessSheet
- Transaction confirmation
- Explorer link
- Mint another option

## Libraries Used

- **React 18** - UI framework
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **TON Connect** - Wallet connection
- **@ton/core** - TON blockchain SDK
- **web3.storage** - IPFS upload
- **lucide-react** - Icons
- **Telegram WebApp SDK** - Mini-app integration

## Troubleshooting

### WebApp not loading in Telegram
- Check HTTPS (Telegram requires HTTPS)
- Verify domain in BotFather
- Check browser console in Telegram Desktop

### "Collection address not configured"
- Make sure `VITE_TON_COLLECTION_ADDRESS` is set in `.env`
- Restart dev server after changing `.env`

### IPFS upload fails
- Verify `VITE_WEB3STORAGE_TOKEN` is correct
- Check file size (max 5MB)
- Check internet connection

### Transaction rejected
- Ensure wallet has enough TON
- Check mint fee matches contract
- Verify collection address is correct

### TON Connect not working
- Create a proper `tonconnect-manifest.json`
- Host it on your domain
- Update manifest URL in `main.tsx`

## TON Connect Manifest

Create `public/tonconnect-manifest.json`:

```json
{
  "url": "https://your-app-url.com",
  "name": "TON NFT Minting",
  "iconUrl": "https://your-app-url.com/icon.png",
  "termsOfUseUrl": "https://your-app-url.com/terms",
  "privacyPolicyUrl": "https://your-app-url.com/privacy"
}
```

Update manifest URL in `src/main.tsx`.

## Security Notes

⚠️ **Important:**
- Never commit `.env` with real tokens
- Use environment variables for production
- All private keys stay in wallet (never in app)
- TON Connect handles signatures securely

## Support

- **TON Docs:** https://docs.ton.org
- **TON Connect:** https://github.com/ton-connect
- **Telegram Bots:** https://core.telegram.org/bots/webapps
- **Web3.Storage:** https://web3.storage/docs

## License

MIT
