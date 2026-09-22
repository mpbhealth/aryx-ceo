import { describe, expect, it } from 'vitest';
import { cashPace, mrrLeavingWithin90, paceMonth } from './cashOutlook';
import { companySurvival, costPerSurvivor, SAME_WINDOW_NOTE } from './funnel';

describe('cash pace', () => {
  it('projects 90 days from the last complete month and does not invent leaving MRR', () => {
    expect(cashPace({
      collected: 100,
      vendor: 20,
      commissions: 10,
      pendingCommissions: 5,
      mrrLeaving90: 30,
    })).toBe(175);
    expect(cashPace({
      collected: 100,
      vendor: 20,
      commissions: 10,
      pendingCommissions: 5,
      mrrLeaving90: null,
    })).toBeNull();
    expect(mrrLeavingWithin90([])).toBeNull();
    expect(mrrLeavingWithin90([
      { bucket: '0_30', mrr: 10 },
      { bucket: '90_plus', mrr: 99 },
    ])).toBe(10);
  });

  it('prefers a complete month for the pace', () => {
    const paced = paceMonth([
      { period_start: '2026-09-01', collected: 1 },
      { period_start: '2026-08-01', collected: 9 },
    ], new Date('2026-09-22T00:00:00Z'));
    expect(paced.row?.period_start).toBe('2026-08-01');
    expect(paced.inProgress).toBe(false);
  });
});

describe('funnel', () => {
  it('prices day-90 survivors only when spend and the cohort both exist', () => {
    expect(costPerSurvivor(null, 10)).toBeNull();
    expect(costPerSurvivor(100, 0)).toBeNull();
    expect(costPerSurvivor(100, 4)).toBe(25);
    expect(companySurvival([])).toBeNull();
    expect(companySurvival([{ cohort_90: 4, survived_90: 3 }])).toEqual({ cohort: 4, survived: 3 });
    expect(SAME_WINDOW_NOTE).toContain('not the same people');
  });
});
