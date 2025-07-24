use anyhow::{Context, Result};
use log::{error, info, warn};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

use crate::types::*;

#[derive(Clone)]
pub struct JitoBundleClient {
    client: Client,
    bundle_url: String,
    tip_amount: f64,
}

#[derive(Debug, Serialize)]
struct BundleRequest {
    transactions: Vec<String>,
    tip_account: String,
    tip_amount: u64,
}

#[derive(Debug, Deserialize)]
pub struct BundleResponse {
    pub bundle_id: String,
    pub status: String,
    pub error: Option<String>,
}

impl JitoBundleClient {
    pub fn new(bundle_url: String) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            bundle_url,
            tip_amount: 0.00001, // 0.00001 SOL tip
        }
    }

    pub async fn submit_bundle(&self, transactions: Vec<String>) -> Result<BundleResponse> {
        info!("Submitting bundle with {} transactions", transactions.len());

        if transactions.is_empty() {
            return Err(anyhow::anyhow!("No transactions to bundle"));
        }

        if transactions.len() > 16 {
            return Err(anyhow::anyhow!("Maximum 16 transactions allowed per bundle"));
        }

        // Create tip account (this would be a real account in practice)
        let tip_account = "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM".to_string();
        let tip_amount_lamports = (self.tip_amount * 1e9) as u64;

        let request = BundleRequest {
            transactions,
            tip_account,
            tip_amount: tip_amount_lamports,
        };

        let response = self
            .client
            .post(&self.bundle_url)
            .json(&request)
            .send()
            .await
            .context("Failed to send bundle request")?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            error!("Bundle submission failed: {}", error_text);
            return Err(anyhow::anyhow!("Bundle submission failed: {}", error_text));
        }

        let bundle_response: BundleResponse = response
            .json()
            .await
            .context("Failed to parse bundle response")?;

        info!("Bundle submitted successfully: {}", bundle_response.bundle_id);

        Ok(bundle_response)
    }

    pub async fn get_bundle_status(&self, bundle_id: &str) -> Result<BundleResponse> {
        let url = format!("{}/{}", self.bundle_url, bundle_id);
        
        let response = self
            .client
            .get(&url)
            .send()
            .await
            .context("Failed to get bundle status")?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            error!("Failed to get bundle status: {}", error_text);
            return Err(anyhow::anyhow!("Failed to get bundle status: {}", error_text));
        }

        let bundle_response: BundleResponse = response
            .json()
            .await
            .context("Failed to parse bundle status response")?;

        Ok(bundle_response)
    }

    pub async fn submit_bundle_with_retry(
        &self,
        transactions: Vec<String>,
        max_retries: u32,
    ) -> Result<BundleResponse> {
        let mut retries = 0;
        let mut last_error = None;

        while retries < max_retries {
            match self.submit_bundle(transactions.clone()).await {
                Ok(response) => {
                    if response.status == "success" {
                        return Ok(response);
                    } else if let Some(error) = &response.error {
                        warn!("Bundle submission failed: {}", error);
                        last_error = Some(error.clone());
                    }
                }
                Err(e) => {
                    warn!("Bundle submission attempt {} failed: {}", retries + 1, e);
                    last_error = Some(e.to_string());
                }
            }

            retries += 1;
            if retries < max_retries {
                // Exponential backoff
                let delay = Duration::from_secs(2u64.pow(retries));
                tokio::time::sleep(delay).await;
            }
        }

        Err(anyhow::anyhow!(
            "Bundle submission failed after {} retries. Last error: {:?}",
            max_retries,
            last_error
        ))
    }

    pub fn validate_transactions(&self, transactions: &[String]) -> Result<()> {
        if transactions.is_empty() {
            return Err(anyhow::anyhow!("No transactions provided"));
        }

        if transactions.len() > 16 {
            return Err(anyhow::anyhow!("Maximum 16 transactions allowed per bundle"));
        }

        // Validate base64 encoding
        for (i, tx) in transactions.iter().enumerate() {
            if let Err(e) = base64::decode(tx) {
                return Err(anyhow::anyhow!("Invalid base64 transaction at index {}: {}", i, e));
            }
        }

        Ok(())
    }

    pub fn calculate_bundle_fee(&self, transaction_count: usize) -> f64 {
        // Base fee + per-transaction fee
        let base_fee = 0.00001; // 0.00001 SOL base fee
        let per_tx_fee = 0.000001; // 0.000001 SOL per transaction
        base_fee + (transaction_count as f64 * per_tx_fee)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_validate_transactions() {
        let client = JitoBundleClient::new("https://test.api.jito.wtf".to_string());
        
        // Valid transactions
        let valid_txs = vec![
            "dGVzdA==".to_string(), // "test" in base64
            "ZXhhbXBsZQ==".to_string(), // "example" in base64
        ];
        
        assert!(client.validate_transactions(&valid_txs).is_ok());
        
        // Invalid base64
        let invalid_txs = vec!["invalid_base64!".to_string()];
        assert!(client.validate_transactions(&invalid_txs).is_err());
        
        // Too many transactions
        let too_many_txs = vec!["dGVzdA==".to_string(); 17];
        assert!(client.validate_transactions(&too_many_txs).is_err());
    }

    #[test]
    fn test_calculate_bundle_fee() {
        let client = JitoBundleClient::new("https://test.api.jito.wtf".to_string());
        
        let fee = client.calculate_bundle_fee(5);
        assert_eq!(fee, 0.00001 + (5.0 * 0.000001));
    }
} 