import { PromotionTransactionValidator } from './src/ai/PromotionTransactionValidator';

const examples = [
  {
    desc: 'Example 1: Telecom Promo',
    sender: 'Jio',
    body: 'Alert 90% Get 3GB per day Recharge now Rs.39',
    amount: 39,
    expected: false
  },
  {
    desc: 'Example 2: Valid Recharge',
    sender: 'Jio',
    body: 'Recharge successful Amount Rs.39 Transaction ID XXXXX',
    amount: 39,
    expected: true
  },
  {
    desc: 'Example 3: Shopping Ad',
    sender: 'Amazon',
    body: 'Starting at ₹499 Shop now',
    amount: 499,
    expected: false
  },
  {
    desc: 'Example 4: Debit SMS',
    sender: 'HDFC',
    body: 'Your A/c XXXX debited by ₹499 Available Balance...',
    amount: 499,
    expected: true
  },
  {
    desc: 'Example 5: UPI Payment',
    sender: 'PhonePe',
    body: 'UPI Paid ₹320 to Swiggy UPI Ref XXXXX',
    amount: 320,
    expected: true
  }
];

console.log("=== Testing PromotionTransactionValidator ===");
let passed = 0;

examples.forEach(ex => {
  const result = PromotionTransactionValidator.validate(ex.body, ex.amount, ex.sender);
  const pass = result.isValid === ex.expected;
  if (pass) passed++;
  
  console.log(`\nTest: ${ex.desc}`);
  console.log(`Sender: ${ex.sender} | Body: ${ex.body}`);
  console.log(`Result: ${result.isValid ? 'ACCEPTED' : 'REJECTED'} (Expected: ${ex.expected ? 'ACCEPTED' : 'REJECTED'})`);
  console.log(`Reason: ${result.reason || 'None'}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Status: ${pass ? '✅ PASS' : '❌ FAIL'}`);
});

console.log(`\nTotal Passed: ${passed}/${examples.length}`);
