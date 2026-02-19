#!/bin/bash

# ChainLease Quick Setup Script

echo "🚀 ChainLease Next.js Setup"
echo "=========================="
echo ""

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the frontend directory"
    echo "   cd frontend && ./setup.sh"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your credentials:"
    echo "   - MONGODB_URI"
    echo "   - GMAIL_USERNAME"
    echo "   - GMAIL_APP_PASSWORD"
    echo "   - BACKEND_API_KEY"
    echo ""
else
    echo "✅ .env file already exists"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env with your credentials"
echo "2. Run: npm run dev"
echo "3. Open: http://localhost:3000"
echo ""
echo "Happy building! 🏗️"
