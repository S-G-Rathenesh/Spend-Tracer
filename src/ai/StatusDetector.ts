export class StatusDetector {
  public static determineStatus(smsText: string): 'COMPLETED' | 'FAILED' | 'REVERSED' {
    const textLower = smsText.toLowerCase();

    // Reversal keywords
    const isReversed = textLower.includes('reversed') || 
                       textLower.includes('refunded');
                       
    if (isReversed) {
        return 'REVERSED';
    }

    // Explicit success words that override failure/attempt keywords
    const hasSuccessful = textLower.includes('successful') || 
                          textLower.includes('completed') || 
                          textLower.includes('debited') || 
                          textLower.includes('credited');

    // Failure keywords
    const failureKeywords = [
      'declined', 'decline', 'failed', 'failure', 'unsuccessful',
      'rejected', 'incorrect pin', 'wrong pin', 'insufficient funds',
      'could not be completed', 'unable to process', 'not authorized'
    ];

    const hasFailure = failureKeywords.some(kw => textLower.includes(kw));

    if (hasFailure) {
      // If it has explicit success AND failure, it's tricky. 
      // e.g. "transaction failed, another debited successfully" -> usually 2 txns.
      // But typically "attempted but transaction was successful" -> COMPLETED
      // Let's strictly prioritize success over failure if both are present in the same sentence?
      // Actually, if it says "debited successfully" it is completed.
      // If it says "attempted but declined" -> FAILED.
      // Let's assume if 'debited' or 'credited' or 'completed' or 'successful' is present without 'unsuccessful', it's COMPLETED.
      // Wait, "transaction unsuccessful" has "successful" inside it! 
      // `textLower.includes('successful')` matches `unsuccessful`.
      // We need to be careful with word boundaries.
      
      const hasStrictSuccess = /\b(successful|successfully|completed|debited|credited)\b/i.test(textLower);
      const hasStrictFailure = /\b(declined|decline|failed|failure|unsuccessful|rejected|incorrect pin|wrong pin|insufficient funds|could not be completed|unable to process|not authorized)\b/i.test(textLower);

      if (hasStrictFailure) {
         if (hasStrictSuccess && !/\bunsuccessful\b/.test(textLower)) {
            // "transaction failed but 500 debited successfully" -> If they are both present, 
            // usually a debited amount means money moved. But "payment failed" overrides?
            // "750 attempted but transaction was successful" -> COMPLETED
            return 'COMPLETED';
         }
         return 'FAILED';
      }
    }

    return 'COMPLETED';
  }
}
