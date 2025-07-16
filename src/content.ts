/**
 * Content management module
 */

import type {
  OpenEditorParams,
  GetEditorUrlParams,
  OpenEditorResponse,
  CustomFields,
  CallbackData,
  SaveHandler,
  SaveHandlerParams,
} from './types.js';
import { VerstkaClient } from './client.js';
import { downloadFiles, createTempDirectory } from './download.js';

/**
 * Content manager for Verstka articles and projects
 */
export class VerstkaContentManager {
  private client: VerstkaClient;

  constructor(client: VerstkaClient) {
    this.client = client;
  }

  /**
   * Unified method to get editor URL for desktop or mobile version
   * Replaces openEditor and openMobileEditor methods with single interface
   * 
   * @param params - Parameters including isMobile flag to determine editor type
   * @returns Editor URL for opening the editor
   */
  async getEditorUrl(params: GetEditorUrlParams): Promise<string> {
    const { isMobile, customFields, ...baseParams } = params;
    
    /**
     * Prepare material ID based on mobile flag
     */
    const materialId = isMobile 
      ? (params.materialId.startsWith('M') ? params.materialId : `M${params.materialId}`)
      : params.materialId;

    /**
     * Prepare custom fields with mobile flag
     */
    const finalCustomFields: CustomFields = {
      ...customFields,
      mobile: (isMobile ? 'M' : '') as CustomFields['mobile'],
    };

    /**
     * Build OpenEditorParams for signature generation
     */
    const editorParams: OpenEditorParams = {
      ...baseParams,
      materialId,
      customFields: finalCustomFields,
    };

    /**
     * Generate callback signature
     */
    const callbackSign = this.client.getAuth().generateCallbackSignature(editorParams);

    /**
     * Prepare form data
     */
    const formData = this.client.createFormData({
      material_id: materialId,
      user_id: params.userId,
      html_body: params.htmlBody || '',
      'api-key': this.client.getAuth().getApiKey(),
      callback_url: params.callbackUrl,
      host_name: params.hostName,
      user_ip: params.userIp,
      callback_sign: callbackSign,
      custom_fields: finalCustomFields ? JSON.stringify(finalCustomFields) : undefined,
    });

    /**
     * Make API request
     */
    const response = await this.client.post<{data: {edit_url: string}}>('/open', formData);

    return response.data?.data?.edit_url || '';
  }

  /**
   * Process callback from Verstka after article save
   * Downloads files and calls provided saveHandler
   * 
   * @param callbackData - Data received from Verstka callback
   * @param saveHandler - Function to handle downloaded files
   */
  async save(callbackData: CallbackData, saveHandler: SaveHandler): Promise<void> {
    const { download_url, material_id, custom_fields } = callbackData;
    const logger = this.client.getLogger();
    
    if (!download_url || !material_id) {
      throw new Error('Missing required parameters: download_url or material_id');
    }

    // Determine if this is a mobile version
    const isMobile = custom_fields?.mobile === 'M' || material_id.startsWith('M');
    
    // Clean material_id (remove 'M' prefix if present)
    const cleanMaterialId = material_id.startsWith('M') ? material_id.substring(1) : material_id;

    logger.info(`Processing callback for material: ${material_id} (${isMobile ? 'mobile' : 'desktop'})`);
    logger.debug(`Download URL: ${download_url}`);

    // Create temporary directory for downloads
    const tempDir = createTempDirectory(`verstka-${material_id}`);
    logger.debug(`Using temporary directory: ${tempDir}`);

    try {
      // Download files
      const { fileMap, failedFiles } = await downloadFiles(
        download_url,
        tempDir,
        {
          concurrency: this.client.getConfig().downloadConcurrency || 20,
          timeout: this.client.getConfig().timeout || 30000
        },
        logger
      );

      const successCount = Object.keys(fileMap).length;
      const totalCount = successCount + failedFiles.length;
      
      logger.info(`Download results: ${successCount}/${totalCount} files downloaded successfully`);
      
      if (failedFiles.length > 0) {
        logger.warn(`Failed files:`, failedFiles.map(f => `${f.fileName}: ${f.error}`));
      }

      // Call the provided saveHandler with parameters object
      logger.debug(`Calling saveHandler for material: ${material_id}`);
      await saveHandler({
        fileMap,
        callbackData: {
          ...callbackData,
          material_id: cleanMaterialId,
        },
        failedFiles,
        isMobile,
      });
      logger.info(`SaveHandler completed for material: ${material_id}`);
      
      logger.debug(`Temporary files available at: ${tempDir}`);

    } catch (error) {
      logger.error(`Error processing callback for material ${material_id}:`, error);
      throw error;
    }
  }
} 