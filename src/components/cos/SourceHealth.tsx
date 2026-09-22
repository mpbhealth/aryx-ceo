import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOrg } from '@/contexts/OrgContext';

export function SourceHealth() {
  const { orgId } = useOrg();
  const sources = useQuery({
    queryKey: ['settings-source-health', orgId],
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

  if (!orgId) return null;

  return (
    <div className="mb-4 rounded-2xl border border-aryx-line bg-aryx-elevated p-4 shadow-sm sm:mb-6 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-aryx-ink">Source health</h2>
        <Link to="/operations/integrations" className="text-sm text-aryx-accent">Manage maps</Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {(sources.data || []).map((row) => (
          <span key={row.key} className="rounded-full border border-aryx-line px-3 py-1 text-[10px] uppercase tracking-wider text-aryx-faint">
            {row.key} · {row.status}
          </span>
        ))}
        {(sources.data || []).length === 0 && (
          <p className="text-sm text-aryx-muted">No sources yet for this organization.</p>
        )}
      </div>
    </div>
  );
}
