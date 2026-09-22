import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { money } from '@/lib/cos';
import { cashPace, mrrLeavingWithin90, paceMonth } from '@/lib/cashOutlook';
import { formatFact } from '@/lib/marketingFacts';
import { useOrg } from '@/contexts/OrgContext';
import { OrgPicker } from '../cos/OrgPicker';
import { CommandStat, CommandStrip } from '../cos/CommandStrip';
import { CosPage, CosPageHero } from '../cos/CosPage';
import { Unlinked } from './CosFinance';

interface PnlMonth {
  period_start: string;
  collected: number;
  pending: number;
  failed: number;
  vendor_cost: number;
  commissions: number;
  metadata?: { commissions_pending?: number };
}

export function CosCash() {
  const { orgId, linked, rollup, memberships } = useOrg();
  const orgIds = rollup ? memberships.map((row) => row.org_id) : orgId ? [orgId] : [];

  const pnl = useQuery({
    queryKey: ['cash-pnl', orgIds.join(',')],
    enabled: orgIds.length > 0 && linked.enrollment,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fact_pnl_period')
        .select('period_start, collected, pending, failed, vendor_cost, commissions, metadata')
        .in('org_id', orgIds)
        .eq('period_grain', 'month')
        .order('period_start', { ascending: false })
        .limit(18);
      if (error) throw error;
      return (data || []) as PnlMonth[];
    },
  });

  const risk = useQuery({
    queryKey: ['cash-forward-risk', orgIds.join(',')],
    enabled: orgIds.length > 0 && linked.advisoriq,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fact_iq_forward_risk')
        .select('bucket, mrr_at_risk')
        .in('org_id', orgIds);
      if (error) throw error;
      return data || [];
    },
  });

  const months = useMemo(() => {
    const map = new Map<string, PnlMonth>();
    for (const row of pnl.data || []) {
      const key = String(row.period_start).slice(0, 10);
      const cur = map.get(key) || {
        period_start: key,
        collected: 0,
        pending: 0,
        failed: 0,
        vendor_cost: 0,
        commissions: 0,
        metadata: {},
      };
      cur.collected += Number(row.collected || 0);
      cur.pending += Number(row.pending || 0);
      cur.failed += Number(row.failed || 0);
      cur.vendor_cost += Number(row.vendor_cost || 0);
      cur.commissions += Number(row.commissions || 0);
      if (row.metadata?.commissions_pending != null) {
        cur.metadata = {
          commissions_pending: Number(cur.metadata?.commissions_pending || 0) + Number(row.metadata.commissions_pending),
        };
      }
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.period_start.localeCompare(a.period_start));
  }, [pnl.data]);

  const paced = useMemo(() => paceMonth(months), [months]);
  const leaving = mrrLeavingWithin90((risk.data || []).map((row) => ({
    bucket: String(row.bucket),
    mrr: Number(row.mrr_at_risk),
  })));
  const expected = paced.row ? cashPace({
    collected: Number(paced.row.collected),
    vendor: Number(paced.row.vendor_cost),
    commissions: Number(paced.row.commissions),
    pendingCommissions: Number(paced.row.metadata?.commissions_pending || 0),
    mrrLeaving90: linked.advisoriq ? leaving : null,
  }) : null;

  if (!linked.enrollment) {
    return <Unlinked title="Cash" message="EnrollFlow is not linked, so there is no billing pace to read." />;
  }

  const hasRows = months.length > 0;
  const fact = (value: number | null) => formatFact(money, {
    linked: true,
    loading: pnl.isLoading || risk.isLoading,
    hasRows: hasRows && value != null,
    value: value || 0,
  });

  return (
    <CosPage>
      <CosPageHero
        eyebrow="Finance"
        title="Cash."
        lede="90-day pace from the last complete month: collected, minus carrier cost, minus paid commissions, minus pending commissions, minus MRR already scheduled to leave. This is pace, not recovered cash."
        toolbar={<OrgPicker />}
      />
      <CommandStrip title="90-day pace">
        <CommandStat label="Expected" value={fact(expected)} hint={paced.inProgress ? 'In-progress month. No earlier month is in the warehouse.' : 'Not a ledger'} />
        <CommandStat label="Collected run-rate" value={fact(paced.row ? Number(paced.row.collected) : null)} hint={paced.row?.period_start?.slice(0, 7)} />
        <CommandStat label="Pending commissions" value={fact(paced.row?.metadata?.commissions_pending == null ? null : Number(paced.row.metadata.commissions_pending))} />
        <CommandStat
          label="Leaving inside 90 days"
          value={linked.advisoriq ? fact(leaving) : '—'}
          hint={linked.advisoriq ? 'AdvisorIQ forward risk' : 'AdvisorIQ is not linked'}
        />
      </CommandStrip>
      <div className="mt-10">
        <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-aryx-faint">Collected, pending, failed</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-[0.16em] text-aryx-faint">
              <tr>
                <th className="py-2">Month</th>
                <th>Collected</th>
                <th>Pending</th>
                <th>Failed</th>
              </tr>
            </thead>
            <tbody>
              {months.map((row) => (
                <tr key={row.period_start} className="border-t border-aryx-line">
                  <td className="py-3">{row.period_start.slice(0, 7)}</td>
                  <td>{money(Number(row.collected))}</td>
                  <td>{money(Number(row.pending))}</td>
                  <td>{money(Number(row.failed))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!hasRows && <p className="mt-3 text-sm text-aryx-muted">No billing months in the warehouse.</p>}
      </div>
    </CosPage>
  );
}

export default CosCash;
