import { 
  users, 
  tradeData, 
  thresholds, 
  exceptionData, 
  dashboardConfig,
  fileUploads,
  consolidatedDatasets,
  type User, 
  type InsertUser,
  type TradeData,
  type InsertTradeData,
  type Threshold,
  type InsertThreshold,
  type ExceptionData,
  type InsertExceptionData,
  type DashboardConfig,
  type InsertDashboardConfig,
  type FileUpload,
  type InsertFileUpload,
  type ConsolidatedDataset,
  type InsertConsolidatedDataset
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Trade data methods
  getTradeData(filters?: {
    productType?: string;
    legalEntity?: string;
    sourceSystem?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<TradeData[]>;
  createTradeData(trade: InsertTradeData): Promise<TradeData>;
  bulkCreateTradeData(trades: InsertTradeData[]): Promise<TradeData[]>;

  // Threshold methods
  getThresholds(): Promise<Threshold[]>;
  updateThreshold(id: number, threshold: Partial<Threshold>): Promise<Threshold>;
  bulkCreateThresholds(thresholds: InsertThreshold[]): Promise<Threshold[]>;
  clearThresholds(): Promise<void>;

  // Exception data methods
  getExceptionData(startDate?: Date, endDate?: Date): Promise<ExceptionData[]>;
  createExceptionData(exception: InsertExceptionData): Promise<ExceptionData>;

  // Dashboard config methods
  getDashboardConfig(userId: number): Promise<DashboardConfig | undefined>;
  updateDashboardConfig(userId: number, config: Partial<InsertDashboardConfig>): Promise<DashboardConfig>;

  // File upload methods
  getFileUploads(): Promise<FileUpload[]>;
  createFileUpload(file: InsertFileUpload): Promise<FileUpload>;

  // Consolidated dataset methods
  getConsolidatedDatasets(): Promise<ConsolidatedDataset[]>;
  createConsolidatedDataset(dataset: InsertConsolidatedDataset): Promise<ConsolidatedDataset>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trades: Map<number, TradeData>;
  private thresholds: Map<number, Threshold>;
  private exceptions: Map<number, ExceptionData>;
  private configs: Map<number, DashboardConfig>;
  private fileUploads: Map<number, FileUpload>;
  private consolidatedDatasets: Map<number, ConsolidatedDataset>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.trades = new Map();
    this.thresholds = new Map();
    this.exceptions = new Map();
    this.configs = new Map();
    this.fileUploads = new Map();
    this.consolidatedDatasets = new Map();
    this.currentId = 1;
    
    // Initialize with sample data
    this.initializeSampleData();
  }

  private async initializeSampleData() {
    // Create sample thresholds
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

    // Create sample trade data
    const currencies = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'USDCAD', 'EURGBP'];
    const legalEntities = ['GSLB', 'GSI', 'GS_BANK_USA'];
    const sourceSystems = ['SLANG', 'SIGMA', 'SECDB'];

    for (let i = 0; i < 150; i++) {
      const ccyPair = currencies[Math.floor(Math.random() * currencies.length)];
      const legalEntity = legalEntities[Math.floor(Math.random() * legalEntities.length)];
      const sourceSystem = sourceSystems[Math.floor(Math.random() * sourceSystems.length)];
      const deviation = (Math.random() * 3).toFixed(4);
      const hasAlert = parseFloat(deviation) > 0.5;

      const trade = {
        tradeId: `TRD-2024-${String(i + 1).padStart(6, '0')}`,
        productType: 'FX_SPOT',
        legalEntity,
        sourceSystem,
        ccyPair,
        tradeDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        deviationPercent: deviation,
        alertDescription: hasAlert ? `Deviation ${deviation}% exceeds threshold` : null,
        isOutOfScope: Math.random() > 0.95
      };

      await this.createTradeData(trade);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Trade data methods
  async getTradeData(filters?: {
    productType?: string;
    legalEntity?: string;
    sourceSystem?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<TradeData[]> {
    let trades = Array.from(this.trades.values());

    if (filters) {
      if (filters.productType) {
        trades = trades.filter(t => t.productType === filters.productType);
      }
      if (filters.legalEntity) {
        trades = trades.filter(t => t.legalEntity === filters.legalEntity);
      }
      if (filters.sourceSystem) {
        trades = trades.filter(t => t.sourceSystem === filters.sourceSystem);
      }
      if (filters.startDate) {
        trades = trades.filter(t => t.tradeDate >= filters.startDate!);
      }
      if (filters.endDate) {
        trades = trades.filter(t => t.tradeDate <= filters.endDate!);
      }
    }

    return trades;
  }

  async createTradeData(trade: InsertTradeData): Promise<TradeData> {
    const id = this.currentId++;
    const tradeRecord: TradeData = { 
      ...trade, 
      id, 
      createdAt: new Date(),
      deviationPercent: trade.deviationPercent || null,
      alertDescription: trade.alertDescription || null,
      isOutOfScope: trade.isOutOfScope || false
    };
    this.trades.set(id, tradeRecord);
    return tradeRecord;
  }

  async bulkCreateTradeData(trades: InsertTradeData[]): Promise<TradeData[]> {
    const results: TradeData[] = [];
    for (const trade of trades) {
      const result = await this.createTradeData(trade);
      results.push(result);
    }
    return results;
  }

  // Threshold methods
  async getThresholds(): Promise<Threshold[]> {
    return Array.from(this.thresholds.values());
  }

  async updateThreshold(id: number, threshold: Partial<Threshold>): Promise<Threshold> {
    const existing = this.thresholds.get(id);
    if (!existing) {
      throw new Error('Threshold not found');
    }
    const updated: Threshold = { 
      ...existing, 
      ...threshold, 
      updatedAt: new Date() 
    };
    this.thresholds.set(id, updated);
    return updated;
  }

  async bulkCreateThresholds(thresholds: InsertThreshold[]): Promise<Threshold[]> {
    const results: Threshold[] = [];
    for (const threshold of thresholds) {
      const id = this.currentId++;
      const thresholdRecord: Threshold = { 
        ...threshold, 
        id,
        updatedAt: new Date()
      };
      this.thresholds.set(id, thresholdRecord);
      results.push(thresholdRecord);
    }
    return results;
  }

  async clearThresholds(): Promise<void> {
    this.thresholds.clear();
  }

  // Exception data methods
  async getExceptionData(startDate?: Date, endDate?: Date): Promise<ExceptionData[]> {
    let exceptions = Array.from(this.exceptions.values());

    if (startDate) {
      exceptions = exceptions.filter(e => e.createdAt! >= startDate);
    }
    if (endDate) {
      exceptions = exceptions.filter(e => e.createdAt! <= endDate);
    }

    return exceptions;
  }

  async createExceptionData(exception: InsertExceptionData): Promise<ExceptionData> {
    const id = this.currentId++;
    const exceptionRecord: ExceptionData = { 
      ...exception, 
      id, 
      createdAt: new Date(),
      description: exception.description || null
    };
    this.exceptions.set(id, exceptionRecord);
    return exceptionRecord;
  }

  // Dashboard config methods
  async getDashboardConfig(userId: number): Promise<DashboardConfig | undefined> {
    return Array.from(this.configs.values()).find(c => c.userId === userId);
  }

  async updateDashboardConfig(userId: number, config: Partial<InsertDashboardConfig>): Promise<DashboardConfig> {
    const existing = Array.from(this.configs.values()).find(c => c.userId === userId);
    
    if (existing) {
      const updated: DashboardConfig = { 
        ...existing, 
        ...config, 
        updatedAt: new Date() 
      };
      this.configs.set(existing.id, updated);
      return updated;
    } else {
      const id = this.currentId++;
      const newConfig: DashboardConfig = { 
        id,
        userId,
        productType: config.productType || null,
        legalEntity: config.legalEntity || null,
        sourceSystem: config.sourceSystem || null,
        startDate: config.startDate || null,
        endDate: config.endDate || null,
        thresholdMode: config.thresholdMode || null,
        analysisRun: config.analysisRun || false,
        updatedAt: new Date()
      };
      this.configs.set(id, newConfig);
      return newConfig;
    }
  }

  // File upload methods
  async getFileUploads(): Promise<FileUpload[]> {
    return Array.from(this.fileUploads.values());
  }

  async createFileUpload(file: InsertFileUpload): Promise<FileUpload> {
    const id = this.currentId++;
    const newFile: FileUpload = {
      id,
      ...file,
      status: file.status || 'uploaded',
      fileSize: file.fileSize || null,
      recordCount: file.recordCount || null,
      uploadedAt: new Date()
    };
    this.fileUploads.set(id, newFile);
    return newFile;
  }

  // Consolidated dataset methods
  async getConsolidatedDatasets(): Promise<ConsolidatedDataset[]> {
    return Array.from(this.consolidatedDatasets.values());
  }

  async createConsolidatedDataset(dataset: InsertConsolidatedDataset): Promise<ConsolidatedDataset> {
    const id = this.currentId++;
    const newDataset: ConsolidatedDataset = {
      id,
      ...dataset,
      status: dataset.status || 'pending',
      totalUatTrades: dataset.totalUatTrades || 0,
      totalProdTrades: dataset.totalProdTrades || 0,
      matchedTrades: dataset.matchedTrades || 0,
      unmatchedUatTrades: dataset.unmatchedUatTrades || 0,
      unmatchedProdTrades: dataset.unmatchedProdTrades || 0,
      uatFileIds: dataset.uatFileIds || [],
      prodFileIds: dataset.prodFileIds || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.consolidatedDatasets.set(id, newDataset);
    return newDataset;
  }
}

export const storage = new MemStorage();
