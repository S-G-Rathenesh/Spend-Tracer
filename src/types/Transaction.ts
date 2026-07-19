export interface Transaction {
  id: string;
  amount: number;
  merchantId?: string;
  bank?: string;
  categoryId?: string;
  type: 'Debit' | 'Credit';
  date: string;
  time: string;
  referenceNumber?: string;
  transactionType?: string; // e.g. UPI, IMPS, POS
  notes?: string;
  source: 'manual' | 'sms';
  createdAt: string;
  updatedAt: string;
}
