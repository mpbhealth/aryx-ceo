import type { SaaSExpenseInput } from '../hooks/useSaaSExpenses';

/**
 * CSV import for `saas_expenses`.
 *
 * The parse itself is papaparse's job; this is the part worth testing — turning
 * whatever headers a spreadsheet happens to carry into the six columns the table
 * actually has. Kept pure and separate from the uploader component for that reason.
 *
 * A file exported from the SaaS Spend page round-trips: its "Monthly Cost" column is
 * accepted as an amount at a monthly cadence when no explicit Amount column is present.
 */

/** A line that could not be imported, identified the way a spreadsheet numbers it. */
export interface SkippedRow {
  line: number;
  reason: string;
}

export interface CsvImportResult {
  rows: SaaSExpenseInput[];
  skipped: SkippedRow[];
}

/** "Renewal Date", "renewal_date" and "RENEWAL DATE" are the same header. */
function normaliseKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function pick(record: Record<string, string>, ...aliases: string[]): string {
  for (const alias of aliases) {
    const value = record[normaliseKey(alias)];
    if (value !== undefined && value.trim() !== '') return value.trim();
  }
  return '';
}

/** Strip currency symbols and thousands separators before reading a number. */
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.-]/g, '');
  if (cleaned === '' || cleaned === '-') return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/**
 * `renewal_date` is a Postgres `date`, so it is stored as YYYY-MM-DD. A spreadsheet
 * will as often hand over 3/14/2026, which Date parses; anything it cannot parse is
 * reported rather than guessed at.
 */
function parseDate(raw: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/** `yearly` and `annual` are the same cadence; unknown values are left as written. */
function normaliseCadence(raw: string): string | undefined {
  const value = raw.toLowerCase();
  if (value === '') return undefined;
  if (value === 'yearly' || value === 'annually') return 'annual';
  return value;
}

/**
 * Map parsed CSV records onto writable columns.
 *
 * A row is skipped, not repaired, when it has no application name or carries a date
 * that cannot be read — the uploader reports those lines so the file can be corrected.
 */
export function rowsToExpenses(records: Array<Record<string, unknown>>): CsvImportResult {
  const rows: SaaSExpenseInput[] = [];
  const skipped: SkippedRow[] = [];

  records.forEach((record, index) => {
    // +2: line 1 is the header row, and spreadsheets count from 1.
    const line = index + 2;
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(record)) {
      fields[normaliseKey(key)] = value == null ? '' : String(value);
    }

    const name = pick(fields, 'name', 'application', 'service_name', 'tool', 'vendor');
    if (!name) {
      skipped.push({ line, reason: 'no application name' });
      return;
    }

    const explicitAmount = pick(fields, 'amount', 'cost', 'price');
    const monthlyAmount = pick(fields, 'monthly_cost', 'cost_monthly');
    const rawAmount = explicitAmount || monthlyAmount;
    const amount = rawAmount === '' ? null : parseAmount(rawAmount);
    if (rawAmount !== '' && amount === null) {
      skipped.push({ line, reason: `amount "${rawAmount}" is not a number` });
      return;
    }

    const rawDate = pick(fields, 'renewal_date', 'renewal', 'renews');
    const renewalDate = rawDate === '' ? null : parseDate(rawDate);
    if (rawDate !== '' && renewalDate === null) {
      skipped.push({ line, reason: `renewal date "${rawDate}" is not a date` });
      return;
    }

    // An explicit cadence wins. Failing that, a figure taken from a "Monthly Cost"
    // column is monthly by definition; anything else falls back to the column default.
    const cadence = normaliseCadence(pick(fields, 'cadence', 'billing_cycle', 'frequency'))
      ?? (!explicitAmount && monthlyAmount ? 'monthly' : undefined);

    rows.push({
      name,
      amount,
      cadence,
      renewal_date: renewalDate,
      owner: pick(fields, 'owner', 'department', 'team') || null,
      notes: pick(fields, 'notes', 'description') || null,
    });
  });

  return { rows, skipped };
}
