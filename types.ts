export interface Transaction {
  id: number;
  BA: string;
  monthly: string;
  actCode: string;
  amount: number;
  originalAmountStr: string;
}

export interface Anomaly {
  transactionId: number;
  reason: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface AnalysisResult {
  anomalies: Anomaly[];
  summary: string;
}

export enum LoadingState {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  ANALYZING = 'ANALYZING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}