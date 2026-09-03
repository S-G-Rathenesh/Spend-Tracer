export type AnalyticsPeriod = 'all' | 'month' | 'year';

export interface DateRange {
  startDate: string | null; // Format: 'YYYY-MM-DD' or null for all-time
  endDate: string | null;   // Format: 'YYYY-MM-DD' or null for all-time
}

export interface AnalyticsFilterState {
  period: AnalyticsPeriod;
  year: number;             // e.g. 2026
  month: number;            // 1 to 12
  typeFilter: 'ALL' | 'Debit' | 'Credit';
  categoryFilter: string | null;
}

export class AnalyticsDateUtils {
  static getDateRange(period: AnalyticsPeriod, year: number, month: number): DateRange {
    if (period === 'all') {
      return { startDate: null, endDate: null };
    }

    const y = year || new Date().getFullYear();

    if (period === 'year') {
      return {
        startDate: `${y}-01-01`,
        endDate: `${y}-12-31`
      };
    }

    // period === 'month'
    const m = Math.min(Math.max(month || (new Date().getMonth() + 1), 1), 12);
    const mStr = String(m).padStart(2, '0');
    // Compute exact last day of the month (28, 29, 30, 31)
    const lastDay = new Date(y, m, 0).getDate();
    const lastDayStr = String(lastDay).padStart(2, '0');

    return {
      startDate: `${y}-${mStr}-01`,
      endDate: `${y}-${mStr}-${lastDayStr}`
    };
  }

  static getPeriodLabel(period: AnalyticsPeriod, year: number, month: number): string {
    if (period === 'all') return 'overall';
    if (period === 'year') return `in ${year}`;
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const mName = monthNames[(month || 1) - 1] || '';
    return `in ${mName} ${year}`;
  }
}
