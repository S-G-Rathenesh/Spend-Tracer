export interface Transaction {
  id: string;
  amount: number;
  merchantId?: string;
  bank?: string;
  categoryId?: string;
  type: 'Debit' | 'Credit';
  status?: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REVERSED' | 'UNKNOWN';
  date: string;
  time: string;
  referenceNumber?: string;
  transactionType?: string; // e.g. UPI, IMPS, POS
  notes?: string;
  source: 'manual' | 'sms' | 'notification' | 'merged';
  sources?: string[]; // e.g. ["Notification", "SMS"]
  smsHash?: string;
  originalSms?: string;
  needsVerification?: boolean;
  aiCategory?: string;
  aiConfidence?: number;
  userCategory?: string;
  finalCategory?: string;
  createdAt: string;
  updatedAt: string;
}
