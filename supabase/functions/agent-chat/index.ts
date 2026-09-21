import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeadersFor } from '../_shared/cors.ts';
import { requireUser } from '../_shared/auth.ts';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ORBIT_NEEDS_KEY =
  'I can already answer collected, billing risk, tickets, and this page from the desk. For open-ended chat, an operator adds OPENAI_API_KEY to the agent-chat edge secrets.';

type PeriodKey = 'mtd' | 'qtd' | 'ytd' | 'custom';
type Linked = {
  enrollment: boolean;
  crm: boolean;
  advisoriq: boolean;
  tickets: boolean;
  traffic: boolean;
};

type ToolCtx = {
  supabase: SupabaseClient;
  orgId: string | null;
  orgIds: string[];
  period: PeriodKey;
  pnlGrain?: 'month' | 'quarter' | 'year' | null;
  pathname: string;
  linked: Linked;
};

const PAGE_COPY: Record<string, { sentence: string; href: string }> = {
  '/home': { sentence: 'Command. Live warehouse facts for the active org.', href: '/home' },
  '/finance': { sentence: 'P&L. EnrollFlow collected and net operating.', href: '/finance' },
  '/tickets': { sentence: 'Support queue. Open tickets and SLA from ITSTS facts.', href: '/tickets' },
  '/advisors': { sentence: 'Advisor books. Scorecards and retention from AdvisorIQ.', href: '/advisors' },
  '/enrollments': { sentence: 'Members. New enrollments and inactivations.', href: '/enrollments' },
  '/pipeline': { sentence: 'Pipeline. Weighted if-closed amounts — not collected.', href: '/pipeline' },
  '/marketing': { sentence: 'Traffic. MarketFlow / GA4 sessions when linked.', href: '/marketing' },
  '/finance/forecast': { sentence: 'Forecasts. Trailing run-rate, not collected revenue.', href: '/finance/forecast' },
  '/operations/integrations': { sentence: 'Integrations. Source link status and last sync.', href: '/operations/integrations' },
};

const NAV_HREFS = new Set([
  '/home',
  '/organizer',
  '/inbox',
  '/files',
  '/enrollments',
  '/advisors',
  '/marketing',
  '/crm',
  '/pipeline',
  '/finance',
  '/finance/vendors',
  '/finance/forecast',
  '/tickets',
  '/tickets/analytics',
  '/operations',
  '/operations/integrations',
  '/settings',
]);

const tools = [
  { type: 'function', function: { name: 'list_pnl', description: 'Read collected and net operating income from fact_pnl_period for the active org and desk period.', parameters: { type: 'object', properties: { period: { type: 'string', enum: ['mtd', 'qtd', 'ytd'] } } } } },
  { type: 'function', function: { name: 'list_enrollments', description: 'Read new enrollments vs inactivations from fact_enrollments_daily.', parameters: { type: 'object', properties: { period: { type: 'string', enum: ['mtd', 'qtd', 'ytd'] } } } } },
  { type: 'function', function: { name: 'advisor_books', description: 'Top advisor scorecards by MRR.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'forward_risk', description: 'MRR at risk in the next 90 days.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'pipeline_facts', description: 'Latest weighted pipeline and aging over 7 days. Active org only.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'ticket_health', description: 'Open tickets, SLA, and breaches. Active org only.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'traffic_facts', description: 'Traffic sessions and conversions if traffic is linked.', parameters: { type: 'object', properties: { period: { type: 'string', enum: ['mtd', 'qtd', 'ytd'] } } } } },
  { type: 'function', function: { name: 'source_health', description: 'Integration sources that are failing or never synced.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'forecast_summary', description: 'Last saved forecast and computed 90-day net from warehouse inputs.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'explain_page', description: 'One sentence about the current CEO page plus its href.', parameters: { type: 'object', properties: {} } } },
  { type: 'function', function: { name: 'navigate', description: 'Return an in-app href. Client navigates. No server write.', parameters: { type: 'object', properties: { href: { type: 'string' } }, required: ['href'] } } },
];

function grainForPeriod(period: PeriodKey): 'month' | 'quarter' | 'year' {
  if (period === 'ytd') return 'year';
  if (period === 'qtd') return 'quarter';
  return 'month';
}

function grainForOrbitPnl(
  pathname: string,
  period: PeriodKey,
  pnlGrain?: 'month' | 'quarter' | 'year' | null,
): 'month' | 'quarter' | 'year' {
  if (pathname.startsWith('/finance') && (pnlGrain === 'month' || pnlGrain === 'quarter' || pnlGrain === 'year')) {
    return pnlGrain;
  }
  return grainForPeriod(period);
}

function periodBounds(period: PeriodKey): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  if (period === 'ytd') return { start: `${now.getUTCFullYear()}-01-01`, end };
  if (period === 'qtd') {
    const q = Math.floor(now.getUTCMonth() / 3) * 3;
    return { start: `${now.getUTCFullYear()}-${String(q + 1).padStart(2, '0')}-01`, end };
  }
  return { start: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`, end };
}

function money(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value));
}

function compactNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value));
}

function formatFact(format: (value: number) => string, linked: boolean, hasRows: boolean, value: number): string {
  if (!linked || !hasRows) return '—';
  return format(value);
}

function asPeriod(value: unknown, fallback: PeriodKey): PeriodKey {
  return value === 'ytd' || value === 'qtd' || value === 'mtd' ? value : fallback;
}

async function membershipOrgIds(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.from('org_memberships').select('org_id');
  if (error) throw error;
  return (data || []).map((row) => String(row.org_id));
}

async function executeTool(
  ctx: ToolCtx,
  name: string,
  args: Record<string, unknown>,
): Promise<{ success: boolean; result: Record<string, unknown> }> {
  try {
    const period = asPeriod(args.period, ctx.period);
    const bounds = periodBounds(period);
    const grain = name === 'list_pnl'
      ? grainForOrbitPnl(ctx.pathname, period, ctx.pnlGrain)
      : grainForPeriod(period);

    switch (name) {
      case 'list_pnl': {
        if (!ctx.linked.enrollment || ctx.orgIds.length === 0) {
          return { success: true, result: { display: 'EnrollFlow is not linked.\nCollected: —\nNet operating income: —', linked: false } };
        }
        const { data, error } = await ctx.supabase
          .from('fact_pnl_period')
          .select('collected, net_operating')
          .in('org_id', ctx.orgIds)
          .eq('period_grain', grain)
          .gte('period_start', bounds.start);
        if (error) throw error;
        const rows = data || [];
        const collected = rows.reduce((sum, row) => sum + Number(row.collected), 0);
        const net = rows.reduce((sum, row) => sum + Number(row.net_operating), 0);
        return {
          success: true,
          result: {
            display: `${period.toUpperCase()} collected: ${formatFact(money, true, rows.length > 0, collected)}\nNet operating income: ${formatFact(money, true, rows.length > 0, net)}`,
            hasRows: rows.length > 0,
          },
        };
      }
      case 'list_enrollments': {
        if (!ctx.linked.enrollment || ctx.orgIds.length === 0) {
          return { success: true, result: { display: 'EnrollFlow is not linked.\nNew: —\nInactivations: —', linked: false } };
        }
        const { data, error } = await ctx.supabase
          .from('fact_enrollments_daily')
          .select('new_count, inactive_count')
          .in('org_id', ctx.orgIds)
          .gte('fact_date', bounds.start)
          .limit(400);
        if (error) throw error;
        const rows = data || [];
        const neu = rows.reduce((sum, row) => sum + Number(row.new_count), 0);
        const inactive = rows.reduce((sum, row) => sum + Number(row.inactive_count), 0);
        return {
          success: true,
          result: {
            display: `${period.toUpperCase()} new enrollments: ${formatFact(compactNumber, true, rows.length > 0, neu)}\n${period.toUpperCase()} inactivations: ${formatFact(compactNumber, true, rows.length > 0, inactive)}`,
            hasRows: rows.length > 0,
          },
        };
      }
      case 'advisor_books': {
        if (!ctx.linked.advisoriq || ctx.orgIds.length === 0) {
          return { success: true, result: { display: 'AdvisorIQ is not linked.', linked: false } };
        }
        const { data, error } = await ctx.supabase
          .from('advisor_scorecards')
          .select('display_name, advisor_key, mrr, retention_pct')
          .in('org_id', ctx.orgIds)
          .order('mrr', { ascending: false })
          .limit(8);
        if (error) throw error;
        const rows = data || [];
        if (!rows.length) return { success: true, result: { display: 'No advisor scorecards in the warehouse.', hasRows: false } };
        return {
          success: true,
          result: {
            display: `Top advisors by MRR:\n${rows.map((row) => `• ${row.display_name || String(row.advisor_key).slice(0, 8)} — ${money(Number(row.mrr))} · retention ${row.retention_pct == null ? '—' : `${row.retention_pct}%`}`).join('\n')}`,
          },
        };
      }
      case 'forward_risk': {
        if (!ctx.linked.advisoriq || ctx.orgIds.length === 0) {
          return { success: true, result: { display: 'AdvisorIQ is not linked.', linked: false } };
        }
        const { data, error } = await ctx.supabase
          .from('fact_iq_forward_risk')
          .select('bucket, members, mrr_at_risk')
          .in('org_id', ctx.orgIds);
        if (error) throw error;
        const rows = data || [];
        if (!rows.length) return { success: true, result: { display: 'No forward-risk rows in the warehouse.', hasRows: false } };
        return {
          success: true,
          result: {
            display: `MRR at risk:\n${rows.map((row) => `• ${row.bucket}: ${compactNumber(Number(row.members))} · ${money(Number(row.mrr_at_risk))}`).join('\n')}`,
          },
        };
      }
      case 'pipeline_facts': {
        if (!ctx.linked.crm || !ctx.orgId) {
          return { success: true, result: { display: 'CRM is not linked.', linked: false } };
        }
        const { data, error } = await ctx.supabase
          .from('fact_crm_pipeline_daily')
          .select('fact_date, weighted_amount, aging_over_7')
          .eq('org_id', ctx.orgId)
          .order('fact_date', { ascending: false })
          .limit(40);
        if (error) throw error;
        const rows = data || [];
        const latestDate = rows[0]?.fact_date;
        const latest = rows.filter((row) => row.fact_date === latestDate);
        if (!latest.length) return { success: true, result: { display: 'No pipeline facts in the warehouse.', hasRows: false } };
        const aging = latest.reduce((sum, row) => sum + Number(row.aging_over_7 || 0), 0);
        return {
          success: true,
          result: {
            display: `Weighted pipeline: ${money(Number(latest[0]?.weighted_amount || 0))}\nAging >7d: ${compactNumber(aging)}`,
          },
        };
      }
      case 'ticket_health': {
        if (!ctx.linked.tickets) {
          return { success: true, result: { display: 'Tickets are not linked.\nOpen now: —\nSLA breach: —', linked: false } };
        }
        const path = (ctx.pathname || '/home').split('?')[0];
        if (path === '/home' || path === '/command') {
          if (ctx.orgIds.length === 0) {
            return { success: true, result: { display: 'Tickets are not linked.\nOpen tickets: —\nSLA breach: —', linked: false } };
          }
          const { data, error } = await ctx.supabase
            .from('analytics_snapshots')
            .select('metric_key, value, period_start')
            .in('org_id', ctx.orgIds)
            .in('metric_key', ['open_ticket_count', 'breached_ticket_count', 'unassigned_ticket_count'])
            .order('period_start', { ascending: false });
          if (error) throw error;
          const latest = new Map<string, number | null>();
          for (const row of data || []) {
            if (!latest.has(String(row.metric_key))) {
              latest.set(String(row.metric_key), row.value == null ? null : Number(row.value));
            }
          }
          if (!latest.has('open_ticket_count')) {
            return { success: true, result: { display: 'No ticket facts in the warehouse.\nOpen tickets: —\nSLA breach: —', hasRows: false } };
          }
          return {
            success: true,
            result: {
              display: `Open tickets: ${compactNumber(latest.get('open_ticket_count'))}\nSLA breach: ${compactNumber(latest.get('breached_ticket_count'))}\nUnassigned: ${compactNumber(latest.get('unassigned_ticket_count'))}`,
            },
          };
        }
        if (!ctx.orgId) {
          return { success: true, result: { display: 'Tickets are not linked.\nOpen now: —\nSLA breach: —', linked: false } };
        }
        const [{ data, error }, queue] = await Promise.all([
          ctx.supabase
            .from('fact_tickets_daily')
            .select('open_count, breached_count, pending_count, sla_pct')
            .eq('org_id', ctx.orgId)
            .order('fact_date', { ascending: false })
            .limit(1),
          ctx.supabase
            .from('book_tickets')
            .select('ticket_number, title, status, priority')
            .eq('org_id', ctx.orgId)
            .order('created_at', { ascending: false })
            .limit(8),
        ]);
        if (error) throw error;
        if (queue.error) throw queue.error;
        const snap = data?.[0];
        if (!snap) return { success: true, result: { display: 'No ticket facts in the warehouse.\nOpen now: —\nSLA breach: —', hasRows: false } };
        const rows = queue.data || [];
        const list = rows.length
          ? `\nQueue:\n${rows.map((row) => `• #${row.ticket_number || '—'} ${row.title || 'Untitled'} — ${row.status || '—'} · ${row.priority || '—'}`).join('\n')}`
          : '\nNo open tickets in the warehouse yet.';
        return {
          success: true,
          result: {
            display: `Open now: ${compactNumber(snap.open_count)}\nSLA breach: ${compactNumber(snap.breached_count)}\nPending: ${compactNumber(snap.pending_count)}\nSLA: ${snap.sla_pct == null ? '—' : `${snap.sla_pct}%`}${list}`,
          },
        };
      }
      case 'traffic_facts': {
        if (!ctx.linked.traffic || ctx.orgIds.length === 0) {
          return { success: true, result: { display: 'Traffic is not linked.\nSessions: —\nConversion: —', linked: false } };
        }
        const { data, error } = await ctx.supabase
          .from('fact_traffic_daily')
          .select('sessions, conversions')
          .in('org_id', ctx.orgIds)
          .gte('fact_date', bounds.start)
          .lte('fact_date', bounds.end);
        if (error) throw error;
        const rows = data || [];
        if (!rows.length) return { success: true, result: { display: 'No traffic facts in the warehouse.\nSessions: —\nConversion: —', hasRows: false } };
        const sessions = rows.reduce((sum, row) => sum + Number(row.sessions || 0), 0);
        const conversions = rows.reduce((sum, row) => sum + Number(row.conversions || 0), 0);
        const rate = sessions ? `${((conversions / sessions) * 100).toFixed(1)}%` : '—';
        return { success: true, result: { display: `${period.toUpperCase()} sessions: ${compactNumber(sessions)}\nConversions: ${compactNumber(conversions)}\nConversion: ${rate}` } };
      }
      case 'source_health': {
        if (!ctx.orgId) return { success: true, result: { display: 'No active organization.' } };
        const { data, error } = await ctx.supabase
          .from('integration_sources')
          .select('key, status, last_success_at')
          .eq('org_id', ctx.orgId);
        if (error) throw error;
        const rows = data || [];
        if (!rows.length) return { success: true, result: { display: 'No integration sources in the warehouse.', hasRows: false } };
        const failing = rows.filter((row) => {
          const status = String(row.status || '').toLowerCase();
          return status === 'error' || status === 'failed' || !row.last_success_at;
        });
        if (!failing.length) return { success: true, result: { display: `${rows.length} sources on file. None failing or never synced.` } };
        return {
          success: true,
          result: {
            display: `Sources failing / never synced:\n${failing.map((row) => `• ${row.key} — ${row.status || 'unknown'}${row.last_success_at ? '' : ' · never synced'}`).join('\n')}`,
          },
        };
      }
      case 'forecast_summary': {
        if (!ctx.linked.enrollment || ctx.orgIds.length === 0) {
          return { success: true, result: { display: 'EnrollFlow is not linked.', linked: false } };
        }
        const last = ctx.orgId
          ? await ctx.supabase
              .from('forecast_runs')
              .select('created_at, outputs')
              .eq('org_id', ctx.orgId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : { data: null, error: null };
        if (last.error) throw last.error;
        const base = Number((last.data?.outputs as { pnl?: { base?: number } } | null)?.pnl?.base);
        const saved = last.data?.created_at ? new Date(String(last.data.created_at)).toISOString() : null;
        const net = Number.isFinite(base) ? money(base) : '—';
        return {
          success: true,
          result: {
            display: saved ? `Last saved 90-day net: ${net}\nSaved: ${saved}` : 'No saved forecast run.',
          },
        };
      }
      case 'explain_page': {
        const path = (ctx.pathname || '/home').split('?')[0];
        const copy = PAGE_COPY[path] || PAGE_COPY['/home'];
        return { success: true, result: { display: `${copy.sentence}\n${copy.href}`, href: copy.href, label: 'Open page' } };
      }
      case 'navigate': {
        const href = String(args.href || '').split('?')[0];
        if (!NAV_HREFS.has(href)) {
          return { success: false, result: { error: 'That path is not on the CEO desk.' } };
        }
        return { success: true, result: { href, label: 'Open', display: `Open ${href}` } };
      }
      default:
        return { success: false, result: { error: `Unknown tool: ${name}` } };
    }
  } catch (error: unknown) {
    return { success: false, result: { error: error instanceof Error ? error.message : String(error) } };
  }
}

function json(cors: Record<string, string>, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const { userClient } = requireUser(req);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return json(cors, { error: 'Invalid or expired token' }, 401);
    }

    const body = await req.json();
    const messages = body.messages;
    if (!messages || !Array.isArray(messages)) {
      return json(cors, { error: 'Messages array is required' }, 400);
    }

    const allowed = await membershipOrgIds(userClient);
    const requested = Array.isArray(body.orgIds) ? body.orgIds.map(String) : [];
    const orgIds = requested.filter((id: string) => allowed.includes(id));
    const orgId = typeof body.orgId === 'string' && allowed.includes(body.orgId) ? body.orgId : orgIds[0] || null;
    const period: PeriodKey = asPeriod(body.period, 'mtd');
    const pnlGrain = body.pnlGrain === 'month' || body.pnlGrain === 'quarter' || body.pnlGrain === 'year'
      ? body.pnlGrain
      : null;
    const linked: Linked = {
      enrollment: Boolean(body.linked?.enrollment),
      crm: Boolean(body.linked?.crm),
      advisoriq: Boolean(body.linked?.advisoriq),
      tickets: Boolean(body.linked?.tickets),
      traffic: Boolean(body.linked?.traffic),
    };
    const ctx: ToolCtx = {
      supabase: userClient,
      orgId,
      orgIds,
      period,
      pnlGrain,
      pathname: typeof body.pathname === 'string' ? body.pathname : '/home',
      linked,
    };

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      return json(cors, {
        message: { role: 'assistant', content: ORBIT_NEEDS_KEY },
        finish_reason: 'stop',
        needs_key: true,
      });
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
        temperature: 0,
        max_tokens: 1024,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const assistantMessage = openaiData.choices[0].message;
    const toolResults: Array<{ tool_call_id: string; name: string; result: Record<string, unknown>; success: boolean }> = [];

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      for (const toolCall of assistantMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments || '{}') as Record<string, unknown>;
        const result = await executeTool(ctx, toolCall.function.name, args);
        toolResults.push({
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          result: result.result,
          success: result.success,
        });
      }

      const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0,
          max_tokens: 1024,
          messages: [
            ...messages,
            assistantMessage,
            ...toolResults.map((tr) => ({
              role: 'tool',
              tool_call_id: tr.tool_call_id,
              content: JSON.stringify(tr.result),
            })),
          ],
        }),
      });

      if (!followUpResponse.ok) {
        throw new Error(`OpenAI follow-up API error: ${followUpResponse.status}`);
      }

      const followUpData = await followUpResponse.json();
      return json(cors, {
        message: followUpData.choices[0].message,
        tool_calls: assistantMessage.tool_calls,
        tool_results: toolResults,
        finish_reason: followUpData.choices[0].finish_reason,
      });
    }

    return json(cors, {
      message: assistantMessage,
      finish_reason: openaiData.choices[0].finish_reason,
    });
  } catch (error: unknown) {
    console.error('Error:', error);
    return json(cors, { error: error instanceof Error ? error.message : 'Internal server error' }, 500);
  }
});
