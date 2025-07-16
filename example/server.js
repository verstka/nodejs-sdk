import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createVerstkaSDK } from '../dist/index.js';
import dotenv from 'dotenv';
import localtunnel from 'localtunnel';
import fs from 'fs/promises';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Express app
 */
const app = express();

/**
 * Middleware
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

/**
 * Serve uploaded files
 */
app.use('/uploads', express.static('./uploads'));

/**
 * Global variable to store tunnel URL
 */
let tunnelUrl = null;

/**
 * Initialize Verstka SDK
 */
const verstka = createVerstkaSDK({
  apiKey: process.env.VERSTKA_API_KEY,
  secret: process.env.VERSTKA_SECRET,
  downloadConcurrency: 10, // Use 10 parallel downloads for this example
  debug: process.env.VERSTKA_DEBUG === 'true', // Enable debug logging via env variable
});

/**
 * Callback endpoint from Verstka to save articles
 */
app.post('/api/verstka/callback', async (req, res) => {
  try {
    console.log('📥 [Callback] Received from Verstka:', req.body);
    
    /**
     * Use Verstka SDK method to process callback with handler
     */
    await verstka.save(req.body, handleVerstkaSave);
    
    /**
     * Respond in Verstka format
     */
    res.json({
      rc: 1,
      rm: 'Article saved successfully using SDK.'
    });
    
  } catch (error) {
    console.error('❌ Error processing callback:', error);
    res.status(500).json({
      rc: 0,
      rm: 'Server error: ' + error.message
    });
  }
});

/**
 * API routes for SDK demo
 */
app.post('/api/edit-desktop', async (req, res) => {
  try {
    console.log('Opening Verstka editor for desktop version...');
    console.log('Using callback URL:', getCallbackUrl());
    
    /**
     * Get current article versions
     */
    const versions = await getArticleVersions('demo');
    
    /**
     * Open desktop editor with current HTML using unified getEditorUrl method
     */
    const editorUrl = await verstka.getEditorUrl({
      materialId: 'demo',
      userId: 'user-1',
      htmlBody: versions.desktop || '',
      callbackUrl: getCallbackUrl(),
      hostName: getHostName(),
    });

    /**
     * Respond with editor session URL 
     * for web to open editor in new tab
     */
    res.json({ 
      editUrl: editorUrl,
    });
  } catch (error) {
    console.error('Error opening desktop editor:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.rm || 'Unknown error'
    });
  }
});

/**
 * API route to open mobile editor
 */
app.post('/api/edit-mobile', async (req, res) => {
  try {
    console.log('Opening Verstka editor for mobile version...');
    console.log('Using callback URL:', getCallbackUrl());
    
    /**
     * Get current article versions
     */
    const versions = await getArticleVersions('demo');
    
    /**
     * Open mobile editor with current HTML using unified getEditorUrl method
     */
    const editorUrl = await verstka.getEditorUrl({
      materialId: 'demo',
      userId: 'user-1',
      htmlBody: versions.mobile || '',
      callbackUrl: getCallbackUrl(),
      hostName: getHostName(),
      isMobile: true,
    });

    res.json({ 
      editUrl: editorUrl,
    });
  } catch (error) {
    console.error('Error opening mobile editor:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.rm || 'Unknown error'
    });
  }
});

/**
 * API endpoint to get article content for embedding
 */
app.get('/api/article-content/:materialId', async (req, res) => {
  try {
    const materialId = req.params.materialId;
    console.log(`📖 Requesting article content for: ${materialId}`);
    
    const versions = await getArticleVersions(materialId);
    
    if (versions.desktop || versions.mobile) {
      res.json(versions);
    } else {
      console.log(`❌ No versions found for material: ${materialId}`);
      res.status(404).json({ error: 'No article versions found' });
    }
    
  } catch (error) {
    console.error('Error getting article content:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Handler for processing downloaded files from Verstka
 * @param {Object} params - Parameters object
 * @param {Object} params.fileMap - Map of file names to temporary file paths
 * @param {Object} params.callbackData - Original callback data from Verstka
 * @param {Array} params.failedFiles - List of files that failed to download
 * @param {boolean} params.isMobile - Whether this is a mobile version
 * @param {string} params.cleanMaterialId - Material ID without 'M' prefix
 */
async function handleVerstkaSave({ fileMap, callbackData, failedFiles, isMobile }) {
  const { material_id, html_body } = callbackData;
  
  const versionSuffix = isMobile ? 'mobile' : 'desktop';
  const folderName = `${material_id}-${versionSuffix}`;
  
  console.log(`💾 [SaveHandler] Processing material: ${material_id} (${versionSuffix})`);
  console.log(`📁 [SaveHandler] Files received:`, Object.keys(fileMap));
  
  /**
   * Create upload directory for this material version
   */
  const uploadDir = path.join('./uploads', folderName);
  await fs.mkdir(uploadDir, { recursive: true });
  
  /**
   * Start with original HTML
   */
  let updatedHtml = html_body || '';
  const successfulFiles = [];
  const copyErrors = [];
  
  /**
   * Process each file sequentially
   */
  for (const [fileName, tempPath] of Object.entries(fileMap)) {
    try {
      const targetPath = path.join(uploadDir, fileName);
      
      /**
       * Copy the file
       */
      await fs.copyFile(tempPath, targetPath);
      console.log(`📋 [SaveHandler] Copied: ${fileName}`);
      
      /**
       * Immediately replace URLs for this file in HTML
       */
      if (updatedHtml) {
        updatedHtml = replaceFilePathInHtml(updatedHtml, fileName, `/uploads/${folderName}/${fileName}`);
        console.log(`🔗 [SaveHandler] Updated HTML paths for: ${fileName}`);
      }
      
      successfulFiles.push(fileName);
      
    } catch (error) {
      console.error(`❌ [SaveHandler] Failed to copy ${fileName}:`, error.message);
      copyErrors.push({ fileName, error: error.message });
    }
  }
  
  /**
   * Save updated HTML if provided
   */
  if (updatedHtml) {
    const htmlPath = path.join(uploadDir, 'index.html');
    await fs.writeFile(htmlPath, updatedHtml, 'utf8');
    console.log(`💾 [SaveHandler] Saved updated HTML to: ${htmlPath}`);
  }
  
  console.log(`📊 [SaveHandler] Summary: ${successfulFiles.length}/${Object.keys(fileMap).length} files copied successfully`);
  
  if (failedFiles.length > 0) {
    console.warn(`⚠️  [SaveHandler] ${failedFiles.length} files failed during download:`, 
      failedFiles.map(f => f.fileName));
  }
  
  if (copyErrors.length > 0) {
    console.warn(`⚠️  [SaveHandler] ${copyErrors.length} files failed during copy:`, 
      copyErrors.map(f => f.fileName));
  }
  
  console.log(`🎉 [SaveHandler] Article ${material_id} (${versionSuffix}) is ready for viewing at /article/${material_id}`);
}

/**
 * Get article versions (desktop and mobile) for a material
 * @param {string} materialId - Material ID
 * @returns {Promise<{desktop: string|null, mobile: string|null}>}
 */
async function getArticleVersions(materialId) {
  const result = { desktop: null, mobile: null };
  
  // Try to read desktop version
  const desktopPath = path.join('./uploads', `${materialId}-desktop`, 'index.html');
  try {
    await fs.access(desktopPath);
    result.desktop = await fs.readFile(desktopPath, 'utf8');
    console.log(`✅ Found desktop version: ${desktopPath}`);
  } catch (error) {
    console.log(`ℹ️  Desktop version not found: ${desktopPath}`);
  }
  
  // Try to read mobile version
  const mobilePath = path.join('./uploads', `${materialId}-mobile`, 'index.html');
  try {
    await fs.access(mobilePath);
    result.mobile = await fs.readFile(mobilePath, 'utf8');
    console.log(`✅ Found mobile version: ${mobilePath}`);
  } catch (error) {
    console.log(`ℹ️  Mobile version not found: ${mobilePath}`);
  }
  
  return result;
}

/**
 * Helper function to get the callback URL
 * Uses tunnel URL if available, otherwise falls back to localhost
 */
function getCallbackUrl() {
  return tunnelUrl ? `${tunnelUrl}/api/verstka/callback` : 'http://localhost:3000/api/verstka/callback';
}

/**
 * Helper function to get the host name
 * Uses tunnel URL if available, otherwise falls back to localhost
 */
function getHostName() {
  if (tunnelUrl) {
    return tunnelUrl.replace(/^https?:\/\//, '');
  }

  return 'localhost:3000';
}

/**
 * Replace URL for a specific file in HTML
 * @param {string} htmlBody - HTML content to process
 * @param {string} fileName - Name of the file to replace
 * @param {string} newPath - New path for the file
 * @returns {string} HTML with replaced path for the specific file
 */
function replaceFilePathInHtml(htmlBody, fileName, newPath) {
  if (!htmlBody || !fileName) return htmlBody;
  
  /**
   * Replace /vms_images/{fileName} with new path
   */
  const vmsPattern = new RegExp(`\\/vms_images\\/${fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
  return htmlBody.replace(vmsPattern, newPath);
}

/**
 * Start server with automatic tunnel setup
 */
async function startServerWithTunnel() {
  const port = parseInt(process.env.PORT) || 3000;
  
  // Create uploads directory if it doesn't exist
  try {
    await fs.mkdir('./uploads', { recursive: true });
    console.log('📁 Uploads directory ready');
  } catch (error) {
    console.error('❌ Failed to create uploads directory:', error);
  }
  
  // Start Express server
  const server = app.listen(port, () => {
    console.log(`🚀 Local server running at http://localhost:${port}`);
    console.log('⏳ Setting up tunnel...');
  });

  try {
    // Create tunnel
    const tunnel = await localtunnel({ 
      port: port,
      subdomain: process.env.TUNNEL_SUBDOMAIN || 'verstka-demo' // Default subdomain
    });
    
    tunnelUrl = tunnel.url;
    console.log(`🌐 Tunnel created: ${tunnelUrl}`);
    console.log(`📧 Callback URL: ${getCallbackUrl()}`);
    console.log(`\n🎯 Ready to receive callbacks from Verstka!`);
    
    // Handle tunnel events
    tunnel.on('close', () => {
      console.log('🔌 Tunnel closed');
      tunnelUrl = null;
    });
    
    tunnel.on('error', (err) => {
      console.error('❌ Tunnel error:', err);
      tunnelUrl = null;
    });
    
  } catch (error) {
    console.error('❌ Failed to create tunnel:', error);
    console.log('⚠️  Continuing with localhost - callbacks will not work with external services');
  }

  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🔌 Shutting down server...');
    server.close();
    process.exit(0);
  });
}

// Start server with tunnel
startServerWithTunnel(); 