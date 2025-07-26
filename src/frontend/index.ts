import { Telegraf } from "telegraf";
import { UserManager } from "./bot/user-manager";
import { WalletManager } from "./wallet/wallet-manager";
import { CommandHandler } from "./bot/command-handler";
import { CallbackHandler } from "./bot/callback-handler";
import { RustApiClient } from "./utils/rust-api-client";
// import { DatabaseManager } from './database/database-manager';
import { BotConfig } from "./types";
import * as fs from "fs";
import * as path from "path";

// Load configuration from config.json
function loadConfig(): BotConfig {
  try {
    const configPath = path.join(process.cwd(), "config", "config.json");
    const configContent = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(configContent);

    return {
      telegramToken: config.telegram_token,
      solanaRpcUrl: config.solana_rpc_url,
      jitoBundleUrl: config.jito_bundle_url,
      pumpFunProgramId: config.pump_fun_program_id,
      feeAddress: config.fee_address,
      feePercentage: config.fee_percentage,
      minSolAmount: config.min_sol_amount,
      jitoTipAmount: config.jito_tip_amount,
      encryptionKey: config.encryption_key, // Added encryption_key to config
    };
  } catch (error) {
    console.error("Failed to load config.json:", error);
    process.exit(1);
  }
}

// Load configuration
const config: BotConfig = loadConfig();

// Initialize components
const rustApiClient = new RustApiClient();
// const databaseManager = new DatabaseManager({
//   dataDir: './data',
//   backupInterval: 24 * 60 * 60 * 1000, // 24 hours
// });
const walletManager = new WalletManager(
  config.encryptionKey || "default-encryption-key-change-in-production",
  rustApiClient,
  config.solanaRpcUrl
);
const userManager = new UserManager();
const commandHandler = new CommandHandler(
  walletManager,
  userManager,
  rustApiClient,
  config
);
const callbackHandler = new CallbackHandler(commandHandler, userManager);

// Create bot instance
const bot = new Telegraf(config.telegramToken);

// Health check for Rust API
async function checkApiHealth(): Promise<boolean> {
  try {
    return await rustApiClient.healthCheck();
  } catch (error) {
    console.error("API health check failed:", error);
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
bot.command("wallet", async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleWallet(ctx, user);
});

bot.command("wallets", async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleWallets(ctx, user);
});

bot.command("create_wallet", async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleCreateWallet(ctx, user);
});

bot.command("import_wallet", async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleImportWallet(ctx, user);
});

// Token creation command
bot.command("create", async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleCreate(ctx, user);
});

// Trading commands
bot.command("buy", async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleBuy(ctx, user);
});

bot.command("sell", async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleSell(ctx, user);
});

// Balance and status commands
bot.command("balance", async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleBalance(ctx, user);
});

bot.command("status", async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleStatus(ctx, user);
});

// Handle callback queries
bot.on("callback_query", async (ctx) => {
  await callbackHandler.handleCallback(ctx);
});

// Handle unknown commands and text input
bot.on("text", async (ctx) => {
  const user = await userManager.getOrCreateUser(ctx.from!);
  await commandHandler.handleUnknownCommand(ctx, user);
});

// Error handling
bot.catch((err, ctx) => {
  console.error("Bot error:", err);
  ctx.reply("❌ An error occurred. Please try again later.");
});

// Launch bot
async function main() {
  try {
    console.log("Starting Pump Swap Bot...");

    // Check API health
    const apiHealthy = await checkApiHealth();
    if (apiHealthy) {
      console.log("✅ Rust API Status: Online");
    } else {
      console.log("⚠️ Rust API Status: Offline (some features may not work)");
    }

    // Start bot
    await bot.launch();
    console.log("✅ Telegram Bot: Online");
    console.log("🤖 Bot is ready to receive commands!");

    // Enable graceful stop
    process.once("SIGINT", () => bot.stop("SIGINT"));
    process.once("SIGTERM", () => bot.stop("SIGTERM"));
  } catch (error) {
    console.error("Failed to start bot:", error);
    process.exit(1);
  }
}

main();
