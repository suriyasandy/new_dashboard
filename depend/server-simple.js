// Simple Node.js server for Windows compatibility (No Vite required)
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from '@elastic/elasticsearch';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Elasticsearch client with error handling
let esClient;
let esConnected = false;

try {
  esClient = new Client({ node: 'http://localhost:9200' });
  // Test connection
  await esClient.ping();
  esConnected = true;
  console.log('✅ Connected to Elasticsearch');
} catch (error) {
  console.log('⚠️  Elasticsearch not available, using in-memory storage');
  esConnected = false;
}

// In-memory storage fallback
const memoryStorage = {
  dashboardConfig: {
    id: 1,
    userId: 1,
    productType: null,
    legalEntity: null,
    sourceSystem: null,
    startDate: null,
    endDate: null,
    thresholdMode: 'group',
    analysisRun: false,
    dataSourceMode: 'manual',
    updatedAt: new Date().toISOString()
  },
  thresholds: [
    { legalEntity: 'GSLB', currency: 'USD', originalThreshold: 0.25, proposedThreshold: 0.30, adjustedThreshold: 0.28 },
    { legalEntity: 'GSLB', currency: 'EUR', originalThreshold: 0.30, proposedThreshold: 0.35, adjustedThreshold: 0.32 },
    { legalEntity: 'GSIB', currency: 'GBP', originalThreshold: 0.35, proposedThreshold: 0.40, adjustedThreshold: 0.38 },
    { legalEntity: 'GSIB', currency: 'JPY', originalThreshold: 0.40, proposedThreshold: 0.45, adjustedThreshold: 0.42 },
    { legalEntity: 'GSLB', currency: 'CAD', originalThreshold: 0.45, proposedThreshold: 0.50, adjustedThreshold: 0.48 }
  ],
  trades: [],
  uploads: [],
  datasets: []
};

// API Routes
app.get('/api/dashboard/config', (req, res) => {
  res.json(memoryStorage.dashboardConfig);
});

app.post('/api/dashboard/config', (req, res) => {
  memoryStorage.dashboardConfig = { ...memoryStorage.dashboardConfig, ...req.body, updatedAt: new Date().toISOString() };
  res.json(memoryStorage.dashboardConfig);
});

app.get('/api/thresholds', (req, res) => {
  console.log('Threshold mode requested:', req.query.mode);
  console.log('Returning currency data:', memoryStorage.thresholds.length, 'items');
  res.json(memoryStorage.thresholds);
});

app.get('/api/files/uploads', (req, res) => {
  res.json(memoryStorage.uploads);
});

app.get('/api/consolidation/datasets', (req, res) => {
  res.json(memoryStorage.datasets);
});

app.get('/api/trades', (req, res) => {
  res.json(memoryStorage.trades);
});

app.post('/api/impact-analysis', (req, res) => {
  // Mock impact analysis
  memoryStorage.dashboardConfig.analysisRun = true;
  res.json({ success: true, message: 'Impact analysis completed' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    elasticsearch: esConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Serve static files (if dist directory exists)
if (fs.existsSync(path.join(__dirname, 'dist'))) {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  // Catch all handler for React router
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    }
  });
} else {
  // Development mode - serve a simple dashboard
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>GFX Dashboard</title>
        <meta charset="utf-8">
        <style>
          body { font-family: system-ui; margin: 40px; background: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
          .status { padding: 20px; background: #e8f5e8; border-radius: 4px; margin: 20px 0; }
          .api-test { margin: 20px 0; padding: 20px; background: #f0f8ff; border-radius: 4px; }
          button { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
          button:hover { background: #0056b3; }
          pre { background: #f8f9fa; padding: 15px; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 GFX Threshold Dashboard</h1>
          <div class="status">
            <h3>✅ Server Running Successfully</h3>
            <p><strong>Port:</strong> ${PORT}</p>
            <p><strong>Storage:</strong> ${esConnected ? 'Elasticsearch' : 'In-Memory'}</p>
            <p><strong>Status:</strong> Ready for React Frontend</p>
          </div>
          
          <div class="api-test">
            <h3>📊 API Endpoints Test</h3>
            <button onclick="testAPI()">Test Dashboard Config</button>
            <button onclick="testThresholds()">Test Thresholds</button>
            <button onclick="testHealth()">Test Health</button>
            <div id="apiResult"></div>
          </div>

          <h3>🔧 Next Steps</h3>
          <ol>
            <li><strong>Build Frontend:</strong> <code>npm run build</code></li>
            <li><strong>Or Start Dev Mode:</strong> Run React dev server</li>
            <li><strong>Access Full Dashboard:</strong> Once built, refresh this page</li>
          </ol>
        </div>

        <script>
          async function testAPI() {
            try {
              const response = await fetch('/api/dashboard/config');
              const data = await response.json();
              document.getElementById('apiResult').innerHTML = '<h4>Dashboard Config:</h4><pre>' + JSON.stringify(data, null, 2) + '</pre>';
            } catch (error) {
              document.getElementById('apiResult').innerHTML = '<h4>Error:</h4><pre>' + error.message + '</pre>';
            }
          }
          
          async function testThresholds() {
            try {
              const response = await fetch('/api/thresholds');
              const data = await response.json();
              document.getElementById('apiResult').innerHTML = '<h4>Thresholds (' + data.length + ' items):</h4><pre>' + JSON.stringify(data, null, 2) + '</pre>';
            } catch (error) {
              document.getElementById('apiResult').innerHTML = '<h4>Error:</h4><pre>' + error.message + '</pre>';
            }
          }
          
          async function testHealth() {
            try {
              const response = await fetch('/health');
              const data = await response.json();
              document.getElementById('apiResult').innerHTML = '<h4>Health Check:</h4><pre>' + JSON.stringify(data, null, 2) + '</pre>';
            } catch (error) {
              document.getElementById('apiResult').innerHTML = '<h4>Error:</h4><pre>' + error.message + '</pre>';
            }
          }
        </script>
      </body>
      </html>
    `);
  });
}

app.listen(PORT, () => {
  console.log(`🚀 GFX Dashboard server running on http://localhost:${PORT}`);
  console.log(`📊 Storage: ${esConnected ? 'Elasticsearch' : 'In-Memory'}`);
  console.log(`⚡ Ready for ${fs.existsSync(path.join(__dirname, 'dist')) ? 'Production' : 'Development'}`);
});