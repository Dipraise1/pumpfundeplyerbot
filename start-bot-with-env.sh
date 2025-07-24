#!/bin/bash

# Pump Swap Bot - Environment Setup Script
# This script reads the config file and sets environment variables

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if config file exists
if [ ! -f "config/config.json" ]; then
    print_error "Config file not found: config/config.json"
    exit 1
fi

print_status "Reading configuration from config/config.json..."

# Extract values from config file using jq (if available) or simple parsing
if command -v jq &> /dev/null; then
    TELEGRAM_TOKEN=$(jq -r '.telegram_token' config/config.json)
    SOLANA_RPC_URL=$(jq -r '.solana_rpc_url' config/config.json)
    JITO_BUNDLE_URL=$(jq -r '.jito_bundle_url' config/config.json)
    PUMP_FUN_PROGRAM_ID=$(jq -r '.pump_fun_program_id' config/config.json)
    FEE_ADDRESS=$(jq -r '.fee_address' config/config.json)
    FEE_PERCENTAGE=$(jq -r '.fee_percentage' config/config.json)
    MIN_SOL_AMOUNT=$(jq -r '.min_sol_amount' config/config.json)
    JITO_TIP_AMOUNT=$(jq -r '.jito_tip_amount' config/config.json)
    ENCRYPTION_KEY=$(jq -r '.encryption_key' config/config.json)
else
    # Simple parsing without jq
    TELEGRAM_TOKEN=$(grep '"telegram_token"' config/config.json | cut -d'"' -f4)
    SOLANA_RPC_URL=$(grep '"solana_rpc_url"' config/config.json | cut -d'"' -f4)
    JITO_BUNDLE_URL=$(grep '"jito_bundle_url"' config/config.json | cut -d'"' -f4)
    PUMP_FUN_PROGRAM_ID=$(grep '"pump_fun_program_id"' config/config.json | cut -d'"' -f4)
    FEE_ADDRESS=$(grep '"fee_address"' config/config.json | cut -d'"' -f4)
    FEE_PERCENTAGE=$(grep '"fee_percentage"' config/config.json | cut -d'"' -f4)
    MIN_SOL_AMOUNT=$(grep '"min_sol_amount"' config/config.json | cut -d'"' -f4)
    JITO_TIP_AMOUNT=$(grep '"jito_tip_amount"' config/config.json | cut -d'"' -f4)
    ENCRYPTION_KEY=$(grep '"encryption_key"' config/config.json | cut -d'"' -f4)
fi

# Validate required values
if [ -z "$TELEGRAM_TOKEN" ] || [ "$TELEGRAM_TOKEN" = "YOUR_TELEGRAM_BOT_TOKEN_HERE" ]; then
    print_error "Invalid or missing TELEGRAM_TOKEN in config file"
    exit 1
fi

print_success "Configuration loaded successfully"
print_status "Telegram Token: ${TELEGRAM_TOKEN:0:10}..."
print_status "Solana RPC URL: $SOLANA_RPC_URL"
print_status "Pump.Fun Program ID: $PUMP_FUN_PROGRAM_ID"

# Build the project
print_status "Building project..."
npm run build
cargo build --release

print_success "Build completed"

# Start the bot with environment variables
print_status "Starting Pump Swap Bot with environment variables..."

export TELEGRAM_TOKEN="$TELEGRAM_TOKEN"
export SOLANA_RPC_URL="$SOLANA_RPC_URL"
export JITO_BUNDLE_URL="$JITO_BUNDLE_URL"
export PUMP_FUN_PROGRAM_ID="$PUMP_FUN_PROGRAM_ID"
export FEE_ADDRESS="$FEE_ADDRESS"
export FEE_PERCENTAGE="$FEE_PERCENTAGE"
export MIN_SOL_AMOUNT="$MIN_SOL_AMOUNT"
export JITO_TIP_AMOUNT="$JITO_TIP_AMOUNT"
export ENCRYPTION_KEY="$ENCRYPTION_KEY"

print_success "Environment variables set"
print_status "Starting bot..."

# Start the bot
npm start 