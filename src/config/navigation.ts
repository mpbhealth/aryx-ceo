import {
  Activity,
  BarChart3,
  Award,
  Settings,
  FileText,
  LineChart,
  LayoutDashboard,
  LayoutGrid,
  Code2,
  Mail,
  Briefcase,
  Wallet,
  Ticket,
  UserPlus,
  Megaphone,
} from 'lucide-react';

export interface NavSubItem {
  id: string;
  label: string;
  path: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  submenu?: NavSubItem[];
  roles?: string[];
  badge?: string;
  requires?: 'tickets' | 'traffic' | 'enrollment' | 'crm' | 'advisoriq';
}

export const categories: Record<string, string> = {
  desk: 'Desk',
  enrollment: 'Enrollment',
  advisors: 'Advisors',
  marketing: 'Marketing',
  crm: 'CRM',
  finance: 'Finance',
  support: 'Support',
  development: 'Development',
  operations: 'Operations',
  account: 'Account',
};

export const cosNavigationItems: NavItem[] = [
  { id: 'home', label: 'Command', path: '/home', icon: LayoutDashboard, category: 'desk' },
  { id: 'organizer', label: 'Organizer', path: '/organizer', icon: LayoutGrid, category: 'desk' },
  { id: 'inbox', label: 'Inbox', path: '/inbox', icon: Mail, category: 'desk' },
  { id: 'files', label: 'Files', path: '/files', icon: FileText, category: 'desk' },
  { id: 'enrollments', label: 'Members', path: '/enrollments', icon: UserPlus, category: 'enrollment', requires: 'enrollment' },
  { id: 'advisors', label: 'Books', path: '/advisors', icon: Award, category: 'advisors', requires: 'advisoriq' },
  { id: 'marketing', label: 'Traffic', path: '/marketing', icon: Megaphone, category: 'marketing', requires: 'traffic' },
  { id: 'crm-records', label: 'Records', path: '/crm', icon: Briefcase, category: 'crm', requires: 'crm' },
  { id: 'pipeline', label: 'Pipeline', path: '/pipeline', icon: LineChart, category: 'crm', requires: 'crm' },
  { id: 'finance-pnl', label: 'P&L', path: '/finance', icon: Wallet, category: 'finance' },
  { id: 'finance-cash', label: 'Cash', path: '/finance/cash', icon: Wallet, category: 'finance' },
  { id: 'finance-vendors', label: 'Vendors', path: '/finance/vendors', icon: Wallet, category: 'finance' },
  { id: 'finance-forecast', label: 'Forecasts', path: '/finance/forecast', icon: LineChart, category: 'finance' },
  { id: 'tickets', label: 'Queue', path: '/tickets', icon: Ticket, category: 'support', requires: 'tickets' },
  { id: 'ticket-analytics', label: 'Analytics', path: '/tickets/analytics', icon: BarChart3, category: 'support', requires: 'tickets' },
  {
    id: 'development',
    label: 'Build',
    path: '/development',
    icon: Code2,
    category: 'development',
    submenu: [
      { id: 'dev-overview', label: 'Overview', path: '/development' },
      { id: 'tech-stack', label: 'Tech Stack', path: '/development/tech-stack' },
      { id: 'quicklinks', label: 'Quick Links', path: '/development/quicklinks' },
      { id: 'projects', label: 'Projects', path: '/development/projects' },
      { id: 'assignments', label: 'Assignments', path: '/development/assignments' },
      { id: 'notepad', label: 'Notepad', path: '/development/notepad' },
    ],
  },
  {
    id: 'operations',
    label: 'Company',
    path: '/operations',
    icon: Activity,
    category: 'operations',
    submenu: [
      { id: 'ops-overview', label: 'Overview', path: '/operations' },
      { id: 'ops-saas', label: 'SaaS Spend', path: '/operations/saas-spend' },
      { id: 'ops-integrations', label: 'Integrations', path: '/operations/integrations' },
      { id: 'ops-policy', label: 'Policy', path: '/operations/policy-manager' },
      { id: 'ops-org', label: 'Organization', path: '/operations/organization' },
      { id: 'ops-staff', label: 'Staff', path: '/operations/performance-evaluation' },
      { id: 'ops-deployments', label: 'Deployments', path: '/operations/infrastructure/deployments' },
    ],
  },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings, category: 'account' },
];

export const ceoNavigationItems = cosNavigationItems;
export const ctoNavigationItems = cosNavigationItems;
export const advisorNavigationItems = cosNavigationItems;

export function collectNavPaths(items: NavItem[]): string[] {
  const paths: string[] = [];
  for (const item of items) {
    paths.push(item.path);
    item.submenu?.forEach((sub) => paths.push(sub.path));
  }
  return paths;
}

export function isNavPathActive(current: string, itemPath: string, allPaths: string[]): boolean {
  if (current === itemPath) return true;
  if (!current.startsWith(`${itemPath}/`)) return false;
  return !allPaths.some((path) => (
    path !== itemPath
    && path.startsWith(`${itemPath}/`)
    && (current === path || current.startsWith(`${path}/`))
  ));
}

export function findNavMatch(
  path: string,
  items: NavItem[] = cosNavigationItems,
): { parent?: NavItem; child?: NavSubItem } {
  const allPaths = collectNavPaths(items);
  for (const item of items) {
    if (item.submenu) {
      for (const sub of item.submenu) {
        if (isNavPathActive(path, sub.path, allPaths)) {
          return { parent: item, child: sub };
        }
      }
      if (path === item.path || isNavPathActive(path, item.path, allPaths)) {
        return { parent: item };
      }
    } else if (isNavPathActive(path, item.path, allPaths)) {
      return { parent: item };
    }
  }
  return {};
}

export function buildRouteToTabMap(items: NavItem[]): Record<string, string> {
  const map: Record<string, string> = {
    '/command': 'home',
    '/analytics/marketing': 'marketing',
    '/analytics/website': 'marketing',
  };
  items.forEach((item) => {
    map[item.path] = item.id;
    item.submenu?.forEach((sub) => {
      map[sub.path] = sub.id;
    });
  });
  return map;
}

export function buildTabToRouteMap(items: NavItem[]): Record<string, string> {
  const map: Record<string, string> = {};
  items.forEach((item) => {
    map[item.id] = item.path;
    item.submenu?.forEach((sub) => {
      map[sub.id] = sub.path;
    });
  });
  return map;
}

export function getNavigationForRole(
  _role?: string,
  _flags?: { tickets?: boolean; traffic?: boolean },
): NavItem[] {
  return cosNavigationItems;
}
