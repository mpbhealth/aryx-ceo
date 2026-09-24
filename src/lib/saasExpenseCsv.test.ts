import { describe, expect, it } from 'vitest';
import { rowsToExpenses } from './saasExpenseCsv';
import { monthlyFromRow, toView } from '../hooks/useSaaSExpenses';

// `saas_expenses` stores one `amount` against a `cadence`. Everything the SaaS Spend
// page shows as a monthly or annual cost is derived from that pair — there is no
// cost_monthly or cost_annual column, and there never was one in this database.

describe('monthlyFromRow', () => {
  it('takes a monthly amount as it stands', () => {
    expect(monthlyFromRow({ amount: 49.99, cadence: 'monthly' })).toBeCloseTo(49.99);
  });

  it('divides an annual amount over twelve months', () => {
    expect(monthlyFromRow({ amount: 1200, cadence: 'annual' })).toBe(100);
    expect(monthlyFromRow({ amount: 1200, cadence: 'Yearly' })).toBe(100);
  });

  it('divides a quarterly amount over three months', () => {
    expect(monthlyFromRow({ amount: 300, cadence: 'quarterly' })).toBe(100);
  });

  it('treats a missing amount as zero and a missing cadence as monthly', () => {
    expect(monthlyFromRow({ amount: null, cadence: null })).toBe(0);
    expect(monthlyFromRow({ amount: 40, cadence: null })).toBe(40);
  });
});

describe('toView', () => {
  const row = {
    id: 'abc',
    org_id: 'org',
    vendor_id: null,
    name: 'Figma',
    amount: 1200,
    currency: 'USD',
    cadence: 'annual',
    renewal_date: '2027-01-01',
    owner: 'Design',
    notes: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('adds the derived costs without disturbing the stored row', () => {
    const view = toView(row);
    expect(view.cost_monthly).toBe(100);
    expect(view.cost_annual).toBe(1200);
    expect(view.amount).toBe(1200);
    expect(view.cadence).toBe('annual');
  });
});

describe('rowsToExpenses', () => {
  it('maps a file written with the real column names', () => {
    const { rows, skipped } = rowsToExpenses([
      { name: 'Linear', owner: 'Engineering', amount: '96', cadence: 'annual', renewal_date: '2027-03-01', notes: 'seats' },
    ]);
    expect(skipped).toEqual([]);
    expect(rows[0]).toEqual({
      name: 'Linear',
      owner: 'Engineering',
      amount: 96,
      cadence: 'annual',
      renewal_date: '2027-03-01',
      notes: 'seats',
    });
  });

  it('accepts the headers this page exports, so an export round-trips', () => {
    const { rows } = rowsToExpenses([
      { Application: 'Notion', Owner: 'Ops', Amount: '$1,200.00', Cadence: 'Yearly', 'Renewal Date': '2027-06-30' },
    ]);
    expect(rows[0].name).toBe('Notion');
    expect(rows[0].owner).toBe('Ops');
    expect(rows[0].amount).toBe(1200);
    expect(rows[0].cadence).toBe('annual');
  });

  it('reads a Monthly Cost column as a monthly amount when there is no Amount column', () => {
    const { rows } = rowsToExpenses([{ Application: 'Slack', 'Monthly Cost': '87.50' }]);
    expect(rows[0].amount).toBe(87.5);
    expect(rows[0].cadence).toBe('monthly');
  });

  it('prefers an explicit Amount over a derived Monthly Cost', () => {
    const { rows } = rowsToExpenses([
      { Application: 'Slack', Amount: '1050', Cadence: 'annual', 'Monthly Cost': '87.50' },
    ]);
    expect(rows[0].amount).toBe(1050);
    expect(rows[0].cadence).toBe('annual');
  });

  it('normalises a spreadsheet date to the date column format', () => {
    const { rows } = rowsToExpenses([{ Application: 'Vercel', 'Renewal Date': '3/14/2027' }]);
    expect(rows[0].renewal_date).toBe('2027-03-14');
  });

  it('reports the line and reason rather than importing a broken row', () => {
    const { rows, skipped } = rowsToExpenses([
      { Application: 'Good', Amount: '10' },
      { Application: '', Amount: '10' },
      { Application: 'Bad amount', Amount: 'free-ish' },
      { Application: 'Bad date', 'Renewal Date': 'whenever' },
    ]);
    expect(rows).toHaveLength(1);
    expect(skipped).toEqual([
      { line: 3, reason: 'no application name' },
      { line: 4, reason: 'amount "free-ish" is not a number' },
      { line: 5, reason: 'renewal date "whenever" is not a date' },
    ]);
  });

  it('writes null rather than an empty string for the optional columns', () => {
    const { rows } = rowsToExpenses([{ Application: 'Bare' }]);
    expect(rows[0]).toEqual({
      name: 'Bare',
      amount: null,
      cadence: undefined,
      renewal_date: null,
      owner: null,
      notes: null,
    });
  });
});
