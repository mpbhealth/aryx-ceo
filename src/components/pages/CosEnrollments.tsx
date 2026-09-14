import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { compactNumber, money, periodBounds, type PeriodKey } from '@/lib/cos';
import { formatFact } from '@/lib/marketingFacts';
import { computeForecast, preferCompleteMonth } from '@/lib/forecast';
import { useOrg } from '@/contexts/OrgContext';
import { OrgPicker } from '../cos/OrgPicker';
import { PeriodToggle } from '../cos/PeriodToggle';
import { CommandStat, CommandStrip } from '../cos/CommandStrip';
import { MovementTide } from '../cos/MovementTide';
import { TrendSpark } from '../cos/TrendSpark';
import { Unlinked } from './CosFinance';
import { CosIslandLink, CosPage, CosPageHero } from '../cos/CosPage';
import { rollupTideMonths } from '@/lib/movementTide';

export function CosEnrollments() {
  const { orgId, linked, rollup, memberships } = useOrg();
  const [period, setPeriod] = useState<PeriodKey>('mtd');
  const bounds = periodBounds(period);
  const orgIds = rollup ? memberships.map((row) => row.org_id) : orgId ? [orgId] : [];

  const rows = useQuery({
    queryKey: ['enroll-facts', orgIds.join(','), bounds.start],
    enabled: orgIds.length > 0 && linked.enrollment,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fact_enrollments_daily')
        .select('fact_date, product_key, plan_type, new_count, inactive_count, active_count, mrr')
        .in('org_id', orgIds)
        .gte('fact_date', bounds.start)
        .order('fact_date', { ascending: false })
        .limit(400);
      if (error) throw error;
      return data || [];
    },
  });

  const sparkRows = useQuery({
    queryKey: ['enroll-spark', orgIds.join(',')],
    enabled: orgIds.length > 0 && linked.enrollment,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fact_enrollments_daily')
        .select('fact_date, new_count, inactive_count')
        .in('org_id', orgIds)
        .order('fact_date', { ascending: false })
        .limit(90);
      if (error) throw error;
      return data || [];
    },
  });

  const iqBook = useQuery({
    queryKey: ['enroll-iq-book', orgIds.join(',')],
    enabled: orgIds.length > 0 && linked.advisoriq,
    queryFn: async () => {
      const [trend, risk] = await Promise.all([
        supabase.from('fact_iq_mrr_monthly').select('month, enrollments, terminations, mrr_added, mrr_lost').in('org_id', orgIds).order('month').limit(24),
        supabase.from('fact_iq_forward_risk').select('bucket, members, mrr_at_risk').in('org_id', orgIds),
      ]);
      if (trend.error) throw trend.error;
      if (risk.error) throw risk.error;
      return { trend: trend.data || [], risk: risk.data || [] };
    },
  });

  const cohorts = useQuery({
    queryKey: ['enroll-iq-cohorts', orgIds.join(',')],
    enabled: orgIds.length > 0 && linked.advisoriq,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fact_iq_cohorts')
        .select('cohort_month, cohort_size, retained, retention_pct')
        .in('org_id', orgIds)
        .order('cohort_month', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
  });

  const forecastFacts = useQuery({
    queryKey: ['enroll-forecast', orgIds.join(',')],
    enabled: orgIds.length > 0 && linked.enrollment,
    queryFn: async () => {
      const [{ data: pnl }, { data: enroll }, { data: pipe }] = await Promise.all([
        supabase.from('fact_pnl_period').select('period_start, collected, vendor_cost, commissions, saas_cost, active_members').in('org_id', orgIds).eq('period_grain', 'month').order('period_start', { ascending: false }).limit(4),
        supabase.from('fact_enrollments_daily').select('new_count, inactive_count, mrr').in('org_id', orgIds).order('fact_date', { ascending: false }).limit(90),
        supabase.from('fact_crm_pipeline_daily').select('weighted_amount, premium_sum').in('org_id', orgIds).order('fact_date', { ascending: false }).limit(10),
      ]);
      return { pnl: pnl || [], enroll: enroll || [], pipe: pipe || [] };
    },
  });

  const totals = useMemo(() => {
    return (rows.data || []).reduce((acc, row) => ({
      neu: acc.neu + Number(row.new_count),
      inactive: acc.inactive + Number(row.inactive_count),
    }), { neu: 0, inactive: 0 });
  }, [rows.data]);

  const mix = useMemo(() => {
    const map = new Map<string, { new_count: number; mrr: number }>();
    for (const row of rows.data || []) {
      const key = `${row.product_key || 'unmapped'} · ${row.plan_type || 'plan'}`;
      const cur = map.get(key) || { new_count: 0, mrr: 0 };
      cur.new_count += Number(row.new_count);
      cur.mrr += Number(row.mrr);
      map.set(key, cur);
    }
    return [...map.entries()].sort((a, b) => b[1].new_count - a[1].new_count);
  }, [rows.data]);

  const spark = useMemo(() => {
    const byDay = new Map<string, { date: string; new: number; inactive: number }>();
    for (const row of sparkRows.data || []) {
      const cur = byDay.get(row.fact_date) || { date: row.fact_date, new: 0, inactive: 0 };
      cur.new += Number(row.new_count);
      cur.inactive += Number(row.inactive_count);
      byDay.set(row.fact_date, cur);
    }
    return [...byDay.values()].reverse();
  }, [sparkRows.data]);

  const tideHistory = useMemo(() => rollupTideMonths(iqBook.data?.trend || []), [iqBook.data?.trend]);

  const riskLabels: Record<string, string> = {
    '0_30': '0–30 days',
    '31_60': '31–60 days',
    '61_90': '61–90 days',
    '90_plus': '90+ days',
  };

  const projection = useMemo(() => {
    if (!forecastFacts.data) return null;
    return computeForecast({ ...forecastFacts.data, pnl: preferCompleteMonth(forecastFacts.data.pnl) }, {
      horizonDays: 90,
      weeklyWeeks: 8,
      seasonality: 1,
      monthlyChurn: 0.03,
      winRate: 0.25,
      pessimistic: 0.7,
      optimistic: 1.25,
    }).members;
  }, [forecastFacts.data]);

  if (!linked.enrollment && !linked.advisoriq) {
    return <Unlinked title="Enrollments" message="EnrollFlow and AdvisorIQ are not linked for this organization." />;
  }

  return (
    <CosPage>
      <CosPageHero
        eyebrow="Enrollment"
        title="Members."
        actions={<CosIslandLink to="/advisors">Advisor books</CosIslandLink>}
        toolbar={
          <>
            <OrgPicker />
            <PeriodToggle value={period} onChange={setPeriod} />
          </>
        }
      />
      {linked.enrollment && (
      <CommandStrip title="Period totals">
        <CommandStat label="New" value={formatFact(compactNumber, { linked: linked.enrollment, loading: rows.isLoading, hasRows: (rows.data || []).length > 0, value: totals.neu })} />
        <CommandStat label="Inactive" value={formatFact(compactNumber, { linked: linked.enrollment, loading: rows.isLoading, hasRows: (rows.data || []).length > 0, value: totals.inactive })} />
        <CommandStat label="Net adds" value={formatFact(compactNumber, { linked: linked.enrollment, loading: rows.isLoading, hasRows: (rows.data || []).length > 0, value: totals.neu - totals.inactive })} />
      </CommandStrip>
      )}
      {linked.enrollment && projection && (
        <div className="mt-6">
          <CommandStrip title="90-day member projection">
            <CommandStat label="Pessimistic" value={compactNumber(projection.pessimistic)} />
            <CommandStat label="Base" value={compactNumber(projection.base)} />
            <CommandStat label="Optimistic" value={compactNumber(projection.optimistic)} />
          </CommandStrip>
        </div>
      )}
      {linked.enrollment && (
      <div className="mt-8">
        <p className="mb-3 text-[10px] uppercase tracking-[0.16em] text-aryx-faint">90-day EnrollFlow trend</p>
        <TrendSpark data={spark} xKey="date" series={[{ key: 'new', color: '#FF5A1F' }, { key: 'inactive', color: '#888' }]} />
      </div>
      )}
      {linked.advisoriq && tideHistory.length > 0 && (
        <div className="mt-8">
          <MovementTide history={tideHistory} />
        </div>
      )}
      {linked.advisoriq && (cohorts.data || []).length > 0 && (
        <div className="mt-8">
          <CommandStrip title="AdvisorIQ cohorts">
            {(cohorts.data || []).slice(0, 6).map((row) => (
              <CommandStat
                key={row.cohort_month}
                label={String(row.cohort_month).slice(0, 7)}
                value={`${compactNumber(row.retained)}/${compactNumber(row.cohort_size)}`}
                hint={`${Number(row.retention_pct || 0).toFixed(0)}% retained`}
              />
            ))}
          </CommandStrip>
        </div>
      )}
      {linked.advisoriq && (iqBook.data?.risk || []).length > 0 && (
        <div className="mt-8">
          <CommandStrip title="Term soon">
            {(iqBook.data?.risk || []).map((row) => (
              <CommandStat
                key={row.bucket}
                label={riskLabels[row.bucket] || row.bucket}
                value={compactNumber(row.members)}
                hint={money(Number(row.mrr_at_risk))}
              />
            ))}
          </CommandStrip>
        </div>
      )}
      {linked.enrollment && (
        <>
      <h2 className="mb-3 mt-10 text-sm uppercase tracking-[0.16em] text-aryx-faint">Product / plan mix</h2>
      <div className="space-y-2">
        {mix.map(([label, row]) => (
          <div key={label} className="flex justify-between rounded-2xl bg-aryx-elevated px-5 py-3 ring-1 ring-aryx-line">
            <span>{label}</span>
            <span>{compactNumber(row.new_count)} new · {money(row.mrr)} MRR</span>
          </div>
        ))}
      </div>
        </>
      )}
    </CosPage>
  );
}

export default CosEnrollments;
