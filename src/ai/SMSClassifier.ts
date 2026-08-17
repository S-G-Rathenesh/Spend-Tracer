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
  // Strong indicators of a completed financial event
  private static financialEvents = [
    'debited', 'credited', 'spent', 'paid', 'transferred', 'withdrawn',
    'received', 'deducted', 'payment successful', 'txn successful'
  ];

  // Identifiers that indicate money or banks but do NOT mean a transaction occurred
  private static financialTerms = [
    'bank', 'a/c', 'account', 'card', 'vpa', 'upi', 'inr', 'rs', 
    'bal', 'balance', 'txn', 'transaction', 'ref', 'neft', 'rtgs', 'imps'
  ];

  // Strong indicators of marketing
  private static promoIndicators = [
    'off', 'discount', 'sale', 'use code', 'shop now', 'limited offer', 
    'buy 1 get 1', 'recharge now', 'cashback', 'earn', "don't miss",
    'special offer', 'exclusive', 'flat', 'save', 'deal', 'subscribe', 
    'enjoy benefits', 'upgrade', 'avail now', 'click here', 't&c', 'promo', 'bonus'
  ];

  private static scamKeywords = [
    'winner', 'congratulations', 'lottery', 'claim', 'urgent', 'blocked',
    'kyc', 'suspend', 'verify immediately', 'click link', 'apk', 'reward points'
  ];

  public static classify(
    pooledOutput: Float32Array | number[],
    originalSMS: string
  ): ClassificationResult {
    const textLower = originalSMS.toLowerCase();
    const reasons: string[] = [];

    let eventMatches = 0;
    for (const kw of this.financialEvents) {
      if (textLower.includes(kw)) eventMatches++;
    }

    let termMatches = 0;
    for (const kw of this.financialTerms) {
      if (textLower.includes(kw)) termMatches++;
    }

    let promoMatches = 0;
    for (const kw of this.promoIndicators) {
      if (textLower.includes(kw)) promoMatches++;
    }

    let scamMatches = 0;
    for (const kw of this.scamKeywords) {
      if (textLower.includes(kw)) scamMatches++;
    }

    const hasDigits = /\d/.test(textLower);

    let predictedClass: 'Transaction' | 'Personal' | 'Promotion' | 'Scam' = 'Personal';
    let classId = 1;
    let confidence = 0.90;

    // 1. SCAM — highest priority, dangerous messages
    if (scamMatches >= 2 || (scamMatches >= 1 && textLower.includes('http'))) {
      predictedClass = 'Scam';
      classId = 3;
      confidence = 0.96;
      reasons.push('Suspicious scam keywords detected');
      if (textLower.includes('http')) reasons.push('Suspicious URL detected');
    }
    // 2. TRANSACTION — explicit financial event (debited/credited/paid etc.) with digits
    //    This takes priority over promotional keywords because a real debit alert
    //    may contain incidental promo-like words (e.g. "T&C", "cashback earned").
    else if (eventMatches >= 1 && hasDigits) {
      predictedClass = 'Transaction';
      classId = 0;
      confidence = 0.98;
      reasons.push('Confirmed debit/credit event detected');
      if (promoMatches > 0) {
        reasons.push('Promotional keywords present but overridden by explicit financial event');
      }
    }
    // 3. PROMOTION — promotional language without a confirmed financial event
    else if (promoMatches >= 2 || (promoMatches >= 1 && termMatches > 0 && eventMatches === 0)) {
      predictedClass = 'Promotion';
      classId = 2;
      confidence = 0.95;
      reasons.push('Promotional language detected');
      if (termMatches > 0) {
        reasons.push('Financial terminology used without a confirmed payment');
      }
    }
    // 4. WEAK TRANSACTION — no explicit event, but strong financial term presence with digits
    else if (termMatches >= 2 && hasDigits) {
      predictedClass = 'Transaction';
      classId = 0;
      confidence = 0.91;
      reasons.push('Financial references and amounts detected');
    }
    // 5. PERSONAL — financial terms but no amounts/events/promos
    else if (termMatches >= 1) {
      predictedClass = 'Personal';
      classId = 1;
      confidence = 0.85;
      reasons.push('Contains financial terms but lacks transaction amounts or events');
    }
    // 6. PERSONAL — default
    else {
      predictedClass = 'Personal';
      classId = 1;
      confidence = 0.90;
      reasons.push('Standard conversational message');
    }

    const isTransaction = predictedClass === 'Transaction';
    const fakeLogits = [0, 0, 0, 0];
    fakeLogits[classId] = 4.5;

    return {
      predictedClass,
      classId,
      confidence,
      isTransaction,
      logits: fakeLogits,
      reasons
    };
  }
}
