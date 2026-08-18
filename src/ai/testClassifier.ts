import { SMSClassifier } from './SMSClassifier';

const testMessages = [
  { name: 'Clear debit', text: 'Rs.500 has been debited from your account ending 1234.', expected: 'Transaction' },
  { name: 'Clear credit', text: 'Rs.5000 has been credited to your account.', expected: 'Transaction' },
  { name: 'UPI payment', text: 'UPI transaction of Rs.750 to ABC was successful.', expected: 'Transaction' },
  { name: 'Advertisement', text: 'Recharge now for Rs.399 and get 10% cashback.', expected: 'Promotion' },
  { name: 'Non-transaction', text: 'Your appointment is confirmed for tomorrow.', expected: 'Personal' },
  { name: 'Spam', text: 'Winner! claim your lottery prize by clicking http://scam.link', expected: 'Scam' },
  { name: 'Jio Amazon Offer', text: 'Don\'t miss! Recharge now your Jio no. 9342616608 with Rs. 3599 on Amazon app & get 2% back by paying via Amazon Pay ICICI Credit Card. Enjoy Jio benefits-Google Gemini AI + 5TB storage, JioGames Mobile, JioHotstar+ Hollywood, Unlimited 5G + 2.5GB/day + Unlimited Calls for 365 days. T&C A. https://amazon.in/jiomay5', expected: 'Promotion' },
  { name: 'Genuine with Promo word', text: 'Rs. 500 debited from your account. T&C apply.', expected: 'Transaction' }
];

const dummyPooled = new Float32Array(512);
console.log('--- ISOLATED CLASSIFIER TEST ---');
for (const test of testMessages) {
  const result = SMSClassifier.classify(dummyPooled, test.text);
  const status = result.predictedClass === test.expected ? 'PASS' : 'FAIL';
  console.log(`\nTest: ${test.name}`);
  console.log(`SMS: ${test.text}`);
  console.log(`Expected: ${test.expected} | Actual: ${result.predictedClass} ${status}`);
  if (result.reasons && result.reasons.length > 0) console.log(`Reasons: ${result.reasons.join(', ')}`);
}
