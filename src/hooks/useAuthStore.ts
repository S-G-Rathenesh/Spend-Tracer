import { create } from 'zustand';
import { FirebaseAuthService } from '../services/FirebaseAuthService';

interface User {
  uid: string;
  email: string | null;
  displayName?: string | null;
  photoURL?: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: string; code?: string }>;
  updateUserDisplayName: (name: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true, // true by default to show splash screen while checking auth
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: async () => {
    await FirebaseAuthService.logout();
    set({ user: null });
  },
  deleteAccount: async () => {
    const result = await FirebaseAuthService.deleteAccount();
    if (result.success) {
      set({ user: null });
    }
    return result;
  },
  updateUserDisplayName: (name: string) => set((state) => ({ 
    user: state.user ? { ...state.user, displayName: name } : null 
  })),
}));
