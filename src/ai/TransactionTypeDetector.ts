export class TransactionTypeDetector {
  private static readonly DEBIT_KEYWORDS = [
    'dr.', 'dr ', ' dr', 'debit', 'debited', 'withdrawn', 'withdrawal',
    'paid', 'payment', 'purchase', 'spent', 'sent', 'transferred',
    'upi dr', 'neft dr', 'rtgs dr', 'imps dr'
  ];

  private static readonly CREDIT_KEYWORDS = [
    'cr.', 'cr ', ' cr', 'credit', 'credited', 'received', 'deposit',
    'salary credited', 'refund', 'cashback', 'interest credited', 'added'
  ];

  public static detect(smsText: string): 'Debit' | 'Credit' | null {
    const textLower = smsText.toLowerCase();

    // Check credit keywords first, as they are often more explicitly stated in refund/deposit scenarios
    for (const kw of this.CREDIT_KEYWORDS) {
      if (textLower.includes(kw)) {
        return 'Credit';
      }
    }

    // Check debit keywords
    for (const kw of this.DEBIT_KEYWORDS) {
      if (textLower.includes(kw)) {
        return 'Debit';
      }
    }

    return null; // Let AI or fallback logic decide if no clear keyword is found
  }
}
