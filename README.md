# 🚀 Pump Swap Bot

**Professional Telegram Bot for Pump.Fun Token Creation and MEV-Protected Trading**

## 🎯 Overview

Pump Swap Bot is a professional Telegram bot that enables users to create tokens on Pump.Fun and execute MEV-protected trading transactions. Built with Rust for backend performance and TypeScript for frontend flexibility.

## ✨ Features

- ✅ **Full Pump.Fun Integration** - Real Solana transactions with proper instruction serialization
- ✅ **Real Solana RPC Integration** - Live blockchain data and transaction submission
- ✅ **MEV-Protected Trading** - Jito bundle submission for optimal execution
- ✅ **Multi-Wallet Support** - Secure wallet management with encryption
- ✅ **Professional UI** - Intuitive Telegram interface with inline keyboards
- ✅ **Comprehensive Validation** - Token metadata and transaction validation
- ✅ **Bonding Curve Calculations** - Real-time price calculations
- ✅ **Error Handling** - Robust error handling and user feedback

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

pnpm run internal

cargo build --release

# Configure bot
cp config/config.example.json config/config.json
# Edit config/config.json with your settings

# Start bot (recommended)
./start-bot.sh

# Or start manually
cargo run --release &  # Backend
npm start             # Frontend
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
- Type "TestToken" - Creates a token with default metadata

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
│   ├── api_server.rs # REST API endpoints
│   ├── pump_fun.rs   # Pump.Fun integration with real transactions
│   ├── types.rs      # Data structures with Borsh serialization
│   └── main.rs       # Backend entry point
├── frontend/         # TypeScript frontend (Telegram bot)
│   ├── bot/          # Bot command and callback handlers
│   ├── utils/        # API client and utilities
│   ├── wallet/       # Wallet management
│   └── index.ts      # Frontend entry point
└── shared/           # Shared components
```

## 🧪 Testing

```bash
# Test API health
curl http://127.0.0.1:8080/health

# Test token creation (requires real SOL)
# Use the bot interface to create tokens

# Run integration tests
node tests/integration/test-real-integration.js
```

## 🚀 Development

```bash
# Build both frontend and backend
npm run build
cargo build --release

# Start development
./start-bot.sh

# Or start manually
cargo run --release &  # Backend on port 8080
npm start             # Frontend (Telegram bot)
```

## 🔧 Recent Updates

### v1.1.0 - Full Pump.Fun Integration

- ✅ **Real Solana Transactions** - No more mock data
- ✅ **Borsh Serialization** - Proper instruction data serialization
- ✅ **Bonding Curve Calculations** - Real-time price calculations
- ✅ **Comprehensive Validation** - Token metadata and transaction validation
- ✅ **Centralized Configuration** - All settings in config.json
- ✅ **Improved Error Handling** - Better user feedback and debugging
- ✅ **Unit Tests** - Validation and calculation tests

### Technical Improvements

- **Backend**: Full Pump.Fun client with real blockchain interactions
- **Frontend**: Fixed validation and type mismatches
- **Configuration**: Centralized in config.json
- **Deployment**: Easy start script with health checks

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.
