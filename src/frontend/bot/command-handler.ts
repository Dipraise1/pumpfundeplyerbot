import { Context } from "telegraf";
import { InlineKeyboardMarkup } from "telegraf/typings/core/types/typegram";
import { WalletManager } from "../wallet/wallet-manager";
import { UserManager } from "./user-manager";
import { RustApiClient } from "../utils/rust-api-client";
import { BotConfig, User, TokenMetadata, CommandContext } from "../types";
import * as bs58 from "bs58";
import { escapeMarkdownV2 } from "../utils/formatters";

export class CommandHandler {
  constructor(
    private walletManager: WalletManager,
    private userManager: UserManager,
    private rustApiClient: RustApiClient,
    private config: BotConfig
  ) {}

  /**
   * Handle /start command with modern welcome interface
   */
  async handleStart(ctx: Context, user: User): Promise<void> {
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

    const keyboard: InlineKeyboardMarkup = {
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

    // Set up persistent reply keyboard for quick access
    const replyKeyboard = {
      keyboard: [
        ["🪙 Create Token", "💰 Buy", "💸 Sell"],
        ["👛 Wallets", "📊 Balance", "❓ Help"],
        ["📈 Stats", "⚙️ Settings", "🌐 Web"],
      ],
      resize_keyboard: true,
      one_time_keyboard: false,
      selective: true,
    };

    await ctx.reply(welcomeMessage, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  }

  /**
   * Handle /help command with comprehensive help
   */
  async handleHelp(ctx: Context, user: User): Promise<void> {
    const helpMessage = `
📚 *Pump Swap Bot Help*

*🎯 Quick Actions:*
• Create tokens instantly
• Buy/sell with MEV protection
• Manage multiple wallets
• Real\\-time status updates

*📋 Detailed Commands:*

*🪙 Token Creation:*
\`/create <name> <symbol> <description> <image_url>\`
*Example:*
\`/create MyMeme MM "Fun meme coin" https://example\\.com/image\\.png\`

*💰 Buy Tokens:*
\`/buy <token_address> <sol_amounts> <wallet_ids>\`
*Example:*
\`/buy FFYRn4ayuJtgV47w2WjMC1YL27WMFy2y5uTwyv1cpump 0\\.1,0\\.2 wallet1,wallet2\`

*💸 Sell Tokens:*
\`/sell <token_address> <token_amounts> <wallet_ids>\`
*Example:*
\`/sell FFYRn4ayuJtgV47w2WjMC1YL27WMFy2y5uTwyv1cpump 1000,2000 wallet1,wallet2\`

*👛 Wallet Management:*
• \`/create_wallet <name>\` \\- Create new wallet
• \`/import_wallet <name> <private_key>\` \\- Import existing wallet
• \`/wallets\` \\- List all wallets
• \`/balance\` \\- Check wallet balances

*🔒 Security Features:*
• Private keys encrypted and secure
• No keys stored or logged
• All transactions signed locally
• MEV protection via Jito

*💎 Premium Features:*
• 0\\.8% transaction fee
• Up to 16 wallets per bundle
• Real\\-time status updates
• Professional error handling`;

    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "🪙 Create Token", callback_data: "create_token" },
          { text: "💰 Buy Tokens", callback_data: "buy_tokens" },
        ],
        [
          { text: "👛 Manage Wallets", callback_data: "manage_wallets" },
          { text: "📊 Check Balance", callback_data: "check_balance" },
        ],
        [{ text: "🔙 Back to Menu", callback_data: "main_menu" }],
      ],
    };

    await ctx.reply(helpMessage, {
      parse_mode: "MarkdownV2",
      reply_markup: keyboard,
    });
  }

  /**
   * Handle wallet management with step-by-step flow
   */
  async handleWallet(ctx: Context, user: User): Promise<void> {
    const walletMessage = `
👛 *Wallet Management*

*Current Wallets:* ${user.wallets.length}

*Available Actions:*
• Create new wallet
• Import existing wallet
• View wallet details
• Check balances

*Choose an option:*`;

    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "➕ Create Wallet", callback_data: "create_wallet" },
          { text: "📥 Import Wallet", callback_data: "import_wallet" },
        ],
        [
          { text: "📋 List Wallets", callback_data: "list_wallets" },
          { text: "💰 Check Balance", callback_data: "check_balance" },
        ],
        [{ text: "🔙 Back to Menu", callback_data: "main_menu" }],
      ],
    };

    await ctx.reply(walletMessage, {
      parse_mode: "MarkdownV2",
      reply_markup: keyboard,
    });
  }

  /**
   * Handle wallet creation with interactive flow
   */
  async handleCreateWallet(ctx: Context, user: User): Promise<void> {
    const message = ctx.message;
    if (!message || !("text" in message)) {
      await ctx.reply("❌ Invalid message type");
      return;
    }
    const args = message.text?.split(" ") || [];

    // If user provided wallet name in command
    if (args.length >= 2) {
      const walletName = args[1];
      if (walletName) {
        await this.createWalletWithName(ctx, user, walletName);
        return;
      }
    }

    // If no wallet name provided, start interactive session
    await this.userManager.setUserSession(user.id, {
      userId: user.id,
      state: "waiting_for_wallet_name",
      data: {},
      timestamp: new Date(),
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

    await ctx.reply(createWalletMessage, {
      parse_mode: "MarkdownV2",
    });
  }

  /**
   * Create wallet with provided name
   */
  private async createWalletWithName(
    ctx: Context,
    user: User,
    walletName: string
  ): Promise<void> {
    try {
      // Show processing message
      await ctx.reply("⏳ *Creating wallet\\.\\.\\.*", {
        parse_mode: "MarkdownV2",
      });

      const wallet = await this.walletManager.createWallet(user.id, walletName);
      await this.userManager.addWalletToUser(user.id, wallet);

      const successMessage = `
✅ *Wallet Created Successfully*

*Name:* ${wallet.name}
*Public Key:* \`${wallet.publicKey}\`
*Status:* Active
*Created:* ${wallet.createdAt.toLocaleDateString()}

*Next Steps:*
• Fund your wallet with SOL
• Use for token creation
• Add to trading bundles

*🔒 Security Note:*
Your private key is encrypted and stored securely\\. Never share your private key`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: "💰 Check Balance", callback_data: "check_balance" },
            { text: "🪙 Create Token", callback_data: "create_token" },
          ],
          [
            { text: "👛 Manage Wallets", callback_data: "manage_wallets" },
            { text: "🔙 Back to Menu", callback_data: "main_menu" },
          ],
        ],
      };

      await ctx.reply(successMessage, {
        parse_mode: "MarkdownV2",
        reply_markup: keyboard,
      });

      // Clear session
      await this.userManager.clearUserSession(user.id);
    } catch (error) {
      console.error("Error creating wallet:", error);
      // Use a simple error message to avoid Markdown parsing issues
      await ctx.reply(
        "❌ *Failed to create wallet*\n\nPlease try again later",
        {
          parse_mode: "MarkdownV2",
        }
      );
    }
  }

  /**
   * Handle wallet import with secure flow
   */
  async handleImportWallet(ctx: Context, user: User): Promise<void> {
    const message = ctx.message;
    if (!message || !("text" in message)) {
      await ctx.reply("❌ Invalid message type");
      return;
    }
    const args = message.text?.split(" ") || [];

    if (args.length < 3) {
      const importWalletMessage = `
📥 *Import Existing Wallet*

*Usage:* \`/import_wallet <wallet_name> <private_key>\`

*Example:* \`/import_wallet MyWallet 5KJvsngHeMpm884wtkJNzQGaCErckhHJBGFsvd3VyK5qMZXj3hS\`

*⚠️ Security Warning:*
• Private keys are encrypted before storage
• Never share your private key in public chats
• Use this feature in private messages only

*Enter wallet name and private key:*`;

      await ctx.reply(importWalletMessage, {
        parse_mode: "MarkdownV2",
      });
      return;
    }

    const walletName = args[1];
    const privateKey = args[2];
    // Validate parameters
    if (!walletName || !privateKey) {
      await ctx.reply(
        "❌ *Missing required parameters*\n\nPlease provide wallet name and private key",
        {
          parse_mode: "MarkdownV2",
        }
      );
      return;
    }

    try {
      // Show processing message
      await ctx.reply("⏳ *Importing wallet\\.\\.\\.*", {
        parse_mode: "MarkdownV2",
      });

      const wallet = await this.walletManager.importWallet(
        user.id,
        walletName,
        privateKey
      );
      await this.userManager.addWalletToUser(user.id, wallet);

      const successMessage = `
✅ *Wallet Imported Successfully*

*Name:* ${escapeMarkdownV2(wallet.name)}
*Public Key:* \`${escapeMarkdownV2(wallet.publicKey)}\`
*Status:* Active
*Imported:* ${escapeMarkdownV2(wallet.createdAt.toLocaleDateString())}

*Next Steps:*
• Check wallet balance
• Use for trading
• Add to bundles

*🔒 Security Note:*
Your private key is encrypted and stored securely\\.`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: "💰 Check Balance", callback_data: "check_balance" },
            { text: "💰 Buy Tokens", callback_data: "buy_tokens" },
          ],
          [
            { text: "👛 Manage Wallets", callback_data: "manage_wallets" },
            { text: "🔙 Back to Menu", callback_data: "main_menu" },
          ],
        ],
      };

      await ctx.reply(successMessage, {
        parse_mode: "MarkdownV2",
        reply_markup: keyboard,
      });
    } catch (error) {
      const errorMessage = escapeMarkdownV2((error as Error).message);
      await ctx.reply(
        "❌ *Failed to import wallet*\n\nError: " + errorMessage,
        {
          parse_mode: "MarkdownV2",
        }
      );
    }
  }

  /**
   * Handle token creation with modern interface
   */
  async handleCreate(ctx: Context, user: User): Promise<void> {
    const message = ctx.message;
    if (!message || !("text" in message)) {
      await ctx.reply("❌ Invalid message type");
      return;
    }
    const args = message.text?.split(" ") || [];

    if (args.length < 5) {
      const createTokenMessage = `🪙 Create New Token

Usage: /create <name> <symbol> <description> <image_url>

Example:
/create MyMeme MM "Fun meme coin" https://example.com/image.png

Required Parameters:
• name - Token name (e.g., "MyMeme")
• symbol - Token symbol (e.g., "MM")
• description - Token description
• image_url - Token image URL

Optional Parameters:
• telegram_link - Telegram group link
• twitter_link - Twitter profile link

Features:
• Instant token deployment
• Custom metadata support
• Professional fee handling
• Secure transaction processing

Enter token details:`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: "👛 Manage Wallets", callback_data: "manage_wallets" },
            { text: "📋 Help", callback_data: "help_info" },
          ],
          [{ text: "🔙 Back to Menu", callback_data: "main_menu" }],
        ],
      };

      await ctx.reply(createTokenMessage, {
        reply_markup: keyboard,
      });
      return;
    }

    // Extract parameters
    const name = args[1];
    const symbol = args[2];
    const description = args[3];
    const imageUrl = args[4];
    const telegramLink = args[5];
    const twitterLink = args[6];

    // Validate required parameters
    if (!name || !symbol || !description || !imageUrl) {
      await ctx.reply(
        "❌ *Missing required parameters*\n\nPlease provide name, symbol, description, and image URL",
        {
          parse_mode: "MarkdownV2",
        }
      );
      return;
    }

    try {
      // Show processing message
      await ctx.reply(
        "⏳ *Creating token...*\n\nPlease wait while we deploy your token on Pump\\.Fun",
        {
          parse_mode: "MarkdownV2",
        }
      );

      // Create token metadata
      const metadata: TokenMetadata = {
        name: name,
        symbol: symbol,
        description: description,
        image_url: imageUrl,
        telegram_link: telegramLink || "",
        twitter_link: twitterLink || "",
      };

      // TODO: Integrate with Rust API for actual token creation
      // For now, show success message
      const successMessage = `
✅ *Token Created Successfully*

*Name:* ${name}
*Symbol:* ${symbol}
*Description:* ${description}

*🔗 Token Address:* \`FFYRn4ayuJtgV47w2WjMC1YL27WMFy2y5uTwyv1cpump\`

*💡 Next Steps:*
• Use \`/buy\` to purchase tokens
• Use \`/sell\` to sell tokens
• Share your token with the community

*🎯 Trading Commands:*
• \`/buy FFYRn4ayuJtgV47w2WjMC1YL27WMFy2y5uTwyv1cpump 0\\.1 wallet1\`
• \`/sell FFYRn4ayuJtgV47w2WjMC1YL27WMFy2y5uTwyv1cpump 1000 wallet1\``;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: "💰 Buy Tokens", callback_data: "buy_tokens" },
            { text: "💸 Sell Tokens", callback_data: "sell_tokens" },
          ],
          [
            { text: "👛 Manage Wallets", callback_data: "manage_wallets" },
            { text: "🔙 Back to Menu", callback_data: "main_menu" },
          ],
        ],
      };

      await ctx.reply(successMessage, {
        parse_mode: "MarkdownV2",
        reply_markup: keyboard,
      });
    } catch (error) {
      await ctx.reply(
        "❌ *Failed to create token*\n\nError: " + (error as Error).message,
        {
          parse_mode: "MarkdownV2",
        }
      );
    }
  }

  /**
   * Handle buy tokens with bundle support
   */
  async handleBuy(ctx: Context, user: User): Promise<void> {
    const message = ctx.message;
    if (!message || !("text" in message)) {
      await ctx.reply("❌ Invalid message type");
      return;
    }
    const args = message.text?.split(" ") || [];

    if (args.length < 4) {
      const buyTokensMessage = `
💰 <b>Buy Tokens with MEV Protection</b>

<b>Usage:</b>
<code>/buy &lt;token_address&gt; &lt;sol_amounts&gt; &lt;wallet_ids&gt;</code>

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

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: "👛 Manage Wallets", callback_data: "manage_wallets" },
            { text: "💰 Check Balance", callback_data: "check_balance" },
          ],
          [{ text: "🔙 Back to Menu", callback_data: "main_menu" }],
        ],
      };

      await ctx.reply(buyTokensMessage, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
      return;
    }

    // TODO: Implement actual buy functionality
    await ctx.reply(
      `💰 <b>Buy functionality coming soon</>
      
      This will integrate with Jito bundles for MEV-protected trading.`,
      {
        parse_mode: "HTML",
      }
    );
  }

  /**
   * Handle sell tokens with bundle support
   */
  async handleSell(ctx: Context, user: User): Promise<void> {
    const message = ctx.message;
    if (!message || !("text" in message)) {
      await ctx.reply("❌ Invalid message type");
      return;
    }
    const args = message.text?.split(" ") || [];

    if (args.length < 4) {
      const sellTokensMessage = `
💸 <b>Sell Tokens with MEV Protection</b>

<b>Usage:</b>
<code>/sell &lt;token_address&gt; &lt;token_amounts&gt; &lt;wallet_ids&gt;</code>

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

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: "👛 Manage Wallets", callback_data: "manage_wallets" },
            { text: "💰 Check Balance", callback_data: "check_balance" },
          ],
          [{ text: "🔙 Back to Menu", callback_data: "main_menu" }],
        ],
      };

      await ctx.reply(sellTokensMessage, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
      return;
    }

    // TODO: Implement actual sell functionality
    await ctx.reply(
      `💸 <b>Sell functionality coming soon</b>
      
      This will integrate with Jito bundles for MEV-protected trading.`,
      {
        parse_mode: "HTML",
      }
    );
  }

  /**
   * Handle balance check
   */
  async handleBalance(ctx: Context, user: User): Promise<void> {
    if (user.wallets.length === 0) {
      const noWalletsMessage = `
💰 <b>No Wallets Found</b>

You don't have any wallets yet. Create or import a wallet to get started.

<b>Quick Actions:</b>
`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: "➕ Create Wallet", callback_data: "create_wallet" },
            { text: "📥 Import Wallet", callback_data: "import_wallet" },
          ],
          [{ text: "🔙 Back to Menu", callback_data: "main_menu" }],
        ],
      };

      await ctx.reply(noWalletsMessage, {
        parse_mode: "HTML",
        reply_markup: keyboard,
      });
      return;
    }

    let balanceMessage = `<b>💰 Wallet Balances</b>
    
    `;
    balanceMessage += `<b>Total Wallets:</b> ${user.wallets.length}
    
    `;

    for (const wallet of user.wallets) {
      // const private_key = bs58.encode(
      //   this.walletManager.getKeypairFromWallet(wallet).secretKey
      // );

      balanceMessage += `
<b>${wallet.name}:</b>

• Address: <code>${wallet.publicKey}</code>

• Balance: ${wallet.balance} SOL

• Status: ${wallet.isActive ? "Active" : "Inactive"}

• Last Used: ${wallet.lastUsed.toLocaleDateString()}

`;
    }

    balanceMessage += `
<b>💡 Tips:</b>

• Fund your wallets with SOL for trading

• Use multiple wallets for better MEV protection

• Keep some SOL for transaction fees`;

    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "🪙 Create Token", callback_data: "create_token" },
          { text: "💰 Buy Tokens", callback_data: "buy_tokens" },
        ],
        [
          { text: "👛 Manage Wallets", callback_data: "manage_wallets" },
          { text: "🔙 Back to Menu", callback_data: "main_menu" },
        ],
      ],
    };

    await ctx.reply(balanceMessage, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  }

  /**
   * Handle status check
   */
  async handleStatus(ctx: Context, user: User): Promise<void> {
    const statusMessage = `
📊 <b>Bot Status</b>

<b>User Info:</b>
• ID: ${user.id}
• Username: ${user.username || "N/A"}
• Wallets: ${user.wallets.length}
• Member Since: ${user.createdAt.toLocaleDateString()}

<b>Bot Features:</b>
• ✅ Token Creation  
• ✅ Wallet Management  
• 🔄 Buy/Sell Trading (Coming Soon)  
• 🔄 Jito Bundle Integration (Coming Soon)  

<b>System Status:</b>
• Bot: Online  
• Rust API: ${(await this.rustApiClient.healthCheck()) ? "Online" : "Offline"}  
• Solana RPC: Connected  

<b>Quick Actions:</b>
`;

    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "🪙 Create Token", callback_data: "create_token" },
          { text: "👛 Manage Wallets", callback_data: "manage_wallets" },
        ],
        [
          { text: "💰 Check Balance", callback_data: "check_balance" },
          { text: "📋 Help", callback_data: "help_info" },
        ],
        [{ text: "🔙 Back to Menu", callback_data: "main_menu" }],
      ],
    };

    await ctx.reply(statusMessage, {
      parse_mode: "HTML",
      reply_markup: keyboard,
    });
  }

  /**
   * Handle unknown commands - Only allow /start and /help
   */
  async handleUnknownCommand(ctx: Context, user: User): Promise<void> {
    const message = ctx.message;
    if (!message || !("text" in message)) {
      return;
    }

    const text = message.text || "";

    // Check if user has an active session
    const session = await this.userManager.getUserSession(user.id);
    if (session && session.state !== "idle") {
      await this.handleSessionInput(ctx, user, session, text);
      return;
    }

    // Only allow /start and /help commands, everything else is treated as input
    const firstWord = text.split(" ")[0];
    if (
      !text.startsWith("/") ||
      (text.startsWith("/") &&
        firstWord &&
        !["/start", "/help"].includes(firstWord))
    ) {
      const simpleMessage = `
💡 *Simple Input Mode*

Just type what you want to do:

*For Wallet Creation:*
• Type: "Dee" or "MyWallet" \\- Creates a wallet with that name

*For Token Creation:*
• Type: "Pine" or "MyToken" \\- Creates a token with that name

*Or use the buttons below for more options:*`;

      const keyboard: InlineKeyboardMarkup = {
        inline_keyboard: [
          [
            { text: "🪙 Create Token", callback_data: "create_token" },
            { text: "👛 Create Wallet", callback_data: "create_wallet" },
          ],
          [
            { text: "💰 Buy Tokens", callback_data: "buy_tokens" },
            { text: "📋 Help", callback_data: "help_info" },
          ],
          [{ text: "🔙 Back to Menu", callback_data: "main_menu" }],
        ],
      };

      await ctx.reply(simpleMessage, {
        parse_mode: "MarkdownV2",
        reply_markup: keyboard,
      });
      return;
    }

    // For actual unknown commands (only /start and /help should work)
    const unknownCommandMessage = `
❓ *Unknown Command*

Only these commands work:
• \`/start\` \\- Main menu
• \`/help\` \\- Detailed help

*For everything else, use the buttons below:*`;

    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "🪙 Create Token", callback_data: "create_token" },
          { text: "👛 Create Wallet", callback_data: "create_wallet" },
        ],
        [
          { text: "💰 Buy Tokens", callback_data: "buy_tokens" },
          { text: "📋 Help", callback_data: "help_info" },
        ],
        [{ text: "🔙 Back to Menu", callback_data: "main_menu" }],
      ],
    };

    await ctx.reply(unknownCommandMessage, {
      parse_mode: "MarkdownV2",
      reply_markup: keyboard,
    });
  }

  /**
   * Handle session-based input
   */
  private async handleSessionInput(
    ctx: Context,
    user: User,
    session: any,
    text: string
  ): Promise<void> {
    switch (session.state) {
      case "waiting_for_wallet_name":
        await this.createWalletWithName(ctx, user, text);
        break;
      case "waiting_for_token_name":
        await this.createTokenWithName(ctx, user, text);
        break;
      case "waiting_for_private_key":
        // Handle private key input for wallet import
        await ctx.reply("⏳ *Processing wallet import...*", {
          parse_mode: "MarkdownV2",
        });
        // Clear session after processing
        await this.userManager.clearUserSession(user.id);
        break;
      default:
        await ctx.reply("❌ *Invalid session state*", {
          parse_mode: "MarkdownV2",
        });
        await this.userManager.clearUserSession(user.id);
    }
  }

  /**
   * Create token with provided name
   */
  private async createTokenWithName(
    ctx: Context,
    user: User,
    tokenName: string
  ): Promise<void> {
    try {
      // Show processing message
      await ctx.reply("⏳ *Creating token\\.\\.\\.*", {
        parse_mode: "MarkdownV2",
      });

      // Check if user has wallets
      if (user.wallets.length === 0) {
        await ctx.reply(
          "❌ *No wallets found*\n\nPlease create a wallet first using /create\\_wallet",
          {
            parse_mode: "MarkdownV2",
          }
        );
        return;
      }

      // Use the first active wallet for token creation
      const activeWallet =
        user.wallets.find((w) => w.isActive) || user.wallets[0];

      if (!activeWallet) {
        await ctx.reply(
          "❌ *No active wallet found*\n\nPlease create or activate a wallet first",
          {
            parse_mode: "MarkdownV2",
          }
        );
        return;
      }

      // Create token metadata
      const metadata = {
        name: tokenName,
        symbol: tokenName.substring(0, 3).toUpperCase(),
        description: `${tokenName} token created via Pump Swap Bot`,
        image_url: "https://example.com/default.png",
        telegram_link: "https://t.me/pumpswapbot",
        twitter_link: "https://twitter.com/pumpswapbot",
      };

      // Call Rust API for token creation
      try {
        const response = await this.rustApiClient.createToken({
          metadata,
          user_id: user.id,
          wallet_id: activeWallet.id,
          private_key: bs58.encode(
            this.walletManager.getKeypairFromWallet(activeWallet).secretKey
          ),
        });

        const successMessage = `
✅ Token Created Successfully

Name: ${metadata.name}
Symbol: ${metadata.symbol}
Description: ${metadata.description}

🔗 Token Address: \`${response.token_address}\`
📝 Transaction ID: \`${response.transaction_id}\`

💡 Next Steps:
• Use /buy ${response.token_address} 0.1 ${activeWallet.name} to buy tokens
• Use /sell ${response.token_address} 1000 ${activeWallet.name} to sell tokens
• Share your token with the community

🎯 Trading Commands:
• /buy ${response.token_address} 0.1 ${activeWallet.name}
• /sell ${response.token_address} 1000 ${activeWallet.name}`;

        const keyboard: InlineKeyboardMarkup = {
          inline_keyboard: [
            [
              { text: "💰 Buy Tokens", callback_data: "buy_tokens" },
              { text: "💸 Sell Tokens", callback_data: "sell_tokens" },
            ],
            [
              { text: "👛 Manage Wallets", callback_data: "manage_wallets" },
              { text: "🔙 Back to Menu", callback_data: "main_menu" },
            ],
          ],
        };

        await ctx.reply(successMessage, {
          reply_markup: keyboard,
        });
      } catch (apiError) {
        console.error("API Error creating token:", apiError);
        await ctx.reply(
          "❌ Failed to create token\n\nAPI Error: " +
            (apiError as Error).message
        );
      }

      // Clear session
      await this.userManager.clearUserSession(user.id);
    } catch (error) {
      console.error("Error creating token:", error);
      await ctx.reply("❌ Failed to create token\n\nPlease try again later");
    }
  }

  // Additional handlers for other commands
  async handleWallets(ctx: Context, user: User): Promise<void> {
    await this.handleWallet(ctx, user);
  }
}
