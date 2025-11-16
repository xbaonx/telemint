# TON NFT Minting - Telegram Mini-App

Production-ready Telegram Mini-App for minting NFTs on TON blockchain with Direct Mint API.

## 🎯 Overview

This project enables users to:
1. Connect TON wallet (Tonkeeper/Telegram Wallet) via TON Connect
2. Upload images (client-side IPFS via web3.storage)
3. Send payment to API wallet via simple transaction (no complex payload)
4. Backend API automatically mints NFT and sends to user's wallet
5. View NFT in wallet and TON explorer

**Key Features:**
- ✅ Compatible with Telegram Wallet in Mini-App
- ✅ Simple transactions without complex payloads
- ✅ Integrated API backend for automatic minting
- ✅ Standard TON NFT implementation (compatible with wallets)
- ✅ Clean, minimal MVP architecture
- ✅ Production-ready code with TypeScript

## 💻 Project Structure

```
telemint/
├── contracts/              # Smart contracts (Tact)
│   ├── NftItem.tact       # Individual NFT contract
│   ├── NftCollection.tact # Collection & minting logic
│   ├── tact.config.ts     # Tact compiler config
│   ├── scripts/           # Build & deployment scripts
│   │   ├── build.ts
│   │   ├── deploy-collection.ts
│   │   ├── set-fee.ts
│   │   ├── withdraw.ts
│   │   └── utils.ts
│   └── package.json
│
├── api/                   # Backend API Server
│   ├── index.js          # Express API Server
│   └── mint.js           # Mint Request API
│
├── app/                   # Frontend React app
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── lib/           # Core libraries
│   │   │   ├── telegram.ts   # Telegram WebApp SDK
│   │   │   ├── ipfs.ts       # IPFS upload
│   │   │   ├── ton.ts        # TON blockchain
│   │   │   └── direct-mint.ts # Direct Mint API
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── package.json
│
├── package.json          # Root package.json
└── README.md (this file)
```

## 🚀 Quick Start

### 1. Install Dependencies

**Root Project:**
```bash
npm install
```

This will install dependencies for both the API server and frontend app.

**For separate development:**

**Contracts:**
```bash
cd contracts
npm install
```

**App:**
```bash
cd app
npm install
```

### 2. Build & Deploy Smart Contracts

```bash
cd contracts

# Build contracts
pnpm run build

# Create .env with deployer mnemonic
cp .env.example .env
# Edit .env and add your mnemonic

# Deploy collection to testnet
pnpm tsx scripts/deploy-collection.ts --fee 1

# Save the collection address!
# Example output: EQD4K...
```

### 3. Configure Frontend

```bash
cd app
cp .env.example .env
```

Edit `app/.env`:
```env
VITE_TON_COLLECTION_ADDRESS=EQD4K...  # From step 2
VITE_MINT_PRICE_NANOTON=1000000000     # Must match contract fee
VITE_WEB3STORAGE_TOKEN=YOUR_TOKEN      # Get from web3.storage
VITE_NETWORK=testnet
```

### 4. Run Development Server

**Full Stack Development (API + Frontend):**
```bash
npm run dev
```

This starts both the API server at `http://localhost:3000` and the frontend app at `http://localhost:5173`.

**Frontend Only:**
```bash
cd app
npm run dev
```

**API Server Only:**
```bash
npm run dev:api
```

### 5. Test in Telegram

Use ngrok for local testing:
```bash
ngrok http 5173
```

Configure bot with [@BotFather](https://t.me/botfather):
```
/setmenubutton
# Set ngrok HTTPS URL
```

Open your bot in Telegram and test!

## 📖 Detailed Documentation

- **Smart Contracts:** See `contracts/scripts/README.md`
- **Frontend App:** See `app/README.md`

## 🔧 Tech Stack

### Smart Contracts
- **Tact** - TON smart contract language
- **TON SDK** - @ton/core, @ton/crypto
- **TypeScript** - Scripts & deployment

### Frontend
- **React 18** + **Vite** - UI framework & build tool
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **TON Connect** - Wallet integration
- **web3.storage** - IPFS upload
- **Telegram WebApp SDK** - Mini-app integration

## 🌈 User Flow

```
1. User opens mini-app in Telegram
   ↓
2. Connect TON wallet (TON Connect) - Works with Telegram Wallet!
   ↓
3. Upload image + enter name/description
   ↓
4. Client uploads to IPFS → gets metadata URI
   ↓
5. Click "Mint NFT"
   ↓
6. Wallet confirms simple payment transaction (no complex payload)
   ↓
7. Backend API automatically:
   - Verifies transaction
   - Calls collection contract
   - Mints NFT for user
   - Sends to user's wallet
   ↓
8. NFT appears in user's wallet 
```

## 💰 Fee Management

**Set new mint fee:**
```bash
cd contracts
pnpm tsx scripts/set-fee.ts \
  --addr EQD4K... \
  --fee 1.5
```

**Withdraw collected fees:**
```bash
pnpm tsx scripts/withdraw.ts \
  --addr EQD4K... \
  --to <your-wallet> \
  --amount 10
```

## 🔐 Security

- Private keys never leave user's wallet
- TON Connect handles all signatures
- Smart contract enforces minimum payment
- Only owner can set fees and withdraw
- Client-side validation before transactions

## 🧪 Testing Checklist

### Testnet Flow
- [ ] Deploy contracts to testnet
- [ ] Fund deployer wallet from [testgiver bot](https://t.me/testgiver_ton_bot)
- [ ] Connect wallet in app
- [ ] Upload image (<5MB)
- [ ] Mint NFT (pay testnet TON)
- [ ] View NFT in [testnet explorer](https://testnet.tonviewer.com)
- [ ] NFT appears in Tonkeeper (testnet mode)

### Edge Cases
- [ ] Reject transaction → proper error message
- [ ] Insufficient balance → wallet shows error
- [ ] Invalid file type → validation error
- [ ] Large file (>5MB) → validation error
- [ ] Set fee → fee updates correctly
- [ ] Withdraw → funds received

## 📊 Gas Constants

Defined in `contracts/NftCollection.tact`:

```tact
const GAS_BUFFER: Int = 50000000;        // 0.05 TON
const DEPLOY_ITEM_VALUE: Int = 300000000; // 0.3 TON
const MIN_TON_RESERVE: Int = 10000000;   // 0.01 TON
```

Adjust based on real-world testing!

## 📂 Production Deployment

### Contracts (Mainnet)
```bash
cd contracts
npm tsx scripts/deploy-collection.ts --fee 1 --mainnet
```

### Full Stack - Render.com (Recommended)

**One-click deploy:**
1. Push code to GitHub
2. Connect to Render.com
3. Create a new Web Service
4. Set build command: `npm install && npm run build`
5. Set start command: `npm start`
6. Set environment variables in Render Dashboard

**Environment Variables for Render:**
```
VITE_API_WALLET_ADDRESS=EQD... # API wallet address to receive payments
VITE_TON_COLLECTION_ADDRESS=EQD... # Collection address
VITE_MINT_PRICE_NANOTON=500000000 # 0.5 TON
VITE_WEB3STORAGE_TOKEN=YOUR_TOKEN # IPFS token
VITE_NETWORK=mainnet # or testnet
```

**See detailed guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)

**Deployment checklist:**
- Deploy contracts to mainnet first
- Update `VITE_TON_COLLECTION_ADDRESS`
- Set `VITE_NETWORK=mainnet`
- Update TON Connect manifest URL
- Configure Telegram bot URL in BotFather

## 🐛 Troubleshooting

**Contract deployment fails:**
- Check deployer wallet has enough TON
- Verify mnemonic is correct (24 words)

**Transaction rejected by contract:**
- Ensure `VITE_MINT_PRICE_NANOTON` >= contract's `mintFee + gasBuffer`
- Check wallet balance

**IPFS upload fails:**
- Verify web3.storage token
- Check file size (<5MB)
- Check internet connection

**NFT not showing in wallet:**
- Wait a few minutes (blockchain confirmation)
- Check if wallet supports testnet NFTs
- Verify transaction on explorer

## 📚 Resources

- **TON Docs:** https://docs.ton.org
- **Tact Language:** https://tact-lang.org
- **TON Connect:** https://github.com/ton-connect
- **Telegram WebApps:** https://core.telegram.org/bots/webapps
- **Web3.Storage:** https://web3.storage

## 🎯 Roadmap (Future Enhancements)

- [ ] Read mint fee on-chain (instead of env)
- [ ] Multi-fee tiers based on file size
- [ ] Batch minting
- [ ] My NFTs page (user's collection)
- [ ] Custom collection metadata
- [ ] Royalty support

## 📄 License

MIT

---

**Built with ❤️ for TON Ecosystem**
