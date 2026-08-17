import { DatabaseService } from '../database/DatabaseService';

export class CategoryAnalytics {
  static async getCategoryDistribution(month?: string, year?: string): Promise<{ label: string, value: number, color: string }[]> {
    const db = DatabaseService.getDB();
    
    let query = `SELECT COALESCE(c.name, 'Uncategorized') as name, COALESCE(c.color, '#A1A1AA') as color, SUM(t.amount) as total FROM Transactions t LEFT JOIN Categories c ON t.categoryId = c.id WHERE t.type = 'Debit'`;
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
              if (row.total <= 0) continue; // Skip zero or negative values
              
              const rawLabel = (row.name || 'Uncategorized').trim();
              const key = rawLabel.toLowerCase();
              
              if (map.has(key)) {
                const existing = map.get(key)!;
                existing.value += row.total;
              } else {
                // Ensure properly capitalized Uncategorized if it's the default
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
