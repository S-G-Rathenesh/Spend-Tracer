import { DatabaseService } from '../database/DatabaseService';

export class SettingsRepository {
  static async get(key: string): Promise<string | null> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql('SELECT value FROM Settings WHERE key = ?', [key], (_, results) => {
          if (results.rows.length > 0) {
            resolve(results.rows.item(0).value);
          } else {
            resolve(null);
          }
        }, (error) => { reject(error); return false; });
      });
    });
  }

  static async set(key: string, value: string): Promise<void> {
    const db = DatabaseService.getDB();
    const now = new Date().toISOString();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'INSERT OR REPLACE INTO Settings (key, value, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
          [key, value, now, now],
          () => resolve(),
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async getAll(): Promise<Record<string, string>> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql('SELECT key, value FROM Settings', [], (_, results) => {
          let settings: Record<string, string> = {};
          for (let i = 0; i < results.rows.length; i++) {
            const item = results.rows.item(i);
            settings[item.key] = item.value;
          }
          resolve(settings);
        }, (error) => { reject(error); return false; });
      });
    });
  }
}
