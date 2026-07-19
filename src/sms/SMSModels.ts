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
  createdAt: string;
  updatedAt: string;
}
