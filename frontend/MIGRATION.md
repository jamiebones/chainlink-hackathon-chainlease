# ChainLease Next.js Migration Guide

## Migration Complete ✅

All backend APIs have been successfully migrated from Express to Next.js. The backend server is no longer needed.

## Structure

```
frontend/
├── app/
│   ├── api/
│   │   ├── credit-check/verify/    # Credit verification
│   │   ├── data/credit-checks/     # Credit check data storage
│   │   ├── users/                  # User management
│   │   ├── rent-payments/          # Rent payment tracking
│   │   ├── send-email/             # Email service
│   │   ├── notifications/          # Lease notifications
│   │   └── health/                 # Health check
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── lib/
│   ├── db.ts                       # MongoDB connection
│   └── email.ts                    # Email utilities
├── package.json
├── tsconfig.json
├── next.config.js
└── .env.example
```

## API Endpoints (Same URLs)

All endpoints remain the same:
- `POST /api/credit-check/verify` - Credit verification
- `POST /api/data/credit-checks` - Save credit check
- `GET /api/data/credit-checks/:leaseId` - Get credit check by lease
- `GET /api/data/credit-checks/tenant/:address` - Get all checks for tenant
- `POST /api/users/register` - Register user
- `GET /api/users/:address` - Get user by address
- `POST /api/rent-payments` - Record rent payment
- `GET /api/rent-payments/:leaseId` - Get payment history
- `POST /api/send-email` - Send email
- `POST /api/notifications/lease-activated` - Lease activation notification
- `GET /api/health` - Health check

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=chainlease
GMAIL_USERNAME=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
BACKEND_API_KEY=your_api_key_here
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_LEASE_AGREEMENT_ADDRESS=0x...
```

## Getting Started

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Set up environment:
```bash
cp .env.example .env
# Edit .env with your values
```

3. Run development server:
```bash
npm run dev
```

Server runs on http://localhost:3000

## CRE Workflow Configuration

Update your workflow config files to point to Next.js:

**Before** (old backend):
```json
{
  "creditCheckApi": {
    "endpoint": "http://localhost:3000/api/credit-check/verify"
  }
}
```

**After** (Next.js, same URL):
```json
{
  "creditCheckApi": {
    "endpoint": "http://localhost:3000/api/credit-check/verify"
  }
}
```

The URLs stay the same! Just make sure only the Next.js server is running.

## Benefits

✅ Single codebase for frontend and backend
✅ Full TypeScript support throughout
✅ Shared types between client and server
✅ Better developer experience
✅ Perfect for hackathon demos
✅ Easier deployment (one app instead of two)

## Next Steps

1. Install dependencies: `cd frontend && npm install`
2. Configure `.env` file
3. Start dev server: `npm run dev`
4. Stop old backend server if running
5. Test API endpoints
6. Build your frontend UI

## Deployment

For production:
```bash
npm run build
npm run start
```

Deploy to Vercel (recommended for Next.js):
```bash
vercel deploy
```
