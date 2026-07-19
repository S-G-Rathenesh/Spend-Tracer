import { DatabaseService } from '../database/DatabaseService';

export class ExpenseAnalytics {
  static async getWeeklySpending(): Promise<{ label: string, value: number }[]> {
    const db = DatabaseService.getDB();
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - 6)).toISOString().split('T')[0];
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT date, SUM(amount) as total 
           FROM Transactions 
           WHERE type = 'Debit' AND date >= ?
           GROUP BY date 
           ORDER BY date ASC`,
          [weekStart],
          (_, results) => {
            const data: { label: string, value: number }[] = [];
            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows.item(i);
              // Convert YYYY-MM-DD to short day name like "Mon"
              const dayStr = new Date(row.date).toLocaleDateString('en-US', { weekday: 'short' });
              data.push({ label: dayStr, value: row.total });
            }
            resolve(data);
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async getMonthlyTrend(): Promise<{ label: string, value: number }[]> {
    const db = DatabaseService.getDB();
    const now = new Date();
    // Get last 6 months
    const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 5)).toISOString().split('T')[0].substring(0, 7); 

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          `SELECT substr(date, 1, 7) as month, SUM(amount) as total 
           FROM Transactions 
           WHERE type = 'Debit' AND date >= ?
           GROUP BY month 
           ORDER BY month ASC`,
          [sixMonthsAgo + '-01'],
          (_, results) => {
            const data: { label: string, value: number }[] = [];
            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows.item(i);
              // Convert YYYY-MM to short month name like "Jan"
              const dateObj = new Date(row.month + '-01');
              const monthStr = dateObj.toLocaleDateString('en-US', { month: 'short' });
              data.push({ label: monthStr, value: row.total });
            }
            resolve(data);
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }
}
