/**
 * Stage 1: SMS Classification
 * Classifies input SMS into: 'Transaction', 'Personal', 'Promotion', or 'Scam'.
 */

export interface ClassificationResult {
  predictedClass: 'Transaction' | 'Personal' | 'Promotion' | 'Scam';
  classId: number;
  confidence: number;
  isTransaction: boolean;
  logits: number[];
  reasons: string[];
}

export class SMSClassifier {
  // Explicit indicators of an actual debit/credit financial movement
  private static financialEvents = [
    'debited', 'credited', 'spent', 'paid', 'transferred', 'withdrawn',
    'received', 'deducted', 'payment successful', 'txn successful',
    'transaction successful', 'upi payment', 'payment to'
  ];

  // Specific indicators of failed/declined transactions
  private static failureKeywords = [
    'declined', 'decline', 'failed', 'failure', 'unsuccessful',
    'rejected', 'incorrect pin', 'wrong pin', 'insufficient funds',
    'could not be completed', 'unable to process', 'not authorized'
  ];

  // Telecom service confirmations (recharge successful, plan activated) without bank debit
  private static telecomServiceConfirmationPatterns = [
    'recharge of inr', 'recharge of rs', 'recharge of ₹', 'recharge is successful',
    'recharge was successful', 'recharge successful', 'recharge done', 'recharge completed',
    'plan activated', 'pack activated', 'tariff and best recharges', 'best recharges on',
    'for your airtel mobile', 'for your jio', 'for your vi', 'for your bsnl'
  ];

  // Identifiers that indicate money or banks but do NOT mean a transaction occurred
  private static financialTerms = [
    'bank', 'a/c', 'account', 'card', 'vpa', 'upi', 'inr', 'rs', 
    'bal', 'balance', 'txn', 'transaction', 'ref', 'neft', 'rtgs', 'imps'
  ];

  // Informational / Limit / Policy / Service announcement patterns
  private static informationalPatterns = [
    'cooling period', 'cooling-period',
    'transaction limit', 'daily limit', 'monthly limit', 'per day limit',
    'upi limit', 'card limit', 'usage limit', 'transfer limit', 'spending limit',
    'credit limit', 'withdrawal limit', 'maximum limit', 'minimum limit',
    'allowed limit', 'eligible limit', 'limit is', 'limit for', 'limit of',
    'limit applies', 'limit has been', 'limit increased', 'limit decreased',
    'service charge', 'service charges', 'charges applicable', 'annual fee',
    'rate of interest', 'charges for', 'maintenance charges',
    'new user registration', 'registration', 'registered successfully',
    'activation', 'deactivation', 'security notice', 'security advisory',
    'kyc reminder', 'update kyc', 'complete kyc',
    'terms and conditions', 'terms & conditions', 'terms apply', 'terms and policy',
    'balance enquiry', 'available balance is',
    'otp', 'one time password', 'verification code', 'do not share'
  ];

  // Telecom data and service usage alerts
  private static telecomUsageAlertPatterns = [
    'data usage alert', 'data usage', 'daily data used', 'daily quota', 'data alert',
    'quota exhausted', 'remaining data', 'data balance', 'usage alert', 'data saving tips',
    'daily data', 'high speed data', 'fair usage policy', 'fup limit',
    '50% of your daily data', '90% of your daily data', '100% of your daily data',
    '50% of daily data', '90% of daily data', '100% of daily data',
    'validity expiring', 'plan expiring', 'validity expired'
  ];

  // Strong indicators of marketing
  private static promoIndicators = [
    'recharge offer', 'recharge now', 'special offer', 'limited offer',
    'off', 'discount', 'sale', 'use code', 'shop now', 
    'buy 1 get 1', 'cashback', 'earn', "don't miss",
    'exclusive', 'flat', 'save', 'deal', 'subscribe', 
    'enjoy benefits', 'upgrade', 'avail now', 'click here', 't&c', 'promo', 'bonus',
    'welcome back', 'porting out', 'stay on jio', 'we want you back', 'unlimited pack',
    'get unlimited'
  ];

  private static scamKeywords = [
    'winner', 'congratulations', 'lottery', 'claim', 'urgent', 'blocked',
    'suspend', 'verify immediately', 'click link', 'apk', 'reward points'
  ];

  public static classify(
    pooledOutput: Float32Array | number[],
    originalSMS: string
  ): ClassificationResult {
    const textLower = originalSMS.toLowerCase();
    const reasons: string[] = [];

    // 1. SCAM Check — highest priority, dangerous messages
    let scamMatches = 0;
    for (const kw of this.scamKeywords) {
      if (textLower.includes(kw)) scamMatches++;
    }
    if (scamMatches >= 2 || (scamMatches >= 1 && textLower.includes('http'))) {
      reasons.push('Suspicious scam keywords detected');
      if (textLower.includes('http')) reasons.push('Suspicious URL detected');
      return this.buildResult('Scam', 3, 0.96, false, reasons);
    }

    // 2. Telecom Usage & Data Quota Alert Check (Non-Transaction)
    const isTelecomUsageAlert = this.telecomUsageAlertPatterns.some(kw => textLower.includes(kw));

    // Explicit completed financial events (including Indian banking abbreviations like "Dr. INR 450.00")
    const hasExplicitDebit = /\b(debited|debited by|debited with|debited for|debited from|was debited|has been debited|paid to|spent on|withdrawn from|deducted from|transferred to|transferred successfully|card charged|was charged|card was charged)\b/i.test(textLower) ||
                            /\b(?:acct|a\/c|card)?\s*(?:xxx\d*|\d+)?\s*(?:dr|dr\.|dr:)\s*(?:inr|rs\.?|₹)?\s*[\d,]+(?:\.\d{2})?/i.test(textLower) ||
                            /\b(?:dr|dr\.|dr:)\s*(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?/i.test(textLower) ||
                            /\b(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?\s*(?:debited|dr\.|dr)\b/i.test(textLower) ||
                            /\bupi payment of\b/i.test(textLower) ||
                            /\bpayment of (?:inr|rs\.?|₹)\s*[\d,]+.*(?:to|for|was successful|successful)/i.test(textLower) ||
                            /\bpaid (?:inr|rs\.?|₹)\s*[\d,]+/i.test(textLower) ||
                            /\bpaid via (?:upi|card|net banking|wallet|bank)\b/i.test(textLower) ||
                            /\bcard ending \d+ (?:was )?charged\b/i.test(textLower);

    const isTelecomPackCredit = /\bcredited with\b.*\b(pack|days|validity|gb|mb|unlimited|welcome|benefit|trial|points|coupon|voucher)\b/i.test(textLower) ||
                               /\bcredited to your (?:airtel|jio|vi|bsnl|mobile|sim|number)\b/i.test(textLower) ||
                               /\brecharge of .* (?:credited|success)/i.test(textLower) ||
                               /\b(welcome back|porting out|stay on jio|5g unlimited pack|welcome back 5g|recharge offer)\b/i.test(textLower);

    const hasExplicitCredit = (/\b(credited|credited to|credited with|was credited|has been credited|received from|deposited into|refund received|refund credited|cashback credited)\b/i.test(textLower) ||
                              /\b(?:acct|a\/c|card)?\s*(?:xxx\d*|\d+)?\s*(?:cr|cr\.|cr:)\s*(?:inr|rs\.?|₹)?\s*[\d,]+(?:\.\d{2})?/i.test(textLower) ||
                              /\b(?:cr|cr\.|cr:)\s*(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?/i.test(textLower) ||
                              /\b(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?\s*(?:credited|cr\.|cr)\b/i.test(textLower)) &&
                              !isTelecomPackCredit;

    const hasReversal = textLower.includes('reversed') || textLower.includes('refunded');
    const hasFailedAttempt = this.failureKeywords.some(kw => textLower.includes(kw)) && /\b(txn|transaction|payment|order|card)\b/i.test(textLower);

    if (isTelecomUsageAlert && !hasExplicitDebit && !hasExplicitCredit) {
      reasons.push('Telecom data quota or service usage alert (no monetary movement)');
      return this.buildResult('Personal', 1, 0.96, false, reasons);
    }

    // 3. Telecom Service Fulfillment / Confirmation Check (e.g. "Recharge of INR 979 is successful for your Airtel Mobile", "Recharge of ₹299 successful for Jio", "recharge of Rs. 979 successfully credited to your Airtel number")
    const isTelecomServiceConfirm = this.telecomServiceConfirmationPatterns.some(kw => textLower.includes(kw)) ||
                                    /\brecharge\b.*(?:successful|completed|done|activated|credited)/i.test(textLower) ||
                                    /\b(airtel mobile|jio mobile|best recharges on)\b/i.test(textLower);

    if (isTelecomServiceConfirm && !hasExplicitDebit && !hasExplicitCredit && !hasFailedAttempt) {
      reasons.push('Telecom recharge or service fulfillment confirmation without explicit financial debit evidence');
      return this.buildResult('Personal', 1, 0.98, false, reasons);
    }

    // 4. Telecom Benefit / Pack Credits & Promotional Offers Check (e.g. "credited with 7 days welcome back 5G pack", "Recharge offer ₹299", "Recharge ₹979 and get unlimited data", "With your recharge of Rs.979 enjoy FREE access")
    const isTelecomPromo = isTelecomPackCredit ||
                           /\brecharge\b.*(?:\bget\b|\bunlimited\b|\boffer\b|\bbonus\b|\bdiscount\b|\bvalid till\b|\bfree\b)/i.test(textLower) ||
                           /\b(with your recharge of|enjoy free access|unlock 12 months|claim 20\+ ott|watch now)\b/i.test(textLower);

    if (isTelecomPromo && !hasExplicitDebit && !hasExplicitCredit) {
      reasons.push('Telecom promotional benefit or data pack credit (non-monetary)');
      return this.buildResult('Promotion', 2, 0.96, false, reasons);
    }

    // 5. Check for explicit completed financial events
    let hasDebitOrCreditEvent = false;
    if (hasExplicitDebit || hasExplicitCredit || hasReversal || hasFailedAttempt) {
      hasDebitOrCreditEvent = true;
    } else {
      for (const kw of this.financialEvents) {
        if (textLower.includes(kw)) {
          if (kw === 'txn successful' || kw === 'transaction successful' || kw === 'payment successful' || kw === 'upi payment') {
            hasDebitOrCreditEvent = true;
            break;
          }
          if ((kw === 'debited' || kw === 'credited' || kw === 'spent' || kw === 'withdrawn' || kw === 'deducted' || kw === 'paid to')) {
            hasDebitOrCreditEvent = true;
            break;
          }
        }
      }
    }

    // 6. Informational Limit / Policy Check
    const hasInfoPattern = this.informationalPatterns.some(kw => textLower.includes(kw));
    if (hasInfoPattern && !hasExplicitDebit && !hasExplicitCredit) {
      reasons.push('Informational banking notice or limit alert (no money moved)');
      return this.buildResult('Personal', 1, 0.98, false, reasons);
    }

    // 7. Promotional Messages (No confirmed financial event)
    let promoMatches = 0;
    for (const kw of this.promoIndicators) {
      if (textLower.includes(kw)) promoMatches++;
    }
    if ((promoMatches >= 2 || (promoMatches >= 1 && !hasDebitOrCreditEvent)) && !hasDebitOrCreditEvent) {
      reasons.push('Promotional language detected without confirmed financial event');
      return this.buildResult('Promotion', 2, 0.95, false, reasons);
    }

    const hasDigits = /\d/.test(textLower);

    // 8. Confirmed Transaction Event
    if (hasDebitOrCreditEvent && hasDigits) {
      reasons.push('Confirmed financial event detected');
      return this.buildResult('Transaction', 0, 0.98, true, reasons);
    }

    // 9. Default: Personal / Informational Non-Transaction
    reasons.push('Informational or conversational message without confirmed payment event');
    return this.buildResult('Personal', 1, 0.92, false, reasons);
  }

  private static buildResult(
    predictedClass: 'Transaction' | 'Personal' | 'Promotion' | 'Scam',
    classId: number,
    confidence: number,
    isTransaction: boolean,
    reasons: string[]
  ): ClassificationResult {
    const logits = [0, 0, 0, 0];
    logits[classId] = confidence;
    return {
      predictedClass,
      classId,
      confidence,
      isTransaction,
      logits,
      reasons
    };
  }
}
