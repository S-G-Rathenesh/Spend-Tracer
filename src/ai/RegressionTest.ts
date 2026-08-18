import { SpendTracerAI } from './SpendTracerAI';

const TEST_CASES = [
  // Debit tests
  { sms: "Dear Customer, Acct XXX166 Dr. INR 2,000.00 on 29/07/26 to SANJAYKUMAR; UPI:621020017591; Bal INR 22,832.67. CanaraBank", 
    expected: { type: 'Debit', merchant: 'SANJAYKUMAR', date: '2026-07-29', amount: 2000 } },
  { sms: "Rs.500.00 debited from a/c **1234 on 05-08-2026 to Zomato UPI. Bal: Rs.1500. SBI", 
    expected: { type: 'Debit', merchant: 'Zomato', date: '2026-08-05', amount: 500 } },
  { sms: "Paid Rs 1,200.50 at SWIGGY BANGALORE using HDFC card ending 9999 on 15 Aug 2026.", 
    expected: { type: 'Debit', merchant: 'SWIGGY BANGALORE', date: '2026-08-15', amount: 1200.5 } },
  
  // Credit tests
  { sms: "Cr. INR 5,000.00 to your A/c XX5678 on 01.09.2026. Info: Salary. Bal INR 55,000. ICICI", 
    expected: { type: 'Credit', merchant: 'Unknown Merchant', date: '2026-09-01', amount: 5000 } }, // Info: Salary might not extract a merchant cleanly without 'from'
  { sms: "Rs 500 received from Sanjay on 12-Sep-2026. Bal: 1000", 
    expected: { type: 'Credit', merchant: 'Sanjay', date: '2026-09-12', amount: 500 } },

  // Date Parsing Edge Cases
  { sms: "Spent $50 on Netflix subscription on 2026-10-01.", 
    expected: { type: 'Debit', merchant: 'Netflix', date: '2026-10-01', amount: 50 } },
  { sms: "Payment of Rs.100 towards Flipkart order successful on 31/12/26.", 
    expected: { type: 'Debit', merchant: 'Flipkart', date: '2026-12-31', amount: 100 } }
];

async function runRegression() {
  console.log('--- Running Spend Tracer Regression Tests ---');
  const ai = SpendTracerAI.getInstance();
  await ai.initialize();

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const t = TEST_CASES[i];
    const res = await ai.processSMS(t.sms);
    
    let match = true;
    let errs: string[] = [];

    if (res.transactionType !== t.expected.type) { match = false; errs.push(`Type: expected ${t.expected.type}, got ${res.transactionType}`); }
    if (res.date !== t.expected.date) { match = false; errs.push(`Date: expected ${t.expected.date}, got ${res.date}`); }
    if (res.amount !== t.expected.amount) { match = false; errs.push(`Amount: expected ${t.expected.amount}, got ${res.amount}`); }
    
    // Merchant logic is fuzzy, allow partial match for testing
    if (t.expected.merchant !== 'Unknown Merchant' && !res.merchant?.toLowerCase().includes(t.expected.merchant.toLowerCase()) && res.merchant !== t.expected.merchant) {
      match = false; errs.push(`Merchant: expected ${t.expected.merchant}, got ${res.merchant}`);
    }

    if (match) {
      passed++;
      console.log(`[PASS] Test ${i+1}`);
    } else {
      failed++;
      console.log(`[FAIL] Test ${i+1}: ${errs.join(', ')} | SMS: ${t.sms.substring(0, 30)}...`);
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runRegression().catch(console.error);
