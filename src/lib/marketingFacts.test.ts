import { describe, expect, it } from 'vitest';
import {
  conversionRate,
  formatFact,
  sourceLabel,
  sumTraffic,
  trafficByDay,
  trafficBySource,
} from './marketingFacts';

const rows = [
  { fact_date: '2026-09-10', source: 'ga4', sessions: 100, users: 80, pageviews: 240, conversions: 4 },
  { fact_date: '2026-09-10', source: 'direct', sessions: 20, users: 18, pageviews: 30, conversions: 1 },
  { fact_date: '2026-09-11', source: 'ga4', sessions: 50, users: 40, pageviews: 90, conversions: 0 },
];

describe('marketingFacts', () => {
  it('sums warehouse traffic without inventing zeros from missing rows', () => {
    expect(sumTraffic(rows)).toEqual({ sessions: 170, users: 138, pageviews: 360, conversions: 5, leads: 0, newMembers: 0 });
    expect(sumTraffic([])).toEqual({ sessions: 0, users: 0, pageviews: 0, conversions: 0, leads: 0, newMembers: 0 });
  });

  it('groups by source and day', () => {
    expect(trafficBySource(rows)[0]).toMatchObject({ source: 'ga4', sessions: 150 });
    expect(trafficByDay(rows)).toHaveLength(2);
    expect(trafficByDay(rows)[0].sessions).toBe(120);
  });

  it('formats conversion rate and GA source labels', () => {
    expect(conversionRate(5, 170)).toBe('2.9%');
    expect(conversionRate(1, 0)).toBe('—');
    expect(sourceLabel('ga4')).toBe('Google Analytics 4');
  });

  it('does not invent zeros when traffic is unlinked or empty', () => {
    const n = (value: number) => String(value);
    expect(formatFact(n, { linked: false, hasRows: false, value: 0 })).toBe('—');
    expect(formatFact(n, { linked: true, loading: true, hasRows: false, value: 0 })).toBe('…');
    expect(formatFact(n, { linked: true, hasRows: false, value: 0 })).toBe('—');
    expect(formatFact(n, { linked: true, hasRows: true, value: 0 })).toBe('0');
  });
});
