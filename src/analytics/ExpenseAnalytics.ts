import { DatabaseService } from '../database/DatabaseService';
import { DateRange, AnalyticsPeriod } from './AnalyticsDateUtils';

export class ExpenseAnalytics {
  /**
   * Weekly spending day-of-week breakdown (Mon - Sun) for the authoritative date range.
   */
  static async getWeeklySpending(
    range: DateRange,
    categoryFilter?: string | null
  ): Promise<{ label: string, value: number }[]> {
    const db = DatabaseService.getDB();
    
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        let query = `SELECT strftime('%w', date) as dayOfWeek, SUM(amount) as total 
                     FROM Transactions 
                     WHERE type = 'Debit' AND status = 'COMPLETED'`;
        const params: any[] = [];
        
        if (range.startDate && range.endDate) {
          query += ` AND date >= ? AND date <= ?`;
          params.push(range.startDate, range.endDate);
        }
        if (categoryFilter) {
          query += ` AND categoryId = ?`;
          params.push(categoryFilter);
        }
        
        query += ` GROUP BY dayOfWeek ORDER BY dayOfWeek ASC`;
        
        tx.executeSql(
          query,
          params,
          (_, results) => {
            // Days mapping: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
            const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const data = dayLabels.map(label => ({ label, value: 0 }));
            
            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows.item(i);
              const dayIdx = parseInt(row.dayOfWeek, 10);
              if (dayIdx >= 0 && dayIdx <= 6) {
                data[dayIdx].value = row.total || 0;
              }
            }
            
            // Reorder to Mon - Sun for standard display
            const reordered = [data[1], data[2], data[3], data[4], data[5], data[6], data[0]];
            resolve(reordered);
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  /**
   * Monthly trend based on the authoritative period:
   * - Year: Shows all 12 months for that year (Jan - Dec)
   * - Month: Shows the 12 months for that year with data
   * - All: Shows monthly progression across all recorded time
   */
  static async getMonthlyTrend(
    range: DateRange,
    period: AnalyticsPeriod,
    year: number,
    categoryFilter?: string | null
  ): Promise<{ label: string, value: number }[]> {
    const db = DatabaseService.getDB();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    if (period === 'year' || period === 'month') {
      const targetYear = String(year);
      return new Promise((resolve, reject) => {
        db.transaction(tx => {
          let query = `SELECT substr(date, 6, 2) as monthNum, SUM(amount) as total 
                       FROM Transactions 
                       WHERE type = 'Debit' AND status = 'COMPLETED' AND substr(date, 1, 4) = ?`;
          const params: any[] = [targetYear];
          
          if (categoryFilter) {
            query += ` AND categoryId = ?`;
            params.push(categoryFilter);
          }
          
          query += ` GROUP BY monthNum ORDER BY monthNum ASC`;
          
          tx.executeSql(
            query,
            params,
            (_, results) => {
              const data = monthNames.map(label => ({ label, value: 0 }));
              for (let i = 0; i < results.rows.length; i++) {
                const row = results.rows.item(i);
                const mIdx = parseInt(row.monthNum, 10) - 1;
                if (mIdx >= 0 && mIdx < 12) {
                  data[mIdx].value = row.total || 0;
                }
              }
              resolve(data);
            },
            (error) => { reject(error); return false; }
          );
        });
      });
    }

    // period === 'all'
    return new Promise((resolve, reject) => {
      db.transaction(tx => {
        let query = `SELECT substr(date, 1, 7) as monthKey, SUM(amount) as total 
                     FROM Transactions 
                     WHERE type = 'Debit' AND status = 'COMPLETED'`;
        const params: any[] = [];
        
        if (categoryFilter) {
          query += ` AND categoryId = ?`;
          params.push(categoryFilter);
        }
        
        query += ` GROUP BY monthKey ORDER BY monthKey ASC LIMIT 12`;
        
        tx.executeSql(
          query,
          params,
          (_, results) => {
            const data: { label: string, value: number }[] = [];
            for (let i = 0; i < results.rows.length; i++) {
              const row = results.rows.item(i);
              const [y, m] = row.monthKey.split('-');
              const mIdx = parseInt(m, 10) - 1;
              const label = `${monthNames[mIdx]} '${y.slice(2)}`;
              data.push({ label, value: row.total || 0 });
            }
            if (data.length === 0) {
              resolve(monthNames.slice(0, 6).map(label => ({ label, value: 0 })));
            } else {
              resolve(data);
            }
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }

  /**
   * Authoritative summary metrics (Income, Expense, Net Cash Flow) for the date range.
   */
  static async getSummaryMetrics(
    range: DateRange,
    categoryFilter?: string | null
  ): Promise<{ income: number; expense: number }> {
    const db = DatabaseService.getDB();
    let query = `SELECT type, SUM(amount) as total FROM Transactions WHERE status = 'COMPLETED'`;
    const params: any[] = [];
    
    if (range.startDate && range.endDate) {
      query += ` AND date >= ? AND date <= ?`;
      params.push(range.startDate, range.endDate);
    }
    if (categoryFilter) {
      query += ` AND categoryId = ?`;
      params.push(categoryFilter);
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
              if (row.type === 'Credit') income = row.total || 0;
              else if (row.type === 'Debit') expense = row.total || 0;
            }
            resolve({ income, expense });
          },
          (error) => { reject(error); return false; }
        );
      });
    });
  }
}
