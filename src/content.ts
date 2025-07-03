/**
 * Content management module
 */

import type {
  OpenEditorParams,
  OpenEditorResponse,
  CustomFields,
  CallbackData,
  SaveHandler,
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
   * Open Verstka editor for a material
   * 
   * @param params - Parameters for opening editor
   * @returns Editor session data with edit URL
   */
  async openEditor(params: OpenEditorParams): Promise<OpenEditorResponse> {
    // Generate callback signature
    const callbackSign = this.client.getAuth().generateCallbackSignature(params);

    // Prepare form data
    const formData = this.client.createFormData({
      material_id: params.materialId,
      user_id: params.userId,
      html_body: params.htmlBody || '',
      'api-key': this.client.getAuth().getApiKey(),
      callback_url: params.callbackUrl,
      host_name: params.hostName,
      user_ip: params.userIp,
      callback_sign: callbackSign,
      custom_fields: params.customFields ? JSON.stringify(params.customFields) : undefined,
    });

    // Make API request
    const response = await this.client.post<OpenEditorResponse>('/open', formData);

    return response.data!;
  }

  /**
   * Open editor for mobile version
   * Convenience method that sets mobile: true in custom fields
   */
  async openMobileEditor(params: Omit<OpenEditorParams, 'customFields'> & { 
    customFields?: CustomFields 
  }): Promise<OpenEditorResponse> {
    const mobileParams: OpenEditorParams = {
      ...params,
      materialId: params.materialId.startsWith('M') ? params.materialId : `M${params.materialId}`,
      customFields: {
        mobile: 'M',
        ...params.customFields,
      },
    };

    return this.openEditor(mobileParams);
  }

  /**
   * Process callback from Verstka after article save
   * Downloads files and calls provided saveHandler
   * 
   * @param callbackData - Data received from Verstka callback
   * @param saveHandler - Function to handle downloaded files
   */
  async processCallback(callbackData: CallbackData, saveHandler: SaveHandler): Promise<void> {
    const { download_url, material_id } = callbackData;
    
    if (!download_url || !material_id) {
      throw new Error('Missing required parameters: download_url or material_id');
    }

    console.log(`🚀 Processing callback for material: ${material_id}`);
    console.log(`📥 Download URL: ${download_url}`);

    // Create temporary directory for downloads
    const tempDir = createTempDirectory(`verstka-${material_id}`);
    console.log(`📁 Using temporary directory: ${tempDir}`);

    try {
      // Download files
      const { fileMap, failedFiles } = await downloadFiles(
        download_url,
        tempDir,
        {
          concurrency: this.client.getConfig().downloadConcurrency || 20,
          timeout: this.client.getConfig().timeout || 30000
        }
      );

      const successCount = Object.keys(fileMap).length;
      const totalCount = successCount + failedFiles.length;
      
      console.log(`📊 Download results: ${successCount}/${totalCount} files downloaded successfully`);
      
      if (failedFiles.length > 0) {
        console.warn(`⚠️  Failed files:`, failedFiles.map(f => `${f.fileName}: ${f.error}`));
      }

      // Call the provided saveHandler
      console.log(`🔄 Calling saveHandler for material: ${material_id}`);
      await saveHandler(fileMap, callbackData, failedFiles);
      console.log(`✅ SaveHandler completed for material: ${material_id}`);
      
      console.log(`📁 Temporary files available at: ${tempDir}`);

    } catch (error) {
      console.error(`❌ Error processing callback for material ${material_id}:`, error);
      throw error;
    }
  }
} 