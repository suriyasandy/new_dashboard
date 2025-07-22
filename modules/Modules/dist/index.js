// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
var MemStorage = class {
  users;
  trades;
  thresholds;
  exceptions;
  configs;
  fileUploads;
  consolidatedDatasets;
  currentId;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.trades = /* @__PURE__ */ new Map();
    this.thresholds = /* @__PURE__ */ new Map();
    this.exceptions = /* @__PURE__ */ new Map();
    this.configs = /* @__PURE__ */ new Map();
    this.fileUploads = /* @__PURE__ */ new Map();
    this.consolidatedDatasets = /* @__PURE__ */ new Map();
    this.currentId = 1;
    this.initializeSampleData();
  }
  async initializeSampleData() {
    const sampleThresholds = [
      {
        legalEntity: "GSLB",
        currency: "USD",
        originalGroup: "Group 1",
        originalThreshold: "0.50",
        proposedGroup: "Group 1",
        proposedThreshold: "0.75",
        adjustedGroup: "Group 1",
        adjustedThreshold: "0.75"
      },
      {
        legalEntity: "GSLB",
        currency: "EUR",
        originalGroup: "Group 1",
        originalThreshold: "0.60",
        proposedGroup: "Group 2",
        proposedThreshold: "0.80",
        adjustedGroup: "Group 2",
        adjustedThreshold: "0.85"
      },
      {
        legalEntity: "GSI",
        currency: "GBP",
        originalGroup: "Group 2",
        originalThreshold: "0.45",
        proposedGroup: "Group 1",
        proposedThreshold: "0.70",
        adjustedGroup: "Group 1",
        adjustedThreshold: "0.70"
      },
      {
        legalEntity: "GSI",
        currency: "JPY",
        originalGroup: "Group 3",
        originalThreshold: "0.55",
        proposedGroup: "Group 2",
        proposedThreshold: "0.90",
        adjustedGroup: "Group 2",
        adjustedThreshold: "0.95"
      },
      {
        legalEntity: "ALL",
        currency: "CHF",
        originalGroup: "Group 1",
        originalThreshold: "0.50",
        proposedGroup: "Group 1",
        proposedThreshold: "0.75",
        adjustedGroup: "Group 1",
        adjustedThreshold: "0.75"
      }
    ];
    for (const threshold of sampleThresholds) {
      await this.bulkCreateThresholds([threshold]);
    }
    const currencies = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "USDCAD", "EURGBP"];
    const legalEntities = ["GSLB", "GSI", "GS_BANK_USA"];
    const sourceSystems = ["SLANG", "SIGMA", "SECDB"];
    for (let i = 0; i < 150; i++) {
      const ccyPair = currencies[Math.floor(Math.random() * currencies.length)];
      const legalEntity = legalEntities[Math.floor(Math.random() * legalEntities.length)];
      const sourceSystem = sourceSystems[Math.floor(Math.random() * sourceSystems.length)];
      const deviation = (Math.random() * 3).toFixed(4);
      const hasAlert = parseFloat(deviation) > 0.5;
      const trade = {
        tradeId: `TRD-2024-${String(i + 1).padStart(6, "0")}`,
        productType: "FX_SPOT",
        legalEntity,
        sourceSystem,
        ccyPair,
        tradeDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1e3),
        deviationPercent: deviation,
        alertDescription: hasAlert ? `Deviation ${deviation}% exceeds threshold` : null,
        isOutOfScope: Math.random() > 0.95
      };
      await this.createTradeData(trade);
    }
  }
  // User methods
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  async createUser(insertUser) {
    const id = this.currentId++;
    const user = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  // Trade data methods
  async getTradeData(filters) {
    let trades = Array.from(this.trades.values());
    if (filters) {
      if (filters.productType) {
        trades = trades.filter((t) => t.productType === filters.productType);
      }
      if (filters.legalEntity) {
        trades = trades.filter((t) => t.legalEntity === filters.legalEntity);
      }
      if (filters.sourceSystem) {
        trades = trades.filter((t) => t.sourceSystem === filters.sourceSystem);
      }
      if (filters.startDate) {
        trades = trades.filter((t) => t.tradeDate >= filters.startDate);
      }
      if (filters.endDate) {
        trades = trades.filter((t) => t.tradeDate <= filters.endDate);
      }
    }
    return trades;
  }
  async createTradeData(trade) {
    const id = this.currentId++;
    const tradeRecord = {
      ...trade,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      deviationPercent: trade.deviationPercent || null,
      alertDescription: trade.alertDescription || null,
      isOutOfScope: trade.isOutOfScope || false
    };
    this.trades.set(id, tradeRecord);
    return tradeRecord;
  }
  async bulkCreateTradeData(trades) {
    const results = [];
    for (const trade of trades) {
      const result = await this.createTradeData(trade);
      results.push(result);
    }
    return results;
  }
  // Threshold methods
  async getThresholds() {
    return Array.from(this.thresholds.values());
  }
  async updateThreshold(id, threshold) {
    const existing = this.thresholds.get(id);
    if (!existing) {
      throw new Error("Threshold not found");
    }
    const updated = {
      ...existing,
      ...threshold,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.thresholds.set(id, updated);
    return updated;
  }
  async bulkCreateThresholds(thresholds) {
    const results = [];
    for (const threshold of thresholds) {
      const id = this.currentId++;
      const thresholdRecord = {
        ...threshold,
        id,
        updatedAt: /* @__PURE__ */ new Date()
      };
      this.thresholds.set(id, thresholdRecord);
      results.push(thresholdRecord);
    }
    return results;
  }
  async clearThresholds() {
    this.thresholds.clear();
  }
  // Exception data methods
  async getExceptionData(startDate, endDate) {
    let exceptions = Array.from(this.exceptions.values());
    if (startDate) {
      exceptions = exceptions.filter((e) => e.createdAt >= startDate);
    }
    if (endDate) {
      exceptions = exceptions.filter((e) => e.createdAt <= endDate);
    }
    return exceptions;
  }
  async createExceptionData(exception) {
    const id = this.currentId++;
    const exceptionRecord = {
      ...exception,
      id,
      createdAt: /* @__PURE__ */ new Date(),
      description: exception.description || null
    };
    this.exceptions.set(id, exceptionRecord);
    return exceptionRecord;
  }
  // Dashboard config methods
  async getDashboardConfig(userId) {
    return Array.from(this.configs.values()).find((c) => c.userId === userId);
  }
  async updateDashboardConfig(userId, config) {
    const existing = Array.from(this.configs.values()).find((c) => c.userId === userId);
    if (existing) {
      const updated = {
        ...existing,
        ...config,
        updatedAt: /* @__PURE__ */ new Date()
      };
      this.configs.set(existing.id, updated);
      return updated;
    } else {
      const id = this.currentId++;
      const newConfig = {
        id,
        userId,
        productType: config.productType || null,
        legalEntity: config.legalEntity || null,
        sourceSystem: config.sourceSystem || null,
        startDate: config.startDate || null,
        endDate: config.endDate || null,
        thresholdMode: config.thresholdMode || null,
        analysisRun: config.analysisRun || false,
        updatedAt: /* @__PURE__ */ new Date()
      };
      this.configs.set(id, newConfig);
      return newConfig;
    }
  }
  // File upload methods
  async getFileUploads() {
    return Array.from(this.fileUploads.values());
  }
  async createFileUpload(file) {
    const id = this.currentId++;
    const newFile = {
      id,
      ...file,
      status: file.status || "uploaded",
      fileSize: file.fileSize || null,
      recordCount: file.recordCount || null,
      uploadedAt: /* @__PURE__ */ new Date()
    };
    this.fileUploads.set(id, newFile);
    return newFile;
  }
  // Consolidated dataset methods
  async getConsolidatedDatasets() {
    return Array.from(this.consolidatedDatasets.values());
  }
  async createConsolidatedDataset(dataset) {
    const id = this.currentId++;
    const newDataset = {
      id,
      ...dataset,
      status: dataset.status || "pending",
      totalUatTrades: dataset.totalUatTrades || 0,
      totalProdTrades: dataset.totalProdTrades || 0,
      matchedTrades: dataset.matchedTrades || 0,
      unmatchedUatTrades: dataset.unmatchedUatTrades || 0,
      unmatchedProdTrades: dataset.unmatchedProdTrades || 0,
      uatFileIds: dataset.uatFileIds || [],
      prodFileIds: dataset.prodFileIds || [],
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.consolidatedDatasets.set(id, newDataset);
    return newDataset;
  }
};
var storage = new MemStorage();

// server/routes.ts
import multer from "multer";
var upload = multer({ storage: multer.memoryStorage() });
async function registerRoutes(app2) {
  app2.get("/api/dashboard/config", async (req, res) => {
    try {
      const userId = 1;
      const config = await storage.getDashboardConfig(userId);
      res.json(config || {});
    } catch (error) {
      res.status(500).json({ message: "Failed to get dashboard config" });
    }
  });
  app2.post("/api/dashboard/config", async (req, res) => {
    try {
      const userId = 1;
      const config = await storage.updateDashboardConfig(userId, req.body);
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Failed to update dashboard config" });
    }
  });
  app2.get("/api/trades", async (req, res) => {
    try {
      const { productType, legalEntity, sourceSystem, startDate, endDate } = req.query;
      const filters = {};
      if (productType) filters.productType = productType;
      if (legalEntity) filters.legalEntity = legalEntity;
      if (sourceSystem) filters.sourceSystem = sourceSystem;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);
      const trades = await storage.getTradeData(filters);
      res.json(trades);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trade data" });
    }
  });
  app2.post("/api/trades/fetch", async (req, res) => {
    try {
      const { productType, legalEntity, sourceSystem, startDate, endDate } = req.body;
      const mockTrades = generateMockTradeData(productType, legalEntity, sourceSystem, startDate, endDate);
      const trades = await storage.bulkCreateTradeData(mockTrades);
      res.json({ message: "Trade data fetched successfully", count: trades.length });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trade data from APIs" });
    }
  });
  app2.get("/api/thresholds", async (req, res) => {
    try {
      const mode = req.query.mode;
      console.log("Threshold mode requested:", mode);
      if (mode === "group") {
        const currencyThresholds = await storage.getThresholds();
        console.log("Currency thresholds count:", currencyThresholds.length);
        if (currencyThresholds.length === 0) {
          res.json([]);
          return;
        }
        const groupMap = /* @__PURE__ */ new Map();
        currencyThresholds.forEach((threshold) => {
          const groupKey = threshold.originalGroup;
          console.log("Processing threshold for group:", groupKey, threshold);
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
            existing.originalThreshold = (existing.originalThreshold * (existing.count - 1) + parseFloat(threshold.originalThreshold)) / existing.count;
            existing.proposedThreshold = (existing.proposedThreshold * (existing.count - 1) + parseFloat(threshold.proposedThreshold)) / existing.count;
            existing.adjustedThreshold = (existing.adjustedThreshold * (existing.count - 1) + parseFloat(threshold.adjustedThreshold)) / existing.count;
          }
        });
        const groupData = Array.from(groupMap.values()).map((group) => ({
          id: group.id,
          group: group.group,
          originalThreshold: Math.round(group.originalThreshold * 100) / 100,
          proposedThreshold: Math.round(group.proposedThreshold * 100) / 100,
          adjustedThreshold: Math.round(group.adjustedThreshold * 100) / 100
        }));
        console.log("Generated group data:", groupData);
        res.json(groupData);
      } else {
        const thresholds = await storage.getThresholds();
        console.log("Returning currency data:", thresholds.length, "items");
        res.json(thresholds);
      }
    } catch (error) {
      console.error("Threshold fetch error:", error);
      res.status(500).json({ message: "Failed to fetch thresholds" });
    }
  });
  app2.post("/api/thresholds/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const csvData = req.file.buffer.toString("utf-8");
      const thresholds = parseThresholdCSV(csvData);
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
  app2.patch("/api/thresholds/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const threshold = await storage.updateThreshold(id, updates);
      res.json(threshold);
    } catch (error) {
      res.status(500).json({ message: "Failed to update threshold" });
    }
  });
  app2.get("/api/exceptions", async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const start = startDate ? new Date(startDate) : void 0;
      const end = endDate ? new Date(endDate) : void 0;
      const exceptions = await storage.getExceptionData(start, end);
      res.json(exceptions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch exception data" });
    }
  });
  app2.post("/api/analysis/run", async (req, res) => {
    try {
      const { dataSourceMode, thresholdMode } = req.body;
      if (dataSourceMode === "manual") {
        const files = await storage.getFileUploads();
        const thresholds = await storage.getThresholds();
        if (files.length === 0) {
          return res.status(400).json({ message: "No trade files uploaded" });
        }
        if (thresholds.length === 0) {
          return res.status(400).json({ message: "No threshold file uploaded" });
        }
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
      console.error("Analysis run error:", error);
      res.status(500).json({ message: "Failed to run analysis" });
    }
  });
  app2.post("/api/analysis/deviation-buckets", async (req, res) => {
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
  app2.post("/api/analysis/impact", async (req, res) => {
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
  app2.get("/api/export/:type", async (req, res) => {
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
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });
  app2.post("/api/files/upload", upload.array("files"), async (req, res) => {
    try {
      const files = req.files;
      const environment = req.body.environment;
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      const uploadedFiles = [];
      for (const file of files) {
        const nameWithoutExt = file.originalname.replace(/\.(csv|xlsx)$/i, "");
        const parts = nameWithoutExt.split("_");
        if (parts.length < 4) {
          return res.status(400).json({
            message: `Invalid filename format: ${file.originalname}. Expected: ProductType_LegalEntity_SourceSystem_Date.csv/xlsx`
          });
        }
        const [productType, legalEntity, sourceSystem, dateStr] = parts;
        const uploadDate = new Date(dateStr);
        const fileRecord = {
          filename: file.originalname,
          productType,
          legalEntity,
          sourceSystem,
          environment,
          uploadDate,
          fileSize: file.size,
          recordCount: 0,
          // Would be parsed from actual file
          status: "uploaded"
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
  app2.get("/api/files/uploads", async (req, res) => {
    try {
      const files = await storage.getFileUploads();
      res.json(files);
    } catch (error) {
      res.status(500).json({ message: "Failed to get uploaded files" });
    }
  });
  app2.post("/api/consolidation/create", async (req, res) => {
    try {
      const files = await storage.getFileUploads();
      const groupedFiles = /* @__PURE__ */ new Map();
      files.forEach((file) => {
        const key = `${file.productType}_${file.legalEntity}_${file.sourceSystem}`;
        if (!groupedFiles.has(key)) {
          groupedFiles.set(key, { uat: [], prod: [], dates: /* @__PURE__ */ new Set() });
        }
        const group = groupedFiles.get(key);
        if (file.environment === "UAT") {
          group.uat.push(file);
        } else {
          group.prod.push(file);
        }
        group.dates.add(new Date(file.uploadDate).toISOString().split("T")[0]);
      });
      const datasets = [];
      for (const [key, group] of Array.from(groupedFiles.entries())) {
        if (group.uat.length > 0 && group.prod.length > 0) {
          const [productType, legalEntity, sourceSystem] = key.split("_");
          const dates = Array.from(group.dates).sort();
          const startDate = new Date(dates[0]);
          const endDate = new Date(dates[dates.length - 1]);
          const datasetName = `${productType}_${legalEntity}_${sourceSystem}_${dates[0]}${dates.length > 1 ? `_${dates[dates.length - 1]}` : ""}`;
          const dataset = {
            datasetName,
            productType,
            legalEntity,
            sourceSystem,
            startDate,
            endDate,
            uatFileIds: group.uat.map((f) => f.id),
            prodFileIds: group.prod.map((f) => f.id),
            totalUatTrades: group.uat.reduce((sum, f) => sum + (f.recordCount || 0), 0),
            totalProdTrades: group.prod.reduce((sum, f) => sum + (f.recordCount || 0), 0),
            matchedTrades: 0,
            // Would be calculated during actual consolidation
            unmatchedUatTrades: 0,
            unmatchedProdTrades: 0,
            status: "completed"
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
  app2.get("/api/consolidation/datasets", async (req, res) => {
    try {
      const datasets = await storage.getConsolidatedDatasets();
      res.json(datasets);
    } catch (error) {
      res.status(500).json({ message: "Failed to get consolidated datasets" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}
function generateMockTradeData(productType, legalEntity, sourceSystem, startDate, endDate) {
  const mockTrades = [];
  const currencies = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD"];
  const pairs = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "USDCAD", "EURGBP"];
  for (let i = 0; i < 100; i++) {
    const pair = pairs[Math.floor(Math.random() * pairs.length)];
    mockTrades.push({
      tradeId: `TRD-2024-${String(i + 1).padStart(6, "0")}`,
      productType,
      legalEntity,
      sourceSystem,
      ccyPair: pair,
      tradeDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1e3),
      deviationPercent: (Math.random() * 3).toFixed(4),
      alertDescription: Math.random() > 0.7 ? "Price deviation exceeds threshold" : null,
      isOutOfScope: Math.random() > 0.9
    });
  }
  return mockTrades;
}
function parseThresholdCSV(csvData) {
  const lines = csvData.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  console.log("CSV Headers:", headers);
  return lines.slice(1).filter((line) => line.trim()).map((line, index) => {
    const values = line.split(",").map((v) => v.trim());
    const threshold = {
      legalEntity: values[0] || "Unknown",
      currency: values[1] || "USD",
      originalGroup: values[2] || "Group 1",
      originalThreshold: values[3] || "0.5",
      proposedGroup: values[4] || values[2] || "Group 1",
      // Default to original group if not provided
      proposedThreshold: values[5] || values[3] || "0.5",
      // Default to original threshold if not provided
      adjustedGroup: values[4] || values[2] || "Group 1",
      // Start with proposed group
      adjustedThreshold: values[5] || values[3] || "0.5"
      // Start with proposed threshold
    };
    console.log(`Parsed threshold ${index + 1}:`, threshold);
    return threshold;
  });
}
function calculateDeviationBuckets(trades, thresholds, thresholdMode) {
  const buckets = /* @__PURE__ */ new Map();
  const currencies = ["USD", "EUR", "GBP", "JPY"];
  const ranges = ["0.0-0.5", "0.5-1.0", "1.0-2.0", "2.0-5.0", "5.0+"];
  ranges.forEach((range) => {
    const bucketData = { range };
    currencies.forEach((ccy) => {
      bucketData[ccy] = Math.floor(Math.random() * 50);
    });
    bucketData.total = currencies.reduce((sum, ccy) => sum + bucketData[ccy], 0);
    buckets.set(range, bucketData);
  });
  return Array.from(buckets.values());
}
function calculateThresholdImpact(trades, thresholds, thresholdId, newThreshold) {
  const currentAlerts = Math.floor(Math.random() * 100);
  const newAlerts = Math.floor(Math.random() * 100);
  return {
    currentAlerts,
    newAlerts,
    difference: newAlerts - currentAlerts,
    percentageChange: ((newAlerts - currentAlerts) / currentAlerts * 100).toFixed(2)
  };
}
function generateCSV(data) {
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) => headers.map((header) => row[header] || "").join(","))
  ].join("\n");
  return csvContent;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, "127.0.0.1", () => {
    log(`Serving on port ${port}`);
  });
})();
