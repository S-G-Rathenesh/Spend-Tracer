import { DatabaseService } from '../database/DatabaseService';
import { DateRange } from './AnalyticsDateUtils';

export class MerchantAnalytics {
  static async getTopMerchants(
    limit: number = 5,
    range: DateRange,
    categoryFilter?: string | null
  ): Promise<{ name: string, amount: number }[]> {
    const db = DatabaseService.getDB();
    
    let query = `SELECT m.name, SUM(t.amount) as total 
                 FROM Transactions t 
                 JOIN MerchantCache m ON t.merchantId = m.id 
                 WHERE t.type = 'Debit' AND t.status = 'COMPLETED'`;
    const params: any[] = [];
    
    // Strict adherence to range. When period === 'all' (range.startDate === null), no date filtering!
    if (range.startDate && range.endDate) {
      query += ` AND t.date >= ? AND t.date <= ?`;
      params.push(range.startDate, range.endDate);
    }
    if (categoryFilter) {
      query += ` AND t.categoryId = ?`;
      params.push(categoryFilter);
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
