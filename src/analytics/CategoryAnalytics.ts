import { DatabaseService } from '../database/DatabaseService';
import { DateRange } from './AnalyticsDateUtils';

export class CategoryAnalytics {
  static async getCategoryDistribution(
    range: DateRange,
    categoryFilter?: string | null
  ): Promise<{ label: string, value: number, color: string }[]> {
    const db = DatabaseService.getDB();
    
    let query = `SELECT COALESCE(c.name, 'Uncategorized') as name, 
                        COALESCE(c.color, '#A1A1AA') as color, 
                        SUM(t.amount) as total 
                 FROM Transactions t 
                 LEFT JOIN Categories c ON t.categoryId = c.id 
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
    
    query += ` GROUP BY t.categoryId ORDER BY total DESC`;

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (_, results) => {
            const map = new Map<string, { label: string, value: number, color: string }>();
            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows.item(i);
              if (row.total <= 0) continue;
              
              const rawLabel = (row.name || 'Uncategorized').trim();
              const key = rawLabel.toLowerCase();
              
              if (map.has(key)) {
                const existing = map.get(key)!;
                existing.value += row.total;
              } else {
                const label = key === 'uncategorized' ? 'Uncategorized' : rawLabel;
                map.set(key, { label, value: row.total, color: row.color });
              }
            }
            const data = Array.from(map.values()).sort((a, b) => b.value - a.value);
            resolve(data);
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }
}
