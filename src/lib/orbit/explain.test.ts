import { describe, expect, it } from 'vitest';
import { formatPnlReply } from './snapshots';
import { snapshotForPath, withExplanation, wantsDeskBriefing, wantsExplain } from './explain';

describe('orbit explain', () => {
  it('maps Command, Finance, Tickets, and Advisors to live fact kinds', () => {
    expect(snapshotForPath('/home')).toBe('desk');
    expect(snapshotForPath('/finance')).toBe('pnl');
    expect(snapshotForPath('/tickets')).toBe('tickets');
    expect(snapshotForPath('/advisors')).toBe('advisors');
  });

  it('appends a fixed gloss without inventing numbers', () => {
    const facts = formatPnlReply({
      linked: false,
      hasRows: false,
      collected: 0,
      net: 0,
      period: 'mtd',
    });
    const explained = withExplanation(facts, 'pnl', true);
    expect(explained).toContain('EnrollFlow is not linked.');
    expect(explained).toContain('MTD collected: —');
    expect(explained).toContain('Collected is EnrollFlow billing');
    expect(explained).not.toMatch(/\$0/);
  });

  it('detects explain and desk briefing asks', () => {
    expect(wantsExplain('Explain this page')).toBe(true);
    expect(wantsDeskBriefing('Explain the desk.')).toBe(true);
    expect(wantsDeskBriefing("What's going on?")).toBe(true);
    expect(wantsDeskBriefing('Who has billing risk?')).toBe(false);
  });
});
