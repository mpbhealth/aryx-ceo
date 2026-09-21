import type { PeriodKey } from '@/lib/cos';
import { wantsDeskBriefing, wantsExplain } from './explain';

export type OrbitSnapshotKind =
  | 'pnl'
  | 'enrollments'
  | 'advisors'
  | 'forward_risk'
  | 'billing_risk'
  | 'pipeline'
  | 'tickets'
  | 'traffic'
  | 'sources'
  | 'vendor'
  | 'forecast'
  | 'actions'
  | 'explain_page'
  | 'desk';

export type OrbitWriteAction = 'sync' | 'save_forecast';

export type OrbitIntent =
  | { kind: 'snapshot'; snapshot: OrbitSnapshotKind; period?: PeriodKey; explain?: boolean }
  | { kind: 'write'; action: OrbitWriteAction }
  | { kind: 'refuse'; reason: 'blocked_write' }
  | { kind: 'open' };

const MUTATION =
  /\b(create|add|make|update|mark|assign|delete|send|draft|rename|comment|move|write|insert|upsert)\b/i;

export function parsePeriodFromAsk(text: string): PeriodKey | undefined {
  if (/\bytd\b/i.test(text)) return 'ytd';
  if (/\bqtd\b/i.test(text)) return 'qtd';
  if (/\bmtd\b/i.test(text)) return 'mtd';
  return undefined;
}

function snapshot(
  kind: OrbitSnapshotKind,
  q: string,
  period?: PeriodKey,
): OrbitIntent {
  return { kind: 'snapshot', snapshot: kind, period, explain: wantsExplain(q) };
}

export function classifyOrbitIntent(text: string): OrbitIntent {
  const q = text.trim();
  if (!q) return { kind: 'open' };

  if (
    /\b(refresh sources|sync (connectors|sources|all)|resync( sources)?|refresh (all )?connectors)\b/i.test(q)
  ) {
    return { kind: 'write', action: 'sync' };
  }
  if (/\b(save|store|persist)\b/i.test(q) && /\bforecast\b/i.test(q)) {
    return { kind: 'write', action: 'save_forecast' };
  }

  if (
    MUTATION.test(q) &&
    !/\bmake sense\b/i.test(q) &&
    /\b(ticket|mail|email|inbox|enrollflow|crm|advisoriq|itsts|fact_|cos_org_link)\b/i.test(q)
  ) {
    return { kind: 'refuse', reason: 'blocked_write' };
  }
  if (MUTATION.test(q) && !/\bmake sense\b/i.test(q)) return { kind: 'open' };

  const period = parsePeriodFromAsk(q);

  if (wantsDeskBriefing(q)) {
    return snapshot('desk', q, period);
  }
  if (/\b(this page|on this page|where am i|explain this|what can i do)\b/i.test(q)) {
    return snapshot('explain_page', q);
  }
  if (/\bbilling risk\b/i.test(q) || /\bwho has billing\b/i.test(q)) {
    return snapshot('billing_risk', q);
  }
  if (/\b(open (in )?support|support queue|sla|breached|open tickets?)\b/i.test(q)) {
    return snapshot('tickets', q);
  }
  if (/\b(ticket|support)\b/i.test(q) && /\b(open|queue|health|what'?s|explain)\b/i.test(q)) {
    return snapshot('tickets', q);
  }
  if (/\b(collected|noi|net operating|p&l|pnl|payables)\b/i.test(q)) {
    return snapshot('pnl', q, period);
  }
  if (/\b(new enrollments?|inactivations?|inactive vs|enrollments? vs)\b/i.test(q)) {
    return snapshot('enrollments', q, period);
  }
  if (/\b(top advisors?|advisor books?|by mrr|retention)\b/i.test(q) && !/\bat risk\b/i.test(q)) {
    return snapshot('advisors', q);
  }
  if (/\b(mrr at risk|forward risk|term soon|next 90)\b/i.test(q)) {
    return snapshot('forward_risk', q);
  }
  if (/\b(pipeline|aging|weighted)\b/i.test(q)) {
    return snapshot('pipeline', q);
  }
  if (/\b(traffic|conversion|sessions)\b/i.test(q)) {
    return snapshot('traffic', q, period);
  }
  if (/\b(never synced|source health|sources failing|integration sources)\b/i.test(q)) {
    return snapshot('sources', q);
  }
  if (/\b(vendor (cost )?unmatched|unmatched vendor|missing vendor)\b/i.test(q)) {
    return snapshot('vendor', q);
  }
  if (/\b(forecast|90[- ]day net)\b/i.test(q)) {
    return snapshot('forecast', q);
  }
  if (/\b(proposed actions?|book actions?)\b/i.test(q)) {
    return snapshot('actions', q);
  }
  if (wantsExplain(q)) {
    return snapshot('explain_page', q);
  }

  return { kind: 'open' };
}
