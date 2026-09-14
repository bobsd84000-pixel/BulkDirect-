#!/bin/bash
set -e

REPO="https://github.com/bobsd84000-pixel/BulkDirect-"
INSTALL_DIR="${INSTALL_DIR:-.}"

echo "🚀 BulkDirect Installation"
echo "========================="

if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org/"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "❌ npm not found. Install Node.js from https://nodejs.org/"
  exit 1
fi

echo "✓ Node.js $(node -v)"
echo "✓ npm $(npm -v)"

if [ ! -d "$INSTALL_DIR/.git" ]; then
  echo ""
  echo "📦 Cloning BulkDirect..."
  git clone "$REPO" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
else
  cd "$INSTALL_DIR"
  echo ""
  echo "📦 Updating BulkDirect..."
  git pull origin main
fi

echo ""
echo "📚 Installing dependencies..."
npm install

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "  npm run dev      # Start development server"
echo "  npm run build    # Build for production"
echo "  npm run lint     # Run linter"
