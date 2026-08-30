export class PromotionTransactionValidator {
  private static readonly DEBIT_INDICATORS = [
    'debited', 'dr', 'dr.', 'dr:', 'paid', 'payment successful', 'withdrawn', 
    'deducted', 'purchase', 'spent', 'txn successful', 
    'transaction successful', 'upi payment', 'transferred successfully',
    'transferred to', 'sent to', 'payment to'
  ];

  private static readonly CREDIT_INDICATORS = [
    'credited', 'cr', 'cr.', 'cr:', 'received', 'deposit', 'deposited', 'refund credited', 
    'refund received', 'salary credited', 'cashback credited', 'transferred to your account'
  ];

  private static readonly FAILED_INDICATORS = [
    'declined', 'decline', 'failed', 'failure', 'unsuccessful',
    'rejected', 'incorrect pin', 'wrong pin', 'insufficient funds',
    'could not be completed', 'unable to process', 'not authorized'
  ];

  private static readonly REVERSED_INDICATORS = [
    'reversed', 'refunded'
  ];

  private static readonly INFORMATIONAL_LIMIT_KEYWORDS = [
    'cooling period', 'cooling-period', 'transaction limit', 'daily limit', 
    'monthly limit', 'per day limit', 'upi limit', 'card limit', 'usage limit', 
    'transfer limit', 'spending limit', 'credit limit', 'withdrawal limit',
    'maximum limit', 'minimum limit', 'allowed limit', 'eligible limit', 
    'limit is', 'limit for', 'limit of', 'limit applies', 'limit has been', 
    'limit increased', 'limit decreased', 'service charge', 'service charges', 
    'charges applicable', 'annual fee', 'rate of interest', 'charges for', 
    'maintenance charge', 'new user registration', 'registration', 
    'registered successfully', 'activation', 'deactivation', 'security notice', 
    'security advisory', 'kyc reminder', 'update kyc', 
    'complete kyc', 'terms and conditions', 'terms & conditions', 'terms apply', 
    'policy', 'pack validity', 'validity of'
  ];

  private static readonly TELECOM_USAGE_ALERT_KEYWORDS = [
    'data usage alert', 'data usage', 'daily data used', 'daily quota', 'data alert',
    'quota exhausted', 'remaining data', 'data balance', 'usage alert', 'data saving tips',
    '50% of your daily data', '90% of your daily data', '100% of your daily data',
    '50% of daily data', '90% of daily data', '100% of daily data'
  ];

  private static readonly PROMOTIONAL_KEYWORDS = [
    'offer', 'offers', 'promo', 'promotion', 'discount', 
    'cashback offer', 'save up to', 'buy now', 'recharge now', 
    'limited period', 'special offer', 'valid till', 'starting from', 
    'starting at', 'free', 'get', 'plan', 'pack', 'data', 'gb', 'mb', 
    'ott', 'validity', 'unlimited', 'only rs', 'starts at', 'per day',
    'welcome back', 'porting out', 'stay on jio', 'we want you back'
  ];

  private static readonly TELECOM_KEYWORDS = [
    'data', 'gb', 'mb', 'pack', 'plan', 'validity', 'recharge now', 
    'ott', 'sms pack', 'internet', 'usage alert', 'alert 50%', 
    'alert 90%', 'alert 100%'
  ];

  private static readonly TELECOM_SENDERS = [
    'airtel', 'jio', 'vi', 'bsnl'
  ];

  private static readonly SHOPPING_BRANDS = [
    'amazon', 'flipkart', 'swiggy', 'zomato', 'myntra', 'ajio'
  ];

  private static readonly TELECOM_SERVICE_CONFIRM_KEYWORDS = [
    'recharge of inr', 'recharge of rs', 'recharge of ₹', 'recharge is successful',
    'recharge was successful', 'recharge successful', 'recharge done', 'recharge completed',
    'airtel mobile', 'jio mobile', 'best recharges on', 'plan activated', 'pack activated'
  ];

  public static validate(
    smsText: string, 
    amount: number | null, 
    sender: string
  ): { isValid: boolean; reason: string; confidence: number } {
    const text = smsText.toLowerCase();
    const senderLower = sender.toLowerCase();

    // 1. Telecom Data Usage Alert Check (Non-Transaction)
    const isTelecomUsage = this.containsKeyword(text, this.TELECOM_USAGE_ALERT_KEYWORDS);
    const hasExplicitDebitAction = /\b(debited|debited by|debited with|debited for|debited from|was debited|has been debited|paid to|spent on|withdrawn from|deducted from|transferred to|transferred successfully|card charged|was charged|card was charged)\b/i.test(text) ||
                                  /\b(?:acct|a\/c|card)?\s*(?:xxx\d*|\d+)?\s*(?:dr|dr\.|dr:)\s*(?:inr|rs\.?|₹)?\s*[\d,]+(?:\.\d{2})?/i.test(text) ||
                                  /\b(?:dr|dr\.|dr:)\s*(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?/i.test(text) ||
                                  /\b(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?\s*(?:debited|dr\.|dr)\b/i.test(text) ||
                                  /\bupi payment of\b/i.test(text) ||
                                  /\bpayment of (?:inr|rs\.?|₹)\s*[\d,]+.*(?:to|for|was successful|successful)/i.test(text) ||
                                  /\bpaid (?:inr|rs\.?|₹)\s*[\d,]+/i.test(text) ||
                                  /\bpaid via (?:upi|card|net banking|wallet|bank)\b/i.test(text) ||
                                  /\bcard ending \d+ (?:was )?charged\b/i.test(text);

    const isTelecomPackCredit = /\bcredited with\b.*\b(pack|days|validity|gb|mb|unlimited|welcome|benefit|trial|points|coupon|voucher)\b/i.test(text) ||
                               /\bcredited to your (?:airtel|jio|vi|bsnl|mobile|sim|number)\b/i.test(text) ||
                               /\brecharge of .* (?:credited|success)/i.test(text) ||
                               /\b(welcome back|porting out|stay on jio|5g unlimited pack|welcome back 5g|recharge offer)\b/i.test(text);

    const hasExplicitCreditAction = (/\b(credited|credited to|credited with|was credited|has been credited|received from|deposited into|refund received|refund credited|cashback credited)\b/i.test(text) ||
                                    /\b(?:acct|a\/c|card)?\s*(?:xxx\d*|\d+)?\s*(?:cr|cr\.|cr:)\s*(?:inr|rs\.?|₹)?\s*[\d,]+(?:\.\d{2})?/i.test(text) ||
                                    /\b(?:cr|cr\.|cr:)\s*(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?/i.test(text) ||
                                    /\b(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?\s*(?:credited|cr\.|cr)\b/i.test(text)) &&
                                    !isTelecomPackCredit;

    if (isTelecomUsage && !hasExplicitDebitAction && !hasExplicitCreditAction) {
      return { isValid: false, reason: 'TELECOM_USAGE_ALERT', confidence: 0 };
    }

    // 2. Telecom Service Fulfillment / Confirmation Check (Recharge success without explicit payment debit)
    const isTelecomServiceConfirm = this.containsKeyword(text, this.TELECOM_SERVICE_CONFIRM_KEYWORDS) ||
                                    /\brecharge\b.*(?:successful|completed|done|activated|credited)/i.test(text) ||
                                    /\b(airtel mobile|jio mobile|best recharges on)\b/i.test(text);

    if (isTelecomServiceConfirm && !hasExplicitDebitAction && !hasExplicitCreditAction) {
      return { isValid: false, reason: 'TELECOM_SERVICE_CONFIRMATION', confidence: 0 };
    }

    // 3. Telecom Benefit / Pack Credit & Promotional Offers Check
    const isTelecomPromo = isTelecomPackCredit ||
                           /\brecharge\b.*(?:\bget\b|\bunlimited\b|\boffer\b|\bbonus\b|\bdiscount\b|\bvalid till\b|\bfree\b)/i.test(text) ||
                           /\b(with your recharge of|enjoy free access|unlock 12 months|claim 20\+ ott|watch now)\b/i.test(text);

    if (isTelecomPromo && !hasExplicitDebitAction && !hasExplicitCreditAction) {
      return { isValid: false, reason: 'TELECOM_OFFER', confidence: 0 };
    }

    // 4. Check Informational / Limit / Policy Notices
    const hasInfoLimit = this.containsKeyword(text, this.INFORMATIONAL_LIMIT_KEYWORDS);
    if (hasInfoLimit && !hasExplicitDebitAction && !hasExplicitCreditAction) {
      return { isValid: false, reason: 'INFORMATIONAL_LIMIT_NOTICE', confidence: 0 };
    }

    const hasDebit = this.containsKeyword(text, this.DEBIT_INDICATORS) || hasExplicitDebitAction;
    const hasCredit = (this.containsKeyword(text, this.CREDIT_INDICATORS) || hasExplicitCreditAction) && !isTelecomPackCredit;
    const hasReversed = this.containsKeyword(text, this.REVERSED_INDICATORS);
    const hasFailed = this.containsKeyword(text, this.FAILED_INDICATORS) && /\b(txn|transaction|payment|order|card)\b/i.test(text);

    const hasTransactionEvidence = hasDebit || hasCredit || hasReversed || hasFailed;

    // 5. Shopping Promotions
    const isShoppingBrand = this.containsKeyword(text, this.SHOPPING_BRANDS) || this.containsKeyword(senderLower, this.SHOPPING_BRANDS);
    if (isShoppingBrand && !hasTransactionEvidence) {
      return { isValid: false, reason: 'ADVERTISEMENT', confidence: 0 };
    }

    // 6. Telecom Promotional Detection
    const isTelecomSender = this.containsKeyword(senderLower, this.TELECOM_SENDERS) || this.containsKeyword(text, this.TELECOM_SENDERS);
    const hasTelecomKeywords = this.containsKeyword(text, this.TELECOM_KEYWORDS);
    
    if (isTelecomSender && hasTelecomKeywords && !hasTransactionEvidence) {
      return { isValid: false, reason: 'TELECOM_OFFER', confidence: 0 };
    }

    // 7. Reject Promotional Messages
    const hasPromo = this.containsKeyword(text, this.PROMOTIONAL_KEYWORDS);
    if (hasPromo && !hasTransactionEvidence) {
      return { isValid: false, reason: 'PROMOTIONAL_SMS', confidence: 0 };
    }

    // 8. Require Transaction Evidence (Monetary amount alone does not indicate a transaction)
    if (amount !== null && !hasTransactionEvidence) {
      return { isValid: false, reason: 'NO_TRANSACTION_EVIDENCE', confidence: 0 };
    }

    if (!hasTransactionEvidence) {
      return { isValid: false, reason: 'PRICE_ONLY', confidence: 0 };
    }

    let confidence = 0.5;
    if (hasDebit || hasCredit) confidence += 0.4;
    if (hasFailed) confidence += 0.3;

    return { isValid: true, reason: '', confidence: Math.min(confidence, 1.0) };
  }

  private static containsKeyword(text: string, keywords: string[]): boolean {
    return keywords.some(kw => {
      if (kw === 'dr' || kw === 'cr' || kw === 'dr.' || kw === 'cr.' || kw === 'gb' || kw === 'mb') {
        return new RegExp(`\\b${kw.replace('.', '\\.')}\\b`).test(text);
      }
      return text.includes(kw);
    });
  }
}
