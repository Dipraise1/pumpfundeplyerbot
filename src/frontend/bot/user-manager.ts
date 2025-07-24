import { User } from '../types';
import { Telegraf } from 'telegraf';

export interface UserSession {
  userId: number;
  state: 'idle' | 'waiting_for_wallet_name' | 'waiting_for_private_key' | 'waiting_for_token_name' | 'waiting_for_token_symbol' | 'waiting_for_token_description' | 'waiting_for_token_image';
  data: any;
  timestamp: Date;
}

export class UserManager {
  private users: Map<number, User> = new Map();
  private sessions: Map<number, UserSession> = new Map();

  /**
   * Get or create a user
   */
  async getOrCreateUser(telegramUser: any): Promise<User> {
    const userId = telegramUser.id;
    
    if (this.users.has(userId)) {
      const user = this.users.get(userId)!;
      user.lastActive = new Date();
      return user;
    }

    const newUser: User = {
      id: userId,
      username: telegramUser.username,
      firstName: telegramUser.first_name,
      lastName: telegramUser.last_name,
      wallets: [],
      createdAt: new Date(),
      lastActive: new Date()
    };

    this.users.set(userId, newUser);
    return newUser;
  }

  /**
   * Get user by ID
   */
  async getUser(userId: number): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  /**
   * Update user
   */
  async updateUser(user: User): Promise<void> {
    this.users.set(user.id, user);
  }

  /**
   * Add wallet to user
   */
  async addWalletToUser(userId: number, wallet: any): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      user.wallets.push(wallet);
      await this.updateUser(user);
    }
  }

  /**
   * Remove wallet from user
   */
  async removeWalletFromUser(userId: number, walletId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      user.wallets = user.wallets.filter(w => w.id !== walletId);
      await this.updateUser(user);
    }
  }

  /**
   * Get all users (for admin purposes)
   */
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  /**
   * Get user count
   */
  async getUserCount(): Promise<number> {
    return this.users.size;
  }

  /**
   * Session management methods
   */
  async setUserSession(userId: number, session: UserSession): Promise<void> {
    this.sessions.set(userId, session);
  }

  async getUserSession(userId: number): Promise<UserSession | null> {
    return this.sessions.get(userId) || null;
  }

  async clearUserSession(userId: number): Promise<void> {
    this.sessions.delete(userId);
  }

  async updateSessionData(userId: number, data: any): Promise<void> {
    const session = await this.getUserSession(userId);
    if (session) {
      session.data = { ...session.data, ...data };
      session.timestamp = new Date();
      await this.setUserSession(userId, session);
    }
  }
} 