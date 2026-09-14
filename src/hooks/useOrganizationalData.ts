import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { shouldQueryCosTable } from '../lib/schema/cosPublicTables';
import { useOrg } from '../contexts/OrgContext';

export interface Department {
  id: string;
  name: string;
  description?: string;
  code?: string;
  strategic_purpose?: string;
  parent_department_id?: string;
  department_lead_id?: string;
  budget?: number;
  budget_allocated?: number;
  headcount?: number;
  location?: string;
  contact_email?: string;
  mission_statement?: string;
  key_objectives?: string[];
  tech_stack?: string[];
  reporting_frequency?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeProfile {
  id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  name?: string;
  email: string;
  phone?: string;
  employee_id?: string;
  title: string;
  primary_department_id?: string;
  reports_to_id?: string;
  department?: string;
  position?: string;
  employment_status?: 'active' | 'inactive' | 'on_leave' | 'terminated';
  employment_type?: 'full_time' | 'part_time' | 'contract' | 'intern';
  location?: string;
  start_date?: string;
  hire_date?: string;
  skills?: string[];
  certifications?: string[];
  status?: string;
  created_at: string;
  updated_at: string;
}

export function useDepartments() {
  const { orgId } = useOrg();
  const [data, setData] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = useCallback(async () => {
    if (!shouldQueryCosTable('departments') || !orgId) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: departments, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('org_id', orgId)
        .order('name', { ascending: true });

      if (deptError) throw deptError;
      setData(departments || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const deleteDepartment = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      // Update local state
      setData(prev => prev.filter(d => d.id !== id));
      return { success: true };
    } catch (err) {
      console.error('Error deleting department:', err);
      throw err;
    }
  }, []);

  return { data, loading, error, refetch: fetchDepartments, deleteDepartment };
}

export function useEmployeeProfiles() {
  const { orgId } = useOrg();
  const [data, setData] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    if (!shouldQueryCosTable('employee_profiles') || !orgId) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: employees, error: empError } = await supabase
        .from('employee_profiles')
        .select('*')
        .eq('org_id', orgId)
        .order('last_name', { ascending: true });

      if (empError) throw empError;
      setData(employees || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const deleteEmployee = useCallback(async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('employee_profiles')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      // Update local state
      setData(prev => prev.filter(e => e.id !== id));
      return { success: true };
    } catch (err) {
      console.error('Error deleting employee:', err);
      throw err;
    }
  }, []);

  return { data, loading, error, refetch: fetchEmployees, deleteEmployee };
}

interface DepartmentMetric {
  id: string;
  department_id: string;
  metric_name: string;
  metric_value: number;
  created_at: string;
}

export function useDepartmentMetrics() {
  const [data, setData] = useState<DepartmentMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!shouldQueryCosTable('department_metrics')) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: metrics, error: metricsError } = await supabase
        .from('department_metrics')
        .select('*')
        .order('created_at', { ascending: false });

      if (metricsError) throw metricsError;
      setData(metrics || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { data, loading, error, refetch: fetchMetrics };
}

interface PolicyDocument {
  id: string;
  title: string;
  content?: string;
  document_type?: string;
  department_id?: string;
  version: string;
  status: string;
  file_url?: string;
  tags?: string[];
  review_date?: string;
  effective_date?: string;
  approved_by?: string;
  approved_at?: string;
  created_by?: string;
  compliance_status?: string;
  is_mandatory?: boolean;
  created_at: string;
  updated_at: string;
}

export function usePolicyDocuments() {
  const { orgId } = useOrg();
  const [data, setData] = useState<PolicyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!shouldQueryCosTable('policies') || !orgId) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: policies, error: policiesError } = await supabase
        .from('policies')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (policiesError) throw policiesError;
      setData((policies || []).map((row) => ({
        ...row,
        content: row.body || row.content || '',
        version: row.version || '1.0',
      })));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export interface DepartmentRelationship {
  id: string;
  parent_department_id: string;
  child_department_id: string;
  relationship_type: string;
  created_at: string;
}

export function useDepartmentRelationships() {
  const [data, setData] = useState<DepartmentRelationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRelationships = useCallback(async () => {
    if (!shouldQueryCosTable('department_relationships')) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: relationships, error: relError } = await supabase
        .from('department_relationships')
        .select('*')
        .order('created_at', { ascending: false });

      if (relError) throw relError;
      setData(relationships || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRelationships();
  }, [fetchRelationships]);

  return { data, loading, error, refetch: fetchRelationships };
}

export interface OrgChartPosition {
  id: string;
  department_id: string;
  x_position: number;
  y_position: number;
  layout_version: string;
  created_at: string;
  updated_at: string;
}

export function useOrgChartPositions() {
  const [data, setData] = useState<OrgChartPosition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    if (!shouldQueryCosTable('org_chart_positions')) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: positions, error: posError } = await supabase
        .from('org_chart_positions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (posError) throw posError;
      setData(positions || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const updatePosition = useCallback(async (departmentId: string, x: number, y: number) => {
    if (!shouldQueryCosTable('org_chart_positions')) {
      throw new Error('Org chart layout is not stored on this project.');
    }
    try {
      const { error: updateError } = await supabase
        .from('org_chart_positions')
        .upsert({
          department_id: departmentId,
          x_position: x,
          y_position: y,
          layout_version: 'v1',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'department_id'
        });

      if (updateError) throw updateError;

      setData(prev => {
        const existingIndex = prev.findIndex(p => p.department_id === departmentId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], x_position: x, y_position: y, updated_at: new Date().toISOString() };
          return updated;
        }
        return prev;
      });
    } catch (err) {
      console.error('Error updating position:', err);
      throw err;
    }
  }, []);

  const saveLayout = useCallback(async () => {
    if (!shouldQueryCosTable('org_chart_positions')) {
      throw new Error('Org chart layout is not stored on this project.');
    }
    try {
      const timestamp = new Date().toISOString();
      const updates = data.map(pos => ({
        ...pos,
        layout_version: `saved_${timestamp}`,
        updated_at: timestamp
      }));

      const { error: saveError } = await supabase
        .from('org_chart_positions')
        .upsert(updates);

      if (saveError) throw saveError;
    } catch (err) {
      console.error('Error saving layout:', err);
      throw err;
    }
  }, [data]);

  const resetLayout = useCallback(async () => {
    if (!shouldQueryCosTable('org_chart_positions')) {
      throw new Error('Org chart layout is not stored on this project.');
    }
    try {
      const { error: deleteError } = await supabase
        .from('org_chart_positions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (deleteError) throw deleteError;
      setData([]);
    } catch (err) {
      console.error('Error resetting layout:', err);
      throw err;
    }
  }, []);

  return { data, loading, error, refetch: fetchPositions, updatePosition, saveLayout, resetLayout };
}
