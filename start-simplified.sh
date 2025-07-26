#!/bin/bash

echo "🚀 Starting Pump Swap Bot..."

# Start Rust backend
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

# Cleanup function
cleanup() {
    echo "🛑 Shutting down..."
    kill $RUST_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM EXIT

# Start Telegram bot with tsx
pnpm run internal

# Wait for background processes
wait