import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const tradeData = pgTable("trade_data", {
  id: serial("id").primaryKey(),
  tradeId: text("trade_id").notNull(),
  productType: text("product_type").notNull(),
  legalEntity: text("legal_entity").notNull(),
  sourceSystem: text("source_system").notNull(),
  ccyPair: text("ccy_pair").notNull(),
  tradeDate: timestamp("trade_date").notNull(),
  deviationPercent: decimal("deviation_percent", { precision: 10, scale: 4 }),
  alertDescription: text("alert_description"),
  isOutOfScope: boolean("is_out_of_scope").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const thresholds = pgTable("thresholds", {
  id: serial("id").primaryKey(),
  legalEntity: text("legal_entity").notNull(),
  currency: text("currency").notNull(),
  originalGroup: text("original_group").notNull(),
  originalThreshold: decimal("original_threshold", { precision: 10, scale: 4 }).notNull(),
  proposedGroup: text("proposed_group").notNull(),
  proposedThreshold: decimal("proposed_threshold", { precision: 10, scale: 4 }).notNull(),
  adjustedGroup: text("adjusted_group").notNull(),
  adjustedThreshold: decimal("adjusted_threshold", { precision: 10, scale: 4 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const exceptionData = pgTable("exception_data", {
  id: serial("id").primaryKey(),
  tradeId: text("trade_id").notNull(),
  exceptionType: text("exception_type").notNull(),
  description: text("description"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dashboardConfig = pgTable("dashboard_config", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  productType: text("product_type"),
  legalEntity: text("legal_entity"),
  sourceSystem: text("source_system"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  thresholdMode: text("threshold_mode").default("group"),
  analysisRun: boolean("analysis_run").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const fileUploads = pgTable("file_uploads", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  productType: text("product_type").notNull(),
  legalEntity: text("legal_entity").notNull(),
  sourceSystem: text("source_system").notNull(),
  environment: text("environment").notNull(), // UAT or PROD
  uploadDate: timestamp("upload_date").notNull(),
  fileSize: integer("file_size"),
  recordCount: integer("record_count"),
  status: text("status").notNull().default("uploaded"), // uploaded, processed, consolidated
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const consolidatedDatasets = pgTable("consolidated_datasets", {
  id: serial("id").primaryKey(),
  datasetName: text("dataset_name").notNull(), // ProductType_LegalEntity_SourceSystem_StartDate_EndDate
  productType: text("product_type").notNull(),
  legalEntity: text("legal_entity").notNull(),
  sourceSystem: text("source_system").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  uatFileIds: jsonb("uat_file_ids"), // Array of UAT file IDs
  prodFileIds: jsonb("prod_file_ids"), // Array of PROD file IDs
  totalUatTrades: integer("total_uat_trades").default(0),
  totalProdTrades: integer("total_prod_trades").default(0),
  matchedTrades: integer("matched_trades").default(0),
  unmatchedUatTrades: integer("unmatched_uat_trades").default(0),
  unmatchedProdTrades: integer("unmatched_prod_trades").default(0),
  status: text("status").notNull().default("pending"), // pending, processing, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTradeDataSchema = createInsertSchema(tradeData).omit({
  id: true,
  createdAt: true,
});

export const insertThresholdSchema = createInsertSchema(thresholds).omit({
  id: true,
  updatedAt: true,
});

export const insertExceptionDataSchema = createInsertSchema(exceptionData).omit({
  id: true,
  createdAt: true,
});

export const insertDashboardConfigSchema = createInsertSchema(dashboardConfig).omit({
  id: true,
  updatedAt: true,
});

export const insertFileUploadSchema = createInsertSchema(fileUploads).omit({
  id: true,
  uploadedAt: true,
});

export const insertConsolidatedDatasetSchema = createInsertSchema(consolidatedDatasets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTradeData = z.infer<typeof insertTradeDataSchema>;
export type TradeData = typeof tradeData.$inferSelect;

export type InsertThreshold = z.infer<typeof insertThresholdSchema>;
export type Threshold = typeof thresholds.$inferSelect;

export type InsertExceptionData = z.infer<typeof insertExceptionDataSchema>;
export type ExceptionData = typeof exceptionData.$inferSelect;

export type InsertDashboardConfig = z.infer<typeof insertDashboardConfigSchema>;
export type DashboardConfig = typeof dashboardConfig.$inferSelect;

export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;
export type FileUpload = typeof fileUploads.$inferSelect;

export type InsertConsolidatedDataset = z.infer<typeof insertConsolidatedDatasetSchema>;
export type ConsolidatedDataset = typeof consolidatedDatasets.$inferSelect;
