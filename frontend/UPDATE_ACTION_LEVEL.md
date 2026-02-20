# Update World ID Action Verification Level

## You need to update your action settings in the Developer Portal

### Steps:

1. Go to: https://developer.worldcoin.org
2. Select your app (ChainLease)
3. Go to **Actions** tab
4. Find your `verify-tenant` action
5. Click **Edit** or **Settings**
6. Change **Verification Level** to: **Device**
   - NOT "Orb" (which requires physical verification)
7. Save changes

### Why?

- **Orb**: Requires visiting a physical World ID Orb location (rare)
- **Device**: Just needs the World ID app (what you have)

For hackathons, always use **Device** level.

After updating this setting, scan the QR code again and it will work!
