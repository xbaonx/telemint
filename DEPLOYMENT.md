# Deployment Guide

## Deploy to Render.com (Recommended)

Render.com provides free static site hosting with auto HTTPS, perfect for Telegram Mini-Apps.

### Step 1: Prepare Repository

1. **Push code to GitHub:**
   ```bash
   cd /Users/baonguyen/CascadeProjects/ton-miniapp
   git init
   git add .
   git commit -m "Initial commit: TON NFT Mini-App"
   git remote add origin https://github.com/YOUR_USERNAME/ton-miniapp.git
   git push -u origin main
   ```

2. **Make build script executable:**
   ```bash
   chmod +x build.sh
   ```

### Step 2: Create Render Service

1. Go to https://render.com and sign up/login

2. Click **"New +"** → **"Static Site"**

3. Connect your GitHub repository

4. Configure settings:
   - **Name:** `ton-nft-miniapp`
   - **Branch:** `main`
   - **Build Command:** `cd app && npm install && npm run build`
   - **Publish Directory:** `app/dist`

5. **Add Environment Variables:**
   Click "Advanced" and add:
   ```
   VITE_TON_COLLECTION_ADDRESS=<your-collection-address>
   VITE_MINT_PRICE_NANOTON=1000000000
   VITE_WEB3STORAGE_TOKEN=<your-token>
   VITE_NETWORK=testnet
   VITE_APP_NAME=Mint NFT
   VITE_TG_BOT_USERNAME=<your-bot-username>
   ```

6. Click **"Create Static Site"**

### Step 3: Wait for Deployment

Render will:
- Clone your repo
- Run build command
- Deploy to CDN
- Provide HTTPS URL (e.g., `https://ton-nft-miniapp.onrender.com`)

Usually takes 2-5 minutes.

### Step 4: Configure Telegram Bot

1. Copy your Render URL (e.g., `https://ton-nft-miniapp.onrender.com`)

2. Open [@BotFather](https://t.me/botfather):
   ```
   /mybots
   → Select your bot
   → Bot Settings
   → Menu Button
   → Edit Menu Button URL
   → Paste: https://ton-nft-miniapp.onrender.com
   ```

3. Test by opening your bot in Telegram!

### Step 5: Create TON Connect Manifest

After deployment, create manifest file:

1. Create `app/public/tonconnect-manifest.json`:
   ```json
   {
     "url": "https://ton-nft-miniapp.onrender.com",
     "name": "TON NFT Minting",
     "iconUrl": "https://ton-nft-miniapp.onrender.com/icon.png",
     "termsOfUseUrl": "https://ton-nft-miniapp.onrender.com/terms",
     "privacyPolicyUrl": "https://ton-nft-miniapp.onrender.com/privacy"
   }
   ```

2. Update `app/src/main.tsx`:
   ```typescript
   const manifestUrl = 'https://ton-nft-miniapp.onrender.com/tonconnect-manifest.json';
   ```

3. Commit and push → Render auto-redeploys

## Alternative: Render Blueprint (One-Click Deploy)

Use `render.yaml` for instant deployment:

1. Fork/clone this repo to GitHub

2. Go to https://dashboard.render.com/select-repo

3. Select repository → Render auto-detects `render.yaml`

4. Add environment variables

5. Click "Create" → Auto deploys!

## Continuous Deployment

Render automatically redeploys when you push to `main` branch:

```bash
# Make changes
git add .
git commit -m "Update feature"
git push

# Render will auto-deploy within 2-3 minutes
```

## Custom Domain (Optional)

1. In Render dashboard → Settings → Custom Domain

2. Add your domain (e.g., `mint.yourdomain.com`)

3. Update DNS records as instructed

4. Update Telegram bot URL and manifest

## Monitoring

**Check deployment status:**
- Dashboard: https://dashboard.render.com
- Logs: Click service → "Logs" tab
- Build history: "Events" tab

**Common issues:**
- Build fails → Check build logs
- Blank page → Check browser console
- Env vars not working → Redeploy after adding

## Cost

- **Static Sites:** FREE (100 GB bandwidth/month)
- **Auto SSL:** FREE
- **Custom Domain:** FREE
- **CDN:** FREE

Render free tier is perfect for MVP and testing!

## Production Checklist

Before deploying to mainnet:

- [ ] Deploy contracts to mainnet
- [ ] Update `VITE_TON_COLLECTION_ADDRESS` to mainnet address
- [ ] Change `VITE_NETWORK=mainnet`
- [ ] Test thoroughly on testnet first
- [ ] Update TON Connect manifest URL
- [ ] Add proper icon and branding
- [ ] Create terms of service
- [ ] Create privacy policy
- [ ] Monitor transaction costs
- [ ] Set up error tracking (e.g., Sentry)

## Other Deployment Options

### Vercel
```bash
npm install -g vercel
cd app
vercel
```

### Netlify
```bash
npm install -g netlify-cli
cd app
npm run build
netlify deploy --prod --dir=dist
```

### Cloudflare Pages
- Connect GitHub repo
- Build: `cd app && npm run build`
- Output: `app/dist`

All provide free HTTPS hosting suitable for Telegram Mini-Apps!

## Troubleshooting

### "Site not loading in Telegram"
- Verify HTTPS (Telegram requires it)
- Check X-Frame-Options headers
- Test URL in regular browser first

### "Environment variables not working"
- Restart build after adding env vars
- Check variable names start with `VITE_`
- Verify .env.example has all required vars

### "TON Connect not working"
- Create and host tonconnect-manifest.json
- Use correct manifest URL
- Check console for errors

### Build fails
```bash
# Test build locally first
cd app
npm install
npm run build
```

If local build works but Render fails, check:
- Node version (18+ required)
- All dependencies in package.json
- Build command is correct

---

**Happy Deploying! 🚀**
