import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { compactNumber } from '@/lib/cos';
import { useOrg } from '@/contexts/OrgContext';
import { CommandStat, CommandStrip } from '../cos/CommandStrip';
import { CosPage, CosPageHero } from '../cos/CosPage';

function monthlyAmount(row: { amount?: number | null; cadence?: string | null }): number {
  const amount = Number(row.amount || 0);
  const cadence = (row.cadence || 'monthly').toLowerCase();
  if (cadence === 'annual' || cadence === 'yearly') return amount / 12;
  if (cadence === 'quarterly') return amount / 3;
  return amount;
}

export function CosDevelopment() {
  const { orgId, linked } = useOrg();

  const projects = useQuery({
    queryKey: ['dev-projects', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('id, name, status, progress, target_date').eq('org_id', orgId);
      if (error) throw error;
      return data || [];
    },
  });

  const tasks = useQuery({
    queryKey: ['dev-tasks', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('id, title, status, due_at, project_id').eq('org_id', orgId);
      if (error) throw error;
      return data || [];
    },
  });

  const staff = useQuery({
    queryKey: ['dev-staff', orgId],
    enabled: Boolean(orgId),
    queryFn: async () => {
      const [{ data: people, error: peopleError }, { data: depts, error: deptError }, { data: expenses, error: spendError }] = await Promise.all([
        supabase.from('employee_profiles').select('id, first_name, last_name, title, employment_status').eq('org_id', orgId),
        supabase.from('departments').select('id, name, is_active, headcount').eq('org_id', orgId),
        supabase.from('saas_expenses').select('amount, cadence').eq('org_id', orgId),
      ]);
      if (peopleError) throw peopleError;
      if (deptError) throw deptError;
      if (spendError) throw spendError;
      return { people: people || [], depts: depts || [], expenses: expenses || [] };
    },
  });

  const tickets = useQuery({
    queryKey: ['dev-tickets', orgId],
    enabled: Boolean(orgId) && linked.tickets,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fact_tickets_daily')
        .select('fact_date, created_count, open_count, resolved_count, sla_pct')
        .eq('org_id', orgId)
        .order('fact_date', { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] || null;
    },
  });

  const summary = useMemo(() => {
    const list = projects.data || [];
    const openish = list.filter((row) => !['live', 'done', 'complete', 'completed', 'cancelled'].includes((row.status || '').toLowerCase()));
    const live = list.filter((row) => ['live', 'done', 'complete', 'completed'].includes((row.status || '').toLowerCase()));
    const taskList = tasks.data || [];
    const openTasks = taskList.filter((row) => row.status !== 'done' && row.status !== 'cancelled');
    const monthly = (staff.data?.expenses || []).reduce((sum, row) => sum + monthlyAmount(row), 0);
    return {
      projects: list.length,
      active: openish.length,
      shipped: live.length,
      openTasks: openTasks.length,
      staff: staff.data?.people.length || 0,
      departments: staff.data?.depts.filter((row) => row.is_active !== false).length || 0,
      saas: monthly,
    };
  }, [projects.data, tasks.data, staff.data]);

  return (
    <CosPage>
      <CosPageHero
        eyebrow="Development"
        title="Build health."
        lede="Projects, assignments, staff, and spend for this company. No invented KPIs."
      />

      <div className="space-y-6">
        <CommandStrip title="Delivery" href="/development/projects">
          <CommandStat label="Projects" value={compactNumber(summary.projects)} />
          <CommandStat label="In flight" value={compactNumber(summary.active)} />
          <CommandStat label="Shipped" value={compactNumber(summary.shipped)} />
        </CommandStrip>
        <CommandStrip title="Assignments" href="/development/assignments">
          <CommandStat label="Open tasks" value={compactNumber(summary.openTasks)} hint="From company tasks" />
          <CommandStat label="Staff" value={compactNumber(summary.staff)} hint="Organization roster" />
          <CommandStat label="Departments" value={compactNumber(summary.departments)} />
        </CommandStrip>
        <CommandStrip title="Run cost" href="/operations/saas-spend">
          <CommandStat label="SaaS / mo" value={`$${Math.round(summary.saas).toLocaleString()}`} />
          <CommandStat
            label="Support open"
            value={linked.tickets ? compactNumber(tickets.data?.open_count) : '—'}
            hint={linked.tickets ? 'Latest ticket day' : 'Tickets stay hidden until scoped'}
          />
          <CommandStat label="SLA" value={tickets.data?.sla_pct == null ? '—' : `${tickets.data.sla_pct}%`} />
        </CommandStrip>
      </div>

      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link to="/development/tech-stack" className="rounded-full border border-aryx-line px-4 py-2">Tech stack</Link>
        <Link to="/files" className="rounded-full border border-aryx-line px-4 py-2">Files</Link>
        <Link to="/operations/organization" className="rounded-full border border-aryx-line px-4 py-2">Organization</Link>
      </div>
    </CosPage>
  );
}

export default CosDevelopment;
