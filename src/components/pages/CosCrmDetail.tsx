import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { crmRecordHref } from '@/lib/cos';
import { useOrg } from '@/contexts/OrgContext';
import { Unlinked } from './CosFinance';
import { CosBezel, CosIslandLink, CosPage } from '../cos/CosPage';

export function CosCrmDetail() {
  const { kind, id } = useParams<{ kind: string; id: string }>();
  const { orgId, linked } = useOrg();

  const { data, isLoading, error } = useQuery({
    queryKey: ['crm-proxy', 'detail', orgId, kind, id],
    enabled: !!kind && !!id && linked.crm,
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-proxy`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'detail', kind, id }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error || 'CRM unavailable');
      return json.record as {
        id: string;
        kind: string;
        name: string;
        email: string | null;
        status: string | null;
        updated_at: string | null;
        href?: string;
      };
    },
  });

  if (!linked.crm) {
    return <Unlinked title="CRM record" message="CRM is not linked for this organization." />;
  }

  return (
    <CosPage>
      <Link to="/crm" className="text-xs uppercase tracking-[0.18em] text-aryx-faint">
        Back to CRM
      </Link>
      {isLoading && <p className="mt-6 text-aryx-muted">Loading…</p>}
      {error && <p className="mt-6 text-amber-700 dark:text-amber-200">{(error as Error).message}</p>}
      {data && (
        <CosBezel className="mt-6">
          <p className="text-[10px] uppercase tracking-[0.2em] text-aryx-faint">{data.kind}</p>
          <h1 className="mt-2 font-display text-3xl font-semibold text-aryx-ink md:text-5xl">{data.name}</h1>
          <p className="mt-2 text-aryx-muted">{data.email || 'No email on file'}</p>
          <p className="mt-6 text-sm text-aryx-faint">Status · {data.status || '—'}</p>
          <div className="mt-8">
            <CosIslandLink href={data.href || crmRecordHref(data.kind, data.id)}>
              Open in ARYX CRM
            </CosIslandLink>
          </div>
        </CosBezel>
      )}
    </CosPage>
  );
}

export default CosCrmDetail;
