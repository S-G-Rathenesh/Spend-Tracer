import { MerchantCategoryRepository } from '../repositories/MerchantCategoryRepository';

export interface ExpenseCategoryResult {
  category: 'EMI' | 'Food' | 'Investment' | 'Shopping' | 'Travel' | 'Others' | 'Unknown';
  categoryId: number;
  confidence: number;
  logits: number[];
}

export class ExpenseClassifier {
  private static categories: ('EMI' | 'Food' | 'Investment' | 'Shopping' | 'Travel')[] = [
    'EMI', 'Food', 'Investment', 'Shopping', 'Travel'
  ];

  private static foodKeywords = ['swiggy', 'zomato', 'restaurant', 'cafe', 'food', 'dining', 'starbucks', 'dominos', 'pizza', 'mcdonalds', 'kfc', 'burger'];
  private static shoppingKeywords = ['amazon', 'flipkart', 'myntra', 'mart', 'retail', 'supermarket', 'groceries', 'zepto', 'blinkit', 'bigbasket', 'store', 'mall'];
  private static travelKeywords = ['uber', 'ola', 'irctc', 'rail', 'flight', 'airline', 'indigo', 'fuel', 'petrol', 'makemytrip', 'hotel', 'cab', 'metro'];
  private static emiKeywords = ['emi', 'loan', 'installment', 'hdb', 'bajaj', 'home loan', 'car loan', 'credit card bill'];
  private static investmentKeywords = ['zerodha', 'groww', 'upstox', 'mutual fund', 'sip', 'lic', 'insurance', 'stock', 'investment', 'gold'];

  private static getCategoryId(categoryName: string): number {
    switch (categoryName) {
      case 'EMI': return 0;
      case 'Food': return 1;
      case 'Investment': return 2;
      case 'Shopping': return 3;
      case 'Travel': return 4;
      default: return 5;
    }
  }

  public static async classify(
    pooledOutput: Float32Array | number[],
    merchant: string | null,
    originalSMS: string
  ): Promise<ExpenseCategoryResult> {
    // 1. Check Local Feedback Loop First
    if (merchant) {
      const userMappedCategory = await MerchantCategoryRepository.getCategoryForMerchant(merchant);
      if (userMappedCategory) {
        const categoryId = this.getCategoryId(userMappedCategory);
        const fakeLogits = [0, 0, 0, 0, 0, 0];
        fakeLogits[categoryId] = 10.0;
        console.log(`[AI_LEARNING_LAYER] Found local user mapping: ${merchant} -> ${userMappedCategory}`);
        
        return {
          category: userMappedCategory as any,
          categoryId,
          confidence: 1.0, // 100% confidence for user override
          logits: fakeLogits,
        };
      }
    }

    // 2. Fallback to AI / Heuristics
    const textLower = (originalSMS + ' ' + (merchant || '')).toLowerCase();

    let category: 'EMI' | 'Food' | 'Investment' | 'Shopping' | 'Travel' | 'Unknown' = 'Unknown';
    let categoryId = 5;
    let confidence = 0.50; // Low confidence for unknown

    if (this.foodKeywords.some(kw => textLower.includes(kw))) {
      category = 'Food';
      categoryId = 1;
      confidence = 0.96;
    } else if (this.travelKeywords.some(kw => textLower.includes(kw))) {
      category = 'Travel';
      categoryId = 4;
      confidence = 0.95;
    } else if (this.emiKeywords.some(kw => textLower.includes(kw))) {
      category = 'EMI';
      categoryId = 0;
      confidence = 0.97;
    } else if (this.investmentKeywords.some(kw => textLower.includes(kw))) {
      category = 'Investment';
      categoryId = 2;
      confidence = 0.96;
    } else if (this.shoppingKeywords.some(kw => textLower.includes(kw))) {
      category = 'Shopping';
      categoryId = 3;
      confidence = 0.94;
    }

    const fakeLogits = [0, 0, 0, 0, 0, 0];
    fakeLogits[categoryId] = category === 'Unknown' ? 0 : 4.0;

    return {
      category,
      categoryId,
      confidence,
      logits: fakeLogits,
    };
  }
}
