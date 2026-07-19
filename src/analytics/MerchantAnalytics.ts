import { DatabaseService } from '../database/DatabaseService';

export class MerchantAnalytics {
  static async getTopMerchants(limit: number = 5): Promise<{ name: string, amount: number }[]> {
    const db = DatabaseService.getDB();
    const now = new Date();
    const currentMonth = now.toISOString().split('T')[0].substring(0, 7);
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT m.name, SUM(t.amount) as total 
           FROM Transactions t
           JOIN MerchantCache m ON t.merchantId = m.id
           WHERE t.type = 'Debit' AND t.date >= ?
           GROUP BY t.merchantId 
           ORDER BY total DESC
           LIMIT ?`,
          [currentMonth + '-01', limit],
          (_, results) => {
            const data: { name: string, amount: number }[] = [];
            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows.item(i);
              data.push({ name: row.name, amount: row.total });
            }
            resolve(data);
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }
}
