import { findNavMatch } from '@/config/navigation';

type PageCopy = { sentence: string; href: string; label: string; can: string[] };

const PAGE_COPY: Record<string, PageCopy> = {
  '/home': {
    sentence: 'Command. Live warehouse facts for the active org — members, payables, books, and risk.',
    href: '/home',
    label: 'Open Command',
    can: [
      'Switch org and MTD / QTD / YTD. Orbit uses that same period.',
      'Read payables, books, billing risk, tickets, and traffic when the source is linked.',
      'Refresh sources if you are an operator. I will not invent zeros for unlinked sources.',
    ],
  },
  '/command': {
    sentence: 'Command. Live warehouse facts for the active org — members, payables, books, and risk.',
    href: '/home',
    label: 'Open Command',
    can: [
      'Switch org and MTD / QTD / YTD. Orbit uses that same period.',
      'Read payables, books, billing risk, tickets, and traffic when the source is linked.',
      'Refresh sources if you are an operator. I will not invent zeros for unlinked sources.',
    ],
  },
  '/finance': {
    sentence: 'P&L. EnrollFlow collected, vendor cost, commissions, and net operating for the desk period.',
    href: '/finance',
    label: 'Open P&L',
    can: [
      'Change the desk period. Grain follows MTD / QTD / YTD unless you pick another grain. Orbit uses that same grain here.',
      'Read collected and NOI from fact_pnl_period. Export CSV if you are an operator.',
    ],
  },
  '/finance/vendors': {
    sentence: 'Vendors. Carrier cost rows and unmatched enrollments from the warehouse.',
    href: '/finance/vendors',
    label: 'Open Vendors',
    can: ['Read unmatched carrier cost rows. Fix matches in EnrollFlow, not here.'],
  },
  '/finance/forecast': {
    sentence: 'Forecasts. Trailing run-rate and CRM weighted pipeline — not collected revenue.',
    href: '/finance/forecast',
    label: 'Open Forecasts',
    can: ['Read the computed 90-day net. Save a run only after an operator confirm.'],
  },
  '/tickets': {
    sentence: 'Support queue. Open tickets, SLA, and breaches from ITSTS warehouse facts.',
    href: '/tickets',
    label: 'Open Queue',
    can: ['Read open / SLA / breached facts. Work the ticket in ITSTS. I do not write the queue.'],
  },
  '/tickets/analytics': {
    sentence: 'Ticket analytics. Mix and volume from ITSTS facts for the active org.',
    href: '/tickets/analytics',
    label: 'Open Analytics',
    can: ['Read mix and volume. The queue itself stays on /tickets.'],
  },
  '/advisors': {
    sentence: 'Advisor books. Scorecards, MRR, and retention from AdvisorIQ.',
    href: '/advisors',
    label: 'Open Books',
    can: ['Read scorecards and billing risk. Book changes stay in AdvisorIQ.'],
  },
  '/enrollments': {
    sentence: 'Members. New enrollments, inactivations, and AdvisorIQ movement for the desk period.',
    href: '/enrollments',
    label: 'Open Members',
    can: ['Read new vs inactive for the desk period. Enrollment writes stay in EnrollFlow.'],
  },
  '/pipeline': {
    sentence: 'Pipeline. Weighted if-closed amounts and aging — not collected revenue.',
    href: '/pipeline',
    label: 'Open Pipeline',
    can: ['Read weighted pipeline and aging >7d. Closed-won cash is EnrollFlow collected, not this page.'],
  },
  '/crm': {
    sentence: 'CRM records. Linked ARYX CRM rows for the active org.',
    href: '/crm',
    label: 'Open Records',
    can: ['Open a record. I do not create or update CRM rows.'],
  },
  '/marketing': {
    sentence: 'Traffic. MarketFlow / GA4 sessions and conversions when the source is linked.',
    href: '/marketing',
    label: 'Open Traffic',
    can: ['Read sessions and conversion for the desk period when traffic is linked.'],
  },
  '/inbox': {
    sentence: 'Inbox. Connected mailbox threads. I do not send mail.',
    href: '/inbox',
    label: 'Open Inbox',
    can: ['Read the connected mailbox. I will not send or draft mail.'],
  },
  '/organizer': {
    sentence: 'Organizer. Daily tasks on this desk.',
    href: '/organizer',
    label: 'Open Organizer',
    can: ['Work the daily list. I do not invent tasks from warehouse facts.'],
  },
  '/files': {
    sentence: 'Files. Documents stored for this organization.',
    href: '/files',
    label: 'Open Files',
    can: ['Open stored files for this org.'],
  },
  '/operations': {
    sentence: 'Company operations. Staff, SaaS, integrations, and policy.',
    href: '/operations',
    label: 'Open Company',
    can: ['Open staff, SaaS, integrations, or policy. Warehouse money still lives on Finance.'],
  },
  '/operations/integrations': {
    sentence: 'Integrations. Source link status and last sync. Refresh is operator-only.',
    href: '/operations/integrations',
    label: 'Open Integrations',
    can: ['Read source health. Refresh all sources only after an operator confirm.'],
  },
  '/development': {
    sentence: 'Build. Internal roadmap, projects, and stack — not warehouse P&L.',
    href: '/development',
    label: 'Open Build',
    can: ['Open roadmap, projects, or stack. I do not treat these as collected revenue.'],
  },
  '/settings': {
    sentence: 'Settings. Profile and desk preferences.',
    href: '/settings',
    label: 'Open Settings',
    can: ['Update desk preferences. Model keys for open chat live in agent-chat edge secrets.'],
  },
};

export function formatOrbitPageReply(pathname: string): { text: string; href?: string; label?: string } {
  const path = pathname.split('?')[0] || '/home';
  const exact = PAGE_COPY[path];
  if (exact) {
    return {
      text: formatPageCopy(exact),
      href: exact.href,
      label: exact.label,
    };
  }

  const match = findNavMatch(path);
  const href = match.child?.path || match.parent?.path;
  if (href && PAGE_COPY[href]) {
    const copy = PAGE_COPY[href];
    return {
      text: formatPageCopy(copy),
      href: copy.href,
      label: copy.label,
    };
  }
  if (match.parent) {
    const label = match.child?.label || match.parent.label;
    const dest = href || match.parent.path;
    return {
      text: `${label}. ${match.parent.label} on this desk.\n${dest}`,
      href: dest,
      label: `Open ${label}`,
    };
  }

  return {
    text: 'I do not have a desk map for this path. Ask about collected, billing risk, or support.',
  };
}

function formatPageCopy(copy: PageCopy): string {
  const steps = copy.can.map((line) => `• ${line}`).join('\n');
  return `${copy.sentence}\nYou can:\n${steps}`;
}

export function allowedOrbitHref(href: string): boolean {
  const path = href.split('?')[0];
  if (PAGE_COPY[path]) return true;
  const match = findNavMatch(path);
  return Boolean(match.parent);
}
