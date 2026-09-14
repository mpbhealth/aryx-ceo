import { corsHeadersFor } from '../_shared/cors.ts';
import { requireUser, serviceClient } from '../_shared/auth.ts';
import { loadOrgLink, resolveActiveOrg } from '../_shared/org.ts';

const CRM_APP_HREF = (Deno.env.get('ARYX_CRM_APP_URL') ?? 'https://crm.aryx.pro')
  .replace(/\/$/, '')
  .replace('https://crm.aryx.com', 'https://crm.aryx.pro');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CRM_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

function crmHeaders() {
  const key = Deno.env.get('ARYX_CRM_SERVICE_ROLE_KEY') ?? '';
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

function crmGet(url: string) {
  return fetch(url, { method: 'GET', headers: crmHeaders() });
}

function displayName(row: Record<string, unknown>): string {
  const first = typeof row.first_name === 'string' ? row.first_name : '';
  const last = typeof row.last_name === 'string' ? row.last_name : '';
  const joined = [first, last].filter(Boolean).join(' ');
  if (joined) return joined;
  if (typeof row.email === 'string' && row.email) return row.email;
  return 'Untitled';
}

function crmOrigin(slug?: string | null): string {
  if (!slug || !CRM_SLUG_RE.test(slug)) return CRM_APP_HREF;
  try {
    const url = new URL(CRM_APP_HREF);
    if (url.hostname === 'crm.aryx.pro' || url.hostname === 'crm.getaryx.com') {
      url.hostname = `${slug.toLowerCase()}.${url.hostname}`;
    }
    return url.origin;
  } catch {
    return CRM_APP_HREF;
  }
}

function recordHref(kind: string, id: string, slug?: string | null): string {
  const path = kind === 'contact' ? `/contacts/${id}` : `/leads/${id}`;
  return `${crmOrigin(slug)}${path}`;
}

async function crmOrgSlug(crmUrl: string, crmOrgId: string): Promise<string | null> {
  const res = await crmGet(
    `${crmUrl}/rest/v1/organizations?id=eq.${encodeURIComponent(crmOrgId)}&select=slug&limit=1`,
  );
  if (!res.ok) return null;
  const rows = await res.json();
  const slug = Array.isArray(rows) ? rows[0]?.slug : null;
  return typeof slug === 'string' && CRM_SLUG_RE.test(slug) ? slug.toLowerCase() : null;
}

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const { userClient } = requireUser(req);
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const crmUrl = (Deno.env.get('ARYX_CRM_URL') ?? '').replace(/\/$/, '');
    const crmKey = Deno.env.get('ARYX_CRM_SERVICE_ROLE_KEY') ?? '';
    if (!crmUrl || !crmKey) {
      throw new Error('ARYX CRM connector is not configured');
    }

    const admin = serviceClient();
    const active = await resolveActiveOrg(admin, user.id);
    const link = await loadOrgLink(admin, active.orgId);
    if (!link?.crm_org_id) {
      return new Response(JSON.stringify({ error: 'crm_org_not_linked' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const crmOrgId = link.crm_org_id;
    if (!UUID_RE.test(crmOrgId)) {
      return new Response(JSON.stringify({ error: 'crm_org_invalid' }), {
        status: 403,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    if (req.method !== 'POST') throw new Error('method_not_allowed');
    const body = await req.json();
    const slug = await crmOrgSlug(crmUrl, crmOrgId);

    if (body.action === 'list') {
      const [leadsRes, contactsRes] = await Promise.all([
        crmGet(`${crmUrl}/rest/v1/lead_submissions?select=id,email,first_name,last_name,pipeline_stage,updated_at&org_id=eq.${encodeURIComponent(crmOrgId)}&order=updated_at.desc&limit=50`),
        crmGet(`${crmUrl}/rest/v1/crm_contacts?select=id,email,first_name,last_name,lifecycle_stage,updated_at&org_id=eq.${encodeURIComponent(crmOrgId)}&order=updated_at.desc&limit=50`),
      ]);
      if (!leadsRes.ok || !contactsRes.ok) {
        throw new Error('CRM unavailable');
      }
      const leads = await leadsRes.json();
      const contacts = await contactsRes.json();
      const records = [
        ...((Array.isArray(leads) ? leads : []).map((row) => ({
          id: row.id,
          kind: 'lead',
          name: displayName(row),
          email: row.email ?? null,
          status: row.pipeline_stage ?? null,
          updated_at: row.updated_at ?? null,
          href: recordHref('lead', row.id, slug),
        }))),
        ...((Array.isArray(contacts) ? contacts : []).map((row) => ({
          id: row.id,
          kind: 'contact',
          name: displayName(row),
          email: row.email ?? null,
          status: row.lifecycle_stage ?? null,
          updated_at: row.updated_at ?? null,
          href: recordHref('contact', row.id, slug),
        }))),
      ];
      return new Response(JSON.stringify({ records }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'detail') {
      const kind = body.kind === 'contact' ? 'contact' : 'lead';
      const table = kind === 'contact' ? 'crm_contacts' : 'lead_submissions';
      const select = kind === 'contact'
        ? 'id,email,first_name,last_name,lifecycle_stage,updated_at,org_id'
        : 'id,email,first_name,last_name,pipeline_stage,updated_at,org_id';
      if (!UUID_RE.test(String(body.id || ''))) throw new Error('Record not found');
      const res = await crmGet(
        `${crmUrl}/rest/v1/${table}?id=eq.${encodeURIComponent(body.id)}&org_id=eq.${encodeURIComponent(crmOrgId)}&select=${select}&limit=1`,
      );
      if (!res.ok) throw new Error('CRM unavailable');
      const rows = await res.json();
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row || String(row.org_id) !== crmOrgId) throw new Error('Record not found');

      await admin.from('phi_access_log').insert({
        org_id: active.orgId,
        actor_id: user.id,
        source: 'aryx_crm',
        object_type: kind,
        object_id: String(body.id),
        purpose: 'cos_crm_workspace',
      });

      return new Response(JSON.stringify({
        record: {
          id: row.id,
          kind,
          name: displayName(row),
          email: row.email ?? null,
          status: row.pipeline_stage ?? row.lifecycle_stage ?? null,
          updated_at: row.updated_at ?? null,
          href: recordHref(kind, row.id, slug),
        },
      }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'matchEmails') {
      const emails = Array.from(new Set((body.emails || []).map((e: string) => String(e || '').trim().toLowerCase()).filter(Boolean))) as string[];
      const candidates = [];
      for (const email of emails.slice(0, 8)) {
        const [leadRes, contactRes] = await Promise.all([
          crmGet(`${crmUrl}/rest/v1/lead_submissions?email=eq.${encodeURIComponent(email)}&org_id=eq.${encodeURIComponent(crmOrgId)}&select=id,email,first_name,last_name,pipeline_stage&limit=5`),
          crmGet(`${crmUrl}/rest/v1/crm_contacts?email=eq.${encodeURIComponent(email)}&org_id=eq.${encodeURIComponent(crmOrgId)}&select=id,email,first_name,last_name,lifecycle_stage&limit=5`),
        ]);
        if (!leadRes.ok || !contactRes.ok) throw new Error('CRM unavailable');
        const leads = await leadRes.json();
        const contacts = await contactRes.json();
        const matches = [
          ...((Array.isArray(leads) ? leads : []).map((row) => ({
            id: row.id,
            kind: 'lead',
            name: displayName(row),
            email,
            href: recordHref('lead', row.id, slug),
          }))),
          ...((Array.isArray(contacts) ? contacts : []).map((row) => ({
            id: row.id,
            kind: 'contact',
            name: displayName(row),
            email,
            href: recordHref('contact', row.id, slug),
          }))),
        ];
        candidates.push({ email, matches, ambiguous: matches.length !== 1 });
      }
      return new Response(JSON.stringify({ candidates }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Unknown action');
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'CRM proxy failed' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
