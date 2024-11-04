import Store from 'electron-store';
import crypto from 'crypto';

export class TokenManager {
  private static readonly ENCRYPTION_KEY = TokenManager.generateKey();
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly store = new Store({
    name: 'secure-storage'
  });

  // 生成或获取固定长度的密钥
  private static generateKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY || 'your-secure-encryption-key-must-be-32-chars!!';
    // 使用 SHA256 确保密钥长度正确
    return crypto.createHash('sha256').update(key).digest();
  }

  private static encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(
        this.ALGORITHM,
        this.ENCRYPTION_KEY,
        iv
      );

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: cipher.getAuthTag().toString('hex')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  private static decrypt(encrypted: string, iv: string, authTag: string): string {
    try {
      const decipher = crypto.createDecipheriv(
        this.ALGORITHM,
        this.ENCRYPTION_KEY,
        Buffer.from(iv, 'hex')
      );

      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  public static async saveToken(token: string): Promise<void> {
    try {
      const encryptedData = this.encrypt(token);
      this.store.set('github_token', encryptedData);
      console.log('Token saved successfully');
    } catch (error) {
      console.error('Failed to save token:', error);
      throw new Error('Failed to save authentication token');
    }
  }

  public static async getToken(): Promise<string | null> {
    try {
      const encryptedData = this.store.get('github_token');
      if (!encryptedData) return null;
      
      return this.decrypt(
        encryptedData.encrypted,
        encryptedData.iv,
        encryptedData.authTag
      );
    } catch (error) {
      console.error('Failed to retrieve token:', error);
      return null;
    }
  }

  public static async deleteToken(): Promise<void> {
    try {
      this.store.delete('github_token');
      console.log('Token deleted successfully');
    } catch (error) {
      console.error('Failed to delete token:', error);
      throw new Error('Failed to delete authentication token');
    }
  }

  
  // 用于调试
  public static getStorePath(): string {
    return this.store.path;
  }
}