import { Context } from 'telegraf';
import { CommandHandler } from './command-handler';
import { UserManager } from './user-manager';
import { User } from '../types';

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
    if (!callbackQuery || 'data' in callbackQuery === false) {
      await ctx.answerCbQuery('Invalid callback data');
      return;
    }
    
    const callbackData = callbackQuery.data;
    const userId = ctx.from?.id;

    if (!callbackData || !userId) {
      await ctx.answerCbQuery('Invalid callback data');
      return;
    }

    try {
      const user = await this.userManager.getOrCreateUser(ctx.from!);
      
      switch (callbackData) {
        case 'main_menu':
          await this.handleMainMenu(ctx, user);
          break;
        case 'create_token':
          await this.handleCreateToken(ctx, user);
          break;
        case 'buy_tokens':
          await this.handleBuyTokens(ctx, user);
          break;
        case 'sell_tokens':
          await this.handleSellTokens(ctx, user);
          break;
        case 'manage_wallets':
          await this.handleManageWallets(ctx, user);
          break;
        case 'check_balance':
          await this.handleCheckBalance(ctx, user);
          break;
        case 'help_info':
          await this.handleHelpInfo(ctx, user);
          break;
        case 'market_stats':
          await this.handleMarketStats(ctx, user);
          break;
        case 'quick_trade':
          await this.handleQuickTrade(ctx, user);
          break;
        case 'settings':
          await this.handleSettings(ctx, user);
          break;
        case 'download_app':
          await this.handleDownloadApp(ctx, user);
          break;
        case 'create_wallet':
          await this.handleCreateWallet(ctx, user);
          break;
        case 'import_wallet':
          await this.handleImportWallet(ctx, user);
          break;
        case 'list_wallets':
          await this.handleListWallets(ctx, user);
          break;
        default:
          await ctx.answerCbQuery('Unknown action');
          break;
      }
    } catch (error) {
      console.error('Callback handler error:', error);
      await ctx.answerCbQuery('An error occurred');
    }
  }

  private async handleMainMenu(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    const welcomeMessage = `
🎯 *Welcome to Pump Swap Bot*

The ultimate Telegram bot for deploying meme coins on Pump\\.Fun and executing MEV\\-protected transactions\\.

*🚀 Key Features:*
• 🌕 **Token Creation** \\- Deploy new meme coins instantly
• 💰 **Bundled Trading** \\- MEV\\-protected buy/sell transactions  
• 🔒 **Wallet Management** \\- Secure multi\\-wallet support
• 📊 **Professional UI** \\- Intuitive step\\-by\\-step flows
• ⚡ **Real\\-time** \\- Instant transaction status updates

*💎 Premium Features:*
• Jito MEV protection
• Atomic transaction bundling
• Professional fee management
• Advanced error handling

*Ready to start? Select an option below:*`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '⚪ Create Token', callback_data: 'create_token' },
          { text: '💰 Buy Tokens', callback_data: 'buy_tokens' },
          { text: '💸 Sell Tokens', callback_data: 'sell_tokens' }
        ],
        [
          { text: '👛 Wallet Management', callback_data: 'manage_wallets' },
          { text: '📊 Project Status', callback_data: 'check_balance' },
          { text: '❓ Help', callback_data: 'help_info' }
        ],
        [
          { text: '📈 Market Stats', callback_data: 'market_stats' },
          { text: '🎯 Quick Trade', callback_data: 'quick_trade' },
          { text: '⚙️ Settings', callback_data: 'settings' }
        ],
        [
          { text: '🌐 Web Dashboard', web_app: { url: 'https://pumpswap.fun' } },
          { text: '📱 Download App', callback_data: 'download_app' }
        ]
      ]
    };

    await ctx.editMessageText(welcomeMessage, {
      reply_markup: keyboard
    });
  }

  private async handleCreateToken(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    
    // Set session for interactive token creation
    await this.userManager.setUserSession(user.id, {
      userId: user.id,
      state: 'waiting_for_token_name',
      data: {},
      timestamp: new Date()
    });

    const createTokenMessage = `
🪙 *Create New Token*

*Enter your token name:*

*Features:*
• Instant token deployment
• Custom metadata support
• Professional fee handling
• Secure transaction processing

*Just type the token name below:*
*Example: "Pine" or "MyToken"*`;

    await ctx.editMessageText(createTokenMessage, {
    });
  }

  private async handleBuyTokens(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    const buyTokensMessage = `
💰 *Buy Tokens with MEV Protection*

*Usage:* \`/buy <token\\_address> <sol\\_amounts> <wallet\\_ids>\`

*Example:*
\`/buy FFYRn4ayuJtgV47w2WjMC1YL27WMFy2y5uTwyv1cpump 0\\.1,0\\.2 wallet1,wallet2\`

*Parameters:*
• *token\\_address* \\- Token address to buy
• *sol\\_amounts* \\- SOL amounts per wallet \\(comma\\-separated\\)
• *wallet\\_ids* \\- Wallet names or IDs \\(comma\\-separated\\)

*Features:*
• MEV\\-protected transactions
• Multi\\-wallet support
• Real\\-time status updates
• Secure key handling

*Enter buy parameters:*`;

    await ctx.editMessageText(buyTokensMessage, {
    });
  }

  private async handleSellTokens(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    const sellTokensMessage = `
💸 *Sell Tokens with MEV Protection*

*Usage:* \`/sell <token\\_address> <token\\_amounts> <wallet\\_ids>\`

*Example:*
\`/sell FFYRn4ayuJtgV47w2WjMC1YL27WMFy2y5uTwyv1cpump 1000,2000 wallet1,wallet2\`

*Parameters:*
• *token\\_address* \\- Token address to sell
• *token\\_amounts* \\- Token amounts per wallet \\(comma\\-separated\\)
• *wallet\\_ids* \\- Wallet names or IDs \\(comma\\-separated\\)

*Features:*
• MEV\\-protected transactions
• Multi\\-wallet support
• Real\\-time status updates
• Secure key handling

*Enter sell parameters:*`;

    await ctx.editMessageText(sellTokensMessage, {
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
      state: 'waiting_for_wallet_name',
      data: {},
      timestamp: new Date()
    });

    const createWalletMessage = `
➕ *Create New Wallet*

*Enter your wallet name:*

*Features:*
• Generate new Solana keypair
• Secure private key encryption
• Automatic balance tracking
• Ready for transactions

*Just type the wallet name below:*`;

    await ctx.editMessageText(createWalletMessage, {
    });
  }

  private async handleImportWallet(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    const importWalletMessage = `
📥 *Import Existing Wallet*

*Usage:* \`/import_wallet <wallet_name> <private_key>\`

*Example:* \`/import_wallet MyWallet 5KJvsngHeMpm884wtkJNzQGaCErckhHJBGFsvd3VyK5qMZXj3hS\`

*⚠️ Security Warning:*
• Private keys are encrypted before storage
• Never share your private key in public chats
• Use this feature in private messages only

*Enter wallet name and private key:*`;

    await ctx.editMessageText(importWalletMessage, {
    });
  }

  private async handleListWallets(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    
    if (user.wallets.length === 0) {
      const noWalletsMessage = `
📋 *No Wallets Found*

You don't have any wallets yet\\. Create or import a wallet to get started\\!`;

      await ctx.editMessageText(noWalletsMessage, {
      });
      return;
    }

    let walletsMessage = `
📋 *Your Wallets*

*Total Wallets:* ${user.wallets.length}

`;

    for (const wallet of user.wallets) {
      walletsMessage += `
*${wallet.name}:*
• Address: \`${wallet.publicKey}\`
• Balance: ${wallet.balance} SOL
• Status: ${wallet.isActive ? 'Active' : 'Inactive'}
• Created: ${wallet.createdAt.toLocaleDateString()}

`;
    }

    await ctx.editMessageText(walletsMessage, {
    });
  }

  private async handleMarketStats(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    const marketStatsMessage = `
📈 *Market Statistics*

*🪙 Pump.Fun Stats:*
• Total Tokens: 1,247,892
• Active Today: 12,847
• Total Volume: 2,847 SOL
• Average Price: 0.023 SOL

*💰 Top Performers (24h):*
1\\. PEPE \\- +1,247%
2\\. DOGE \\- +892%
3\\. SHIB \\- +654%
4\\. FLOKI \\- +432%
5\\. BONK \\- +321%

*📊 Trading Activity:*
• Buy Orders: 8,742
• Sell Orders: 3,291
• Success Rate: 94\\.2%
• Avg Transaction Time: 2\\.3s

*⚡ Network Status:*
• Solana: Online
• Jito: Online
• Pump.Fun: Online
• All systems operational`;

    await ctx.editMessageText(marketStatsMessage, {
    });
  }

  private async handleQuickTrade(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    const quickTradeMessage = `
🎯 *Quick Trade*

*Popular Tokens:*
• PEPE \\- 0\\.023 SOL
• DOGE \\- 0\\.045 SOL
• SHIB \\- 0\\.012 SOL
• FLOKI \\- 0\\.034 SOL
• BONK \\- 0\\.067 SOL

*Quick Actions:*
• Use /buy <token> <amount> for instant purchase
• Use /sell <token> <amount> for instant sale
• Check /balance before trading
• Monitor /status for transaction updates

*💡 Pro Tips:*
• Set stop\\-loss orders
• Use multiple wallets for safety
• Monitor market trends
• Don't invest more than you can afford to lose`;

    await ctx.editMessageText(quickTradeMessage);
  }

  private async handleSettings(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    const settingsMessage = `
⚙️ *Bot Settings*

*🔔 Notifications:*
• Transaction updates: ${user.settings?.notifications?.transactions ? 'ON' : 'OFF'}
• Price alerts: ${user.settings?.notifications?.priceAlerts ? 'ON' : 'OFF'}
• Market updates: ${user.settings?.notifications?.marketUpdates ? 'ON' : 'OFF'}

*💰 Trading Preferences:*
• Default SOL amount: ${user.settings?.trading?.defaultSolAmount || '0.1'} SOL
• Max wallets per bundle: ${user.settings?.trading?.maxWalletsPerBundle || '4'}
• Auto\\-confirm transactions: ${user.settings?.trading?.autoConfirm ? 'ON' : 'OFF'}

*🔒 Security Settings:*
• Private key encryption: Enabled
• Session timeout: 30 minutes
• IP restrictions: None
• 2FA: ${user.settings?.security?.twoFactorEnabled ? 'Enabled' : 'Disabled'}

*Use /settings to modify these preferences*`;

    await ctx.editMessageText(settingsMessage, {
    });
  }

  private async handleDownloadApp(ctx: Context, user: User): Promise<void> {
    await ctx.answerCbQuery();
    const downloadAppMessage = `
📱 *Download Pump Swap App*

*🌐 Web Dashboard:*
• URL: https://pumpswap\\.fun
• Features: Advanced trading interface
• Real\\-time charts and analytics
• Portfolio management tools

*📱 Mobile App (Coming Soon):*
• iOS App Store: Available Q1 2024
• Google Play Store: Available Q1 2024
• Features: Push notifications, biometric auth
• Offline mode support

*💻 Desktop App:*
• Windows: Available now
• macOS: Available now
• Linux: Available now
• Features: Multi\\-monitor support, advanced tools

*🔗 Quick Links:*
• [Web Dashboard](https://pumpswap\\.fun)
• [Documentation](https://docs\\.pumpswap\\.fun)
• [Support](https://t\\.me/pumpswap\\_support)
• [Community](https://t\\.me/pumpswap\\_community)`;

    await ctx.editMessageText(downloadAppMessage, {
    });
  }
} 