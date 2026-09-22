export const DEFAULT_MONTHLY_CHURN = 0.03;

export interface BriefDelta {
  key: string;
  label: string;
  current: number | null;
  previous: number | null;
  delta: number | null;
  versus: 'last month' | '7 days ago';
}

export interface PnlBriefRow {
  period_start: string;
  collected: number;
  failed: number;
  net_operating: number;
}

export interface MovementBriefRow {
  month: string;
  enrollments: number;
  terminations: number;
}

export interface SnapshotBriefRow {
  metric_key: string;
  period_start: string;
  value: number | null;
}

export interface RankedAction {
  key: string;
  title: string;
  dollars: number;
  href: string;
}

export interface OwnerBrief {
  net: BriefDelta;
  failed: BriefDelta;
  collected: BriefDelta;
  gained: BriefDelta;
  lost: BriefDelta;
  termSoonMrr: BriefDelta;
  openTickets: BriefDelta;
  actions: RankedAction[];
}

function monthKey(value: string): string {
  return String(value || '').slice(0, 7);
}

function currentMonth(today: Date): string {
  return `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}`;
}

function previousMonth(key: string): string {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function pair(key: string, label: string, current: number | null, previous: number | null, versus: BriefDelta['versus']): BriefDelta {
  return {
    key,
    label,
    current,
    previous,
    delta: current == null || previous == null ? null : current - previous,
    versus,
  };
}

export function pnlBriefDeltas(rows: PnlBriefRow[], today = new Date()): Pick<OwnerBrief, 'net' | 'failed' | 'collected'> {
  const byMonth = new Map<string, { collected: number; failed: number; net: number }>();
  for (const row of rows) {
    const key = monthKey(row.period_start);
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    const cur = byMonth.get(key) || { collected: 0, failed: 0, net: 0 };
    cur.collected += Number(row.collected || 0);
    cur.failed += Number(row.failed || 0);
    cur.net += Number(row.net_operating || 0);
    byMonth.set(key, cur);
  }
  const now = currentMonth(today);
  const prior = previousMonth(now);
  const current = byMonth.get(now) || null;
  const previous = byMonth.get(prior) || null;
  return {
    net: pair('net', 'Net', current?.net ?? null, previous?.net ?? null, 'last month'),
    failed: pair('failed', 'Failed', current?.failed ?? null, previous?.failed ?? null, 'last month'),
    collected: pair('collected', 'Collected', current?.collected ?? null, previous?.collected ?? null, 'last month'),
  };
}

export function movementBriefDeltas(rows: MovementBriefRow[], today = new Date()): Pick<OwnerBrief, 'gained' | 'lost'> {
  const byMonth = new Map<string, { gained: number; lost: number }>();
  for (const row of rows) {
    const key = monthKey(row.month);
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    const cur = byMonth.get(key) || { gained: 0, lost: 0 };
    cur.gained += Number(row.enrollments || 0);
    cur.lost += Number(row.terminations || 0);
    byMonth.set(key, cur);
  }
  const now = currentMonth(today);
  const prior = previousMonth(now);
  const current = byMonth.get(now) || null;
  const previous = byMonth.get(prior) || null;
  return {
    gained: pair('gained', 'Gained', current?.gained ?? null, previous?.gained ?? null, 'last month'),
    lost: pair('lost', 'Lost', current?.lost ?? null, previous?.lost ?? null, 'last month'),
  };
}

function shiftDay(isoDay: string, days: number): string {
  const date = new Date(`${isoDay}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function snapshotBriefDelta(
  rows: SnapshotBriefRow[],
  metricKey: string,
  label: string,
  lagDays = 7,
): BriefDelta {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    if (row.metric_key !== metricKey || row.value == null || Number.isNaN(Number(row.value))) continue;
    const point = String(row.period_start).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(point)) continue;
    byDay.set(point, (byDay.get(point) || 0) + Number(row.value));
  }
  const days = [...byDay.keys()].sort();
  if (days.length === 0) return pair(metricKey, label, null, null, '7 days ago');
  const latest = days[days.length - 1];
  const current = byDay.get(latest) ?? null;
  const cutoff = shiftDay(latest, -lagDays);
  const priorDays = days.filter((point) => point <= cutoff);
  if (priorDays.length === 0) return pair(metricKey, label, current, null, '7 days ago');
  const previous = byDay.get(priorDays[priorDays.length - 1]) ?? null;
  return pair(metricKey, label, current, previous, '7 days ago');
}

export function withFallbackCurrent(delta: BriefDelta, fallback: number | null): BriefDelta {
  if (delta.current != null || fallback == null) return delta;
  return pair(delta.key, delta.label, fallback, delta.previous, delta.versus);
}

export function rankOwnerActions(input: {
  actions: Array<{ key: string; title: string; dollars: number | null; href: string | null }>;
  billing: Array<{ key: string; title: string; dollars: number | null; href: string }>;
  termSoon: { title: string; dollars: number | null; href: string } | null;
}, limit = 10): RankedAction[] {
  const ranked: RankedAction[] = [];
  const actions = [...input.actions].sort((a, b) => Number(b.dollars || 0) - Number(a.dollars || 0));
  for (const row of actions) {
    if (ranked.length >= limit) break;
    ranked.push({
      key: row.key,
      title: row.title,
      dollars: Number(row.dollars || 0),
      href: row.href || '',
    });
  }
  const billing = [...input.billing]
    .filter((row) => row.dollars != null)
    .sort((a, b) => Number(b.dollars || 0) - Number(a.dollars || 0));
  for (const row of billing) {
    if (ranked.length >= limit) break;
    ranked.push({ key: row.key, title: row.title, dollars: Number(row.dollars), href: row.href });
  }
  if (ranked.length < limit && input.termSoon && input.termSoon.dollars != null) {
    ranked.push({
      key: 'term-soon',
      title: input.termSoon.title,
      dollars: input.termSoon.dollars,
      href: input.termSoon.href,
    });
  }
  return ranked.slice(0, limit);
}

export function observedMonthlyChurn(
  rows: Array<{ fact_date?: string; inactive_count: number; active_count?: number | null }>,
  today = new Date(),
): { rate: number; source: 'observed' | 'default' } {
  const now = currentMonth(today);
  const complete = rows.filter((row) => {
    const key = monthKey(String(row.fact_date || ''));
    return /^\d{4}-\d{2}$/.test(key) && key < now;
  });
  if (complete.length === 0) return { rate: DEFAULT_MONTHLY_CHURN, source: 'default' };
  const latest = complete.map((row) => monthKey(String(row.fact_date))).sort().at(-1) || '';
  const window = complete.filter((row) => monthKey(String(row.fact_date)) === latest);
  const inactive = window.reduce((sum, row) => sum + Number(row.inactive_count || 0), 0);
  const active = window.reduce((sum, row) => sum + Number(row.active_count || 0), 0);
  if (active <= 0) return { rate: DEFAULT_MONTHLY_CHURN, source: 'default' };
  return { rate: inactive / active, source: 'observed' };
}

export function churnNote(result: { rate: number; source: 'observed' | 'default' }): string {
  if (result.source === 'default') {
    return 'Monthly churn is the 3% default. EnrollFlow history is empty.';
  }
  return `Monthly churn is ${(result.rate * 100).toFixed(1)}% from EnrollFlow.`;
}

function moneyClause(label: string, delta: BriefDelta, format: (value: number) => string): string | null {
  if (delta.current == null) return null;
  const base = `${label} is ${format(delta.current)}`;
  if (delta.delta == null) return base;
  const sign = delta.delta > 0 ? '+' : '';
  return `${base}, ${sign}${format(delta.delta)} versus ${delta.versus}`;
}

function countClause(label: string, delta: BriefDelta, format: (value: number) => string): string | null {
  if (delta.current == null) return null;
  const base = `${label} ${format(delta.current)}`;
  if (delta.delta == null) return base;
  const sign = delta.delta > 0 ? '+' : '';
  return `${base}, ${sign}${format(delta.delta)} versus ${delta.versus}`;
}

export function ownerBriefSentence(
  brief: Pick<OwnerBrief, 'net' | 'failed' | 'collected' | 'gained' | 'lost' | 'termSoonMrr' | 'openTickets'>,
  formatMoney: (value: number) => string,
  formatCount: (value: number) => string,
): string {
  const parts = [
    moneyClause('Net', brief.net, formatMoney),
    moneyClause('Failed billing', brief.failed, formatMoney),
    moneyClause('Collected', brief.collected, formatMoney),
    countClause('Members gained', brief.gained, formatCount),
    countClause('Members lost', brief.lost, formatCount),
    moneyClause('MRR scheduled to leave', brief.termSoonMrr, formatMoney),
    countClause('Open tickets', brief.openTickets, formatCount),
  ].filter(Boolean);
  if (parts.length === 0) return 'No month-to-month warehouse comparison yet.';
  return `${parts.join('. ')}.`;
}
