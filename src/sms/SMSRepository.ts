import { DatabaseService } from '../database/DatabaseService';
import { IncomingSMS, SMSStatus } from './SMSModels';
import { Logger } from '../utils/Logger';

export class SMSRepository {
  static async insert(sms: IncomingSMS): Promise<void> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO IncomingSMS (id, sender, message, receivedAt, normalizedText, bank, isProcessed, processingStatus, predictedClass, confidence, reasons, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sms.id, sms.sender, sms.message, sms.receivedAt, sms.normalizedText, sms.bank,
            sms.isProcessed ? 1 : 0, sms.processingStatus, 
            sms.predictedClass || null, sms.confidence || null, sms.reasons ? JSON.stringify(sms.reasons) : null,
            sms.createdAt, sms.updatedAt
          ],
          () => resolve(),
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async getAllKeys(): Promise<Set<string>> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT sender, message, receivedAt FROM IncomingSMS`,
          [],
          (_, results) => {
            const keys = new Set<string>();
            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows.item(i);
              keys.add(`${row.sender}|${row.message}|${row.receivedAt}`);
            }
            resolve(keys);
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async insertBatch(smsList: IncomingSMS[]): Promise<void> {
    if (smsList.length === 0) return;
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        for (const sms of smsList) {
          tx.executeSql(
            `INSERT INTO IncomingSMS (id, sender, message, receivedAt, normalizedText, bank, isProcessed, processingStatus, predictedClass, confidence, reasons, createdAt, updatedAt) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              sms.id, sms.sender, sms.message, sms.receivedAt, sms.normalizedText, sms.bank,
              sms.isProcessed ? 1 : 0, sms.processingStatus,
              sms.predictedClass || null, sms.confidence || null, sms.reasons ? JSON.stringify(sms.reasons) : null,
              sms.createdAt, sms.updatedAt
            ]
          );
        }
      }, (error) => { reject(error); return false; }, () => resolve());
    });
  }

  static async updateStatus(id: string, status: SMSStatus, isProcessed: boolean): Promise<void> {
    const db = DatabaseService.getDB();
    const now = new Date().toISOString();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `UPDATE IncomingSMS SET processingStatus = ?, isProcessed = ?, updatedAt = ? WHERE id = ?`,
          [status, isProcessed ? 1 : 0, now, id],
          () => resolve(),
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async getLatest(limit: number = 100): Promise<IncomingSMS[]> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT * FROM IncomingSMS ORDER BY receivedAt DESC LIMIT ?`,
          [limit],
          (_, results) => {
            const data: IncomingSMS[] = [];
            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows.item(i);
              data.push({
                ...row,
                isProcessed: row.isProcessed === 1,
                reasons: row.reasons ? JSON.parse(row.reasons) : undefined
              });
            }
            resolve(data);
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async clearAll(): Promise<void> {
    const db = DatabaseService.getDB();
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql('DELETE FROM IncomingSMS', [], () => resolve(), (error) => { reject(error); return false; });
      });
    });
  }
}
