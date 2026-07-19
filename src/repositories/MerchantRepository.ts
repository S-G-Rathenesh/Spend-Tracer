import { DatabaseService } from '../database/DatabaseService';
import { Merchant } from '../types/Merchant';

export class MerchantRepository {
  static async getAll(): Promise<Merchant[]> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql('SELECT * FROM MerchantCache ORDER BY name ASC', [], (_, results) => {
          let merchants = [];
          for (let i = 0; i < results.rows.length; i++) {
            merchants.push(results.rows.item(i));
          }
          resolve(merchants);
        }, (error) => { reject(error); return false; });
      });
    });
  }

  static async getById(id: string): Promise<Merchant | null> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql('SELECT * FROM MerchantCache WHERE id = ?', [id], (_, results) => {
          if (results.rows.length > 0) {
            resolve(results.rows.item(0));
          } else {
            resolve(null);
          }
        }, (error) => { reject(error); return false; });
      });
    });
  }

  static async insert(merchant: Merchant): Promise<void> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO MerchantCache (id, name, categoryId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
          [merchant.id, merchant.name, merchant.categoryId, merchant.createdAt, merchant.updatedAt],
          () => resolve(),
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async update(merchant: Merchant): Promise<void> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'UPDATE MerchantCache SET name = ?, categoryId = ?, updatedAt = ? WHERE id = ?',
          [merchant.name, merchant.categoryId, merchant.updatedAt, merchant.id],
          () => resolve(),
          (error) => { reject(error); return false; }
        );
      });
    });
  }
}
