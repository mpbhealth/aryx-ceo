import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { money, compactNumber } from '@/lib/cos';
import { useOrg } from '@/contexts/OrgContext';
import { OrgPicker } from '../cos/OrgPicker';
import { Unlinked } from './CosFinance';
import { CosPage, CosPageHero } from '../cos/CosPage';
import { computeForecast, forecastSentence, HORIZON_PRESETS, preferCompleteMonth, priorForecastDelta, type ForecastAssumptions } from '@/lib/forecast';
import { churnNote, observedMonthlyChurn } from '@/lib/ownerBrief';

export function CosForecast() {
  const { orgId, linked, isOperator } = useOrg();
  const queryClient = useQueryClient();
  const [churnEdited, setChurnEdited] = useState(false);
  const [assumptions, setAssumptions] = useState<ForecastAssumptions>({
    horizonDays: 90,
    weeklyWeeks: 8,
    seasonality: 1,
    monthlyChurn: 0.03,
    winRate: 0.25,
    pessimistic: 0.7,
    optimistic: 1.25,
  });

  const facts = useQuery({
    queryKey: ['forecast-inputs', orgId],
    enabled: Boolean(orgId) && linked.enrollment,
    queryFn: async () => {
      const [{ data: pnl }, { data: enroll }, { data: pipe }] = await Promise.all([
        supabase.from('fact_pnl_period').select('period_start, collected, vendor_cost, commissions, saas_cost, active_members').eq('org_id', orgId).eq('period_grain', 'month').order('period_start', { ascending: false }).limit(4),
        supabase.from('fact_enrollments_daily').select('new_count, inactive_count, active_count, mrr, fact_date').eq('org_id', orgId).order('fact_date', { ascending: false }).limit(120),
        supabase.from('fact_crm_pipeline_daily').select('weighted_amount, premium_sum, fact_date').eq('org_id', orgId).order('fact_date', { ascending: false }).limit(30),
      ]);
      return { pnl: pnl || [], enroll: enroll || [], pipe: pipe || [] };
    },
  });

  const lastRun = useQuery({
    queryKey: ['forecast-runs', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forecast_runs')
        .select('assumptions, outputs, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const churn = useMemo(() => observedMonthlyChurn(facts.data?.enroll || []), [facts.data]);

  useEffect(() => {
    if (!facts.data || churnEdited || churn.source !== 'observed') return;
    setAssumptions((prev) => ({ ...prev, monthlyChurn: Number(churn.rate.toFixed(4)) }));
  }, [churn.rate, churn.source, churnEdited, facts.data]);

  const computed = useMemo(() => {
    if (!facts.data) return null;
    const monthlyChurn = churnEdited || churn.source === 'default' ? assumptions.monthlyChurn : churn.rate;
    return computeForecast({ ...facts.data, pnl: preferCompleteMonth(facts.data.pnl) }, { ...assumptions, monthlyChurn });
  }, [assumptions, churn.rate, churn.source, churnEdited, facts.data]);

  const priorDelta = computed ? priorForecastDelta(computed, lastRun.data?.outputs as { pnl?: { base?: number } } | null) : null;

  const save = useMutation({
    mutationFn: async () => {
      if (!orgId || !computed) return;
      const { error } = await supabase.from('forecast_runs').insert({
        org_id: orgId,
        horizon_days: assumptions.horizonDays,
        assumptions,
        outputs: computed,
        created_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forecast-runs'] }),
  });

  if (!linked.enrollment) {
    return <Unlinked title="Forecasts" message="EnrollFlow must be linked before forecasts can run." />;
  }

  return (
    <CosPage>
      <CosPageHero
        eyebrow="Finance"
        title="Forecasts."
        lede={
          computed
            ? `${forecastSentence(assumptions.horizonDays, computed.pnl, money)} ${churnEdited ? 'Monthly churn is the rate in the form.' : churnNote(churn)}`
            : 'Trailing run-rate × seasonality ± CRM weighted pipeline. Not a guarantee.'
        }
        toolbar={<OrgPicker />}
      />
      <div className="mt-6 flex flex-wrap gap-2">
        {HORIZON_PRESETS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => setAssumptions({ ...assumptions, horizonDays: days })}
            className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${
              assumptions.horizonDays === days ? 'bg-aryx-accent text-white' : 'border border-aryx-line text-aryx-muted'
            }`}
          >
            {days}d
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-xs text-aryx-muted">Seasonality
          <input type="number" step="0.05" className="mt-1 w-full rounded-xl border border-aryx-line bg-aryx-elevated px-3 py-2 text-aryx-ink" value={assumptions.seasonality} onChange={(e) => setAssumptions({ ...assumptions, seasonality: Number(e.target.value) })} />
        </label>
        <label className="text-xs text-aryx-muted">Monthly churn
          <input type="number" step="0.01" className="mt-1 w-full rounded-xl border border-aryx-line bg-aryx-elevated px-3 py-2 text-aryx-ink" value={assumptions.monthlyChurn} onChange={(e) => { setChurnEdited(true); setAssumptions({ ...assumptions, monthlyChurn: Number(e.target.value) }); }} />
        </label>
        <label className="text-xs text-aryx-muted">Win rate
          <input type="number" step="0.01" className="mt-1 w-full rounded-xl border border-aryx-line bg-aryx-elevated px-3 py-2 text-aryx-ink" value={assumptions.winRate} onChange={(e) => setAssumptions({ ...assumptions, winRate: Number(e.target.value) })} />
        </label>
      </div>
      {computed && (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.16em] text-aryx-faint">
              <tr>
                <th className="py-2">Band</th>
                <th>Pessimistic</th>
                <th>Base</th>
                <th>Optimistic</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-aryx-line">
                <td className="py-3">Members</td>
                <td>{compactNumber(computed.members.pessimistic)}</td>
                <td>{compactNumber(computed.members.base)}</td>
                <td>{compactNumber(computed.members.optimistic)}</td>
              </tr>
              <tr className="border-t border-aryx-line">
                <td className="py-3">Revenue</td>
                <td>{money(computed.revenue.pessimistic)}</td>
                <td>{money(computed.revenue.base)}</td>
                <td>{money(computed.revenue.optimistic)}</td>
              </tr>
              <tr className="border-t border-aryx-line">
                <td className="py-3">Vendor</td>
                <td>{money(computed.vendor.pessimistic)}</td>
                <td>{money(computed.vendor.base)}</td>
                <td>{money(computed.vendor.optimistic)}</td>
              </tr>
              <tr className="border-t border-aryx-line">
                <td className="py-3">Net</td>
                <td>{money(computed.pnl.pessimistic)}</td>
                <td>{money(computed.pnl.base)}</td>
                <td>{money(computed.pnl.optimistic)}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Stat label="Commissions (horizon)" value={money(computed.commissions)} />
            <Stat label="SaaS (horizon)" value={money(computed.saas)} />
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-aryx-faint">
        Last saved base net vs now: {priorDelta == null ? 'no prior run' : money(priorDelta)}
        {lastRun.data?.created_at ? ` · saved ${new Date(lastRun.data.created_at).toLocaleString()}` : ''}
      </p>
      {isOperator && (
        <button type="button" onClick={() => save.mutate()} className="mt-6 rounded-full bg-aryx-accent px-5 py-2 text-sm text-white">
          Save run
        </button>
      )}
    </CosPage>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-aryx-elevated p-5 ring-1 ring-aryx-line">
      <p className="text-[10px] uppercase tracking-[0.16em] text-aryx-faint">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

export default CosForecast;
