import { preferCompleteMonth } from './forecast';

export interface CashPaceInput {
  collected: number;
  vendor: number;
  commissions: number;
  pendingCommissions: number;
  mrrLeaving90: number | null;
}

export function mrrLeavingWithin90(rows: Array<{ bucket: string; mrr: number }>): number | null {
  if (rows.length === 0) return null;
  return rows
    .filter((row) => row.bucket !== '90_plus')
    .reduce((sum, row) => sum + Number(row.mrr || 0), 0);
}

export function cashPace(input: CashPaceInput): number | null {
  if (input.mrrLeaving90 == null) return null;
  return (
    Number(input.collected || 0) * 3
    - Number(input.vendor || 0) * 3
    - Number(input.commissions || 0) * 3
    - Number(input.pendingCommissions || 0)
    - Number(input.mrrLeaving90 || 0)
  );
}

export function paceMonth<T extends { period_start?: string }>(
  rows: T[],
  today = new Date(),
): { row: T | null; inProgress: boolean } {
  const picked = preferCompleteMonth(rows, today);
  const row = picked[0] || null;
  if (!row) return { row: null, inProgress: false };
  const current = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;
  return { row, inProgress: String(row.period_start || '').slice(0, 7) === current };
}
