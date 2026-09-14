export const MPB_COS_ORG_ID = 'a0000000-0000-0000-0000-000000000001';
export const ARYX_CRM_HREF = 'https://crm.aryx.pro';
export const ADVISORIQ_HREF = 'https://advisoriq.aryx.pro';
export const ITSTS_HREF = 'https://support.aryx.pro';

const CRM_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export function crmRecordHref(kind: string, id: string, slug?: string | null): string {
  const path = kind === 'contact' ? `/contacts/${id}` : `/leads/${id}`;
  if (slug && CRM_SLUG_RE.test(slug)) {
    return `https://${slug.toLowerCase()}.crm.aryx.pro${path}`;
  }
  return `${ARYX_CRM_HREF}${path}`;
}

export type CosMembershipRole = 'owner' | 'admin' | 'viewer' | 'cos';

export function isOperatorRole(role?: string | null): boolean {
  return role === 'owner' || role === 'admin' || role === 'cos';
}

export function remapLegacyPath(pathname: string): string | null {
  const exact: Record<string, string> = {
    '/ceod/home': '/home',
    '/ctod/home': '/home',
    '/ceod/email': '/inbox',
    '/ctod/email': '/inbox',
    '/admin/email': '/inbox',
    '/ceod/organizer': '/organizer',
    '/ctod/organizer': '/organizer',
    '/ceod/settings': '/settings',
    '/ctod/settings': '/settings',
    '/ceod/files': '/files',
    '/ctod/files': '/files',
    '/ceod/command-center': '/home',
    '/ctod/command-center': '/home',
    '/analytics': '/home',
    '/analytics/overview': '/home',
    '/analytics/member-engagement': '/enrollments',
    '/analytics/member-retention': '/enrollments',
    '/analytics/advisor-performance': '/advisors',
    '/analytics/website': '/marketing',
    '/analytics/marketing': '/marketing',
    '/operations/it-support': '/tickets',
    '/analytics/tickets': '/tickets/analytics',
    '/ctod/compliance': '/operations',
    '/ctod/compliance/dashboard': '/operations',
  };

  if (exact[pathname]) return exact[pathname];
  if (pathname.startsWith('/ceod/analytics') || pathname.startsWith('/ctod/analytics')) {
    return pathname.replace(/^\/(ceod|ctod)/, '');
  }
  if (pathname.startsWith('/ceod/development') || pathname.startsWith('/ctod/development')) {
    return pathname.replace(/^\/(ceod|ctod)/, '');
  }
  if (pathname.startsWith('/ceod/operations') || pathname.startsWith('/ctod/operations')) {
    return pathname.replace(/^\/(ceod|ctod)/, '');
  }
  if (pathname.startsWith('/ctod/compliance') || pathname.startsWith('/operations/compliance')) {
    return '/operations';
  }
  if (pathname.startsWith('/ctod/infrastructure')) {
    return pathname.replace('/ctod/infrastructure', '/operations/infrastructure');
  }
  if (pathname.startsWith('/admin') || pathname.startsWith('/advisor') || pathname.startsWith('/ceod') || pathname.startsWith('/ctod')) {
    return '/home';
  }
  return null;
}

export function money(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value));
}

export function compactNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(value));
}

export type PeriodKey = 'mtd' | 'qtd' | 'ytd' | 'custom';
export type PeriodGrain = 'month' | 'quarter' | 'year';

export function grainForPeriod(period: PeriodKey): PeriodGrain {
  if (period === 'ytd') return 'year';
  if (period === 'qtd') return 'quarter';
  return 'month';
}

export function periodBounds(period: PeriodKey, customStart?: string, customEnd?: string): { start: string; end: string } {
  const now = new Date();
  const end = customEnd || now.toISOString().slice(0, 10);
  if (period === 'custom' && customStart) return { start: customStart, end };
  if (period === 'ytd') return { start: `${now.getUTCFullYear()}-01-01`, end };
  if (period === 'qtd') {
    const q = Math.floor(now.getUTCMonth() / 3) * 3;
    return { start: `${now.getUTCFullYear()}-${String(q + 1).padStart(2, '0')}-01`, end };
  }
  return { start: `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`, end };
}
