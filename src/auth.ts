import { createHash } from 'crypto';
import type { VerstkaConfig, OpenEditorParams, CallbackVerificationParams } from './types.js';

/**
 * Authentication handler for Verstka API
 */
export class VerstkaAuth {
  private apiKey: string;
  private secret: string;

  constructor(config: VerstkaConfig) {
    this.apiKey = config.apiKey;
    this.secret = config.secret;
  }

  /**
   * Get API key
   */
  getApiKey(): string {
    return this.apiKey;
  }

  /**
   * Generate callback signature for opening editor
   * MD5 from: secret + api-key + material_id + user_id + callback_url
   */
  generateCallbackSignature(params: OpenEditorParams): string {
    const components = [
      this.secret,
      this.apiKey,
      params.materialId,
      params.userId,
      params.callbackUrl,
    ];
    
    const concatenated = components.join('');
    const signature = createHash('md5').update(concatenated).digest('hex');

    return signature;
  }

  /**
   * Verify callback signature
   * Generates MD5 from: secret + api-key + material_id + user_id + callback_url
   * and compares with provided signature
   */
  verifyCallbackSignature(params: CallbackVerificationParams): boolean {
    const components = [
      this.secret,
      this.apiKey,
      params.material_id,
      params.user_id,
      params.callback_url,
    ];
    
    const concatenated = components.join('');
    const expectedSignature = createHash('md5').update(concatenated).digest('hex');

    return expectedSignature === params.callback_sign;
  }

  /**
   * Get common headers for API requests
   */
  getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'multipart/form-data',
      'User-Agent': 'Verstka-NodeJS-SDK/1.0.0',
    };
  }
} 