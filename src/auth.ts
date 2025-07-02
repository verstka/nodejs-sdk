import { createHash } from 'crypto';
import type { VerstkaConfig, OpenEditorParams } from './types.js';

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
   * Get common headers for API requests
   */
  getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'multipart/form-data',
      'User-Agent': 'Verstka-NodeJS-SDK/1.0.0',
    };
  }
} 