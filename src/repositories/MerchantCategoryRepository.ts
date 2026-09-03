import { DatabaseService } from '../database/DatabaseService';

export type MatchType = 'EXACT_UPI' | 'EXACT_PAYEE' | 'EXACT_MERCHANT' | 'EXACT_SMS' | 'WEAK_MATCH';

export interface MerchantCategoryMapping {
  id: string;
  merchant_name: string;
  normalized_name: string;
  category: string;
  upi_id?: string | null;
  account_identifier?: string | null;
  sms_hash?: string | null;
  sender?: string | null;
  mapping_type?: MatchType | null;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

export class MerchantCategoryRepository {
  private static genericWords = new Set([
    'google', 'amazon', 'bank', 'upi', 'payment', 'phonepe', 'paytm', 'gpay',
    'alert', 'account', 'card', 'debit', 'credit', 'inr', 'rs', 'transfer',
    'unknown', 'na', 'null', 'undefined', 'txn', 'ref', 'vpa', 'dr', 'cr',
    'dear', 'customer', 'bal', 'balance', 'spent', 'received', 'sent', 'paid',
    'sms', 'blockupi', 'canarabank', 'sbibank', 'hdfcbank', 'icicibank', 'axisbank',
    'online', 'merchant', 'retail', 'pos', 'atm', 'user', 'service', 'info'
  ]);

  /**
   * Extracts UPI Virtual Payment Address (VPA) / UPI ID from text or merchant field.
   * e.g. "sanjaiarasu9@oksbi", "pradeep.s@okaxis", "friend@upi"
   */
  public static extractUpiId(text?: string | null, merchant?: string | null): string | null {
    const combined = `${merchant || ''} ${text || ''}`.trim();
    if (!combined) return null;

    // Pattern 1: standard user@bank format
    const upiRegex = /\b([a-zA-Z0-9.\-_]{2,50}@[a-zA-Z0-9]{2,25})\b/i;
    const match = combined.match(upiRegex);
    if (match) {
      const upi = match[1].toLowerCase().trim();
      return upi;
    }

    // Pattern 2: VPA prefix e.g. "VPA sanjaiarasu9@..." or "to UPI abc@..."
    const vpaRegex = /(?:vpa|upi id|to upi)\s*[:\-]?\s*([a-zA-Z0-9.\-_@]{3,40})/i;
    const vpaMatch = combined.match(vpaRegex);
    if (vpaMatch) {
      return vpaMatch[1].toLowerCase().trim();
    }

    return null;
  }

  /**
   * Cleans and normalizes merchant/payee names.
   */
  public static normalizeMerchantName(name: string): string {
    if (!name) return '';
    let clean = name
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[^a-z0-9\s@\.\-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return '';

    // If it's a UPI ID, return clean UPI ID
    if (clean.includes('@')) {
      const upiPart = clean.match(/([a-z0-9.\-_]+@[a-z0-9]+)/i);
      if (upiPart) return upiPart[1];
    }

    // Strip corporate/location suffixes
    const suffixRegex = /\b(pvt ltd|private limited|ltd|limited|technologies|technology|services|service|india|in|com|retail|online|pay|upi|store|outlet|bangalore|mumbai|delhi|hyderabad|chennai)\b/g;
    const stripped = clean.replace(suffixRegex, '').replace(/\s+/g, ' ').trim();

    if (stripped.length >= 2) {
      return stripped;
    }

    return clean;
  }

  /**
   * Checks whether a normalized name is too generic to be safely used for broad matching.
   */
  public static isGenericName(normalizedName: string): boolean {
    if (!normalizedName || normalizedName.trim().length < 3) return true;
    const lower = normalizedName.toLowerCase().trim();
    if (this.genericWords.has(lower)) return true;
    if (/^[X\*0-9\s]+$/i.test(lower)) return true; // purely digits/masked accounts
    return false;
  }

  /**
   * Direct category query for an exact non-generic merchant/payee name.
   */
  static async getCategoryForMerchant(merchantName: string): Promise<string | null> {
    if (!merchantName || merchantName === 'Unknown Merchant') return null;
    const normalized = this.normalizeMerchantName(merchantName);
    if (!normalized || this.isGenericName(normalized)) return null;

    const db = DatabaseService.getDB();
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT category FROM MerchantCategoryMapping 
           WHERE normalized_name = ? 
           ORDER BY updatedAt DESC LIMIT 1`,
          [normalized],
          (_, results) => {
            if (results.rows.length > 0) {
              resolve(results.rows.item(0).category);
            } else {
              resolve(null);
            }
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  /**
   * Comprehensive Strong-Identity lookup:
   * Priority:
   * 1. Exact UPI ID match (Strongest - MatchType: EXACT_UPI)
   * 2. Exact Normalized Merchant/Payee match (Exact equality, Non-generic - MatchType: EXACT_PAYEE / EXACT_MERCHANT)
   * 3. Exact SMS Hash / Fingerprint match (MatchType: EXACT_SMS)
   * 
   * NOTE: Never matches on user's bank account or generic substrings.
   */
  static async getLearnedCategory(
    merchantName?: string | null,
    smsText?: string | null,
    smsHash?: string | null,
    sender?: string | null,
    bank?: string | null
  ): Promise<{ category: string; matchedMerchant?: string; confidence: number; isLearned: boolean; matchType: MatchType } | null> {
    const db = DatabaseService.getDB();

    const upiId = this.extractUpiId(smsText, merchantName);
    const normalized = merchantName ? this.normalizeMerchantName(merchantName) : null;

    // 1. Priority 1: Exact UPI ID Match (Strongest)
    if (upiId) {
      const catByUpi = await new Promise<string | null>((resolve) => {
        db.transaction(tx => {
          tx.executeSql(
            'SELECT category, merchant_name FROM MerchantCategoryMapping WHERE upi_id = ? ORDER BY updatedAt DESC LIMIT 1',
            [upiId],
            (_, results) => {
              if (results.rows.length > 0) {
                resolve(results.rows.item(0).category);
              } else {
                resolve(null);
              }
            },
            () => { resolve(null); return false; }
          );
        });
      });
      if (catByUpi) {
        return { category: catByUpi, matchedMerchant: merchantName || upiId, confidence: 1.0, isLearned: true, matchType: 'EXACT_UPI' };
      }
    }

    // 2. Priority 2: Exact Normalized Payee / Merchant Name Match (Strict equality, Non-generic)
    if (normalized && !this.isGenericName(normalized)) {
      const cat = await this.getCategoryForMerchant(merchantName!);
      if (cat) {
        return { category: cat, matchedMerchant: merchantName!, confidence: 1.0, isLearned: true, matchType: 'EXACT_PAYEE' };
      }
    }

    // 3. Priority 3: Match by SMS Hash (Single transaction exact rebuild)
    if (smsHash) {
      const catByHash = await new Promise<string | null>((resolve) => {
        db.transaction(tx => {
          tx.executeSql(
            'SELECT category, merchant_name FROM MerchantCategoryMapping WHERE sms_hash = ? LIMIT 1',
            [smsHash],
            (_, results) => {
              if (results.rows.length > 0) {
                resolve(results.rows.item(0).category);
              } else {
                resolve(null);
              }
            },
            () => { resolve(null); return false; }
          );
        });
      });
      if (catByHash) {
        return { category: catByHash, matchedMerchant: merchantName || undefined, confidence: 1.0, isLearned: true, matchType: 'EXACT_SMS' };
      }
    }

    return null;
  }

  /**
   * Retrieves all learned mappings.
   */
  static async getAllMappings(): Promise<MerchantCategoryMapping[]> {
    const db = DatabaseService.getDB();
    return new Promise((resolve) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM MerchantCategoryMapping ORDER BY updatedAt DESC',
          [],
          (_, results) => {
            const list: MerchantCategoryMapping[] = [];
            for (let i = 0; i < results.rows.length; i++) {
              list.push(results.rows.item(i));
            }
            resolve(list);
          },
          () => { resolve([]); return false; }
        );
      });
    });
  }

  /**
   * Persists a user's category correction for a merchant/account/recipient.
   * Classifies match strength (EXACT_UPI, EXACT_PAYEE, EXACT_SMS, or WEAK_MATCH)
   * to strictly control whether bulk auto-categorization is permitted.
   */
  static async learnCorrection(
    merchantName?: string | null,
    category?: string | null,
    originalSms?: string | null,
    smsHash?: string | null,
    sender?: string | null,
    bank?: string | null
  ): Promise<{
    category: string;
    matchType: MatchType;
    upiId: string | null;
    accountIdentifier: string | null;
    normalizedName: string | null;
    merchantName: string;
    smsHash: string | null;
  }> {
    if (!category) {
      throw new Error('Category is required for learning');
    }

    const finalMerchant = (merchantName && merchantName !== 'Unknown Merchant') ? merchantName.trim() : '';
    const normalized = this.normalizeMerchantName(finalMerchant);
    const upiId = this.extractUpiId(originalSms, finalMerchant);
    const db = DatabaseService.getDB();
    const now = new Date().toISOString();

    // Determine Match Type
    let matchType: MatchType = 'WEAK_MATCH';
    if (upiId) {
      matchType = 'EXACT_UPI';
    } else if (normalized && !this.isGenericName(normalized) && normalized.length >= 3) {
      matchType = 'EXACT_PAYEE';
    } else if (smsHash) {
      matchType = 'EXACT_SMS';
    }

    await new Promise<void>((resolve, reject) => {
      db.transaction(tx => {
        let findQuery = 'SELECT id FROM MerchantCategoryMapping WHERE 1=0';
        const findParams: any[] = [];

        if (upiId) {
          findQuery += ' OR upi_id = ?';
          findParams.push(upiId);
        }
        if (normalized && !this.isGenericName(normalized)) {
          findQuery += ' OR normalized_name = ?';
          findParams.push(normalized);
        }
        if (smsHash) {
          findQuery += ' OR sms_hash = ?';
          findParams.push(smsHash);
        }

        tx.executeSql(
          findQuery + ' LIMIT 1',
          findParams,
          (_, results) => {
            if (results.rows.length > 0) {
              const id = results.rows.item(0).id;
              tx.executeSql(
                `UPDATE MerchantCategoryMapping SET 
                  category = ?, 
                  merchant_name = COALESCE(NULLIF(?, ''), merchant_name),
                  normalized_name = COALESCE(NULLIF(?, ''), normalized_name),
                  upi_id = COALESCE(?, upi_id),
                  sms_hash = COALESCE(?, sms_hash), 
                  sender = COALESCE(?, sender),
                  mapping_type = ?,
                  confidence = 1.0,
                  updatedAt = ? 
                 WHERE id = ?`,
                [
                  category, 
                  finalMerchant || null, 
                  normalized || null, 
                  upiId || null, 
                  smsHash || null, 
                  sender || bank || null,
                  matchType,
                  now, 
                  id
                ],
                () => resolve(),
                (error) => { reject(error); return false; }
              );
            } else {
              const newId = 'mcm_' + Math.random().toString(36).substr(2, 9);
              tx.executeSql(
                `INSERT INTO MerchantCategoryMapping (
                  id, merchant_name, normalized_name, category, upi_id, account_identifier, sms_hash, sender, mapping_type, confidence, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  newId, 
                  finalMerchant || (upiId ? upiId : (normalized || 'Unknown Merchant')), 
                  normalized || (upiId ? upiId : 'unknown'), 
                  category, 
                  upiId || null, 
                  null, // Do NOT store user's source bank account number!
                  smsHash || null, 
                  sender || bank || null, 
                  matchType,
                  1.0, 
                  now, 
                  now
                ],
                () => resolve(),
                (error) => { reject(error); return false; }
              );
            }
          },
          (error) => { reject(error); return false; }
        );
      });
    });

    return {
      category,
      matchType,
      upiId,
      accountIdentifier: null,
      normalizedName: normalized,
      merchantName: finalMerchant,
      smsHash: smsHash || null
    };
  }

  static async learnMerchantCategory(merchantName: string, category: string): Promise<void> {
    await this.learnCorrection(merchantName, category);
  }

  /**
   * Purges invalid or corrupted mappings (e.g. mappings on user bank accounts or generic names).
   */
  static async cleanupFaultyMappings(): Promise<void> {
    const db = DatabaseService.getDB();
    return new Promise((resolve) => {
      db.transaction(tx => {
        // Delete mappings with populated account_identifier (which matched user source account)
        // or generic/empty normalized_name
        tx.executeSql(
          `DELETE FROM MerchantCategoryMapping 
           WHERE account_identifier IS NOT NULL 
              OR normalized_name IN ('unknown', 'null', 'undefined', 'bank', 'upi', 'payment', 'inr', 'rs', '')
              OR LENGTH(normalized_name) < 3`,
          [],
          () => {
            console.log('[CLEANUP] Faulty merchant category mappings removed');
            resolve();
          },
          () => { resolve(); return false; }
        );
      });
    });
  }

  static async deleteAll(): Promise<void> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'DELETE FROM MerchantCategoryMapping',
          [],
          () => {
            console.log(`[DELETE_ALL] Merchant category mappings deleted`);
            resolve();
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }
}
