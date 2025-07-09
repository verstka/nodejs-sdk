/**
 * File download utilities for Verstka SDK
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import pLimit from 'p-limit';
import type { 
  DownloadOptions, 
  DownloadResult, 
  FileMap, 
  FailedFile 
} from './types.js';
import type { VerstkaLogger } from './logger.js';

/**
 * Download files from Verstka and save them to a temporary directory
 * 
 * @param downloadUrl - Base URL for downloading files
 * @param tempDir - Temporary directory to save files
 * @param options - Download options
 * @param logger - Optional logger instance
 * @returns Promise with download results
 */
export async function downloadFiles(
  downloadUrl: string,
  tempDir: string,
  options: DownloadOptions = {},
  logger?: VerstkaLogger
): Promise<DownloadResult> {
  const { concurrency = 20, timeout = 30000 } = options;
  
  try {
    // Get list of available files
    logger?.debug(`Getting file list from: ${downloadUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(downloadUrl, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const fileData = await response.json();
    
    if (fileData.rc !== 1 || !Array.isArray(fileData.data)) {
      throw new Error(`Invalid response: ${fileData.rm || 'Unknown error'}`);
    }
    
    const fileNames = fileData.data as string[];
    logger?.debug(`Found ${fileNames.length} files:`, fileNames);
    
    // Create temporary directory
    await fs.mkdir(tempDir, { recursive: true });
    
    // Download files with concurrency limit
    logger?.debug(`Starting parallel download with ${concurrency} concurrent streams...`);
    
    const limit = pLimit(concurrency);
    const downloadPromises = fileNames.map(fileName =>
      limit(() => downloadSingleFile(fileName, downloadUrl, tempDir, timeout, logger))
    );
    
    const results = await Promise.allSettled(downloadPromises);
    
    // Process results
    const fileMap: FileMap = {};
    const failedFiles: FailedFile[] = [];
    
    results.forEach((result, index) => {
      const fileName = fileNames[index];
      if (!fileName) return; // Skip if fileName is undefined
      
      if (result.status === 'fulfilled') {
        const downloadResult = result.value;
        if (downloadResult.success) {
          fileMap[fileName] = downloadResult.filePath;
        } else {
          failedFiles.push({
            fileName,
            error: downloadResult.error
          });
        }
      } else {
        failedFiles.push({
          fileName,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });
    
    const successCount = Object.keys(fileMap).length;
    logger?.info(`Download completed: ${successCount}/${fileNames.length} files successful`);
    
    if (failedFiles.length > 0) {
      logger?.warn(`${failedFiles.length} files failed to download:`, 
        failedFiles.map(f => f.fileName));
    }
    
    return { fileMap, failedFiles };
    
  } catch (error) {
    logger?.error('Failed to get file list:', error);
    throw error;
  }
}

/**
 * Download a single file from Verstka
 * 
 * @param fileName - Name of the file to download
 * @param downloadUrl - Base download URL
 * @param tempDir - Directory to save the file
 * @param timeout - Request timeout in milliseconds
 * @param logger - Optional logger instance
 * @returns Download result
 */
async function downloadSingleFile(
  fileName: string,
  downloadUrl: string,
  tempDir: string,
  timeout: number,
  logger?: VerstkaLogger
): Promise<{ success: true; filePath: string } | { success: false; error: string }> {
  const startTime = Date.now();
  
  try {
    const fileUrl = `${downloadUrl}/${fileName}`;
    logger?.debug(`[${fileName}] Starting download...`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const fileResponse = await fetch(fileUrl, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!fileResponse.ok) {
      throw new Error(`HTTP ${fileResponse.status}: ${fileResponse.statusText}`);
    }
    
    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
    const filePath = path.join(tempDir, fileName);
    
    await fs.writeFile(filePath, fileBuffer);
    
    const duration = Date.now() - startTime;
    const sizeKB = Math.round(fileBuffer.length / 1024);
    
    logger?.debug(`[${fileName}] Saved: ${sizeKB}KB in ${duration}ms`);
    
    return {
      success: true,
      filePath
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger?.error(`[${fileName}] Failed after ${duration}ms:`, errorMessage);
    
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Create a unique temporary directory for downloads
 * 
 * @param prefix - Directory name prefix
 * @returns Path to the created temporary directory
 */
export function createTempDirectory(prefix: string = 'verstka'): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const dirName = `${prefix}-${timestamp}-${randomSuffix}`;
  
  return path.join(os.tmpdir(), dirName);
} 