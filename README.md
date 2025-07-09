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
```

## License

MIT