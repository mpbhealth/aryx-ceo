import type { SupabaseClient } from 'npm:@supabase/supabase-js';
import type { CosOrgLink } from './org.ts';
import {
  findStage,
  ifClosed,
  isClosedStage,
  pickWeightedAmount,
  quotedPremium,
  stageProbability,
} from './ifClosed.ts';
import {
  billingMonthKey,
  commissionMonthKey,
  emptyPnl,
  isPaidCommissionStatus,
  isPendingCommissionStatus,
  matchVendorUnit,
  pnlNet,
  quarterStart,
  rollupPnlMonths,
  vendorCoveragePct,
  yearStart,
  type PnlParts,
} from './moneyMatch.ts';
import { countFiltered, countUnscoped, restGet, restGetOrgOrNull, restGetPages, restGetUnscopedPages, restRpc, type OrgFilter } from './remote.ts';

const OPEN_TICKETS = 'in.(new,open,awaiting_customer,on_hold)';
const RESOLVED_TICKETS = 'in.(resolved,closed)';
const TICKET_SAFE_SELECT = 'id,ticket_number,subject,status,priority,category,agent_name,assignee_id,created_at,resolved_at,sla_due_at';

export interface ExtractorResult {
  source: string;
  status: 'healthy' | 'skipped' | 'unconfigured' | 'error';
  metrics: Array<{ metric_key: string; value: number }>;
  error?: string;
}

function envPair(urlEnv: string, keyEnv: string): { url: string; key: string } | null {
  const url = Deno.env.get(urlEnv) ?? '';
  const key = Deno.env.get(keyEnv) ?? '';
  if (!url || !key) return null;
  return { url: url.replace(/\/$/, ''), key };
}

function monthStart(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

async function upsertSnapshot(
  admin: SupabaseClient,
  orgId: string,
  source: string,
  metricKey: string,
  value: number,
  periodStart: string,
) {
  await admin.from('analytics_snapshots').upsert({
    org_id: orgId,
    source,
    metric_key: metricKey,
    period_start: periodStart,
    value,
    metadata: { auto_generated: true },
  }, { onConflict: 'org_id,source,metric_key,period_start' });
}

export async function extractEnrollment(
  admin: SupabaseClient,
  orgId: string,
  link: CosOrgLink,
): Promise<ExtractorResult> {
  if (!link.enrollment_org_id) return { source: 'aryx_enrollment', status: 'skipped', metrics: [] };
  const creds = envPair('ARYX_ENROLLMENT_URL', 'ARYX_ENROLLMENT_SERVICE_ROLE_KEY');
  if (!creds) return { source: 'aryx_enrollment', status: 'unconfigured', metrics: [] };
  const filter: OrgFilter = { column: 'organization_id', value: link.enrollment_org_id };
  const today = new Date().toISOString().slice(0, 10);
  const start = monthStart();

  const yearFrom = `${new Date().getUTCFullYear() - 1}-01-01`;
  const enrollments = await restGetPages(
    creds.url,
    creds.key,
    'enrollments?select=id,status,monthly_cost,enrollment_date,inactive_date,product_id,plan_type,primary_is_smoker,iua_id',
    filter,
  );
  const billing = await restGetPages(
    creds.url,
    creds.key,
    `billing?select=amount,status,paid_at,due_date,billing_type&or=(paid_at.gte.${yearFrom},due_date.gte.${yearFrom})`,
    filter,
  );
  const commissions = await restGetPages(
    creds.url,
    creds.key,
    `commissions?select=amount,status,commission_month,commission_type&commission_month=gte.${yearFrom.slice(0, 7)}`,
    filter,
  );
  const vendorCosts = await restGetOrgOrNull<Array<Record<string, unknown>>>(
    creds.url,
    creds.key,
    'vendor_costs?select=product_id,iua_id,cost,tobacco_surcharge,status,not_offered&limit=5000',
    filter,
  );
  let products: Array<Record<string, unknown>> = [];
  try {
    products = await restGet<Array<Record<string, unknown>>>(
      creds.url,
      creds.key,
      'products?select=id,name,label&limit=5000',
      filter,
    );
  } catch {
    products = [];
  }

  const productLabel = new Map<string, string>();
  for (const row of products) {
    const id = String(row.id || '');
    const label = String(row.name || row.label || '').trim();
    if (id && label) productLabel.set(id, label);
  }

  const active = enrollments.filter((row) => ['Active', 'Future Active'].includes(String(row.status)));
  const mrr = active.reduce((s, row) => s + Number(row.monthly_cost || 0), 0);

  let vendorCost = 0;
  let missing = 0;
  let estimated = 0;
  const vendorMonthly = new Map<string, { cost: number; missing: number; label: string }>();
  for (const row of active) {
    const key = String(row.product_id || '');
    const match = matchVendorUnit(vendorCosts, key, {
      iuaId: String(row.iua_id || ''),
      isSmoker: row.primary_is_smoker,
    });
    const bucket = vendorMonthly.get(key) || { cost: 0, missing: 0, label: productLabel.get(key) || key };
    if (!match) {
      missing += 1;
      bucket.missing += 1;
    } else {
      vendorCost += match.unit;
      bucket.cost += match.unit;
      if (match.estimated) estimated += 1;
    }
    vendorMonthly.set(key, bucket);
  }
  const coverage = vendorCoveragePct(active.length - missing, active.length);

  const { data: saasRows } = await admin
    .from('saas_expenses')
    .select('amount, cadence')
    .eq('org_id', orgId);
  const saasCost = (saasRows || []).reduce((sum, row) => {
    const amount = Number(row.amount || 0);
    return sum + (row.cadence === 'yearly' ? amount / 12 : amount);
  }, 0);

  const months = new Map<string, PnlParts>();
  const ensureMonth = (key: string) => {
    const current = months.get(key);
    if (current) return current;
    const next = emptyPnl();
    months.set(key, next);
    return next;
  };

  for (const row of billing) {
    const key = billingMonthKey(row.paid_at || row.due_date);
    if (!key) continue;
    const bucket = ensureMonth(`${key}-01`);
    const amount = Number(row.amount || 0);
    const status = String(row.status || '');
    if (status === 'Paid') bucket.collected += amount;
    if (status === 'Pending') bucket.pending += amount;
    if (status === 'Failed') bucket.failed += amount;
  }
  for (const row of commissions) {
    const key = commissionMonthKey(row.commission_month);
    if (!key) continue;
    const bucket = ensureMonth(`${key}-01`);
    const amount = Number(row.amount || 0);
    if (isPaidCommissionStatus(row.status)) bucket.commissions += amount;
    if (isPendingCommissionStatus(row.status)) bucket.commissions_pending += amount;
  }
  for (const row of enrollments) {
    const enrolled = billingMonthKey(row.enrollment_date);
    if (enrolled) ensureMonth(`${enrolled}-01`).enrollment_count += 1;
  }

  const current = ensureMonth(start);
  current.vendor_cost = vendorCost;
  current.saas_cost = saasCost;
  current.active_members = active.length;
  current.missing_vendor_matches = missing;
  current.vendor_coverage_pct = coverage;

  const monthKeys = [...months.keys()].sort();
  for (const periodStart of monthKeys) {
    const row = months.get(periodStart)!;
    const { gross, net } = pnlNet(row);
    await admin.from('fact_pnl_period').upsert({
      org_id: orgId,
      period_start: periodStart,
      period_grain: 'month',
      collected: row.collected,
      pending: row.pending,
      failed: row.failed,
      vendor_cost: row.vendor_cost,
      commissions: row.commissions,
      saas_cost: row.saas_cost,
      gross_margin: gross,
      net_operating: net,
      enrollment_count: row.enrollment_count,
      active_members: row.active_members,
      metadata: {
        missing_vendor_matches: row.missing_vendor_matches,
        vendor_coverage_pct: row.vendor_coverage_pct,
        commissions_pending: row.commissions_pending,
        commissions_paid: row.commissions,
        vendor_estimated_matches: periodStart === start ? estimated : 0,
      },
    }, { onConflict: 'org_id,period_start,period_grain' });
  }

  const byQuarter = new Map<string, PnlParts[]>();
  const byYear = new Map<string, PnlParts[]>();
  for (const periodStart of monthKeys) {
    const row = months.get(periodStart)!;
    const q = quarterStart(periodStart);
    const y = yearStart(periodStart);
    byQuarter.set(q, [...(byQuarter.get(q) || []), row]);
    byYear.set(y, [...(byYear.get(y) || []), row]);
  }
  for (const [periodStart, rows] of byQuarter) {
    const rolled = rollupPnlMonths(rows);
    const { gross, net } = pnlNet(rolled);
    await admin.from('fact_pnl_period').upsert({
      org_id: orgId,
      period_start: periodStart,
      period_grain: 'quarter',
      collected: rolled.collected,
      pending: rolled.pending,
      failed: rolled.failed,
      vendor_cost: rolled.vendor_cost,
      commissions: rolled.commissions,
      saas_cost: rolled.saas_cost,
      gross_margin: gross,
      net_operating: net,
      enrollment_count: rolled.enrollment_count,
      active_members: rolled.active_members,
      metadata: {
        missing_vendor_matches: rolled.missing_vendor_matches,
        vendor_coverage_pct: rolled.vendor_coverage_pct,
        commissions_pending: rolled.commissions_pending,
        commissions_paid: rolled.commissions,
        rolled_from_months: rows.length,
      },
    }, { onConflict: 'org_id,period_start,period_grain' });
  }
  for (const [periodStart, rows] of byYear) {
    const rolled = rollupPnlMonths(rows);
    const { gross, net } = pnlNet(rolled);
    await admin.from('fact_pnl_period').upsert({
      org_id: orgId,
      period_start: periodStart,
      period_grain: 'year',
      collected: rolled.collected,
      pending: rolled.pending,
      failed: rolled.failed,
      vendor_cost: rolled.vendor_cost,
      commissions: rolled.commissions,
      saas_cost: rolled.saas_cost,
      gross_margin: gross,
      net_operating: net,
      enrollment_count: rolled.enrollment_count,
      active_members: rolled.active_members,
      metadata: {
        missing_vendor_matches: rolled.missing_vendor_matches,
        vendor_coverage_pct: rolled.vendor_coverage_pct,
        commissions_pending: rolled.commissions_pending,
        commissions_paid: rolled.commissions,
        rolled_from_months: rows.length,
      },
    }, { onConflict: 'org_id,period_start,period_grain' });
  }

  const byDay = new Map<string, { new_count: number; inactive_count: number; product_key: string; plan_type: string; mrr: number; active_count: number }>();
  for (const row of enrollments) {
    const day = String(row.enrollment_date || today);
    const key = `${day}|${row.product_id || ''}|${row.plan_type || ''}`;
    const cur = byDay.get(key) || {
      new_count: 0,
      inactive_count: 0,
      product_key: String(row.product_id || ''),
      plan_type: String(row.plan_type || ''),
      mrr: 0,
      active_count: 0,
    };
    if (String(row.enrollment_date || '') === day) cur.new_count += 1;
    if (String(row.inactive_date || '') === day) cur.inactive_count += 1;
    if (['Active', 'Future Active'].includes(String(row.status))) {
      cur.active_count += 1;
      cur.mrr += Number(row.monthly_cost || 0);
    }
    byDay.set(key, cur);
  }
  for (const [key, row] of byDay) {
    const factDate = key.split('|')[0];
    await admin.from('fact_enrollments_daily').upsert({
      org_id: orgId,
      fact_date: factDate,
      product_key: row.product_key,
      plan_type: row.plan_type,
      new_count: row.new_count,
      inactive_count: row.inactive_count,
      active_count: row.active_count,
      mrr: row.mrr,
      metadata: {},
    }, { onConflict: 'org_id,fact_date,product_key,plan_type' });
  }

  for (const [productKey, bucket] of vendorMonthly) {
    await admin.from('fact_vendor_costs_monthly').upsert({
      org_id: orgId,
      period_start: start,
      product_key: productKey,
      vendor_cost: bucket.cost,
      missing_match_count: bucket.missing,
      metadata: { product_label: bucket.label },
    }, { onConflict: 'org_id,period_start,product_key' });
  }

  const { gross, net } = pnlNet(current);
  const metrics = [
    { metric_key: 'enrollment_count', value: enrollments.length },
    { metric_key: 'member_count', value: active.length },
    { metric_key: 'collected_revenue', value: current.collected },
    { metric_key: 'pending_ar', value: current.pending },
    { metric_key: 'vendor_cost', value: vendorCost },
    { metric_key: 'commissions', value: current.commissions },
    { metric_key: 'gross_margin', value: gross },
    { metric_key: 'net_operating', value: net },
    { metric_key: 'mrr', value: mrr },
    { metric_key: 'vendor_coverage_pct', value: coverage },
  ];
  for (const metric of metrics) {
    await upsertSnapshot(admin, orgId, 'aryx_enrollment', metric.metric_key, metric.value, today);
  }
  return { source: 'aryx_enrollment', status: 'healthy', metrics };
}

export async function extractCrm(
  admin: SupabaseClient,
  orgId: string,
  link: CosOrgLink,
): Promise<ExtractorResult> {
  if (!link.crm_org_id) return { source: 'aryx_crm', status: 'skipped', metrics: [] };
  const creds = envPair('ARYX_CRM_URL', 'ARYX_CRM_SERVICE_ROLE_KEY');
  if (!creds) return { source: 'aryx_crm', status: 'unconfigured', metrics: [] };
  const filter: OrgFilter = { column: 'org_id', value: link.crm_org_id };
  const today = new Date().toISOString().slice(0, 10);

  let breakdown: Array<Record<string, unknown>> = [];
  try {
    breakdown = await restRpc<Array<Record<string, unknown>>>(
      creds.url,
      creds.key,
      'crm_pipeline_breakdown',
      { p_org_id: link.crm_org_id },
      'p_org_id',
      link.crm_org_id,
    );
  } catch {
    breakdown = [];
  }

  const leads = await restGetPages(
    creds.url,
    creds.key,
    'lead_submissions?select=id,pipeline_stage,pipeline_stage_id,premium_amount,monthly_premium,updated_at,created_at',
    filter,
  );
  const deals = await restGetPages(
    creds.url,
    creds.key,
    'crm_deals?select=id,amount,probability,expected_close_date,won_at,lost_at,stage_id',
    filter,
  );
  let stages: Array<Record<string, unknown>> = [];
  try {
    stages = await restGet<Array<Record<string, unknown>>>(
      creds.url,
      creds.key,
      'crm_pipeline_stages?select=id,name,display_name,probability,is_won_stage,is_lost_stage&limit=500',
      filter,
    );
  } catch {
    stages = [];
  }
  let activities = 0;
  try {
    activities = await countFiltered(creds.url, creds.key, 'crm_activities', filter);
  } catch {
    activities = 0;
  }

  const byStage = new Map<string, { lead_count: number; premium_sum: number; aging: number; lead_if_closed: number }>();
  const weekAgo = daysAgo(7);
  let leadIfClosed = 0;
  let quotedOpen = 0;
  for (const row of leads) {
    const stage = findStage(stages, row);
    const stageName = String(stage?.name || row.pipeline_stage || 'unknown');
    const cur = byStage.get(stageName) || { lead_count: 0, premium_sum: 0, aging: 0, lead_if_closed: 0 };
    cur.lead_count += 1;
    const quoted = quotedPremium(row);
    cur.premium_sum += quoted;
    if (String(row.updated_at || '').slice(0, 10) < weekAgo) cur.aging += 1;
    if (!isClosedStage(stage, stageName)) {
      const weightedLead = ifClosed(quoted, stageProbability(stage));
      cur.lead_if_closed += weightedLead;
      leadIfClosed += weightedLead;
      quotedOpen += quoted;
    }
    byStage.set(stageName, cur);
  }

  const openDeals = deals.filter((row) => !row.won_at && !row.lost_at);
  const openDealsWithAmount = openDeals.filter((row) => Number(row.amount || 0) > 0).length;
  const dealAmount = openDeals.reduce((s, row) => s + Number(row.amount || 0), 0);
  const dealWeighted = openDeals.reduce((s, row) => s + Number(row.amount || 0) * Number(row.probability || 0) / 100, 0);
  const weighted = pickWeightedAmount(dealWeighted, leadIfClosed, openDealsWithAmount);
  const won = deals.filter((row) => row.won_at).length;
  const lost = deals.filter((row) => row.lost_at).length;

  if (byStage.size === 0 && breakdown.length > 0) {
    for (const row of breakdown) {
      const stage = String(row.name || row.stage || row.display_name || 'unknown');
      byStage.set(stage, {
        lead_count: Number(row.lead_count || row.count || 0),
        premium_sum: Number(row.premium_sum || 0),
        aging: 0,
        lead_if_closed: 0,
      });
    }
  }

  for (const [stage, row] of byStage) {
    await admin.from('fact_crm_pipeline_daily').upsert({
      org_id: orgId,
      fact_date: today,
      stage_key: stage,
      lead_count: row.lead_count,
      premium_sum: row.premium_sum,
      deal_count: openDeals.length,
      deal_amount: dealAmount,
      weighted_amount: weighted,
      won_count: won,
      lost_count: lost,
      aging_over_7: row.aging,
      activity_count: activities,
      metadata: {
        quoted_open: quotedOpen,
        lead_if_closed: leadIfClosed,
        deal_if_closed: dealWeighted,
        open_deals_with_amount: openDealsWithAmount,
        stage_if_closed: row.lead_if_closed,
      },
    }, { onConflict: 'org_id,fact_date,stage_key' });
  }

  const metrics = [
    { metric_key: 'crm_lead_count', value: leads.length },
    { metric_key: 'crm_contact_count', value: await countFiltered(creds.url, creds.key, 'crm_contacts', filter).catch(() => 0) },
    { metric_key: 'crm_activity_count', value: activities },
    { metric_key: 'pipeline_amount', value: dealAmount },
    { metric_key: 'weighted_forecast', value: weighted },
  ];
  for (const metric of metrics) {
    await upsertSnapshot(admin, orgId, 'aryx_crm', metric.metric_key, metric.value, today);
  }
  return { source: 'aryx_crm', status: 'healthy', metrics };
}

async function restGetSafe(
  url: string,
  key: string,
  path: string,
  filter: OrgFilter,
): Promise<Array<Record<string, unknown>>> {
  try {
    const rows = await restGet<Array<Record<string, unknown>>>(url, key, path, filter);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

function monthKey(value: unknown): string | null {
  const raw = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  return `${raw.slice(0, 7)}-01`;
}

function displayName(value: unknown): string | null {
  const name = String(value || '').trim();
  return name || null;
}

export async function extractAdvisorIq(
  admin: SupabaseClient,
  orgId: string,
  link: CosOrgLink,
): Promise<ExtractorResult> {
  if (!link.advisoriq_org_id) return { source: 'aryx_advisoriq', status: 'skipped', metrics: [] };
  const creds = envPair('ARYX_ADVISORIQ_URL', 'ARYX_ADVISORIQ_SERVICE_ROLE_KEY');
  if (!creds) return { source: 'aryx_advisoriq', status: 'unconfigured', metrics: [] };
  const filter: OrgFilter = { column: 'org_id', value: link.advisoriq_org_id };
  const today = new Date().toISOString().slice(0, 10);

  const stats = await restGetSafe(
    creds.url,
    creds.key,
    'stats_overview?select=active_members,terminating_members,term_soon_90,on_hold_members,mrr,cost,covered_mrr,net_mrr,retention_pct,enrollments_30,enrollments_90,active_agents&limit=1',
    filter,
  );
  const intel = await restGetSafe(
    creds.url,
    creds.key,
    'advisor_intel?select=advisor_id,name,active_members,terminating_members,term_soon_90,on_hold_members,mrr,cost,net_mrr,retention_pct,enrollments_30,enrollments_90,mrr_added_90,margin_pct&limit=500',
    filter,
  );
  let mix = await restGetSafe(
    creds.url,
    creds.key,
    'product_margin?select=product_label,active_members,mrr,cost,net_mrr&limit=200',
    filter,
  );
  if (mix.length === 0) {
    mix = await restGetSafe(
      creds.url,
      creds.key,
      'product_mix?select=product_label,active_members,mrr&limit=200',
      filter,
    );
  }
  const trend = await restGetSafe(
    creds.url,
    creds.key,
    'mrr_trend?select=month,enrollments,terminations,mrr_added,mrr_lost,net_mrr_change&limit=36',
    filter,
  );
  const forward = await restGetSafe(
    creds.url,
    creds.key,
    'forward_risk?select=bucket,members,mrr_at_risk&limit=20',
    filter,
  );
  const holds = await restGetSafe(
    creds.url,
    creds.key,
    'hold_reason_mix?select=reason,holds,mrr_parked&limit=50',
    filter,
  );
  let billing: Array<Record<string, unknown>> = [];
  try {
    billing = await restGetPages(
      creds.url,
      creds.key,
      'billing_risk?select=member_id,full_name,agent_id,agent_label,product_label,monthly_fee,next_billing_date,paid,last_payment,risk_flag,status',
      filter,
      500,
    );
  } catch {
    billing = [];
  }
  const actions = await restGetSafe(
    creds.url,
    creds.key,
    'suggestions?select=id,idempotency_key,kind,title,href,advisor_id,status,payload&status=eq.proposed&limit=200',
    filter,
  );
  let coverages: Array<Record<string, unknown>> = [];
  try {
    coverages = await restGetPages(
      creds.url,
      creds.key,
      'member_products?select=inactive_reason,monthly_fee,inactive_date,product_created_date,active_date',
      filter,
      1000,
    );
  } catch {
    coverages = [];
  }

  const overview = stats[0] || {};
  for (const row of intel) {
    const key = String(row.advisor_id || 'unknown');
    await admin.from('advisor_scorecards').upsert({
      org_id: orgId,
      advisor_key: key,
      display_name: displayName(row.name),
      active_members: Number(row.active_members || 0),
      terminating_members: Number(row.terminating_members || 0),
      term_soon_90: Number(row.term_soon_90 || 0),
      on_hold_members: Number(row.on_hold_members || 0),
      mrr: Number(row.mrr || 0),
      cost: Number(row.cost || 0),
      net_mrr: Number(row.net_mrr || 0),
      retention_pct: row.retention_pct == null ? null : Number(row.retention_pct),
      enrollments_30: Number(row.enrollments_30 || 0),
      enrollments_90: Number(row.enrollments_90 || 0),
      mrr_added_90: Number(row.mrr_added_90 || 0),
      margin_pct: row.margin_pct == null ? null : Number(row.margin_pct),
      metadata: {},
    }, { onConflict: 'org_id,advisor_key' });
  }
  for (const row of mix) {
    const productKey = String(row.product_label || 'unknown');
    const mrr = Number(row.mrr || 0);
    const cost = Number(row.cost || 0);
    const net = row.net_mrr == null ? mrr - cost : Number(row.net_mrr);
    await admin.from('fact_product_mix').upsert({
      org_id: orgId,
      product_key: productKey,
      active_members: Number(row.active_members || 0),
      mrr,
      cost,
      net_mrr: net,
      margin_pct: mrr === 0 ? null : Number(((net / mrr) * 100).toFixed(2)),
      metadata: {},
    }, { onConflict: 'org_id,product_key' });
  }
  for (const row of trend) {
    const month = monthKey(row.month);
    if (!month) continue;
    await admin.from('fact_iq_mrr_monthly').upsert({
      org_id: orgId,
      month,
      enrollments: Number(row.enrollments || 0),
      terminations: Number(row.terminations || 0),
      mrr_added: Number(row.mrr_added || 0),
      mrr_lost: Number(row.mrr_lost || 0),
      net_mrr_change: Number(row.net_mrr_change || 0),
      metadata: {},
    }, { onConflict: 'org_id,month' });
  }
  for (const row of forward) {
    const bucket = String(row.bucket || 'unknown');
    await admin.from('fact_iq_forward_risk').upsert({
      org_id: orgId,
      bucket,
      members: Number(row.members || 0),
      mrr_at_risk: Number(row.mrr_at_risk || 0),
      metadata: {},
    }, { onConflict: 'org_id,bucket' });
  }
  for (const row of holds) {
    const reason = String(row.reason || 'unspecified');
    await admin.from('fact_iq_reason_mix').upsert({
      org_id: orgId,
      kind: 'hold',
      reason,
      item_count: Number(row.holds || 0),
      mrr: Number(row.mrr_parked || 0),
      metadata: {},
    }, { onConflict: 'org_id,kind,reason' });
  }

  const churn = new Map<string, { count: number; mrr: number }>();
  const cohorts = new Map<string, { size: number; retained: number }>();
  for (const row of coverages) {
    const inactive = String(row.inactive_date || '').slice(0, 10);
    if (inactive) {
      const reason = String(row.inactive_reason || 'unspecified').trim() || 'unspecified';
      const cur = churn.get(reason) || { count: 0, mrr: 0 };
      cur.count += 1;
      cur.mrr += Number(row.monthly_fee || 0);
      churn.set(reason, cur);
    }
    const created = monthKey(row.product_created_date || row.active_date);
    if (created) {
      const cur = cohorts.get(created) || { size: 0, retained: 0 };
      cur.size += 1;
      if (!inactive) cur.retained += 1;
      cohorts.set(created, cur);
    }
  }
  for (const [reason, row] of churn) {
    await admin.from('fact_iq_reason_mix').upsert({
      org_id: orgId,
      kind: 'churn',
      reason,
      item_count: row.count,
      mrr: Number(row.mrr.toFixed(2)),
      metadata: {},
    }, { onConflict: 'org_id,kind,reason' });
  }
  for (const [cohortMonth, row] of cohorts) {
    await admin.from('fact_iq_cohorts').upsert({
      org_id: orgId,
      cohort_month: cohortMonth,
      cohort_size: row.size,
      retained: row.retained,
      retention_pct: row.size === 0 ? null : Number(((row.retained / row.size) * 100).toFixed(2)),
      metadata: {},
    }, { onConflict: 'org_id,cohort_month' });
  }

  for (const row of billing) {
    const memberKey = String(row.member_id || '');
    if (!memberKey) continue;
    await admin.from('book_billing_risk').upsert({
      org_id: orgId,
      member_key: memberKey,
      display_name: displayName(row.full_name),
      advisor_key: row.agent_id ? String(row.agent_id) : null,
      advisor_label: displayName(row.agent_label),
      product_key: String(row.product_label || ''),
      monthly_fee: Number(row.monthly_fee || 0),
      next_billing_date: row.next_billing_date || null,
      paid: row.paid == null ? null : Boolean(row.paid),
      last_payment: row.last_payment == null ? null : Number(row.last_payment),
      risk_flag: row.risk_flag ? String(row.risk_flag) : null,
      status: row.status ? String(row.status) : null,
      metadata: {},
    }, { onConflict: 'org_id,member_key,product_key' });
  }
  for (const row of actions) {
    const actionKey = String(row.idempotency_key || row.id || '');
    if (!actionKey) continue;
    const payload = (row.payload && typeof row.payload === 'object') ? row.payload as Record<string, unknown> : {};
    await admin.from('book_actions').upsert({
      org_id: orgId,
      action_key: actionKey,
      kind: row.kind ? String(row.kind) : null,
      title: row.title ? String(row.title) : null,
      dollars: payload.dollars == null ? null : Number(payload.dollars),
      advisor_key: row.advisor_id ? String(row.advisor_id) : null,
      href: row.href ? String(row.href) : null,
      status: row.status ? String(row.status) : null,
      metadata: {},
    }, { onConflict: 'org_id,action_key' });
  }

  const metrics = stats.length === 0 ? [] : [
    { metric_key: 'iq_active_members', value: Number(overview.active_members || 0) },
    { metric_key: 'iq_terminating_members', value: Number(overview.terminating_members || 0) },
    { metric_key: 'iq_term_soon_90', value: Number(overview.term_soon_90 || 0) },
    { metric_key: 'iq_on_hold_members', value: Number(overview.on_hold_members || 0) },
    { metric_key: 'iq_mrr', value: Number(overview.mrr || 0) },
    { metric_key: 'iq_cost', value: Number(overview.cost || 0) },
    { metric_key: 'iq_covered_mrr', value: Number(overview.covered_mrr || 0) },
    { metric_key: 'iq_net_mrr', value: Number(overview.net_mrr || 0) },
    { metric_key: 'iq_retention_pct', value: Number(overview.retention_pct || 0) },
    { metric_key: 'iq_enrollments_30', value: Number(overview.enrollments_30 || 0) },
    { metric_key: 'iq_enrollments_90', value: Number(overview.enrollments_90 || 0) },
    { metric_key: 'iq_active_agents', value: Number(overview.active_agents || 0) },
  ];
  for (const metric of metrics) {
    await upsertSnapshot(admin, orgId, 'aryx_advisoriq', metric.metric_key, metric.value, today);
  }
  return { source: 'aryx_advisoriq', status: 'healthy', metrics };
}

const MPB_COS_ORG_ID = 'a0000000-0000-0000-0000-000000000001';

function ticketAgeBucket(createdAt: string, nowMs: number): string {
  const ageDays = (nowMs - new Date(createdAt).getTime()) / 86_400_000;
  if (ageDays < 1) return '0_1';
  if (ageDays < 3) return '1_3';
  if (ageDays < 7) return '3_7';
  if (ageDays < 30) return '7_30';
  return '30_plus';
}

export async function extractTickets(
  admin: SupabaseClient,
  orgId: string,
  link: CosOrgLink,
): Promise<ExtractorResult> {
  if (link.ticket_scope === 'none') return { source: 'it_ticketing', status: 'skipped', metrics: [] };
  const creds = envPair('IT_TICKETING_URL', 'IT_TICKETING_SERVICE_ROLE_KEY');
  if (!creds) return { source: 'it_ticketing', status: 'unconfigured', metrics: [] };
  if (orgId !== MPB_COS_ORG_ID || (link.ticket_scope !== 'mpb_pilot' && link.ticket_scope !== 'mapped')) {
    return { source: 'it_ticketing', status: 'skipped', metrics: [], error: 'ticket_scope_unmapped' };
  }

  const today = new Date().toISOString().slice(0, 10);
  const since = `${daysAgo(90)}T00:00:00Z`;
  const [open, resolved, created, pending, breached, unassigned, statusNew, statusOpen, statusAwaiting, statusHold, statusResolved, statusClosed] = await Promise.all([
    countUnscoped(creds.url, creds.key, 'tickets', `status=${OPEN_TICKETS}`),
    countUnscoped(creds.url, creds.key, 'tickets', `status=${RESOLVED_TICKETS}`),
    countUnscoped(creds.url, creds.key, 'tickets', `created_at=gte.${today}T00:00:00Z`),
    countUnscoped(creds.url, creds.key, 'tickets', 'status=in.(awaiting_customer,on_hold)'),
    countUnscoped(creds.url, creds.key, 'tickets', `status=${OPEN_TICKETS}&sla_due_at=lt.${new Date().toISOString()}`),
    countUnscoped(creds.url, creds.key, 'tickets', `status=${OPEN_TICKETS}&assignee_id=is.null`),
    countUnscoped(creds.url, creds.key, 'tickets', 'status=eq.new'),
    countUnscoped(creds.url, creds.key, 'tickets', 'status=eq.open'),
    countUnscoped(creds.url, creds.key, 'tickets', 'status=eq.awaiting_customer'),
    countUnscoped(creds.url, creds.key, 'tickets', 'status=eq.on_hold'),
    countUnscoped(creds.url, creds.key, 'tickets', 'status=eq.resolved'),
    countUnscoped(creds.url, creds.key, 'tickets', 'status=eq.closed'),
  ]);

  let slaPct: number | null = null;
  let firstResponsePct: number | null = null;
  let resolutionPct: number | null = null;
  try {
    const sla = await restRpc<Array<Record<string, unknown>>>(
      creds.url,
      creds.key,
      'get_sla_compliance_percentage',
      { start_date: monthStart(), end_date: today },
      'start_date',
      monthStart(),
    );
    slaPct = Number(sla[0]?.overall_percentage ?? sla[0]?.resolution_percentage ?? null);
    firstResponsePct = sla[0]?.first_response_percentage == null ? null : Number(sla[0].first_response_percentage);
    resolutionPct = sla[0]?.resolution_percentage == null ? null : Number(sla[0].resolution_percentage);
  } catch {
    slaPct = null;
  }

  let rows: Array<Record<string, unknown>> = [];
  try {
    rows = await restGetUnscopedPages(
      creds.url,
      creds.key,
      `tickets?select=${TICKET_SAFE_SELECT}&created_at=gte.${since}&order=created_at.desc`,
      500,
    );
  } catch {
    rows = [];
  }
  let openRows: Array<Record<string, unknown>> = [];
  try {
    openRows = await restGetUnscopedPages(
      creds.url,
      creds.key,
      `tickets?select=${TICKET_SAFE_SELECT}&status=${OPEN_TICKETS}&order=created_at.desc`,
      200,
    );
  } catch {
    openRows = [];
  }

  const nowMs = Date.now();
  const since30 = daysAgo(30);
  const daily = new Map<string, { created: number; resolved: number }>();
  const mix = {
    status: new Map<string, number>(),
    priority: new Map<string, number>(),
    category: new Map<string, number>(),
  };
  const aging = new Map<string, number>();
  const agents = new Map<string, { name: string | null; open: number; resolved30: number; breached: number }>();

  const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) || 0) + 1);
  const agentRow = (name: unknown) => {
    const label = displayName(name) || 'Unassigned';
    const key = label.toLowerCase();
    const cur = agents.get(key) || { name: displayName(name), open: 0, resolved30: 0, breached: 0 };
    agents.set(key, cur);
    return cur;
  };

  for (const row of rows) {
    const createdDay = String(row.created_at || '').slice(0, 10);
    if (createdDay) {
      const cur = daily.get(createdDay) || { created: 0, resolved: 0 };
      cur.created += 1;
      daily.set(createdDay, cur);
    }
    const resolvedDay = String(row.resolved_at || '').slice(0, 10);
    if (resolvedDay) {
      const cur = daily.get(resolvedDay) || { created: 0, resolved: 0 };
      cur.resolved += 1;
      daily.set(resolvedDay, cur);
    }
    bump(mix.status, String(row.status || 'unknown'));
    bump(mix.priority, String(row.priority || 'unknown'));
    bump(mix.category, String(row.category || '').trim() || 'unspecified');
    if (resolvedDay && resolvedDay >= since30) agentRow(row.agent_name).resolved30 += 1;
  }

  for (const row of openRows) {
    bump(aging, ticketAgeBucket(String(row.created_at || today), nowMs));
    const agent = agentRow(row.agent_name);
    agent.open += 1;
    if (row.sla_due_at && new Date(String(row.sla_due_at)).getTime() < nowMs) agent.breached += 1;
  }

  for (const [day, row] of daily) {
    await admin.from('fact_tickets_daily').upsert({
      org_id: orgId,
      fact_date: day,
      created_count: row.created,
      resolved_count: row.resolved,
      open_count: day === today ? open : 0,
      pending_count: day === today ? pending : 0,
      breached_count: day === today ? breached : 0,
      unassigned_count: day === today ? unassigned : 0,
      sla_pct: day === today ? slaPct : null,
      first_response_pct: day === today ? firstResponsePct : null,
      resolution_pct: day === today ? resolutionPct : null,
      metadata: { scope: 'mpb_pilot' },
    }, { onConflict: 'org_id,fact_date' });
  }

  const todayDaily = daily.get(today) || { created: 0, resolved: 0 };
  await admin.from('fact_tickets_daily').upsert({
    org_id: orgId,
    fact_date: today,
    created_count: created,
    open_count: open,
    resolved_count: todayDaily.resolved,
    pending_count: pending,
    breached_count: breached,
    unassigned_count: unassigned,
    sla_pct: slaPct,
    first_response_pct: firstResponsePct,
    resolution_pct: resolutionPct,
    metadata: { scope: 'mpb_pilot', resolved_all: resolved },
  }, { onConflict: 'org_id,fact_date' });

  for (const [itemKey, itemCount] of [
    ['new', statusNew],
    ['open', statusOpen],
    ['awaiting_customer', statusAwaiting],
    ['on_hold', statusHold],
    ['resolved', statusResolved],
    ['closed', statusClosed],
  ] as Array<[string, number]>) {
    mix.status.set(itemKey, itemCount);
  }

  for (const [kind, map] of Object.entries(mix)) {
    for (const [itemKey, itemCount] of map) {
      await admin.from('fact_ticket_mix').upsert({
        org_id: orgId,
        kind,
        item_key: itemKey,
        item_count: itemCount,
        metadata: { window: '90d' },
      }, { onConflict: 'org_id,kind,item_key' });
    }
  }
  for (const [bucket, tickets] of aging) {
    await admin.from('fact_ticket_aging').upsert({
      org_id: orgId,
      bucket,
      tickets,
      metadata: {},
    }, { onConflict: 'org_id,bucket' });
  }
  for (const [agentKey, row] of agents) {
    await admin.from('fact_ticket_agents').upsert({
      org_id: orgId,
      agent_key: agentKey,
      display_name: row.name,
      open_count: row.open,
      resolved_30: row.resolved30,
      breached_count: row.breached,
      metadata: {},
    }, { onConflict: 'org_id,agent_key' });
  }

  for (const row of openRows.slice(0, 80)) {
    const ticketKey = String(row.id || row.ticket_number || '');
    if (!ticketKey) continue;
    const number = row.ticket_number == null ? null : Number(row.ticket_number);
    await admin.from('book_tickets').upsert({
      org_id: orgId,
      ticket_key: ticketKey,
      ticket_number: Number.isFinite(number as number) ? number : null,
      title: row.subject ? String(row.subject).slice(0, 180) : null,
      status: row.status ? String(row.status) : null,
      priority: row.priority ? String(row.priority) : null,
      category: row.category ? String(row.category) : null,
      agent_label: displayName(row.agent_name),
      created_at: row.created_at || null,
      sla_due_at: row.sla_due_at || null,
      href: number ? `/tickets/${number}` : null,
      metadata: {},
    }, { onConflict: 'org_id,ticket_key' });
  }

  const created30 = [...daily.entries()]
    .filter(([day]) => day >= since30)
    .reduce((sum, [, row]) => sum + row.created, 0);
  const metrics = [
    { metric_key: 'open_ticket_count', value: open },
    { metric_key: 'resolved_ticket_count', value: resolved },
    { metric_key: 'pending_ticket_count', value: pending },
    { metric_key: 'breached_ticket_count', value: breached },
    { metric_key: 'unassigned_ticket_count', value: unassigned },
    { metric_key: 'created_ticket_30', value: created30 },
  ];
  for (const metric of metrics) {
    await upsertSnapshot(admin, orgId, 'it_ticketing', metric.metric_key, metric.value, today);
  }
  return { source: 'it_ticketing', status: 'healthy', metrics };
}

export async function extractTraffic(
  admin: SupabaseClient,
  orgId: string,
  link: CosOrgLink,
): Promise<ExtractorResult> {
  if (!link.marketflow_team_id) return { source: 'marketflo', status: 'skipped', metrics: [] };
  const creds = envPair('MARKETING_SUITE_URL', 'MARKETING_SUITE_SERVICE_ROLE_KEY');
  if (!creds) return { source: 'marketflo', status: 'unconfigured', metrics: [] };
  const filter: OrgFilter = { column: 'team_id', value: link.marketflow_team_id };
  const today = new Date().toISOString().slice(0, 10);
  const since = daysAgo(30);

  // analytics_metrics is not team-scoped. kpi_metrics already has team_id.
  const rows = await restGet<Array<Record<string, unknown>>>(
    creds.url,
    creds.key,
    `kpi_metrics?select=date,traffic,leads,new_members&date=gte.${since}&limit=5000`,
    filter,
  );

  const byDay = new Map<string, { sessions: number; users: number; pageviews: number; conversions: number }>();
  for (const row of rows) {
    const day = String(row.date || today).slice(0, 10);
    const cur = byDay.get(day) || { sessions: 0, users: 0, pageviews: 0, conversions: 0 };
    cur.sessions += Number(row.traffic || 0);
    cur.conversions += Number(row.leads || 0);
    cur.users += Number(row.new_members || 0);
    byDay.set(day, cur);
  }

  let sessionSum = 0;
  for (const [day, row] of byDay) {
    sessionSum += row.sessions;
    await admin.from('fact_traffic_daily').upsert({
      org_id: orgId,
      fact_date: day,
      source: 'ga4',
      sessions: row.sessions,
      users: row.users,
      pageviews: row.pageviews,
      conversions: row.conversions,
      metadata: {},
    }, { onConflict: 'org_id,fact_date,source' });
  }

  await upsertSnapshot(admin, orgId, 'marketflo', 'sessions', sessionSum, today);
  return { source: 'marketflo', status: 'healthy', metrics: [{ metric_key: 'sessions', value: sessionSum }] };
}

export async function extractSaas(admin: SupabaseClient, orgId: string): Promise<ExtractorResult> {
  const { data } = await admin.from('saas_expenses').select('amount, cadence').eq('org_id', orgId);
  const monthly = (data || []).reduce((sum, row) => {
    const amount = Number(row.amount || 0);
    return sum + (row.cadence === 'yearly' ? amount / 12 : amount);
  }, 0);
  const today = new Date().toISOString().slice(0, 10);
  await upsertSnapshot(admin, orgId, 'saas_internal', 'saas_monthly', monthly, today);
  return { source: 'saas_internal', status: 'healthy', metrics: [{ metric_key: 'saas_monthly', value: monthly }] };
}

export async function extractMemberApp(
  admin: SupabaseClient,
  orgId: string,
  link: CosOrgLink,
): Promise<ExtractorResult> {
  if (!link.enrollment_org_id) return { source: 'mpb_member', status: 'skipped', metrics: [] };
  const creds = envPair('MPB_MEMBER_URL', 'MPB_MEMBER_SERVICE_ROLE_KEY');
  if (!creds) return { source: 'mpb_member', status: 'unconfigured', metrics: [] };
  const filter: OrgFilter = { column: 'organization_id', value: link.enrollment_org_id };
  let count = 0;
  try {
    count = await countFiltered(creds.url, creds.key, 'members', filter);
  } catch {
    return { source: 'mpb_member', status: 'skipped', metrics: [], error: 'member_org_filter_unavailable' };
  }
  const today = new Date().toISOString().slice(0, 10);
  await upsertSnapshot(admin, orgId, 'mpb_member', 'member_app_count', count, today);
  return { source: 'mpb_member', status: 'healthy', metrics: [{ metric_key: 'member_app_count', value: count }] };
}
