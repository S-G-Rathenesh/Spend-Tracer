class StatusDetector {
  static determineStatus(smsText) {
    const textLower = smsText.toLowerCase();

    const isReversed = textLower.includes('reversed') || 
                       textLower.includes('refunded');
                       
    if (isReversed) {
        return 'REVERSED';
    }

    const hasSuccessful = textLower.includes('successful') || 
                          textLower.includes('completed') || 
                          textLower.includes('debited') || 
                          textLower.includes('credited');

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

const tests = [
  { text: 'Txn of INR 800.00 attempted on your debit card is declined due to Incorrect PIN', expected: 'FAILED' },
  { text: '₹500 attempted and successfully debited from your account', expected: 'COMPLETED' },
  { text: '₹300 transaction failed', expected: 'FAILED' },
  { text: 'Your ₹200 payment was rejected', expected: 'FAILED' },
  { text: '₹1000 debited successfully', expected: 'COMPLETED' },
  { text: '₹750 attempted but transaction was successful', expected: 'COMPLETED' },
  { text: '₹900 transaction reversed', expected: 'REVERSED' },
  { text: 'transaction unsuccessful', expected: 'FAILED' }
];

let allPassed = true;

for (const t of tests) {
  const result = StatusDetector.determineStatus(t.text);
  if (result !== t.expected) {
    console.error(`❌ Test failed for: "${t.text}" | Expected: ${t.expected}, Got: ${result}`);
    allPassed = false;
  } else {
    console.log(`✅ Test passed: "${t.text}"`);
  }
}

if (allPassed) {
  console.log('All tests passed!');
  process.exit(0);
} else {
  process.exit(1);
}
