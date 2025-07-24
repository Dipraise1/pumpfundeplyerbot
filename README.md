# 🚀 Pump Swap Bot

**Professional Telegram Bot for Pump.Fun Token Creation and MEV-Protected Trading**

## 🎯 Overview

Pump Swap Bot is a professional Telegram bot that enables users to create tokens on Pump.Fun and execute MEV-protected trading transactions. Built with Rust for backend performance and TypeScript for frontend flexibility.

## ✨ Features

- ✅ **Real Solana RPC Integration** - Live blockchain data
- ✅ **Pump.Fun Token Creation** - Deploy tokens instantly
- ✅ **MEV-Protected Trading** - Jito bundle submission
- ✅ **Multi-Wallet Support** - Secure wallet management
- ✅ **Professional UI** - Intuitive Telegram interface

## 🚀 Quick Start

### Prerequisites
- **Rust** 1.70+ ([Install](https://rustup.rs/))
- **Node.js** 18+ ([Install](https://nodejs.org/))

### Installation
```bash
# Clone and setup
git clone <repository-url>
cd pumpswapbot

# Install dependencies
npm install
cargo build --release

# Configure bot
cp config/config.example.json config/config.json
# Edit config/config.json with your settings

# Start bot
./start-bot-with-env.sh
```

## 📱 Usage

### Bot Commands
- `/start` - Main menu
- `/create_wallet <name>` - Create wallet
- `/create <name> <symbol> <description> <image_url>` - Create token
- `/buy <token_address> <sol_amounts> <wallet_ids>` - Buy tokens
- `/sell <token_address> <token_amounts> <wallet_ids>` - Sell tokens
- `/balance` - Check balance
- `/help` - Get help

### Interactive Mode
- Type "MyWallet" - Creates a wallet
- Type "TestToken" - Creates a token

## 🔧 Configuration

Edit `config/config.json`:
```json
{
  "telegram_token": "your_telegram_bot_token",
  "solana_rpc_url": "https://api.mainnet-beta.solana.com",
  "jito_bundle_url": "https://mainnet-beta.api.jito.wtf/api/v1/bundles",
  "pump_fun_program_id": "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
  "fee_address": "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM",
  "fee_percentage": 0.008,
  "min_sol_amount": 0.02,
  "jito_tip_amount": 0.00001,
  "encryption_key": "your_secure_encryption_key"
}
```

## 🏗️ Architecture

```
src/
├── backend/          # Rust backend (API server, blockchain integration)
├── frontend/         # TypeScript frontend (Telegram bot)
└── shared/           # Shared components
```

## 🧪 Testing

```bash
# Test API
curl http://127.0.0.1:8080/health

# Run integration tests
node tests/integration/test-real-integration.js
```

## 🚀 Development

```bash
# Build
npm run build
cargo build --release

# Start development
./start-bot-with-env.sh
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details. # pumpfundeplyerbot
