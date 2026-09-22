import type { OrbitSnapshotKind } from './intent';

export const ORBIT_GLOSS: Record<Exclude<OrbitSnapshotKind, 'explain_page' | 'desk'>, string> = {
  pnl: 'Collected is EnrollFlow billing received in this period. NOI is collected − vendor − paid commissions − SaaS. Pending AR is not collected. I do not invent a zero when EnrollFlow is unlinked or empty.',
  enrollments: 'New and inactive counts are daily EnrollFlow warehouse facts for the desk period. Net adds is new minus inactive. AdvisorIQ movement is a separate book.',
  advisors: 'Scorecards are AdvisorIQ books: MRR and retention as last extracted. I do not rebuild books here.',
  forward_risk: 'Forward risk is AdvisorIQ members and MRR projected to leave in the next 90 days. It is not collected cash.',
  billing_risk: 'Billing risk is AdvisorIQ members the book flagged before the next bill. Action stays in AdvisorIQ.',
  pipeline: 'Weighted pipeline is CRM if-closed, not EnrollFlow collected. Aging >7d means the record has not moved.',
  tickets: 'On Command I quote analytics_snapshots ticket counts. On the queue I quote the latest fact_tickets_daily row and book_tickets. I do not create or update tickets.',
  traffic: 'Sessions, leads, and new members are MarketFlow daily facts for the same window. They are not the same people. I do not invent traffic when the source is unlinked.',
  sources: 'Source health is last extract status on integration_sources. Refresh is an operator confirm, not a silent write.',
  vendor: 'Unmatched vendor cost means active enrollments with no carrier cost row. Coverage below 100% is a book gap, not $0 cost.',
  forecast: '90-day net is trailing run-rate × assumptions ± CRM weighted pipeline. It is not a guarantee and not collected.',
  actions: 'Proposed actions are AdvisorIQ book_actions with status proposed. I do not apply them from this desk.',
};

export function glossFor(kind: OrbitSnapshotKind): string | null {
  if (kind === 'explain_page' || kind === 'desk') return null;
  return ORBIT_GLOSS[kind];
}

export function wantsExplain(text: string): boolean {
  return /\b(explain|why|what is|what'?s|what does|what do|what can i|walk me through|help me understand|make sense|define|meaning of|tell me about|overview|brief(ing| me)?|how('?s| are) (we|the)|what'?s going on)\b/i.test(
    text,
  );
}

export function wantsDeskBriefing(text: string): boolean {
  return /\b(explain the desk|desk briefing|how are we doing|how'?s the (desk|company|book)|what'?s going on|give me (a |the )?brief|overview of the desk|summarize the desk)\b/i.test(
    text,
  );
}

export function snapshotForPath(pathname: string): OrbitSnapshotKind {
  const path = pathname.split('?')[0] || '/home';
  if (path === '/home' || path === '/command') return 'desk';
  if (path === '/finance') return 'pnl';
  if (path === '/finance/vendors') return 'vendor';
  if (path === '/finance/forecast') return 'forecast';
  if (path === '/tickets' || path === '/tickets/analytics') return 'tickets';
  if (path === '/advisors') return 'advisors';
  if (path === '/enrollments') return 'enrollments';
  if (path === '/pipeline' || path.startsWith('/crm')) return 'pipeline';
  if (path === '/marketing' || path === '/analytics/website') return 'traffic';
  if (path === '/operations/integrations') return 'sources';
  return 'explain_page';
}

export function withExplanation(text: string, kind: OrbitSnapshotKind, explain: boolean): string {
  if (!explain) return text;
  const gloss = glossFor(kind);
  if (!gloss) return text;
  return `${text}\n\n${gloss}`;
}
