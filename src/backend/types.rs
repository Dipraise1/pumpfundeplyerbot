use serde::{Deserialize, Serialize};
use borsh::{BorshSerialize, BorshDeserialize};
use solana_sdk::pubkey::Pubkey;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct TokenMetadata {
    pub name: String,
    pub symbol: String,
    pub description: String,
    pub image_url: String,
    pub telegram_link: Option<String>,
    pub twitter_link: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTokenRequest {
    pub metadata: TokenMetadata,
    pub user_id: i64,
    pub wallet_id: String,
    pub private_key: String, // Base58 encoded private key
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BuyRequest {
    pub tokenAddress: String,
    pub solAmounts: Vec<f64>,
    pub walletIds: Vec<String>,
    pub userId: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SellRequest {
    pub tokenAddress: String,
    pub tokenAmounts: Vec<u64>,
    pub walletIds: Vec<String>,
    pub userId: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionBundle {
    pub transactions: Vec<String>, // Base64 encoded transactions
    pub tip_amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BundleResponse {
    pub bundle_id: String,
    pub status: String,
    pub transactions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PumpFunToken {
    pub address: String,
    pub name: String,
    pub symbol: String,
    pub description: String,
    pub image_url: String,
    pub telegram_link: Option<String>,
    pub twitter_link: Option<String>,
    pub creator: String,
    pub creation_time: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, BorshSerialize, BorshDeserialize)]
pub struct BondingCurveData {
    pub token_address: String,
    pub current_price: f64,
    pub total_supply: u64,
    pub sol_reserve: f64,
    pub token_reserve: f64, // Changed from u64 to f64 to match implementation
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletInfo {
    pub address: String,
    pub balance: f64,
    pub token_balance: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeeCalculation {
    pub base_amount: f64,
    pub fee_amount: f64,
    pub total_amount: f64,
    pub fee_percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransactionResult {
    pub success: bool,
    pub signature: Option<String>,
    pub bundle_id: Option<String>,
    pub error: Option<String>,
    pub fee_paid: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BotCommand {
    pub command: String,
    pub args: Vec<String>,
}

impl BotCommand {
    pub fn parse(input: &str) -> Option<Self> {
        let parts: Vec<&str> = input.split_whitespace().collect();
        if parts.is_empty() {
            return None;
        }

        let command = parts[0].to_lowercase();
        let args = parts[1..].iter().map(|s| s.to_string()).collect();

        Some(Self { command, args })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

impl ValidationResult {
    pub fn new() -> Self {
        Self {
            is_valid: true,
            errors: Vec::new(),
            warnings: Vec::new(),
        }
    }

    pub fn add_error(&mut self, error: String) {
        self.is_valid = false;
        self.errors.push(error);
    }

    pub fn add_warning(&mut self, warning: String) {
        self.warnings.push(warning);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PumpFunConfig {
    pub program_id: String,
    pub fee_address: String,
    pub creation_fee: f64,
    pub trading_fee: f64, // Added trading_fee field
    pub fee_percentage: f64,
    pub min_sol_amount: f64,
    pub max_wallets_per_bundle: usize,
}

impl Default for PumpFunConfig {
    fn default() -> Self {
        Self {
            program_id: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P".to_string(),
            fee_address: "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM".to_string(),
            creation_fee: 0.05,
            trading_fee: 0.005, // Added trading_fee
            fee_percentage: 0.008, // 0.8%
            min_sol_amount: 0.02,
            max_wallets_per_bundle: 16,
        }
    }
} 