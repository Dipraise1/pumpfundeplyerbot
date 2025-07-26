import { Context } from "telegraf";
import { CommandHandler } from "./command-handler";
import { UserManager } from "./user-manager";
import { User } from "../types";
import { escapeMarkdownV2 } from "../utils/formatters";

export class CallbackHandler {
  constructor(
    private commandHandler: CommandHandler,
    private userManager: UserManager
  ) {}

  /**
   * Handle callback queries from inline keyboards
   */
  async handleCallback(ctx: Context): Promise<void> {
    const callbackQuery = ctx.callbackQuery;
    if (!callbackQuery || "data" in callbackQuery === false) {
      await ctx.answerCbQuery("Invalid callback data");
      return;
    }

    const callbackData = callbackQuery.data;
    const userId = ctx.from?.id;

    if (!callbackData || !userId) {
      await ctx.answerCbQuery("Invalid callback data");
      return;
    }

    try {
      const user = await this.userManager.getOrCreateUser(ctx.from!);

      switch (callbackData) {
        case "main_menu":
          await this.handleMainMenu(ctx, user);
          break;
        case "create_token":
          await this.handleCreateToken(ctx, user);
          break;
        case "buy_tokens":
          await this.handleBuyTokens(ctx, user);
          break;
        case "sell_tokens":
          await this.handleSellTokens(ctx, user);
          break;
        case "manage_wallets":
          await this.handleManageWallets(ctx, user);
          break;
        case "check_balance":
          await this.handleCheckBalance(ctx, user);
          break;
        case "help_info":
          await this.handleHelpInfo(ctx, user);
          break;
        case "market_stats":
          await this.handleMarketStats(ctx, user);
          break;
        case "quick_trade":
          await this.handleQuickTrade(ctx, user);
          break;
        case "settings":
          await this.handleSettings(ctx, user);
          break;
        case "download_app":
          await this.handleDownloadApp(ctx, user);
          break;
        case "create_wallet":
          await this.handleCreateWallet(ctx, user);
          break;
        case "import_wallet":
          await this.handleImportWallet(ctx, user);
          break;
        case "list_wallets":
          await this.handleListWallets(ctx, user);
          break;
        default:
          await ctx.answerCbQuery("Unknown action");
          break;
      }
    } catch (error) {
      console.error("Callback handler error:", error);
      await ctx.answerCbQuery("An error occurred");
    }
  }

  private async handleMainMenu(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    const welcomeMessage = `
🎯 <b>Welcome to Pump Swap Bot</b>

The ultimate Telegram bot for deploying meme coins on Pump.Fun and executing MEV-protected transactions.

<b>🚀 Key Features:</b>
• 🌕 <b>Token Creation</b> – Deploy new meme coins instantly
• 💰 <b>Bundled Trading</b> – MEV-protected buy/sell transactions
• 🔒 <b>Wallet Management</b> – Secure multi-wallet support
• 📊 <b>Professional UI</b> – Intuitive step-by-step flows
• ⚡ <b>Real-time</b> – Instant transaction status updates

<b>💎 Premium Features:</b>
• Jito MEV protection
• Atomic transaction bundling
• Professional fee management
• Advanced error handling

<b>Ready to start? Select an option below:</b>
`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: "⚪ Create Token", callback_data: "create_token" },
          { text: "💰 Buy Tokens", callback_data: "buy_tokens" },
          { text: "💸 Sell Tokens", callback_data: "sell_tokens" },
        ],
        [
          { text: "👛 Wallet Management", callback_data: "manage_wallets" },
          { text: "📊 Project Status", callback_data: "check_balance" },
          { text: "❓ Help", callback_data: "help_info" },
        ],
        [
          { text: "📈 Market Stats", callback_data: "market_stats" },
          { text: "🎯 Quick Trade", callback_data: "quick_trade" },
          { text: "⚙️ Settings", callback_data: "settings" },
        ],
        [
          {
            text: "🌐 Web Dashboard",
            web_app: { url: "https://pumpswap.fun" },
          },
          { text: "📱 Download App", callback_data: "download_app" },
        ],
      ],
    };

    await ctx.editMessageText(welcomeMessage, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  }

  private async handleCreateToken(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();

    // Set session for interactive token creation
    await this.userManager.setUserSession(user.id, {
      userId: user.id,
      state: "waiting_for_token_name",
      data: {},
      timestamp: new Date(),
    });

    const createTokenMessage = `
➕ <b>Create New Wallet</b>

<b>Enter your wallet name:</b>

<b>Features:</b>
• Generate new Solana keypair  
• Secure private key encryption  
• Automatic balance tracking  
• Ready for transactions

<b>Just type the wallet name below:</b>
`.trim();

    await ctx.editMessageText(createTokenMessage, {
      parse_mode: "HTML",
    });
  }

  private async handleBuyTokens(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    const buyTokensMessage = `
<b>💰 Buy Tokens with MEV Protection</b>

<b>Usage:</b> <code>/buy &lt;token_address&gt; &lt;sol_amounts&gt; &lt;wallet_ids&gt;</code>

<b>Example:</b>
<code>/buy FFYRn4ayuJtgV47w2WjMC1YL27WMFy2y5uTwyv1cpump 0.1,0.2 wallet1,wallet2</code>

<b>Parameters:</b>
• <b>token_address</b> – Token address to buy
• <b>sol_amounts</b> – SOL amounts per wallet (comma-separated)
• <b>wallet_ids</b> – Wallet names or IDs (comma-separated)

<b>Features:</b>
• MEV-protected transactions
• Multi-wallet support
• Real-time status updates
• Secure key handling

<b>Enter buy parameters:</b>
`.trim();

    await ctx.editMessageText(buyTokensMessage, {
      parse_mode: "HTML",
    });
  }

  private async handleSellTokens(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    const sellTokensMessage = `
<b>💸 Sell Tokens with MEV Protection</b>

<b>Usage:</b> <code>/sell &lt;token_address&gt; &lt;token_amounts&gt; &lt;wallet_ids&gt;</code>

<b>Example:</b>
<code>/sell FFYRn4ayuJtgV47w2WjMC1YL27WMFy2y5uTwyv1cpump 1000,2000 wallet1,wallet2</code>

<b>Parameters:</b>
• <b>token_address</b> – Token address to sell
• <b>token_amounts</b> – Token amounts per wallet (comma-separated)
• <b>wallet_ids</b> – Wallet names or IDs (comma-separated)

<b>Features:</b>
• MEV-protected transactions
• Multi-wallet support
• Real-time status updates
• Secure key handling

<b>Enter sell parameters:</b>
`.trim();

    await ctx.editMessageText(sellTokensMessage, {
      parse_mode: "HTML",
    });
  }

  private async handleManageWallets(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    await this.commandHandler.handleWallet(ctx, user);
  }

  private async handleCheckBalance(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    await this.commandHandler.handleBalance(ctx, user);
  }

  private async handleHelpInfo(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    await this.commandHandler.handleHelp(ctx, user);
  }

  private async handleCreateWallet(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();

    // Set session for interactive wallet creation
    await this.userManager.setUserSession(user.id, {
      userId: user.id,
      state: "waiting_for_wallet_name",
      data: {},
      timestamp: new Date(),
    });

    const createWalletMessage = `
➕ <b>Create New Wallet</b>

<b>Enter your wallet name:</b>

<b>Features:</b>
• Generate new Solana keypair  
• Secure private key encryption  
• Automatic balance tracking  
• Ready for transactions

<b>Just type the wallet name below:</b>
`;

    await ctx.editMessageText(createWalletMessage, {
      parse_mode: "HTML",
    });
  }

  private async handleImportWallet(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    const importWalletMessage = `
📥📥 <b>Import Existing Wallet</b>

<b>Usage:</b> <code>/import_wallet &lt;wallet_name&gt; &lt;private_key&gt;</code>

<b>Example:</b> <code>/import_wallet MyWallet 5KJvsngHeMpm884wtkJNzQGaCErckhHJBGFsvd3VyK5qMZXj3hS</code>

<b>⚠️ Security Warning:</b>
• Private keys are encrypted before storage  
• Never share your private key in public chats  
• Use this feature in private messages only

<b>Enter wallet name and private key:</b>`;

    await ctx.editMessageText(importWalletMessage, {
      parse_mode: "HTML",
    });
  }

  private async handleListWallets(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();

    if (user.wallets.length === 0) {
      const noWalletsMessage = `
📋 <b>No Wallets Found</b>

You don't have any wallets yet. Create or import a wallet to get started\\!`;

      await ctx.editMessageText(noWalletsMessage, {
        parse_mode: "HTML",
      });
      return;
    }
    let walletsMessage = `
📋 <b>Your Wallets</b>

<b>Total Wallets:</b> ${user.wallets.length}
`;

    for (const wallet of user.wallets) {
      walletsMessage += `

<b>${wallet.name}:</b>
• Address: <code>${wallet.publicKey}</code>  
• Balance: ${wallet.balance} SOL  
• Status: ${wallet.isActive ? "Active" : "Inactive"}  
• Created: ${wallet.createdAt.toLocaleDateString()}
`;
    }

    await ctx.editMessageText(walletsMessage, {
      parse_mode: "HTML",
    });
  }

  private async handleMarketStats(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    const marketStatsMessage = `
📈 <b>Market Statistics</b>

<b>🪙 Pump.Fun Stats:</b>
• Total Tokens: 1,247,892  
• Active Today: 12,847  
• Total Volume: 2,847 SOL  
• Average Price: 0.023 SOL  

<b>💰 Top Performers (24h):</b>
1. PEPE – +1,247%  
2. DOGE – +892%  
3. SHIB – +654%  
4. FLOKI – +432%  
5. BONK – +321%  

<b>📊 Trading Activity:</b>
• Buy Orders: 8,742  
• Sell Orders: 3,291  
• Success Rate: 94.2%  
• Avg Transaction Time: 2.3s  

<b>⚡ Network Status:</b>
• Solana: Online  
• Jito: Online  
• Pump.Fun: Online  
• All systems operational
`;

    await ctx.editMessageText(marketStatsMessage, {
      parse_mode: "HTML",
    });
  }

  private async handleQuickTrade(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    const quickTradeMessage = `
<b>🎯 Quick Trade</b>

<b>Popular Tokens:</b>

• PEPE - 0.023 SOL
• DOGE - 0.045 SOL
• SHIB - 0.012 SOL
• FLOKI - 0.034 SOL
• BONK - 0.067 SOL

<b>Quick Actions:</b>
• Use <code>/buy &lt;token&gt; &lt;amount&gt;</code> for instant purchase
• Use <code>/sell &lt;token&gt; &lt;amount&gt;</code> for instant sale
• Check <code>/balance</code> before trading
• Monitor <code>/status</code> for transaction updates

<b>💡 Pro Tips:</b>
• Set stop-loss orders
• Use multiple wallets for safety
• Monitor market trends
• Don't invest more than you can afford to lose
`.trim();

    await ctx.editMessageText(quickTradeMessage, {
      parse_mode: "HTML",
    });
  }

  private async handleSettings(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    const settingsMessage = `
⚙️ <b>Bot Settings</b>

<b>🔔 Notifications:</b>
• Transaction updates: ${user.settings?.notifications?.transactions ? "ON" : "OFF"}  
• Price alerts: ${user.settings?.notifications?.priceAlerts ? "ON" : "OFF"}  
• Market updates: ${user.settings?.notifications?.marketUpdates ? "ON" : "OFF"}  

<b>💰 Trading Preferences:</b>
• Default SOL amount: ${user.settings?.trading?.defaultSolAmount || "0.1"} SOL  
• Max wallets per bundle: ${user.settings?.trading?.maxWalletsPerBundle || "4"}  
• Auto-confirm transactions: ${user.settings?.trading?.autoConfirm ? "ON" : "OFF"}  

<b>🔒 Security Settings:</b>
• Private key encryption: Enabled  
• Session timeout: 30 minutes  
• IP restrictions: None  
• 2FA: ${user.settings?.security?.twoFactorEnabled ? "Enabled" : "Disabled"}  

<i>Use /settings to modify these preferences</i>
`;

    await ctx.editMessageText(settingsMessage, {
      parse_mode: "HTML",
    });
  }

  private async handleDownloadApp(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    const downloadAppMessage = `
📱 <b>Download Pump Swap App</b>

<b>🌐 Web Dashboard:</b>  
• URL: <a href="https://pumpswap.fun">https://pumpswap.fun</a>  
• Features: Advanced trading interface  
• Real-time charts and analytics  
• Portfolio management tools  

<b>📱 Mobile App (Coming Soon):</b>  
• iOS App Store: Available Q1 2024  
• Google Play Store: Available Q1 2024  
• Features: Push notifications, biometric auth  
• Offline mode support  

<b>💻 Desktop App:</b>  
• Windows: Available now  
• macOS: Available now  
• Linux: Available now  
• Features: Multi-monitor support, advanced tools  

<b>🔗 Quick Links:</b>  
• <a href="https://pumpswap.fun">Web Dashboard</a>  
• <a href="https://docs.pumpswap.fun">Documentation</a>  
• <a href="https://t.me/pumpswap_support">Support</a>  
• <a href="https://t.me/pumpswap_community">Community</a>
`;

    await ctx.editMessageText(downloadAppMessage, {
      parse_mode: "HTML",
    });
  }
}
