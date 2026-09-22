import { describe, expect, it } from 'vitest';
import {
  contributionNet,
  earlyCancelPct,
  enrollmentStatusCounts,
  firstPayRate,
  isRevenueBlockingCategory,
  latestFutureActive,
  qualityFromGroups,
  rollupDirectUplines,
  survivalForLives,
} from './bookQuality';

describe('book quality', () => {
  const today = '2026-09-22';

  it('counts a member in a window only after they have been enrolled that long', () => {
    const summary = survivalForLives([
      { enrolledOn: '2026-09-01', inactiveOn: null, status: 'Active' },
      { enrolledOn: '2026-08-01', inactiveOn: null, status: 'Active' },
      { enrolledOn: '2026-05-01', inactiveOn: '2026-06-01', status: 'Inactive' },
      { enrolledOn: '2026-01-01', inactiveOn: '2026-08-01', status: 'Inactive' },
    ], today);
    expect(summary.cohort30).toBe(3);
    expect(summary.survived30).toBe(1);
    expect(summary.cohort90).toBe(2);
    expect(summary.survived90).toBe(0);
    expect(summary.cohortSize).toBe(2);
  });

  it('keeps a still-active member who has no inactive date inside the window', () => {
    const summary = survivalForLives([
      { enrolledOn: '2026-01-01', inactiveOn: null, status: 'Future Active' },
    ], today);
    expect(summary.survived90).toBe(1);
  });

  it('rates first payment from bills and leaves it null when there are none', () => {
    expect(firstPayRate([])).toBeNull();
    expect(firstPayRate([
      { enrollmentId: 'a', status: 'Failed' },
      { enrollmentId: 'a', status: 'Paid' },
      { enrollmentId: 'b', status: 'Pending' },
    ])).toBe(50);
  });

  it('uses carrier net when product commission is absent', () => {
    expect(contributionNet(100, 40, null)).toBe(60);
    expect(contributionNet(100, 40, 15)).toBe(45);
    const rows = qualityFromGroups(
      new Map([['plan', [{ enrolledOn: '2026-01-01', inactiveOn: null, status: 'Active' }]]]),
      today,
      new Map([['plan', { mrr: 100, vendor: 40, commissions: null }]]),
      null,
    );
    expect(rows[0]?.contribution).toBe(60);
    expect(rows[0]?.commissionApplied).toBe(false);
    expect(rows[0]?.firstPaySuccessPct).toBeNull();
  });

  it('rolls direct children only and skips a missing parent list', () => {
    expect(rollupDirectUplines([], [], [])).toEqual([]);
    const rows = rollupDirectUplines(
      [
        { id: 'parent', parentId: null, name: 'Parent' },
        { id: 'child', parentId: 'parent', name: 'Child' },
        { id: 'grand', parentId: 'child', name: 'Grand' },
      ],
      [
        { advisorKey: 'child', mrr: 50, netMrr: 20, activeMembers: 2 },
        { advisorKey: 'grand', mrr: 80, netMrr: 10, activeMembers: 1 },
        { advisorKey: 'parent', mrr: 10, netMrr: 4, activeMembers: 1 },
      ],
      [{ key: 'child', cohort90: 4, survived90: 2 }],
    );
    expect(rows).toHaveLength(2);
    const parent = rows.find((row) => row.uplineKey === 'parent');
    expect(parent?.downlineCount).toBe(1);
    expect(parent?.mrr).toBe(50);
    expect(parent?.mrrSharePct).toBeCloseTo(35.7, 1);
    expect(parent?.earlyCancelPct).toBe(50);
    expect(earlyCancelPct(0, 0)).toBeNull();
  });

  it('counts waiting enrollments and blocks billing categories', () => {
    expect(enrollmentStatusCounts(['Active', 'Future Active', 'Pending'])).toEqual({
      active: 1,
      futureActive: 1,
      other: 1,
    });
    expect(latestFutureActive([
      { org_id: 'a', fact_date: '2026-09-01', future_active_count: 2 },
      { org_id: 'a', fact_date: '2026-09-22', future_active_count: 4 },
      { org_id: 'b', fact_date: '2026-09-20', future_active_count: 1 },
    ])).toBe(5);
    expect(isRevenueBlockingCategory('Billing')).toBe(true);
    expect(isRevenueBlockingCategory('Enrollment queue')).toBe(true);
    expect(isRevenueBlockingCategory('Laptop')).toBe(false);
  });
});
