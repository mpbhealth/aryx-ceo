import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PeriodGrain, PeriodKey } from '@/lib/cos';
import { useAuth } from './AuthContext';

type DeskPeriodState = {
  period: PeriodKey;
  customStart: string;
  customEnd: string;
  pnlGrain: PeriodGrain | null;
};

type DeskPeriodValue = DeskPeriodState & {
  setPeriod: (period: PeriodKey) => void;
  setCustomRange: (start: string, end: string) => void;
  setPnlGrain: (grain: PeriodGrain) => void;
};

const DEFAULT_STATE: DeskPeriodState = {
  period: 'mtd',
  customStart: '',
  customEnd: '',
  pnlGrain: null,
};

const DeskPeriodContext = createContext<DeskPeriodValue | undefined>(undefined);

function readState(key: string): DeskPeriodState {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<DeskPeriodState>;
    const period = parsed.period;
    if (period !== 'mtd' && period !== 'qtd' && period !== 'ytd' && period !== 'custom') {
      return DEFAULT_STATE;
    }
    const pnlGrain = parsed.pnlGrain;
    return {
      period,
      customStart: typeof parsed.customStart === 'string' ? parsed.customStart : '',
      customEnd: typeof parsed.customEnd === 'string' ? parsed.customEnd : '',
      pnlGrain: pnlGrain === 'month' || pnlGrain === 'quarter' || pnlGrain === 'year' ? pnlGrain : null,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function DeskPeriodProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const storageKey = `cos-desk-period:${user?.id || 'anon'}`;

  const stored = useQuery({
    queryKey: ['cos-desk-period', storageKey],
    queryFn: async () => readState(storageKey),
  });

  const state = stored.data || DEFAULT_STATE;

  const persist = useCallback((next: DeskPeriodState) => {
    window.sessionStorage.setItem(storageKey, JSON.stringify(next));
    queryClient.setQueryData(['cos-desk-period', storageKey], next);
  }, [queryClient, storageKey]);

  const setPeriod = useCallback((period: PeriodKey) => {
    persist({ ...state, period, pnlGrain: null });
  }, [persist, state]);

  const setPnlGrain = useCallback((pnlGrain: PeriodGrain) => {
    persist({ ...state, pnlGrain });
  }, [persist, state]);

  const setCustomRange = useCallback((customStart: string, customEnd: string) => {
    persist({ period: 'custom', customStart, customEnd });
  }, [persist]);

  const value = useMemo<DeskPeriodValue>(() => ({
    ...state,
    setPeriod,
    setCustomRange,
    setPnlGrain,
  }), [setCustomRange, setPeriod, setPnlGrain, state]);

  return <DeskPeriodContext.Provider value={value}>{children}</DeskPeriodContext.Provider>;
}

export function useDeskPeriod(): DeskPeriodValue {
  const ctx = useContext(DeskPeriodContext);
  if (!ctx) throw new Error('useDeskPeriod must be used within DeskPeriodProvider');
  return ctx;
}
