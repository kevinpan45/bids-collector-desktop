#!/bin/bash

echo "🔧 BIDS Collector Desktop - Development Setup"
echo "=============================================="
echo ""

# Check if cargo is installed
if ! command -v cargo &> /dev/null; then
    echo "❌ Rust/Cargo is not installed. Please install Rust first:"
    echo "   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi

echo "✅ Rust/Cargo found"

# Clear caches
echo "🧹 Clearing caches..."
rm -rf node_modules/.vite
rm -rf .svelte-kit
rm -rf src-tauri/target/debug

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

echo ""
echo "🚀 Setup complete! You can now run:"
echo "   - 'npm run dev' for frontend only (web browser)"
echo "   - 'npm run tauri:dev' for desktop app (may take 10-15 minutes on first run)"
echo ""
echo "💡 The storage page includes:"
echo "   - File system browser (works in Chrome-based browsers)"
echo "   - Local machine storage (limited to one location)"
echo "   - S3 service storage"
echo "   - Form validation and notifications"
