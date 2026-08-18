import { StatusDetector } from './src/ai/StatusDetector';

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
