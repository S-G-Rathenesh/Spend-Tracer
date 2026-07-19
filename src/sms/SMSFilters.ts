import { NON_TRANSACTION_KEYWORDS } from './SMSConstants';

export class SMSFilters {
  static isLikelyBankSMS(sender: string): boolean {
    if (!sender) return false;
    // Typical Indian bank SMS format like VM-HDFCBK, AD-ICICIB, etc.
    const senderRegex = /^[A-Za-z]{2}-?[A-Za-z0-9]{4,8}$/i;
    // We should also allow pure text or shortcodes if they look like banks
    return senderRegex.test(sender) || sender.length >= 4;
  }

  static isTransactionSMS(message: string): boolean {
    if (!message) return false;
    
    const lowerMsg = message.toLowerCase();
    
    // Filter out OTP and promotional messages immediately
    for (const keyword of NON_TRANSACTION_KEYWORDS) {
      if (lowerMsg.includes(keyword)) {
        return false;
      }
    }

    // Very basic check for amounts (e.g. Rs, INR, debited, credited)
    // AI will handle the deep classification in Phase 4.
    const hasAmount = /(rs\.?|inr)\s?\d+(\.\d{1,2})?/i.test(lowerMsg);
    const hasTxKeyword = /(debited|credited|spent|paid|received|deducted|withdrawn)/i.test(lowerMsg);

    return hasAmount && hasTxKeyword;
  }
}
