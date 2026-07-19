export interface ScamHistory {
  id: string;
  smsBody: string;
  confidence: number;
  reason?: string;
  scamType?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}
