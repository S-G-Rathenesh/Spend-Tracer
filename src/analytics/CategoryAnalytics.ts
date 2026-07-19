import { DatabaseService } from '../database/DatabaseService';

export class CategoryAnalytics {
  static async getCategoryDistribution(): Promise<{ label: string, value: number, color: string }[]> {
    const db = DatabaseService.getDB();
    const now = new Date();
    // Usually category distribution is for current month
    const currentMonth = now.toISOString().split('T')[0].substring(0, 7);
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT c.name, c.color, SUM(t.amount) as total 
           FROM Transactions t
           JOIN Categories c ON t.categoryId = c.id
           WHERE t.type = 'Debit' AND t.date >= ?
           GROUP BY t.categoryId 
           ORDER BY total DESC`,
          [currentMonth + '-01'],
          (_, results) => {
            const data: { label: string, value: number, color: string }[] = [];
            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows.item(i);
              data.push({ label: row.name, value: row.total, color: row.color });
            }
            resolve(data);
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }
}
