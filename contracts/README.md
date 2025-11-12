# TON NFT Smart Contracts

Tact-based smart contracts for NFT collection with on-chain mint fee collection.

## Contracts

### NftItem.tact
Individual NFT contract implementing TON NFT standard.

**Features:**
- Stores owner, index, collection address, and content URI
- Implements `get_nft_data()` for wallet compatibility
- Supports transfer (op: 0x5fcc3d14)
- Can be transferred by owner or collection

### NftCollection.tact
Main collection contract handling minting and fee collection.

**Features:**
- Mints new NFT items on-demand
- Enforces minimum payment (mintFee + gas buffer)
- Collects fees on-chain (no refund)
- Owner-only fee adjustment and withdrawal
- Tracks next NFT index

## Architecture

```
User Wallet
    ↓ (sends TON + mint request)
NftCollection
    ↓ (deploys with state_init)
NftItem → User becomes owner
```

## Gas Constants

Located at top of `NftCollection.tact`:

```tact
const GAS_BUFFER: Int = 50000000;        // 0.05 TON - computation buffer
const DEPLOY_ITEM_VALUE: Int = 300000000; // 0.3 TON - NFT deploy gas
const MIN_TON_RESERVE: Int = 10000000;   // 0.01 TON - min collection balance
```

**Adjust these based on real-world testing!**

## Deployment

### Prerequisites

1. Install dependencies:
```bash
pnpm install
```

2. Create `.env`:
```bash
cp .env.example .env
```

Add your deployer mnemonic:
```env
DEPLOYER_MNEMONIC="word1 word2 ... word24"
```

### Build Contracts

```bash
pnpm run build
```

This compiles both contracts and outputs to `./build/`

### Deploy to Testnet

```bash
pnpm tsx scripts/deploy-collection.ts --fee 1
```

**Output:**
```
📍 Collection Address: EQD4K...
💰 Mint Fee: 1 TON
✅ Deployment successful!
```

**Save this address!** You'll need it for the frontend.

### Deploy to Mainnet

```bash
pnpm tsx scripts/deploy-collection.ts --fee 1 --mainnet
```

⚠️ **Warning:** Make sure you've tested thoroughly on testnet first!

## Management

### Change Mint Fee

```bash
pnpm tsx scripts/set-fee.ts \
  --addr EQD4K... \
  --fee 1.5
```

This updates the on-chain mint fee. Remember to update `VITE_MINT_PRICE_NANOTON` in the app!

### Withdraw Collected Fees

```bash
pnpm tsx scripts/withdraw.ts \
  --addr EQD4K... \
  --to <recipient-address> \
  --amount 10
```

Withdraws 10 TON from collection to recipient address.

**Note:** Contract enforces minimum reserve (`MIN_TON_RESERVE`) to keep collection operational.

## Message Formats

### Mint Message

Sent from user wallet to NftCollection:

```tact
message Mint {
    to: Address;      // NFT recipient
    content: Cell;    // Metadata content cell
}
```

**Payment:** Must include `mintFee + DEPLOY_ITEM_VALUE + GAS_BUFFER` in nanoTON.

**Content Cell Format:**
```
prefix:uint8 = 0        // Off-chain content
metadataUri:string      // ipfs://... URI
```

### SetFee Message

Sent from owner to NftCollection:

```tact
message SetFee {
    newFee: Int as coins;
}
```

### Withdraw Message

Sent from owner to NftCollection:

```tact
message Withdraw {
    to: Address;
    amount: Int as coins;
}
```

## NFT Standard Compliance

### get_nft_data()

Returns:
```
(
    init:int1,              // -1 if initialized
    index:int256,           // NFT index in collection
    collection:address,     // Collection address
    owner:address,          // Current owner
    individual_content:cell // Metadata content
)
```

This ensures compatibility with:
- Tonkeeper wallet
- TON Explorer (tonviewer.com)
- TON NFT marketplaces

## Testing

### Unit Tests

```bash
pnpm test  # If tests are implemented
```

### Manual Testing Flow

1. **Deploy collection:**
   ```bash
   pnpm tsx scripts/deploy-collection.ts --fee 1
   ```

2. **Check collection on explorer:**
   ```
   https://testnet.tonviewer.com/EQD4K...
   ```

3. **Mint NFT from frontend app**

4. **Verify NFT created:**
   ```bash
   # Get NFT address by index
   ton-cli run get get_nft_address_by_index '{"index":0}'
   ```

5. **Check NFT on explorer:**
   ```
   https://testnet.tonviewer.com/<nft-address>
   ```

6. **Verify in wallet:**
   Open Tonkeeper → NFTs tab

## Troubleshooting

### Build Errors

**"Cannot find Tact compiler":**
```bash
pnpm install
```

**"Syntax error in Tact file":**
- Check Tact version compatibility
- Review syntax against [Tact docs](https://tact-lang.org)

### Deployment Errors

**"Insufficient balance":**
- Fund deployer wallet from [testgiver bot](https://t.me/testgiver_ton_bot)
- Need at least 1-2 TON for deployment

**"Transaction timeout":**
- Network congestion, retry
- Increase wait time in script

### Minting Errors

**"Insufficient payment":**
- User didn't send enough TON
- Frontend `VITE_MINT_PRICE_NANOTON` must be ≥ `mintFee + DEPLOY_ITEM_VALUE + GAS_BUFFER`

**"NFT not appearing in wallet":**
- Wait 1-2 minutes for blockchain confirmation
- Check transaction on explorer
- Verify wallet supports testnet NFTs

## Security Considerations

- ✅ Only owner can set fees and withdraw
- ✅ Minimum payment enforced by smart contract
- ✅ No refunds (prevents griefing attacks)
- ✅ Minimum reserve prevents collection from going broke
- ⚠️ Owner wallet mnemonic must be kept secure
- ⚠️ Test thoroughly on testnet before mainnet

## Gas Optimization Tips

1. **Reduce deployment gas:**
   - Minimize NftItem state variables
   - Use smaller cell references

2. **Reduce minting gas:**
   - Optimize content cell structure
   - Consider batching (future enhancement)

3. **Monitor real-world costs:**
   ```bash
   # Check collection balance
   ton-cli account <collection-address>
   ```

## Upgrade Path

Smart contracts on TON are immutable after deployment. To upgrade:

1. Deploy new collection contract
2. Update frontend to use new address
3. (Optional) Migrate NFTs if needed

For backward compatibility, consider:
- Versioning in collection metadata
- Proxy pattern (advanced)

## Resources

- **Tact Documentation:** https://tact-lang.org
- **TON NFT Standard:** https://github.com/ton-blockchain/TEPs/blob/master/text/0062-nft-standard.md
- **TON SDK:** https://github.com/ton-org/ton
- **Example NFTs:** https://testnet.getgems.io

## Support

For issues with:
- **Tact compiler:** https://github.com/tact-lang/tact
- **TON blockchain:** https://t.me/tondev
- **This project:** Open an issue on GitHub

---

**Happy Building! 🚀**
