import axios, { AxiosInstance } from 'axios';
import { 
  TokenCreationRequest, 
  BuyRequest, 
  SellRequest, 
  RustApiResponse,
  CreateTokenResponse,
  BundleResponse 
} from '../types';

export class RustApiClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    this.baseUrl = 'http://127.0.0.1:8080'; // Default backend URL
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Create a new token using Pump.Fun
   */
  async createToken(request: TokenCreationRequest): Promise<CreateTokenResponse> {
    try {
      // Debug log
      console.log('Sending createToken request:', JSON.stringify(request, null, 2));
      // Transform frontend request to backend format
      const backendRequest = {
        metadata: request.metadata,
        user_id: request.user_id,
        wallet_id: request.wallet_id,
        private_key: request.private_key
      };
      
      console.log('Transformed backend request:', JSON.stringify(backendRequest, null, 2));
      
      const response = await this.client.post<RustApiResponse>('/api/token/create', backendRequest);
      
      if (!response.data.success) {
        console.error('Backend response error:', response.data);
        throw new Error(response.data.error || 'Failed to create token');
      }

      return response.data.data as CreateTokenResponse;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        throw new Error(`API Error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Buy tokens with Jito bundle
   */
  async buyTokens(request: BuyRequest): Promise<BundleResponse> {
    try {
      // Debug log
      console.log('Sending buyTokens request:', JSON.stringify(request, null, 2));
      const response = await this.client.post<RustApiResponse>('/api/bundle/buy', request);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to buy tokens');
      }

      return response.data.data as BundleResponse;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`API Error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Sell tokens with Jito bundle
   */
  async sellTokens(request: SellRequest): Promise<BundleResponse> {
    try {
      // Debug log
      console.log('Sending sellTokens request:', JSON.stringify(request, null, 2));
      const response = await this.client.post<RustApiResponse>('/api/bundle/sell', request);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to sell tokens');
      }

      return response.data.data as BundleResponse;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`API Error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get bundle status
   */
  async getBundleStatus(bundleId: string): Promise<BundleResponse> {
    try {
      const response = await this.client.get<RustApiResponse>(`/api/bundle/status/${bundleId}`);
      
      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to get bundle status');
      }

      return response.data.data as BundleResponse;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`API Error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get API status
   */
  async getApiStatus(): Promise<any> {
    try {
      const response = await this.client.get('/api/status');
      return response.data;
    } catch (error) {
      throw new Error('Failed to get API status');
    }
  }
} 