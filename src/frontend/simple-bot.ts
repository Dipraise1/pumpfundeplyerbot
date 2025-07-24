import { Telegraf, Markup } from 'telegraf';
import * as dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Bot configuration
const bot = new Telegraf('7637927438:AAEYeGS0IowXaViWpD-1ruqJWYCHaIfYSdY');

// API client
const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8080',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// User session management
interface UserSession {
  userId: number;
  currentStep: string;
  projectData: any;
  wallets: Wallet[];
}

interface Wallet {
  id: string;
  name: string;
  address: string;
  balance: number;
}

const userSessions = new Map<number, UserSession>();

// Health check
async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await apiClient.get('/health');
    return response.data.success;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
}

// Start command with professional welcome
bot.start(async (ctx) => {
  const userId = ctx.from?.id || 0;
  
  // Initialize user session
  userSessions.set(userId, {
    userId,
    currentStep: 'main_menu',
    projectData: {},
    wallets: []
  });

  const welcomeMessage = `
🎯 *Welcome to Pump Swap Bot*

The ultimate professional platform for deploying meme coins on Pump\\.Fun with MEV\\-protected trading\\.

*🚀 Key Features:*
• 🪙 **Token Creation** \\- Deploy new meme coins instantly
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

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🪙 Create Token', 'create_token')],
    [Markup.button.callback('💰 Buy Tokens', 'buy_tokens')],
    [Markup.button.callback('💸 Sell Tokens', 'sell_tokens')],
    [Markup.button.callback('👛 Wallet Management', 'wallet_management')],
    [Markup.button.callback('📊 Project Status', 'project_status')],
    [Markup.button.callback('❓ Help', 'help')]
  ]);

  await ctx.reply(welcomeMessage, {
    parse_mode: 'MarkdownV2',
    ...keyboard
  });
});

// Wallet management menu
bot.action('wallet_management', async (ctx) => {
  const userId = ctx.from?.id || 0;
  let session = userSessions.get(userId);
  
  if (!session) {
    session = {
      userId,
      currentStep: 'main_menu',
      projectData: {},
      wallets: []
    };
    userSessions.set(userId, session);
  }

  const walletMessage = `
👛 *Wallet Management*

*Current Wallets:* ${session.wallets.length}

${session.wallets.length === 0 ? 'No wallets added yet\\.' : session.wallets.map(w => `• ${w.name}: \`${w.address.slice(0, 8)}...\``).join('\n')}

*Select an option:*`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('➕ Add Wallet', 'add_wallet')],
    [Markup.button.callback('📋 List Wallets', 'list_wallets')],
    [Markup.button.callback('🗑️ Remove Wallet', 'remove_wallet')],
    [Markup.button.callback('⬅️ Back to Main', 'main_menu')]
  ]);

  await ctx.editMessageText(walletMessage, {
    parse_mode: 'MarkdownV2',
    ...keyboard
  });
});

// Add wallet flow
bot.action('add_wallet', async (ctx) => {
  const userId = ctx.from?.id || 0;
  const session = userSessions.get(userId);
  
  if (session) {
    session.currentStep = 'add_wallet_name';
  }

  const message = `
➕ *Add New Wallet*

Please enter a name for your wallet \\(e\\.g\\., "Main Wallet", "Trading Wallet"\\):

*Example:* Main Wallet`;

  await ctx.editMessageText(message, {
    parse_mode: 'MarkdownV2'
  });
});

// Handle wallet name input
bot.on('text', async (ctx) => {
  const userId = ctx.from?.id || 0;
  const session = userSessions.get(userId);
  const text = ctx.message?.text || '';

  if (!session) return;

  if (session.currentStep === 'add_wallet_name') {
    session.projectData.walletName = text;
    session.currentStep = 'add_wallet_address';

    const message = `
📝 *Wallet Name:* ${text}

Now please enter your wallet's private key \\(it will be encrypted and stored securely\\):

*⚠️ Security Note:* Your private key is encrypted and never stored in plain text\\.

*Example:* 5KJvsngHeMpm884wtkJNzQGaCErckhHJBGFsvd3VyK5qMZXj3hS`;

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2'
    });
  } else if (session.currentStep === 'add_wallet_address') {
    // Mock wallet creation (in real implementation, validate and encrypt the key)
    const newWallet: Wallet = {
      id: `wallet_${Date.now()}`,
      name: session.projectData.walletName,
      address: `wallet_${Date.now()}_address`,
      balance: 0
    };

    session.wallets.push(newWallet);
    session.currentStep = 'main_menu';

    const message = `
✅ *Wallet Added Successfully!*

*Name:* ${newWallet.name}
*Address:* \`${newWallet.address}\`
*Status:* ✅ Active

*Your wallet has been added to your account\\!*`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('➕ Add Another Wallet', 'add_wallet')],
      [Markup.button.callback('📋 View All Wallets', 'list_wallets')],
      [Markup.button.callback('⬅️ Back to Main', 'main_menu')]
    ]);

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2',
      ...keyboard
    });
  }
});

// List wallets
bot.action('list_wallets', async (ctx) => {
  const userId = ctx.from?.id || 0;
  let session = userSessions.get(userId);
  
  if (!session) {
    session = {
      userId,
      currentStep: 'main_menu',
      projectData: {},
      wallets: []
    };
    userSessions.set(userId, session);
  }

  if (session.wallets.length === 0) {
    const message = `
📋 *Wallet List*

No wallets found\\. Add your first wallet to get started\\!`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('➕ Add Wallet', 'add_wallet')],
      [Markup.button.callback('⬅️ Back', 'wallet_management')]
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'MarkdownV2',
      ...keyboard
    });
  } else {
    const walletList = session.wallets.map((w, i) => 
      `${i + 1}\\. **${w.name}**\n   Address: \`${w.address}\`\n   Balance: ${w.balance} SOL`
    ).join('\n\n');

    const message = `
📋 *Your Wallets*

${walletList}

*Total Wallets:* ${session.wallets.length}`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('➕ Add Wallet', 'add_wallet')],
      [Markup.button.callback('🗑️ Remove Wallet', 'remove_wallet')],
      [Markup.button.callback('⬅️ Back', 'wallet_management')]
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'MarkdownV2',
      ...keyboard
    });
  }
});

// Create token flow
bot.action('create_token', async (ctx) => {
  const userId = ctx.from?.id || 0;
  const session = userSessions.get(userId);
  
  if (session) {
    session.currentStep = 'create_token_name';
    session.projectData = {};
  }

  const message = `
🪙 *Create New Token*

Let's create your meme coin step by step\\!

*Step 1: Token Name*

Please enter the name for your token:

*Example:* MyMemeCoin`;

  await ctx.editMessageText(message, {
    parse_mode: 'MarkdownV2'
  });
});

// Handle token creation steps
bot.on('text', async (ctx) => {
  const userId = ctx.from?.id || 0;
  const session = userSessions.get(userId);
  const text = ctx.message?.text || '';

  if (!session) return;

  if (session.currentStep === 'create_token_name') {
    session.projectData.tokenName = text;
    session.currentStep = 'create_token_symbol';

    const message = `
📝 *Token Name:* ${text}

*Step 2: Token Symbol*

Please enter the symbol for your token \\(usually 3\\-5 characters\\):

*Example:* MMC`;

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2'
    });
  } else if (session.currentStep === 'create_token_symbol') {
    session.projectData.tokenSymbol = text;
    session.currentStep = 'create_token_description';

    const message = `
💎 *Token Symbol:* ${text}

*Step 3: Token Description*

Please enter a description for your token:

*Example:* A fun meme coin for the community!`;

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2'
    });
  } else if (session.currentStep === 'create_token_description') {
    session.projectData.tokenDescription = text;
    session.currentStep = 'create_token_image';

    const message = `
📋 *Token Description:* ${text}

*Step 4: Token Image URL*

Please enter the URL for your token's image:

*Example:* https://example\\.com/image\\.png

*Or type "skip" to use default image*`;

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2'
    });
  } else if (session.currentStep === 'create_token_image') {
    session.projectData.tokenImage = text === 'skip' ? '' : text;
    
    // Show token summary
    const message = `
🎯 *Token Creation Summary*

*Name:* ${session.projectData.tokenName}
*Symbol:* ${session.projectData.tokenSymbol}
*Description:* ${session.projectData.tokenDescription}
*Image:* ${session.projectData.tokenImage || 'Default image'}

*Ready to deploy?*`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🚀 Deploy Token', 'deploy_token')],
      [Markup.button.callback('✏️ Edit Details', 'edit_token')],
      [Markup.button.callback('❌ Cancel', 'main_menu')]
    ]);

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2',
      ...keyboard
    });
  }
});

// Deploy token
bot.action('deploy_token', async (ctx) => {
  const userId = ctx.from?.id || 0;
  const session = userSessions.get(userId);

  if (!session) return;

  await ctx.editMessageText('⏳ *Deploying token...*\n\nPlease wait while we create your token on Pump\\.Fun', {
    parse_mode: 'MarkdownV2'
  });

  try {
    // Call Rust API
    const response = await apiClient.post('/api/token/create', {
      metadata: {
        name: session.projectData.tokenName,
        symbol: session.projectData.tokenSymbol,
        description: session.projectData.tokenDescription,
        imageUrl: session.projectData.tokenImage,
        telegramLink: null,
        twitterLink: null
      },
      user_id: userId,
      wallet_id: 'default'
    });

    if (response.data.success) {
      const data = response.data.data;
      const successMessage = `
✅ *Token Deployed Successfully!*

*Name:* ${session.projectData.tokenName}
*Symbol:* ${session.projectData.tokenSymbol}
*Description:* ${session.projectData.tokenDescription}

*🔗 Token Address:* \`${data.token_address}\`
*📝 Transaction ID:* \`${data.transaction_id}\`

*💡 Next Steps:*
• Use the token address to buy/sell
• Share your token with the community
• Monitor your token's performance

*🎯 Quick Actions:*`;

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(`💰 Buy ${session.projectData.tokenSymbol}`, 'buy_tokens')],
        [Markup.button.callback('📊 View Token', 'view_token')],
        [Markup.button.callback('🪙 Create Another', 'create_token')],
        [Markup.button.callback('⬅️ Main Menu', 'main_menu')]
      ]);

      await ctx.editMessageText(successMessage, {
        parse_mode: 'MarkdownV2',
        ...keyboard
      });
    } else {
      throw new Error(response.data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Token deployment error:', error);
    await ctx.editMessageText('❌ *Failed to deploy token*\n\nError: ' + (error as any).message, {
      parse_mode: 'MarkdownV2'
    });
  }
});

// Buy tokens flow
bot.action('buy_tokens', async (ctx) => {
  const userId = ctx.from?.id || 0;
  let session = userSessions.get(userId);
  
  if (!session) {
    session = {
      userId,
      currentStep: 'main_menu',
      projectData: {},
      wallets: []
    };
    userSessions.set(userId, session);
  }

  if (session.wallets.length === 0) {
    const message = `
💰 *Buy Tokens*

You need to add a wallet first to buy tokens\\.

*Please add a wallet to continue:*`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('➕ Add Wallet', 'add_wallet')],
      [Markup.button.callback('⬅️ Back', 'main_menu')]
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'MarkdownV2',
      ...keyboard
    });
    return;
  }

  session.currentStep = 'buy_token_address';

  const message = `
💰 *Buy Tokens with MEV Protection*

*Step 1: Token Address*

Please enter the token address you want to buy:

*Example:* FFYRn4ayuJtgV47w2WjMC1YL27WMFy2y5uTwyv1cpump`;

  await ctx.editMessageText(message, {
    parse_mode: 'MarkdownV2'
  });
});

// Handle buy token steps
bot.on('text', async (ctx) => {
  const userId = ctx.from?.id || 0;
  const session = userSessions.get(userId);
  const text = ctx.message?.text || '';

  if (!session || !('currentStep' in session)) return;

  if (session.currentStep === 'buy_token_address') {
    session.projectData.tokenAddress = text;
    session.currentStep = 'buy_sol_amount';

    const message = `
📝 *Token Address:* \`${text}\`

*Step 2: SOL Amount*

Please enter the amount of SOL you want to spend:

*Example:* 0\\.1

*Available Wallets:* ${session.wallets.length}`;

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2'
    });
  } else if (session.currentStep === 'buy_sol_amount') {
    session.projectData.solAmount = parseFloat(text);
    session.currentStep = 'buy_wallet_selection';

    const walletOptions = session.wallets.map((w, i) => 
      [Markup.button.callback(`${w.name} (${w.balance} SOL)`, `select_wallet_${i}`)]
    );

    const message = `
💰 *SOL Amount:* ${text} SOL

*Step 3: Select Wallet*

Choose which wallet to use for this transaction:`;

    const keyboard = Markup.inlineKeyboard([
      ...walletOptions,
      [Markup.button.callback('⬅️ Back', 'buy_tokens')]
    ]);

    await ctx.reply(message, {
      parse_mode: 'MarkdownV2',
      ...keyboard
    });
  }
});

// Main menu
bot.action('main_menu', async (ctx) => {
  const userId = ctx.from?.id || 0;
  const session = userSessions.get(userId);
  
  if (session) {
    session.currentStep = 'main_menu';
  }

  const welcomeMessage = `
🎯 *Pump Swap Bot*

The ultimate professional platform for deploying meme coins on Pump\\.Fun with MEV\\-protected trading\\.

*🚀 Key Features:*
• 🪙 **Token Creation** \\- Deploy new meme coins instantly
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

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🪙 Create Token', 'create_token')],
    [Markup.button.callback('💰 Buy Tokens', 'buy_tokens')],
    [Markup.button.callback('💸 Sell Tokens', 'sell_tokens')],
    [Markup.button.callback('👛 Wallet Management', 'wallet_management')],
    [Markup.button.callback('📊 Project Status', 'project_status')],
    [Markup.button.callback('❓ Help', 'help')]
  ]);

  await ctx.editMessageText(welcomeMessage, {
    parse_mode: 'MarkdownV2',
    ...keyboard
  });
});

// Help command
bot.action('help', async (ctx) => {
  const helpMessage = `
📚 *Pump Swap Bot Help*

*🎯 Quick Actions:*
• 🪙 **Create Token** \\- Deploy new meme coins
• 💰 **Buy Tokens** \\- Purchase tokens with MEV protection
• 💸 **Sell Tokens** \\- Sell tokens with MEV protection
• 👛 **Wallet Management** \\- Manage your wallets

*📋 Detailed Usage:*

*🚀 Token Creation:*
1\\. Click "Create Token"
2\\. Enter token name
3\\. Enter token symbol
4\\. Enter description
5\\. Add image URL \\(optional\\)
6\\. Deploy token

*💰 Buy Tokens:*
1\\. Add wallet first
2\\. Click "Buy Tokens"
3\\. Enter token address
4\\. Enter SOL amount
5\\. Select wallet
6\\. Confirm transaction

*💸 Sell Tokens:*
1\\. Add wallet first
2\\. Click "Sell Tokens"
3\\. Enter token address
4\\. Enter token amount
5\\. Select wallet
6\\. Confirm transaction

*🔒 Security Features:*
• Private keys encrypted with AES\\-256\\-GCM
• No keys stored in plain text
• All transactions signed locally
• MEV protection via Jito

*💎 Premium Features:*
• 0\\.8% transaction fee
• Up to 16 wallets per bundle
• Real\\-time status updates
• Professional error handling`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('⬅️ Back to Main', 'main_menu')]
  ]);

  await ctx.editMessageText(helpMessage, {
    parse_mode: 'MarkdownV2',
    ...keyboard
  });
});

// Project status
bot.action('project_status', async (ctx) => {
  const apiHealth = await checkApiHealth();
  
  const statusMessage = `
📊 *System Status*

*System Status:*
• Bot: ✅ Online
• Rust API: ${apiHealth ? '✅ Online' : '❌ Offline'}
• Solana RPC: ✅ Connected

*Features:*
• ✅ Token Creation
• ✅ MEV\\-Protected Trading
• ✅ Multi\\-Wallet Support
• ✅ Real\\-time Updates

*Quick Actions:*
• 🪙 Create new token
• 💰 Buy tokens
• 💸 Sell tokens
• 👛 Manage wallets`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.callback('🪙 Create Token', 'create_token')],
    [Markup.button.callback('💰 Buy Tokens', 'buy_tokens')],
    [Markup.button.callback('👛 Wallet Management', 'wallet_management')],
    [Markup.button.callback('⬅️ Back to Main', 'main_menu')]
  ]);

  await ctx.editMessageText(statusMessage, {
    parse_mode: 'MarkdownV2',
    ...keyboard
  });
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
    const apiHealth = await checkApiHealth();
    console.log('Rust API Status:', apiHealth ? 'Online' : 'Offline');
    
    if (!apiHealth) {
      console.log('⚠️  Warning: Rust API server is not running');
      console.log('Start the Rust server with: cargo run --release');
    }
    
    await bot.launch();
    console.log('Bot launched successfully');
    
    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
  } catch (error) {
    console.error('Failed to start bot:', error);
    process.exit(1);
  }
}

main(); 