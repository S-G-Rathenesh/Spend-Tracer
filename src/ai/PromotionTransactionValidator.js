"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionTransactionValidator = void 0;
var PromotionTransactionValidator = /** @class */ (function () {
    function PromotionTransactionValidator() {
    }
    PromotionTransactionValidator.validate = function (smsText, amount, sender) {
        var text = smsText.toLowerCase();
        var senderLower = sender.toLowerCase();

        // 1. Telecom Data Usage Alert Check (Non-Transaction)
        var isTelecomUsage = this.containsKeyword(text, this.TELECOM_USAGE_ALERT_KEYWORDS);
        var hasMonetaryDebitPayment = /\b(debited|debited by|debited for|spent|withdrawn|transferred to|recharge successful)\b/i.test(text) &&
                                     /(?:inr|rs\.?|₹)\s*[\d,]+/i.test(text);

        if (isTelecomUsage && !hasMonetaryDebitPayment) {
          return { isValid: false, reason: 'TELECOM_USAGE_ALERT', confidence: 0 };
        }

        // 2. Telecom Benefit / Pack Credit Check (e.g. "credited with 7 days welcome back 5G pack")
        var isTelecomPackCredit = /\bcredited with\b.*\b(pack|days|validity|gb|mb|unlimited|welcome|benefit|trial|points|coupon|voucher)\b/i.test(text) ||
                                 /\b(welcome back|porting out|stay on jio|5g unlimited pack|welcome back 5g)\b/i.test(text);

        if (isTelecomPackCredit && !hasMonetaryDebitPayment) {
          return { isValid: false, reason: 'TELECOM_OFFER', confidence: 0 };
        }

        // 3. Check Informational / Limit / Policy Notices
        var hasInfoLimit = this.containsKeyword(text, this.INFORMATIONAL_LIMIT_KEYWORDS);
        var hasExplicitDebitAction = /\b(debited|debited by|debited with|debited for|was debited|has been debited|paid to|spent on|withdrawn from|deducted from|transferred to|transferred successfully)\b/i.test(text) ||
                                    /\b(?:acct|a\/c|card)?\s*(?:xxx\d*|\d+)?\s*(?:dr|dr\.|dr:)\s*(?:inr|rs\.?|₹)?\s*[\d,]+(?:\.\d{2})?/i.test(text) ||
                                    /\b(?:dr|dr\.|dr:)\s*(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?/i.test(text) ||
                                    /\b(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?\s*(?:debited|dr\.|dr)\b/i.test(text);

        var hasExplicitCreditAction = (/\b(credited|credited to|credited with|was credited|has been credited|received from|deposited into|refund received|refund credited|cashback credited)\b/i.test(text) ||
                                      /\b(?:acct|a\/c|card)?\s*(?:xxx\d*|\d+)?\s*(?:cr|cr\.|cr:)\s*(?:inr|rs\.?|₹)?\s*[\d,]+(?:\.\d{2})?/i.test(text) ||
                                      /\b(?:cr|cr\.|cr:)\s*(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?/i.test(text) ||
                                      /\b(?:inr|rs\.?|₹)\s*[\d,]+(?:\.\d{2})?\s*(?:credited|cr\.|cr)\b/i.test(text)) &&
                                      !isTelecomPackCredit;

        if (hasInfoLimit && !hasExplicitDebitAction && !hasExplicitCreditAction) {
            return { isValid: false, reason: 'INFORMATIONAL_LIMIT_NOTICE', confidence: 0 };
        }

        var hasDebit = this.containsKeyword(text, this.DEBIT_INDICATORS) || hasExplicitDebitAction;
        var hasCredit = (this.containsKeyword(text, this.CREDIT_INDICATORS) || hasExplicitCreditAction) && !isTelecomPackCredit;
        var hasReversed = this.containsKeyword(text, this.REVERSED_INDICATORS);
        var hasFailed = this.containsKeyword(text, this.FAILED_INDICATORS) && /\b(txn|transaction|payment|order|card)\b/i.test(text);
        var hasRechargeConfirm = this.containsKeyword(text, this.RECHARGE_CONFIRMATION);

        var hasTransactionEvidence = hasDebit || hasCredit || hasReversed || hasFailed || hasRechargeConfirm;

        // 4. Shopping Promotions
        var isShoppingBrand = this.containsKeyword(text, this.SHOPPING_BRANDS) || this.containsKeyword(senderLower, this.SHOPPING_BRANDS);
        if (isShoppingBrand && !hasTransactionEvidence) {
            return { isValid: false, reason: 'ADVERTISEMENT', confidence: 0 };
        }

        // 5. Telecom Promotional Detection
        var isTelecomSender = this.containsKeyword(senderLower, this.TELECOM_SENDERS) || this.containsKeyword(text, this.TELECOM_SENDERS);
        var hasTelecomPromo = this.containsKeyword(text, this.TELECOM_KEYWORDS);
        if (isTelecomSender && hasTelecomPromo) {
            if (!hasTransactionEvidence && !hasRechargeConfirm) {
                return { isValid: false, reason: 'TELECOM_OFFER', confidence: 0 };
            }
        }

        // 6. Reject Promotional Messages
        var hasPromo = this.containsKeyword(text, this.PROMOTIONAL_KEYWORDS);
        if (hasPromo && !hasTransactionEvidence) {
            return { isValid: false, reason: 'PROMOTIONAL_SMS', confidence: 0 };
        }

        // 7. Require Transaction Evidence (Monetary amount alone does not indicate a transaction)
        if (amount !== null && !hasTransactionEvidence) {
            return { isValid: false, reason: 'NO_TRANSACTION_EVIDENCE', confidence: 0 };
        }

        if (!hasTransactionEvidence) {
            return { isValid: false, reason: 'PRICE_ONLY', confidence: 0 };
        }

        var confidence = 0.5;
        if (hasDebit || hasCredit)
            confidence += 0.4;
        if (hasFailed)
            confidence += 0.3;
        if (hasRechargeConfirm)
            confidence = 0.9;

        return { isValid: true, reason: '', confidence: Math.min(confidence, 1.0) };
    };
    PromotionTransactionValidator.containsKeyword = function (text, keywords) {
        return keywords.some(function (kw) {
            if (kw === 'dr' || kw === 'cr' || kw === 'dr.' || kw === 'cr.' || kw === 'gb' || kw === 'mb') {
                return new RegExp("\\b" + kw.replace('.', '\\.') + "\\b").test(text);
            }
            return text.includes(kw);
        });
    };
    PromotionTransactionValidator.DEBIT_INDICATORS = [
        'debited', 'dr', 'dr.', 'dr:', 'paid', 'payment successful', 'withdrawn',
        'deducted', 'purchase', 'spent', 'txn successful',
        'transaction successful', 'upi payment', 'transferred successfully',
        'transferred to', 'sent to', 'payment to'
    ];
    PromotionTransactionValidator.CREDIT_INDICATORS = [
        'credited', 'cr', 'cr.', 'cr:', 'received', 'deposit', 'deposited', 'refund credited',
        'refund received', 'salary credited', 'cashback credited', 'transferred to your account'
    ];
    PromotionTransactionValidator.FAILED_INDICATORS = [
        'declined', 'decline', 'failed', 'failure', 'unsuccessful',
        'rejected', 'incorrect pin', 'wrong pin', 'insufficient funds',
        'could not be completed', 'unable to process', 'not authorized'
    ];
    PromotionTransactionValidator.REVERSED_INDICATORS = [
        'reversed', 'refunded'
    ];
    PromotionTransactionValidator.INFORMATIONAL_LIMIT_KEYWORDS = [
        'cooling period', 'cooling-period', 'transaction limit', 'daily limit',
        'monthly limit', 'per day limit', 'upi limit', 'card limit', 'usage limit',
        'transfer limit', 'spending limit', 'credit limit', 'withdrawal limit',
        'maximum limit', 'minimum limit', 'allowed limit', 'eligible limit',
        'limit is', 'limit for', 'limit of', 'limit applies', 'limit has been',
        'limit increased', 'limit decreased', 'service charge', 'service charges',
        'charges applicable', 'annual fee', 'rate of interest', 'charges for',
        'maintenance charge', 'new user registration', 'registration',
        'registered successfully', 'activation', 'deactivation', 'security notice',
        'security advisory', 'security alert', 'kyc reminder', 'update kyc',
        'complete kyc', 'terms and conditions', 'terms & conditions', 'terms apply',
        'policy', 'pack validity', 'validity of'
    ];
    PromotionTransactionValidator.TELECOM_USAGE_ALERT_KEYWORDS = [
        'data usage alert', 'data usage', 'daily data used', 'daily quota', 'data alert',
        'quota exhausted', 'remaining data', 'data balance', 'usage alert', 'data saving tips',
        '50% of your daily data', '90% of your daily data', '100% of your daily data',
        '50% of daily data', '90% of daily data', '100% of daily data'
    ];
    PromotionTransactionValidator.PROMOTIONAL_KEYWORDS = [
        'offer', 'offers', 'promo', 'promotion', 'discount',
        'cashback offer', 'save up to', 'buy now', 'recharge now',
        'limited period', 'special offer', 'valid till', 'starting from',
        'starting at', 'free', 'get', 'plan', 'pack', 'data', 'gb', 'mb',
        'ott', 'validity', 'unlimited', 'only rs', 'starts at', 'per day',
        'welcome back', 'porting out', 'stay on jio', 'we want you back'
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
