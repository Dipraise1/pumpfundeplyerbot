import axios, { AxiosInstance } from "axios";
import {
  TokenCreationRequest,
  BuyRequest,
  SellRequest,
  RustApiResponse,
  CreateTokenResponse,
  BundleResponse,
} from "../types";
import dotenv from "dotenv";

dotenv.config();
export class TypeApiClient {
  private client: AxiosInstance;

  constructor(
    baseUrl: string = process.env.NODE_ENV === "production"
      ? "https://pumpfundeplyerbot.onrender.com"
      : "http://localhost:8080"
  ) {
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /** Health Check */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await this.client.get("/health");
      return res.status === 200;
    } catch {
      return false;
    }
  }

  /** Create Token */
  async createToken(
    request: TokenCreationRequest
  ): Promise<CreateTokenResponse> {
    try {
      // console.log("Creating token with request:", request);
      const response = await this.client.post<RustApiResponse>(
        "/api/token/create",
        {
          metadata: request.metadata,
          user_id: request.user_id,
          wallet_id: request.wallet_id,
          private_key: request.private_key,
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.error || "Token creation failed");
      }
      // console.log("Token created successfully:", response.data);
      return response.data.data as CreateTokenResponse;
    } catch (error: any) {
      throw new Error(
        axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : error.message
      );
    }
  }

  /** Buy Token Bundle */
  async buyTokens(request: BuyRequest): Promise<BundleResponse> {
    try {
      const res = await this.client.post<RustApiResponse>(
        "/api/bundle/buy",
        request
      );
      if (!res.data.success) {
        throw new Error(res.data.error || "Buying tokens failed");
      }
      return res.data.data as BundleResponse;
    } catch (error: any) {
      throw new Error(
        axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : error.message
      );
    }
  }

  /** Sell Token Bundle */
  async sellTokens(request: SellRequest): Promise<BundleResponse> {
    try {
      const res = await this.client.post<RustApiResponse>(
        "/api/bundle/sell",
        request
      );
      if (!res.data.success) {
        throw new Error(res.data.error || "Selling tokens failed");
      }
      return res.data.data as BundleResponse;
    } catch (error: any) {
      throw new Error(
        axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : error.message
      );
    }
  }

  /** Get Bundle Status */
  async getBundleStatus(bundleId: string): Promise<BundleResponse> {
    try {
      const res = await this.client.get<RustApiResponse>(
        `/api/bundle/status/${bundleId}`
      );
      if (!res.data.success) {
        throw new Error(res.data.error || "Failed to get bundle status");
      }
      return res.data.data as BundleResponse;
    } catch (error: any) {
      throw new Error(
        axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : error.message
      );
    }
  }

  /** Get API status (optional) */
  async getApiStatus(): Promise<any> {
    try {
      const res = await this.client.get("/api/status");
      return res.data;
    } catch (error: any) {
      throw new Error("Failed to fetch API status");
    }
  }
}
