use actix_web::{web, App, HttpServer, HttpResponse, Error};
use actix_cors::Cors;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;
use solana_client::rpc_client::RpcClient;
use solana_sdk::signature::Keypair;
use uuid::Uuid;

use crate::pump_fun::PumpFunClient;
use crate::types::*;

pub struct ApiState {
    pub pump_fun_client: PumpFunClient,
    pub rpc_client: RpcClient,
}

// Use the shared CreateTokenRequest from types.rs

#[derive(Serialize)]
pub struct CreateTokenResponse {
    pub success: bool,
    pub data: Option<TokenCreationData>,
    pub error: Option<String>,
}

#[derive(Serialize)]
pub struct TokenCreationData {
    pub token_address: String,
    pub transaction_id: String,
    pub metadata: TokenMetadata,
}

// Use the shared BuyRequest from types.rs

// Use the shared SellRequest from types.rs

#[derive(Serialize)]
pub struct BundleResponse {
    pub success: bool,
    pub data: Option<BundleData>,
    pub error: Option<String>,
}

#[derive(Serialize)]
pub struct BundleData {
    pub bundle_id: String,
    pub status: String,
    pub transactions: Vec<String>,
}

async fn health_check() -> Result<HttpResponse, Error> {
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "data": "API is running",
        "error": null
    })))
}

async fn create_token(
    request: web::Json<CreateTokenRequest>,
    state: web::Data<Arc<Mutex<ApiState>>>,
) -> Result<HttpResponse, Error> {
    let state_guard = state.lock().await;
    
    // Decode the private key
    let creator_keypair = match decode_keypair(&request.private_key) {
        Ok(keypair) => keypair,
        Err(e) => {
            return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "success": false,
                "data": null,
                "error": format!("Invalid private key: {}", e)
            })));
        }
    };

    // Validate the wallet belongs to the user (in production, you'd check this against a database)
    if request.wallet_id.is_empty() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "data": null,
            "error": "Wallet ID is required"
        })));
    }

    // Create real Pump.Fun token
    match state_guard.pump_fun_client.create_token(
        request.metadata.clone(),
        &creator_keypair,
        &state_guard.rpc_client,
    ).await {
        Ok(result) => {
            if result.success {
                let response = CreateTokenResponse {
                    success: true,
                    data: Some(TokenCreationData {
                        token_address: result.signature.clone().unwrap_or_default(), // Use signature as token address for now
                        transaction_id: result.signature.unwrap_or_default(),
                        metadata: request.metadata.clone(),
                    }),
                    error: None,
                };
                Ok(HttpResponse::Ok().json(response))
            } else {
                Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "success": false,
                    "data": null,
                    "error": result.error.unwrap_or_else(|| "Unknown error".to_string())
                })))
            }
        }
        Err(e) => {
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "data": null,
                "error": format!("Failed to create token: {}", e)
            })))
        }
    }
}

async fn buy_tokens(
    request: web::Json<BuyRequest>,
    state: web::Data<Arc<Mutex<ApiState>>>,
) -> Result<HttpResponse, Error> {
    let state_guard = state.lock().await;
    
    // Validate request
    if request.solAmounts.len() != request.walletIds.len() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "data": null,
            "error": "Number of SOL amounts must match number of wallet IDs"
        })));
    }
    
    if request.solAmounts.len() > 16 {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "data": null,
            "error": "Maximum 16 wallets allowed per bundle"
        })));
    }
    
    // Call Pump.Fun client for buy tokens
    match state_guard.pump_fun_client.buy_tokens(
        request.into_inner(),
        &state_guard.rpc_client,
    ).await {
        Ok(result) => {
            if result.success {
                let bundle_id = format!("bundle_{}", Uuid::new_v4().to_string().replace("-", ""));
                let response = BundleResponse {
                    success: true,
                    data: Some(BundleData {
                        bundle_id,
                        status: "pending".to_string(),
                        transactions: vec![],
                    }),
                    error: None,
                };
                Ok(HttpResponse::Ok().json(response))
            } else {
                Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "success": false,
                    "data": null,
                    "error": result.error.unwrap_or_else(|| "Unknown error".to_string())
                })))
            }
        }
        Err(e) => {
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "data": null,
                "error": format!("Failed to buy tokens: {}", e)
            })))
        }
    }
}

async fn sell_tokens(
    request: web::Json<SellRequest>,
    state: web::Data<Arc<Mutex<ApiState>>>,
) -> Result<HttpResponse, Error> {
    let state_guard = state.lock().await;
    
    // Validate request
    if request.tokenAmounts.len() != request.walletIds.len() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "data": null,
            "error": "Number of token amounts must match number of wallet IDs"
        })));
    }
    
    if request.tokenAmounts.len() > 16 {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "success": false,
            "data": null,
            "error": "Maximum 16 wallets allowed per bundle"
        })));
    }
    
    // Call Pump.Fun client for sell tokens
    match state_guard.pump_fun_client.sell_tokens(
        request.into_inner(),
        &state_guard.rpc_client,
    ).await {
        Ok(result) => {
            if result.success {
                let bundle_id = format!("bundle_{}", Uuid::new_v4().to_string().replace("-", ""));
                let response = BundleResponse {
                    success: true,
                    data: Some(BundleData {
                        bundle_id,
                        status: "pending".to_string(),
                        transactions: vec![],
                    }),
                    error: None,
                };
                Ok(HttpResponse::Ok().json(response))
            } else {
                Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "success": false,
                    "data": null,
                    "error": result.error.unwrap_or_else(|| "Unknown error".to_string())
                })))
            }
        }
        Err(e) => {
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "data": null,
                "error": format!("Failed to sell tokens: {}", e)
            })))
        }
    }
}

async fn bundle_status(
    bundle_id: web::Path<String>,
    state: web::Data<Arc<Mutex<ApiState>>>,
) -> Result<HttpResponse, Error> {
    let _state_guard = state.lock().await;
    
    // For now, return mock response
    // In production, this would:
    // 1. Query Jito API for bundle status
    // 2. Return real status and transaction data
    
    let response = serde_json::json!({
        "success": true,
        "data": {
            "bundle_id": bundle_id.to_string(),
            "status": "accepted",
            "transactions": [],
            "block_number": 12345678,
            "slot": 12345678
        },
        "error": null
    });
    
    Ok(HttpResponse::Ok().json(response))
}

fn decode_keypair(private_key: &str) -> Result<Keypair, Box<dyn std::error::Error>> {
    let decoded = bs58::decode(private_key)
        .into_vec()?;
    
    if decoded.len() != 64 {
        return Err("Invalid private key length".into());
    }

    Ok(Keypair::from_bytes(&decoded)?)
}

pub async fn start_api_server(
    pump_fun_client: PumpFunClient,
) -> std::io::Result<()> {
    // Initialize Solana RPC client
    let rpc_client = RpcClient::new("https://api.mainnet-beta.solana.com".to_string());
    
    // Create API state
    let state = Arc::new(Mutex::new(ApiState {
        pump_fun_client,
        rpc_client,
    }));
    
    println!("Starting API server on http://127.0.0.1:8080");
    
    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_method()
            .allow_any_header();
        
        App::new()
            .wrap(cors)
            .app_data(web::Data::new(state.clone()))
            .route("/health", web::get().to(health_check))
            .route("/api/token/create", web::post().to(create_token))
            .route("/api/bundle/buy", web::post().to(buy_tokens))
            .route("/api/bundle/sell", web::post().to(sell_tokens))
            .route("/api/bundle/status/{bundle_id}", web::get().to(bundle_status))
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
} 