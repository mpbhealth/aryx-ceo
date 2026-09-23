import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { shouldQueryCosTable } from '../lib/schema/cosPublicTables';
import type { Tables } from '../types/database';

interface UseSupabaseTableOptions<_T> {
  table: string;
  select?: string;
  orderBy?: string;
  orderAscending?: boolean;
  filters?: Record<string, unknown>;
  enabled?: boolean;
}

interface UseSupabaseTableResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Generic hook for fetching data from a Supabase table.
 * Consolidates the common pattern used across multiple hooks.
 * 
 * @example
 * const { data, loading, error, refetch } = useSupabaseTable<MyType>({
 *   table: 'my_table',
 *   orderBy: 'created_at',
 *   orderAscending: false,
 * });
 */
export function useSupabaseTable<T = Record<string, unknown>>({
  table,
  select = '*',
  orderBy = 'created_at',
  orderAscending = false,
  filters = {},
  enabled = true,
}: UseSupabaseTableOptions<T>): UseSupabaseTableResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled || !shouldQueryCosTable(table)) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase.from(table).select(select);

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      // Apply ordering
      if (orderBy) {
        query = query.order(orderBy, { ascending: orderAscending });
      }

      const { data: result, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setData((result as T[]) || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred fetching data';
      setError(message);
      setData([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, orderBy, orderAscending, JSON.stringify(filters), enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Pre-configured hooks for common tables (backward compatibility).
//
// Each of these must pass its row type. Without the type argument `T` falls back to
// `Record<string, unknown>`, every column reads as `unknown`, and each consuming page
// then fails on `{row.name}` with "Type 'unknown' is not assignable to type 'ReactNode'".
// That single omission accounted for ~99 of the 337 type errors in this repo.
//
// `Tables<'x'>` comes from the generated schema in src/types/database.ts, so these stay
// correct when the schema is regenerated.
export const useTeamMembers = () =>
  useSupabaseTable<Tables<'team_members'>>({ table: 'team_members', orderBy: 'name', orderAscending: true });
export const useProjects = () =>
  useSupabaseTable<Tables<'projects'>>({ table: 'projects' });
export const useRoadmapItems = () =>
  useSupabaseTable<Tables<'roadmap_items'>>({ table: 'roadmap_items' });
export const useTechStack = () =>
  useSupabaseTable<Tables<'tech_stack'>>({ table: 'tech_stack', orderBy: 'name', orderAscending: true });
export const useDeploymentLogs = () =>
  useSupabaseTable<Tables<'deployment_logs'>>({ table: 'deployment_logs', orderBy: 'timestamp' });

// These four tables are not in the generated schema, so they stay `Record<string, unknown>`
// and their consumers keep casting. Regenerate database.ts to type them the same way.
export const useKPIs = () => useSupabaseTable({ table: 'kpis' });
export const useAIAgents = () => useSupabaseTable({ table: 'ai_agents', orderBy: 'name', orderAscending: true });

// Analytics hooks
export const useEnrollments = () => useSupabaseTable({ table: 'member_enrollments', orderBy: 'created_at' });
export const useMemberStatus = () => useSupabaseTable({ table: 'member_status_updates', orderBy: 'update_date' });

