import { ExtractedEntities } from './EntityReconstruction';
import { ExpenseCategoryResult } from './ExpenseClassifier';

export class TransactionValidator {
  public static validate(
    entities: ExtractedEntities,
    categoryResult: ExpenseCategoryResult,
    smsText: string
  ): { isValid: boolean; reason: string } {
    let isValid = true;
    let rejectReason = '';
    const textLowerVal = smsText.toLowerCase();

    // Rule 1: Amount Check
    if (
      entities.amount === null || 
      entities.amount === undefined || 
      Number.isNaN(entities.amount) || 
      entities.amount <= 0
    ) {
      isValid = false;
      rejectReason = `Amount is ${entities.amount}`;
      return { isValid, reason: rejectReason };
    }

    // Rule 2: Vague Transaction Check
    const isUnknownMerchant = !entities.merchant || entities.merchant === 'Unknown Merchant';
    const isOthersCategory = !categoryResult.category || categoryResult.category === 'Others';
    const isZeroAmount = entities.amount === 0;

    if (isUnknownMerchant && isZeroAmount && isOthersCategory) {
      // Look for explicit banking keywords
      const explicitBankingKeywords = [
        'debited', 'credited', 'dr.', 'cr.', 'upi', 'imps', 'neft', 'rtgs',
        'acct', 'a/c', 'available balance', 'txn', 'transaction id'
      ];
      
      const hasExplicitBanking = explicitBankingKeywords.some(kw => textLowerVal.includes(kw));
      
      if (!hasExplicitBanking) {
        isValid = false;
        rejectReason = 'Vague transaction lacking explicit banking keywords';
        return { isValid, reason: rejectReason };
      }
    }

    return { isValid: true, reason: '' };
  }
}
