import { create } from 'zustand';
import { ExpenseAnalytics } from '../analytics/ExpenseAnalytics';
import { CategoryAnalytics } from '../analytics/CategoryAnalytics';
import { MerchantAnalytics } from '../analytics/MerchantAnalytics';
import { MessageAnalytics, MessageDistribution } from '../analytics/MessageAnalytics';
import { Logger } from '../utils/Logger';

interface AnalyticsState {
  weeklySpending: { label: string, value: number }[];
  monthlyTrend: { label: string, value: number }[];
  categoryDistribution: { label: string, value: number, color: string }[];
  topMerchants: { name: string, amount: number }[];
  totalIncome: number;
  totalExpense: number;
  messageDistribution: MessageDistribution | null;
  isLoading: boolean;
  error: string | null;
  selectedMonth: string;
  selectedYear: string;
  setSelectedMonth: (month: string) => void;
  setSelectedYear: (year: string) => void;
  fetchAnalytics: () => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  weeklySpending: [],
  monthlyTrend: [],
  categoryDistribution: [],
  topMerchants: [],
  totalIncome: 0,
  totalExpense: 0,
  messageDistribution: null,
  isLoading: false,
  error: null,
  selectedMonth: 'All Time',
  selectedYear: new Date().getFullYear().toString(),
  
  setSelectedMonth: (month: string) => set({ selectedMonth: month }),
  setSelectedYear: (year: string) => set({ selectedYear: year }),

  fetchAnalytics: async () => {
    set({ isLoading: true, error: null });
    const { selectedMonth, selectedYear } = useAnalyticsStore.getState();
    try {
      const [weekly, monthly, categories, merchants, summary, messageDist] = await Promise.all([
        ExpenseAnalytics.getWeeklySpending(selectedMonth, selectedYear),
        ExpenseAnalytics.getMonthlyTrend(selectedMonth, selectedYear),
        CategoryAnalytics.getCategoryDistribution(selectedMonth, selectedYear),
        MerchantAnalytics.getTopMerchants(5, selectedMonth, selectedYear),
        ExpenseAnalytics.getSummaryMetrics(selectedMonth, selectedYear),
        MessageAnalytics.getMessageDistribution(selectedMonth, selectedYear)
      ]);

      set({
        weeklySpending: weekly,
        monthlyTrend: monthly,
        categoryDistribution: categories,
        topMerchants: merchants,
        totalIncome: summary.income,
        totalExpense: summary.expense,
        messageDistribution: messageDist,
        isLoading: false
      });
    } catch (error: any) {
      Logger.error('AnalyticsStore', 'Failed to fetch analytics', error);
      set({ error: error.message, isLoading: false });
    }
  }
}));
