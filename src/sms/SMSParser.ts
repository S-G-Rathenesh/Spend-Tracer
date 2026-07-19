import { SUPPORTED_BANKS, BANK_SENDER_PATTERNS } from './SMSConstants';

export class SMSParser {
  static extractBankName(sender: string): string | null {
    if (!sender) return null;
    
    const s = sender.toUpperCase();
    
    // First try regex matching from constants
    for (const pattern of BANK_SENDER_PATTERNS) {
      if (pattern.test(s)) {
        // Find which bank name is in the sender ID
        for (const bank of SUPPORTED_BANKS) {
          if (s.includes(bank)) {
            return bank;
          }
        }
      }
    }
    
    return null;
  }
}
