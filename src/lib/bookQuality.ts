const LIVE = new Set(['active', 'future active']);

export interface LifeRow {
  enrolledOn: string | null;
  inactiveOn: string | null;
  status: string | null;
}

export interface SurvivalSummary {
  cohortSize: number;
  cohort30: number;
  cohort60: number;
  cohort90: number;
  survived30: number;
  survived60: number;
  survived90: number;
}

export interface QualityFact {
  qualityKey: string;
  cohortSize: number;
  cohort30: number;
  cohort60: number;
  cohort90: number;
  survived30: number;
  survived60: number;
  survived90: number;
  firstPaySuccessPct: number | null;
  contribution: number | null;
  commissionApplied: boolean;
  label?: string | null;
}

export interface MemberBill {
  enrollmentId: string;
  status: string;
}

function day(value: string | null | undefined): string | null {
  const raw = String(value || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function utc(isoDay: string): number {
  return Date.parse(`${isoDay}T00:00:00Z`);
}

function ageDays(enrolled: string, today: string): number {
  return Math.floor((utc(today) - utc(enrolled)) / 86_400_000);
}

function inactiveInside(enrolled: string, inactive: string | null, window: number): boolean {
  if (!inactive) return false;
  const span = Math.floor((utc(inactive) - utc(enrolled)) / 86_400_000);
  return span >= 0 && span <= window;
}

function isLive(status: string | null): boolean {
  return LIVE.has(String(status || '').trim().toLowerCase());
}

export function survivalForLives(rows: LifeRow[], today: string): SurvivalSummary {
  const summary: SurvivalSummary = {
    cohortSize: 0,
    cohort30: 0,
    cohort60: 0,
    cohort90: 0,
    survived30: 0,
    survived60: 0,
    survived90: 0,
  };
  for (const row of rows) {
    const enrolled = day(row.enrolledOn);
    if (!enrolled || !day(today)) continue;
    const inactive = day(row.inactiveOn);
    const age = ageDays(enrolled, today.slice(0, 10));
    const windows = [
      [30, 'cohort30', 'survived30'],
      [60, 'cohort60', 'survived60'],
      [90, 'cohort90', 'survived90'],
    ] as const;
    for (const [window, cohortKey, survivedKey] of windows) {
      if (age < window) continue;
      summary[cohortKey] += 1;
      if (window === 90) summary.cohortSize += 1;
      if (isLive(row.status) && !inactiveInside(enrolled, inactive, window)) {
        summary[survivedKey] += 1;
      }
    }
  }
  return summary;
}

export function firstPayRate(bills: MemberBill[]): number | null {
  const byMember = new Map<string, boolean>();
  for (const bill of bills) {
    const id = String(bill.enrollmentId || '').trim();
    if (!id) continue;
    const paid = String(bill.status || '').trim().toLowerCase() === 'paid';
    byMember.set(id, (byMember.get(id) || false) || paid);
  }
  if (byMember.size === 0) return null;
  const paidCount = [...byMember.values()].filter(Boolean).length;
  return Number(((paidCount / byMember.size) * 100).toFixed(2));
}

export function firstPayRateByKey(
  bills: MemberBill[],
  enrollmentKey: Map<string, string>,
): Map<string, number | null> {
  const grouped = new Map<string, MemberBill[]>();
  for (const bill of bills) {
    const key = enrollmentKey.get(String(bill.enrollmentId || '').trim());
    if (!key) continue;
    const list = grouped.get(key) || [];
    list.push(bill);
    grouped.set(key, list);
  }
  const out = new Map<string, number | null>();
  for (const [key, rows] of grouped) out.set(key, firstPayRate(rows));
  return out;
}

export function contributionNet(mrr: number, vendor: number, commissions: number | null): number {
  const base = Number(mrr || 0) - Number(vendor || 0);
  if (commissions == null) return Number(base.toFixed(2));
  return Number((base - commissions).toFixed(2));
}

export function qualityFromGroups(
  groups: Map<string, LifeRow[]>,
  today: string,
  economics: Map<string, { mrr: number; vendor: number; commissions: number | null }>,
  firstPay: Map<string, number | null> | null,
): QualityFact[] {
  const keys = new Set<string>([...groups.keys(), ...economics.keys()]);
  const rows: QualityFact[] = [];
  for (const key of keys) {
    if (!key) continue;
    const survival = survivalForLives(groups.get(key) || [], today);
    const money = economics.get(key);
    const commissionApplied = money != null && money.commissions != null;
    rows.push({
      qualityKey: key,
      ...survival,
      firstPaySuccessPct: firstPay?.get(key) ?? null,
      contribution: money ? contributionNet(money.mrr, money.vendor, money.commissions) : null,
      commissionApplied,
    });
  }
  return rows.sort((a, b) => b.cohortSize - a.cohortSize || a.qualityKey.localeCompare(b.qualityKey));
}

export function earlyCancelPct(cohort90: number, survived90: number): number | null {
  if (cohort90 <= 0) return null;
  return Number((((cohort90 - survived90) / cohort90) * 100).toFixed(1));
}

export function enrollmentStatusCounts(statuses: string[]): { active: number; futureActive: number; other: number } {
  let active = 0;
  let futureActive = 0;
  let other = 0;
  for (const status of statuses) {
    const key = String(status || '').trim().toLowerCase();
    if (key === 'active') active += 1;
    else if (key === 'future active') futureActive += 1;
    else other += 1;
  }
  return { active, futureActive, other };
}

export function latestFutureActive(
  rows: Array<{ org_id: string; fact_date: string; future_active_count: number }>,
): number | null {
  if (rows.length === 0) return null;
  const latest = new Map<string, { date: string; count: number }>();
  for (const row of rows) {
    const cur = latest.get(row.org_id);
    if (!cur || row.fact_date > cur.date) {
      latest.set(row.org_id, { date: row.fact_date, count: Number(row.future_active_count || 0) });
    }
  }
  let sum = 0;
  for (const row of latest.values()) sum += row.count;
  return sum;
}

export function isRevenueBlockingCategory(category: string | null | undefined): boolean {
  return /bill|enroll|payment|commission/i.test(String(category || ''));
}

export interface UplineNode {
  id: string;
  parentId: string | null;
  name: string | null;
}

export interface BookSlice {
  advisorKey: string;
  mrr: number;
  netMrr: number;
  activeMembers: number;
}

export interface UplineRollup {
  uplineKey: string;
  displayName: string | null;
  downlineCount: number;
  mrr: number;
  netMrr: number;
  activeMembers: number;
  mrrSharePct: number | null;
  earlyCancelPct: number | null;
}

export function rollupDirectUplines(
  nodes: UplineNode[],
  books: BookSlice[],
  quality: Array<{ key: string; cohort90: number; survived90: number }>,
): UplineRollup[] {
  if (nodes.length === 0) return [];
  const bookBy = new Map(books.map((row) => [row.advisorKey, row]));
  const qualityBy = new Map(quality.map((row) => [row.key, row]));
  const nameBy = new Map(nodes.map((row) => [row.id, row.name]));
  const companyMrr = books.reduce((sum, row) => sum + Number(row.mrr || 0), 0);
  const children = new Map<string, string[]>();
  for (const node of nodes) {
    if (!node.id || !node.parentId || node.parentId === node.id) continue;
    const list = children.get(node.parentId) || [];
    list.push(node.id);
    children.set(node.parentId, list);
  }
  const rows: UplineRollup[] = [];
  for (const [parent, ids] of children) {
    let mrr = 0;
    let net = 0;
    let members = 0;
    let cohort = 0;
    let survived = 0;
    let sawQuality = false;
    for (const id of ids) {
      const book = bookBy.get(id);
      if (book) {
        mrr += Number(book.mrr || 0);
        net += Number(book.netMrr || 0);
        members += Number(book.activeMembers || 0);
      }
      const score = qualityBy.get(id);
      if (score && score.cohort90 > 0) {
        sawQuality = true;
        cohort += score.cohort90;
        survived += score.survived90;
      }
    }
    rows.push({
      uplineKey: parent,
      displayName: nameBy.get(parent) || null,
      downlineCount: ids.length,
      mrr,
      netMrr: net,
      activeMembers: members,
      mrrSharePct: companyMrr > 0 ? Number(((mrr / companyMrr) * 100).toFixed(1)) : null,
      earlyCancelPct: sawQuality ? earlyCancelPct(cohort, survived) : null,
    });
  }
  return rows.sort((a, b) => b.mrr - a.mrr || a.uplineKey.localeCompare(b.uplineKey));
}
