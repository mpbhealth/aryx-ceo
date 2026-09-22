import { describe, expect, it } from 'vitest';
import {
  churnNote,
  movementBriefDeltas,
  observedMonthlyChurn,
  ownerBriefSentence,
  pnlBriefDeltas,
  rankOwnerActions,
  snapshotBriefDelta,
  withFallbackCurrent,
} from './ownerBrief';

const today = new Date('2026-09-22T00:00:00Z');

describe('owner brief', () => {
  it('compares this month with the previous month and leaves a missing side blank', () => {
    const deltas = pnlBriefDeltas([
      { period_start: '2026-09-01', collected: 80, failed: 5, net_operating: 20 },
      { period_start: '2026-08-01', collected: 100, failed: 2, net_operating: 40 },
    ], today);
    expect(deltas.net.delta).toBe(-20);
    expect(deltas.failed.delta).toBe(3);
    expect(deltas.collected.current).toBe(80);
    expect(pnlBriefDeltas([{ period_start: '2026-09-01', collected: 1, failed: 0, net_operating: 1 }], today).net.delta).toBeNull();
  });

  it('diffs member movement and snapshot levels about seven days apart', () => {
    const movement = movementBriefDeltas([
      { month: '2026-09-01', enrollments: 10, terminations: 4 },
      { month: '2026-08-01', enrollments: 6, terminations: 1 },
    ], today);
    expect(movement.gained.delta).toBe(4);
    expect(movement.lost.delta).toBe(3);
    const tickets = snapshotBriefDelta([
      { metric_key: 'open_ticket_count', period_start: '2026-09-22', value: 8 },
      { metric_key: 'open_ticket_count', period_start: '2026-09-14', value: 5 },
      { metric_key: 'open_ticket_count', period_start: '2026-09-20', value: 7 },
    ], 'open_ticket_count', 'Open tickets');
    expect(tickets.current).toBe(8);
    expect(tickets.previous).toBe(5);
    expect(tickets.delta).toBe(3);
    const missing = snapshotBriefDelta([
      { metric_key: 'iq_term_soon_mrr', period_start: '2026-09-22', value: 1000 },
    ], 'iq_term_soon_mrr', 'MRR scheduled to leave');
    expect(missing.delta).toBeNull();
    expect(withFallbackCurrent(missing, null).current).toBe(1000);
  });

  it('ranks proposed actions, then billing fees, then term-soon, and stops at ten', () => {
    const actions = rankOwnerActions({
      actions: [
        { key: 'a', title: 'Call', dollars: 10, href: '/a' },
        { key: 'b', title: 'Save', dollars: 50, href: '/b' },
      ],
      billing: [
        { key: 'm', title: 'Member', dollars: 80, href: '/m' },
      ],
      termSoon: { title: 'Leaving', dollars: 200, href: '/enrollments' },
    }, 2);
    expect(actions.map((row) => row.key)).toEqual(['b', 'a']);
  });

  it('uses observed inactive over active and keeps the 3% default when history is empty', () => {
    expect(observedMonthlyChurn([], today)).toEqual({ rate: 0.03, source: 'default' });
    expect(observedMonthlyChurn([
      { fact_date: '2026-09-10', inactive_count: 9, active_count: 9 },
      { fact_date: '2026-08-10', inactive_count: 2, active_count: 10 },
    ], today)).toEqual({ rate: 0.2, source: 'observed' });
    expect(churnNote({ rate: 0.03, source: 'default' })).toContain('3% default');
    expect(churnNote({ rate: 0.2, source: 'observed' })).toContain('20.0% from EnrollFlow');
  });

  it('writes a sentence only from numbers that exist', () => {
    const pnl = pnlBriefDeltas([
      { period_start: '2026-09-01', collected: 80, failed: 5, net_operating: 20 },
      { period_start: '2026-08-01', collected: 100, failed: 2, net_operating: 40 },
    ], today);
    const movement = movementBriefDeltas([], today);
    const sentence = ownerBriefSentence({
      ...pnl,
      ...movement,
      termSoonMrr: snapshotBriefDelta([], 'iq_term_soon_mrr', 'MRR scheduled to leave'),
      openTickets: snapshotBriefDelta([], 'open_ticket_count', 'Open tickets'),
    }, (value) => `$${value}`, (value) => String(value));
    expect(sentence).toContain('Net is $20, $-20 versus last month');
    expect(sentence).not.toContain('Members gained');
    expect(ownerBriefSentence({
      ...movementBriefDeltas([], today),
      ...pnlBriefDeltas([], today),
      termSoonMrr: snapshotBriefDelta([], 'iq_term_soon_mrr', 'MRR scheduled to leave'),
      openTickets: snapshotBriefDelta([], 'open_ticket_count', 'Open tickets'),
    }, String, String)).toBe('No month-to-month warehouse comparison yet.');
  });
});
