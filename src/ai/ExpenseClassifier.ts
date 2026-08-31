import { MerchantCategoryRepository } from '../repositories/MerchantCategoryRepository';

export interface ExpenseCategoryResult {
  category: string;
  categoryId: number;
  confidence: number;
  logits: number[];
  isLearned?: boolean;
  learnedMerchant?: string;
}

export class ExpenseClassifier {
  private static foodKeywords = ['swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'dining', 'starbucks', 'dominos', 'pizza', 'mcdonalds', 'kfc', 'burger', 'bakery', 'tea', 'coffee'];
  private static shoppingKeywords = ['amazon', 'flipkart', 'myntra', 'mart', 'retail', 'supermarket', 'groceries', 'zepto', 'blinkit', 'bigbasket', 'store', 'mall', 'clothing', 'fashion', 'ajio', 'meesho'];
  private static travelKeywords = ['uber', 'ola', 'irctc', 'rail', 'flight', 'airline', 'indigo', 'fuel', 'petrol', 'makemytrip', 'hotel', 'cab', 'metro', 'toll', 'fastag'];
  private static emiKeywords = ['emi', 'loan', 'installment', 'hdb', 'bajaj', 'home loan', 'car loan', 'credit card bill'];
  private static investmentKeywords = ['zerodha', 'groww', 'upstox', 'mutual fund', 'sip', 'lic', 'insurance', 'stock', 'investment', 'gold'];
  private static billsKeywords = ['electricity', 'bescom', 'water bill', 'gas bill', 'broadband', 'wifi', 'dth', 'postpaid'];
  private static entertainmentKeywords = ['netflix', 'spotify', 'prime video', 'hotstar', 'bookmyshow', 'cinema', 'pvr', 'inox', 'youtube'];

  public static async classify(
    pooledOutput: Float32Array | number[],
    merchant: string | null,
    originalSMS: string,
    smsHash?: string | null,
    sender?: string | null,
    bank?: string | null
  ): Promise<ExpenseCategoryResult> {
    // 1. Check Local Learned Feedback Loop First (Highest Priority)
    const learned = await MerchantCategoryRepository.getLearnedCategory(merchant, originalSMS, smsHash, sender, bank);
    if (learned && learned.category) {
      console.log(`[AI_LEARNING_LAYER] Found local user mapping: ${merchant || learned.matchedMerchant} -> ${learned.category}`);
      
      return {
        category: learned.category,
        categoryId: 0,
        confidence: 1.0, // 100% confidence for user override
        logits: [10, 0, 0, 0, 0, 0],
        isLearned: true,
        learnedMerchant: learned.matchedMerchant
      };
    }

    // 2. Fallback to Heuristics & Rules
    const textLower = (originalSMS + ' ' + (merchant || '')).toLowerCase();

    let category = 'Unknown';
    let confidence = 0.50; // Low confidence for unknown

    // Cashback genuine financial credit detection
    if (
      /(?:cashback|cash back|reward(?:s)?)\s+(?:of\s+)?(?:rs\.?|inr|₹)?\s*[\d\.]+\s*(?:is\s+)?credited/i.test(originalSMS) ||
      /(?:credited|received)\s+(?:rs\.?|inr|₹)?\s*[\d\.]+\s*(?:as|for)?\s*cashback/i.test(originalSMS)
    ) {
      category = 'Cashback';
      confidence = 0.98;
    } else if (this.foodKeywords.some(kw => textLower.includes(kw))) {
      category = 'Food';
      confidence = 0.96;
    } else if (this.travelKeywords.some(kw => textLower.includes(kw))) {
      category = 'Travel';
      confidence = 0.95;
    } else if (this.emiKeywords.some(kw => textLower.includes(kw))) {
      category = 'EMI';
      confidence = 0.97;
    } else if (this.investmentKeywords.some(kw => textLower.includes(kw))) {
      category = 'Investment';
      confidence = 0.96;
    } else if (this.billsKeywords.some(kw => textLower.includes(kw))) {
      category = 'Bills';
      confidence = 0.95;
    } else if (this.entertainmentKeywords.some(kw => textLower.includes(kw))) {
      category = 'Entertainment';
      confidence = 0.95;
    } else if (this.shoppingKeywords.some(kw => textLower.includes(kw))) {
      category = 'Shopping';
      confidence = 0.94;
    }

    return {
      category,
      categoryId: 0,
      confidence,
      logits: [0, 0, 0, 0, 0, 0],
      isLearned: false
    };
  }
}
