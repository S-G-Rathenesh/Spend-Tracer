import { DatabaseService } from '../database/DatabaseService';

export interface MerchantCategoryMapping {
  id: string;
  merchant_name: string;
  normalized_name: string;
  category: string;
  upi_id?: string | null;
  account_identifier?: string | null;
  sms_hash?: string | null;
  sender?: string | null;
  confidence?: number;
  createdAt: string;
  updatedAt: string;
}

export class MerchantCategoryRepository {
  private static genericWords = new Set([
    'google', 'amazon', 'bank', 'upi', 'payment', 'phonepe', 'paytm', 'gpay',
    'alert', 'account', 'card', 'debit', 'credit', 'inr', 'rs', 'transfer',
    'unknown', 'na', 'null', 'undefined', 'txn', 'ref', 'vpa', 'dr', 'cr'
  ]);

  /**
   * Extracts UPI Virtual Payment Address (VPA) / UPI ID from text or merchant field.
   * e.g. "abc@upi", "user@okhdfcbank", "pradeep.s@okaxis", "sanjaiarasu9@oksbi"
   */
  public static extractUpiId(text?: string | null, merchant?: string | null): string | null {
    const combined = `${merchant || ''} ${text || ''}`.trim();
    if (!combined) return null;

    // Pattern 1: standard user@bank format
    const upiRegex = /\b([a-zA-Z0-9.\-_]{2,50}@[a-zA-Z0-9]{2,25})\b/i;
    const match = combined.match(upiRegex);
    if (match) {
      const upi = match[1].toLowerCase().trim();
      // Ensure it's not an email domain like @gmail.com unless used as VPA
      return upi;
    }

    // Pattern 2: VPA prefix e.g. "VPA sanjaiarasu9" or "to VPA abc"
    const vpaRegex = /(?:vpa|upi id|to upi)\s*[:\-]?\s*([a-zA-Z0-9.\-_@]{3,40})/i;
    const vpaMatch = combined.match(vpaRegex);
    if (vpaMatch) {
      return vpaMatch[1].toLowerCase().trim();
    }

    return null;
  }

  /**
   * Extracts masked account / card identifier (e.g. "XX1234", "1234").
   */
  public static extractAccountIdentifier(text?: string | null, bank?: string | null): string | null {
    const combined = `${bank || ''} ${text || ''}`.trim();
    if (!combined) return null;

    const accRegex = /(?:a\/c|acct|account|card|ending in)\s*(?:no\.?)?\s*([X\*]+\d{3,4}|\b\d{4}\b)/i;
    const match = combined.match(accRegex);
    if (match) {
      return match[1].toUpperCase().trim();
    }

    return null;
  }

  /**
   * Cleans and normalizes merchant/payee names by removing common business/location suffixes,
   * domain extensions, and punctuation while preserving the core brand/recipient identity.
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

    // Strip safe domain / corporate / location suffixes
    const suffixRegex = /\b(pvt ltd|private limited|ltd|limited|technologies|technology|services|service|india|in|com|retail|online|pay|upi|store|outlet|bangalore|mumbai|delhi|hyderabad|chennai)\b/g;
    const stripped = clean.replace(suffixRegex, '').replace(/\s+/g, ' ').trim();

    if (stripped.length >= 2) {
      return stripped;
    }

    return clean;
  }

  /**
   * Checks whether a normalized name is too generic to be safely used for broad text matching.
   */
  public static isGenericName(normalizedName: string): boolean {
    if (!normalizedName || normalizedName.length < 3) return true;
    return this.genericWords.has(normalizedName.toLowerCase());
  }

  /**
   * Direct category query for a given merchant name.
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
              OR normalized_name = ? 
           ORDER BY updatedAt DESC LIMIT 1`,
          [normalized, merchantName.toLowerCase().trim()],
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
   * Comprehensive lookup:
   * Priority:
   * 1. Exact UPI ID match (Strongest)
   * 2. Exact Account Identifier + Sender match
   * 3. Exact Normalized Merchant/Recipient match
   * 4. Exact SMS Hash / Fingerprint match
   * 5. Whole-word recipient match in SMS body (for specific, non-generic names)
   */
  static async getLearnedCategory(
    merchantName?: string | null,
    smsText?: string | null,
    smsHash?: string | null,
    sender?: string | null,
    bank?: string | null
  ): Promise<{ category: string; matchedMerchant?: string; confidence: number; isLearned: boolean } | null> {
    const db = DatabaseService.getDB();

    const upiId = this.extractUpiId(smsText, merchantName);
    const accountIdentifier = this.extractAccountIdentifier(smsText, bank);
    const normalized = merchantName ? this.normalizeMerchantName(merchantName) : null;

    // 1. Priority 1: Exact UPI ID Match
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
        return { category: catByUpi, matchedMerchant: merchantName || upiId, confidence: 1.0, isLearned: true };
      }
    }

    // 2. Priority 2: Exact Normalized Merchant / Recipient Name Match
    if (normalized && !this.isGenericName(normalized)) {
      const cat = await this.getCategoryForMerchant(merchantName!);
      if (cat) {
        return { category: cat, matchedMerchant: merchantName!, confidence: 1.0, isLearned: true };
      }
    }

    // 3. Priority 3: Exact Account Identifier Match
    if (accountIdentifier && (sender || bank)) {
      const catByAccount = await new Promise<string | null>((resolve) => {
        db.transaction(tx => {
          tx.executeSql(
            `SELECT category, merchant_name FROM MerchantCategoryMapping 
             WHERE account_identifier = ? AND (sender = ? OR sender IS NULL) 
             ORDER BY updatedAt DESC LIMIT 1`,
            [accountIdentifier, sender || bank || ''],
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
      if (catByAccount) {
        return { category: catByAccount, matchedMerchant: merchantName || accountIdentifier, confidence: 1.0, isLearned: true };
      }
    }

    // 4. Priority 4: Match by SMS Hash
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
        return { category: catByHash, matchedMerchant: merchantName || undefined, confidence: 1.0, isLearned: true };
      }
    }

    // 5. Priority 5: Whole-word match in SMS body (Strict: Non-generic only)
    if (smsText) {
      const textLower = smsText.toLowerCase();
      const allMappings = await this.getAllMappings();
      for (const mapping of allMappings) {
        if (mapping.upi_id && textLower.includes(mapping.upi_id.toLowerCase())) {
          return { category: mapping.category, matchedMerchant: mapping.merchant_name, confidence: 1.0, isLearned: true };
        }
        if (mapping.normalized_name && !this.isGenericName(mapping.normalized_name)) {
          const regex = new RegExp(`\\b${mapping.normalized_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (regex.test(textLower)) {
            return { category: mapping.category, matchedMerchant: mapping.merchant_name, confidence: 1.0, isLearned: true };
          }
        }
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
   * Persists a user's category correction for a merchant/account/recipient, original SMS, and SMS hash.
   * Returns details of the persisted mapping for auto-categorization of existing transactions.
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
    const accountIdentifier = this.extractAccountIdentifier(originalSms, bank || sender);
    const db = DatabaseService.getDB();
    const now = new Date().toISOString();

    await new Promise<void>((resolve, reject) => {
      db.transaction(tx => {
        // Look up by upi_id first, then normalized_name, then sms_hash
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
                  account_identifier = COALESCE(?, account_identifier),
                  sms_hash = COALESCE(?, sms_hash), 
                  sender = COALESCE(?, sender), 
                  confidence = 1.0,
                  updatedAt = ? 
                 WHERE id = ?`,
                [
                  category, 
                  finalMerchant || null, 
                  normalized || null, 
                  upiId || null, 
                  accountIdentifier || null, 
                  smsHash || null, 
                  sender || bank || null, 
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
                  id, merchant_name, normalized_name, category, upi_id, account_identifier, sms_hash, sender, confidence, createdAt, updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                  newId, 
                  finalMerchant || (upiId ? upiId : (normalized || 'Unknown Merchant')), 
                  normalized || (upiId ? upiId : 'unknown'), 
                  category, 
                  upiId || null, 
                  accountIdentifier || null, 
                  smsHash || null, 
                  sender || bank || null, 
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
      upiId,
      accountIdentifier,
      normalizedName: normalized,
      merchantName: finalMerchant,
      smsHash: smsHash || null
    };
  }

  static async learnMerchantCategory(merchantName: string, category: string): Promise<void> {
    await this.learnCorrection(merchantName, category);
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
