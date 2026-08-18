import { DatabaseService } from '../database/DatabaseService';

export class MerchantAnalytics {
  static async getTopMerchants(limit: number = 5, month?: string, year?: string): Promise<{ name: string, amount: number }[]> {
    const db = DatabaseService.getDB();
    
    let query = `SELECT m.name, SUM(t.amount) as total FROM Transactions t JOIN MerchantCache m ON t.merchantId = m.id WHERE t.type = 'Debit' AND t.status = 'COMPLETED'`;
    const params: any[] = [];
    
    if (year && month && month !== 'All Time') {
      const mStr = month.padStart(2, '0');
      query += ` AND t.date >= ? AND t.date <= ?`;
      params.push(`${year}-${mStr}-01`, `${year}-${mStr}-31`);
    } else if (year) {
      query += ` AND t.date >= ? AND t.date <= ?`;
      params.push(`${year}-01-01`, `${year}-12-31`);
    } else {
      const now = new Date();
      const currentMonth = now.toISOString().split('T')[0].substring(0, 7);
      query += ` AND t.date >= ?`;
      params.push(currentMonth + '-01');
    }
    
    query += ` GROUP BY t.merchantId ORDER BY total DESC LIMIT ?`;
    params.push(limit);

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          query,
          params,
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
