// Export main classes
export { VerstkaClient } from './client.js';
export { VerstkaAuth } from './auth.js';
export { VerstkaContentManager } from './content.js';
export { VerstkaLogger, createLogger } from './logger.js';

// Export types
export type {
  VerstkaConfig,
  VerstkaApiResponse,
  VerstkaError,
  VerstkaSdkOptions,
  GetEditorUrlParams,
  OpenEditorResponse,
  SaveCallbackParams,
  CustomFields,
  CallbackData,
  FileMap,
  FailedFile,
  SaveHandler,
  DownloadOptions,
  DownloadResult,
} from './types.js';

export type {
  LogLevel,
  LoggerConfig,
} from './logger.js';

// Import types for function usage
import type { VerstkaSdkOptions } from './types.js';
import { VerstkaClient } from './client.js';
import { VerstkaContentManager } from './content.js';

// Export convenience function
export function createVerstkaClient(options: VerstkaSdkOptions): VerstkaClient {
  return new VerstkaClient(options);
}


// Export convenience function for content manager
export function createVerstkaSDK(options: VerstkaSdkOptions) {
  const client = new VerstkaClient(options);
  const contentManager = new VerstkaContentManager(client);
  
  return {
    save: contentManager.save.bind(contentManager),
    getEditorUrl: contentManager.getEditorUrl.bind(contentManager),
  };
} 