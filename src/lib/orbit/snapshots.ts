import { supabase } from '@/lib/supabase';
import {
  compactNumber,
  grainForPeriod,
  money,
  periodBounds,
  type PeriodGrain,
  type PeriodKey,
} from '@/lib/cos';
import { computeForecast, forecastSentence, preferCompleteMonth } from '@/lib/forecast';
import { conversionRate, formatFact, sumTraffic, type TrafficFact } from '@/lib/marketingFacts';
import { snapshotForPath, withExplanation } from './explain';
import { formatOrbitPageReply } from './page-reply';
import type { OrbitSnapshotKind } from './intent';

export type OrbitLinked = {
  enrollment: boolean;
  crm: boolean;
  advisoriq: boolean;
  tickets: boolean;
  traffic: boolean;
};

export type OrbitScope = {
  orgId: string | null;
  orgIds: string[];
  period: PeriodKey;
  customStart?: string;
  customEnd?: string;
  pnlGrain?: PeriodGrain | null;
  linked: OrbitLinked;
  pathname: string;
  isOperator: boolean;
};

export const DEFAULT_FORECAST_ASSUMPTIONS = {
  horizonDays: 90,
  weeklyWeeks: 8,
  seasonality: 1,
  monthlyChurn: 0.03,
  winRate: 0.25,
  pessimistic: 0.7,
  optimistic: 1.25,
} as const;

export function periodLabel(period: PeriodKey): string {
  if (period === 'ytd') return 'YTD';
  if (period === 'qtd') return 'QTD';
  if (period === 'custom') return 'Selected range';
  return 'MTD';
}

export function grainForOrbitPnl(
  pathname: string,
  period: PeriodKey,
  pnlGrain?: PeriodGrain | null,
): PeriodGrain {
  if (pathname.startsWith('/finance') && (pnlGrain === 'month' || pnlGrain === 'quarter' || pnlGrain === 'year')) {
    return pnlGrain;
  }
  return grainForPeriod(period);
}

export function ticketViewForPath(pathname: string): 'command' | 'queue' {
  const path = pathname.split('?')[0];
  if (path === '/home' || path === '/command') return 'command';
  return 'queue';
}

function notLinked(source: string): string {
  return `${source} is not linked.`;
}

function emptyRows(noun: string): string {
  return `No ${noun} in the warehouse.`;
}

export function formatPnlReply(input: {
  linked: boolean;
  hasRows: boolean;
  collected: number;
  net: number;
  period: PeriodKey;
}): string {
  const label = periodLabel(input.period);
  const collected = formatFact(money, {
    linked: input.linked,
    hasRows: input.hasRows,
    value: input.collected,
  });
  const net = formatFact(money, {
    linked: input.linked,
    hasRows: input.hasRows,
    value: input.net,
  });
  if (!input.linked) return `${notLinked('EnrollFlow')}\n${label} collected: —\nNet operating income: —`;
  if (!input.hasRows) return `${emptyRows('P&L rows for this period')}\n${label} collected: —\nNet operating income: —`;
  return `${label} collected: ${collected}\nNet operating income: ${net}`;
}

export function formatEnrollmentReply(input: {
  linked: boolean;
  hasRows: boolean;
  neu: number;
  inactive: number;
  period: PeriodKey;
}): string {
  const label = periodLabel(input.period);
  const neu = formatFact(compactNumber, { linked: input.linked, hasRows: input.hasRows, value: input.neu });
  const inactive = formatFact(compactNumber, {
    linked: input.linked,
    hasRows: input.hasRows,
    value: input.inactive,
  });
  if (!input.linked) return `${notLinked('EnrollFlow')}\n${label} new: —\n${label} inactivations: —`;
  if (!input.hasRows) return `${emptyRows('enrollment facts for this period')}\n${label} new: —\n${label} inactivations: —`;
  return `${label} new enrollments: ${neu}\n${label} inactivations: ${inactive}`;
}

export function formatAdvisorReply(input: {
  linked: boolean;
  hasRows: boolean;
  advisors: Array<{ display_name: string | null; advisor_key: string; mrr: number; retention_pct: number | null }>;
}): string {
  if (!input.linked) return notLinked('AdvisorIQ');
  if (!input.hasRows) return emptyRows('advisor scorecards');
  const lines = input.advisors.slice(0, 8).map((row) => {
    const name = row.display_name || row.advisor_key.slice(0, 8);
    const retention = row.retention_pct == null ? '—' : `${row.retention_pct}%`;
    return `• ${name} — ${money(row.mrr)} MRR · retention ${retention}`;
  });
  return `Top advisors by MRR:\n${lines.join('\n')}`;
}

export function formatForwardRiskReply(input: {
  linked: boolean;
  hasRows: boolean;
  rows: Array<{ bucket: string; members: number; mrr_at_risk: number }>;
}): string {
  if (!input.linked) return notLinked('AdvisorIQ');
  if (!input.hasRows) return emptyRows('forward-risk rows');
  const lines = input.rows.map(
    (row) => `• ${row.bucket}: ${compactNumber(row.members)} members · ${money(Number(row.mrr_at_risk))} MRR at risk`,
  );
  return `MRR at risk (next 90 days):\n${lines.join('\n')}`;
}

export function formatBillingRiskReply(input: {
  linked: boolean;
  hasRows: boolean;
  rows: Array<{ display_name: string | null; member_key: string; monthly_fee: number | null; risk_flag: string | null }>;
}): string {
  if (!input.linked) return notLinked('AdvisorIQ');
  if (!input.hasRows) return emptyRows('billing-risk rows');
  const lines = input.rows.slice(0, 12).map((row) => {
    const name = row.display_name || row.member_key;
    const fee = row.monthly_fee == null ? '—' : money(Number(row.monthly_fee));
    const flag = row.risk_flag || 'risk';
    return `• ${name} — ${fee} · ${flag}`;
  });
  return `Billing risk:\n${lines.join('\n')}`;
}

export function formatPipelineReply(input: {
  linked: boolean;
  hasRows: boolean;
  weighted: number;
  aging: number;
}): string {
  if (!input.linked) return notLinked('CRM');
  if (!input.hasRows) return emptyRows('pipeline facts');
  return `Weighted pipeline: ${money(input.weighted)}\nAging >7d: ${compactNumber(input.aging)}`;
}

export type TicketQueueRow = {
  ticket_number: string | null;
  title: string | null;
  status: string | null;
  priority: string | null;
};

export function formatTicketReply(input: {
  linked: boolean;
  hasSnap: boolean;
  open: number | null;
  breached: number | null;
  pending: number | null;
  slaPct: number | null;
  unassigned?: number | null;
  view?: 'command' | 'queue';
  queue?: TicketQueueRow[];
}): string {
  if (!input.linked) return 'Tickets are not linked.';
  if (input.view === 'command') {
    if (!input.hasSnap) {
      return `${emptyRows('ticket facts')}\nOpen tickets: —\nSLA breach: —`;
    }
    return [
      `Open tickets: ${compactNumber(input.open)}`,
      `SLA breach: ${compactNumber(input.breached)}`,
      `Unassigned: ${compactNumber(input.unassigned ?? null)}`,
    ].join('\n');
  }
  if (!input.hasSnap) {
    return `${emptyRows('ticket facts')}\nOpen now: —\nSLA breach: —`;
  }
  const sla = input.slaPct == null ? '—' : `${input.slaPct}%`;
  const lines = [
    `Open now: ${compactNumber(input.open)}`,
    `SLA breach: ${compactNumber(input.breached)}`,
    `Pending: ${compactNumber(input.pending)}`,
    `SLA: ${sla}`,
  ];
  const queue = input.queue || [];
  if (queue.length === 0) {
    lines.push('', 'No open tickets in the warehouse yet.');
  } else {
    lines.push('', 'Queue:');
    for (const row of queue.slice(0, 8)) {
      lines.push(`• #${row.ticket_number || '—'} ${row.title || 'Untitled'} — ${row.status || '—'} · ${row.priority || '—'}`);
    }
  }
  return lines.join('\n');
}

export function formatTrafficReply(input: {
  linked: boolean;
  hasRows: boolean;
  sessions: number;
  conversions: number;
  period: PeriodKey;
}): string {
  const label = periodLabel(input.period);
  if (!input.linked) return `${notLinked('Traffic')}\n${label} sessions: —\nConversion: —`;
  if (!input.hasRows) return `${emptyRows('traffic facts')}\n${label} sessions: —\nConversion: —`;
  return [
    `${label} sessions: ${formatFact(compactNumber, { linked: true, hasRows: true, value: input.sessions })}`,
    `${label} conversions: ${formatFact(compactNumber, { linked: true, hasRows: true, value: input.conversions })}`,
    `Conversion: ${conversionRate(input.conversions, input.sessions)}`,
  ].join('\n');
}

export function formatSourceReply(input: {
  hasRows: boolean;
  rows: Array<{ key: string; status: string | null; last_success_at: string | null }>;
}): string {
  if (!input.hasRows) return emptyRows('integration sources');
  const failing = input.rows.filter((row) => {
    const status = String(row.status || '').toLowerCase();
    return status === 'error' || status === 'failed' || !row.last_success_at;
  });
  if (failing.length === 0) {
    return `${input.rows.length} sources on file. None failing or never synced.`;
  }
  return `Sources failing / never synced:\n${failing
    .map((row) => `• ${row.key} — ${row.status || 'unknown'}${row.last_success_at ? '' : ' · never synced'}`)
    .join('\n')}`;
}

export function formatVendorReply(input: {
  linked: boolean;
  hasRows: boolean;
  unmatched: number;
}): string {
  if (!input.linked) return notLinked('EnrollFlow');
  if (!input.hasRows) return emptyRows('vendor cost rows');
  return `Vendor cost unmatched: ${compactNumber(input.unmatched)}`;
}

export function formatActionsReply(input: {
  linked: boolean;
  hasRows: boolean;
  rows: Array<{ title: string | null; kind: string | null; dollars: number | null }>;
}): string {
  if (!input.linked) return notLinked('AdvisorIQ');
  if (!input.hasRows) return emptyRows('proposed AdvisorIQ actions');
  const lines = input.rows.slice(0, 12).map((row) => {
    const dollars = row.dollars == null ? '' : ` · ${money(Number(row.dollars))}`;
    return `• ${row.title || row.kind || 'action'}${dollars}`;
  });
  return `Proposed AdvisorIQ actions:\n${lines.join('\n')}`;
}

export function formatForecastReply(input: {
  linked: boolean;
  hasInputs: boolean;
  sentence: string | null;
  lastSaved: string | null;
}): string {
  if (!input.linked) return notLinked('EnrollFlow');
  if (!input.hasInputs) return emptyRows('forecast inputs');
  const last = input.lastSaved ? `\nLast saved run: ${input.lastSaved}` : '\nNo saved forecast run.';
  return `${input.sentence || 'Forecast unavailable.'}${last}`;
}

type PnlRow = { collected: number; net_operating: number };
type EnrollRow = { new_count: number; inactive_count: number };
type AdvisorRow = {
  display_name: string | null;
  advisor_key: string;
  mrr: number;
  retention_pct: number | null;
};
type RiskRow = { bucket: string; members: number; mrr_at_risk: number };
type BillingRow = {
  display_name: string | null;
  member_key: string;
  monthly_fee: number | null;
  risk_flag: string | null;
};
type PipeRow = { fact_date: string; weighted_amount: number; aging_over_7: number };
type TicketSnap = {
  open_count: number | null;
  breached_count: number | null;
  pending_count: number | null;
  sla_pct: number | null;
  unassigned_count?: number | null;
};
type VendorRow = { missing_match_count: number | null };
type ActionRow = { title: string | null; kind: string | null; dollars: number | null };
type SourceRow = { key: string; status: string | null; last_success_at: string | null };

async function throwIf(error: { message: string } | null) {
  if (error) throw error;
}

export async function loadPnlRows(scope: OrbitScope, period: PeriodKey): Promise<PnlRow[]> {
  if (!scope.linked.enrollment || scope.orgIds.length === 0) return [];
  const bounds = periodBounds(period, scope.customStart, scope.customEnd);
  const grain = grainForOrbitPnl(scope.pathname, period, scope.pnlGrain);
  const { data, error } = await supabase
    .from('fact_pnl_period')
    .select('collected, net_operating')
    .in('org_id', scope.orgIds)
    .eq('period_grain', grain)
    .gte('period_start', bounds.start);
  await throwIf(error);
  return (data || []) as PnlRow[];
}

export async function loadEnrollmentRows(scope: OrbitScope, period: PeriodKey): Promise<EnrollRow[]> {
  if (!scope.linked.enrollment || scope.orgIds.length === 0) return [];
  const bounds = periodBounds(period, scope.customStart, scope.customEnd);
  const { data, error } = await supabase
    .from('fact_enrollments_daily')
    .select('new_count, inactive_count')
    .in('org_id', scope.orgIds)
    .gte('fact_date', bounds.start)
    .order('fact_date', { ascending: false })
    .limit(400);
  await throwIf(error);
  return (data || []) as EnrollRow[];
}

export async function loadAdvisorRows(scope: OrbitScope): Promise<AdvisorRow[]> {
  if (!scope.linked.advisoriq || scope.orgIds.length === 0) return [];
  const { data, error } = await supabase
    .from('advisor_scorecards')
    .select('display_name, advisor_key, mrr, retention_pct')
    .in('org_id', scope.orgIds)
    .order('mrr', { ascending: false })
    .limit(12);
  await throwIf(error);
  return (data || []) as AdvisorRow[];
}

export async function loadForwardRiskRows(scope: OrbitScope): Promise<RiskRow[]> {
  if (!scope.linked.advisoriq || scope.orgIds.length === 0) return [];
  const { data, error } = await supabase
    .from('fact_iq_forward_risk')
    .select('bucket, members, mrr_at_risk')
    .in('org_id', scope.orgIds);
  await throwIf(error);
  return (data || []) as RiskRow[];
}

export async function loadBillingRiskRows(scope: OrbitScope): Promise<BillingRow[]> {
  if (!scope.linked.advisoriq || scope.orgIds.length === 0) return [];
  const { data, error } = await supabase
    .from('book_billing_risk')
    .select('display_name, member_key, monthly_fee, risk_flag, status')
    .in('org_id', scope.orgIds)
    .order('next_billing_date', { ascending: true, nullsFirst: false })
    .limit(20);
  await throwIf(error);
  return (data || []) as BillingRow[];
}

export async function loadPipelineRows(scope: OrbitScope): Promise<PipeRow[]> {
  if (!scope.linked.crm || !scope.orgId) return [];
  const { data, error } = await supabase
    .from('fact_crm_pipeline_daily')
    .select('fact_date, weighted_amount, aging_over_7')
    .eq('org_id', scope.orgId)
    .order('fact_date', { ascending: false })
    .limit(40);
  await throwIf(error);
  return (data || []) as PipeRow[];
}

export async function loadTicketSnap(scope: OrbitScope): Promise<TicketSnap | null> {
  if (!scope.linked.tickets || !scope.orgId) return null;
  const { data, error } = await supabase
    .from('fact_tickets_daily')
    .select('open_count, breached_count, pending_count, sla_pct, unassigned_count')
    .eq('org_id', scope.orgId)
    .order('fact_date', { ascending: false })
    .limit(1);
  await throwIf(error);
  return (data?.[0] as TicketSnap) || null;
}

export async function loadCommandTicketMetrics(scope: OrbitScope): Promise<{
  open: number | null;
  breached: number | null;
  unassigned: number | null;
  hasSnap: boolean;
}> {
  if (!scope.linked.tickets || scope.orgIds.length === 0) {
    return { open: null, breached: null, unassigned: null, hasSnap: false };
  }
  const { data, error } = await supabase
    .from('analytics_snapshots')
    .select('metric_key, value, period_start')
    .in('org_id', scope.orgIds)
    .in('metric_key', ['open_ticket_count', 'breached_ticket_count', 'unassigned_ticket_count'])
    .order('period_start', { ascending: false });
  await throwIf(error);
  const latest = new Map<string, number | null>();
  for (const row of data || []) {
    if (!latest.has(row.metric_key)) {
      latest.set(row.metric_key, row.value == null ? null : Number(row.value));
    }
  }
  return {
    open: latest.get('open_ticket_count') ?? null,
    breached: latest.get('breached_ticket_count') ?? null,
    unassigned: latest.get('unassigned_ticket_count') ?? null,
    hasSnap: latest.has('open_ticket_count'),
  };
}

export async function loadBookTickets(scope: OrbitScope): Promise<TicketQueueRow[]> {
  if (!scope.linked.tickets || !scope.orgId) return [];
  const { data, error } = await supabase
    .from('book_tickets')
    .select('ticket_number, title, status, priority')
    .eq('org_id', scope.orgId)
    .order('created_at', { ascending: false })
    .limit(8);
  await throwIf(error);
  return (data || []) as TicketQueueRow[];
}

export async function loadTrafficRows(scope: OrbitScope, period: PeriodKey): Promise<TrafficFact[]> {
  if (!scope.linked.traffic || scope.orgIds.length === 0) return [];
  const bounds = periodBounds(period, scope.customStart, scope.customEnd);
  const { data, error } = await supabase
    .from('fact_traffic_daily')
    .select('fact_date, source, sessions, users, pageviews, conversions')
    .in('org_id', scope.orgIds)
    .gte('fact_date', bounds.start)
    .lte('fact_date', bounds.end)
    .order('fact_date', { ascending: false });
  await throwIf(error);
  return (data || []) as TrafficFact[];
}

export async function loadSourceRows(scope: OrbitScope): Promise<SourceRow[]> {
  if (!scope.orgId) return [];
  const { data, error } = await supabase
    .from('integration_sources')
    .select('key, status, last_success_at')
    .eq('org_id', scope.orgId);
  await throwIf(error);
  return (data || []) as SourceRow[];
}

export async function loadVendorRows(scope: OrbitScope): Promise<VendorRow[]> {
  if (!scope.linked.enrollment || scope.orgIds.length === 0) return [];
  const { data, error } = await supabase
    .from('fact_vendor_costs_monthly')
    .select('missing_match_count')
    .in('org_id', scope.orgIds)
    .order('period_start', { ascending: false });
  await throwIf(error);
  return (data || []) as VendorRow[];
}

export async function loadActionRows(scope: OrbitScope): Promise<ActionRow[]> {
  if (!scope.linked.advisoriq || scope.orgIds.length === 0) return [];
  const { data, error } = await supabase
    .from('book_actions')
    .select('title, kind, dollars')
    .in('org_id', scope.orgIds)
    .eq('status', 'proposed')
    .limit(20);
  await throwIf(error);
  return (data || []) as ActionRow[];
}

export async function loadForecastBundle(scope: OrbitScope) {
  const ids = scope.orgIds;
  if (!scope.linked.enrollment || ids.length === 0) {
    return { pnl: [], enroll: [], pipe: [], lastRun: null as { created_at: string } | null };
  }
  const [{ data: pnl }, { data: enroll }, { data: pipe }, last] = await Promise.all([
    supabase
      .from('fact_pnl_period')
      .select('period_start, collected, vendor_cost, commissions, saas_cost, active_members')
      .in('org_id', ids)
      .eq('period_grain', 'month')
      .order('period_start', { ascending: false })
      .limit(4),
    supabase
      .from('fact_enrollments_daily')
      .select('new_count, inactive_count, mrr')
      .in('org_id', ids)
      .order('fact_date', { ascending: false })
      .limit(90),
    supabase
      .from('fact_crm_pipeline_daily')
      .select('weighted_amount, premium_sum')
      .in('org_id', ids)
      .order('fact_date', { ascending: false })
      .limit(40),
    scope.orgId
      ? supabase
          .from('forecast_runs')
          .select('created_at')
          .eq('org_id', scope.orgId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  return {
    pnl: pnl || [],
    enroll: enroll || [],
    pipe: pipe || [],
    lastRun: last.data as { created_at: string } | null,
  };
}

export type OrbitReply = { text: string; href?: string; label?: string };

function reply(text: string, href: string, label: string, kind: OrbitSnapshotKind, explain: boolean): OrbitReply {
  return { text: withExplanation(text, kind, explain), href, label };
}

export async function loadOrbitSnapshot(
  kind: OrbitSnapshotKind,
  scope: OrbitScope,
  period = scope.period,
  opts: { explain?: boolean } = {},
): Promise<OrbitReply> {
  const explain = Boolean(opts.explain);
  switch (kind) {
    case 'explain_page': {
      const page = formatOrbitPageReply(scope.pathname);
      const liveKind = snapshotForPath(scope.pathname);
      if (liveKind === 'explain_page') return page;
      const live = await loadOrbitSnapshot(liveKind, scope, period, { explain: true });
      return {
        text: `${page.text}\n\nLive facts\n${live.text}`,
        href: page.href || live.href,
        label: page.label || live.label,
      };
    }
    case 'desk': {
      const [pnl, billing, tickets, pipeline, traffic, sources] = await Promise.all([
        loadOrbitSnapshot('pnl', scope, period),
        loadOrbitSnapshot('billing_risk', scope, period),
        loadOrbitSnapshot('tickets', scope, period),
        loadOrbitSnapshot('pipeline', scope, period),
        loadOrbitSnapshot('traffic', scope, period),
        loadOrbitSnapshot('sources', scope, period),
      ]);
      const text = [
        `Desk briefing · ${periodLabel(period)}`,
        `EnrollFlow — ${pnl.text.split('\n').join(' · ')}`,
        `AdvisorIQ — ${billing.text.split('\n').join(' · ')}`,
        `Support — ${tickets.text.split('\n').join(' · ')}`,
        `CRM — ${pipeline.text.split('\n').join(' · ')}`,
        `Traffic — ${traffic.text.split('\n').join(' · ')}`,
        `Sources — ${sources.text.split('\n').join(' · ')}`,
        'I only quote warehouse rows. Unlinked or empty sources stay —.',
      ].join('\n');
      return {
        text: explain
          ? `${text}\n\nEach line is the same fact the matching page shows. I do not mix pipeline into collected, or tickets into P&L.`
          : text,
        href: '/home',
        label: 'Open Command',
      };
    }
    case 'pnl': {
      const rows = await loadPnlRows(scope, period);
      const collected = rows.reduce((sum, row) => sum + Number(row.collected), 0);
      const net = rows.reduce((sum, row) => sum + Number(row.net_operating), 0);
      return reply(formatPnlReply({
        linked: scope.linked.enrollment,
        hasRows: rows.length > 0,
        collected,
        net,
        period,
      }), '/finance', 'Open P&L', 'pnl', explain);
    }
    case 'enrollments': {
      const rows = await loadEnrollmentRows(scope, period);
      const neu = rows.reduce((sum, row) => sum + Number(row.new_count), 0);
      const inactive = rows.reduce((sum, row) => sum + Number(row.inactive_count), 0);
      return reply(formatEnrollmentReply({
        linked: scope.linked.enrollment,
        hasRows: rows.length > 0,
        neu,
        inactive,
        period,
      }), '/enrollments', 'Open Members', 'enrollments', explain);
    }
    case 'advisors': {
      const advisors = await loadAdvisorRows(scope);
      return reply(formatAdvisorReply({
        linked: scope.linked.advisoriq,
        hasRows: advisors.length > 0,
        advisors,
      }), '/advisors', 'Open Books', 'advisors', explain);
    }
    case 'forward_risk': {
      const rows = await loadForwardRiskRows(scope);
      return reply(formatForwardRiskReply({
        linked: scope.linked.advisoriq,
        hasRows: rows.length > 0,
        rows,
      }), '/advisors', 'Open Books', 'forward_risk', explain);
    }
    case 'billing_risk': {
      const rows = await loadBillingRiskRows(scope);
      return reply(formatBillingRiskReply({
        linked: scope.linked.advisoriq,
        hasRows: rows.length > 0,
        rows,
      }), '/advisors', 'Open Books', 'billing_risk', explain);
    }
    case 'pipeline': {
      const rows = await loadPipelineRows(scope);
      const latestDate = rows[0]?.fact_date;
      const latest = rows.filter((row) => row.fact_date === latestDate);
      const weighted = Number(latest[0]?.weighted_amount || 0);
      const aging = latest.reduce((sum, row) => sum + Number(row.aging_over_7 || 0), 0);
      return reply(formatPipelineReply({
        linked: scope.linked.crm,
        hasRows: latest.length > 0,
        weighted,
        aging,
      }), '/pipeline', 'Open Pipeline', 'pipeline', explain);
    }
    case 'tickets': {
      const view = ticketViewForPath(scope.pathname);
      if (view === 'command') {
        const metrics = await loadCommandTicketMetrics(scope);
        return reply(formatTicketReply({
          linked: scope.linked.tickets,
          hasSnap: metrics.hasSnap,
          open: metrics.open,
          breached: metrics.breached,
          pending: null,
          slaPct: null,
          unassigned: metrics.unassigned,
          view,
        }), '/tickets', 'Open Queue', 'tickets', explain);
      }
      const [snap, queue] = await Promise.all([loadTicketSnap(scope), loadBookTickets(scope)]);
      return reply(formatTicketReply({
        linked: scope.linked.tickets,
        hasSnap: snap != null,
        open: snap?.open_count ?? null,
        breached: snap?.breached_count ?? null,
        pending: snap?.pending_count ?? null,
        slaPct: snap?.sla_pct ?? null,
        unassigned: snap?.unassigned_count ?? null,
        view,
        queue,
      }), '/tickets', 'Open Queue', 'tickets', explain);
    }
    case 'traffic': {
      const rows = await loadTrafficRows(scope, period);
      const totals = sumTraffic(rows);
      return reply(formatTrafficReply({
        linked: scope.linked.traffic,
        hasRows: rows.length > 0,
        sessions: totals.sessions,
        conversions: totals.conversions,
        period,
      }), '/marketing', 'Open Traffic', 'traffic', explain);
    }
    case 'sources': {
      const rows = await loadSourceRows(scope);
      return reply(formatSourceReply({ hasRows: rows.length > 0, rows }), '/operations/integrations', 'Open Integrations', 'sources', explain);
    }
    case 'vendor': {
      const rows = await loadVendorRows(scope);
      const unmatched = rows.reduce((sum, row) => sum + Number(row.missing_match_count || 0), 0);
      return reply(formatVendorReply({
        linked: scope.linked.enrollment,
        hasRows: rows.length > 0,
        unmatched,
      }), '/finance/vendors', 'Open Vendors', 'vendor', explain);
    }
    case 'forecast': {
      const bundle = await loadForecastBundle(scope);
      const hasInputs = bundle.pnl.length > 0;
      const computed = hasInputs
        ? computeForecast(
            { ...bundle, pnl: preferCompleteMonth(bundle.pnl) },
            DEFAULT_FORECAST_ASSUMPTIONS,
          )
        : null;
      return reply(formatForecastReply({
        linked: scope.linked.enrollment,
        hasInputs,
        sentence: computed ? forecastSentence(90, computed.pnl, money) : null,
        lastSaved: bundle.lastRun?.created_at
          ? new Date(bundle.lastRun.created_at).toLocaleString()
          : null,
      }), '/finance/forecast', 'Open Forecasts', 'forecast', explain);
    }
    case 'actions': {
      const rows = await loadActionRows(scope);
      return reply(formatActionsReply({
        linked: scope.linked.advisoriq,
        hasRows: rows.length > 0,
        rows,
      }), '/advisors', 'Open Books', 'actions', explain);
    }
    default:
      return { text: "I don't have a snapshot for that." };
  }
}
