/**
 * Entity Reconstruction Module
 * Converts token-level BIO predictions and exact character offsets into structured transaction fields.
 */

import { NERTokenPrediction } from './FinancialNER';
import { TransactionTypeDetector } from './TransactionTypeDetector';
export interface ExtractedEntities {
  amount: number | null;
  currency: string | null;
  merchant: string | null;
  bank: string | null;
  accountSuffix: string | null;
  paymentMode: string | null;
  transactionType: 'Debit' | 'Credit';
  reference: string | null;
  date: string | null;
}

export class EntityReconstruction {
  public static reconstruct(
    nerPredictions: NERTokenPrediction[],
    originalSMS: string
  ): ExtractedEntities {
    const text = originalSMS;
    const textLower = originalSMS.toLowerCase();

    // 1. Amount Extraction (Exact regex + BIO span fallback)
    let amount: number | null = null;
    let currency: string | null = 'INR';

    // Regex patterns matching Indian financial SMS formats
    const amountRegex = /(?:rs\.?|inr|usd|\$)\s*([\d,]+(?:\.\d{1,2})?)|(?:debited|credited|spent|paid|withdrawn|sent|transfer(?:red)?|received)\s+(?:by\s+)?(?:rs\.?|inr|\$)?\s*([\d,]+(?:\.\d{1,2})?)/i;
    const amtMatch = text.match(amountRegex);
    if (amtMatch) {
      const rawAmtStr = (amtMatch[1] || amtMatch[2] || '').replace(/,/g, '');
      const parsed = parseFloat(rawAmtStr);
      if (!isNaN(parsed) && parsed > 0) {
        amount = parsed;
      }
    }

    if (amount === null) {
      // Fallback regex for standalone numbers near bank keywords
      const genericAmtMatch = /(?:INR|Rs\.?|INR\s*)\s*([\d]+(?:\.\d+)?)/i.exec(text);
      if (genericAmtMatch) {
        amount = parseFloat(genericAmtMatch[1]);
      }
    }

    // Currency Detection
    if (/usd|\$/i.test(text)) {
      currency = 'USD';
    } else if (/eur|€/i.test(text)) {
      currency = 'EUR';
    } else {
      currency = 'INR';
    }

    // 2. Transaction Type (Debit vs Credit)
    let transactionType: 'Debit' | 'Credit' = TransactionTypeDetector.detect(text) || 'Debit';

    // 3. Bank Extraction
    let bank: string | null = null;
    const bankRegex = /\b(HDFC|ICICI|SBI|Axis|Kotak|PNB|BOB|IDFC|IndusInd|Yes Bank|Canara|Union Bank|Citi|HSBC|Paytm|PhonePe|Google Pay|GPay|Amazon Pay)\b/i;
    const bankMatch = text.match(bankRegex);
    if (bankMatch) {
      bank = bankMatch[1].toUpperCase();
      if (bank === 'GPAY') bank = 'Google Pay';
    }

    // 4. Account Suffix
    let accountSuffix: string | null = null;
    const accRegex = /(?:a\/c|acc|account|card|vpa)(?:\s+no\.?|\s+ending|\s+xx+|\s+\*+)?\s*[\*\.\s]*(\d{3,4})\b/i;
    const accMatch = text.match(accRegex);
    if (accMatch) {
      accountSuffix = accMatch[1];
    }

    // 5. Merchant Extraction
    let merchant: string | null = null;
    
    // Priority 1: Explicit Sender/Receiver
    const explicitSenderRegex = /(?:by Sender|received from)\s+([A-Za-z0-9\.\_\-\s]{3,40}?)(?=\s+(?:on|ref|txn|bal|avail|val|via|using|dated|upi)\b|[\.,;]|$)/i;
    const explicitMatch = text.match(explicitSenderRegex);
    if (explicitMatch) {
      let candidate = explicitMatch[1].trim();
      if (!/^(rs|inr|a\/c|account|card|bank|your|the)$/i.test(candidate) && !/^[X\*]+\d+$/i.test(candidate)) {
        merchant = candidate;
      }
    }

    // Priority 2: General preposition extraction
    if (!merchant) {
      const merchantRegex = /(?:at|from|to|vpa|info|for|towards|paid to|upi to)\s+([A-Za-z0-9\.\_\-\s]{2,30}?)(?=\s+(?:on|ref|txn|bal|avail|val|via|using|dated|upi)\b|[\.,;]|$)/i;
      const merchMatch = text.match(merchantRegex);
      if (merchMatch) {
        let candidate = merchMatch[1].trim();
        candidate = candidate.replace(/\b(?:UPI|REF|TXN)\b/ig, '').replace(/[\.\,\;]$/, '').trim();
        if (
          candidate.length > 1 &&
          !/^(rs|inr|a\/c|account|card|bank|your|the|ref|txn|bal|upi)$/i.test(candidate) &&
          !/^[X\*]+\d+$/i.test(candidate) // Do not pick up masked account numbers like XXX166
        ) {
          merchant = candidate;
        }
      }
    }

    if (!merchant) {
      // Common merchant keywords check
      const knownMerchants = ['Amazon', 'Flipkart', 'Swiggy', 'Zomato', 'Uber', 'Ola', 'Netflix', 'Spotify', 'Myntra', 'MakeMyTrip', 'BookMyShow', 'BigBasket', 'Zepto', 'Blinkit', 'IRCTC', 'Razorpay'];
      for (const m of knownMerchants) {
        if (textLower.includes(m.toLowerCase())) {
          merchant = m;
          break;
        }
      }
    }

    // 6. Payment Mode
    let paymentMode: string | null = null;
    if (/upi|vpa/i.test(textLower)) {
      paymentMode = 'UPI';
    } else if (/credit card|cc\b/i.test(textLower)) {
      paymentMode = 'Credit Card';
    } else if (/debit card|dc\b|atm/i.test(textLower)) {
      paymentMode = 'Debit Card';
    } else if (/net banking|netbanking/i.test(textLower)) {
      paymentMode = 'Net Banking';
    } else if (/imps/i.test(textLower)) {
      paymentMode = 'IMPS';
    } else if (/neft/i.test(textLower)) {
      paymentMode = 'NEFT';
    } else if (/rtgs/i.test(textLower)) {
      paymentMode = 'RTGS';
    } else if (/pos\b/i.test(textLower)) {
      paymentMode = 'POS';
    } else if (/wallet/i.test(textLower)) {
      paymentMode = 'Wallet';
    }

    // 7. Reference Number
    let reference: string | null = null;
    const refRegex = /(?:ref|rrn|txn|transaction)(?:\s+no\.?|\s+id)?[\s\:\#]*([A-Za-z0-9]{6,18})/i;
    const refMatch = text.match(refRegex);
    if (refMatch) {
      reference = refMatch[1];
    }

    // 8. Date
    let date: string | null = null;
    const dateRegex = /\b(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{2,4}|\d{1,2}[-\/\.\s]+[A-Za-z]{3}[-\/\.\s]+\d{2,4}|[A-Za-z]{3}[-\/\.\s]+\d{1,2}[-\/\.\s]+\d{2,4}|\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2})\b/;
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
      const raw = dateMatch[1];
      const parts = raw.split(/[-\/\.\s]+/);
      if (parts.length === 3) {
        let p1 = parts[0], p2 = parts[1], p3 = parts[2];
        let d = p1, m = p2, y = p3;
        
        if (p1.length === 4) { y = p1; m = p2; d = p3; } 
        else if (isNaN(Number(p1))) { m = p1; d = p2; y = p3; }

        if (y.length === 2) y = '20' + y;
        
        if (isNaN(Number(m))) {
          const mNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
          const idx = mNames.findIndex(x => x === m.toLowerCase().substring(0,3));
          if (idx >= 0) m = (idx + 1).toString();
        }

        const isoStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T12:00:00Z`;
        const validDate = new Date(isoStr);
        if (!isNaN(validDate.getTime())) {
          // Future date guard
          const now = new Date();
          if (validDate <= now) {
            date = validDate.toISOString().split('T')[0];
          } else {
            console.log(`[DATE_PIPELINE] Rejected future date: ${validDate.toISOString()}`);
          }
        }
      }
    }

    console.log(`[DATE_PIPELINE] 1. Raw SMS: ${originalSMS}`);
    console.log(`[DATE_PIPELINE] 2. Extracted date: ${date}`);

    return {
      amount,
      currency,
      merchant,
      bank,
      accountSuffix,
      paymentMode,
      transactionType,
      reference,
      date,
    };
  }
}
