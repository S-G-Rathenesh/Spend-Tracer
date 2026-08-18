"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PromotionTransactionValidator_1 = require("./src/ai/PromotionTransactionValidator");
var examples = [
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
var passed = 0;
examples.forEach(function (ex) {
    var result = PromotionTransactionValidator_1.PromotionTransactionValidator.validate(ex.body, ex.amount, ex.sender);
    var pass = result.isValid === ex.expected;
    if (pass)
        passed++;
    console.log("\nTest: ".concat(ex.desc));
    console.log("Sender: ".concat(ex.sender, " | Body: ").concat(ex.body));
    console.log("Result: ".concat(result.isValid ? 'ACCEPTED' : 'REJECTED', " (Expected: ").concat(ex.expected ? 'ACCEPTED' : 'REJECTED', ")"));
    console.log("Reason: ".concat(result.reason || 'None'));
    console.log("Confidence: ".concat(result.confidence));
    console.log("Status: ".concat(pass ? '✅ PASS' : '❌ FAIL'));
});
console.log("\nTotal Passed: ".concat(passed, "/").concat(examples.length));
