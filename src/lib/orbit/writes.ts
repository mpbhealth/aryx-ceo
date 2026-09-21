import { supabase } from '@/lib/supabase';
import { syncConnectors } from '@/lib/connectors';
import { computeForecast, preferCompleteMonth } from '@/lib/forecast';
import { ORBIT_OPERATOR_ONLY } from './character';
import { DEFAULT_FORECAST_ASSUMPTIONS, loadForecastBundle, type OrbitScope } from './snapshots';
import type { OrbitWriteAction } from './intent';

export async function runOrbitWrite(action: OrbitWriteAction, scope: OrbitScope): Promise<string> {
  if (!scope.isOperator) return ORBIT_OPERATOR_ONLY;
  if (action === 'sync') {
    const results = await syncConnectors('all');
    const failed = results.filter((row) => row.status === 'error' || row.error);
    if (failed.length) {
      return `Refresh finished with ${failed.length} source error${failed.length === 1 ? '' : 's'}.`;
    }
    return `Refreshed ${results.length || 'all'} connector${results.length === 1 ? '' : 's'}.`;
  }

  if (!scope.orgId) return 'No active organization.';
  const bundle = await loadForecastBundle(scope);
  if (!bundle.pnl.length) return 'No forecast inputs in the warehouse.';
  const computed = computeForecast(
    { ...bundle, pnl: preferCompleteMonth(bundle.pnl) },
    DEFAULT_FORECAST_ASSUMPTIONS,
  );
  const { error } = await supabase.from('forecast_runs').insert({
    org_id: scope.orgId,
    horizon_days: DEFAULT_FORECAST_ASSUMPTIONS.horizonDays,
    assumptions: DEFAULT_FORECAST_ASSUMPTIONS,
    outputs: computed,
    created_by: (await supabase.auth.getUser()).data.user?.id,
  });
  if (error) throw error;
  return 'Saved the 90-day forecast run.';
}
