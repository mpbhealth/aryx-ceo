import { describe, expect, it } from 'vitest';
import {
  categories,
  collectNavPaths,
  cosNavigationItems,
  findNavMatch,
  isNavPathActive,
} from './navigation';

describe('COS module navigation', () => {
  it('gives enrollment, advisors, marketing, CRM, finance, and support their own sections', () => {
    const byCategory = new Map<string, string[]>();
    for (const item of cosNavigationItems) {
      const list = byCategory.get(item.category) || [];
      list.push(item.id);
      byCategory.set(item.category, list);
    }
    expect(categories.enrollment).toBe('Enrollment');
    expect(categories.advisors).toBe('Advisors');
    expect(categories.marketing).toBe('Marketing');
    expect(categories.crm).toBe('CRM');
    expect(categories.finance).toBe('Finance');
    expect(categories.support).toBe('Support');
    expect(byCategory.get('enrollment')).toEqual(['enrollments']);
    expect(byCategory.get('advisors')).toEqual(['advisors']);
    expect(byCategory.get('marketing')).toEqual(['marketing']);
    expect(byCategory.get('crm')).toEqual(['crm-records', 'pipeline']);
    expect(byCategory.get('finance')).toEqual(['finance-pnl', 'finance-cash', 'finance-vendors', 'finance-forecast']);
    expect(byCategory.get('support')).toEqual(['tickets', 'ticket-analytics']);
  });

  it('does not dump engines into a single Analytics item', () => {
    expect(cosNavigationItems.some((item) => item.id === 'analytics')).toBe(false);
    expect(cosNavigationItems.find((item) => item.path === '/marketing')?.category).toBe('marketing');
    expect(cosNavigationItems.find((item) => item.path === '/enrollments')?.category).toBe('enrollment');
  });

  it('keeps prefix matches from lighting a shorter sibling', () => {
    const paths = collectNavPaths(cosNavigationItems);
    expect(isNavPathActive('/finance/vendors', '/finance', paths)).toBe(false);
    expect(isNavPathActive('/finance/vendors', '/finance/vendors', paths)).toBe(true);
    expect(isNavPathActive('/crm/lead/abc', '/crm', paths)).toBe(true);
    expect(isNavPathActive('/tickets/analytics', '/tickets', paths)).toBe(false);
    expect(isNavPathActive('/tickets/analytics', '/tickets/analytics', paths)).toBe(true);
  });

  it('resolves breadcrumbs to the module page, not a leftover analytics parent', () => {
    expect(findNavMatch('/marketing').parent?.id).toBe('marketing');
    expect(findNavMatch('/pipeline').parent?.id).toBe('pipeline');
    expect(findNavMatch('/development/projects').child?.id).toBe('projects');
  });
});
