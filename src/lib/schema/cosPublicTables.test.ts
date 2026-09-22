import { describe, expect, it } from 'vitest';
import { shouldQueryCosTable } from './cosPublicTables';

describe('shouldQueryCosTable', () => {
  it('allows COS warehouse and identity tables', () => {
    expect(shouldQueryCosTable('projects')).toBe(true);
    expect(shouldQueryCosTable('roadmap_items')).toBe(true);
    expect(shouldQueryCosTable('audit_events')).toBe(true);
    expect(shouldQueryCosTable('analytics_snapshots')).toBe(true);
    expect(shouldQueryCosTable('departments')).toBe(true);
    expect(shouldQueryCosTable('employee_profiles')).toBe(true);
    expect(shouldQueryCosTable('policies')).toBe(true);
    expect(shouldQueryCosTable('deployment_logs')).toBe(true);
    expect(shouldQueryCosTable('files')).toBe(true);
    expect(shouldQueryCosTable('tasks')).toBe(true);
    expect(shouldQueryCosTable('fact_iq_mrr_monthly')).toBe(true);
    expect(shouldQueryCosTable('book_billing_risk')).toBe(true);
    expect(shouldQueryCosTable('book_actions')).toBe(true);
    expect(shouldQueryCosTable('fact_ticket_mix')).toBe(true);
    expect(shouldQueryCosTable('book_tickets')).toBe(true);
    expect(shouldQueryCosTable('fact_book_quality')).toBe(true);
    expect(shouldQueryCosTable('fact_enrollment_ops')).toBe(true);
    expect(shouldQueryCosTable('fact_agent_upline')).toBe(true);
    expect(shouldQueryCosTable('marketing_spend')).toBe(true);
  });

  it('blocks leftover MPB tables that 404 on COS', () => {
    for (const table of [
      'apps',
      'user_app_pins',
      'notifications',
      'notification_preferences',
      'security_audit_log',
      'kpis',
      'team_members',
      'department_metrics',
      'tickets_cache',
      'compliance_audits',
      'hipaa_policies',
      'policy_documents',
      'assignments',
      'workspaces',
    ]) {
      expect(shouldQueryCosTable(table)).toBe(false);
    }
  });
});
