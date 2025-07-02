/**
 * TypeScript type definitions for Verstka SDK
 */

/**
 * Configuration for Verstka SDK
 */
export interface VerstkaConfig {
  /** API key provided by Verstka */
  apiKey: string;
  /** Secret key for signatures */
  secret: string;
  /** Base API URL */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Standard Verstka API response structure
 */
export interface VerstkaApiResponse<T = any> {
  /** Result code (1 for success) */
  rc: number;
  /** Result message */
  rm: string;
  /** Response data */
  data?: T;
}

/**
 * Parameters for opening editor
 */
export interface OpenEditorParams {
  /** Material identifier (unique non-zero) */
  materialId: string;
  /** Current user ID */
  userId: string;
  /** HTML body of the article */
  htmlBody?: string;
  /** Callback URL for saving */
  callbackUrl: string;
  /** Host name for downloading images */
  hostName: string;
  /** IP address of current user */
  userIp?: string;
  /** Additional custom fields */
  customFields?: CustomFields;
}

/**
 * Custom fields for editor configuration
 */
export interface CustomFields {
  /** Edit mobile version */
  mobile: 'M' | '';
  /** HTTP auth username for host_name */
  auth_user?: string;
  /** HTTP auth password for host_name */
  auth_pw?: string;
  /** Relative path to CSS file with fonts */
  'fonts.css'?: string;
  /** Any additional data */
  [key: string]: any;
}

/**
 * Response from opening editor
 */
export interface OpenEditorResponse {
  /** Unique editing session identifier */
  sessionId: string;
  /** Editor page URL */
  editUrl: string;
  /** Last save time (deprecated) */
  lastSave?: string;
  /** URL to get session content */
  contents?: string;
  /** Relative URL to static content */
  clientFolder?: string;
  /** List of missing images */
  lackingPictures?: string[];
  /** URL for uploading missing images */
  uploadUrl?: string;
}

/**
 * Parameters received on callback save
 */
export interface SaveCallbackParams {
  /** Material identifier */
  materialId: string;
  /** User ID */
  userId: string;
  /** Session identifier */
  sessionId: string;
  /** Saved article HTML */
  htmlBody: string;
  /** URL for downloading static content */
  downloadUrl: string;
  /** Custom fields passed when opening */
  customFields?: CustomFields;
  /** Digital signature */
  callbackSign: string;
}

/**
 * Error response structure
 */
export interface VerstkaError extends Error {
  /** Error code */
  code?: string;
  /** API response */
  response?: VerstkaApiResponse | undefined;
}

/**
 * SDK options
 */
export interface VerstkaSdkOptions extends VerstkaConfig {
  /** Enable debug logging */
  debug?: boolean;
}

// Type definitions will be added here 