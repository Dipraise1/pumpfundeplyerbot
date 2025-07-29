export interface User {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  wallets: Wallet[];
  createdAt: Date;
  lastActive: Date;
  settings?: UserSettings;
}

export interface UserSettings {
  notifications?: {
    transactions?: boolean;
    priceAlerts?: boolean;
    marketUpdates?: boolean;
  };
  trading?: {
    defaultSolAmount?: number;
    maxWalletsPerBundle?: number;
    autoConfirm?: boolean;
  };
  security?: {
    twoFactorEnabled?: boolean;
    sessionTimeout?: number;
  };
}

export interface Wallet {
  id: string;
  name: string;
  publicKey: string;
  encryptedPrivateKey: string;
  balance: number;
  isActive: boolean;
  createdAt: Date;
  lastUsed: Date;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  image_url: string;
  telegram_link?: string;
  twitter_link?: string;
}

export interface TokenCreationRequest {
  metadata: TokenMetadata;
  user_id: number;
  wallet_id: string;
  private_key: string; // Add private key for backend
}

export interface BuyRequest {
  tokenAddress: string;
  solAmounts: number[];
  walletIds: string[];
  userId: number;
}

export interface SellRequest {
  tokenAddress: string;
  tokenAmounts: number[];
  walletIds: string[];
  userId: number;
}

export interface BundleTransaction {
  id: string;
  type: "buy" | "sell" | "create";
  status: "pending" | "processing" | "completed" | "failed";
  transactions: string[];
  bundleId?: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface BotConfig {
  telegramToken: string;
  solanaRpcUrl: string;
  jitoBundleUrl: string;
  pumpFunProgramId: string;
  feeAddress: string;
  feePercentage: number;
  minSolAmount: number;
  jitoTipAmount: number;
  encryptionKey?: string;
}

export interface RustApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface CreateTokenResponse {
  token_address: string;
  transaction_id: string;
  tokenAddress?: string;
  transactionId?: string;
  metadata: TokenMetadata;
}

export interface BundleResponse {
  bundleId: string;
  status: string;
  transactions: string[];
}

export type Command =
  | "/start"
  | "/create"
  | "/buy"
  | "/sell"
  | "/help"
  | "/wallet"
  | "/wallets"
  | "/create_wallet"
  | "/import_wallet"
  | "/balance"
  | "/status";

export interface CommandContext {
  userId: number;
  chatId: number;
  username?: string;
  command: Command;
  args: string[];
  user: User;
}
