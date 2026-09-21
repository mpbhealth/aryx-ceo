import { describe, expect, it } from 'vitest';
import { formatOrbitPageReply } from './page-reply';
import {
  formatAdvisorReply,
  formatBillingRiskReply,
  formatEnrollmentReply,
  formatPnlReply,
  formatTicketReply,
  grainForOrbitPnl,
  periodLabel,
  ticketViewForPath,
} from './snapshots';

describe('orbit snapshot formatters', () => {
  it('never invents $0 when P&L is unlinked or empty', () => {
    expect(formatPnlReply({
      linked: false,
      hasRows: false,
      collected: 0,
      net: 0,
      period: 'mtd',
    })).toContain('EnrollFlow is not linked.');
    expect(formatPnlReply({
      linked: false,
      hasRows: false,
      collected: 0,
      net: 0,
      period: 'mtd',
    })).toContain('MTD collected: —');
    expect(formatPnlReply({
      linked: true,
      hasRows: false,
      collected: 0,
      net: 0,
      period: 'qtd',
    })).toContain('QTD collected: —');
    expect(formatPnlReply({
      linked: true,
      hasRows: true,
      collected: 1200,
      net: 400,
      period: 'mtd',
    })).toMatch(/\$1,200/);
  });

  it('formats enrollments and advisor unlinked copy', () => {
    expect(formatEnrollmentReply({
      linked: false,
      hasRows: false,
      neu: 0,
      inactive: 0,
      period: 'ytd',
    })).toContain('not linked');
    expect(formatAdvisorReply({ linked: false, hasRows: false, advisors: [] })).toBe(
      'AdvisorIQ is not linked.',
    );
    expect(formatBillingRiskReply({ linked: false, hasRows: false, rows: [] })).toBe(
      'AdvisorIQ is not linked.',
    );
    expect(formatBillingRiskReply({ linked: true, hasRows: false, rows: [] })).toBe(
      'No billing-risk rows in the warehouse.',
    );
  });

  it('formats tickets without faking zeros when unlinked', () => {
    expect(formatTicketReply({
      linked: false,
      hasSnap: false,
      open: 0,
      breached: 0,
      pending: 0,
      slaPct: 0,
    })).toBe('Tickets are not linked.');
    expect(formatTicketReply({
      linked: true,
      hasSnap: false,
      open: null,
      breached: null,
      pending: null,
      slaPct: null,
    })).toContain('Open now: —');
    expect(formatTicketReply({
      linked: true,
      hasSnap: true,
      open: 4,
      breached: 1,
      pending: 2,
      slaPct: 80,
      unassigned: 1,
      view: 'command',
    })).toBe('Open tickets: 4\nSLA breach: 1\nUnassigned: 1');
    expect(formatTicketReply({
      linked: true,
      hasSnap: true,
      open: 4,
      breached: 1,
      pending: 2,
      slaPct: 80,
      view: 'queue',
      queue: [{ ticket_number: '12', title: 'Billing', status: 'open', priority: 'high' }],
    })).toContain('#12 Billing — open · high');
  });

  it('uses Command grain off Finance and Finance grain on /finance', () => {
    expect(grainForOrbitPnl('/home', 'qtd', 'month')).toBe('quarter');
    expect(grainForOrbitPnl('/finance', 'qtd', 'month')).toBe('month');
    expect(grainForOrbitPnl('/finance', 'qtd', null)).toBe('quarter');
    expect(ticketViewForPath('/home')).toBe('command');
    expect(ticketViewForPath('/tickets')).toBe('queue');
  });

  it('maps Command, Finance, Tickets, and Advisors', () => {
    expect(formatOrbitPageReply('/home').href).toBe('/home');
    expect(formatOrbitPageReply('/home').text).toMatch(/Command/);
    expect(formatOrbitPageReply('/home').text).toMatch(/You can:/);
    expect(formatOrbitPageReply('/finance').href).toBe('/finance');
    expect(formatOrbitPageReply('/finance').text).toMatch(/P&L|net operating/i);
    expect(formatOrbitPageReply('/tickets').href).toBe('/tickets');
    expect(formatOrbitPageReply('/advisors').href).toBe('/advisors');
    expect(periodLabel('mtd')).toBe('MTD');
  });
});
