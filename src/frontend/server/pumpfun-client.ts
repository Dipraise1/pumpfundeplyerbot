import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";
import * as borsh from "borsh";
import {
  BondingCurveData,
  BuyRequest,
  PumpFunConfig,
  SellRequest,
  TokenMetadata,
  TransactionResult,
  ValidationResult,
} from "../types/pumpfun";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";

import {
  generateSigner,
  signerIdentity,
  sol,
  publicKey,
  createSignerFromKeypair,
  keypairIdentity,
  percentAmount,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { base58 } from "@metaplex-foundation/umi/serializers";
import {
  mplTokenMetadata,
  createV1,
  findMetadataPda,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import { mplToolbox } from "@metaplex-foundation/mpl-toolbox";

export class PumpFunClient {
  private programId: PublicKey;
  private feeAddress: PublicKey;
  private config: PumpFunConfig;

  constructor(programId: string, feeAddress: string) {
    this.programId = new PublicKey(programId);
    this.feeAddress = new PublicKey(feeAddress);
    this.config = {
      programId,
      feeAddress,
      creationFee: 0.01,
      tradingFee: 0.005,
      feePercentage: 0.008,
      minSolAmount: 0.02,
      maxWalletsPerBundle: 10,
    };
  }

  async createToken(
    metadata: TokenMetadata,
    creatorKeypair: Keypair,
    connection: Connection
  ): Promise<TransactionResult> {
    // console.log("Creating token with metadata:", metadata);

    // Validate metadata
    const validation = this.validateTokenMetadata(metadata);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(", "),
      };
    }

    // Check creator balance
    const balance = await connection.getBalance(creatorKeypair.publicKey);
    const requiredBalance =
      this.config.creationFee * LAMPORTS_PER_SOL + 10000000; // 0.01 SOL buffer for rent

    if (balance < requiredBalance) {
      return {
        success: false,
        error: `Insufficient balance. Required: ${requiredBalance / LAMPORTS_PER_SOL} SOL, Available: ${balance / LAMPORTS_PER_SOL} SOL`,
      };
    }

    try {
      // Create token mint keypair
      const tokenMint = Keypair.generate();
      const tokenMintPubkey = tokenMint.publicKey;

      // Calculate rent for mint account
      const mintRent = await connection.getMinimumBalanceForRentExemption(82);

      // Build instructions
      const instructions: TransactionInstruction[] = [];

      // 1. Create the mint account
      instructions.push(
        SystemProgram.createAccount({
          fromPubkey: creatorKeypair.publicKey,
          newAccountPubkey: tokenMintPubkey,
          lamports: mintRent,
          space: 82,
          programId: TOKEN_PROGRAM_ID,
        })
      );

      // 2. Initialize the mint
      instructions.push(
        createInitializeMintInstruction(
          tokenMintPubkey,
          9,
          creatorKeypair.publicKey,
          creatorKeypair.publicKey
        )
      );

      // 3. Transfer creation fee first (before Pump.Fun interaction)
      instructions.push(
        SystemProgram.transfer({
          fromPubkey: creatorKeypair.publicKey,
          toPubkey: this.feeAddress,
          lamports: Math.floor(this.config.creationFee * LAMPORTS_PER_SOL),
        })
      );

      // Build and sign transaction (without Pump.Fun for now)
      const transaction = new Transaction().add(...instructions);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = creatorKeypair.publicKey;

      transaction.sign(creatorKeypair, tokenMint);

      // Send transaction
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [creatorKeypair, tokenMint]
      );

      // console.log("Token created successfully:", tokenMintPubkey.toString());
      // console.log("Transaction signature:", signature);

      // === METADATA CREATION ===

      const umi = createUmi(connection.rpcEndpoint)
        .use(mplTokenMetadata())
        .use(mplToolbox());

      const umiKeypair = umi.eddsa.createKeypairFromSecretKey(
        creatorKeypair.secretKey
      );
      const umiTokenKeypair = umi.eddsa.createKeypairFromSecretKey(
        tokenMint.secretKey
      );
      const umiTokenSigner = createSignerFromKeypair(umi, umiTokenKeypair);
      const signer = createSignerFromKeypair(umi, umiKeypair);
      umi.use(keypairIdentity(signer));

      const createMetaTx = await createV1(umi, {
        mint: umiTokenSigner,
        authority: umi.identity,
        payer: umi.identity,
        updateAuthority: umi.identity,
        name: metadata.name,
        symbol: metadata.symbol,
        uri: "https://raw.githubusercontent.com/solana-developers/program-examples/new-examples/tokens/tokens/.assets/spl-token.json", // metadata.image_url!,
        sellerFeeBasisPoints: percentAmount(0),
        tokenStandard: TokenStandard.Fungible,
      }).sendAndConfirm(umi);

      // const metadataSig = base58.deserialize(createMetaTx.signature);

      // Return the token mint address as the token address
      return {
        success: true,
        signature: signature,
        transactionId: signature,
        tokenAddress: tokenMintPubkey.toString(),
        feePaid: this.config.creationFee,
      };
    } catch (error: any) {
      console.error("Failed to create token:", error);
      return {
        success: false,
        error: `Failed to create token: ${error.message}`,
      };
    }
  }
  async buyTokens(
    request: BuyRequest,
    connection: Connection
  ): Promise<TransactionResult> {
    console.log("Buying tokens:", request);

    if (request.solAmounts.length === 0) {
      return {
        success: false,
        error: "No SOL amounts provided",
      };
    }

    try {
      const tokenMint = new PublicKey(request.tokenAddress);

      // Get bonding curve data
      const bondingCurve = await this.getBondingCurveData(
        tokenMint,
        connection
      );

      // Calculate total SOL needed
      let totalSolNeeded = 0;
      for (const solAmount of request.solAmounts) {
        const tokensReceived = this.calculateTokensForSol(
          solAmount,
          bondingCurve
        );
        totalSolNeeded += solAmount;
      }

      // Create buy instruction
      const buyIx = this.createBuyInstruction(
        tokenMint,
        request.solAmounts,
        request.walletIds
      );

      // Build transaction with instructions
      const instructions = [buyIx];

      // Add SOL transfers for each wallet
      for (let i = 0; i < request.solAmounts.length; i++) {
        const solAmount = request.solAmounts[i];
        // In real implementation, get actual wallet keypairs
        const walletKeypair = Keypair.generate(); // Placeholder

        instructions.push(
          SystemProgram.transfer({
            fromPubkey: walletKeypair.publicKey,
            toPubkey: this.feeAddress,
            lamports: solAmount * LAMPORTS_PER_SOL,
          })
        );
      }

      const transaction = new Transaction().add(...instructions);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // Sign and send transaction (placeholder implementation)
      const signature = "placeholder_signature";

      return {
        success: true,
        signature: signature,
        feePaid: totalSolNeeded * this.config.tradingFee,
      };
    } catch (error: any) {
      console.error("Failed to buy tokens:", error);
      return {
        success: false,
        error: `Failed to buy tokens: ${error.message}`,
      };
    }
  }

  async sellTokens(
    request: SellRequest,
    connection: Connection
  ): Promise<TransactionResult> {
    console.log("Selling tokens:", request);

    if (request.tokenAmounts.length === 0) {
      return {
        success: false,
        error: "No token amounts provided",
      };
    }

    try {
      const tokenMint = new PublicKey(request.tokenAddress);

      // Get bonding curve data
      const bondingCurve = await this.getBondingCurveData(
        tokenMint,
        connection
      );

      // Calculate total SOL to receive
      let totalSolReceived = 0;
      for (const tokenAmount of request.tokenAmounts) {
        const solReceived = this.calculateSolForTokens(
          tokenAmount,
          bondingCurve
        );
        totalSolReceived += solReceived;
      }

      // Create sell instruction
      const sellIx = this.createSellInstruction(
        tokenMint,
        request.tokenAmounts,
        request.walletIds
      );

      const transaction = new Transaction().add(sellIx);
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;

      // Sign and send transaction (placeholder implementation)
      const signature = "placeholder_signature";

      return {
        success: true,
        signature: signature,
        feePaid: totalSolReceived * this.config.tradingFee,
      };
    } catch (error: any) {
      console.error("Failed to sell tokens:", error);
      return {
        success: false,
        error: `Failed to sell tokens: ${error.message}`,
      };
    }
  }

  validateTokenMetadata(metadata: TokenMetadata): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (!metadata.name || metadata.name.length > 32) {
      result.isValid = false;
      result.errors.push("Token name must be 1-32 characters");
    }

    if (!metadata.symbol || metadata.symbol.length > 8) {
      result.isValid = false;
      result.errors.push("Token symbol must be 1-8 characters");
    }

    if (!metadata.description || metadata.description.length > 200) {
      result.isValid = false;
      result.errors.push("Description must be 1-200 characters");
    }

    try {
      new URL(metadata.image_url!);
    } catch {
      result.isValid = false;
      result.errors.push("Invalid image URL");
    }

    if (!metadata.telegram_link) {
      result.isValid = false;
      result.errors.push("Telegram link is required");
    }

    if (!metadata.twitter_link) {
      result.isValid = false;
      result.errors.push("Twitter link is required");
    }

    return result;
  }

  private createInitCurveInstruction(
    tokenMint: PublicKey,
    creator: PublicKey,
    creatorAta: PublicKey,
    programAta: PublicKey,
    metadata: TokenMetadata
  ): TransactionInstruction {
    // Serialize metadata
    const metadataBuffer = Buffer.from(JSON.stringify(metadata));

    // Create instruction data with discriminator
    const data = Buffer.concat([
      Buffer.from([0]), // Discriminator for init curve
      metadataBuffer,
    ]);

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: tokenMint, isSigner: false, isWritable: true },
        { pubkey: creator, isSigner: true, isWritable: true },
        { pubkey: creatorAta, isSigner: false, isWritable: true },
        { pubkey: programAta, isSigner: false, isWritable: true },
        { pubkey: this.feeAddress, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        {
          pubkey: ASSOCIATED_TOKEN_PROGRAM_ID,
          isSigner: false,
          isWritable: false,
        },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });
  }

  private createBuyInstruction(
    tokenMint: PublicKey,
    solAmounts: number[],
    walletIds: string[]
  ): TransactionInstruction {
    const buyData = {
      discriminator: 1,
      solAmounts,
      walletIds,
    };

    const data = Buffer.from(JSON.stringify(buyData));

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: tokenMint, isSigner: false, isWritable: true },
        { pubkey: this.feeAddress, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data,
    });
  }

  private createSellInstruction(
    tokenMint: PublicKey,
    tokenAmounts: number[],
    walletIds: string[]
  ): TransactionInstruction {
    const sellData = {
      discriminator: 2,
      tokenAmounts,
      walletIds,
    };

    const data = Buffer.from(JSON.stringify(sellData));

    return new TransactionInstruction({
      programId: this.programId,
      keys: [
        { pubkey: tokenMint, isSigner: false, isWritable: true },
        { pubkey: this.feeAddress, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data,
    });
  }

  private async getBondingCurveData(
    tokenMint: PublicKey,
    connection: Connection
  ): Promise<BondingCurveData> {
    // Placeholder implementation - in reality, you'd fetch from the blockchain
    return {
      tokenAddress: tokenMint.toString(),
      currentPrice: 0.001,
      totalSupply: 1000000,
      solReserve: 1000.0,
      tokenReserve: 1000000.0,
    };
  }

  private calculateSolForTokens(
    tokenAmount: number,
    bondingCurve: BondingCurveData
  ): number {
    // Constant product formula (simplified)
    const k = bondingCurve.solReserve * bondingCurve.tokenReserve;
    const newTokenReserve = bondingCurve.tokenReserve - tokenAmount;
    const newSolReserve = k / newTokenReserve;
    const solNeeded = newSolReserve - bondingCurve.solReserve;

    // Add Pump.Fun fees
    const fee = solNeeded * this.config.tradingFee;
    return solNeeded + fee;
  }

  private calculateTokensForSol(
    solAmount: number,
    bondingCurve: BondingCurveData
  ): number {
    // Constant product formula (simplified)
    const k = bondingCurve.solReserve * bondingCurve.tokenReserve;
    const newSolReserve = bondingCurve.solReserve + solAmount;
    const newTokenReserve = k / newSolReserve;
    const tokensReceived = bondingCurve.tokenReserve - newTokenReserve;

    // Subtract Pump.Fun fees
    const fee = tokensReceived * this.config.tradingFee;
    return tokensReceived - fee;
  }

  decodeKeypair(privateKey: string): Keypair {
    const decoded = bs58.decode(privateKey);
    if (decoded.length !== 64) {
      throw new Error("Invalid private key length");
    }
    return Keypair.fromSecretKey(decoded);
  }
}
