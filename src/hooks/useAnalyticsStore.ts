import { create } from 'zustand';
import { ExpenseAnalytics } from '../analytics/ExpenseAnalytics';
import { CategoryAnalytics } from '../analytics/CategoryAnalytics';
import { MerchantAnalytics } from '../analytics/MerchantAnalytics';
import { MessageAnalytics, MessageDistribution } from '../analytics/MessageAnalytics';
import { AnalyticsDateUtils, AnalyticsPeriod, DateRange } from '../analytics/AnalyticsDateUtils';
import { Logger } from '../utils/Logger';

export interface AnalyticsState {
  // Authoritative Filter State
  period: AnalyticsPeriod;
  selectedYear: number;
  selectedMonth: number; // 1 to 12
  typeFilter: 'ALL' | 'Debit' | 'Credit';
  categoryFilter: string | null;

  // Data
  weeklySpending: { label: string, value: number }[];
  monthlyTrend: { label: string, value: number }[];
  categoryDistribution: { label: string, value: number, color: string }[];
  topMerchants: { name: string, amount: number }[];
  totalIncome: number;
  totalExpense: number;
  messageDistribution: MessageDistribution | null;
  isLoading: boolean;
  error: string | null;

  // Computed Date Range
  dateRange: DateRange;

  // Actions
  setPeriod: (period: AnalyticsPeriod) => void;
  setSelectedYear: (year: number) => void;
  setSelectedMonth: (month: number) => void;
  setFilters: (typeFilter: 'ALL' | 'Debit' | 'Credit', categoryFilter: string | null) => void;
  resetFilters: () => void;
  fetchAnalytics: () => Promise<void>;
  
  // Helpers
  getSelectedMonthStr: () => string;
  getSelectedYearStr: () => string;
}

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  period: 'month',
  selectedYear: currentYear,
  selectedMonth: currentMonth,
  typeFilter: 'ALL',
  categoryFilter: null,

  weeklySpending: [],
  monthlyTrend: [],
  categoryDistribution: [],
  topMerchants: [],
  totalIncome: 0,
  totalExpense: 0,
  messageDistribution: null,
  isLoading: false,
  error: null,
  dateRange: AnalyticsDateUtils.getDateRange('month', currentYear, currentMonth),

  getSelectedMonthStr: () => {
    const s = get();
    if (s.period === 'all' || s.period === 'year') return 'All Time';
    return String(s.selectedMonth);
  },

  getSelectedYearStr: () => {
    const s = get();
    if (s.period === 'all') return '';
    return String(s.selectedYear);
  },

  setPeriod: (period: AnalyticsPeriod) => {
    const s = get();
    const range = AnalyticsDateUtils.getDateRange(period, s.selectedYear, s.selectedMonth);
    set({ period, dateRange: range });
    get().fetchAnalytics();
  },

  setSelectedYear: (year: number) => {
    const s = get();
    const range = AnalyticsDateUtils.getDateRange(s.period, year, s.selectedMonth);
    set({ selectedYear: year, dateRange: range });
    get().fetchAnalytics();
  },

  setSelectedMonth: (month: number) => {
    const s = get();
    const range = AnalyticsDateUtils.getDateRange(s.period, s.selectedYear, month);
    set({ selectedMonth: month, dateRange: range });
    get().fetchAnalytics();
  },

  setFilters: (typeFilter: 'ALL' | 'Debit' | 'Credit', categoryFilter: string | null) => {
    set({ typeFilter, categoryFilter });
    get().fetchAnalytics();
  },

  resetFilters: () => {
    set({ typeFilter: 'ALL', categoryFilter: null });
    get().fetchAnalytics();
  },

  fetchAnalytics: async () => {
    const { period, selectedYear, selectedMonth, categoryFilter, typeFilter } = get();
    const range = AnalyticsDateUtils.getDateRange(period, selectedYear, selectedMonth);
    set({ isLoading: true, error: null, dateRange: range });
    
    try {
      const [weekly, monthly, categories, merchants, summary, messageDist] = await Promise.all([
        ExpenseAnalytics.getWeeklySpending(range, categoryFilter),
        ExpenseAnalytics.getMonthlyTrend(range, period, selectedYear, categoryFilter),
        CategoryAnalytics.getCategoryDistribution(range, categoryFilter),
        MerchantAnalytics.getTopMerchants(5, range, categoryFilter),
        ExpenseAnalytics.getSummaryMetrics(range, categoryFilter),
        MessageAnalytics.getMessageDistribution(range)
      ]);

      // Apply typeFilter if only Debit or only Credit is requested
      let effectiveIncome = summary.income;
      let effectiveExpense = summary.expense;
      if (typeFilter === 'Debit') effectiveIncome = 0;
      if (typeFilter === 'Credit') effectiveExpense = 0;

      set({
        weeklySpending: typeFilter === 'Credit' ? [] : weekly,
        monthlyTrend: monthly,
        categoryDistribution: categories,
        topMerchants: merchants,
        totalIncome: effectiveIncome,
        totalExpense: effectiveExpense,
        messageDistribution: messageDist,
        isLoading: false
      });
    } catch (error: any) {
      Logger.error('AnalyticsStore', 'Failed to fetch analytics', error);
      set({ error: error.message, isLoading: false });
    }
  }
}));
