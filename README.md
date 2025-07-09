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
  userIp: '192.168.1.1'
});

console.log('Editor URL:', editorResponse.editUrl);
```

## Debug Logging

The SDK includes a comprehensive logging system that can be controlled with the `debug` option:

```typescript
// Enable debug logging
const verstka = createVerstkaSDK({
  apiKey: 'your-api-key',
  secret: 'your-secret-key',
  debug: true // Shows detailed debug information
});

// Access logger directly if needed
const logger = verstka.client.getLogger();
logger.info('Custom info message');
logger.debug('This will only show in debug mode');
logger.warn('Warning message');
logger.error('Error message');
```

### Log Levels

- **debug**: Detailed debug information (only shown when `debug: true`)
- **info**: General information messages (always shown)
- **warn**: Warning messages (always shown) 
- **error**: Error messages (always shown)

### Debug Output Example

With `debug: true`, you'll see detailed logs like:

```
[Verstka] 📝 Processing callback for material: article-123
[Verstka] 🔍 Download URL: https://verstka.org/download/...
[Verstka] 🔍 Using temporary directory: /tmp/verstka-article-123-...
[Verstka] 🔍 Found 15 files: ['index.html', 'style.css', ...]
[Verstka] 🔍 Starting parallel download with 20 concurrent streams...
[Verstka] 📝 Download completed: 15/15 files successful
[Verstka] 📝 SaveHandler completed for material: article-123
```

With `debug: false`, you'll only see important messages:

```
[Verstka] 📝 Processing callback for material: article-123
[Verstka] 📝 Download completed: 15/15 files successful
[Verstka] 📝 SaveHandler completed for material: article-123
```

## Configuration Options

```typescript
interface VerstkaSdkOptions {
  apiKey: string;              // Required: Your Verstka API key
  secret: string;              // Required: Your secret key for signatures
  baseUrl?: string;            // Optional: API base URL (default: https://verstka.org/api)
  timeout?: number;            // Optional: Request timeout in ms (default: 30000)
  downloadConcurrency?: number; // Optional: Parallel downloads (default: 20)
  debug?: boolean;             // Optional: Enable debug logging (default: false)
}
```

## Documentation

Coming soon...

## License

MIT