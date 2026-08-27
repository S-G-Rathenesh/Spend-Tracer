import { DatabaseService } from '../database/DatabaseService';

export interface MerchantCategoryMapping {
  id: string;
  merchant_name: string;
  normalized_name: string;
  category: string;
  sms_hash?: string;
  sender?: string;
  createdAt: string;
  updatedAt: string;
}

export class MerchantCategoryRepository {
  /**
   * Cleans and normalizes merchant names by removing common business/location suffixes,
   * domain extensions, and punctuation while preserving the core brand identity.
   */
  public static normalizeMerchantName(name: string): string {
    if (!name) return '';
    let clean = name
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return '';

    // Strip safe domain / corporate / location suffixes
    const suffixRegex = /\b(pvt ltd|private limited|ltd|limited|technologies|technology|services|service|india|in|com|retail|online|pay|upi|store|outlet|bangalore|mumbai|delhi|hyderabad|chennai)\b/g;
    const stripped = clean.replace(suffixRegex, '').replace(/\s+/g, ' ').trim();

    if (stripped.length >= 2) {
      return stripped;
    }

    return clean;
  }

  /**
   * Direct category query for a given merchant name.
   */
  static async getCategoryForMerchant(merchantName: string): Promise<string | null> {
    if (!merchantName || merchantName === 'Unknown Merchant') return null;
    const normalized = this.normalizeMerchantName(merchantName);
    if (!normalized) return null;

    const db = DatabaseService.getDB();
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT category FROM MerchantCategoryMapping 
           WHERE normalized_name = ? 
              OR normalized_name = ? 
              OR ? LIKE normalized_name || '%'
           ORDER BY updatedAt DESC LIMIT 1`,
          [normalized, merchantName.toLowerCase().trim(), normalized],
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
   * Comprehensive lookup: checks merchant name, SMS fingerprint/hash, and whole-word learned merchant matches in SMS body.
   */
  static async getLearnedCategory(
    merchantName?: string | null,
    smsText?: string | null,
    smsHash?: string | null
  ): Promise<{ category: string; matchedMerchant?: string } | null> {
    const db = DatabaseService.getDB();

    // 1. First priority: Direct match by merchant name
    if (merchantName && merchantName !== 'Unknown Merchant') {
      const cat = await this.getCategoryForMerchant(merchantName);
      if (cat) {
        return { category: cat, matchedMerchant: merchantName };
      }
    }

    // 2. Second priority: Match by SMS Hash
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
        return { category: catByHash, matchedMerchant: merchantName || undefined };
      }
    }

    // 3. Third priority: Check if any learned merchant appears as a whole word in the SMS body
    if (smsText) {
      const textLower = smsText.toLowerCase();
      const allMappings = await this.getAllMappings();
      for (const mapping of allMappings) {
        if (mapping.normalized_name && mapping.normalized_name.length >= 2 && mapping.normalized_name !== 'unknown') {
          const regex = new RegExp(`\\b${mapping.normalized_name}\\b`, 'i');
          if (regex.test(textLower)) {
            return { category: mapping.category, matchedMerchant: mapping.merchant_name };
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
   * Persists a user's category correction for a merchant, original SMS, and SMS hash.
   */
  static async learnCorrection(
    merchantName?: string | null,
    category?: string | null,
    originalSms?: string | null,
    smsHash?: string | null,
    sender?: string | null
  ): Promise<void> {
    if (!category) return;
    const finalMerchant = (merchantName && merchantName !== 'Unknown Merchant') ? merchantName.trim() : '';
    const normalized = this.normalizeMerchantName(finalMerchant);
    const db = DatabaseService.getDB();
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        if (normalized) {
          tx.executeSql(
            'SELECT id FROM MerchantCategoryMapping WHERE normalized_name = ? LIMIT 1',
            [normalized],
            (_, results) => {
              if (results.rows.length > 0) {
                const id = results.rows.item(0).id;
                tx.executeSql(
                  'UPDATE MerchantCategoryMapping SET category = ?, sms_hash = COALESCE(?, sms_hash), sender = COALESCE(?, sender), updatedAt = ? WHERE id = ?',
                  [category, smsHash || null, sender || null, now, id],
                  () => resolve(),
                  (error) => { reject(error); return false; }
                );
              } else {
                const newId = 'mcm_' + Math.random().toString(36).substr(2, 9);
                tx.executeSql(
                  'INSERT INTO MerchantCategoryMapping (id, merchant_name, normalized_name, category, sms_hash, sender, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                  [newId, finalMerchant || normalized, normalized, category, smsHash || null, sender || null, now, now],
                  () => resolve(),
                  (error) => { reject(error); return false; }
                );
              }
            },
            (error) => { reject(error); return false; }
          );
        } else if (smsHash) {
          const newId = 'mcm_' + Math.random().toString(36).substr(2, 9);
          tx.executeSql(
            'INSERT INTO MerchantCategoryMapping (id, merchant_name, normalized_name, category, sms_hash, sender, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [newId, 'Unknown Merchant', 'unknown', category, smsHash, sender || null, now, now],
            () => resolve(),
            (error) => { reject(error); return false; }
          );
        } else {
          resolve();
        }
      });
    });
  }

  static async learnMerchantCategory(merchantName: string, category: string): Promise<void> {
    return this.learnCorrection(merchantName, category);
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
