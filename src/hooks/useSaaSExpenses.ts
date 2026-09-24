import { useCallback, useEffect, useState } from 'react';
import type { Tables } from '../types/database';
import { supabase } from '../lib/supabase';
import { useOrg } from '../contexts/OrgContext';

/**
 * A row of `saas_expenses`, exactly as the table stores it:
 * id, org_id, vendor_id, name, amount, currency, cadence, renewal_date, owner, notes,
 * created_at, updated_at. Nothing else. The table has no `department`, `application`,
 * `cost_monthly`, `cost_annual`, `platform`, `url` or `source_sheet` column, whatever
 * older code here implies — PostgREST answers 42703 "column does not exist" for each.
 */
export type SaaSExpenseRow = Tables<'saas_expenses'>;

/**
 * What the page renders. This is a VIEW MODEL, not a row.
 *
 * The table stores one figure — `amount` — against a `cadence`. A monthly and an annual
 * cost are *derived* from that pair and exist in no column, so a value of this type can
 * never come back from a select and must never be handed to an insert. Typing the mapper
 * output as `SaaSExpenseRow` was the original defect: it told the compiler that whatever
 * the mapper invented was a column, which is how `department`, `application`, `platform`
 * and `url` survived in the page for as long as they did.
 */
export interface SaaSExpenseView extends SaaSExpenseRow {
  cost_monthly: number;
  cost_annual: number;
}

/**
 * What a caller may write: the subset of real columns this page owns. Derived from the
 * schema with Pick, so regenerating types is what catches a column being renamed.
 * `org_id` is not here — the hook supplies it from the active org, never the caller.
 */
export type SaaSExpenseInput = Partial<
  Pick<SaaSExpenseRow, 'name' | 'amount' | 'cadence' | 'renewal_date' | 'owner' | 'notes'>
>;

interface SaaSMetrics {
  totalMonthly: number;
  totalAnnual: number;
  totalTools: number;
  totalOwners: number;
  renewingNext30Days: number;
}

/** The monthly equivalent of one row's amount, normalised across billing cadences. */
export function monthlyFromRow(row: Pick<SaaSExpenseRow, 'amount' | 'cadence'>): number {
  const amount = Number(row.amount ?? 0);
  switch ((row.cadence ?? 'monthly').toLowerCase()) {
    case 'annual':
    case 'yearly':
      return amount / 12;
    case 'quarterly':
      return amount / 3;
    default:
      return amount;
  }
}

/** Widen a stored row into the view model the page reads. */
export function toView(row: SaaSExpenseRow): SaaSExpenseView {
  const monthly = monthlyFromRow(row);
  return { ...row, cost_monthly: monthly, cost_annual: monthly * 12 };
}

export function useSaaSExpenses() {
  const { orgId } = useOrg();
  const [data, setData] = useState<SaaSExpenseView[]>([]);
  const [metrics, setMetrics] = useState<SaaSMetrics>({
    totalMonthly: 0,
    totalAnnual: 0,
    totalTools: 0,
    totalOwners: 0,
    renewingNext30Days: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!orgId) {
      setData([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data: expenses, error: expensesError } = await supabase
        .from('saas_expenses')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });
      if (expensesError) throw expensesError;
      const expenseData = (expenses ?? []).map(toView);
      setData(expenseData);
      const totalMonthly = expenseData.reduce((sum, row) => sum + row.cost_monthly, 0);
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      setMetrics({
        totalMonthly,
        totalAnnual: totalMonthly * 12,
        totalTools: expenseData.length,
        totalOwners: new Set(expenseData.map((row) => row.owner).filter(Boolean)).size,
        renewingNext30Days: expenseData.filter((row) => {
          if (!row.renewal_date) return false;
          const renewalDate = new Date(row.renewal_date);
          return renewalDate >= now && renewalDate <= thirtyDaysFromNow;
        }).length,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch SaaS expenses');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addExpense = async (expense: SaaSExpenseInput) => {
    try {
      if (!orgId) throw new Error('No active organization');
      const { error: insertError } = await supabase.from('saas_expenses').insert({
        org_id: orgId,
        name: expense.name || 'Untitled',
        amount: expense.amount ?? null,
        cadence: expense.cadence || 'monthly',
        renewal_date: expense.renewal_date || null,
        owner: expense.owner || null,
        notes: expense.notes || null,
      });
      if (insertError) throw insertError;
      await fetchData();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add expense' };
    }
  };

  const updateExpense = async (id: string, updates: SaaSExpenseInput) => {
    try {
      // Only the keys the caller actually supplied are sent, so a partial edit cannot
      // blank a column it never touched.
      const payload: SaaSExpenseInput = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.amount !== undefined) payload.amount = updates.amount;
      if (updates.cadence !== undefined) payload.cadence = updates.cadence;
      if (updates.renewal_date !== undefined) payload.renewal_date = updates.renewal_date || null;
      if (updates.owner !== undefined) payload.owner = updates.owner || null;
      if (updates.notes !== undefined) payload.notes = updates.notes || null;
      const { error: updateError } = await supabase.from('saas_expenses').update(payload).eq('id', id);
      if (updateError) throw updateError;
      await fetchData();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update expense' };
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error: deleteError } = await supabase.from('saas_expenses').delete().eq('id', id);
      if (deleteError) throw deleteError;
      await fetchData();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete expense' };
    }
  };

  const bulkImport = async (expenses: SaaSExpenseInput[]) => {
    for (const expense of expenses) {
      const result = await addExpense(expense);
      if (!result.success) return result;
    }
    return { success: true };
  };

  return { data, metrics, loading, error, refetch: fetchData, addExpense, updateExpense, deleteExpense, bulkImport };
}
