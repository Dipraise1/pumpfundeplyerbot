export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  telegramLink?: string;
  twitterLink?: string;
  image_url?: string;
  telegram_link?: string;
  twitter_link?: string;
}

export interface CreateTokenRequest {
  metadata: TokenMetadata;
  userId: number;
  walletId: string;
  privateKey: string;
  private_key?: string;
  wallet_id?: string;
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

export interface TransactionResult {
  success: boolean;
  signature?: string;
  bundleId?: string;
  error?: string;
  feePaid?: number;
}

export interface BondingCurveData {
  tokenAddress: string;
  currentPrice: number;
  totalSupply: number;
  solReserve: number;
  tokenReserve: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PumpFunConfig {
  programId: string;
  feeAddress: string;
  creationFee: number;
  tradingFee: number;
  feePercentage: number;
  minSolAmount: number;
  maxWalletsPerBundle: number;
}

export interface BundleResponse {
  bundleId: string;
  status: string;
  transactions: string[];
}

export interface CreateTokenResponse {
  success: boolean;
  data?: TokenCreationData;
  error?: string;
}

export interface TokenCreationData {
  tokenAddress: string;
  transactionId: string;
  metadata: TokenMetadata;
}
