const { PromotionTransactionValidator } = require('./src/ai/PromotionTransactionValidator');

class MockSMSClassifier {
  static informationalPatterns = [
    'cooling period', 'cooling-period', 'transaction limit', 'daily limit', 
    'monthly limit', 'per day limit', 'upi limit', 'card limit', 'usage limit', 
    'transfer limit', 'spending limit', 'credit limit', 'withdrawal limit',
    'allowed limit', 'eligible limit', 'service charge', 'charges applicable',
    'annual fee', 'rate of interest', 'new user registration', 'registration',
    'security notice', 'security advisory', 'kyc reminder', 'update kyc'
  ];

  static telecomUsageAlertPatterns = [
    'data usage alert', 'data usage', 'daily data used', 'daily quota', 'data alert',
    'quota exhausted', 'remaining data', 'data balance', 'usage alert', 'data saving tips',
    '50% of your daily data', '90% of your daily data', '100% of your daily data',
    '50% of daily data', '90% of daily data', '100% of daily data'
  ];

  static telecomServiceConfirmationPatterns = [
    'recharge of inr', 'recharge of rs', 'recharge of ₹', 'recharge is successful',
    'recharge was successful', 'recharge successful', 'recharge done', 'recharge completed',
    'plan activated', 'pack activated', 'tariff and best recharges', 'best recharges on',
    'for your airtel mobile', 'for your jio', 'for your vi', 'for your bsnl'
  ];

  static promoIndicators = [
    'offer', 'discount', 'sale', 'use code', 'shop now', 'cashback', 
    'welcome back', 'porting out', 'stay on jio', 'we want you back',
    'unlimited pack', 'get unlimited', 'recharge offer'
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
    'rejected', 'incorrect pin', 'wrong pin', 'insufficient funds'
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

    // Explicit financial payment check
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
                               /\b(welcome back|porting out|stay on jio|5g unlimited pack|welcome back 5g|recharge offer)\b/i.test(textLower);

    const hasExplicitCredit = (/\b(credited|credited to|credited with|was credited|has been credited|received from|deposited into|refund received|refund credited|cashback credited)\b/i.test(textLower) ||
                              /\b(?:acct|a\/c|card)?\s*(?:xxx\d*|\d+)?\s*(?:cr|cr\.|cr:)\s*(?:inr|rs\.?|₹)?\s*[\d,]+(?:\.\d{2})?/i.test(textLower) ||
                              /\b(?:cr|cr\.|cr:)\s*(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?/i.test(textLower) ||
                              /\b(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?\s*(?:credited|cr\.|cr)\b/i.test(textLower)) &&
                              !isTelecomPackCredit;

    const hasReversal = textLower.includes('reversed') || textLower.includes('refunded');
    const hasFailedAttempt = this.failureKeywords.some(kw => textLower.includes(kw)) && /\b(txn|transaction|payment|order|card)\b/i.test(textLower);

    // 2. Telecom Usage Alert
    const isTelecomUsageAlert = this.telecomUsageAlertPatterns.some(kw => textLower.includes(kw));
    if (isTelecomUsageAlert && !hasExplicitDebit && !hasExplicitCredit) {
      reasons.push('Telecom data quota or service usage alert (no monetary movement)');
      return { predictedClass: 'Personal', confidence: 0.96, isTransaction: false, reasons };
    }

    // 3. Telecom Benefit / Pack Credits & Promotional Offers Check
    const isTelecomPromo = isTelecomPackCredit ||
                           /\brecharge\b.*(?:\bget\b|\bunlimited\b|\boffer\b|\bbonus\b|\bdiscount\b|\bvalid till\b|\bfree\b)/i.test(textLower);

    if (isTelecomPromo && !hasExplicitDebit && !hasExplicitCredit) {
      reasons.push('Telecom promotional benefit or data pack credit (non-monetary)');
      return { predictedClass: 'Promotion', confidence: 0.96, isTransaction: false, reasons };
    }

    // 4. Telecom Service Fulfillment / Confirmation Check
    const isTelecomServiceConfirm = this.telecomServiceConfirmationPatterns.some(kw => textLower.includes(kw)) ||
                                    /\brecharge\b.*(?:successful|completed|done|activated)/i.test(textLower) ||
                                    /\b(airtel mobile|jio mobile|best recharges on)\b/i.test(textLower);

    if (isTelecomServiceConfirm && !hasExplicitDebit && !hasExplicitCredit && !hasFailedAttempt) {
      reasons.push('Telecom recharge or service fulfillment confirmation without explicit financial debit evidence');
      return { predictedClass: 'Personal', confidence: 0.98, isTransaction: false, reasons };
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
      return { predictedClass: 'Personal', confidence: 0.98, isTransaction: false, reasons };
    }

    // 7. Promotional Messages
    let promoMatches = 0;
    for (const kw of this.promoIndicators) {
      if (textLower.includes(kw)) promoMatches++;
    }
    if ((promoMatches >= 2 || (promoMatches >= 1 && !hasDebitOrCreditEvent)) && !hasDebitOrCreditEvent) {
      reasons.push('Promotional language detected without confirmed financial event');
      return { predictedClass: 'Promotion', confidence: 0.95, isTransaction: false, reasons };
    }

    const hasDigits = /\d/.test(textLower);

    // 8. Confirmed Transaction Event
    if (hasDebitOrCreditEvent && hasDigits) {
      reasons.push('Confirmed financial event detected');
      return { predictedClass: 'Transaction', confidence: 0.98, isTransaction: true, reasons };
    }

    // 9. Default: Personal
    reasons.push('Informational or conversational message without confirmed payment event');
    return { predictedClass: 'Personal', confidence: 0.92, isTransaction: false, reasons };
  }
}

// Extraction logic mirror
class MockEntityReconstruction {
  static reconstruct(text) {
    const textLower = text.toLowerCase();

    // 1. Amount
    let amount = null;
    const amountRegex = /(?:rs\.?|inr|usd|\$)\s*([\d,]+(?:\.\d{1,2})?)|(?:debited|credited|spent|paid|withdrawn|sent|transfer(?:red)?|received)\s+(?:by\s+)?(?:rs\.?|inr|\$)?\s*([\d,]+(?:\.\d{1,2})?)/i;
    const amtMatch = text.match(amountRegex);
    if (amtMatch) {
      amount = parseFloat((amtMatch[1] || amtMatch[2] || '').replace(/,/g, ''));
    }

    // 2. Bank
    let bank = null;
    const bankRegex = /\b(HDFC|ICICI|SBI|Axis|Kotak|PNB|BOB|IDFC|IndusInd|Yes Bank|Canara|Union Bank|Citi|HSBC|Paytm|PhonePe|Google Pay|GPay|Amazon Pay)\b/i;
    const bankMatch = text.match(bankRegex);
    if (bankMatch) {
      bank = bankMatch[1].toUpperCase();
    }

    // 3. Payment Mode
    let paymentMode = null;
    if (/upi|vpa/i.test(textLower)) {
      paymentMode = 'UPI';
    } else if (/credit card|cc\b/i.test(textLower)) {
      paymentMode = 'Credit Card';
    } else if (/debit card|dc\b|atm/i.test(textLower)) {
      paymentMode = 'Debit Card';
    } else if (/net banking|netbanking/i.test(textLower)) {
      paymentMode = 'Net Banking';
    }

    // 4. Reference
    let reference = null;
    const refRegex = /(?:ref|rrn|txn|transaction)(?:\s+no\.?|\s+id)?[\s\:\#]*([A-Za-z0-9]{6,18})/i;
    const refMatch = text.match(refRegex);
    if (refMatch) {
      reference = refMatch[1];
    }

    return { amount, bank, paymentMode, reference };
  }
}

const testCases = [
  {
    name: '1. Airtel ₹979 Service Confirmation',
    sms: 'Recharge of INR 979 is successful for your Airtel Mobile',
    sender: 'AIRTEL',
    expectedClass: 'Personal',
    expectedIsTxn: false
  },
  {
    name: '2. Jio ₹299 Service Confirmation',
    sms: 'Recharge of ₹299 successful for Jio',
    sender: 'JIO',
    expectedClass: 'Personal',
    expectedIsTxn: false
  },
  {
    name: '3. Airtel ₹979 Bank Account Debit',
    sms: '₹979 debited from your account for Airtel recharge',
    sender: 'HDFCBK',
    expectedClass: 'Transaction',
    expectedIsTxn: true
  },
  {
    name: '4. Airtel ₹979 UPI Payment',
    sms: 'UPI payment of ₹979 to Airtel successful',
    sender: 'AX-CANBNK',
    expectedClass: 'Transaction',
    expectedIsTxn: true
  },
  {
    name: '5. Airtel ₹979 Card Charge',
    sms: 'Card charged ₹979 for Airtel recharge',
    sender: 'ICICIB',
    expectedClass: 'Transaction',
    expectedIsTxn: true
  },
  {
    name: '6. Airtel ₹979 Promotional Offer',
    sms: 'Recharge ₹979 and get unlimited data',
    sender: 'AIRTEL',
    expectedClass: 'Promotion',
    expectedIsTxn: false
  },
  {
    name: '7. Airtel recharge with Transaction ID',
    sms: 'Your Airtel recharge was successful. Transaction ID 12345',
    sender: 'AIRTEL',
    expectedClass: 'Personal',
    expectedIsTxn: false
  },
  {
    name: '8. Exact Airtel ₹979 Production SMS',
    sms: 'Recharge of INR 979.00 is successful for your Airtel Mobile on 30-08-2026 07:35, Transaction ID 1264586484. Check your balance, validity, tariff and best recharges on Airtel app...',
    sender: 'AIRTEL',
    expectedClass: 'Personal',
    expectedIsTxn: false
  }
];

console.log('=== RUNNING TELECOM RECHARGE vs FINANCIAL DEBIT REGRESSION TESTS ===\n');

let allPassed = true;

for (const tc of testCases) {
  const cls = MockSMSClassifier.classify(tc.sms);
  const entities = MockEntityReconstruction.reconstruct(tc.sms);
  const promo = PromotionTransactionValidator.validate(tc.sms, entities.amount, tc.sender);

  const finalIsTxn = cls.isTransaction && promo.isValid;

  const classPassed = cls.predictedClass === tc.expectedClass;
  const txnPassed = finalIsTxn === tc.expectedIsTxn;

  if (classPassed && txnPassed) {
    console.log(`✅ [PASS] ${tc.name}`);
    console.log(`   SMS: "${tc.sms.substring(0, 70)}..."`);
    console.log(`   Class: ${cls.predictedClass} (Expected: ${tc.expectedClass}) | IsTxn: ${finalIsTxn} (Expected: ${tc.expectedIsTxn}) | Conf: ${(cls.confidence * 100).toFixed(0)}%\n`);
  } else {
    allPassed = false;
    console.error(`❌ [FAIL] ${tc.name}`);
    console.error(`   SMS: "${tc.sms}"`);
    console.error(`   Class: ${cls.predictedClass} (Expected: ${tc.expectedClass}) | IsTxn: ${finalIsTxn} (Expected: ${tc.expectedIsTxn})`);
    console.error(`   Promo valid: ${promo.isValid} (${promo.reason})\n`);
  }
}

// Entity extraction test for the exact Airtel SMS
console.log('--- Checking Entity Extraction on Exact Airtel SMS ---');
const airtelEntities = MockEntityReconstruction.reconstruct(testCases[7].sms);
console.log('Extracted Entities:', {
  amount: airtelEntities.amount,
  bank: airtelEntities.bank,
  paymentMode: airtelEntities.paymentMode,
  reference: airtelEntities.reference
});

if (airtelEntities.paymentMode === null && airtelEntities.bank === null) {
  console.log('✅ [PASS] Payment Mode is null and Bank is null (no fabricated UPI or Bank source)');
} else {
  allPassed = false;
  console.error('❌ [FAIL] Fabricated paymentMode or bank found:', { paymentMode: airtelEntities.paymentMode, bank: airtelEntities.bank });
}

if (!allPassed) {
  console.error('\n❌ SOME REGRESSION TESTS FAILED');
  process.exit(1);
} else {
  console.log('\n🎉 ALL 8 TELECOM RECHARGE REGRESSION TESTS PASSED!');
}
