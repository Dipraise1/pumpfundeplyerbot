import { Wallet, User } from "../types";
import {
  Keypair,
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as crypto from "crypto";
import * as bs58 from "bs58";
import { v4 as uuidv4 } from "uuid";
import { RustApiClient } from "../utils/rust-api-client";

export class WalletManager {
  private encryptionKey: string;
  private rustApiClient: RustApiClient;
  private connection: Connection;

  constructor(
    encryptionKey: string,
    rustApiClient: RustApiClient,
    rpcUrl?: string
  ) {
    this.encryptionKey = encryptionKey;
    this.rustApiClient = rustApiClient;
    this.connection = new Connection(
      rpcUrl || "https://api.mainnet-beta.solana.com",
      "confirmed"
    );
  }

  /**
   * Create a new wallet for a user
   */
  async createWallet(userId: number, name: string): Promise<Wallet> {
    try {
      const keypair = Keypair.generate();
      const publicKey = keypair.publicKey.toBase58();
      const privateKey = bs58.encode(keypair.secretKey);

      // Encrypt private key for storage
      const encryptedPrivateKey = this.encryptPrivateKey(privateKey);

      const wallet: Wallet = {
        id: uuidv4(),
        name,
        publicKey,
        encryptedPrivateKey,
        balance: 0,
        isActive: true,
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      // Get initial balance from Solana network
      try {
        const balance = await this.getWalletBalance(publicKey);
        wallet.balance = balance;
      } catch (error) {
        console.warn("Failed to get initial balance:", error);
        // Continue with 0 balance
      }

      return wallet;
    } catch (error) {
      console.error("Error creating wallet:", error);
      throw new Error("Failed to create wallet");
    }
  }

  /**
   * Import a wallet using private key
   */
  async importWallet(
    userId: number,
    name: string,
    privateKeyInput: string
  ): Promise<Wallet> {
    try {
      let secretKey: Uint8Array;

      // Try to parse key in multiple formats
      if (privateKeyInput.startsWith("[")) {
        // JSON array format (Uint8Array)
        const parsed = JSON.parse(privateKeyInput);
        if (!Array.isArray(parsed)) {
          throw new Error("Invalid private key array format");
        }
        secretKey = Uint8Array.from(parsed);
      } else {
        try {
          // Try base58 decode (Solana-style)
          secretKey = bs58.decode(privateKeyInput);
        } catch {
          try {
            // Fallback to base64
            secretKey = Uint8Array.from(Buffer.from(privateKeyInput, "base64"));
          } catch {
            throw new Error(
              "Private key is not valid base58, base64, or JSON array"
            );
          }
        }
      }

      // Generate Keypair and public key
      const keypair = Keypair.fromSecretKey(secretKey);
      const publicKey = keypair.publicKey.toBase58();

      // Encrypt the private key for storage
      const encryptedPrivateKey = this.encryptPrivateKey(privateKeyInput);

      const wallet: Wallet = {
        id: uuidv4(),
        name,
        publicKey,
        encryptedPrivateKey,
        balance: 0,
        isActive: true,
        createdAt: new Date(),
        lastUsed: new Date(),
      };

      // Try to get wallet balance (non-fatal)
      try {
        wallet.balance = await this.getWalletBalance(publicKey);
      } catch (error) {
        console.warn("⚠️ Failed to get balance for imported wallet:", error);
      }

      return wallet;
    } catch (error) {
      throw new Error("Invalid private key format");
    }
  }

  /**
   * Get wallet balance from Solana network
   */
  async getWalletBalance(publicKey: string): Promise<number> {
    try {
      const pubKey = new PublicKey(publicKey);
      const balance = await this.connection.getBalance(pubKey);
      return balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
    } catch (error) {
      console.error("Error getting wallet balance:", error);
      return 0;
    }
  }

  /**
   * Get token balance for a specific token
   */
  async getTokenBalance(
    walletPublicKey: string,
    tokenMint: string
  ): Promise<number> {
    try {
      const { getAssociatedTokenAddress } = await import("@solana/spl-token");
      const walletPubKey = new PublicKey(walletPublicKey);
      const mintPubKey = new PublicKey(tokenMint);

      const tokenAccount = await getAssociatedTokenAddress(
        mintPubKey,
        walletPubKey
      );

      try {
        const tokenAccountInfo =
          await this.connection.getTokenAccountBalance(tokenAccount);
        return Number(tokenAccountInfo.value.amount);
      } catch (error) {
        // Token account doesn't exist, return 0
        return 0;
      }
    } catch (error) {
      console.error("Error getting token balance:", error);
      return 0;
    }
  }

  /**
   * Update wallet balance
   */
  async updateWalletBalance(wallet: Wallet): Promise<Wallet> {
    const balance = await this.getWalletBalance(wallet.publicKey);
    return {
      ...wallet,
      balance,
      lastUsed: new Date(),
    };
  }

  /**
   * Get Keypair from wallet for transaction signing
   */
  getKeypairFromWallet(wallet: Wallet): Keypair {
    const privateKey = this.decryptPrivateKey(wallet.encryptedPrivateKey);
    const secretKey = bs58.decode(privateKey);
    return Keypair.fromSecretKey(secretKey);
  }

  /**
   * Validate wallet exists and belongs to user
   */
  validateWalletOwnership(user: User, walletId: string): Wallet | null {
    return user.wallets.find((w) => w.id === walletId) || null;
  }

  /**
   * Get active wallets for user
   */
  getActiveWallets(user: User): Wallet[] {
    return user.wallets.filter((w) => w.isActive);
  }

  /**
   * Check if wallet has sufficient balance for transaction
   */
  async hasSufficientBalance(
    wallet: Wallet,
    requiredSol: number
  ): Promise<boolean> {
    const balance = await this.getWalletBalance(wallet.publicKey);
    return balance >= requiredSol;
  }

  /**
   * Get transaction history for wallet
   */
  async getTransactionHistory(
    walletPublicKey: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const pubKey = new PublicKey(walletPublicKey);
      const signatures = await this.connection.getSignaturesForAddress(pubKey, {
        limit,
      });

      const transactions = await Promise.all(
        signatures.map(async (sig) => {
          try {
            const tx = await this.connection.getTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0,
            });
            return {
              signature: sig.signature,
              slot: sig.slot,
              blockTime: sig.blockTime,
              transaction: tx,
            };
          } catch (error) {
            console.warn("Failed to get transaction:", sig.signature);
            return null;
          }
        })
      );

      return transactions.filter((tx) => tx !== null);
    } catch (error) {
      console.error("Error getting transaction history:", error);
      return [];
    }
  }

  /**
   * Decrypt private key for transaction signing
   */
  decryptPrivateKey(encryptedPrivateKey: string): string {
    try {
      const parts = encryptedPrivateKey.split(":");
      if (parts.length !== 3) {
        // Try to decode as base64 (fallback for development)
        return Buffer.from(encryptedPrivateKey, "base64").toString("utf8");
      }

      const iv = Buffer.from(parts[0] || "", "hex");
      const authTag = Buffer.from(parts[1] || "", "hex");
      const encrypted = Buffer.from(parts[2] || "", "hex");

      const algorithm = "aes-256-gcm";
      const key = crypto.scryptSync(this.encryptionKey, "salt", 32);

      const decipher = crypto.createDecipheriv(algorithm, key, iv) as any;
      decipher.setAAD(Buffer.from("pump-swap-bot", "utf8"));
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]);

      return decrypted.toString("utf8");
    } catch (error) {
      console.error("Error decrypting private key:", error);
      throw new Error("Failed to decrypt private key");
    }
  }

  /**
   * Encrypt private key for storage
   */
  private encryptPrivateKey(privateKey: string): string {
    try {
      const algorithm = "aes-256-gcm";
      const key = crypto.scryptSync(this.encryptionKey, "salt", 32);
      const iv = crypto.randomBytes(16);

      // Use createCipheriv for modern Node.js compatibility
      const cipher = crypto.createCipheriv(algorithm, key, iv) as any;
      cipher.setAAD(Buffer.from("pump-swap-bot", "utf8"));

      const encrypted = Buffer.concat([
        cipher.update(privateKey, "utf8"),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
    } catch (error) {
      console.error("Error encrypting private key:", error);
      // Fallback to simple encoding for development
      return Buffer.from(privateKey).toString("base64");
    }
  }
}
