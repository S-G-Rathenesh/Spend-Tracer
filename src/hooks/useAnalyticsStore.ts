import { create } from 'zustand';
import { ExpenseAnalytics } from '../analytics/ExpenseAnalytics';
import { CategoryAnalytics } from '../analytics/CategoryAnalytics';
import { MerchantAnalytics } from '../analytics/MerchantAnalytics';
import { Logger } from '../utils/Logger';

interface AnalyticsState {
  weeklySpending: { label: string, value: number }[];
  monthlyTrend: { label: string, value: number }[];
  categoryDistribution: { label: string, value: number, color: string }[];
  topMerchants: { name: string, amount: number }[];
  isLoading: boolean;
  error: string | null;
  fetchAnalytics: () => Promise<void>;
}

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  weeklySpending: [],
  monthlyTrend: [],
  categoryDistribution: [],
  topMerchants: [],
  isLoading: false,
  error: null,
  
  fetchAnalytics: async () => {
    set({ isLoading: true, error: null });
    try {
      const [weekly, monthly, categories, merchants] = await Promise.all([
        ExpenseAnalytics.getWeeklySpending(),
        ExpenseAnalytics.getMonthlyTrend(),
        CategoryAnalytics.getCategoryDistribution(),
        MerchantAnalytics.getTopMerchants(5)
      ]);

      set({
        weeklySpending: weekly,
        monthlyTrend: monthly,
        categoryDistribution: categories,
        topMerchants: merchants,
        isLoading: false
      });
    } catch (error: any) {
      Logger.error('AnalyticsStore', 'Failed to fetch analytics', error);
      set({ error: error.message, isLoading: false });
    }
  }
}));
