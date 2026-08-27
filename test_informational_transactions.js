class SMSClassifier {
  static financialEvents = [
    'debited', 'credited', 'spent', 'paid', 'transferred', 'withdrawn',
    'received', 'deducted', 'payment successful', 'txn successful',
    'transaction successful', 'upi payment', 'payment to'
  ];

  static failureKeywords = [
    'declined', 'decline', 'failed', 'failure', 'unsuccessful',
    'rejected', 'incorrect pin', 'wrong pin', 'insufficient funds',
    'could not be completed', 'unable to process', 'not authorized'
  ];

  static rechargeConfirmations = [
    'recharge successful', 'recharge of', 'recharge done'
  ];

  static informationalPatterns = [
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
    'security alert', 'fraud alert', 'kyc reminder', 'update kyc', 'complete kyc',
    'terms and conditions', 'terms & conditions', 'terms apply', 'terms and policy',
    'pack validity', 'validity of', 'balance enquiry', 'available balance is',
    'otp', 'one time password', 'verification code', 'do not share'
  ];

  static promoIndicators = [
    'off', 'discount', 'sale', 'use code', 'shop now', 'limited offer', 
    'buy 1 get 1', 'recharge now', 'cashback', 'earn', "don't miss",
    'special offer', 'exclusive', 'flat', 'save', 'deal', 'subscribe', 
    'enjoy benefits', 'upgrade', 'avail now', 'click here', 't&c', 'promo', 'bonus'
  ];

  static scamKeywords = [
    'winner', 'congratulations', 'lottery', 'claim', 'urgent', 'blocked',
    'suspend', 'verify immediately', 'click link', 'apk', 'reward points'
  ];

  static classify(pooledOutput, originalSMS) {
    const textLower = originalSMS.toLowerCase();
    const reasons = [];

    // 1. SCAM Check
    let scamMatches = 0;
    for (const kw of this.scamKeywords) {
      if (textLower.includes(kw)) scamMatches++;
    }
    if (scamMatches >= 2 || (scamMatches >= 1 && textLower.includes('http'))) {
      reasons.push('Suspicious scam keywords detected');
      if (textLower.includes('http')) reasons.push('Suspicious URL detected');
      return this.buildResult('Scam', 3, 0.96, false, reasons);
    }

    // 2. Informational / Limit / Policy Check
    const hasInfoPattern = this.informationalPatterns.some(kw => textLower.includes(kw));

    // Check for explicit completed financial events
    let hasDebitOrCreditEvent = false;
    const hasExplicitDebit = /\b(debited|debited by|debited with|was debited|has been debited|paid to|spent on|withdrawn from|deducted from|transferred to|transferred successfully)\b/i.test(textLower);
    const hasExplicitCredit = /\b(credited|credited to|credited with|was credited|has been credited|received from|deposited into|refund received|refund credited|cashback credited)\b/i.test(textLower);
    const hasRecharge = this.rechargeConfirmations.some(kw => textLower.includes(kw));
    const hasReversal = textLower.includes('reversed') || textLower.includes('refunded');
    const hasFailedAttempt = this.failureKeywords.some(kw => textLower.includes(kw)) && /\b(txn|transaction|payment|order|card)\b/i.test(textLower);

    if (hasExplicitDebit || hasExplicitCredit || hasRecharge || hasReversal || hasFailedAttempt) {
      hasDebitOrCreditEvent = true;
    } else {
      for (const kw of this.financialEvents) {
        if (textLower.includes(kw)) {
          if (kw === 'txn successful' || kw === 'transaction successful' || kw === 'payment successful' || kw === 'upi payment') {
            hasDebitOrCreditEvent = true;
            break;
          }
          if ((kw === 'debited' || kw === 'credited' || kw === 'spent' || kw === 'withdrawn' || kw === 'deducted' || kw === 'paid') && !hasInfoPattern) {
            hasDebitOrCreditEvent = true;
            break;
          }
        }
      }
    }

    // If it's an informational limit alert and does NOT contain an explicit past-tense debit/credit action:
    if (hasInfoPattern && !hasExplicitDebit && !hasExplicitCredit) {
      reasons.push('Informational banking notice or limit alert (no money moved)');
      return this.buildResult('Personal', 1, 0.98, false, reasons);
    }

    // 3. Promotional Messages
    let promoMatches = 0;
    for (const kw of this.promoIndicators) {
      if (textLower.includes(kw)) promoMatches++;
    }
    if ((promoMatches >= 2 || (promoMatches >= 1 && !hasDebitOrCreditEvent)) && !hasDebitOrCreditEvent) {
      reasons.push('Promotional language detected without confirmed financial event');
      return this.buildResult('Promotion', 2, 0.95, false, reasons);
    }

    const hasDigits = /\d/.test(textLower);

    // 4. Confirmed Transaction Event
    if (hasDebitOrCreditEvent && hasDigits) {
      reasons.push('Confirmed financial event detected');
      return this.buildResult('Transaction', 0, 0.98, true, reasons);
    }

    // 5. Default: Personal / Informational Non-Transaction
    reasons.push('Informational or conversational message without confirmed payment event');
    return this.buildResult('Personal', 1, 0.92, false, reasons);
  }

  static buildResult(predictedClass, classId, confidence, isTransaction, reasons) {
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

class PromotionTransactionValidator {
  static DEBIT_INDICATORS = [
    'debited', 'dr', 'paid', 'payment successful', 'withdrawn', 
    'deducted', 'purchase', 'spent', 'txn successful', 
    'transaction successful', 'upi payment', 'transferred successfully',
    'transferred to', 'sent to', 'payment to'
  ];

  static CREDIT_INDICATORS = [
    'credited', 'cr', 'received', 'deposit', 'deposited', 'refund credited', 
    'refund received', 'salary credited', 'cashback credited', 'transferred to your account'
  ];

  static FAILED_INDICATORS = [
    'declined', 'decline', 'failed', 'failure', 'unsuccessful',
    'rejected', 'incorrect pin', 'wrong pin', 'insufficient funds',
    'could not be completed', 'unable to process', 'not authorized'
  ];

  static REVERSED_INDICATORS = [
    'reversed', 'refunded'
  ];

  static INFORMATIONAL_LIMIT_KEYWORDS = [
    'cooling period', 'cooling-period', 'transaction limit', 'daily limit', 
    'monthly limit', 'per day limit', 'upi limit', 'card limit', 'usage limit', 
    'transfer limit', 'spending limit', 'credit limit', 'withdrawal limit',
    'maximum limit', 'minimum limit', 'allowed limit', 'eligible limit', 
    'limit is', 'limit for', 'limit of', 'limit applies', 'limit has been', 
    'limit increased', 'limit decreased', 'service charge', 'service charges', 
    'charges applicable', 'annual fee', 'rate of interest', 'charges for', 
    'maintenance charge', 'new user registration', 'registration', 
    'registered successfully', 'activation', 'deactivation', 'security notice', 
    'security advisory', 'security alert', 'kyc reminder', 'update kyc', 
    'complete kyc', 'terms and conditions', 'terms & conditions', 'terms apply', 
    'policy', 'pack validity', 'validity of'
  ];

  static PROMOTIONAL_KEYWORDS = [
    'offer', 'offers', 'promo', 'promotion', 'discount', 
    'cashback offer', 'save up to', 'buy now', 'recharge now', 
    'limited period', 'special offer', 'valid till', 'starting from', 
    'starting at', 'free', 'get', 'plan', 'pack', 'data', 'gb', 'mb', 
    'ott', 'validity', 'unlimited', 'only rs', 'starts at', 'per day'
  ];

  static TELECOM_KEYWORDS = [
    'data', 'gb', 'mb', 'pack', 'plan', 'validity', 'recharge now', 
    'ott', 'sms pack', 'internet', 'usage alert', 'alert 50%', 
    'alert 90%', 'alert 100%'
  ];

  static TELECOM_SENDERS = [
    'airtel', 'jio', 'vi', 'bsnl'
  ];

  static SHOPPING_BRANDS = [
    'amazon', 'flipkart', 'swiggy', 'zomato', 'myntra', 'ajio'
  ];

  static RECHARGE_CONFIRMATION = [
    'recharge successful', 'recharge of', 'recharge done'
  ];

  static validate(smsText, amount, sender) {
    const text = smsText.toLowerCase();
    const senderLower = (sender || '').toLowerCase();

    // 1. Check Informational / Limit / Policy Notices
    const hasInfoLimit = this.containsKeyword(text, this.INFORMATIONAL_LIMIT_KEYWORDS);
    const hasExplicitDebitAction = /\b(debited|debited by|debited with|was debited|has been debited|paid to|spent on|withdrawn from|deducted from|transferred to|transferred successfully)\b/i.test(text);
    const hasExplicitCreditAction = /\b(credited|credited to|credited with|was credited|has been credited|received from|deposited into|refund received|refund credited|cashback credited)\b/i.test(text);

    if (hasInfoLimit && !hasExplicitDebitAction && !hasExplicitCreditAction) {
      return { isValid: false, reason: 'INFORMATIONAL_LIMIT_NOTICE', confidence: 0 };
    }

    const hasDebit = this.containsKeyword(text, this.DEBIT_INDICATORS);
    const hasCredit = this.containsKeyword(text, this.CREDIT_INDICATORS);
    const hasReversed = this.containsKeyword(text, this.REVERSED_INDICATORS);
    const hasFailed = this.containsKeyword(text, this.FAILED_INDICATORS) && /\b(txn|transaction|payment|order|card)\b/i.test(text);
    const hasRechargeConfirm = this.containsKeyword(text, this.RECHARGE_CONFIRMATION);

    const hasTransactionEvidence = hasDebit || hasCredit || hasReversed || hasFailed || hasRechargeConfirm;

    // 2. Shopping Promotions
    const isShoppingBrand = this.containsKeyword(text, this.SHOPPING_BRANDS) || this.containsKeyword(senderLower, this.SHOPPING_BRANDS);
    if (isShoppingBrand && !hasTransactionEvidence) {
      return { isValid: false, reason: 'ADVERTISEMENT', confidence: 0 };
    }

    // 3. Telecom Promotional Detection
    const isTelecomSender = this.containsKeyword(senderLower, this.TELECOM_SENDERS) || this.containsKeyword(text, this.TELECOM_SENDERS);
    const hasTelecomPromo = this.containsKeyword(text, this.TELECOM_KEYWORDS);
    
    if (isTelecomSender && hasTelecomPromo) {
      if (!hasTransactionEvidence && !hasRechargeConfirm) {
        return { isValid: false, reason: 'TELECOM_OFFER', confidence: 0 };
      }
    }

    // 4. Reject Promotional Messages
    const hasPromo = this.containsKeyword(text, this.PROMOTIONAL_KEYWORDS);
    if (hasPromo && !hasTransactionEvidence) {
      return { isValid: false, reason: 'PROMOTIONAL_SMS', confidence: 0 };
    }

    // 5. Require Transaction Evidence
    if (amount !== null && !hasTransactionEvidence) {
      return { isValid: false, reason: 'NO_TRANSACTION_EVIDENCE', confidence: 0 };
    }

    if (!hasTransactionEvidence) {
      return { isValid: false, reason: 'PRICE_ONLY', confidence: 0 };
    }

    let confidence = 0.5;
    if (hasDebit || hasCredit) confidence += 0.4;
    if (hasFailed) confidence += 0.3;
    if (hasRechargeConfirm) confidence = 0.9;

    return { isValid: true, reason: '', confidence: Math.min(confidence, 1.0) };
  }

  static containsKeyword(text, keywords) {
    return keywords.some(kw => {
      if (kw === 'dr' || kw === 'cr' || kw === 'gb' || kw === 'mb') {
        return new RegExp(`\\b${kw}\\b`).test(text);
      }
      return text.includes(kw);
    });
  }
}

class StatusDetector {
  static determineStatus(smsText) {
    const textLower = smsText.toLowerCase();

    const isReversed = textLower.includes('reversed') || 
                       textLower.includes('refunded');
                       
    if (isReversed) {
        return 'REVERSED';
    }

    const failureKeywords = [
      'declined', 'decline', 'failed', 'failure', 'unsuccessful',
      'rejected', 'incorrect pin', 'wrong pin', 'insufficient funds',
      'could not be completed', 'unable to process', 'not authorized'
    ];

    const hasFailure = failureKeywords.some(kw => textLower.includes(kw));

    if (hasFailure) {
      const hasStrictSuccess = /\b(successful|successfully|completed|debited|credited)\b/i.test(textLower);
      const hasStrictFailure = /\b(declined|decline|failed|failure|unsuccessful|rejected|incorrect pin|wrong pin|insufficient funds|could not be completed|unable to process|not authorized)\b/i.test(textLower);

      if (hasStrictFailure) {
         if (hasStrictSuccess && !/\bunsuccessful\b/.test(textLower)) {
            return 'COMPLETED';
         }
         return 'FAILED';
      }
    }

    return 'COMPLETED';
  }
}

const testCases = [
  {
    id: 'A',
    description: 'ICICI cooling period limit SMS',
    sms: 'Per day cooling period limit for UPI transactions is Rs 5000 via WA for 72 hours after new user registration-ICICI Bank',
    sender: 'ICICI',
    expectedIsTransaction: false,
    expectedStatus: null
  },
  {
    id: 'B',
    description: 'Daily UPI transaction limit',
    sms: 'Your daily UPI transaction limit is ₹1,00,000',
    sender: 'HDFC',
    expectedIsTransaction: false,
    expectedStatus: null
  },
  {
    id: 'C',
    description: 'Successful UPI payment to Amazon',
    sms: 'UPI payment of ₹5000 to Amazon was successful',
    sender: 'HDFC',
    expectedIsTransaction: true,
    expectedStatus: 'COMPLETED'
  },
  {
    id: 'D',
    description: 'Explicit account debit',
    sms: '₹5000 has been debited from your account',
    sender: 'SBI',
    expectedIsTransaction: true,
    expectedStatus: 'COMPLETED'
  },
  {
    id: 'E',
    description: 'Declined transaction',
    sms: 'Transaction of ₹5000 was declined',
    sender: 'Axis',
    expectedIsTransaction: true,
    expectedStatus: 'FAILED'
  },
  {
    id: 'F',
    description: 'Account credit',
    sms: '₹5000 credited to your account',
    sender: 'ICICI',
    expectedIsTransaction: true,
    expectedStatus: 'COMPLETED'
  },
  {
    id: 'G',
    description: 'Increased UPI transaction limit',
    sms: 'Your UPI transaction limit has been increased to ₹5000',
    sender: 'Axis',
    expectedIsTransaction: false,
    expectedStatus: null
  },
  {
    id: 'H',
    description: 'Successful transfer to Ramesh',
    sms: '₹5000 transferred successfully to Ramesh',
    sender: 'Kotak',
    expectedIsTransaction: true,
    expectedStatus: 'COMPLETED'
  },
  {
    id: 'I',
    description: 'KYC notice with no transaction',
    sms: 'Dear Customer, complete your KYC to avoid restriction on your account with limit Rs 10000 - SBI',
    sender: 'SBI',
    expectedIsTransaction: false,
    expectedStatus: null
  },
  {
    id: 'J',
    description: 'Service charge policy alert',
    sms: 'Annual fee of Rs 500 applicable on credit card from next billing cycle',
    sender: 'HDFC',
    expectedIsTransaction: false,
    expectedStatus: null
  },
  {
    id: 'K',
    description: 'Reversed payment',
    sms: 'Transaction of ₹900 on card ending 1234 has been reversed',
    sender: 'Canara',
    expectedIsTransaction: true,
    expectedStatus: 'REVERSED'
  }
];

console.log('=== RUNNING INFORMATIONAL / TRANSACTION REGRESSION TESTS ===\n');

let allPassed = true;

for (const t of testCases) {
  const dummyPooled = new Float32Array(512);
  const cls = SMSClassifier.classify(dummyPooled, t.sms);
  const promo = PromotionTransactionValidator.validate(t.sms, 5000, t.sender);
  const status = StatusDetector.determineStatus(t.sms);

  const isTxn = cls.isTransaction && promo.isValid;

  let pass = isTxn === t.expectedIsTransaction;
  if (t.expectedIsTransaction && t.expectedStatus) {
    if (status !== t.expectedStatus) {
      pass = false;
    }
  }

  if (pass) {
    console.log(`✅ [PASS] Test ${t.id}: ${t.description}`);
    console.log(`   SMS: "${t.sms}"`);
    console.log(`   Predicted Class: ${cls.predictedClass} | IsTransaction: ${isTxn} | Status: ${status}\n`);
  } else {
    allPassed = false;
    console.error(`❌ [FAIL] Test ${t.id}: ${t.description}`);
    console.error(`   SMS: "${t.sms}"`);
    console.error(`   Expected isTxn: ${t.expectedIsTransaction} (Got: ${isTxn})`);
    if (t.expectedStatus) {
      console.error(`   Expected Status: ${t.expectedStatus} (Got: ${status})`);
    }
    console.error(`   Reasons: ${cls.reasons.join(', ')} | Promo Reason: ${promo.reason}\n`);
  }
}

if (allPassed) {
  console.log('🎉 ALL TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error('💥 SOME TESTS FAILED.');
  process.exit(1);
}
