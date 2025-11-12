# NFT Collection Scripts

Scripts for building, deploying, and managing TON NFT contracts.

## Prerequisites

1. Install dependencies:
```bash
pnpm install
```

2. Create `.env` file in `contracts/` directory:
```bash
DEPLOYER_MNEMONIC="your 24-word mnemonic phrase here"
TONCENTER_API_KEY=your_api_key_here  # Optional, for higher rate limits
```

## Available Scripts

### 1. Build Contracts

Compile Tact contracts to BOC format:

```bash
pnpm run build
# or
pnpm tsx scripts/build.ts
```

This will compile both `NftItem.tact` and `NftCollection.tact` and output build artifacts to `./build` directory.

### 2. Deploy Collection

Deploy NftCollection to testnet:

```bash
pnpm tsx scripts/deploy-collection.ts --fee 1
```

Deploy to mainnet:

```bash
pnpm tsx scripts/deploy-collection.ts --fee 1 --mainnet
```

**Options:**
- `--fee <amount>`: Initial mint fee in TON (default: 1)
- `--mainnet`: Deploy to mainnet instead of testnet

**Output:**
- Collection address (copy this to `app/.env`)
- Deployment info saved to `./output/NftCollection-deployment.json`

### 3. Set Mint Fee

Change the mint fee for an existing collection:

```bash
pnpm tsx scripts/set-fee.ts \
  --addr EQD4K... \
  --fee 1.5
```

**Options:**
- `--addr <address>`: Collection contract address (required)
- `--fee <amount>`: New mint fee in TON (required)
- `--mainnet`: Use mainnet

### 4. Withdraw Funds

Withdraw collected fees from collection to owner:

```bash
pnpm tsx scripts/withdraw.ts \
  --addr EQD4K... \
  --to EQB3... \
  --amount 5
```

**Options:**
- `--addr <address>`: Collection contract address (required)
- `--to <address>`: Recipient address (required)
- `--amount <ton>`: Amount to withdraw in TON (required)
- `--mainnet`: Use mainnet

## Gas Constants

All gas constants are defined at the top of `NftCollection.tact`:

```tact
const GAS_BUFFER: Int = 50000000;        // 0.05 TON - Buffer for computation
const DEPLOY_ITEM_VALUE: Int = 300000000; // 0.3 TON - Gas for NFT Item deployment
const MIN_TON_RESERVE: Int = 10000000;   // 0.01 TON - Min balance in collection
```

Adjust these values based on real-world testing and gas prices.

## Example Workflow

1. **Build contracts:**
```bash
pnpm run build
```

2. **Deploy collection to testnet:**
```bash
pnpm tsx scripts/deploy-collection.ts --fee 1
# Output: Collection address: EQD4K...
```

3. **Copy collection address to app/.env:**
```bash
cd ../app
echo "VITE_TON_COLLECTION_ADDRESS=EQD4K..." >> .env
```

4. **Test minting from web app**

5. **Check collection balance:**
Go to https://testnet.tonviewer.com/EQD4K...

6. **Withdraw collected fees:**
```bash
pnpm tsx scripts/withdraw.ts \
  --addr EQD4K... \
  --to <your-wallet> \
  --amount 5
```

## Testnet Resources

- **Testnet Faucet:** https://t.me/testgiver_ton_bot
- **Testnet Explorer:** https://testnet.tonviewer.com
- **Testnet Wallet:** Use Tonkeeper in testnet mode

## Troubleshooting

### "Insufficient payment" error when minting
- Increase `VITE_MINT_PRICE_NANOTON` in app/.env
- Or adjust `GAS_BUFFER` in NftCollection.tact

### Transaction timeout
- Network congestion - wait and retry
- Increase gas amount in scripts

### "Contract not found"
- Verify collection address is correct
- Check if contract is deployed on the correct network (testnet vs mainnet)

## Security Notes

⚠️ **Never commit your `.env` file with mnemonic!**

- Keep your mnemonic phrase secure
- Use separate wallets for testnet and mainnet
- Only owner can set fees and withdraw funds
- Frontend never handles private keys (uses TON Connect)
