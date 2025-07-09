# Verstka Node.js SDK

Node.js SDK for Verstka editor integration.

## Installation

```bash
npm install @verstka/nodejs-sdk
```

## Quick Start

```typescript
import { createVerstkaSDK } from '@verstka/nodejs-sdk';

// Initialize SDK
const verstka = createVerstkaSDK({
  apiKey: 'your-api-key',
  secret: 'your-secret-key',
  debug: false // Set to true for detailed logging
});

// Open editor
const editorResponse = await verstka.content.openEditor({
  materialId: 'article-123',
  userId: 'user-456',
  callbackUrl: 'https://your-site.com/verstka/callback',
  hostName: 'your-site.com',
});

console.log('Editor URL:', editorResponse.editUrl);

// Process callback after article save
await verstka.content.processCallback(
  {
    download_url: 'https://verstka.org/api/download/session-id',
    material_id: 'article-123',
    html_body: '<article>Your saved content</article>',
    user_id: 'user-456',
    session_id: 'session-id-123',
    custom_fields: {},
    callback_sign: 'verification-signature'
  },
  async ({ fileMap, callbackData, failedFiles, isMobile }) => {
    // Handle downloaded files
    console.log('Downloaded files:', Object.keys(fileMap));
    console.log('Article HTML:', callbackData.html_body);
    console.log('Is mobile version:', isMobile);
    
    // Save files to your storage
    for (const [fileName, filePath] of Object.entries(fileMap)) {
      // Process each file (copy to final destination, upload to CDN, etc.)
      console.log(`File ${fileName} available at: ${filePath}`);
    }
    
    // Handle failed downloads if any
    if (failedFiles.length > 0) {
      console.warn('Some files failed to download:', failedFiles);
    }
  }
);
```

## Example

For a complete working example, see the [example directory](./example) which includes:
- Express.js server setup
- File upload handling 
- Callback processing implementation

## License

MIT