'use client';

/**
 * store/sessionStore.ts
 *
 * Zustand store for the IntelliCredit multi-stage pipeline session.
 * Follows the exact same pattern used by entityStore.ts and documentStore.ts.
 *
 * sessionId     – returned by POST /entity-onboard, required by all later stages
 * analysisResult – full response from POST /extract-data or GET /financial-analysis
 * loading        – true while any API call is in flight
 * error          – last error message, null when no error
 */

import { create } from 'zustand';
import { FullAnalysisResponse } from '@/types/analysis';

interface SessionStore {
  sessionId: string | null;
  analysisResult: FullAnalysisResponse | null;
  loading: boolean;
  error: string | null;
  // Actions
  setSessionId: (id: string) => void;
  setAnalysisResult: (result: FullAnalysisResponse) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  sessionId: null,
  analysisResult: null,
  loading: false,
  error: null,

  setSessionId: (id) => set({ sessionId: id, error: null }),
  setAnalysisResult: (result) => set({ analysisResult: result }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () =>
    set({ sessionId: null, analysisResult: null, loading: false, error: null }),
}));
