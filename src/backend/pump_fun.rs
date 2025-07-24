use anyhow::{Context, Result};
use log::{error, info, warn};
use serde::{Deserialize, Serialize};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_instruction,
    transaction::Transaction,
    commitment_config::CommitmentConfig,
};
use spl_associated_token_account::get_associated_token_address;
use spl_token::state::Account as TokenAccount;
use spl_token::state::Account;
use std::str::FromStr;

use crate::types::*;

#[derive(Clone)]
pub struct PumpFunClient {
    program_id: Pubkey,
    fee_address: Pubkey,
    config: PumpFunConfig,
}

impl PumpFunClient {
    pub fn new(program_id: String, fee_address: String) -> Self {
        let config = PumpFunConfig::default();
        
        Self {
            program_id: Pubkey::from_str(&program_id).expect("Invalid program ID"),
            fee_address: Pubkey::from_str(&fee_address).expect("Invalid fee address"),
            config,
        }
    }

    pub async fn create_token(
        &self,
        metadata: TokenMetadata,
        creator_keypair: &Keypair,
        rpc_client: &RpcClient,
    ) -> Result<TransactionResult> {
        info!("Creating token with metadata: {:?}", metadata);

        // Validate metadata
        let mut validation = ValidationResult::new();
        self.validate_token_metadata(&metadata, &mut validation);
        
        if !validation.is_valid {
            return Ok(TransactionResult {
                success: false,
                signature: None,
                bundle_id: None,
                error: Some(validation.errors.join(", ")),
                fee_paid: None,
            });
        }

        // Check creator balance
        let balance = rpc_client.get_balance(&creator_keypair.pubkey())?;
        let required_balance = (self.config.creation_fee * 1e9) as u64 + 1000000; // 1 SOL buffer
        
        if balance < required_balance {
            return Ok(TransactionResult {
                success: false,
                signature: None,
                bundle_id: None,
                error: Some(format!(
                    "Insufficient balance. Required: {} SOL, Available: {} SOL",
                    required_balance as f64 / 1e9,
                    balance as f64 / 1e9
                )),
                fee_paid: None,
            });
        }

        // Create token mint
        let token_mint = Keypair::new();
        let token_mint_pubkey = token_mint.pubkey();

        // Create associated token account for creator
        let creator_ata = get_associated_token_address(&creator_keypair.pubkey(), &token_mint_pubkey);

        // Create associated token account for program
        let program_ata = get_associated_token_address(&self.program_id, &token_mint_pubkey);

        // Build instructions
        let mut instructions = Vec::new();

        // Create token mint
        instructions.push(spl_token::instruction::initialize_mint(
            &spl_token::id(),
            &token_mint_pubkey,
            &creator_keypair.pubkey(),
            Some(&creator_keypair.pubkey()),
            9, // decimals
        )?);

        // Create creator ATA
        instructions.push(spl_associated_token_account::instruction::create_associated_token_account(
            &creator_keypair.pubkey(),
            &creator_keypair.pubkey(),
            &token_mint_pubkey,
            &spl_token::id(),
        ));

        // Create program ATA
        instructions.push(spl_associated_token_account::instruction::create_associated_token_account(
            &creator_keypair.pubkey(),
            &self.program_id,
            &token_mint_pubkey,
            &spl_token::id(),
        ));

        // Initialize bonding curve (Pump.Fun specific)
        let init_curve_ix = self.create_init_curve_instruction(
            &token_mint_pubkey,
            &creator_keypair.pubkey(),
            &creator_ata,
            &program_ata,
            &metadata,
        )?;
        instructions.push(init_curve_ix);

        // Transfer creation fee
        instructions.push(system_instruction::transfer(
            &creator_keypair.pubkey(),
            &self.fee_address,
            (self.config.creation_fee * 1e9) as u64,
        ));

        // Build and sign transaction
        let recent_blockhash = rpc_client.get_latest_blockhash()?;
        let mut transaction = Transaction::new_with_payer(&instructions, Some(&creator_keypair.pubkey()));
        transaction.sign(&[creator_keypair, &token_mint], recent_blockhash);

        // Send transaction
        let signature = rpc_client.send_and_confirm_transaction(&transaction)?;

        info!("Token created successfully: {}", token_mint_pubkey);

        Ok(TransactionResult {
            success: true,
            signature: Some(signature.to_string()),
            bundle_id: None,
            error: None,
            fee_paid: Some(self.config.creation_fee),
        })
    }

    pub async fn buy_tokens(
        &self,
        request: BuyRequest,
        rpc_client: &RpcClient,
    ) -> Result<TransactionResult> {
        info!("Processing buy request for token: {}", request.tokenAddress);

        // Validate request
        if request.solAmounts.len() != request.walletIds.len() {
            return Ok(TransactionResult {
                success: false,
                signature: None,
                bundle_id: None,
                error: Some("Number of SOL amounts must match number of wallet IDs".to_string()),
                fee_paid: None,
            });
        }

        if request.solAmounts.len() > self.config.max_wallets_per_bundle {
            return Ok(TransactionResult {
                success: false,
                signature: None,
                bundle_id: None,
                error: Some(format!(
                    "Maximum {} wallets allowed per bundle",
                    self.config.max_wallets_per_bundle
                )),
                fee_paid: None,
            });
        }

        let token_mint = Pubkey::from_str(&request.tokenAddress)?;
        let mut transactions: Vec<String> = Vec::new();
        let mut total_fee = 0.0;

        // For now, return mock response since we need wallet manager integration
        // In production, this would:
        // 1. Get private keys from wallet manager using wallet IDs
        // 2. Create buy transactions for each wallet
        // 3. Submit bundle to Jito
        // 4. Return bundle ID and status

        Ok(TransactionResult {
            success: true,
            signature: None,
            bundle_id: None,
            error: None,
            fee_paid: Some(total_fee),
        })
    }

    pub async fn sell_tokens(
        &self,
        request: SellRequest,
        rpc_client: &RpcClient,
    ) -> Result<TransactionResult> {
        info!("Processing sell request for token: {}", request.tokenAddress);

        // Validate request
        if request.tokenAmounts.len() != request.walletIds.len() {
            return Ok(TransactionResult {
                success: false,
                signature: None,
                bundle_id: None,
                error: Some("Number of token amounts must match number of wallet IDs".to_string()),
                fee_paid: None,
            });
        }

        if request.tokenAmounts.len() > self.config.max_wallets_per_bundle {
            return Ok(TransactionResult {
                success: false,
                signature: None,
                bundle_id: None,
                error: Some(format!(
                    "Maximum {} wallets allowed per bundle",
                    self.config.max_wallets_per_bundle
                )),
                fee_paid: None,
            });
        }

        let token_mint = Pubkey::from_str(&request.tokenAddress)?;
        let mut transactions: Vec<String> = Vec::new();
        let mut total_fee = 0.0;

        // For now, return mock response since we need wallet manager integration
        // In production, this would:
        // 1. Get private keys from wallet manager using wallet IDs
        // 2. Create sell transactions for each wallet
        // 3. Submit bundle to Jito
        // 4. Return bundle ID and status

        Ok(TransactionResult {
            success: true,
            signature: None,
            bundle_id: None,
            error: None,
            fee_paid: Some(total_fee),
        })
    }

    fn validate_token_metadata(&self, metadata: &TokenMetadata, validation: &mut ValidationResult) {
        if metadata.name.is_empty() {
            validation.add_error("Token name cannot be empty".to_string());
        }

        if metadata.symbol.is_empty() {
            validation.add_error("Token symbol cannot be empty".to_string());
        }

        if metadata.symbol.len() > 8 {
            validation.add_error("Token symbol must be 8 characters or less".to_string());
        }

        if metadata.description.is_empty() {
            validation.add_error("Token description cannot be empty".to_string());
        }

        if metadata.image_url.is_empty() {
            validation.add_error("Image URL cannot be empty".to_string());
        }
    }

    fn decode_keypair(&self, private_key: &str) -> Result<Keypair> {
        let decoded = bs58::decode(private_key)
            .into_vec()
            .context("Failed to decode private key")?;
        
        if decoded.len() != 64 {
            return Err(anyhow::anyhow!("Invalid private key length"));
        }

        Ok(Keypair::from_bytes(&decoded)?)
    }

    fn create_init_curve_instruction(
        &self,
        token_mint: &Pubkey,
        creator: &Pubkey,
        creator_ata: &Pubkey,
        program_ata: &Pubkey,
        metadata: &TokenMetadata,
    ) -> Result<Instruction> {
        // This is a simplified version - in practice, you'd need the actual Pump.Fun IDL
        // and instruction data structure
        let data = vec![
            0, // Instruction discriminator for init_curve
            // Add metadata serialization here
        ];

        use solana_sdk::instruction::AccountMeta;
        Ok(Instruction {
            program_id: self.program_id,
            accounts: vec![
                AccountMeta::new(*token_mint, false),
                AccountMeta::new(*creator, true),
                AccountMeta::new(*creator_ata, false),
                AccountMeta::new(*program_ata, false),
                AccountMeta::new_readonly(self.fee_address, false),
            ],
            data,
        })
    }

    fn create_buy_instruction(
        &self,
        token_mint: &Pubkey,
        buyer: &Pubkey,
        sol_amount: f64,
    ) -> Result<Instruction> {
        let buyer_ata = get_associated_token_address(buyer, token_mint);
        let program_ata = get_associated_token_address(&self.program_id, token_mint);

        let data = vec![
            1, // Instruction discriminator for buy
            // Add sol_amount serialization here
        ];

        use solana_sdk::instruction::AccountMeta;
        Ok(Instruction {
            program_id: self.program_id,
            accounts: vec![
                AccountMeta::new_readonly(*token_mint, false),
                AccountMeta::new(*buyer, true),
                AccountMeta::new(buyer_ata, false),
                AccountMeta::new(program_ata, false),
                AccountMeta::new_readonly(self.fee_address, false),
            ],
            data,
        })
    }

    fn create_sell_instruction(
        &self,
        token_mint: &Pubkey,
        seller: &Pubkey,
        token_amount: u64,
    ) -> Result<Instruction> {
        let seller_ata = get_associated_token_address(seller, token_mint);
        let program_ata = get_associated_token_address(&self.program_id, token_mint);

        let data = vec![
            2, // Instruction discriminator for sell
            // Add token_amount serialization here
        ];

        use solana_sdk::instruction::AccountMeta;
        Ok(Instruction {
            program_id: self.program_id,
            accounts: vec![
                AccountMeta::new_readonly(*token_mint, false),
                AccountMeta::new(*seller, true),
                AccountMeta::new(seller_ata, false),
                AccountMeta::new(program_ata, false),
                AccountMeta::new_readonly(self.fee_address, false),
            ],
            data,
        })
    }

    async fn get_bonding_curve_data(
        &self,
        token_mint: &Pubkey,
        rpc_client: &RpcClient,
    ) -> Result<BondingCurveData> {
        // This would fetch the actual bonding curve data from Pump.Fun
        // For now, returning mock data
        Ok(BondingCurveData {
            token_address: token_mint.to_string(),
            current_price: 0.001,
            total_supply: 1_000_000_000,
            sol_reserve: 1000.0,
            token_reserve: 1_000_000_000,
        })
    }

    fn calculate_sol_for_tokens(&self, token_amount: u64, bonding_curve: &BondingCurveData) -> Result<f64> {
        // Simplified bonding curve calculation
        // In practice, this would use the actual Pump.Fun bonding curve formula
        let price = bonding_curve.current_price;
        Ok(token_amount as f64 * price)
    }
} 