#!/bin/bash

echo "🚀 Starting Pump Swap Bot..."

# Start Rust backend
echo "🦀 Launching Rust API server..."
cargo run --release &
RUST_PID=$!

# Wait for the server to start (check every second up to 10 seconds)
for i in {1..100}; do
    if curl -s http://127.0.0.1:8080/health > /dev/null; then
        echo "✅ Rust API server is running on http://127.0.0.1:8080"
        break
    else
        echo "⏳ Waiting for Rust API to become healthy... (${i}s)"
        sleep 1
    fi
done

# Final check before continuing
if ! curl -s http://127.0.0.1:8080/health > /dev/null; then
    echo "❌ Rust API failed to start within timeout. Exiting."
    kill $RUST_PID 2>/dev/null
    exit 1
fi

# Cleanup function
cleanup() {
    echo "🛑 Shutting down..."
    kill $RUST_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM EXIT

# Start Telegram bot (Node backend)
echo "🤖 Launching Telegram Bot..."
pnpm run internal

# Wait for any background processes (like Rust)
wait