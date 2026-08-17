import { DatabaseService } from '../database/DatabaseService';

export class ExpenseAnalytics {
  static async getWeeklySpending(month?: string, year?: string): Promise<{ label: string, value: number }[]> {
    const db = DatabaseService.getDB();
    const now = new Date();
    let startDate = '';
    let endDate = '';
    
    if (year && month && month !== 'All Time') {
      const mStr = month.padStart(2, '0');
      // Last 7 days of the selected month
      const lastDay = new Date(parseInt(year), parseInt(month), 0);
      endDate = lastDay.toISOString().split('T')[0];
      const firstDay = new Date(lastDay);
      firstDay.setDate(lastDay.getDate() - 6);
      startDate = firstDay.toISOString().split('T')[0];
    } else if (year) {
      // Last 7 days of the year
      endDate = `${year}-12-31`;
      startDate = `${year}-12-25`;
    } else {
      // Last 7 days from today
      endDate = now.toISOString().split('T')[0];
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - 6);
      startDate = firstDay.toISOString().split('T')[0];
    }
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        let query = `SELECT date, SUM(amount) as total FROM Transactions WHERE type = 'Debit'`;
        const params: any[] = [];
        
        if (startDate) {
          query += ` AND date >= ?`;
          params.push(startDate);
        }
        if (endDate) {
          query += ` AND date <= ?`;
          params.push(endDate);
        }
        
        query += ` GROUP BY date ORDER BY date ASC`;
        
        tx.executeSql(
          query,
          params,
          (_, results) => {
            // Pre-fill 7 days array
            const data: { label: string, value: number, fullDate: string }[] = [];
            const current = new Date(startDate);
            const end = new Date(endDate);
            
            while (current <= end) {
              data.push({
                fullDate: current.toISOString().split('T')[0],
                label: current.toLocaleDateString('en-US', { weekday: 'short' }),
                value: 0
              });
              current.setDate(current.getDate() + 1);
            }
            
            // Map DB results
            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows.item(i);
              const match = data.find(d => d.fullDate === row.date);
              if (match) match.value = row.total;
            }
            
            // Remove fullDate from final response to match interface
            resolve(data.map(({ label, value }) => ({ label, value })));
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  static async getMonthlyTrend(month?: string, year?: string): Promise<{ label: string, value: number }[]> {
    const db = DatabaseService.getDB();
    
    let query = `SELECT substr(date, 1, 7) as month, SUM(amount) as total FROM Transactions WHERE type = 'Debit'`;
    const params: any[] = [];
    
    if (year) {
       query += ` AND substr(date, 1, 4) = ?`;
       params.push(year);
    } else {
       const now = new Date();
       const sixMonthsAgo = new Date(now.setMonth(now.getMonth() - 5)).toISOString().split('T')[0].substring(0, 7);
       query += ` AND date >= ?`;
       params.push(sixMonthsAgo + '-01');
    }
    
    query += ` GROUP BY month ORDER BY month ASC`;

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (_, results) => {
            const data: { label: string, value: number }[] = [];
            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows.item(i);
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

  static async getSummaryMetrics(month?: string, year?: string): Promise<{ income: number; expense: number }> {
    const db = DatabaseService.getDB();
    let query = `SELECT type, SUM(amount) as total FROM Transactions WHERE 1=1`;
    const params: any[] = [];
    
    if (year && month && month !== 'All Time') {
      const mStr = month.padStart(2, '0');
      query += ` AND date >= ? AND date <= ?`;
      params.push(`${year}-${mStr}-01`, `${year}-${mStr}-31`);
    } else if (year) {
      query += ` AND date >= ? AND date <= ?`;
      params.push(`${year}-01-01`, `${year}-12-31`);
    }
    
    query += ` GROUP BY type`;

    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        tx.executeSql(
          query,
          params,
          (_, results) => {
            let income = 0;
            let expense = 0;
            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows.item(i);
              if (row.type === 'Credit') income = row.total;
              else if (row.type === 'Debit') expense = row.total;
            }
            resolve({ income, expense });
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }
}
