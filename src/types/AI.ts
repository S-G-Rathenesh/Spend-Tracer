export interface AIResult {
  isScam: boolean;
  confidence: number;
  reason?: string;
  extractedEntities?: {
    amount?: number;
    merchant?: string;
    date?: string;
  };
}
