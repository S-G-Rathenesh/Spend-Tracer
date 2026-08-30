import { ExtractedEntities } from './EntityReconstruction';
import { ExpenseCategoryResult } from './ExpenseClassifier';

export class TransactionValidator {
  private static readonly INFORMATIONAL_KEYWORDS = [
    'cooling period', 'cooling-period', 'transaction limit', 'daily limit', 
    'monthly limit', 'per day limit', 'upi limit', 'card limit', 'usage limit', 
    'transfer limit', 'spending limit', 'credit limit', 'withdrawal limit',
    'limit is', 'limit for', 'limit of', 'limit applies', 'limit has been', 
    'allowed limit', 'eligible limit', 'service charge', 'charges applicable',
    'annual fee', 'new user registration', 'registration', 'security notice',
    'kyc reminder', 'update kyc', 'complete kyc'
  ];

  public static validate(
    entities: ExtractedEntities,
    categoryResult: ExpenseCategoryResult,
    smsText: string
  ): { isValid: boolean; reason: string } {
    const textLowerVal = smsText.toLowerCase();

    // Rule 1: Amount Check
    if (
      entities.amount === null || 
      entities.amount === undefined || 
      Number.isNaN(entities.amount) || 
      entities.amount <= 0
    ) {
      return { isValid: false, reason: `Amount is ${entities.amount}` };
    }

    // Rule 2: Informational / Limit check
    const hasInfoKeyword = this.INFORMATIONAL_KEYWORDS.some(kw => textLowerVal.includes(kw));
    const hasExplicitAction = /\b(debited|debited by|debited with|debited for|debited from|was debited|has been debited|paid to|spent on|withdrawn from|deducted from|transferred to|transferred successfully|card charged|was charged|credited|received from|deposited into|refund received|refund credited|cashback credited|declined|failed|rejected)\b/i.test(textLowerVal) ||
                              /\b(?:acct|a\/c|card)?\s*(?:xxx\d*|\d+)?\s*(?:dr|dr\.|dr:)\s*(?:inr|rs\.?|₹)?\s*[\d,]+(?:\.\d{2})?/i.test(textLowerVal) ||
                              /\b(?:dr|dr\.|dr:)\s*(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?/i.test(textLowerVal) ||
                              /\b(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?\s*(?:debited|dr\.|dr)\b/i.test(textLowerVal) ||
                              /\bupi payment of\b/i.test(textLowerVal) ||
                              /\bpaid via (?:upi|card|net banking|wallet|bank)\b/i.test(textLowerVal) ||
                              /\bcard ending \d+ (?:was )?charged\b/i.test(textLowerVal);

    if (hasInfoKeyword && !hasExplicitAction) {
      return { isValid: false, reason: 'Informational message or limit notification (no transaction occurred)' };
    }

    // Rule 2b: Telecom Service Confirmation check (recharge success without money debit)
    const isTelecomServiceConfirm = /\b(recharge (?:of|is|was|done|completed|successful)|plan activated|pack activated)\b/i.test(textLowerVal) ||
                                    /\b(airtel mobile|jio mobile|best recharges on)\b/i.test(textLowerVal);
    if (isTelecomServiceConfirm && !hasExplicitAction) {
      return { isValid: false, reason: 'Telecom service confirmation lacking explicit financial debit evidence' };
    }

    // Rule 3: Vague Transaction Check
    const isUnknownMerchant = !entities.merchant || entities.merchant === 'Unknown Merchant';
    const isOthersCategory = !categoryResult.category || categoryResult.category === 'Others' || categoryResult.category === 'Unknown';

    if (isUnknownMerchant && isOthersCategory) {
      // Look for explicit banking transaction keywords
      const explicitBankingKeywords = [
        'debited', 'credited', 'dr.', 'cr.', 'dr ', 'cr ', 'paid', 'spent', 'withdrawn',
        'transferred', 'deducted', 'declined', 'failed', 'refund'
      ];
      
      const hasExplicitBanking = explicitBankingKeywords.some(kw => textLowerVal.includes(kw));
      
      if (!hasExplicitBanking) {
        return { isValid: false, reason: 'Vague transaction lacking explicit financial event keywords' };
      }
    }

    return { isValid: true, reason: '' };
  }
}
