# World ID - Proper Development Setup

## The Real Solution

The World ID simulator is NOT automatic in the widget. Here's what you actually need to do:

### Option 1: Use Developer Portal Testing (Recommended)

1. Go to: https://developer.worldcoin.org
2. Login with your account
3. Select your app: `app_staging_41da8f1baeaf9803f39968f4088be570`
4. Go to **Testing** or **Actions** tab
5. There you'll find a **Test Action** button
6. This lets you generate test proofs without scanning QR codes

### Option 2: Download World ID App (Real Testing)

**For Android:**
```
Download from: https://play.google.com/store/apps/details?id=com.worldcoin
```

**For iOS:**
```
Download from: https://apps.apple.com/app/worldcoin/id1560859543
```

**IMPORTANT:** 
- Use the PRODUCTION World ID app (not staging)
- Production app works with staging App IDs for testing
- Scan the QR code from your verify page
- Complete the flow in the app

### Option 3: Use World ID Simulator (Advanced)

The simulator is a separate tool, not built into IDKit:

1. Go to: https://simulator.worldcoin.org
2. This is a web-based simulator
3. You'll need to integrate it differently than the widget

## Why There's No "Simulator" Button in the Widget

The IDKit widget expects:
1. A real World ID app to scan the QR
2. OR testing through the Developer Portal
3. The "simulator" option was removed/changed in newer versions

## What to Do Right Now

**Fastest solution for hackathon:**

1. Download World ID app on your phone: https://worldcoin.org/download
2. Open the app
3. Scan the QR code from http://localhost:3000/verify
4. Complete verification

The production app works perfectly with your staging App ID for testing.

## Alternative: Mock Verification (For Demo Only)

If you just need to demo the feature without real verification, I can:
1. Add a "Skip Verification (Dev Only)" button
2. Mock the verification response
3. Let you proceed without scanning

Let me know which approach you want to take.
