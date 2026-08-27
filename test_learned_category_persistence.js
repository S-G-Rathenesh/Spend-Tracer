/**
 * Comprehensive Test Suite for Learned Category Persistence across Delete + Rebuild
 */

class MockMerchantCategoryRepository {
  static mappings = new Map(); // normalized_name -> { category, merchant_name, sms_hash }
  static hashMappings = new Map(); // sms_hash -> category

  static normalizeMerchantName(name) {
    if (!name) return '';
    let clean = name
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return '';

    const suffixRegex = /\b(pvt ltd|private limited|ltd|limited|technologies|technology|services|service|india|in|com|retail|online|pay|upi|store|outlet|bangalore|mumbai|delhi|hyderabad|chennai)\b/g;
    const stripped = clean.replace(suffixRegex, '').replace(/\s+/g, ' ').trim();

    if (stripped.length >= 2) {
      return stripped;
    }

    return clean;
  }

  static async getCategoryForMerchant(merchantName) {
    if (!merchantName || merchantName === 'Unknown Merchant') return null;
    const normalized = this.normalizeMerchantName(merchantName);
    if (!normalized) return null;

    if (this.mappings.has(normalized)) {
      return this.mappings.get(normalized).category;
    }
    return null;
  }

  static async getLearnedCategory(merchantName, smsText, smsHash) {
    // 1. Direct match by merchant
    if (merchantName && merchantName !== 'Unknown Merchant') {
      const cat = await this.getCategoryForMerchant(merchantName);
      if (cat) return { category: cat, matchedMerchant: merchantName };
    }

    // 2. Match by SMS Hash
    if (smsHash && this.hashMappings.has(smsHash)) {
      return { category: this.hashMappings.get(smsHash), matchedMerchant: merchantName || undefined };
    }

    // 3. Match whole-word learned merchant in SMS body
    if (smsText) {
      const textLower = smsText.toLowerCase();
      for (const [norm, data] of this.mappings.entries()) {
        if (norm && norm.length >= 2 && norm !== 'unknown') {
          const regex = new RegExp(`\\b${norm}\\b`, 'i');
          if (regex.test(textLower)) {
            return { category: data.category, matchedMerchant: data.merchant_name };
          }
        }
      }
    }

    return null;
  }

  static async learnCorrection(merchantName, category, originalSms, smsHash, sender) {
    if (!category) return;
    const finalMerchant = (merchantName && merchantName !== 'Unknown Merchant') ? merchantName.trim() : '';
    const normalized = this.normalizeMerchantName(finalMerchant);

    if (normalized) {
      this.mappings.set(normalized, {
        merchant_name: finalMerchant || normalized,
        normalized_name: normalized,
        category,
        sms_hash: smsHash
      });
    }
    if (smsHash) {
      this.hashMappings.set(smsHash, category);
    }
  }

  static clear() {
    this.mappings.clear();
    this.hashMappings.clear();
  }
}

class MockSpendTracerPipeline {
  static async classifySMS(smsText, extractedMerchant, smsHash) {
    // Step 1: Check learned category first (Priority #1 for category)
    const learned = await MockMerchantCategoryRepository.getLearnedCategory(extractedMerchant, smsText, smsHash);
    
    if (learned) {
      return {
        category: learned.category,
        confidence: 1.0,
        needsVerification: false,
        isLearned: true,
        merchant: learned.matchedMerchant || extractedMerchant || 'Unknown Merchant'
      };
    }

    // Step 2: Fallback to heuristic / AI classification
    const textLower = smsText.toLowerCase();
    if (textLower.includes('swiggy') || textLower.includes('zomato')) {
      return { category: 'Food', confidence: 0.95, needsVerification: false, isLearned: false, merchant: extractedMerchant };
    }
    if (textLower.includes('amazon') || textLower.includes('flipkart')) {
      return { category: 'Shopping', confidence: 0.95, needsVerification: false, isLearned: false, merchant: extractedMerchant };
    }
    if (textLower.includes('uber') || textLower.includes('ola')) {
      return { category: 'Travel', confidence: 0.95, needsVerification: false, isLearned: false, merchant: extractedMerchant };
    }

    // Default Unknown
    return {
      category: 'Unknown',
      confidence: 0.32,
      needsVerification: true,
      isLearned: false,
      merchant: extractedMerchant || 'Unknown Merchant'
    };
  }
}

// In-memory Transactions table to simulate DB
let mockTransactionsTable = [];

async function runTests() {
  console.log('=== RUNNING AI LEARNING PERSISTENCE REGRESSION TESTS ===\n');
  MockMerchantCategoryRepository.clear();
  mockTransactionsTable = [];

  let allPassed = true;

  // -------------------------------------------------------------
  // Test 1: Exact Same SMS Delete + Rebuild Test
  // -------------------------------------------------------------
  console.log('--- Test 1: Delete + Rebuild Exact Same SMS ---');
  const sms1 = 'Paid ₹250 to XYZ Store via UPI';
  const smsHash1 = 'hash_xyz_250';

  // Initial process: AI predicts Unknown
  let res1 = await MockSpendTracerPipeline.classifySMS(sms1, 'XYZ Store', smsHash1);
  console.log(`Initial Processing: Category = ${res1.category}, Confidence = ${res1.confidence}, needsVerification = ${res1.needsVerification}`);
  if (res1.category !== 'Unknown' || res1.needsVerification !== true) {
    console.error('❌ Expected initial classification to be Unknown & require verification');
    allPassed = false;
  }

  // Insert initial unverified transaction
  let txn1 = { id: 'txn_1', amount: 250, merchant: res1.merchant, category: res1.category, needsVerification: res1.needsVerification, sms: sms1, smsHash: smsHash1 };
  mockTransactionsTable.push(txn1);

  // User verifies and selects 'Food'
  console.log('User corrects category to "Food" and saves...');
  txn1.category = 'Food';
  txn1.needsVerification = false;
  await MockMerchantCategoryRepository.learnCorrection(txn1.merchant, 'Food', txn1.sms, txn1.smsHash);

  // User deletes transaction
  console.log('User deletes the transaction from DB...');
  mockTransactionsTable = mockTransactionsTable.filter(t => t.id !== txn1.id);
  console.log(`Transactions in DB after delete: ${mockTransactionsTable.length}`);

  // User performs SMS Rebuild
  console.log('User performs SMS Rebuild...');
  let rebuildRes1 = await MockSpendTracerPipeline.classifySMS(sms1, 'XYZ Store', smsHash1);
  let rebuiltTxn1 = { id: 'txn_rebuilt_1', amount: 250, merchant: rebuildRes1.merchant, category: rebuildRes1.category, needsVerification: rebuildRes1.needsVerification };
  mockTransactionsTable.push(rebuiltTxn1);

  console.log(`Rebuilt Transaction: Category = ${rebuiltTxn1.category}, needsVerification = ${rebuiltTxn1.needsVerification}`);

  if (rebuiltTxn1.category === 'Food' && rebuiltTxn1.needsVerification === false && rebuildRes1.confidence === 1.0) {
    console.log('✅ [PASS] Test 1: Category "Food" and needsVerification=false survived Delete + Rebuild!');
  } else {
    console.error('❌ [FAIL] Test 1: Failed to restore learned category on rebuild!');
    allPassed = false;
  }

  // Delete again and rebuild second time
  mockTransactionsTable = mockTransactionsTable.filter(t => t.id !== rebuiltTxn1.id);
  let rebuildRes2 = await MockSpendTracerPipeline.classifySMS(sms1, 'XYZ Store', smsHash1);
  if (rebuildRes2.category === 'Food' && rebuildRes2.needsVerification === false) {
    console.log('✅ [PASS] Test 1b: Second Delete + Rebuild cycle also retained "Food"!');
  } else {
    console.error('❌ [FAIL] Test 1b: Failed second cycle');
    allPassed = false;
  }

  // -------------------------------------------------------------
  // Test 2: Different Merchant Isolation Test
  // -------------------------------------------------------------
  console.log('\n--- Test 2: Different Merchant Isolation ---');
  // Learned: XYZ Store -> Food
  // Amazon arrives: should NOT be Food!
  const amazonSms = '₹1200 paid to Amazon India for order 123';
  let amazonRes = await MockSpendTracerPipeline.classifySMS(amazonSms, 'Amazon India', 'hash_amz');
  console.log(`Amazon Transaction Category: ${amazonRes.category}`);
  if (amazonRes.category === 'Shopping' && amazonRes.category !== 'Food') {
    console.log('✅ [PASS] Test 2: Unrelated merchant "Amazon" was not affected by "XYZ Store" learning!');
  } else {
    console.error(`❌ [FAIL] Test 2: Amazon incorrectly received ${amazonRes.category}`);
    allPassed = false;
  }

  // -------------------------------------------------------------
  // Test 3: Different SMS Format for Learned Merchant
  // -------------------------------------------------------------
  console.log('\n--- Test 3: Different SMS Format for Learned Merchant ---');
  // User learned: "XYZ Store" -> Food (normalized name is "xyz")
  // New SMS format: "Your payment of INR 450 to XYZ was successful"
  const smsFormat2 = 'Your payment of INR 450 to XYZ was successful';
  let format2Res = await MockSpendTracerPipeline.classifySMS(smsFormat2, 'XYZ', 'hash_xyz_450');
  console.log(`Different SMS Format Category: ${format2Res.category}, Confidence: ${format2Res.confidence}`);
  if (format2Res.category === 'Food' && format2Res.needsVerification === false) {
    console.log('✅ [PASS] Test 3: Variant SMS format matched learned merchant "XYZ" -> "Food"!');
  } else {
    console.error(`❌ [FAIL] Test 3: Variant SMS failed to map to Food (Got: ${format2Res.category})`);
    allPassed = false;
  }

  // -------------------------------------------------------------
  // Test 4: Multiple Learned Categories
  // -------------------------------------------------------------
  console.log('\n--- Test 4: Multiple Learned Categories ---');
  await MockMerchantCategoryRepository.learnCorrection('Zomato', 'Food');
  await MockMerchantCategoryRepository.learnCorrection('Amazon', 'Shopping');
  await MockMerchantCategoryRepository.learnCorrection('Uber', 'Travel');
  await MockMerchantCategoryRepository.learnCorrection('Ramesh', 'Transfer');

  const multiTests = [
    { sms: 'Paid ₹350 to Zomato Online', merchant: 'Zomato Online', expectedCat: 'Food' },
    { sms: 'Paid ₹999 to AMAZON.IN', merchant: 'AMAZON.IN', expectedCat: 'Shopping' },
    { sms: 'Paid ₹280 for Uber India ride', merchant: 'Uber India', expectedCat: 'Travel' },
    { sms: 'Transferred ₹5000 to Ramesh', merchant: 'Ramesh', expectedCat: 'Transfer' }
  ];

  let multiPass = true;
  for (const m of multiTests) {
    const res = await MockSpendTracerPipeline.classifySMS(m.sms, m.merchant, 'dummy_hash');
    if (res.category === m.expectedCat && res.needsVerification === false) {
      console.log(`   ✅ ${m.merchant} -> ${res.category}`);
    } else {
      console.error(`   ❌ ${m.merchant} -> Expected ${m.expectedCat}, Got ${res.category}`);
      multiPass = false;
      allPassed = false;
    }
  }

  if (multiPass) {
    console.log('✅ [PASS] Test 4: All multiple learned categories correctly preserved on rebuild!');
  }

  // -------------------------------------------------------------
  // Final Result
  // -------------------------------------------------------------
  console.log('\n=========================================');
  if (allPassed) {
    console.log('🎉 ALL AI LEARNING PERSISTENCE TESTS PASSED!');
    process.exit(0);
  } else {
    console.error('💥 SOME TESTS FAILED.');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
