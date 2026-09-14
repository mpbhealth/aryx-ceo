import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { syncConnectors } from '@/lib/connectors';
import { money, compactNumber, periodBounds, grainForPeriod, type PeriodKey, ADVISORIQ_HREF } from '@/lib/cos';
import { computeForecast, forecastSentence, preferCompleteMonth } from '@/lib/forecast';
import { conversionRate, formatFact } from '@/lib/marketingFacts';
import { useTrafficFacts } from '@/hooks/useTrafficFacts';
import { useOrg } from '@/contexts/OrgContext';
import { CosBezel, CosIslandButton, CosPage, CosPageHero, CosTable } from '../cos/CosPage';
import { AryxLogo } from '../brand/AryxLogo';
import { OrgPicker } from '../cos/OrgPicker';
import { PeriodToggle } from '../cos/PeriodToggle';
import { CommandStat, CommandStrip } from '../cos/CommandStrip';
import { MovementTide } from '../cos/MovementTide';
import { rollupTideMonths, tideWindowStart } from '@/lib/movementTide';

interface Snapshot {
  source: string;
  metric_key: string;
  value: number | null;
  period_start: string;
  org_id: string;
}

interface PnlRow {
  org_id: string;
  period_start: string;
  collected: number;
  pending: number;
  failed: number;
  vendor_cost: number;
  commissions: number;
  saas_cost: number;
  net_operating: number;
  metadata?: {
    vendor_coverage_pct?: number;
    commissions_pending?: number;
    missing_vendor_matches?: number;
  };
}

interface AdvisorRow {
  org_id: string;
  advisor_key: string;
  display_name: string | null;
  active_members: number;
  mrr: number;
  net_mrr: number;
  retention_pct: number | null;
  term_soon_90: number;
  enrollments_30: number;
  margin_pct: number | null;
}

const RISK_LABELS: Record<string, string> = {
  '0_30': '0–30 days',
  '31_60': '31–60 days',
  '61_90': '61–90 days',
  '90_plus': '90+ days',
};

function iqHref(path?: string | null): string {
  if (!path) return ADVISORIQ_HREF;
  if (path.startsWith('http')) return path;
  return `${ADVISORIQ_HREF}${path.startsWith('/') ? path : `/${path}`}`;
}

function shown(linked: boolean, value: number | null | undefined, format: (n: number) => string): string {
  if (!linked || value == null || Number.isNaN(Number(value))) return '—';
  return format(Number(value));
}

export function CosHome() {
  const queryClient = useQueryClient();
  const { orgId, linked, rollup, memberships, isOperator } = useOrg();
  const [period, setPeriod] = useState<PeriodKey>('mtd');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const bounds = periodBounds(period, customStart, customEnd);
  const grain = grainForPeriod(period);
  const orgIds = rollup ? memberships.map((row) => row.org_id) : orgId ? [orgId] : [];

  const snapshots = useQuery({
    queryKey: ['analytics-snapshots', orgIds.join(',')],
    enabled: orgIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analytics_snapshots')
        .select('source, metric_key, value, period_start, org_id')
        .in('org_id', orgIds)
        .order('period_start', { ascending: false });
      if (error) throw error;
      return (data || []) as Snapshot[];
    },
  });

  const pnl = useQuery({
    queryKey: ['fact-pnl', orgIds.join(','), bounds.start, grain],
    enabled: orgIds.length > 0 && linked.enrollment,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fact_pnl_period')
        .select('org_id, period_start, collected, pending, failed, vendor_cost, commissions, saas_cost, net_operating, metadata')
        .in('org_id', orgIds)
        .eq('period_grain', grain)
        .gte('period_start', bounds.start);
      if (error) throw error;
      return (data || []) as PnlRow[];
    },
  });

  const book = useQuery({
    queryKey: ['command-book', orgIds.join(',')],
    enabled: orgIds.length > 0 && linked.advisoriq,
    queryFn: async () => {
      const [trend, risk, reasons, advisors, billing, actions] = await Promise.all([
        supabase.from('fact_iq_mrr_monthly').select('month, enrollments, terminations, mrr_added, mrr_lost, net_mrr_change').in('org_id', orgIds).gte('month', tideWindowStart()).order('month'),
        supabase.from('fact_iq_forward_risk').select('bucket, members, mrr_at_risk').in('org_id', orgIds),
        supabase.from('fact_iq_reason_mix').select('kind, reason, item_count, mrr').in('org_id', orgIds).in('kind', ['churn', 'hold']).order('item_count', { ascending: false }).limit(16),
        supabase.from('advisor_scorecards').select('org_id, advisor_key, display_name, active_members, mrr, net_mrr, retention_pct, term_soon_90, enrollments_30, margin_pct').in('org_id', orgIds).order('mrr', { ascending: false }).limit(12),
        supabase.from('book_billing_risk').select('member_key, display_name, advisor_label, product_key, monthly_fee, next_billing_date, paid, risk_flag, status').in('org_id', orgIds).order('next_billing_date', { ascending: true, nullsFirst: false }).limit(20),
        supabase.from('book_actions').select('action_key, kind, title, dollars, href, status').in('org_id', orgIds).eq('status', 'proposed').limit(20),
      ]);
      for (const result of [trend, risk, reasons, advisors, billing, actions]) {
        if (result.error) throw result.error;
      }
      return {
        trend: trend.data || [],
        risk: risk.data || [],
        reasons: reasons.data || [],
        advisors: (advisors.data || []) as AdvisorRow[],
        billing: billing.data || [],
        actions: actions.data || [],
      };
    },
  });

  const forecastFacts = useQuery({
    queryKey: ['home-forecast-inputs', orgIds.join(',')],
    enabled: orgIds.length > 0 && linked.enrollment,
    queryFn: async () => {
      const [{ data: pnlRows }, { data: enroll }, { data: pipe }] = await Promise.all([
        supabase.from('fact_pnl_period').select('period_start, collected, vendor_cost, commissions, saas_cost, active_members').in('org_id', orgIds).eq('period_grain', 'month').order('period_start', { ascending: false }).limit(4),
        supabase.from('fact_enrollments_daily').select('new_count, inactive_count, mrr').in('org_id', orgIds).order('fact_date', { ascending: false }).limit(90),
        supabase.from('fact_crm_pipeline_daily').select('weighted_amount, premium_sum, aging_over_7, metadata').in('org_id', orgIds).order('fact_date', { ascending: false }).limit(40),
      ]);
      return { pnl: pnlRows || [], enroll: enroll || [], pipe: pipe || [] };
    },
  });

  const traffic = useTrafficFacts(orgIds, bounds.start, bounds.end, orgIds.length > 0 && linked.traffic);

  const tickets = useQuery({
    queryKey: ['fact-tickets', orgIds.join(',')],
    enabled: orgIds.length > 0 && linked.tickets,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fact_tickets_daily')
        .select('fact_date, open_count, created_count')
        .in('org_id', orgIds)
        .order('fact_date', { ascending: false })
        .limit(14);
      if (error) throw error;
      return data || [];
    },
  });

  const sources = useQuery({
    queryKey: ['integration-sources', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integration_sources')
        .select('key, status, last_success_at, last_error')
        .eq('org_id', orgId);
      if (error) throw error;
      return data || [];
    },
  });

  const refresh = useMutation({
    mutationFn: async () => syncConnectors('all'),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  const latest = useMemo(() => {
    const map = new Map<string, Snapshot>();
    for (const row of snapshots.data || []) {
      if (!map.has(row.metric_key)) map.set(row.metric_key, row);
    }
    return map;
  }, [snapshots.data]);

  const metric = (key: string): number | null => {
    const row = latest.get(key);
    return row?.value == null ? null : Number(row.value);
  };

  const tideHistory = useMemo(() => rollupTideMonths(book.data?.trend || []), [book.data?.trend]);
  const periodMonths = useMemo(() => {
    const start = bounds.start.slice(0, 7);
    return tideHistory.filter((row) => row.month >= start);
  }, [bounds.start, tideHistory]);
  const hasTrend = periodMonths.length > 0;
  const movement = useMemo(() => {
    return (book.data?.trend || []).reduce((acc, row) => {
      if (String(row.month).slice(0, 7) < bounds.start.slice(0, 7)) return acc;
      return {
        gained: acc.gained + Number(row.enrollments),
        lost: acc.lost + Number(row.terminations),
        added: acc.added + Number(row.mrr_added),
        dropped: acc.dropped + Number(row.mrr_lost),
      };
    }, { gained: 0, lost: 0, added: 0, dropped: 0 });
  }, [book.data?.trend, bounds.start]);

  const thisMonth = useMemo(() => {
    const key = new Date().toISOString().slice(0, 7);
    return tideHistory.find((item) => item.month === key)?.gained ?? null;
  }, [tideHistory]);

  const uncoveredMrr = (() => {
    const mrr = metric('iq_mrr');
    const covered = metric('iq_covered_mrr');
    if (mrr == null || covered == null) return null;
    return mrr - covered;
  })();

  const pnlSum = useMemo(() => {
    return (pnl.data || []).reduce((acc, row) => ({
      collected: acc.collected + Number(row.collected),
      pending: acc.pending + Number(row.pending),
      failed: acc.failed + Number(row.failed),
      vendor: acc.vendor + Number(row.vendor_cost),
      commissions: acc.commissions + Number(row.commissions),
      saas: acc.saas + Number(row.saas_cost),
      net: acc.net + Number(row.net_operating),
      pendingCommissions: acc.pendingCommissions + Number(row.metadata?.commissions_pending || 0),
      coverage: Number(row.metadata?.vendor_coverage_pct ?? acc.coverage),
    }), { collected: 0, pending: 0, failed: 0, vendor: 0, commissions: 0, saas: 0, net: 0, pendingCommissions: 0, coverage: 100 });
  }, [pnl.data]);

  const forecast = useMemo(() => {
    if (!forecastFacts.data) return null;
    return computeForecast({ ...forecastFacts.data, pnl: preferCompleteMonth(forecastFacts.data.pnl) }, {
      horizonDays: 90,
      weeklyWeeks: 8,
      seasonality: 1,
      monthlyChurn: 0.03,
      winRate: 0.25,
      pessimistic: 0.7,
      optimistic: 1.25,
    });
  }, [forecastFacts.data]);

  const pipeLatest = forecastFacts.data?.pipe?.[0];
  const aging = (forecastFacts.data?.pipe || []).reduce((sum, row) => sum + Number(row.aging_over_7 || 0), 0);
  const ifClosedRaw = pipeLatest?.weighted_amount ?? latest.get('weighted_forecast')?.value;
  const ifClosed = ifClosedRaw == null ? null : Number(ifClosedRaw);
  const hasPnlRows = (pnl.data || []).length > 0;
  const hasTicketSnap = latest.has('open_ticket_count');
  const churnReasons = (book.data?.reasons || []).filter((row) => row.kind === 'churn').slice(0, 8);
  const holdReasons = (book.data?.reasons || []).filter((row) => row.kind === 'hold').slice(0, 8);

  const marketing = traffic.totals;
  const hasTrafficRows = traffic.rows.length > 0;

  const ticketSpike = useMemo(() => {
    const rows = tickets.data || [];
    if (rows.length < 8) return false;
    const today = rows[0]?.created_count || 0;
    const baseline = rows.slice(1, 8).reduce((s, row) => s + row.created_count, 0) / 7;
    return baseline > 0 && today > baseline * 1.5;
  }, [tickets.data]);

  const riskNotes = [
    ticketSpike ? 'Ticket volume is above the 7-day baseline.' : null,
    linked.enrollment && pnlSum.coverage < 90 ? `Vendor coverage is ${pnlSum.coverage}% — some active plans have no cost row.` : null,
    linked.crm && aging > 0 ? `${aging} CRM records have not moved in 7+ days.` : null,
  ].filter(Boolean) as string[];

  if (!orgId) {
    return (
      <CosPage>
        <p className="text-aryx-muted">
          No organization assigned. Ask an owner to invite you, or open ARYX CEO from Aryx Accounts.
        </p>
      </CosPage>
    );
  }

  return (
    <CosPage>
      <div className="mb-8">
        <AryxLogo wordmark />
      </div>
      <CosPageHero
        eyebrow="Command"
        title="The whole book."
        lede={
          forecast
            ? forecastSentence(90, forecast.pnl, money)
            : 'Members, advisors, billing, and payables. Action stays in AdvisorIQ and EnrollFlow.'
        }
        actions={
          isOperator ? (
            <CosIslandButton
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              trailing={refresh.isPending ? '…' : '↻'}
            >
              Refresh sources
            </CosIslandButton>
          ) : undefined
        }
        toolbar={
          <>
            <OrgPicker />
            <PeriodToggle
              value={period}
              onChange={setPeriod}
              customStart={customStart}
              customEnd={customEnd}
              onCustom={(start, end) => {
                setCustomStart(start);
                setCustomEnd(end);
              }}
            />
          </>
        }
      />

        <div className="space-y-6">
          {linked.advisoriq && tideHistory.length > 0 && (
            <MovementTide
              history={tideHistory}
              membersNow={metric('iq_active_members')}
              href="/enrollments"
              headline={{
                gained: movement.gained,
                lost: movement.lost,
                caption: period === 'ytd' ? 'This year' : period === 'qtd' ? 'This quarter' : period === 'custom' ? 'Selected range' : 'This month',
              }}
            />
          )}

          <CommandStrip title="Members" href="/enrollments" warning={!linked.advisoriq ? 'AdvisorIQ is not linked.' : null}>
            <CommandStat label="Active now" value={shown(linked.advisoriq, metric('iq_active_members'), compactNumber)} hint="AdvisorIQ book" />
            <CommandStat label="Gained" value={shown(linked.advisoriq && hasTrend, movement.gained, compactNumber)} hint="Period enrollments" />
            <CommandStat label="Lost" value={shown(linked.advisoriq && hasTrend, movement.lost, compactNumber)} hint="Period terminations" />
            <CommandStat label="On hold" value={shown(linked.advisoriq, metric('iq_on_hold_members'), compactNumber)} />
          </CommandStrip>

          <CommandStrip title="Leaving" href="/enrollments" warning={!linked.advisoriq ? 'AdvisorIQ is not linked.' : null}>
            <CommandStat label="Terminating now" value={shown(linked.advisoriq, metric('iq_terminating_members'), compactNumber)} />
            <CommandStat label="Term soon 90d" value={shown(linked.advisoriq, metric('iq_term_soon_90'), compactNumber)} hint="Projected to leave" />
            {(book.data?.risk || []).map((row) => (
              <CommandStat
                key={row.bucket}
                label={RISK_LABELS[row.bucket] || row.bucket}
                value={shown(true, row.members, compactNumber)}
                hint={money(Number(row.mrr_at_risk))}
              />
            ))}
          </CommandStrip>

          {(churnReasons.length > 0 || holdReasons.length > 0) && (
            <div className="grid gap-6 md:grid-cols-2">
              {churnReasons.length > 0 && (
                <CosBezel>
                  <h2 className="mb-4 text-[10px] uppercase tracking-[0.2em] text-aryx-faint">Why they left</h2>
                  <div className="space-y-2 text-sm">
                    {churnReasons.map((row) => (
                      <div key={`churn-${row.reason}`} className="flex justify-between gap-4">
                        <span>{row.reason}</span>
                        <span className="text-aryx-faint">{compactNumber(row.item_count)} · {money(Number(row.mrr))}</span>
                      </div>
                    ))}
                  </div>
                </CosBezel>
              )}
              {holdReasons.length > 0 && (
                <CosBezel>
                  <h2 className="mb-4 text-[10px] uppercase tracking-[0.2em] text-aryx-faint">Why they are on hold</h2>
                  <div className="space-y-2 text-sm">
                    {holdReasons.map((row) => (
                      <div key={`hold-${row.reason}`} className="flex justify-between gap-4">
                        <span>{row.reason}</span>
                        <span className="text-aryx-faint">{compactNumber(row.item_count)} · {money(Number(row.mrr))}</span>
                      </div>
                    ))}
                  </div>
                </CosBezel>
              )}
            </div>
          )}

          <CommandStrip title="Enrollments" href="/enrollments">
            <CommandStat label="This month" value={shown(linked.advisoriq, thisMonth, compactNumber)} />
            <CommandStat label="New 30d" value={shown(linked.advisoriq, metric('iq_enrollments_30'), compactNumber)} />
            <CommandStat label="New 90d" value={shown(linked.advisoriq, metric('iq_enrollments_90'), compactNumber)} />
            <CommandStat label="MRR added" value={shown(linked.advisoriq && hasTrend, movement.added, money)} hint="Period" />
          </CommandStrip>

          <CommandStrip title="Billing" href="/advisors" warning={!linked.advisoriq ? 'AdvisorIQ is not linked.' : null}>
            <CommandStat label="MRR" value={shown(linked.advisoriq, metric('iq_mrr'), money)} />
            <CommandStat label="Covered MRR" value={shown(linked.advisoriq, metric('iq_covered_mrr'), money)} />
            <CommandStat label="Uncovered" value={shown(linked.advisoriq, uncoveredMrr, money)} hint="MRR minus covered" />
            <CommandStat label="Cost" value={shown(linked.advisoriq, metric('iq_cost'), money)} />
            <CommandStat label="Net MRR" value={shown(linked.advisoriq, metric('iq_net_mrr'), money)} />
            <CommandStat label="Retention" value={shown(linked.advisoriq, metric('iq_retention_pct'), (n) => `${n}%`)} />
            <CommandStat label="Active agents" value={shown(linked.advisoriq, metric('iq_active_agents'), compactNumber)} />
          </CommandStrip>

          {linked.enrollment && (
            <CommandStrip
              title="Payables"
              href="/finance"
              warning={pnlSum.coverage < 90 ? `Vendor coverage ${pnlSum.coverage}%` : null}
            >
              <CommandStat label="Collected" value={formatFact(money, { linked: linked.enrollment, loading: pnl.isLoading, hasRows: hasPnlRows, value: pnlSum.collected })} hint="EnrollFlow billing" />
              <CommandStat label="Pending" value={formatFact(money, { linked: linked.enrollment, loading: pnl.isLoading, hasRows: hasPnlRows, value: pnlSum.pending + pnlSum.pendingCommissions })} hint="AR + unpaid commissions" />
              <CommandStat label="Failed" value={formatFact(money, { linked: linked.enrollment, loading: pnl.isLoading, hasRows: hasPnlRows, value: pnlSum.failed })} />
              <CommandStat label="Vendor" value={formatFact(money, { linked: linked.enrollment, loading: pnl.isLoading, hasRows: hasPnlRows, value: pnlSum.vendor })} />
              <CommandStat label="Commissions" value={formatFact(money, { linked: linked.enrollment, loading: pnl.isLoading, hasRows: hasPnlRows, value: pnlSum.commissions })} hint="Paid only" />
              <CommandStat label="Net" value={formatFact(money, { linked: linked.enrollment, loading: pnl.isLoading, hasRows: hasPnlRows, value: pnlSum.net })} hint="Collected − vendor − commissions − SaaS" />
            </CommandStrip>
          )}

          <CommandStrip title="Marketing" href="/marketing" warning={!linked.traffic ? 'MarketFlow / Google Analytics is not linked.' : null}>
            <CommandStat
              label="Sessions"
              value={formatFact(compactNumber, { linked: linked.traffic, loading: traffic.isLoading, hasRows: hasTrafficRows, value: marketing.sessions })}
              hint="Website"
            />
            <CommandStat
              label="Conversions"
              value={formatFact(compactNumber, { linked: linked.traffic, loading: traffic.isLoading, hasRows: hasTrafficRows, value: marketing.conversions })}
              hint="GA / MarketFlow"
            />
            <CommandStat
              label="Conv. rate"
              value={linked.traffic && hasTrafficRows ? conversionRate(marketing.conversions, marketing.sessions) : '—'}
            />
          </CommandStrip>

          {(linked.crm || linked.enrollment) && (
            <CommandStrip title="Forward" href="/finance/forecast">
              {linked.crm && (
                <CommandStat label="If-closed base" value={shown(ifClosed != null, ifClosed, money)} hint="Not collected · CRM" />
              )}
              {forecast && (
                <>
                  <CommandStat label="90-day net" value={money(forecast.pnl.base)} hint={`${money(forecast.pnl.pessimistic)}–${money(forecast.pnl.optimistic)}`} />
                  <Link to="/pipeline" className="text-sm text-aryx-accent md:col-span-1">Pipeline aging and stages</Link>
                </>
              )}
            </CommandStrip>
          )}

          <CommandStrip title="Ops risk" href={linked.tickets ? '/tickets' : '/operations/integrations'} warning={riskNotes[0] || null}>
            {linked.tickets && (
              <>
                <CommandStat label="Open tickets" value={shown(hasTicketSnap, latest.get('open_ticket_count')?.value, compactNumber)} hint={ticketSpike ? 'Spike vs 7-day baseline' : 'ITSTS'} />
                <CommandStat label="SLA breach" value={shown(latest.has('breached_ticket_count'), latest.get('breached_ticket_count')?.value, compactNumber)} />
                <CommandStat label="Unassigned" value={shown(latest.has('unassigned_ticket_count'), latest.get('unassigned_ticket_count')?.value, compactNumber)} />
              </>
            )}
            {linked.enrollment && (
              <CommandStat label="Vendor coverage" value={`${pnlSum.coverage}%`} hint={pnlSum.coverage < 90 ? 'Below 90%' : 'Carrier match'} />
            )}
            {linked.crm && (
              <CommandStat label="CRM aging 7d+" value={compactNumber(aging)} />
            )}
          </CommandStrip>
        </div>

        {linked.advisoriq && (book.data?.advisors || []).length > 0 && (
          <div className="mt-10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-aryx-faint">Advisors</h2>
              <Link to="/advisors" className="text-[10px] uppercase tracking-[0.16em] text-aryx-accent">Open</Link>
            </div>
            <CosTable>
              <table className="w-full text-left text-sm">
                <thead className="text-[10px] uppercase tracking-[0.16em] text-aryx-faint">
                  <tr>
                    <th className="py-2">Advisor</th>
                    <th>Members</th>
                    <th>MRR</th>
                    <th>Net</th>
                    <th>Retention</th>
                    <th>Term soon</th>
                    <th>New 30d</th>
                    <th>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {book.data?.advisors.map((row) => (
                    <tr key={`${row.org_id}-${row.advisor_key}`} className="border-t border-aryx-line">
                      <td className="py-3">{row.display_name || row.advisor_key.slice(0, 8)}</td>
                      <td>{compactNumber(row.active_members)}</td>
                      <td>{money(row.mrr)}</td>
                      <td>{money(row.net_mrr)}</td>
                      <td>{row.retention_pct == null ? '—' : `${row.retention_pct}%`}</td>
                      <td>{compactNumber(row.term_soon_90)}</td>
                      <td>{compactNumber(row.enrollments_30)}</td>
                      <td>{row.margin_pct == null ? '—' : `${row.margin_pct}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CosTable>
          </div>
        )}

        {linked.advisoriq && (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <CosBezel>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[10px] uppercase tracking-[0.2em] text-aryx-faint">Billing risk</h2>
                  <a href={iqHref('/command')} className="text-[10px] uppercase tracking-[0.16em] text-aryx-accent" target="_blank" rel="noreferrer">AdvisorIQ</a>
                </div>
                {(book.data?.billing || []).length === 0 && <p className="text-sm text-aryx-muted">No billing-risk rows yet.</p>}
                <ul className="space-y-3 text-sm">
                  {(book.data?.billing || []).map((row) => (
                    <li key={`${row.member_key}-${row.product_key}`} className="flex justify-between gap-4">
                      <span>
                        {row.display_name || 'Member'}
                        <span className="block text-xs text-aryx-faint">{row.product_key} · {row.advisor_label || '—'}</span>
                      </span>
                      <span className="text-right text-aryx-faint">
                        {money(Number(row.monthly_fee))}
                        <span className="block text-xs">{row.risk_flag || row.status || '—'}</span>
                        <a href={iqHref('/command')} className="block text-xs text-aryx-accent" target="_blank" rel="noreferrer">Open in AdvisorIQ</a>
                      </span>
                    </li>
                  ))}
                </ul>
            </CosBezel>
            <CosBezel>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[10px] uppercase tracking-[0.2em] text-aryx-faint">Queue</h2>
                  <a href={iqHref('/command')} className="text-[10px] uppercase tracking-[0.16em] text-aryx-accent" target="_blank" rel="noreferrer">AdvisorIQ</a>
                </div>
                {(book.data?.actions || []).length === 0 && <p className="text-sm text-aryx-muted">No open actions yet.</p>}
                <ul className="space-y-3 text-sm">
                  {(book.data?.actions || []).map((row) => (
                    <li key={row.action_key}>
                      <a href={iqHref(row.href)} className="hover:text-aryx-accent" target="_blank" rel="noreferrer">
                        {row.title || row.kind}
                      </a>
                      <span className="block text-xs text-aryx-faint">
                        {row.kind}{row.dollars != null ? ` · ${money(Number(row.dollars))}` : ''}
                      </span>
                      <a href={iqHref(row.href)} className="text-xs text-aryx-accent" target="_blank" rel="noreferrer">Open in AdvisorIQ</a>
                    </li>
                  ))}
                </ul>
            </CosBezel>
          </div>
        )}

        {!linked.enrollment && !linked.crm && !linked.advisoriq && (
          <CosBezel className="mt-8">
            <p className="text-aryx-muted">
              Sources are not linked for this organization. Remote maps are server-owned so tenants cannot point ARYX CEO at another project. Command will not invent zeros.
            </p>
          </CosBezel>
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          {(sources.data || []).map((source) => (
            <span key={source.key} className="rounded-full bg-aryx-ink/[0.04] px-3 py-1 text-[10px] uppercase tracking-wider text-aryx-faint ring-1 ring-aryx-line">
              {source.key} · {source.status}
            </span>
          ))}
        </div>
    </CosPage>
  );
}

export default CosHome;
