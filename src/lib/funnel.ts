export const SAME_WINDOW_NOTE = 'Same-window counts. These are not the same people.';
export const COHORT_NOTE = 'Plans enrolled at least 90 days ago that are still active.';

export function costPerSurvivor(spend: number | null, survived90: number | null): number | null {
  if (spend == null || survived90 == null || survived90 <= 0) return null;
  return spend / survived90;
}

export function companySurvival(rows: Array<{ cohort_90: number; survived_90: number }>): { cohort: number; survived: number } | null {
  if (rows.length === 0) return null;
  return rows.reduce((sum, row) => ({
    cohort: sum.cohort + Number(row.cohort_90 || 0),
    survived: sum.survived + Number(row.survived_90 || 0),
  }), { cohort: 0, survived: 0 });
}
