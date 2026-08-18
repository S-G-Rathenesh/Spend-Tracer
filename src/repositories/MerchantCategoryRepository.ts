import { DatabaseService } from '../database/DatabaseService';

export interface MerchantCategoryMapping {
  id: string;
  merchant_name: string;
  normalized_name: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export class MerchantCategoryRepository {
  public static normalizeMerchantName(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static async getCategoryForMerchant(merchantName: string): Promise<string | null> {
    if (!merchantName) return null;
    const normalized = this.normalizeMerchantName(merchantName);
    const db = DatabaseService.getDB();
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'SELECT category FROM MerchantCategoryMapping WHERE normalized_name = ? LIMIT 1',
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

  static async learnMerchantCategory(merchantName: string, category: string): Promise<void> {
    if (!merchantName || !category) return;
    const normalized = this.normalizeMerchantName(merchantName);
    const db = DatabaseService.getDB();
    const now = new Date().toISOString();
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        // Check if exists
        tx.executeSql(
          'SELECT id FROM MerchantCategoryMapping WHERE normalized_name = ? LIMIT 1',
          [normalized],
          (_, results) => {
            if (results.rows.length > 0) {
              const id = results.rows.item(0).id;
              tx.executeSql(
                'UPDATE MerchantCategoryMapping SET category = ?, updatedAt = ? WHERE id = ?',
                [category, now, id],
                () => resolve(),
                (error) => { reject(error); return false; }
              );
            } else {
              const newId = 'mcm_' + Math.random().toString(36).substr(2, 9);
              tx.executeSql(
                'INSERT INTO MerchantCategoryMapping (id, merchant_name, normalized_name, category, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)',
                [newId, merchantName, normalized, category, now, now],
                () => resolve(),
                (error) => { reject(error); return false; }
              );
            }
          },
          (error) => { reject(error); return false; }
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
