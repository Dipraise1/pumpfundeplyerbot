// Pump Swap Bot - Professional Telegram Bot for Pump.Fun Token Creation and MEV-Protected Trading
// 
// This library provides the backend functionality for the Pump Swap Bot, including:
// - Solana RPC integration for real blockchain interactions
// - Pump.Fun program integration for token creation
// - Jito bundle submission for MEV-protected trading
// - REST API server for frontend communication

pub mod api_server;
pub mod pump_fun;
pub mod jito_bundle;
pub mod types;

// Re-export main components for easy access
pub use api_server::start_api_server;
pub use pump_fun::PumpFunClient;
pub use jito_bundle::JitoBundleClient;
pub use types::*; 