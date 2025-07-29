import { Connection } from "@solana/web3.js";
import { PumpFunClient } from "./pumpfun-client";
import { JitoBundleClient } from "./jito-bundle";
import express, { Request, Response } from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import {
  CreateTokenRequest,
  CreateTokenResponse,
  BuyRequest,
  SellRequest,
  BundleResponse,
  TokenCreationData,
} from "../types/pumpfun";

interface ApiState {
  pumpFunClient: PumpFunClient;
  jitoClient: JitoBundleClient;
  connection: Connection;
}

export class ApiServer {
  private app: express.Application;
  private state: ApiState;

  constructor(pumpFunClient: PumpFunClient, jitoClient: JitoBundleClient) {
    this.app = express();
    this.state = {
      pumpFunClient,
      jitoClient,
      // connection: new Connection("https://api.mainnet-beta.solana.com"),
      connection: new Connection(
        "https://devnet.helius-rpc.com/?api-key=5f3e108f-d6e0-426f-9307-99a62612616f"
      ),
    };

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());
  }

  private setupRoutes(): void {
    this.app.get("/health", this.healthCheck.bind(this));
    this.app.post("/api/token/create", this.createToken.bind(this));
    this.app.post("/api/bundle/buy", this.buyTokens.bind(this));
    this.app.post("/api/bundle/sell", this.sellTokens.bind(this));
    this.app.get("/api/bundle/status/:bundleId", this.bundleStatus.bind(this));
  }

  private async healthCheck(req: Request, res: Response): Promise<void> {
    res.json({
      success: true,
      data: "API is running",
      error: null,
    });
  }

  private async createToken(req: Request, res: Response): Promise<void> {
    try {
      const request: CreateTokenRequest = req.body;

      // Decode the private key
      let creatorKeypair;
      try {
        creatorKeypair = this.state.pumpFunClient.decodeKeypair(
          request.private_key!
        );
      } catch (error: any) {
        res.status(400).json({
          success: false,
          data: null,
          error: `Invalid private key: ${error.message}`,
        });
        return;
      }

      // Validate the wallet belongs to the user
      if (!request.wallet_id!) {
        res.status(400).json({
          success: false,
          data: null,
          error: "Wallet ID is required",
        });
        return;
      }
      // Create real Pump.Fun token
      const result = await this.state.pumpFunClient.createToken(
        request.metadata,
        creatorKeypair,
        this.state.connection
      );

      if (result.success) {
        const response: CreateTokenResponse = {
          success: true,
          data: {
            tokenAddress: result.tokenAddress || "", // Use signature as token address for now
            transactionId: result.signature || "",
            metadata: request.metadata,
          },
        };
        res.json(response);
      } else {
        res.status(400).json({
          success: false,
          data: null,
          error: result.error || "Unknown error",
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        data: null,
        error: `Failed to create token: ${error.message}`,
      });
    }
  }

  private async buyTokens(req: Request, res: Response): Promise<void> {
    try {
      const request: BuyRequest = req.body;

      // Validate request
      if (request.solAmounts.length !== request.walletIds.length) {
        res.status(400).json({
          success: false,
          data: null,
          error: "Number of SOL amounts must match number of wallet IDs",
        });
        return;
      }

      if (request.solAmounts.length > 16) {
        res.status(400).json({
          success: false,
          data: null,
          error: "Maximum 16 wallets allowed per bundle",
        });
        return;
      }

      // Call Pump.Fun client for buy tokens
      const result = await this.state.pumpFunClient.buyTokens(
        request,
        this.state.connection
      );

      if (result.success) {
        const bundleId = `bundle_${uuidv4().replace(/-/g, "")}`;
        const response: BundleResponse = {
          bundleId,
          status: "pending",
          transactions: [],
        };

        res.json({
          success: true,
          data: response,
          error: null,
        });
      } else {
        res.status(400).json({
          success: false,
          data: null,
          error: result.error || "Unknown error",
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        data: null,
        error: `Failed to buy tokens: ${error.message}`,
      });
    }
  }

  private async sellTokens(req: Request, res: Response): Promise<void> {
    try {
      const request: SellRequest = req.body;

      // Validate request
      if (request.tokenAmounts.length !== request.walletIds.length) {
        res.status(400).json({
          success: false,
          data: null,
          error: "Number of token amounts must match number of wallet IDs",
        });
        return;
      }

      if (request.tokenAmounts.length > 16) {
        res.status(400).json({
          success: false,
          data: null,
          error: "Maximum 16 wallets allowed per bundle",
        });
        return;
      }

      // Call Pump.Fun client for sell tokens
      const result = await this.state.pumpFunClient.sellTokens(
        request,
        this.state.connection
      );

      if (result.success) {
        const bundleId = `bundle_${uuidv4().replace(/-/g, "")}`;
        const response: BundleResponse = {
          bundleId,
          status: "pending",
          transactions: [],
        };

        res.json({
          success: true,
          data: response,
          error: null,
        });
      } else {
        res.status(400).json({
          success: false,
          data: null,
          error: result.error || "Unknown error",
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        data: null,
        error: `Failed to sell tokens: ${error.message}`,
      });
    }
  }

  private async bundleStatus(req: Request, res: Response): Promise<void> {
    try {
      const { bundleId } = req.params;

      // For now, return mock response
      // In production, this would query Jito API for bundle status
      const response = {
        success: true,
        data: {
          bundleId,
          status: "accepted",
          transactions: [],
          blockNumber: 12345678,
          slot: 12345678,
        },
        error: null,
      };

      res.json(response);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        data: null,
        error: `Failed to get bundle status: ${error.message}`,
      });
    }
  }

  public start(port: number = 8080): void {
    this.app.listen(port, "127.0.0.1", () => {
      console.log(`Starting API server on http://127.0.0.1:${port}`);
    });
  }
}
