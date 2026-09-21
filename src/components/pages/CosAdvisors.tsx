import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { compactNumber, money, ADVISORIQ_HREF } from '@/lib/cos';
import { useOrg } from '@/contexts/OrgContext';
import { OrgPicker } from '../cos/OrgPicker';
import { CommandStat, CommandStrip } from '../cos/CommandStrip';
import { Unlinked } from './CosFinance';
import { CosIslandLink, CosPage, CosPageHero } from '../cos/CosPage';

interface AdvisorRow {
  org_id: string;
  advisor_key: string;
  display_name: string | null;
  active_members: number;
  terminating_members: number;
  term_soon_90: number;
  on_hold_members: number;
  mrr: number;
  net_mrr: number;
  retention_pct: number | null;
  enrollments_30: number;
  enrollments_90: number;
  mrr_added_90: number;
  margin_pct: number | null;
}

type SortKey = 'mrr' | 'active_members' | 'retention_pct' | 'term_soon_90' | 'enrollments_30' | 'terminating_members' | 'mrr_added_90';

export function CosAdvisors() {
  const { orgId, linked, rollup, memberships } = useOrg();
  const orgIds = rollup ? memberships.map((row) => row.org_id) : orgId ? [orgId] : [];
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('mrr');

  const rows = useQuery({
    queryKey: ['advisor-scorecards', orgIds.join(',')],
    enabled: orgIds.length > 0 && linked.advisoriq,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('advisor_scorecards')
        .select('org_id, advisor_key, display_name, active_members, terminating_members, term_soon_90, on_hold_members, mrr, net_mrr, retention_pct, enrollments_30, enrollments_90, mrr_added_90, margin_pct')
        .in('org_id', orgIds)
        .order('mrr', { ascending: false });
      if (error) throw error;
      return (data || []) as AdvisorRow[];
    },
  });

  const mix = useQuery({
    queryKey: ['product-mix', orgIds.join(',')],
    enabled: orgIds.length > 0 && linked.advisoriq,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fact_product_mix')
        .select('product_key, active_members, mrr, net_mrr, margin_pct')
        .in('org_id', orgIds)
        .order('mrr', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const billing = useQuery({
    queryKey: ['book-billing-risk', orgIds.join(',')],
    enabled: orgIds.length > 0 && linked.advisoriq,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('book_billing_risk')
        .select('display_name, member_key, product_key, monthly_fee, risk_flag, status')
        .in('org_id', orgIds)
        .order('next_billing_date', { ascending: true, nullsFirst: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = (rows.data || []).filter((row) => {
      if (!needle) return true;
      const name = (row.display_name || '').toLowerCase();
      return name.includes(needle) || row.advisor_key.toLowerCase().includes(needle);
    });
    return [...list].sort((a, b) => Number(b[sortKey] || 0) - Number(a[sortKey] || 0));
  }, [query, rows.data, sortKey]);

  const rollupStats = useMemo(() => {
    const list = rows.data || [];
    const totalMrr = list.reduce((s, row) => s + Number(row.mrr), 0);
    const top10 = [...list].sort((a, b) => Number(b.mrr) - Number(a.mrr)).slice(0, 10).reduce((s, row) => s + Number(row.mrr), 0);
    return {
      books: list.length,
      members: list.reduce((s, row) => s + Number(row.active_members), 0),
      termSoon: list.reduce((s, row) => s + Number(row.term_soon_90), 0),
      totalMrr,
      concentration: totalMrr > 0 ? Number(((top10 / totalMrr) * 100).toFixed(1)) : 0,
    };
  }, [rows.data]);

  const mixMax = Math.max(1, ...(mix.data || []).map((row) => Number(row.mrr)));

  if (!linked.advisoriq) {
    return <Unlinked title="Advisors" message="AdvisorIQ is not linked. ARYX CEO will not rebuild book scorecards." />;
  }

  return (
    <CosPage>
      <CosPageHero
        eyebrow="Advisors"
        title="Advisor books."
        actions={
          <>
            <CosIslandLink to="/enrollments">Enrollment</CosIslandLink>
            <CosIslandLink href={`${ADVISORIQ_HREF}/command`}>Open AdvisorIQ</CosIslandLink>
          </>
        }
        toolbar={<OrgPicker />}
      />
      <div className="mt-6">
        <CommandStrip title="Company rollup">
          <CommandStat label="Books" value={compactNumber(rollupStats.books)} />
          <CommandStat label="Members" value={compactNumber(rollupStats.members)} />
          <CommandStat label="Total MRR" value={money(rollupStats.totalMrr)} />
          <CommandStat label="Term soon 90d" value={compactNumber(rollupStats.termSoon)} />
          <CommandStat label="Top-10 concentration" value={`${rollupStats.concentration}%`} />
        </CommandStrip>
      </div>
      {(mix.data || []).length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm uppercase tracking-[0.16em] text-aryx-faint">Product mix</h2>
          <div className="space-y-3">
            {mix.data?.map((row) => (
              <div key={row.product_key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{row.product_key}</span>
                  <span>{compactNumber(row.active_members)} · {money(row.mrr)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-aryx-ink/10">
                  <div className="h-full rounded-full bg-aryx-accent" style={{ width: `${(Number(row.mrr) / mixMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-8">
        <h2 className="mb-3 text-sm uppercase tracking-[0.16em] text-aryx-faint">Billing risk</h2>
        {(billing.data || []).length === 0 && (
          <p className="text-sm text-aryx-muted">No billing-risk rows yet.</p>
        )}
        <ul className="space-y-2 text-sm">
          {(billing.data || []).slice(0, 12).map((row) => (
            <li key={`${row.member_key}-${row.product_key}`} className="flex justify-between gap-4">
              <span>{row.display_name || row.member_key}</span>
              <span className="text-aryx-faint">
                {row.monthly_fee == null ? '—' : money(Number(row.monthly_fee))} · {row.risk_flag || row.status || 'risk'}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-8 flex flex-col gap-3 md:flex-row md:items-center">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search advisors"
          className="w-full rounded-full border border-aryx-line bg-aryx-elevated px-4 py-2 text-sm md:max-w-sm"
        />
        <select
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as SortKey)}
          className="rounded-full border border-aryx-line bg-aryx-elevated px-4 py-2 text-sm"
        >
          <option value="mrr">Sort by MRR</option>
          <option value="active_members">Sort by members</option>
          <option value="retention_pct">Sort by retention</option>
          <option value="term_soon_90">Sort by term soon</option>
          <option value="terminating_members">Sort by terminating</option>
          <option value="enrollments_30">Sort by new 30d</option>
          <option value="mrr_added_90">Sort by MRR added 90d</option>
        </select>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-[10px] uppercase tracking-[0.16em] text-aryx-faint">
            <tr>
              <th className="py-2">Advisor</th>
              <th>Members</th>
              <th>Terminating</th>
              <th>Term soon</th>
              <th>Hold</th>
              <th>MRR</th>
              <th>Net MRR</th>
              <th>Retention</th>
              <th>New 30d</th>
              <th>New 90d</th>
              <th>MRR +90d</th>
              <th>Margin</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={`${row.org_id}-${row.advisor_key}`} className="border-t border-aryx-line">
                <td className="py-3">{row.display_name || row.advisor_key.slice(0, 8)}</td>
                <td>{compactNumber(row.active_members)}</td>
                <td>{compactNumber(row.terminating_members)}</td>
                <td>{compactNumber(row.term_soon_90)}</td>
                <td>{compactNumber(row.on_hold_members)}</td>
                <td>{money(row.mrr)}</td>
                <td>{money(row.net_mrr)}</td>
                <td>{row.retention_pct == null ? '—' : `${row.retention_pct}%`}</td>
                <td>{compactNumber(row.enrollments_30)}</td>
                <td>{compactNumber(row.enrollments_90)}</td>
                <td>{money(row.mrr_added_90)}</td>
                <td>{row.margin_pct == null ? '—' : `${row.margin_pct}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CosPage>
  );
}

export default CosAdvisors;
