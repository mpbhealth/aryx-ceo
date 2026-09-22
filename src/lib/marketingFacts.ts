export type TrafficFact = {
  fact_date: string;
  source: string;
  sessions: number | null;
  users: number | null;
  pageviews: number | null;
  conversions: number | null;
  leads?: number | null;
  new_members?: number | null;
};

export type TrafficTotals = {
  sessions: number;
  users: number;
  pageviews: number;
  conversions: number;
  leads: number;
  newMembers: number;
};

export function sumTraffic(rows: TrafficFact[]): TrafficTotals {
  return rows.reduce(
    (acc, row) => ({
      sessions: acc.sessions + Number(row.sessions || 0),
      users: acc.users + Number(row.users || 0),
      pageviews: acc.pageviews + Number(row.pageviews || 0),
      conversions: acc.conversions + Number(row.conversions || 0),
      leads: acc.leads + Number(row.leads || 0),
      newMembers: acc.newMembers + Number(row.new_members || 0),
    }),
    { sessions: 0, users: 0, pageviews: 0, conversions: 0, leads: 0, newMembers: 0 },
  );
}

export function trafficBySource(rows: TrafficFact[]): Array<TrafficTotals & { source: string }> {
  const map = new Map<string, TrafficTotals>();
  for (const row of rows) {
    const key = row.source || 'unknown';
    const cur = map.get(key) || { sessions: 0, users: 0, pageviews: 0, conversions: 0, leads: 0, newMembers: 0 };
    cur.sessions += Number(row.sessions || 0);
    cur.users += Number(row.users || 0);
    cur.pageviews += Number(row.pageviews || 0);
    cur.conversions += Number(row.conversions || 0);
    cur.leads += Number(row.leads || 0);
    cur.newMembers += Number(row.new_members || 0);
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([source, totals]) => ({ source, ...totals }))
    .sort((a, b) => b.sessions - a.sessions);
}

export function trafficByDay(rows: TrafficFact[]): Array<TrafficTotals & { date: string }> {
  const map = new Map<string, TrafficTotals>();
  for (const row of rows) {
    const key = row.fact_date;
    const cur = map.get(key) || { sessions: 0, users: 0, pageviews: 0, conversions: 0, leads: 0, newMembers: 0 };
    cur.sessions += Number(row.sessions || 0);
    cur.users += Number(row.users || 0);
    cur.pageviews += Number(row.pageviews || 0);
    cur.conversions += Number(row.conversions || 0);
    cur.leads += Number(row.leads || 0);
    cur.newMembers += Number(row.new_members || 0);
    map.set(key, cur);
  }
  return [...map.entries()]
    .map(([date, totals]) => ({ date, ...totals }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function conversionRate(conversions: number, sessions: number): string {
  if (!sessions) return '—';
  return `${((conversions / sessions) * 100).toFixed(1)}%`;
}

export function sourceLabel(source: string): string {
  if (source === 'ga4') return 'Google Analytics 4';
  if (source === 'marketflo' || source === 'marketflow') return 'MarketFlow';
  return source;
}

/** Warehouse facts: never invent a zero when the source is unlinked or empty. */
export function formatFact(
  format: (value: number) => string,
  opts: { linked: boolean; loading?: boolean; hasRows: boolean; value: number },
): string {
  if (!opts.linked) return '—';
  if (opts.loading) return '…';
  if (!opts.hasRows) return '—';
  return format(opts.value);
}
