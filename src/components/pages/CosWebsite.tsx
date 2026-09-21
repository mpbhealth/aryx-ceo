import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { compactNumber, periodBounds } from '@/lib/cos';
import { conversionRate, formatFact, sourceLabel } from '@/lib/marketingFacts';
import { downloadCsv } from '@/lib/exportFacts';
import { useTrafficFacts } from '@/hooks/useTrafficFacts';
import { useOrg } from '@/contexts/OrgContext';
import { useDeskPeriod } from '@/contexts/DeskPeriodContext';
import { CosBezel, CosIslandButton, CosPage, CosPageHero, CosTable } from '../cos/CosPage';
import { OrgPicker } from '../cos/OrgPicker';
import { PeriodToggle } from '../cos/PeriodToggle';
import { TrendSpark } from '../cos/TrendSpark';

export function CosWebsite() {
  const { orgId, linked, rollup, memberships, isOperator } = useOrg();
  const { period, customStart, customEnd, setPeriod, setCustomRange } = useDeskPeriod();
  const bounds = periodBounds(period, customStart, customEnd);
  const orgIds = rollup ? memberships.map((row) => row.org_id) : orgId ? [orgId] : [];

  const traffic = useTrafficFacts(orgIds, bounds.start, bounds.end, orgIds.length > 0);

  const leads = useQuery({
    queryKey: ['pipeline-leads-funnel', orgIds.join(','), bounds.start, bounds.end],
    enabled: orgIds.length > 0 && linked.crm,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fact_crm_pipeline_daily')
        .select('fact_date, lead_count')
        .in('org_id', orgIds)
        .gte('fact_date', bounds.start)
        .lte('fact_date', bounds.end)
        .order('fact_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const enrolls = useQuery({
    queryKey: ['enroll-funnel', orgIds.join(','), bounds.start, bounds.end],
    enabled: orgIds.length > 0 && linked.enrollment,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fact_enrollments_daily')
        .select('fact_date, new_count')
        .in('org_id', orgIds)
        .gte('fact_date', bounds.start)
        .lte('fact_date', bounds.end)
        .order('fact_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const leadCount = useMemo(
    () => (leads.data || []).reduce((sum, row) => sum + Number(row.lead_count || 0), 0),
    [leads.data],
  );
  const enrollCount = useMemo(
    () => (enrolls.data || []).reduce((sum, row) => sum + Number(row.new_count || 0), 0),
    [enrolls.data],
  );

  const hasTraffic = traffic.rows.length > 0;
  const sessionValue = formatFact(compactNumber, {
    linked: linked.traffic,
    loading: traffic.isLoading,
    hasRows: hasTraffic,
    value: traffic.totals.sessions,
  });

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
      <CosPageHero
        eyebrow="Marketing"
        title="Traffic."
        lede="Google Analytics lands through MarketFlow as daily warehouse facts. This page only reads those rows. It does not invent sessions or write back to GA."
        actions={
          isOperator ? (
            <CosIslandButton
              variant="ghost"
              trailing="↓"
              onClick={() =>
                downloadCsv(
                  `ceo-marketing-${bounds.start}.csv`,
                  traffic.rows as Array<Record<string, unknown>>,
                )
              }
            >
              Export CSV
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
              onCustom={setCustomRange}
            />
          </>
        }
      />

      {!linked.traffic && (
        <p className="cos-rise-1 mb-8 rounded-[1.5rem] bg-amber-500/10 px-4 py-3 text-sm ring-1 ring-amber-500/30">
          MarketFlow is not mapped for this organization, so Google Analytics facts cannot sync.
          Integrations shows link status. Refresh sources will not invent traffic.
        </p>
      )}
      {linked.traffic && !traffic.isLoading && !hasTraffic && (
        <p className="cos-rise-1 mb-8 rounded-[1.5rem] bg-aryx-elevated px-4 py-3 text-sm text-aryx-muted ring-1 ring-aryx-line">
          No traffic facts in this window. Use Refresh sources on Command after MarketFlow has GA
          numbers for the mapped team.
        </p>
      )}
      {traffic.isError && (
        <p className="mb-8 text-sm text-red-600 dark:text-red-300">Could not load website facts.</p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
        <CosBezel className="cos-rise-1 md:col-span-7 md:row-span-2">
          <p className="text-[10px] uppercase tracking-[0.18em] text-aryx-faint">Sessions</p>
          <p className="mt-3 font-display text-5xl font-semibold tracking-tight text-aryx-ink md:text-7xl">
            {sessionValue}
          </p>
          <p className="mt-2 text-xs text-aryx-faint">Daily warehouse · fact_traffic_daily</p>
          <div className="mt-8">
            <TrendSpark
              data={traffic.byDay}
              xKey="date"
              series={[
                { key: 'sessions', color: '#FF5A1F' },
                { key: 'conversions', color: '#2F9E44' },
              ]}
            />
          </div>
        </CosBezel>

        <CosBezel className="cos-rise-2 md:col-span-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-aryx-faint">Users</p>
          <p className="mt-3 font-display text-4xl font-semibold tracking-tight">
            {formatFact(compactNumber, {
              linked: linked.traffic,
              loading: traffic.isLoading,
              hasRows: hasTraffic,
              value: traffic.totals.users,
            })}
          </p>
          <p className="mt-2 text-xs text-aryx-faint">Mapped from MarketFlow new members</p>
        </CosBezel>

        <CosBezel className="cos-rise-2 md:col-span-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-aryx-faint">Pageviews</p>
          <p className="mt-3 font-display text-4xl font-semibold tracking-tight">
            {formatFact(compactNumber, {
              linked: linked.traffic,
              loading: traffic.isLoading,
              hasRows: hasTraffic,
              value: traffic.totals.pageviews,
            })}
          </p>
          <p className="mt-2 text-xs text-aryx-faint">Often empty until GA pageviews land</p>
        </CosBezel>

        <CosBezel className="cos-rise-3 md:col-span-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-aryx-faint">Conversions</p>
          <p className="mt-3 font-display text-4xl font-semibold tracking-tight">
            {formatFact(compactNumber, {
              linked: linked.traffic,
              loading: traffic.isLoading,
              hasRows: hasTraffic,
              value: traffic.totals.conversions,
            })}
          </p>
          <p className="mt-2 text-xs text-aryx-faint">
            {linked.traffic && hasTraffic
              ? conversionRate(traffic.totals.conversions, traffic.totals.sessions)
              : '—'}{' '}
            of sessions
          </p>
        </CosBezel>

        <CosBezel className="cos-rise-3 md:col-span-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-aryx-faint">CRM leads</p>
          <p className="mt-3 font-display text-4xl font-semibold tracking-tight">
            {formatFact(compactNumber, {
              linked: linked.crm,
              loading: leads.isLoading,
              hasRows: (leads.data || []).length > 0,
              value: leadCount,
            })}
          </p>
          <p className="mt-2 text-xs text-aryx-faint">Same-org window. No email matching.</p>
        </CosBezel>

        <CosBezel className="cos-rise-3 md:col-span-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-aryx-faint">New enrolls</p>
          <p className="mt-3 font-display text-4xl font-semibold tracking-tight">
            {formatFact(compactNumber, {
              linked: linked.enrollment,
              loading: enrolls.isLoading,
              hasRows: (enrolls.data || []).length > 0,
              value: enrollCount,
            })}
          </p>
          <p className="mt-2 text-xs text-aryx-faint">EnrollFlow daily facts</p>
        </CosBezel>
      </div>

      <div className="cos-rise-4 mt-10">
        <p className="mb-4 text-[10px] uppercase tracking-[0.2em] text-aryx-faint">Sources</p>
        {traffic.bySource.length === 0 ? (
          <p className="text-sm text-aryx-muted">No source rows in this window.</p>
        ) : (
          <CosTable>
            <table className="w-full text-left text-sm">
              <thead className="text-[10px] uppercase tracking-[0.16em] text-aryx-faint">
                <tr>
                  <th className="py-2 pr-4">Source</th>
                  <th className="pr-4">Sessions</th>
                  <th className="pr-4">Users</th>
                  <th className="pr-4">Pageviews</th>
                  <th className="pr-4">Conversions</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                {traffic.bySource.map((row) => (
                  <tr key={row.source} className="border-t border-aryx-line/80">
                    <td className="py-3.5 pr-4">{sourceLabel(row.source)}</td>
                    <td className="pr-4">{compactNumber(row.sessions)}</td>
                    <td className="pr-4">{compactNumber(row.users)}</td>
                    <td className="pr-4">{compactNumber(row.pageviews)}</td>
                    <td className="pr-4">{compactNumber(row.conversions)}</td>
                    <td>{conversionRate(row.conversions, row.sessions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CosTable>
        )}
      </div>
    </CosPage>
  );
}

export default CosWebsite;
