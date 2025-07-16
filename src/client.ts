import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import type { 
  VerstkaConfig, 
  VerstkaApiResponse, 
  VerstkaSdkOptions 
} from './types.js';
import { VerstkaAuth } from './auth.js';
import { VerstkaLogger, createLogger } from './logger.js';

/**
 * Main Verstka API client
 */
export class VerstkaClient {
  private config: VerstkaConfig & { debug: boolean };
  private auth: VerstkaAuth;
  private httpClient: AxiosInstance;
  private logger: VerstkaLogger;

  constructor(options: VerstkaSdkOptions) {
    const defaultBaseUrl = options.dev ? 'https://dev.verstka.org/api' : 'https://verstka.org/api';
    
    this.config = {
      baseUrl: defaultBaseUrl,
      timeout: 30000,
      debug: false,
      ...options,
    };
    
    this.auth = new VerstkaAuth(this.config);
    this.logger = createLogger({ 
      debug: this.config.debug,
      prefix: 'Verstka'
    });

    this.httpClient = axios.create({
      baseURL: this.config.baseUrl!,
      timeout: this.config.timeout!,
      headers: this.auth.getHeaders(),
    });
  }

  /**
   * Get authentication instance
   */
  getAuth(): VerstkaAuth {
    return this.auth;
  }

  /**
   * Get current configuration
   */
  getConfig(): VerstkaConfig {
    return this.config;
  }

  /**
   * Get logger instance
   */
  getLogger(): VerstkaLogger {
    return this.logger;
  }

  /**
   * Make POST request to Verstka API
   */
  async post<T = any>(
    endpoint: string, 
    data: FormData | Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<VerstkaApiResponse<T>> {
    return this.httpClient.post(endpoint, data, config);
  }

  /**
   * Make GET request to Verstka API
   */
  async get<T = any>(
    endpoint: string,
    config?: AxiosRequestConfig
  ): Promise<VerstkaApiResponse<T>> {
    return this.httpClient.get(endpoint, config);
  }

  /**
   * Create FormData for multipart requests
   */
  createFormData(data: Record<string, any>): FormData {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });

    return formData;
  }
} 