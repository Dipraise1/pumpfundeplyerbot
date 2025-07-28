import axios, { AxiosInstance } from "axios";
import { BundleResponse } from "../types/pumpfun";

export class JitoBundleClient {
  private client: AxiosInstance;
  private bundleUrl: string;
  private tipAmount: number;

  constructor(bundleUrl: string) {
    this.client = axios.create({
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
    this.bundleUrl = bundleUrl;
    this.tipAmount = 0.00001; // 0.00001 SOL tip
  }

  async submitBundle(transactions: string[]): Promise<BundleResponse> {
    console.log(`Submitting bundle with ${transactions.length} transactions`);

    if (transactions.length === 0) {
      throw new Error("No transactions to bundle");
    }

    if (transactions.length > 16) {
      throw new Error("Maximum 16 transactions allowed per bundle");
    }

    this.validateTransactions(transactions);

    const tipAccount = "CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM";
    const tipAmountLamports = Math.floor(this.tipAmount * 1e9);

    const request = {
      transactions,
      tip_account: tipAccount,
      tip_amount: tipAmountLamports,
    };

    try {
      const response = await this.client.post(this.bundleUrl, request);
      console.log(`Bundle submitted successfully: ${response.data.bundle_id}`);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Bundle submission failed: ${errorMessage}`);
      throw new Error(`Bundle submission failed: ${errorMessage}`);
    }
  }

  async getBundleStatus(bundleId: string): Promise<BundleResponse> {
    const url = `${this.bundleUrl}/${bundleId}`;

    try {
      const response = await this.client.get(url);
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message;
      console.error(`Failed to get bundle status: ${errorMessage}`);
      throw new Error(`Failed to get bundle status: ${errorMessage}`);
    }
  }

  async submitBundleWithRetry(
    transactions: string[],
    maxRetries: number = 3
  ): Promise<BundleResponse> {
    let retries = 0;
    let lastError: string | undefined;

    while (retries < maxRetries) {
      try {
        const response = await this.submitBundle(transactions);
        if (response.status === "success") {
          return response;
        } else {
          console.warn(`Bundle submission failed: ${response}`);
          lastError = response.status;
        }
      } catch (error: any) {
        console.warn(
          `Bundle submission attempt ${retries + 1} failed: ${error.message}`
        );
        lastError = error.message;
      }

      retries++;
      if (retries < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, retries) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error(
      `Bundle submission failed after ${maxRetries} retries. Last error: ${lastError}`
    );
  }

  validateTransactions(transactions: string[]): void {
    if (transactions.length === 0) {
      throw new Error("No transactions provided");
    }

    if (transactions.length > 16) {
      throw new Error("Maximum 16 transactions allowed per bundle");
    }

    // Validate base64 encoding
    transactions.forEach((tx, index) => {
      try {
        Buffer.from(tx, "base64");
      } catch (error) {
        throw new Error(
          `Invalid base64 transaction at index ${index}: ${error}`
        );
      }
    });
  }

  calculateBundleFee(transactionCount: number): number {
    // Base fee + per-transaction fee
    const baseFee = 0.00001; // 0.00001 SOL base fee
    const perTxFee = 0.000001; // 0.000001 SOL per transaction
    return baseFee + transactionCount * perTxFee;
  }
}
