import { Telegraf } from 'telegraf';
import { UserManager } from './bot/user-manager';
import { WalletManager } from './wallet/wallet-manager';
import { CommandHandler } from './bot/command-handler';
import { CallbackHandler } from './bot/callback-handler';
import { RustApiClient } from './utils/rust-api-client';
// import { DatabaseManager } from './database/database-manager';
import { BotConfig } from './types';

// Load configuration
const config: BotConfig = {
  telegramToken: process.env.TELEGRAM_TOKEN || '',
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  jitoBundleUrl: process.env.JITO_BUNDLE_URL || 'https://mainnet-beta.api.jito.wtf/api/v1/bundles',
  pumpFunProgramId: process.env.PUMP_FUN_PROGRAM_ID || '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  feeAddress: process.env.FEE_ADDRESS || 'CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM',
  feePercentage: parseFloat(process.env.FEE_PERCENTAGE || '0.008'),
  minSolAmount: parseFloat(process.env.MIN_SOL_AMOUNT || '0.02'),
  jitoTipAmount: parseFloat(process.env.JITO_TIP_AMOUNT || '0.00001'),
};

// Initialize components
const rustApiClient = new RustApiClient();
// const databaseManager = new DatabaseManager({
//   dataDir: './data',
//   backupInterval: 24 * 60 * 60 * 1000, // 24 hours
// });
const walletManager = new WalletManager(
  process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production',
  rustApiClient,
  config.solanaRpcUrl
);
const userManager = new UserManager();
const commandHandler = new CommandHandler(walletManager, userManager, rustApiClient, config);
const callbackHandler = new CallbackHandler(commandHandler, userManager);

// Create bot instance
const bot = new Telegraf(config.telegramToken);

// Health check for Rust API
async function checkApiHealth(): Promise<boolean> {
  try {
    return await rustApiClient.healthCheck();
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}

// Start command
bot.start(async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleStart(ctx, user);
});

// Help command
bot.help(async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleHelp(ctx, user);
});

// Wallet management commands
bot.command('wallet', async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleWallet(ctx, user);
});

bot.command('wallets', async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleWallets(ctx, user);
});

bot.command('create_wallet', async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleCreateWallet(ctx, user);
});

bot.command('import_wallet', async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleImportWallet(ctx, user);
});

// Token creation command
bot.command('create', async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleCreate(ctx, user);
});

// Trading commands
bot.command('buy', async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleBuy(ctx, user);
});

bot.command('sell', async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleSell(ctx, user);
});

// Balance and status commands
bot.command('balance', async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleBalance(ctx, user);
});

bot.command('status', async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleStatus(ctx, user);
});

// Handle callback queries
bot.on('callback_query', async (ctx) => {
  await callbackHandler.handleCallback(ctx);
});

// Handle unknown commands and text input
bot.on('text', async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleUnknownCommand(ctx, user);
});

// Error handling
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ An error occurred. Please try again later.');
});

// Launch bot
async function main() {
  try {
    console.log('Starting Pump Swap Bot...');
    
    // Check API health
    const apiHealthy = await checkApiHealth();
    if (apiHealthy) {
      console.log('✅ Rust API Status: Online');
    } else {
      console.log('⚠️ Rust API Status: Offline (some features may not work)');
    }

    // Start bot
    await bot.launch();
    console.log('✅ Telegram Bot: Online');
    console.log('🤖 Bot is ready to receive commands!');

    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));

  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

main(); 