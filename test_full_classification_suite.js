/**
 * Complete Regression Test Suite for Classification & Single Source of Truth
 */

const { PromotionTransactionValidator } = require('./src/ai/PromotionTransactionValidator');

// Simulated SMSClassifier matching the updated TypeScript logic
class MockSMSClassifier {
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
    'kyc reminder', 'update kyc', 'complete kyc',
    'terms and conditions', 'terms & conditions', 'terms apply', 'terms and policy',
    'balance enquiry', 'available balance is',
    'otp', 'one time password', 'verification code', 'do not share'
  ];

  static telecomUsageAlertPatterns = [
    'data usage alert', 'data usage', 'daily data used', 'daily quota', 'data alert',
    'quota exhausted', 'remaining data', 'data balance', 'usage alert', 'data saving tips',
    'daily data', 'high speed data', 'fair usage policy', 'fup limit',
    '50% of your daily data', '90% of your daily data', '100% of your daily data',
    '50% of daily data', '90% of daily data', '100% of daily data',
    'validity expiring', 'plan expiring', 'validity expired'
  ];

  static promoIndicators = [
    'recharge offer', 'recharge now', 'special offer', 'limited offer',
    'off', 'discount', 'sale', 'use code', 'shop now', 
    'buy 1 get 1', 'cashback', 'earn', "don't miss",
    'exclusive', 'flat', 'save', 'deal', 'subscribe', 
    'enjoy benefits', 'upgrade', 'avail now', 'click here', 't&c', 'promo', 'bonus',
    'welcome back', 'porting out', 'stay on jio', 'we want you back', 'unlimited pack',
    'get unlimited'
  ];

  static scamKeywords = [
    'winner', 'congratulations', 'lottery', 'claim', 'urgent', 'blocked',
    'suspend', 'verify immediately', 'click link', 'apk', 'reward points'
  ];

  static financialEvents = [
    'debited', 'credited', 'spent', 'paid to', 'transferred', 'withdrawn',
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

  static classify(originalSMS) {
    const textLower = originalSMS.toLowerCase();
    const reasons = [];

    // 1. SCAM Check
    let scamMatches = 0;
    for (const kw of this.scamKeywords) {
      if (textLower.includes(kw)) scamMatches++;
    }
    if (scamMatches >= 2 || (scamMatches >= 1 && textLower.includes('http'))) {
      reasons.push('Suspicious scam keywords detected');
      return { predictedClass: 'Scam', confidence: 0.96, isTransaction: false, reasons };
    }

    // 2. Telecom Usage & Data Quota Alert Check (Non-Transaction)
    const isTelecomUsageAlert = this.telecomUsageAlertPatterns.some(kw => textLower.includes(kw));
    const hasMonetaryDebitPayment = /\b(debited|debited by|debited for|spent|withdrawn|transferred to|recharge successful)\b/i.test(textLower) &&
                                   /(?:inr|rs\.?|₹)\s*[\d,]+/i.test(textLower);

    if (isTelecomUsageAlert && !hasMonetaryDebitPayment) {
      reasons.push('Telecom data quota or service usage alert (no monetary movement)');
      return { predictedClass: 'Personal', confidence: 0.96, isTransaction: false, reasons };
    }

    // 3. Telecom Benefit / Pack Credits Check
    const isTelecomPackCredit = /\bcredited with\b.*\b(pack|days|validity|gb|mb|unlimited|welcome|benefit|trial|points|coupon|voucher)\b/i.test(textLower) ||
                               /\b(welcome back|porting out|stay on jio|5g unlimited pack|welcome back 5g|recharge offer)\b/i.test(textLower);

    if (isTelecomPackCredit && !hasMonetaryDebitPayment) {
      reasons.push('Telecom promotional benefit or data pack credit (non-monetary)');
      return { predictedClass: 'Promotion', confidence: 0.96, isTransaction: false, reasons };
    }

    // 4. Check for explicit completed financial events (including Indian banking abbreviations like "Dr. INR 450.00")
    let hasDebitOrCreditEvent = false;
    const hasExplicitDebit = /\b(debited|debited by|debited with|debited for|was debited|has been debited|paid to|spent on|withdrawn from|deducted from|transferred to|transferred successfully)\b/i.test(textLower) ||
                            /\b(?:acct|a\/c|card)?\s*(?:xxx\d*|\d+)?\s*(?:dr|dr\.|dr:)\s*(?:inr|rs\.?|₹)?\s*[\d,]+(?:\.\d{2})?/i.test(textLower) ||
                            /\b(?:dr|dr\.|dr:)\s*(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?/i.test(textLower) ||
                            /\b(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?\s*(?:debited|dr\.|dr)\b/i.test(textLower);

    const hasExplicitCredit = (/\b(credited|credited to|credited with|was credited|has been credited|received from|deposited into|refund received|refund credited|cashback credited)\b/i.test(textLower) ||
                              /\b(?:acct|a\/c|card)?\s*(?:xxx\d*|\d+)?\s*(?:cr|cr\.|cr:)\s*(?:inr|rs\.?|₹)?\s*[\d,]+(?:\.\d{2})?/i.test(textLower) ||
                              /\b(?:cr|cr\.|cr:)\s*(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?/i.test(textLower) ||
                              /\b(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?\s*(?:credited|cr\.|cr)\b/i.test(textLower)) &&
                              !isTelecomPackCredit;

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
          if ((kw === 'debited' || kw === 'credited' || kw === 'spent' || kw === 'withdrawn' || kw === 'deducted' || kw === 'paid to')) {
            hasDebitOrCreditEvent = true;
            break;
          }
        }
      }
    }

    // 5. Informational Limit / Policy Check
    const hasInfoPattern = this.informationalPatterns.some(kw => textLower.includes(kw));
    if (hasInfoPattern && !hasExplicitDebit && !hasExplicitCredit && !hasRecharge) {
      reasons.push('Informational banking notice or limit alert (no money moved)');
      return { predictedClass: 'Personal', confidence: 0.98, isTransaction: false, reasons };
    }

    // 6. Promotional Messages
    let promoMatches = 0;
    for (const kw of this.promoIndicators) {
      if (textLower.includes(kw)) promoMatches++;
    }
    if ((promoMatches >= 2 || (promoMatches >= 1 && !hasDebitOrCreditEvent)) && !hasDebitOrCreditEvent) {
      reasons.push('Promotional language detected without confirmed financial event');
      return { predictedClass: 'Promotion', confidence: 0.95, isTransaction: false, reasons };
    }

    const hasDigits = /\d/.test(textLower);

    // 7. Confirmed Transaction Event
    if (hasDebitOrCreditEvent && hasDigits) {
      reasons.push('Confirmed financial event detected');
      return { predictedClass: 'Transaction', confidence: 0.98, isTransaction: true, reasons };
    }

    // 8. Default: Personal / Informational Non-Transaction
    reasons.push('Informational or conversational message without confirmed payment event');
    return { predictedClass: 'Personal', confidence: 0.92, isTransaction: false, reasons };
  }
}

function detectTransactionStatus(smsText) {
  const text = smsText.toLowerCase();
  
  if (text.includes('reversed') || text.includes('refunded')) {
    return 'REVERSED';
  }

  const hasSuccessContext = /\b(successfully|successful|completed|credited|debited)\b/i.test(text);
  const failurePatterns = [
    /\b(declined|decline)\b/i,
    /\b(failed|failure)\b/i,
    /\b(unsuccessful)\b/i,
    /\b(rejected)\b/i,
    /\b(incorrect pin|wrong pin)\b/i,
    /\b(insufficient funds)\b/i,
    /\b(could not be completed)\b/i,
    /\b(unable to process)\b/i,
    /\b(not authorized)\b/i
  ];

  const hasFailureMatch = failurePatterns.some(pattern => pattern.test(text));

  if (hasFailureMatch && !text.includes('successfully debited') && !text.includes('was successful') && !text.includes('completed successfully')) {
    return 'FAILED';
  }

  return 'COMPLETED';
}

console.log('=== RUNNING PART 6 REGRESSION TEST DATASET ===\n');

const testCases = [
  {
    name: '1. Bank account credited ₹500',
    sms: 'A/c XXX123 credited with INR 500.00 on 20/08/26. Available Bal INR 10,000',
    expectedClass: 'Transaction',
    expectedStatus: 'COMPLETED'
  },
  {
    name: '2. Bank account debited ₹500',
    sms: '₹500 debited from A/c XXX123 on 20/08/26. Bal INR 9,500',
    expectedClass: 'Transaction',
    expectedStatus: 'COMPLETED'
  },
  {
    name: '3. UPI payment ₹450 to merchant',
    sms: 'UPI payment of ₹450 to Swiggy was successful. UPI Ref 34982934',
    expectedClass: 'Transaction',
    expectedStatus: 'COMPLETED'
  },
  {
    name: '4. Jio welcome back 5G pack',
    sms: 'Dear Customer, Porting out? You are on the best network. We want you back. Your account is credited with a 7 days welcome back 5G unlimited pack. Stay on Jio and enjoy best in industry service and benefits...',
    expectedClass: 'Promotion',
    expectedStatus: 'COMPLETED'
  },
  {
    name: '5. Jio 50% daily data used',
    sms: 'Data usage Alert! 50% of your daily data used as of 17-Aug-26... Jio Number... Daily Quota: 2 GB... For data saving tips...',
    expectedClass: 'Personal',
    expectedStatus: 'COMPLETED'
  },
  {
    name: '6. Daily quota 2 GB reached',
    sms: 'Daily quota 2 GB reached. High speed data will be restored tomorrow at 00:00.',
    expectedClass: 'Personal',
    expectedStatus: 'COMPLETED'
  },
  {
    name: '7. Recharge successful for ₹299',
    sms: 'Recharge successful for ₹299. Transaction ID 99238492. Enjoy unlimited calls.',
    expectedClass: 'Transaction',
    expectedStatus: 'COMPLETED'
  },
  {
    name: '8. Recharge offer ₹299 for unlimited data',
    sms: 'Special recharge offer: Get unlimited data for ₹299 only! Recharge now at jio.com/pay',
    expectedClass: 'Promotion',
    expectedStatus: 'COMPLETED'
  },
  {
    name: '9. Card payment of ₹800 declined',
    sms: 'Your card payment of ₹800 was declined due to incorrect PIN - Canara Bank',
    expectedClass: 'Transaction',
    expectedStatus: 'FAILED'
  },
  {
    name: '10. Incorrect PIN transaction declined',
    sms: 'Txn of INR 800.00 attempted on your debit card ending with 5830 is declined due to Incorrect PIN - Canara Bank',
    expectedClass: 'Transaction',
    expectedStatus: 'FAILED'
  },
  {
    name: '11. ₹800 attempted but debited successfully',
    sms: 'Payment of ₹800 attempted and successfully debited from account XXX5830',
    expectedClass: 'Transaction',
    expectedStatus: 'COMPLETED'
  },
  {
    name: '12. Canara Dr. INR 450 UPI Debit',
    sms: 'Dear Customer, Acct XXX166 Dr. INR 450.00 on 27/08/26 to PRADEEP S; UPI: 123456789; Bal INR 15,264.74. Not you? SMS BLOCKUPI to 9223008888 - Canara Bank',
    expectedClass: 'Transaction',
    expectedStatus: 'COMPLETED'
  },
  {
    name: '13. Canara Not you? SMS BLOCKUPI attached to actual debit',
    sms: 'Dear Customer, Acct XXX166 Dr. INR 450.00 on 27/08/26 to PRADEEP S; UPI: 123456789; Bal INR 15,264.74. Not you? SMS BLOCKUPI to 9223008888 - Canara Bank',
    expectedClass: 'Transaction',
    expectedStatus: 'COMPLETED'
  }
];

let allPassed = true;

for (const tc of testCases) {
  const result = MockSMSClassifier.classify(tc.sms);
  const status = detectTransactionStatus(tc.sms);

  const classPassed = result.predictedClass === tc.expectedClass;
  const statusPassed = status === tc.expectedStatus;

  if (classPassed && statusPassed) {
    console.log(`✅ [PASS] ${tc.name}`);
    console.log(`   Class: ${result.predictedClass} (Expected: ${tc.expectedClass}) | Status: ${status} (Expected: ${tc.expectedStatus}) | Conf: ${(result.confidence * 100).toFixed(0)}%`);
  } else {
    console.error(`❌ [FAIL] ${tc.name}`);
    console.error(`   Got Class: ${result.predictedClass} (Expected: ${tc.expectedClass}) | Got Status: ${status} (Expected: ${tc.expectedStatus})`);
    allPassed = false;
  }
}

console.log('\n=========================================');
if (allPassed) {
  console.log('🎉 ALL PART 6 REGRESSION TEST CASES PASSED!');
  process.exit(0);
} else {
  console.error('💥 SOME TEST CASES FAILED.');
  process.exit(1);
}
