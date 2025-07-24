import axios, { AxiosInstance } from 'axios';
import { Transaction } from '@solana/web3.js';

export interface JitoBundleConfig {
  bundleUrl: string;
  tipAccount: string;
  tipAmount: number;
  maxRetries: number;
  timeout: number;
}

export interface BundleSubmission {
  bundleId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'failed';
  transactions: string[];
  tipAccount: string;
  tipAmount: number;
  submittedAt: Date;
  processedAt?: Date;
  error?: string;
}

export interface BundleStatus {
  bundleId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'failed';
  transactions: string[];
  blockNumber?: number;
  slot?: number;
  error?: string;
}

export class JitoBundleClient {
  private config: JitoBundleConfig;
  private client: AxiosInstance;

  constructor(config: JitoBundleConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.bundleUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Submit a bundle of transactions to Jito
   */
  async submitBundle(
    transactions: Transaction[],
    tipAccount: string,
    tipAmount: number
  ): Promise<BundleSubmission> {
    try {
      // Serialize transactions
      const serializedTransactions = transactions.map(tx => {
        const serialized = tx.serialize();
        return serialized.toString('base64');
      });

      // Prepare bundle payload
      const bundlePayload = {
        transactions: serializedTransactions,
        tip_account: tipAccount,
        tip_amount: tipAmount,
        max_search_duration: 1000, // 1 second
        max_retries: this.config.maxRetries,
      };

      console.log(`Submitting bundle with ${transactions.length} transactions to Jito...`);

      // Submit to Jito
      const response = await this.client.post('/api/v1/bundles', bundlePayload);
      
      const bundleId = response.data.bundle_id;
      console.log(`Bundle submitted successfully: ${bundleId}`);

      return {
        bundleId,
        status: 'pending',
        transactions: serializedTransactions,
        tipAccount,
        tipAmount,
        submittedAt: new Date(),
      };

    } catch (error: any) {
      console.error('Failed to submit bundle to Jito:', error.response?.data || error.message);
      
      return {
        bundleId: '',
        status: 'failed',
        transactions: [],
        tipAccount,
        tipAmount,
        submittedAt: new Date(),
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Get bundle status from Jito
   */
  async getBundleStatus(bundleId: string): Promise<BundleStatus> {
    try {
      const response = await this.client.get(`/api/v1/bundles/${bundleId}`);
      
      return {
        bundleId,
        status: response.data.status,
        transactions: response.data.transactions || [],
        blockNumber: response.data.block_number,
        slot: response.data.slot,
        error: response.data.error,
      };

    } catch (error: any) {
      console.error(`Failed to get bundle status for ${bundleId}:`, error.response?.data || error.message);
      
      return {
        bundleId,
        status: 'failed',
        transactions: [],
        error: error.response?.data?.error || error.message,
      };
    }
  }

  /**
   * Submit buy transactions as a bundle
   */
  async submitBuyBundle(
    buyTransactions: Transaction[],
    tipAccount: string,
    tipAmount: number
  ): Promise<BundleSubmission> {
    console.log(`Submitting buy bundle with ${buyTransactions.length} transactions`);
    return this.submitBundle(buyTransactions, tipAccount, tipAmount);
  }

  /**
   * Submit sell transactions as a bundle
   */
  async submitSellBundle(
    sellTransactions: Transaction[],
    tipAccount: string,
    tipAmount: number
  ): Promise<BundleSubmission> {
    console.log(`Submitting sell bundle with ${sellTransactions.length} transactions`);
    return this.submitBundle(sellTransactions, tipAccount, tipAmount);
  }

  /**
   * Wait for bundle confirmation
   */
  async waitForBundleConfirmation(
    bundleId: string,
    maxWaitTime: number = 30000 // 30 seconds
  ): Promise<BundleStatus> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getBundleStatus(bundleId);
      
      if (status.status === 'accepted' || status.status === 'rejected' || status.status === 'failed') {
        return status;
      }
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Timeout
    return {
      bundleId,
      status: 'failed',
      transactions: [],
      error: 'Bundle confirmation timeout',
    };
  }

  /**
   * Get recent bundles for a wallet
   */
  async getRecentBundles(walletAddress: string, limit: number = 10): Promise<BundleStatus[]> {
    try {
      const response = await this.client.get(`/api/v1/bundles/wallet/${walletAddress}?limit=${limit}`);
      return response.data.bundles || [];
    } catch (error: any) {
      console.error('Failed to get recent bundles:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Calculate optimal tip amount based on network conditions
   */
  async calculateOptimalTip(): Promise<number> {
    try {
      const response = await this.client.get('/api/v1/tip-suggestions');
      return response.data.suggested_tip || this.config.tipAmount;
    } catch (error) {
      console.warn('Failed to get optimal tip, using default:', error);
      return this.config.tipAmount;
    }
  }

  /**
   * Get bundle statistics
   */
  async getBundleStats(): Promise<{
    totalBundles: number;
    acceptedBundles: number;
    rejectedBundles: number;
    averageConfirmationTime: number;
  }> {
    try {
      const response = await this.client.get('/api/v1/stats');
      return response.data;
    } catch (error) {
      console.error('Failed to get bundle stats:', error);
      return {
        totalBundles: 0,
        acceptedBundles: 0,
        rejectedBundles: 0,
        averageConfirmationTime: 0,
      };
    }
  }

  /**
   * Validate transaction before bundling
   */
  validateTransaction(transaction: Transaction): boolean {
    try {
      // Check if transaction is properly signed
      if (transaction.signatures.length === 0) {
        console.error('Transaction has no signatures');
        return false;
      }

      // Check if transaction is not too large
      const serialized = transaction.serialize();
      if (serialized.length > 1232) { // Solana transaction size limit
        console.error('Transaction too large:', serialized.length);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Transaction validation failed:', error);
      return false;
    }
  }

  /**
   * Prepare transactions for bundling
   */
  prepareTransactionsForBundle(transactions: Transaction[]): Transaction[] {
    return transactions.filter(tx => this.validateTransaction(tx));
  }
} 