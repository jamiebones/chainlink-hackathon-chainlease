# World ID Testing Guide

## Using World ID in Development (Staging Mode)

For hackathons and testing, you have **3 options**:

### Option 1: Built-in Simulator (Easiest ✅)
1. Click "Verify with World ID" button
2. In the popup, select **"Simulator"** option
3. Complete the simulated verification flow
4. No app installation needed!

### Option 2: Web Simulator
1. Go to: https://simulator.worldcoin.org
2. Scan the QR code from your verification widget
3. Complete verification in browser

### Option 3: Staging App (Mobile)
Download the staging version of World ID:

**Android:**
- Search "World App Staging" on Google Play
- Or visit: https://play.google.com/store/apps/details?id=org.worldcoin.staging

**iOS:**
- Join TestFlight: https://testflight.apple.com/join/[code]
- Install "World App Staging"

## Current Configuration

Your app is configured with:
```
NEXT_PUBLIC_WORLDCOIN_APP_ID=app_staging_...
```

The `app_staging_` prefix means you're in **staging mode** - perfect for testing!

## For Production

When ready to launch:

1. Create a production app at: https://developer.worldcoin.org
2. Update your `.env`:
   ```
   NEXT_PUBLIC_WORLDCOIN_APP_ID=app_[production_id]
   WORLDCOIN_APP_ID=app_[production_id]
   ```
3. Users will need the real World ID app and Orb verification

## Testing Steps

1. **Start your app**: `npm run dev`
2. **Go to**: http://localhost:3000/verify
3. **Connect wallet** with RainbowKit
4. **Click "Verify with World ID"**
5. **Choose "Simulator"** in the popup
6. **Complete the flow** ✅

That's it! No real verification needed during development.

## Troubleshooting

**"Cannot verify in staging mode"**
- Make sure your App ID starts with `app_staging_`
- Or use the simulator option

**"Simulator not showing"**
- Check that you're using a staging App ID
- Clear browser cache and try again

**Need help?**
- World ID Docs: https://docs.worldcoin.org
- Discord: https://discord.gg/worldcoin
