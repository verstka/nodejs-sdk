/**
 * Content management module
 */

import type {
  OpenEditorParams,
  OpenEditorResponse,
  CustomFields,
} from './types.js';
import { VerstkaClient } from './client.js';

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
} 