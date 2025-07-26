#!/bin/bash

echo "🚀 Starting Pump Swap Bot..."

# Check if config file exists
if [ ! -f "config/config.json" ]; then
    echo "❌ Error: config/config.json not found!"
    exit 1
fi

echo "✅ Config file found"

# Start Rust backend in background
echo "🔧 Starting Rust API server..."
cargo run --release &
RUST_PID=$!

# Wait a moment for Rust server to start
sleep 3

# Check if Rust server is running
if curl -s http://127.0.0.1:8080/health > /dev/null; then
    echo "✅ Rust API server is running"
else
    echo "⚠️  Rust API server may not be ready yet"
fi

# Start Node.js frontend
echo "🤖 Starting Telegram bot..."
npm start

# Cleanup function
cleanup() {
    echo "🛑 Shutting down..."
    kill $RUST_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait 