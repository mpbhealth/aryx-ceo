import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { money, periodBounds, type PeriodGrain, type PeriodKey } from '@/lib/cos';
import { formatFact } from '@/lib/marketingFacts';
import { downloadCsv } from '@/lib/exportFacts';
import { useOrg } from '@/contexts/OrgContext';
import { OrgPicker } from '../cos/OrgPicker';
import { PeriodToggle } from '../cos/PeriodToggle';
import { CommandStat, CommandStrip } from '../cos/CommandStrip';
import { CosPage, CosPageHero } from '../cos/CosPage';

interface PnlRow {
  period_start: string;
  period_grain: string;
  collected: number;
  pending: number;
  failed: number;
  vendor_cost: number;
  commissions: number;
  saas_cost: number;
  gross_margin: number;
  net_operating: number;
  metadata?: {
    vendor_coverage_pct?: number;
    missing_vendor_matches?: number;
    commissions_pending?: number;
  };
}

const GRAINS: PeriodGrain[] = ['month', 'quarter', 'year'];

export function CosFinance() {
  const { orgId, linked, rollup, memberships, isOperator } = useOrg();
  const [period, setPeriod] = useState<PeriodKey>('mtd');
  const [grain, setGrain] = useState<PeriodGrain>('month');
  const orgIds = rollup ? memberships.map((row) => row.org_id) : orgId ? [orgId] : [];
  const bounds = periodBounds(period);

  const rows = useQuery({
    queryKey: ['finance-pnl', orgIds.join(','), bounds.start, grain],
    enabled: orgIds.length > 0 && linked.enrollment,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fact_pnl_period')
        .select('*')
        .in('org_id', orgIds)
        .eq('period_grain', grain)
        .gte('period_start', bounds.start)
        .order('period_start', { ascending: false });
      if (error) throw error;
      return (data || []) as PnlRow[];
    },
  });

  const hasRows = (rows.data || []).length > 0;
  const fact = (value: number) => formatFact(money, {
    linked: linked.enrollment,
    loading: rows.isLoading,
    hasRows,
    value,
  });

  const total = useMemo(() => {
    return (rows.data || []).reduce((acc, row) => ({
      collected: acc.collected + Number(row.collected),
      pending: acc.pending + Number(row.pending),
      failed: acc.failed + Number(row.failed),
      vendor: acc.vendor + Number(row.vendor_cost),
      commissions: acc.commissions + Number(row.commissions),
      saas: acc.saas + Number(row.saas_cost),
      gross: acc.gross + Number(row.gross_margin),
      net: acc.net + Number(row.net_operating),
      pendingCommissions: acc.pendingCommissions + Number(row.metadata?.commissions_pending || 0),
      coverage: Number(row.metadata?.vendor_coverage_pct ?? acc.coverage),
      missing: acc.missing + Number(row.metadata?.missing_vendor_matches || 0),
    }), { collected: 0, pending: 0, failed: 0, vendor: 0, commissions: 0, saas: 0, gross: 0, net: 0, pendingCommissions: 0, coverage: 100, missing: 0 });
  }, [rows.data]);

  if (!linked.enrollment) {
    return <Unlinked title="Profit & Loss" message="EnrollFlow is not linked for this organization." />;
  }

  return (
    <CosPage>
      <CosPageHero
        eyebrow="Finance"
        title="Profit & Loss."
        toolbar={
          <>
            <OrgPicker />
            <div className="flex flex-wrap items-center gap-3">
              <PeriodToggle value={period} onChange={setPeriod} />
              <div className="flex gap-2">
                {GRAINS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setGrain(id)}
                    className={`rounded-full px-3 py-2.5 text-[10px] uppercase tracking-[0.16em] ${
                      grain === id ? 'bg-aryx-accent text-white' : 'bg-aryx-ink/[0.04] text-aryx-muted ring-1 ring-aryx-line'
                    }`}
                  >
                    {id}
                  </button>
                ))}
              </div>
              {isOperator && (
                <button
                  type="button"
                  className="rounded-full bg-aryx-ink/[0.04] px-4 py-2.5 text-[10px] uppercase tracking-[0.16em] text-aryx-muted ring-1 ring-aryx-line"
                  onClick={() => downloadCsv(`cos-pnl-${bounds.start}.csv`, (rows.data || []) as unknown as Array<Record<string, unknown>>)}
                >
                  Export CSV
                </button>
              )}
            </div>
          </>
        }
      />
      {hasRows && total.coverage < 90 && (
        <p className="mb-6 rounded-[1.5rem] bg-amber-500/10 px-4 py-3 text-sm ring-1 ring-amber-500/30">
          Vendor coverage is {total.coverage}%. {total.missing} active enrollments have no carrier cost row.
        </p>
      )}
      <CommandStrip title="Period totals">
        <CommandStat label="Collected" value={fact(total.collected)} />
        <CommandStat label="Vendor cost" value={fact(total.vendor)} hint="Current book on the latest month" />
        <CommandStat label="Commissions" value={fact(total.commissions)} hint="Paid" />
        <CommandStat label="Net operating" value={fact(total.net)} />
      </CommandStrip>
      <div className="mt-10 space-y-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-aryx-faint">Waterfall</p>
        {[
          ['Collected', total.collected],
          ['Pending AR', total.pending],
          ['Failed', -total.failed],
          ['− Vendor', -total.vendor],
          ['− Commissions (paid)', -total.commissions],
          ['Pending commissions', total.pendingCommissions],
          ['− SaaS', -total.saas],
          ['Net', total.net],
        ].map(([label, value]) => (
          <div key={String(label)} className="flex items-center justify-between rounded-[1.5rem] bg-aryx-elevated px-5 py-3 ring-1 ring-aryx-line">
            <span>{label}</span>
            <span className="font-semibold">{money(Number(value))}</span>
          </div>
        ))}
      </div>
      <div className="mt-10 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[10px] uppercase tracking-[0.16em] text-aryx-faint">
            <tr>
              <th className="py-2">Period</th>
              <th className="py-2">Collected</th>
              <th className="py-2">Pending</th>
              <th className="py-2">Failed</th>
              <th className="py-2">Vendor</th>
              <th className="py-2">Commissions</th>
              <th className="py-2">SaaS</th>
              <th className="py-2">Net</th>
            </tr>
          </thead>
          <tbody>
            {(rows.data || []).map((row) => (
              <tr key={`${row.period_start}-${row.period_grain}`} className="border-t border-aryx-line">
                <td className="py-3">{row.period_start}</td>
                <td>{money(row.collected)}</td>
                <td>{money(row.pending)}</td>
                <td>{money(row.failed)}</td>
                <td>{money(row.vendor_cost)}</td>
                <td>{money(row.commissions)}</td>
                <td>{money(row.saas_cost)}</td>
                <td>{money(row.net_operating)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CosPage>
  );
}

export function Unlinked({ title, message }: { title: string; message: string }) {
  return (
    <CosPage>
      <CosPageHero eyebrow="Command" title={`${title}.`} lede={message} />
    </CosPage>
  );
}

export default CosFinance;
