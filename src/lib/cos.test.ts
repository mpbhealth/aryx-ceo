import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ARYX_CRM_HREF, crmRecordHref } from './cos';

describe('crmRecordHref', () => {
  it('opens leads and contacts on the live CRM host, not crm.aryx.com', () => {
    expect(ARYX_CRM_HREF).toBe('https://crm.aryx.pro');
    expect(crmRecordHref('lead', 'eda57834-d158-42a4-91ca-a928d5097fcb')).toBe(
      'https://crm.aryx.pro/leads/eda57834-d158-42a4-91ca-a928d5097fcb',
    );
    expect(crmRecordHref('contact', 'eda57834-d158-42a4-91ca-a928d5097fcb')).toBe(
      'https://crm.aryx.pro/contacts/eda57834-d158-42a4-91ca-a928d5097fcb',
    );
  });

  it('pins tenant hosts from the CRM org slug', () => {
    expect(crmRecordHref('lead', 'lead-1', 'mpb')).toBe('https://mpb.crm.aryx.pro/leads/lead-1');
    expect(crmRecordHref('contact', 'c-1', 'HSA')).toBe('https://hsa.crm.aryx.pro/contacts/c-1');
    expect(crmRecordHref('lead', 'lead-1', 'not a slug')).toBe('https://crm.aryx.pro/leads/lead-1');
  });

  it('keeps crm-proxy on the same live host', () => {
    const src = readFileSync(resolve(process.cwd(), 'supabase/functions/crm-proxy/index.ts'), 'utf8');
    expect(src).toContain("?? 'https://crm.aryx.pro'");
    expect(src).toContain(".replace('https://crm.aryx.com', 'https://crm.aryx.pro')");
    expect(src).toContain('organizations?id=eq.');
  });
});
