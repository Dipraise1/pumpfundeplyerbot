use anyhow::{Context, Result};
use clap::Parser;
use log::{error, info};
use serde::{Deserialize, Serialize};
use std::str::FromStr;

use pump_swap_bot::*;
use pump_swap_bot::api_server::start_api_server;

#[derive(Parser, Debug)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Path to config file
    #[arg(short, long, default_value = "config/config.json")]
    config: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Config {
    pub telegram_token: String,
    pub solana_rpc_url: String,
    pub jito_bundle_url: String,
    pub pump_fun_program_id: String,
    pub fee_address: String,
    pub fee_percentage: f64,
    pub min_sol_amount: f64,
    pub jito_tip_amount: f64,
    pub encryption_key: String,
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    env_logger::init();

    // Parse command line arguments
    let args = Args::parse();

    // Load configuration
    let config_content = std::fs::read_to_string(&args.config)
        .with_context(|| format!("Failed to read config file: {}", args.config))?;
    let config: Config = serde_json::from_str(&config_content)?;

    // Initialize components
    let pump_fun_client = PumpFunClient::new(
        config.pump_fun_program_id.clone(),
        config.fee_address.clone(),
    );

    info!("Starting Pump Swap Bot API Server...");
    info!("Solana RPC URL: {}", config.solana_rpc_url);
    info!("Pump.Fun Program ID: {}", config.pump_fun_program_id);
    info!("Jito Bundle URL: {}", config.jito_bundle_url);

    // Start API server
    if let Err(e) = start_api_server(pump_fun_client).await {
        error!("API server error: {}", e);
        return Err(e.into());
    }

    Ok(())
} 