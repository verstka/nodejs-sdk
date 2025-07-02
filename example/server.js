import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createVerstkaSDK } from '../dist/index.js';
import dotenv from 'dotenv';
import localtunnel from 'localtunnel';
import fs from 'fs/promises';

// Load environment variables
dotenv.config();

// ES modules compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Global variable to store tunnel URL
let tunnelUrl = null;

// Initialize Verstka SDK with storage
const verstka = createVerstkaSDK({
  apiKey: process.env.VERSTKA_API_KEY,
  secret: process.env.VERSTKA_SECRET,
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Serve uploaded files
app.use('/uploads', express.static('./uploads'));

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
 * Download files from Verstka and save them locally with parallel processing
 * @param {string} downloadUrl - Base download URL from Verstka
 * @param {string} materialId - Material ID for folder creation
 * @param {number} concurrency - Maximum number of parallel downloads (default: 10)
 * @returns {Promise<Array>} Array of download results
 */
async function downloadAndSaveFiles(downloadUrl, materialId, concurrency = 10) {
  try {
    // Get list of available files
    console.log(`📥 Getting file list from: ${downloadUrl}`);
    const response = await fetch(downloadUrl);
    const fileData = await response.json();
    
    if (fileData.rc !== 1 || !Array.isArray(fileData.data)) {
      throw new Error(`Invalid response: ${fileData.rm || 'Unknown error'}`);
    }
    
    const fileNames = fileData.data;
    console.log(`📋 Found ${fileNames.length} files:`, fileNames);
    
    // Create upload directory for this material
    const uploadDir = path.join('./uploads', materialId);
    await fs.mkdir(uploadDir, { recursive: true });
    
    // Download files with concurrency limit
    console.log(`🚀 Starting parallel download with ${concurrency} concurrent streams...`);
    const results = await downloadFilesWithLimit(fileNames, downloadUrl, uploadDir, concurrency);
    
    const successCount = results.filter(r => r.success).length;
    console.log(`🎉 Download completed: ${successCount}/${fileNames.length} files successful`);
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to get file list:', error);
    throw error;
  }
}

/**
 * Download files with concurrency limit using batches
 * @param {Array<string>} fileNames - Array of file names to download
 * @param {string} downloadUrl - Base download URL
 * @param {string} uploadDir - Directory to save files
 * @param {number} concurrency - Maximum number of parallel downloads
 * @returns {Promise<Array>} Array of download results
 */
async function downloadFilesWithLimit(fileNames, downloadUrl, uploadDir, concurrency) {
  const results = [];
  
  // Process files in batches
  for (let i = 0; i < fileNames.length; i += concurrency) {
    const batch = fileNames.slice(i, i + concurrency);
    console.log(`📦 Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(fileNames.length / concurrency)} (${batch.length} files)`);
    
    // Download all files in current batch in parallel
    const batchPromises = batch.map(fileName => 
      downloadSingleFile(fileName, downloadUrl, uploadDir)
    );
    
    // Wait for all files in batch to complete
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Extract results from Promise.allSettled format
    batchResults.forEach(promiseResult => {
      if (promiseResult.status === 'fulfilled') {
        results.push(promiseResult.value);
      } else {
        // Handle rejected promises
        results.push({
          success: false,
          fileName: 'unknown',
          error: promiseResult.reason?.message || 'Unknown error',
          duration: 0
        });
      }
    });
    
    // Show progress
    const currentSuccess = results.filter(r => r.success).length;
    console.log(`📊 Progress: ${results.length}/${fileNames.length} processed, ${currentSuccess} successful`);
  }
  
  return results;
}

/**
 * Download a single file
 * @param {string} fileName - Name of the file to download
 * @param {string} downloadUrl - Base download URL
 * @param {string} uploadDir - Directory to save the file
 * @returns {Promise<Object>} Download result
 */
async function downloadSingleFile(fileName, downloadUrl, uploadDir) {
  const startTime = Date.now();
  
  try {
    const fileUrl = `${downloadUrl}/${fileName}`;
    console.log(`⬇️  [${fileName}] Starting download...`);
    
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`HTTP ${fileResponse.status}: ${fileResponse.statusText}`);
    }
    
    const fileBuffer = Buffer.from(await fileResponse.arrayBuffer());
    const filePath = path.join(uploadDir, fileName);
    
    await fs.writeFile(filePath, fileBuffer);
    
    const duration = Date.now() - startTime;
    const sizeKB = Math.round(fileBuffer.length / 1024);
    
    console.log(`✅ [${fileName}] Saved: ${sizeKB}KB in ${duration}ms`);
    
    return {
      success: true,
      fileName,
      filePath,
      size: fileBuffer.length,
      duration
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ [${fileName}] Failed after ${duration}ms:`, error.message);
    
    return {
      success: false,
      fileName,
      error: error.message,
      duration
    };
  }
}

/**
 * Replace Verstka URLs in HTML with local paths
 * @param {string} htmlBody - Original HTML content
 * @param {string} materialId - Material ID for path generation
 * @param {string} hostName - Host name for generating full URLs
 * @returns {string} HTML with replaced paths
 */
function replacePathsInHtml(htmlBody, materialId, hostName = 'localhost:3000') {
  if (!htmlBody) return htmlBody;
  
  console.log(`🔄 Replacing paths in HTML for material: ${materialId}`);
  
  let updatedHtml = htmlBody;
  
  // Pattern 2: Replace /vms_images/ paths (internal Verstka paths)
  // Matches: /vms_images/{filename}
  const vmsImagesPattern = /\/vms_images\/([^"'\s>]+)/gi;
  const vmsMatches = updatedHtml.match(vmsImagesPattern) || [];
  
  updatedHtml = updatedHtml.replace(vmsImagesPattern, (match, fileName) => {
    const localPath = `/uploads/${materialId}/${fileName}`;
    console.log(`🔗 [VMS Path] Replacing: ${match} → ${localPath}`);
    return localPath;
  });
  
  return updatedHtml;
}

// API routes for SDK demo
app.post('/api/edit-desktop', async (req, res) => {
  try {
    console.log('Opening Verstka editor for desktop version...');
    console.log('Using callback URL:', getCallbackUrl());
    
    // Open desktop editor
    const editorSession = await verstka.content.openEditor({
      materialId: 'demo-article-desktop',
      userId: 'demo-user-1',
      callbackUrl: getCallbackUrl(),
      hostName: getHostName(),
    });

    console.log('-----> editorSession', editorSession);

    res.json({ 
      success: true, 
      message: 'Desktop editor opened successfully',
      editUrl: editorSession.data.edit_url,
      sessionId: editorSession.data.session_id,
      callbackUrl: getCallbackUrl()
    });
  } catch (error) {
    console.error('Error opening desktop editor:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.rm || 'Unknown error'
    });
  }
});

app.post('/api/edit-mobile', async (req, res) => {
  try {
    // Open mobile editor using convenience method
    const editorSession = await verstka.content.openMobileEditor({
      materialId: 'demo-article-mobile',
      userId: 'demo-user-1',
      callbackUrl: getCallbackUrl(),
      hostName: getHostName(),
      userIp: req.ip,
    });

    res.json({ 
      success: true, 
      message: 'Mobile editor opened successfully',
      editUrl: editorSession.editUrl,
      sessionId: editorSession.sessionId,
      callbackUrl: getCallbackUrl()
    });
  } catch (error) {
    console.error('Error opening mobile editor:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.response?.rm || 'Unknown error'
    });
  }
});

// Callback endpoint for Verstka to save articles
app.post('/api/verstka/callback', async (req, res) => {
  try {
    console.log('📥 [Callback] Received from Verstka:', req.body);
    
    const downloadUrl = req.body.download_url;
    const materialId = req.body.material_id;
    const htmlBody = req.body.html_body;
    
    if (!downloadUrl || !materialId) {
      return res.status(400).json({
        rc: 0,
        rm: 'Missing required parameters: download_url or material_id'
      });
    }

    console.log(`🚀 Processing callback for material: ${materialId}`);
    console.log(`📥 Download URL: ${downloadUrl}`);
    
    // Download and save files
    const downloadResults = await downloadAndSaveFiles(downloadUrl, materialId);
    
    // Log download results
    const successCount = downloadResults.filter(r => r.success).length;
    const totalCount = downloadResults.length;
    console.log(`📊 Download results: ${successCount}/${totalCount} files downloaded successfully`);
    
    // Replace paths in HTML if HTML body is provided
    let updatedHtml = htmlBody;
    if (htmlBody) {
      updatedHtml = replacePathsInHtml(htmlBody, materialId, getHostName());
      
      // Save updated HTML to file
      const htmlPath = path.join('./uploads', materialId, 'article.html');
      await fs.writeFile(htmlPath, updatedHtml, 'utf8');
      console.log(`💾 Saved updated HTML to: ${htmlPath}`);
    }
    
    // Respond in Verstka format
    res.json({
      rc: 1,
      rm: `Article saved successfully. Downloaded ${successCount}/${totalCount} files.`
    });
    
    // Notify that content has been updated (could be used for real-time updates)
    console.log(`🎉 Article ${materialId} is ready for viewing at /article/${materialId}`);
    
  } catch (error) {
    console.error('❌ Error processing callback:', error);
    res.status(500).json({
      rc: 0,
      rm: 'Server error: ' + error.message
    });
  }
});

// API endpoint to get article content for embedding
app.get('/api/article-content/:materialId', async (req, res) => {
  try {
    const materialId = req.params.materialId;
    const htmlPath = path.join('./uploads', materialId, 'article.html');
    
    console.log(`📖 Requesting article content for: ${materialId}`);
    console.log(`📁 Looking for file: ${htmlPath}`);
    
    // Check if HTML file exists
    try {
      await fs.access(htmlPath);
      const htmlContent = await fs.readFile(htmlPath, 'utf8');
      
        res.send(htmlContent); // Send full content if no body div found
    } catch (error) {
      console.log(`❌ Article file not found: ${materialId}`);
      res.status(404).send('');
    }
    
  } catch (error) {
    console.error('Error getting article content:', error);
    res.status(500).send('Server error');
  }
});

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