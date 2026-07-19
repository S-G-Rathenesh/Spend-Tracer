import { create } from 'zustand';
import { Scam } from '../types/Scam';

interface ScamState {
  scamCount: number;
  recentScams: Scam[];
  isLoading: boolean;
  // This is a placeholder for Phase 3/4
}

export const useScamStore = create<ScamState>((set) => ({
  scamCount: 0,
  recentScams: [],
  isLoading: false,
}));
