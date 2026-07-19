import { create } from 'zustand';
import { Transaction } from '../types/Transaction';
import { TransactionRepository, TransactionFilter } from '../repositories/TransactionRepository';
import { Logger } from '../utils/Logger';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  fetchTransactions: (filter?: TransactionFilter) => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,
  error: null,
  
  fetchTransactions: async (filter = {}) => {
    set({ isLoading: true, error: null });
    try {
      const data = await TransactionRepository.getTransactions(filter);
      set({ transactions: data, isLoading: false });
    } catch (error: any) {
      Logger.error('TransactionStore', 'Failed to fetch transactions', error);
      set({ error: error.message, isLoading: false });
    }
  },

  addTransaction: async (transaction: Transaction) => {
    set({ isLoading: true, error: null });
    try {
      await TransactionRepository.insert(transaction);
      await get().fetchTransactions(); // Re-fetch to update list
    } catch (error: any) {
      Logger.error('TransactionStore', 'Failed to add transaction', error);
      set({ error: error.message, isLoading: false });
    }
  },

  updateTransaction: async (transaction: Transaction) => {
    set({ isLoading: true, error: null });
    try {
      await TransactionRepository.update(transaction);
      await get().fetchTransactions();
    } catch (error: any) {
      Logger.error('TransactionStore', 'Failed to update transaction', error);
      set({ error: error.message, isLoading: false });
    }
  },

  deleteTransaction: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await TransactionRepository.delete(id);
      await get().fetchTransactions();
    } catch (error: any) {
      Logger.error('TransactionStore', 'Failed to delete transaction', error);
      set({ error: error.message, isLoading: false });
    }
  }
}));
