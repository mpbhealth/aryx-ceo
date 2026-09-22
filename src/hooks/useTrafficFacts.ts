import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  sumTraffic,
  trafficByDay,
  trafficBySource,
  type TrafficFact,
} from '@/lib/marketingFacts';

export function trafficFactsKey(orgIds: string[], start: string, end: string) {
  return ['traffic-facts', orgIds.join(','), start, end] as const;
}

export function useTrafficFacts(
  orgIds: string[],
  start: string,
  end: string,
  enabled = true,
) {
  const query = useQuery({
    queryKey: trafficFactsKey(orgIds, start, end),
    enabled: enabled && orgIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fact_traffic_daily')
        .select('fact_date, source, sessions, users, pageviews, conversions, leads, new_members')
        .in('org_id', orgIds)
        .gte('fact_date', start)
        .lte('fact_date', end)
        .order('fact_date', { ascending: false });
      if (error) throw error;
      return (data || []) as TrafficFact[];
    },
  });

  const rows = query.data || [];
  return {
    ...query,
    rows,
    totals: sumTraffic(rows),
    bySource: trafficBySource(rows),
    byDay: trafficByDay(rows),
  };
}
