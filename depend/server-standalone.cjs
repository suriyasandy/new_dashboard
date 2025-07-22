// CommonJS Standalone Server - Works with existing dependencies
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// In-memory storage with sample data
const storage = {
  dashboardConfig: {
    id: 1,
    userId: 1,
    productType: 'FX_SPOT',
    legalEntity: 'All Entities',
    sourceSystem: 'All Systems',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    thresholdMode: 'group',
    analysisRun: true,
    dataSourceMode: 'api',
    updatedAt: new Date().toISOString()
  },
  
  thresholds: [
    { 
      id: 1, 
      legalEntity: 'GSLB', 
      currency: 'USD', 
      group: 'G10_MAJOR',
      originalThreshold: 0.25, 
      proposedThreshold: 0.30, 
      adjustedThreshold: 0.28,
      impact: '+12%'
    },
    { 
      id: 2, 
      legalEntity: 'GSLB', 
      currency: 'EUR', 
      group: 'G10_MAJOR',
      originalThreshold: 0.30, 
      proposedThreshold: 0.35, 
      adjustedThreshold: 0.32,
      impact: '+8%'
    },
    { 
      id: 3, 
      legalEntity: 'GSIB', 
      currency: 'GBP', 
      group: 'G10_MINOR',
      originalThreshold: 0.35, 
      proposedThreshold: 0.40, 
      adjustedThreshold: 0.38,
      impact: '+6%'
    },
    { 
      id: 4, 
      legalEntity: 'GSIB', 
      currency: 'JPY', 
      group: 'G10_MINOR',
      originalThreshold: 0.40, 
      proposedThreshold: 0.45, 
      adjustedThreshold: 0.42,
      impact: '+4%'
    }
  ],
  
  trades: [
    {
      id: 1,
      tradeId: 'TR001',
      currency: 'EURUSD',
      amount: 1000000,
      deviationPercent: '23.4',
      alertDescription: 'Threshold exceeded',
      legalEntity: 'GSLB',
      sourceSystem: 'SLANG',
      timestamp: '2024-07-21T10:30:00Z'
    },
    {
      id: 2,
      tradeId: 'TR002',
      currency: 'GBPUSD',
      amount: 750000,
      deviationPercent: '45.2',
      alertDescription: 'High deviation detected',
      legalEntity: 'GSIB',
      sourceSystem: 'SUMMIT',
      timestamp: '2024-07-21T11:15:00Z'
    }
  ],
  
  uploads: [],
  datasets: [],
  analysisResults: {
    totalTrades: 1247,
    activeAlerts: 23,
    thresholdViolations: 45,
    processingRate: 98.7
  }
};

// API Routes
app.get('/api/dashboard/config', (req, res) => {
  res.json(storage.dashboardConfig);
});

app.post('/api/dashboard/config', (req, res) => {
  storage.dashboardConfig = { 
    ...storage.dashboardConfig, 
    ...req.body, 
    updatedAt: new Date().toISOString() 
  };
  res.json(storage.dashboardConfig);
});

app.get('/api/thresholds', (req, res) => {
  const mode = req.query.mode || storage.dashboardConfig.thresholdMode;
  console.log('Threshold mode requested:', mode);
  console.log('Returning threshold data:', storage.thresholds.length, 'items');
  res.json(storage.thresholds);
});

app.get('/api/trades', (req, res) => {
  res.json(storage.trades);
});

app.get('/api/files/uploads', (req, res) => {
  res.json(storage.uploads);
});

app.get('/api/consolidation/datasets', (req, res) => {
  res.json(storage.datasets);
});

app.post('/api/impact-analysis', (req, res) => {
  storage.dashboardConfig.analysisRun = true;
  res.json({ 
    success: true, 
    message: 'Impact analysis completed',
    results: storage.analysisResults 
  });
});

app.get('/api/analysis/results', (req, res) => {
  res.json(storage.analysisResults);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    storage: 'in-memory',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform
  });
});

// Serve static files if built
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'));
    }
  });
} else {
  // Development landing page
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>GFX Dashboard - Local Standalone</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: system-ui, -apple-system, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #333;
          }
          .container { 
            background: white; 
            padding: 3rem;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 700px;
            width: 90%;
          }
          h1 { color: #2d3748; margin-bottom: 1rem; font-size: 2.2rem; text-align: center; }
          .status { 
            background: #f0fff4; 
            border: 2px solid #68d391;
            padding: 1.5rem; 
            border-radius: 12px; 
            margin: 1.5rem 0;
          }
          .status h3 { color: #22543d; margin-bottom: 0.5rem; }
          .api-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 2rem 0;
          }
          .api-button {
            background: #4299e1;
            color: white;
            border: none;
            padding: 1rem;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.2s;
            font-size: 14px;
          }
          .api-button:hover { background: #3182ce; transform: translateY(-2px); }
          .result { 
            background: #f7fafc; 
            border: 1px solid #e2e8f0;
            padding: 1rem; 
            border-radius: 8px; 
            margin-top: 1rem;
            max-height: 300px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 12px;
          }
          .steps { background: #fffbf0; padding: 1.5rem; border-radius: 12px; border: 2px solid #f6ad55; }
          .steps h3 { color: #744210; margin-bottom: 1rem; }
          .steps ol { margin-left: 1.5rem; }
          .steps li { margin-bottom: 0.5rem; color: #744210; }
          .steps code { background: #fed7d7; padding: 0.25rem 0.5rem; border-radius: 4px; font-family: 'Courier New', monospace; }
          .success { background: #e6fffa; border: 2px solid #38b2ac; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
          .success h3 { color: #234e52; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🚀 GFX Dashboard</h1>
          <div class="success">
            <h3>✅ Local Server Running Successfully</h3>
            <p><strong>Node.js:</strong> ${process.version}</p>
            <p><strong>Port:</strong> ${PORT}</p>
            <p><strong>Platform:</strong> ${process.platform}</p>
            <p><strong>Storage:</strong> In-Memory (No External Dependencies)</p>
          </div>
          
          <div class="api-grid">
            <button class="api-button" onclick="testAPI('/api/dashboard/config')">Dashboard Config</button>
            <button class="api-button" onclick="testAPI('/api/thresholds')">Thresholds (${storage.thresholds.length})</button>
            <button class="api-button" onclick="testAPI('/api/trades')">Trades (${storage.trades.length})</button>
            <button class="api-button" onclick="testAPI('/health')">Health Check</button>
          </div>
          <div id="result"></div>

          <div class="steps">
            <h3>🔧 Next Steps</h3>
            <ol>
              <li><strong>Build Frontend:</strong> <code>npm run build</code></li>
              <li><strong>Restart Server:</strong> <code>node server-standalone.cjs</code></li>
              <li><strong>Full Dashboard:</strong> Refresh this page after build</li>
            </ol>
            <p style="margin-top: 1rem; font-style: italic;">This server works completely offline with your existing Node.js v22.17.1</p>
          </div>
        </div>

        <script>
          async function testAPI(endpoint) {
            try {
              const response = await fetch(endpoint);
              const data = await response.json();
              const resultDiv = document.getElementById('result');
              resultDiv.innerHTML = '<div class="result"><h4>' + endpoint + ':</h4><pre>' + JSON.stringify(data, null, 2) + '</pre></div>';
            } catch (error) {
              document.getElementById('result').innerHTML = '<div class="result"><h4>Error:</h4><pre>' + error.message + '</pre></div>';
            }
          }
        </script>
      </body>
      </html>
    `);
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('===============================================');
  console.log('🚀 GFX Dashboard - Standalone Local Server');
  console.log('===============================================');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🟢 Node.js: ${process.version}`);
  console.log(`💾 Storage: In-Memory`);
  console.log(`⚡ Status: Ready`);
  console.log('===============================================');
});