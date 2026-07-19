import { DatabaseService } from '../database/DatabaseService';
import { Scam } from '../types/Scam';

export class ScamRepository {
  static async getAll(): Promise<Scam[]> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql('SELECT * FROM ScamHistory ORDER BY date DESC', [], (_, results) => {
          let scams = [];
          for (let i = 0; i < results.rows.length; i++) {
            scams.push(results.rows.item(i));
          }
          resolve(scams);
        }, (error) => { reject(error); return false; });
      });
    });
  }

  static async insert(scam: Scam): Promise<void> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO ScamHistory (id, smsBody, confidence, reason, scamType, date, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [scam.id, scam.smsBody, scam.confidence, scam.reason, scam.scamType, scam.date, scam.createdAt, scam.updatedAt],
          () => resolve(),
          (error) => { reject(error); return false; }
        );
      });
    });
  }
}
