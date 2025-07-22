import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { z } from "zod";
import { insertThresholdSchema, insertTradeDataSchema } from "@shared/schema";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // Dashboard configuration endpoints
  app.get("/api/dashboard/config", async (req, res) => {
    try {
      const userId = 1; // Default user for now
      const config = await storage.getDashboardConfig(userId);
      res.json(config || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to get dashboard config" });
    }
  });

  app.post("/api/dashboard/config", async (req, res) => {
    try {
      const userId = 1; // Default user for now
      const config = await storage.updateDashboardConfig(userId, req.body);
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to update dashboard config" });
    }
  });

  // Trade data endpoints
  app.get("/api/trades", async (req, res) => {
    try {
      const { productType, legalEntity, sourceSystem, startDate, endDate } = req.query;
      
      const filters: any = {};
      if (productType) filters.productType = productType as string;
      if (legalEntity) filters.legalEntity = legalEntity as string;
      if (sourceSystem) filters.sourceSystem = sourceSystem as string;
      if (startDate) filters.startDate = new Date(startDate as string);
      if (endDate) filters.endDate = new Date(endDate as string);

      const trades = await storage.getTradeData(filters);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trade data" });
    }
  });

  app.post("/api/trades/fetch", async (req, res) => {
    try {
      const { productType, legalEntity, sourceSystem, startDate, endDate } = req.body;
      
      // Simulate API call to fetch trade data
      // In real implementation, this would call UAT/PROD APIs with OAuth
      const mockTrades = generateMockTradeData(productType, legalEntity, sourceSystem, startDate, endDate);
      
      const trades = await storage.bulkCreateTradeData(mockTrades);
      res.json({ message: "Trade data fetched successfully", count: trades.length });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trade data from APIs" });
    }
  });

  // Threshold management endpoints
  app.get("/api/thresholds", async (req, res) => {
    try {
      const mode = req.query.mode as string;
      console.log('Threshold mode requested:', mode);
      
      if (mode === 'group') {
        // Return group-wise format based on actual uploaded thresholds
        const currencyThresholds = await storage.getThresholds();
        console.log('Currency thresholds count:', currencyThresholds.length);
        
        if (currencyThresholds.length === 0) {
          // Return empty array if no thresholds uploaded yet
          res.json([]);
          return;
        }
        
        const groupMap = new Map();
        
        // Aggregate currency-level thresholds into group-level data
        currencyThresholds.forEach((threshold: any) => {
          const groupKey = threshold.originalGroup;
          console.log('Processing threshold for group:', groupKey, threshold);
          
          if (!groupMap.has(groupKey)) {
            groupMap.set(groupKey, {
              id: groupMap.size + 1,
              group: groupKey,
              originalThreshold: parseFloat(threshold.originalThreshold),
              proposedThreshold: parseFloat(threshold.proposedThreshold),
              adjustedThreshold: parseFloat(threshold.adjustedThreshold),
              count: 1
            });
          } else {
            const existing = groupMap.get(groupKey);
            existing.count += 1;
            // Use average thresholds for the group
            existing.originalThreshold = ((existing.originalThreshold * (existing.count - 1)) + parseFloat(threshold.originalThreshold)) / existing.count;
            existing.proposedThreshold = ((existing.proposedThreshold * (existing.count - 1)) + parseFloat(threshold.proposedThreshold)) / existing.count;
            existing.adjustedThreshold = ((existing.adjustedThreshold * (existing.count - 1)) + parseFloat(threshold.adjustedThreshold)) / existing.count;
          }
        });
        
        // Convert to array and round thresholds
        const groupData = Array.from(groupMap.values()).map(group => ({
          id: group.id,
          group: group.group,
          originalThreshold: Math.round(group.originalThreshold * 100) / 100,
          proposedThreshold: Math.round(group.proposedThreshold * 100) / 100,
          adjustedThreshold: Math.round(group.adjustedThreshold * 100) / 100
        }));
        console.log('Generated group data:', groupData);
        res.json(groupData);
      } else {
        // Return currency-wise data
        const thresholds = await storage.getThresholds();
        console.log('Returning currency data:', thresholds.length, 'items');
        res.json(thresholds);
      }
    } catch (error) {
      console.error('Threshold fetch error:', error);
      res.status(500).json({ message: "Failed to fetch thresholds" });
    }
  });

  app.post("/api/thresholds/upload", upload.single("file"), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const csvData = req.file.buffer.toString('utf-8');
      const thresholds = parseThresholdCSV(csvData);
      
      // Clear existing thresholds and add new ones
      await storage.clearThresholds();
      const savedThresholds = await storage.bulkCreateThresholds(thresholds);
      
      res.json({ 
        message: "Thresholds uploaded successfully", 
        count: savedThresholds.length 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload threshold file" });
    }
  });

  app.patch("/api/thresholds/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const threshold = await storage.updateThreshold(id, updates);
      res.json(threshold);
    } catch (error) {
      res.status(500).json({ message: "Failed to update threshold" });
    }
  });

  // Exception data endpoints
  app.get("/api/exceptions", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : undefined;
      const end = endDate ? new Date(endDate as string) : undefined;
      
      const exceptions = await storage.getExceptionData(start, end);
      res.json(exceptions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exception data" });
    }
  });

  // Analysis run endpoint for manual mode
  app.post("/api/analysis/run", async (req, res) => {
    try {
      const { dataSourceMode, thresholdMode } = req.body;
      
      if (dataSourceMode === 'manual') {
        // Check if we have uploaded files and thresholds
        const files = await storage.getFileUploads();
        const thresholds = await storage.getThresholds();
        
        if (files.length === 0) {
          return res.status(400).json({ message: "No trade files uploaded" });
        }
        
        if (thresholds.length === 0) {
          return res.status(400).json({ message: "No threshold file uploaded" });
        }
        
        // Generate mock analysis results
        const results = {
          deviationBuckets: calculateDeviationBuckets([], thresholds, thresholdMode),
          impactSummary: {
            totalAlerts: Math.floor(Math.random() * 500),
            reducedAlerts: Math.floor(Math.random() * 200),
            percentReduction: Math.floor(Math.random() * 40) + 10
          }
        };
        
        res.json({ 
          message: "Analysis completed successfully",
          results
        });
      } else {
        res.status(400).json({ message: "Invalid data source mode" });
      }
    } catch (error) {
      console.error('Analysis run error:', error);
      res.status(500).json({ message: "Failed to run analysis" });
    }
  });

  // Analysis endpoints
  app.post("/api/analysis/deviation-buckets", async (req, res) => {
    try {
      const { thresholdMode } = req.body;
      
      const trades = await storage.getTradeData();
      const thresholds = await storage.getThresholds();
      
      const bucketAnalysis = calculateDeviationBuckets(trades, thresholds, thresholdMode);
      res.json(bucketAnalysis);
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate deviation buckets" });
    }
  });

  app.post("/api/analysis/impact", async (req, res) => {
    try {
      const { thresholdId, newThreshold } = req.body;
      
      const trades = await storage.getTradeData();
      const thresholds = await storage.getThresholds();
      
      const impact = calculateThresholdImpact(trades, thresholds, thresholdId, newThreshold);
      res.json(impact);
    } catch (error) {
      res.status(500).json({ message: "Failed to calculate impact analysis" });
    }
  });

  // Export endpoints
  app.get("/api/export/:type", async (req, res) => {
    try {
      const { type } = req.params;
      
      let data;
      let filename;
      
      switch (type) {
        case "alerts":
          data = await storage.getTradeData();
          filename = "alerts_export.csv";
          break;
        case "thresholds":
          data = await storage.getThresholds();
          filename = "thresholds_export.csv";
          break;
        default:
          return res.status(400).json({ message: "Invalid export type" });
      }
      
      const csv = generateCSV(data);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // File upload endpoints for trade consolidation
  app.post("/api/files/upload", upload.array('files'), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const environment = req.body.environment;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedFiles = [];
      
      for (const file of files) {
        // Parse filename to extract metadata
        const nameWithoutExt = file.originalname.replace(/\.(csv|xlsx)$/i, '');
        const parts = nameWithoutExt.split('_');
        
        if (parts.length < 4) {
          return res.status(400).json({ 
            message: `Invalid filename format: ${file.originalname}. Expected: ProductType_LegalEntity_SourceSystem_Date.csv/xlsx` 
          });
        }

        const [productType, legalEntity, sourceSystem, dateStr] = parts;
        const uploadDate = new Date(dateStr);
        
        // Store file metadata (in real implementation, would save file to storage)
        const fileRecord = {
          filename: file.originalname,
          productType,
          legalEntity,
          sourceSystem,
          environment,
          uploadDate,
          fileSize: file.size,
          recordCount: 0, // Would be parsed from actual file
          status: 'uploaded' as const
        };

        const savedFile = await storage.createFileUpload(fileRecord);
        uploadedFiles.push(savedFile);
      }

      res.json({ message: "Files uploaded successfully", files: uploadedFiles });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "File upload failed" });
    }
  });

  app.get("/api/files/uploads", async (req, res) => {
    try {
      const files = await storage.getFileUploads();
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to get uploaded files" });
    }
  });

  // Consolidation endpoints
  app.post("/api/consolidation/create", async (req, res) => {
    try {
      const files = await storage.getFileUploads();
      
      // Group files by ProductType_LegalEntity_SourceSystem_Date
      const groupedFiles = new Map<string, { uat: any[], prod: any[], dates: Set<string> }>();
      
      files.forEach((file: any) => {
        const key = `${file.productType}_${file.legalEntity}_${file.sourceSystem}`;
        if (!groupedFiles.has(key)) {
          groupedFiles.set(key, { uat: [], prod: [], dates: new Set() });
        }
        
        const group = groupedFiles.get(key)!;
        if (file.environment === 'UAT') {
          group.uat.push(file);
        } else {
          group.prod.push(file);
        }
        group.dates.add(new Date(file.uploadDate).toISOString().split('T')[0]);
      });

      const datasets = [];
      
      // Create consolidated datasets for each group that has both UAT and PROD data
      for (const [key, group] of Array.from(groupedFiles.entries())) {
        if (group.uat.length > 0 && group.prod.length > 0) {
          const [productType, legalEntity, sourceSystem] = key.split('_');
          const dates = Array.from(group.dates).sort();
          const startDate = new Date(dates[0] as string);
          const endDate = new Date(dates[dates.length - 1] as string);
          
          const datasetName = `${productType}_${legalEntity}_${sourceSystem}_${dates[0]}${dates.length > 1 ? `_${dates[dates.length - 1]}` : ''}`;
          
          const dataset = {
            datasetName,
            productType,
            legalEntity,
            sourceSystem,
            startDate,
            endDate,
            uatFileIds: group.uat.map((f: any) => f.id),
            prodFileIds: group.prod.map((f: any) => f.id),
            totalUatTrades: group.uat.reduce((sum: number, f: any) => sum + (f.recordCount || 0), 0),
            totalProdTrades: group.prod.reduce((sum: number, f: any) => sum + (f.recordCount || 0), 0),
            matchedTrades: 0, // Would be calculated during actual consolidation
            unmatchedUatTrades: 0,
            unmatchedProdTrades: 0,
            status: 'completed' as const
          };

          const savedDataset = await storage.createConsolidatedDataset(dataset);
          datasets.push(savedDataset);
        }
      }

      res.json({ message: "Consolidation completed", datasets });
    } catch (error) {
      console.error("Consolidation error:", error);
      res.status(500).json({ message: "Consolidation failed" });
    }
  });

  app.get("/api/consolidation/datasets", async (req, res) => {
    try {
      const datasets = await storage.getConsolidatedDatasets();
      res.json(datasets);
    } catch (error) {
      res.status(500).json({ message: "Failed to get consolidated datasets" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions
function generateMockTradeData(productType: string, legalEntity: string, sourceSystem: string, startDate: string, endDate: string) {
  // In real implementation, this would fetch from UAT/PROD APIs
  const mockTrades = [];
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD'];
  const pairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'EURGBP'];
  
  for (let i = 0; i < 100; i++) {
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    mockTrades.push({
      tradeId: `TRD-2024-${String(i + 1).padStart(6, '0')}`,
      productType,
      legalEntity,
      sourceSystem,
      ccyPair: pair,
      tradeDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      deviationPercent: (Math.random() * 3).toFixed(4),
      alertDescription: Math.random() > 0.7 ? "Price deviation exceeds threshold" : null,
      isOutOfScope: Math.random() > 0.9
    });
  }
  
  return mockTrades;
}

function parseThresholdCSV(csvData: string) {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Expected headers: LegalEntity,CCY,Original_Group,Original_Threshold,Proposed_Group,Proposed_Threshold
  console.log('CSV Headers:', headers);
  
  return lines.slice(1).filter(line => line.trim()).map((line, index) => {
    const values = line.split(',').map(v => v.trim());
    
    const threshold = {
      legalEntity: values[0] || 'Unknown',
      currency: values[1] || 'USD',
      originalGroup: values[2] || 'Group 1',
      originalThreshold: values[3] || '0.5',
      proposedGroup: values[4] || values[2] || 'Group 1', // Default to original group if not provided
      proposedThreshold: values[5] || values[3] || '0.5', // Default to original threshold if not provided
      adjustedGroup: values[4] || values[2] || 'Group 1', // Start with proposed group
      adjustedThreshold: values[5] || values[3] || '0.5', // Start with proposed threshold
    };
    
    console.log(`Parsed threshold ${index + 1}:`, threshold);
    return threshold;
  });
}

function calculateDeviationBuckets(trades: any[], thresholds: any[], thresholdMode: string) {
  // Implementation for deviation bucket calculation
  const buckets = new Map();
  const currencies = ['USD', 'EUR', 'GBP', 'JPY'];
  
  // Create bucket ranges
  const ranges = ['0.0-0.5', '0.5-1.0', '1.0-2.0', '2.0-5.0', '5.0+'];
  
  ranges.forEach(range => {
    const bucketData: any = { range };
    currencies.forEach(ccy => {
      bucketData[ccy] = Math.floor(Math.random() * 50); // Mock data
    });
    bucketData.total = currencies.reduce((sum: number, ccy: string) => sum + bucketData[ccy], 0);
    buckets.set(range, bucketData);
  });
  
  return Array.from(buckets.values());
}

function calculateThresholdImpact(trades: any[], thresholds: any[], thresholdId: number, newThreshold: number) {
  // Mock impact calculation
  const currentAlerts = Math.floor(Math.random() * 100);
  const newAlerts = Math.floor(Math.random() * 100);
  
  return {
    currentAlerts,
    newAlerts,
    difference: newAlerts - currentAlerts,
    percentageChange: ((newAlerts - currentAlerts) / currentAlerts * 100).toFixed(2)
  };
}

function generateCSV(data: any[]) {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => row[header] || '').join(','))
  ].join('\n');
  
  return csvContent;
}
