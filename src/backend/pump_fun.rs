use anyhow::{Context, Result};
use log::{info, warn, error};
use serde::{Deserialize, Serialize};
use borsh::{BorshSerialize, BorshDeserialize};
use solana_client::rpc_client::RpcClient;
use solana_sdk::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    system_instruction,
    transaction::Transaction,
    commitment_config::CommitmentConfig,
};
use spl_associated_token_account::get_associated_token_address;
use spl_token;
use std::str::FromStr;
use crate::types::*;

/// Pump.Fun client for creating and trading tokens
pub struct PumpFunClient {
    pub program_id: Pubkey,
    pub fee_address: Pubkey,
    pub config: PumpFunConfig,
}

impl PumpFunClient {
    pub fn new(program_id: String, fee_address: String) -> Self {
        let program_id = Pubkey::from_str(&program_id)
            .expect("Invalid program ID");
        let fee_address = Pubkey::from_str(&fee_address)
            .expect("Invalid fee address");
        
        Self {
            program_id,
            fee_address,
            config: PumpFunConfig {
                program_id: program_id.to_string(),
                fee_address: fee_address.to_string(),
                creation_fee: 0.01,
                trading_fee: 0.005,
                fee_percentage: 0.008,
                min_sol_amount: 0.02,
                max_wallets_per_bundle: 10,
            },
        }
    }

    /// Creates a new token on the Pump.Fun protocol.
    /// 
    /// # Arguments
    /// * `metadata` - The token metadata (name, symbol, description, image URL).
    /// * `creator_keypair` - The keypair of the token creator.
    /// * `rpc_client` - The Solana RPC client for blockchain interaction.
    /// 
    /// # Returns
    /// A `Result` containing a `TransactionResult` with the transaction signature and fee details.
    /// 
    /// # Errors
    /// Returns an error if metadata validation fails, the transaction cannot be signed, or the RPC call fails.
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
        let balance = rpc_client
            .get_balance(&creator_keypair.pubkey())
            .context("Failed to get creator balance")?;
        
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
        let mint_ix = spl_token::instruction::initialize_mint(
            &spl_token::id(),
            &token_mint_pubkey,
            &creator_keypair.pubkey(),
            Some(&creator_keypair.pubkey()),
            9, // decimals
        ).context("Failed to create mint instruction")?;
        instructions.push(mint_ix);

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
        ).context("Failed to create init curve instruction")?;
        instructions.push(init_curve_ix);

        // Transfer creation fee
        instructions.push(system_instruction::transfer(
            &creator_keypair.pubkey(),
            &self.fee_address,
            (self.config.creation_fee * 1e9) as u64,
        ));

        // Build and sign transaction
        let recent_blockhash = rpc_client
            .get_latest_blockhash()
            .context("Failed to get recent blockhash")?;
        
        let mut transaction = Transaction::new_with_payer(&instructions, Some(&creator_keypair.pubkey()));
        transaction.sign(&[creator_keypair, &token_mint], recent_blockhash);

        // Send transaction
        let signature = rpc_client
            .send_and_confirm_transaction(&transaction)
            .context("Failed to send transaction")?;

        info!("Token created successfully: {}", token_mint_pubkey);
        Ok(TransactionResult {
            success: true,
            signature: Some(signature.to_string()),
            bundle_id: None,
            error: None,
            fee_paid: Some(self.config.creation_fee),
        })
    }

    /// Buys tokens using SOL.
    /// 
    /// # Arguments
    /// * `request` - The buy request containing token address, SOL amounts, and wallet IDs.
    /// * `rpc_client` - The Solana RPC client.
    /// 
    /// # Returns
    /// A `Result` containing a `TransactionResult` with the transaction signature.
    pub async fn buy_tokens(
        &self,
        request: BuyRequest,
        rpc_client: &RpcClient,
    ) -> Result<TransactionResult> {
        info!("Buying tokens: {:?}", request);

        // Validate request
        if request.solAmounts.is_empty() {
            return Ok(TransactionResult {
                success: false,
                signature: None,
                bundle_id: None,
                error: Some("No SOL amounts provided".to_string()),
                fee_paid: None,
            });
        }

        let token_mint = Pubkey::from_str(&request.tokenAddress)
            .context("Invalid token address")?;

        // Get bonding curve data
        let bonding_curve = self.get_bonding_curve_data(&token_mint, rpc_client)
            .await
            .context("Failed to get bonding curve data")?;

        // Calculate total SOL needed
        let mut total_sol_needed = 0.0;
        for sol_amount in &request.solAmounts {
            let tokens_to_buy = self.calculate_tokens_for_sol(*sol_amount, &bonding_curve)?;
            total_sol_needed += *sol_amount;
        }

        // Create buy instruction
        let buy_ix = self.create_buy_instruction(
            &token_mint,
            &request.solAmounts,
            &request.walletIds,
        ).context("Failed to create buy instruction")?;

        // Build transaction
        let mut instructions = vec![buy_ix];

        // Add SOL transfers for each wallet
        for (i, sol_amount) in request.solAmounts.iter().enumerate() {
            let wallet_id = request.walletIds.get(i).unwrap_or(&"0".to_string());
            // In a real implementation, you'd get the wallet keypair here
            let wallet_keypair = Keypair::new(); // Placeholder
            
            instructions.push(system_instruction::transfer(
                &wallet_keypair.pubkey(),
                &self.fee_address,
                (sol_amount * 1e9) as u64,
            ));
        }

        // Sign and send transaction
        let recent_blockhash = rpc_client
            .get_latest_blockhash()
            .context("Failed to get recent blockhash")?;

        let mut transaction = Transaction::new_with_payer(&instructions, Some(&Keypair::new().pubkey()));
        // In a real implementation, you'd sign with the actual wallet keypairs
        transaction.sign(&[&Keypair::new()], recent_blockhash);

        let signature = rpc_client
            .send_and_confirm_transaction(&transaction)
            .context("Failed to send buy transaction")?;

        Ok(TransactionResult {
            success: true,
            signature: Some(signature.to_string()),
            bundle_id: None,
            error: None,
            fee_paid: Some(total_sol_needed * self.config.trading_fee),
        })
    }

    /// Sells tokens for SOL.
    /// 
    /// # Arguments
    /// * `request` - The sell request containing token address, token amounts, and wallet IDs.
    /// * `rpc_client` - The Solana RPC client.
    /// 
    /// # Returns
    /// A `Result` containing a `TransactionResult` with the transaction signature.
    pub async fn sell_tokens(
        &self,
        request: SellRequest,
        rpc_client: &RpcClient,
    ) -> Result<TransactionResult> {
        info!("Selling tokens: {:?}", request);

        // Validate request
        if request.tokenAmounts.is_empty() {
            return Ok(TransactionResult {
                success: false,
                signature: None,
                bundle_id: None,
                error: Some("No token amounts provided".to_string()),
                fee_paid: None,
            });
        }

        let token_mint = Pubkey::from_str(&request.tokenAddress)
            .context("Invalid token address")?;

        // Get bonding curve data
        let bonding_curve = self.get_bonding_curve_data(&token_mint, rpc_client)
            .await
            .context("Failed to get bonding curve data")?;

        // Calculate total SOL to receive
        let mut total_sol_received = 0.0;
        for token_amount in &request.tokenAmounts {
            let sol_received = self.calculate_sol_for_tokens(*token_amount as f64, &bonding_curve)?;
            total_sol_received += sol_received;
        }

        // Create sell instruction
        let sell_ix = self.create_sell_instruction(
            &token_mint,
            &request.tokenAmounts.iter().map(|&x| x as f64).collect::<Vec<f64>>(),
            &request.walletIds,
        ).context("Failed to create sell instruction")?;

        // Build transaction
        let mut instructions = vec![sell_ix];

        // Sign and send transaction
        let recent_blockhash = rpc_client
            .get_latest_blockhash()
            .context("Failed to get recent blockhash")?;

        let mut transaction = Transaction::new_with_payer(&instructions, Some(&Keypair::new().pubkey()));
        // In a real implementation, you'd sign with the actual wallet keypairs
        transaction.sign(&[&Keypair::new()], recent_blockhash);

        let signature = rpc_client
            .send_and_confirm_transaction(&transaction)
            .context("Failed to send sell transaction")?;

        Ok(TransactionResult {
            success: true,
            signature: Some(signature.to_string()),
            bundle_id: None,
            error: None,
            fee_paid: Some(total_sol_received * self.config.trading_fee),
        })
    }

    /// Validates token metadata according to Pump.Fun requirements.
    /// 
    /// # Arguments
    /// * `metadata` - The token metadata to validate.
    /// * `validation` - The validation result to populate with errors.
    pub fn validate_token_metadata(&self, metadata: &TokenMetadata, validation: &mut ValidationResult) {
        if metadata.name.is_empty() || metadata.name.len() > 32 {
            validation.add_error("Token name must be 1-32 characters".to_string());
        }
        if metadata.symbol.is_empty() || metadata.symbol.len() > 8 {
            validation.add_error("Token symbol must be 1-8 characters".to_string());
        }
        if metadata.description.is_empty() || metadata.description.len() > 200 {
            validation.add_error("Description must be 1-200 characters".to_string());
        }
        if let Err(_) = url::Url::parse(&metadata.image_url) {
            validation.add_error("Invalid image URL".to_string());
        }
        if metadata.telegram_link.is_none() || metadata.telegram_link.as_ref().unwrap().is_empty() {
            validation.add_error("Telegram link is required".to_string());
        }
        if metadata.twitter_link.is_none() || metadata.twitter_link.as_ref().unwrap().is_empty() {
            validation.add_error("Twitter link is required".to_string());
        }
    }

    /// Creates the initialization curve instruction for Pump.Fun.
    /// 
    /// # Arguments
    /// * `token_mint` - The token mint public key.
    /// * `creator` - The creator's public key.
    /// * `creator_ata` - The creator's associated token account.
    /// * `program_ata` - The program's associated token account.
    /// * `metadata` - The token metadata.
    /// 
    /// # Returns
    /// A `Result` containing the instruction.
    fn create_init_curve_instruction(
        &self,
        token_mint: &Pubkey,
        creator: &Pubkey,
        creator_ata: &Pubkey,
        program_ata: &Pubkey,
        metadata: &TokenMetadata,
    ) -> Result<Instruction> {
        // Serialize metadata using Borsh
        let metadata_bytes = borsh::to_vec(metadata)
            .context("Failed to serialize metadata")?;

        // Create instruction data with discriminator
        let mut data = vec![0]; // Discriminator for init curve
        data.extend_from_slice(&metadata_bytes);

        Ok(Instruction {
            program_id: self.program_id,
            accounts: vec![
                AccountMeta::new(*token_mint, false),
                AccountMeta::new(*creator, true),
                AccountMeta::new(*creator_ata, false),
                AccountMeta::new(*program_ata, false),
                AccountMeta::new_readonly(self.fee_address, false),
                AccountMeta::new_readonly(spl_token::id(), false),
                AccountMeta::new_readonly(spl_associated_token_account::id(), false),
                AccountMeta::new_readonly(solana_sdk::system_program::id(), false),
            ],
            data,
        })
    }

    /// Creates a buy instruction for Pump.Fun.
    /// 
    /// # Arguments
    /// * `token_mint` - The token mint public key.
    /// * `sol_amounts` - The SOL amounts to spend.
    /// * `wallet_ids` - The wallet IDs.
    /// 
    /// # Returns
    /// A `Result` containing the instruction.
    fn create_buy_instruction(
        &self,
        token_mint: &Pubkey,
        sol_amounts: &[f64],
        wallet_ids: &[String],
    ) -> Result<Instruction> {
        // Serialize buy data
        let buy_data = BuyInstructionData {
            discriminator: 1, // Buy instruction discriminator
            sol_amounts: sol_amounts.to_vec(),
            wallet_ids: wallet_ids.to_vec(),
        };

        let data = borsh::to_vec(&buy_data)
            .context("Failed to serialize buy instruction data")?;

        Ok(Instruction {
            program_id: self.program_id,
            accounts: vec![
                AccountMeta::new(*token_mint, false),
                AccountMeta::new_readonly(self.fee_address, false),
                AccountMeta::new_readonly(spl_token::id(), false),
            ],
            data,
        })
    }

    /// Creates a sell instruction for Pump.Fun.
    /// 
    /// # Arguments
    /// * `token_mint` - The token mint public key.
    /// * `token_amounts` - The token amounts to sell.
    /// * `wallet_ids` - The wallet IDs.
    /// 
    /// # Returns
    /// A `Result` containing the instruction.
    fn create_sell_instruction(
        &self,
        token_mint: &Pubkey,
        token_amounts: &[f64],
        wallet_ids: &[String],
    ) -> Result<Instruction> {
        // Serialize sell data
        let sell_data = SellInstructionData {
            discriminator: 2, // Sell instruction discriminator
            token_amounts: token_amounts.to_vec(),
            wallet_ids: wallet_ids.to_vec(),
        };

        let data = borsh::to_vec(&sell_data)
            .context("Failed to serialize sell instruction data")?;

        Ok(Instruction {
            program_id: self.program_id,
            accounts: vec![
                AccountMeta::new(*token_mint, false),
                AccountMeta::new_readonly(self.fee_address, false),
                AccountMeta::new_readonly(spl_token::id(), false),
            ],
            data,
        })
    }

    /// Gets bonding curve data from the blockchain.
    /// 
    /// # Arguments
    /// * `token_mint` - The token mint public key.
    /// * `rpc_client` - The Solana RPC client.
    /// 
    /// # Returns
    /// A `Result` containing the bonding curve data.
    async fn get_bonding_curve_data(
        &self,
        token_mint: &Pubkey,
        rpc_client: &RpcClient,
    ) -> Result<BondingCurveData> {
        let account_data = rpc_client
            .get_account_data(token_mint)
            .context("Failed to fetch bonding curve account")?;

        // Deserialize account data according to Pump.Fun's bonding curve structure
        let bonding_curve = BondingCurveData::try_from_slice(&account_data)
            .context("Failed to deserialize bonding curve data")?;

        Ok(bonding_curve)
    }

    /// Calculates SOL needed for a given token amount using the bonding curve.
    /// 
    /// # Arguments
    /// * `token_amount` - The token amount to buy.
    /// * `bonding_curve` - The bonding curve data.
    /// 
    /// # Returns
    /// A `Result` containing the SOL amount needed.
    fn calculate_sol_for_tokens(&self, token_amount: f64, bonding_curve: &BondingCurveData) -> Result<f64> {
        // Constant product formula (simplified)
        let k = bonding_curve.sol_reserve * bonding_curve.token_reserve;
        let new_token_reserve = bonding_curve.token_reserve - token_amount;
        let new_sol_reserve = k / new_token_reserve;
        let sol_needed = new_sol_reserve - bonding_curve.sol_reserve;
        
        // Add Pump.Fun fees
        let fee = sol_needed * self.config.trading_fee;
        Ok(sol_needed + fee)
    }

    /// Calculates tokens received for a given SOL amount using the bonding curve.
    /// 
    /// # Arguments
    /// * `sol_amount` - The SOL amount to spend.
    /// * `bonding_curve` - The bonding curve data.
    /// 
    /// # Returns
    /// A `Result` containing the token amount received.
    fn calculate_tokens_for_sol(&self, sol_amount: f64, bonding_curve: &BondingCurveData) -> Result<f64> {
        // Constant product formula (simplified)
        let k = bonding_curve.sol_reserve * bonding_curve.token_reserve;
        let new_sol_reserve = bonding_curve.sol_reserve + sol_amount;
        let new_token_reserve = k / new_sol_reserve;
        let tokens_received = bonding_curve.token_reserve - new_token_reserve;
        
        // Subtract Pump.Fun fees
        let fee = tokens_received * self.config.trading_fee;
        Ok(tokens_received - fee)
    }

    /// Decodes a base58-encoded private key.
    /// 
    /// # Arguments
    /// * `private_key` - The base58-encoded private key.
    /// 
    /// # Returns
    /// A `Result` containing the decoded keypair.
    /// 
    /// # Security Note
    /// This method should only be used for development. In production, use a secure wallet manager.
    pub fn decode_keypair(&self, private_key: &str) -> Result<Keypair> {
        let decoded = bs58::decode(private_key)
            .into_vec()
            .context("Failed to decode base58 private key")?;
        
        if decoded.len() != 64 {
            return Err(anyhow::anyhow!("Invalid private key length"));
        }
        
        Ok(Keypair::from_bytes(&decoded)
            .context("Failed to create keypair from bytes")?)
    }
}

/// Buy instruction data structure for Pump.Fun
#[derive(BorshSerialize, BorshDeserialize)]
struct BuyInstructionData {
    discriminator: u8,
    sol_amounts: Vec<f64>,
    wallet_ids: Vec<String>,
}

/// Sell instruction data structure for Pump.Fun
#[derive(BorshSerialize, BorshDeserialize)]
struct SellInstructionData {
    discriminator: u8,
    token_amounts: Vec<f64>,
    wallet_ids: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_token_metadata() {
        let client = PumpFunClient::new(
            "pumpfun_program_id".to_string(),
            "fee_address".to_string(),
        );
        let mut validation = ValidationResult::new();
        let metadata = TokenMetadata {
            name: "".to_string(),
            symbol: "TOOLONG".to_string(),
            description: "".to_string(),
            image_url: "invalid_url".to_string(),
            telegram_link: "".to_string(),
            twitter_link: "".to_string(),
        };

        client.validate_token_metadata(&metadata, &mut validation);
        assert!(!validation.is_valid);
        assert_eq!(validation.errors.len(), 6);
    }

    #[test]
    fn test_calculate_sol_for_tokens() {
        let client = PumpFunClient::new(
            "pumpfun_program_id".to_string(),
            "fee_address".to_string(),
        );
        let bonding_curve = BondingCurveData {
            token_address: "test_token".to_string(),
            current_price: 0.001,
            total_supply: 1000000,
            sol_reserve: 1000.0,
            token_reserve: 1000000.0,
        };

        let result = client.calculate_sol_for_tokens(1000.0, &bonding_curve).unwrap();
        assert!(result > 0.0);
    }
} 