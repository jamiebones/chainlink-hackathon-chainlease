# World ID Integration - Setup Guide

## ✅ Implementation Complete!

World ID is now fully integrated into ChainLease. Here's what was added:

## Features Implemented

1. **World ID Verification Widget** - `components/WorldIDVerify.tsx`
2. **Verification Page** - `/verify` route
3. **Backend API** - `/api/verify-world-id` for verification
4. **User Linking** - `/api/users/link-world-id` to connect wallets
5. **Database Storage** - Stores nullifier hashes to prevent reuse
6. **Navbar Link** - Quick access to verification

## Setup Steps

### 1. Get World ID Credentials

Visit: https://developer.worldcoin.org

1. Create an account
2. Create a new app
3. Copy your **App ID** 
4. Create an action called `verify-tenant`

### 2. Update Environment Variables

Edit `.env` and add your credentials:

```env
# World ID Configuration
NEXT_PUBLIC_WORLDCOIN_APP_ID=app_xxxxxxxxxxxx
NEXT_PUBLIC_WORLDCOIN_ACTION_ID=verify-tenant
WORLDCOIN_APP_ID=app_xxxxxxxxxxxx
WORLDCOIN_ACTION_ID=verify-tenant
```

### 3. Test the Integration

1. Start the dev server: `npm run dev`
2. Visit: http://localhost:3000/verify
3. Connect your wallet
4. Click "Verify with World ID"
5. Complete verification with World ID app

## How It Works

```
User Flow:
1. User connects wallet (RainbowKit)
2. User clicks "Verify with World ID"
3. IDKit widget opens
4. User scans QR with World ID app
5. Proof sent to /api/verify-world-id
6. API verifies with World ID servers
7. Nullifier hash saved to prevent reuse
8. Verification linked to wallet address
9. User marked as verified ✅
```

## Database Collections

### worldIdVerifications
```json
{
  "nullifier_hash": "0x...",
  "merkle_root": "0x...",
  "verification_level": "orb",
  "verified_at": "2026-02-19T...",
  "action": "verify-tenant"
}
```

### users (updated)
```json
{
  "address": "0x...",
  "worldIdNullifier": "0x...",
  "worldIdVerified": true,
  "worldIdVerifiedAt": "2026-02-19T..."
}
```

## Security Features

✅ **One person, one account** - Nullifier hash prevents duplicate verifications
✅ **Privacy preserved** - No personal information stored
✅ **Proof verification** - All proofs verified with World ID servers
✅ **Sybil resistance** - Orb-level verification required

## Testing

### Development/Staging Mode
The default setup uses staging App ID for testing without real World ID verification.

### Production Mode
Replace with production App ID from World ID Developer Portal for live verification.

## API Endpoints

- `POST /api/verify-world-id` - Verify World ID proof
- `POST /api/users/link-world-id` - Link verification to wallet

## UI Pages

- `/verify` - Verification page with World ID widget
- `/` - Home page with verification CTA
- Navbar includes "🌍 Verify Identity" link

## Recommended Flow

1. User signs up → connects wallet
2. User verifies with World ID
3. User can now access full platform features
4. Landlords can require verified tenants only

## Next Steps

- [ ] Add verification badge to user profiles
- [ ] Require verification for certain actions (create lease, etc.)
- [ ] Add verification status to property listings
- [ ] Show verification stats on dashboard

## Resources

- World ID Docs: https://docs.worldcoin.org
- IDKit React: https://docs.worldcoin.org/idkit
- Developer Portal: https://developer.worldcoin.org
