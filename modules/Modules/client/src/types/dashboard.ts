export interface TradeData {
  id: number;
  tradeId: string;
  productType: string;
  legalEntity: string;
  sourceSystem: string;
  ccyPair: string;
  tradeDate: Date;
  deviationPercent?: string;
  alertDescription?: string;
  isOutOfScope: boolean;
  createdAt?: Date;
}

export interface Threshold {
  id: number;
  legalEntity: string;
  currency: string;
  originalGroup: string;
  originalThreshold: string;
  proposedGroup: string;
  proposedThreshold: string;
  adjustedGroup: string;
  adjustedThreshold: string;
  updatedAt?: Date;
}

export interface DashboardConfig {
  id?: number;
  userId?: number;
  productType?: string;
  legalEntity?: string;
  sourceSystem?: string;
  startDate?: Date;
  endDate?: Date;
  thresholdMode?: string;
  updatedAt?: Date;
}

export interface DeviationBucket {
  range: string;
  [key: string]: number | string | boolean;
  total: number;
  isExceeding: boolean;
}

export interface ExceptionData {
  id: number;
  tradeId: string;
  exceptionType: string;
  description?: string;
  status: string;
  createdAt?: Date;
}
