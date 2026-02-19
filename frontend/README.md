# ChainLease Frontend

Full-stack Next.js application for the ChainLease decentralized real estate platform.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your MongoDB URI, Gmail credentials, etc.

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

- ✅ Full backend API integrated (credit checks, users, payments, notifications)
- ✅ MongoDB integration
- ✅ Gmail SMTP email service
- ✅ TypeScript throughout
- ✅ Tailwind CSS styling
- ✅ Web3/blockchain ready

## API Routes

All backend APIs are available at `/api/*`:

- `/api/health` - Health check
- `/api/credit-check/verify` - Credit verification
- `/api/data/credit-checks` - Credit check storage
- `/api/users/register` - User registration
- `/api/rent-payments` - Payment tracking
- `/api/send-email` - Email service
- `/api/notifications/lease-activated` - Notifications

## Environment Variables

Required in `.env`:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=chainlease
GMAIL_USERNAME=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password
BACKEND_API_KEY=your-secret-key
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_LEASE_AGREEMENT_ADDRESS=0x...
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
app/
├── api/              # API routes (backend)
├── layout.tsx        # Root layout
├── page.tsx          # Home page
└── globals.css       # Global styles

lib/
├── db.ts            # MongoDB utilities
└── email.ts         # Email utilities
```

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: MongoDB
- **Email**: Nodemailer + Gmail SMTP
- **Web3**: viem, wagmi

## Development

This app replaces the previous separate Express backend. All APIs are now Next.js API routes.

See [MIGRATION.md](./MIGRATION.md) for migration details.
