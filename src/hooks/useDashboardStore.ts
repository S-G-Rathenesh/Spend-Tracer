import { create } from 'zustand';
import { Transaction } from '../types/Transaction';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { Logger } from '../utils/Logger';

interface DashboardState {
  todaySpending: number;
  monthlySpending: number;
  totalSpending: number;
  monthlyIncome: number;
  netBalance: number;
  recentTransactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  fetchDashboardData: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  todaySpending: 0,
  monthlySpending: 0,
  totalSpending: 0,
  monthlyIncome: 0,
  netBalance: 0,
  recentTransactions: [],
  isLoading: false,
  error: null,
  
  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    try {
      // In a real app, these would ideally be optimized SQL queries
      // For now, we fetch all and calculate in JS, or we can use specific queries.
      // To adhere to 'calculate from SQLite only' for analytics, we should use specific queries,
      // but for Dashboard, we can just use the TransactionRepository and filter.
      // Let's optimize by using TransactionRepository filter.
      
      const now = new Date();
      const todayString = now.toISOString().split('T')[0];
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      const allData = await TransactionRepository.getTransactions(); // Or add specific aggregation methods
      
      let todaySpending = 0;
      let monthlySpending = 0;
      let totalSpending = 0;
      let monthlyIncome = 0;

      allData.forEach(t => {
        if (t.type === 'Debit') {
          totalSpending += t.amount;
          if (t.date === todayString) todaySpending += t.amount;
          if (t.date >= startOfMonth) monthlySpending += t.amount;
        } else {
          if (t.date >= startOfMonth) monthlyIncome += t.amount;
        }
      });

      const netBalance = monthlyIncome - monthlySpending;
      const recentTransactions = await TransactionRepository.getTransactions({ limit: 5 });

      set({
        todaySpending,
        monthlySpending,
        totalSpending,
        monthlyIncome,
        netBalance,
        recentTransactions,
        isLoading: false
      });
    } catch (error: any) {
      Logger.error('DashboardStore', 'Failed to fetch dashboard data', error);
      set({ error: error.message, isLoading: false });
    }
  }
}));
