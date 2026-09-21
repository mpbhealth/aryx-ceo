import { describe, expect, it } from 'vitest';
import { money } from '@/lib/cos';
import {
  formatBillingRiskReply,
  formatOrbitPageReply,
  formatPnlReply,
  formatTicketReply,
} from './index';

describe('orbit presets match Command / Finance / Tickets / Advisors', () => {
  it('formats MTD/QTD/YTD P&L the same way Command and Finance money() do', () => {
    expect(formatPnlReply({
      linked: true,
      hasRows: true,
      collected: 1936.07,
      net: -114429.66,
      period: 'mtd',
    })).toBe(`MTD collected: ${money(1936.07)}\nNet operating income: ${money(-114429.66)}`);
    expect(formatPnlReply({
      linked: true,
      hasRows: true,
      collected: 746500.12,
      net: 630134.39,
      period: 'qtd',
    })).toContain(money(746500.12));
    expect(formatPnlReply({
      linked: true,
      hasRows: true,
      collected: 3228570.89,
      net: 3112205.16,
      period: 'ytd',
    })).toContain(money(3228570.89));
    expect(formatPnlReply({
      linked: false,
      hasRows: false,
      collected: 0,
      net: 0,
      period: 'mtd',
    })).toContain('EnrollFlow is not linked.');
  });

  it('formats Command ticket metrics and Tickets queue from the same warehouse rows', () => {
    expect(formatTicketReply({
      linked: true,
      hasSnap: true,
      open: 66,
      breached: 58,
      pending: null,
      slaPct: null,
      unassigned: 5,
      view: 'command',
    })).toBe('Open tickets: 66\nSLA breach: 58\nUnassigned: 5');
    const queue = formatTicketReply({
      linked: true,
      hasSnap: true,
      open: 66,
      breached: 58,
      pending: 15,
      slaPct: null,
      view: 'queue',
      queue: [{ ticket_number: '4097', title: 'App Loggin', status: 'new', priority: 'high' }],
    });
    expect(queue).toContain('Open now: 66');
    expect(queue).toContain('SLA breach: 58');
    expect(queue).toContain('#4097 App Loggin — new · high');
  });

  it('formats billing risk the same way Command and Advisors list members', () => {
    expect(formatBillingRiskReply({
      linked: true,
      hasRows: true,
      rows: [{
        display_name: 'Renata Okubo',
        member_key: 'f26e29fd-4a52-41ed-b3e3-d43013d039f4',
        monthly_fee: 448,
        risk_flag: 'past_due',
      }],
    })).toBe(`Billing risk:\n• Renata Okubo — ${money(448)} · past_due`);
  });

  it('maps this-page presets onto the four CEO routes', () => {
    expect(formatOrbitPageReply('/home').text).toMatch(/Command/);
    expect(formatOrbitPageReply('/finance').text).toMatch(/P&L/);
    expect(formatOrbitPageReply('/tickets').text).toMatch(/Support queue/);
    expect(formatOrbitPageReply('/advisors').text).toMatch(/Advisor books/);
  });
});
