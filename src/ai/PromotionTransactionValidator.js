"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionTransactionValidator = void 0;
var PromotionTransactionValidator = /** @class */ (function () {
    function PromotionTransactionValidator() {
    }
    PromotionTransactionValidator.validate = function (smsText, amount, sender) {
        var text = smsText.toLowerCase();
        var senderLower = sender.toLowerCase();
        var hasDebit = this.containsKeyword(text, this.DEBIT_INDICATORS);
        var hasCredit = this.containsKeyword(text, this.CREDIT_INDICATORS);
        var hasBank = this.containsKeyword(text, this.BANK_INDICATORS);
        // Explicit Recharge Confirmation
        var hasRechargeConfirm = this.containsKeyword(text, this.RECHARGE_CONFIRMATION);
        var hasTransactionEvidence = hasDebit || hasCredit || hasBank || hasRechargeConfirm;
        // Rule 6: Shopping Promotions
        var isShoppingBrand = this.containsKeyword(text, this.SHOPPING_BRANDS) || this.containsKeyword(senderLower, this.SHOPPING_BRANDS);
        if (isShoppingBrand && !hasTransactionEvidence) {
            return { isValid: false, reason: 'ADVERTISEMENT', confidence: 0 };
        }
        // Rule 4: Telecom Promotional Detection
        var isTelecomSender = this.containsKeyword(senderLower, this.TELECOM_SENDERS) || this.containsKeyword(text, this.TELECOM_SENDERS);
        var hasTelecomPromo = this.containsKeyword(text, this.TELECOM_KEYWORDS);
        if (isTelecomSender && hasTelecomPromo) {
            if (!hasTransactionEvidence && !hasRechargeConfirm) {
                return { isValid: false, reason: 'TELECOM_OFFER', confidence: 0 };
            }
        }
        // Rule 3: Reject Promotional Messages
        var hasPromo = this.containsKeyword(text, this.PROMOTIONAL_KEYWORDS);
        if (hasPromo && !hasTransactionEvidence) {
            return { isValid: false, reason: 'PROMOTIONAL_SMS', confidence: 0 };
        }
        // Rule 7 & 2: Require Transaction Evidence
        if (amount !== null && !hasTransactionEvidence) {
            return { isValid: false, reason: 'NO_TRANSACTION_CONFIRMATION', confidence: 0 };
        }
        // Money alone DOES NOT indicate a transaction. (e.g. price only)
        if (!hasTransactionEvidence) {
            return { isValid: false, reason: 'PRICE_ONLY', confidence: 0 };
        }
        var confidence = 0.5;
        if (hasDebit || hasCredit)
            confidence += 0.3;
        if (hasBank)
            confidence += 0.2;
        if (hasRechargeConfirm)
            confidence = 0.9;
        return { isValid: true, reason: '', confidence: Math.min(confidence, 1.0) };
    };
    PromotionTransactionValidator.containsKeyword = function (text, keywords) {
        return keywords.some(function (kw) {
            if (kw === 'dr' || kw === 'cr' || kw === 'gb' || kw === 'mb') {
                return new RegExp("\\b".concat(kw, "\\b")).test(text);
            }
            return text.includes(kw);
        });
    };
    PromotionTransactionValidator.DEBIT_INDICATORS = [
        'debited', 'dr', 'paid', 'payment successful', 'withdrawn',
        'deducted', 'purchase', 'spent', 'txn successful',
        'transaction successful', 'upi payment'
    ];
    PromotionTransactionValidator.CREDIT_INDICATORS = [
        'credited', 'cr', 'received', 'deposit', 'refund credited',
        'salary credited', 'cashback credited'
    ];
    PromotionTransactionValidator.BANK_INDICATORS = [
        'available balance', 'a/c', 'account', 'bank', 'upi ref',
        'utr', 'reference number', 'transaction id', 'txn id', 'imps', 'neft', 'rtgs'
    ];
    PromotionTransactionValidator.PROMOTIONAL_KEYWORDS = [
        'offer', 'offers', 'promo', 'promotion', 'discount',
        'cashback offer', 'save up to', 'buy now', 'recharge now',
        'limited period', 'special offer', 'valid till', 'starting from',
        'starting at', 'free', 'get', 'plan', 'pack', 'data', 'gb', 'mb',
        'ott', 'validity', 'unlimited', 'only rs', 'starts at', 'per day'
    ];
    PromotionTransactionValidator.TELECOM_KEYWORDS = [
        'data', 'gb', 'mb', 'pack', 'plan', 'validity', 'recharge now',
        'ott', 'sms pack', 'internet', 'usage alert', 'alert 50%',
        'alert 90%', 'alert 100%'
    ];
    PromotionTransactionValidator.TELECOM_SENDERS = [
        'airtel', 'jio', 'vi', 'bsnl'
    ];
    PromotionTransactionValidator.SHOPPING_BRANDS = [
        'amazon', 'flipkart', 'swiggy', 'zomato', 'myntra', 'ajio'
    ];
    PromotionTransactionValidator.RECHARGE_CONFIRMATION = [
        'recharge successful', 'recharge of', 'recharge done'
    ];
    return PromotionTransactionValidator;
}());
exports.PromotionTransactionValidator = PromotionTransactionValidator;
