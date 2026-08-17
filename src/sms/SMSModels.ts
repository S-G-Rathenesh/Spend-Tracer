import { ClassificationResult } from '../ai/SMSClassifier';

export enum SMSStatus {
  PENDING = 'Pending',
  PROCESSING = 'Processing',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
  IGNORED = 'Ignored'
}

export interface IncomingSMS {
  id: string;
  sender: string;
  message: string;
  receivedAt: string; // ISO Date String
  normalizedText: string;
  bank: string | null;
  isProcessed: boolean;
  processingStatus: SMSStatus;
  predictedClass?: string;
  confidence?: number;
  reasons?: string[];
  createdAt: string;
  updatedAt: string;
}
