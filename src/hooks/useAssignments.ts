import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Assignment } from '../types/common';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';

type AssignmentStatus = Assignment['status'];

function fromTaskStatus(status: string | null | undefined): AssignmentStatus {
  if (status === 'in_progress') return 'in_progress';
  if (status === 'done') return 'completed';
  if (status === 'cancelled') return 'blocked';
  return 'pending';
}

function toTaskStatus(status: string | null | undefined): 'open' | 'in_progress' | 'done' | 'cancelled' {
  if (status === 'in_progress') return 'in_progress';
  if (status === 'completed' || status === 'done') return 'done';
  if (status === 'blocked' || status === 'cancelled') return 'cancelled';
  return 'open';
}

type AssignmentRow = Assignment & { employee_name?: string };

function mapTask(row: Record<string, unknown>, employeeName?: string): AssignmentRow {
  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: (row.body as string) || undefined,
    status: fromTaskStatus(row.status as string),
    priority: 'medium',
    assignee_id: (row.owner_user_id as string) || undefined,
    due_date: row.due_at ? String(row.due_at).slice(0, 10) : undefined,
    project_id: (row.project_id as string) || undefined,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
    employee_name: employeeName,
  };
}

interface MutationResult {
  success: boolean;
  error?: string;
  data?: Assignment;
}

export function useAssignments() {
  const { user } = useAuth();
  const { orgId } = useOrg();
  const [data, setData] = useState<AssignmentRow[]>([]);
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
      setError(null);
      const [{ data: rows, error: queryError }, { data: people }] = await Promise.all([
        supabase.from('tasks').select('*').eq('org_id', orgId).order('created_at', { ascending: false }),
        supabase.from('employee_profiles').select('user_id, first_name, last_name').eq('org_id', orgId),
      ]);
      if (queryError) throw queryError;
      const names = new Map(
        (people || [])
          .filter((row) => row.user_id)
          .map((row) => [String(row.user_id), `${row.first_name} ${row.last_name}`.trim()]),
      );
      setData((rows || []).map((row) => {
        const owner = row.owner_user_id ? names.get(String(row.owner_user_id)) : undefined;
        return mapTask(row as Record<string, unknown>, owner);
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assignments');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addAssignment = async (assignment: {
    title: string;
    description?: string;
    status?: string;
    due_date?: string;
    assignee_id?: string;
    project_id?: string;
  }): Promise<MutationResult> => {
    try {
      if (!orgId) throw new Error('No active organization');
      const { data: row, error: insertError } = await supabase
        .from('tasks')
        .insert({
          org_id: orgId,
          title: assignment.title,
          body: assignment.description || null,
          status: toTaskStatus(assignment.status || 'pending'),
          due_at: assignment.due_date || null,
          owner_user_id: assignment.assignee_id || user?.id || null,
          project_id: assignment.project_id || null,
        })
        .select('*')
        .single();
      if (insertError) throw insertError;
      await fetchData();
      return { success: true, data: row ? mapTask(row as Record<string, unknown>) : undefined };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to add assignment' };
    }
  };

  const updateAssignment = async (id: string, updates: Partial<Assignment>): Promise<MutationResult> => {
    try {
      const payload: Record<string, unknown> = {};
      if (updates.title !== undefined) payload.title = updates.title;
      if (updates.description !== undefined) payload.body = updates.description;
      if (updates.status !== undefined) payload.status = toTaskStatus(updates.status);
      if (updates.due_date !== undefined) payload.due_at = updates.due_date;
      if (updates.assignee_id !== undefined) payload.owner_user_id = updates.assignee_id;
      if (updates.project_id !== undefined) payload.project_id = updates.project_id;
      const { error: updateError } = await supabase.from('tasks').update(payload).eq('id', id);
      if (updateError) throw updateError;
      await fetchData();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to update assignment' };
    }
  };

  const deleteAssignment = async (id: string): Promise<MutationResult> => {
    try {
      const { error: deleteError } = await supabase.from('tasks').delete().eq('id', id);
      if (deleteError) throw deleteError;
      await fetchData();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to delete assignment' };
    }
  };

  return { data, loading, error, refetch: fetchData, addAssignment, updateAssignment, deleteAssignment };
}
