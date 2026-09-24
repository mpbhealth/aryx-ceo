export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Assignment extends BaseEntity {
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string;
  due_date?: string;
  project_id?: string;
  tags?: string[];
}

export interface PolicyDocument extends BaseEntity {
  title: string;
  description?: string;
  category: string;
  status: 'draft' | 'in_review' | 'approved' | 'archived';
  version: string;
  owner?: string;
  last_reviewed?: string;
  next_review_date?: string;
  content?: string;
}

export interface EmployeeDocument extends BaseEntity {
  employee_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  uploaded_at: string;
  expiration_date?: string;
  notes?: string;
}

export interface DepartmentUpload extends BaseEntity {
  department: string;
  sub_department?: string;
  file_name: string;
  file_path: string;
  upload_type: string;
  uploaded_by?: string;
  processed: boolean;
  processed_at?: string;
  record_count?: number;
  data?: Record<string, unknown>;
}

export interface Note extends BaseEntity {
  title?: string;
  content: string;
  author_id: string;
  is_private: boolean;
  tags?: string[];
  department?: string;
  related_to?: string;
  shared_with?: string[];
}

export interface Ticket extends BaseEntity {
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  requester_id?: string;
  assignee_id?: string;
  resolved_at?: string;
}

export interface AuditLog extends BaseEntity {
  user_id: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export interface MarketingProperty extends BaseEntity {
  name: string;
  platform: string;
  url?: string;
  status: 'active' | 'inactive' | 'paused';
  monthly_budget?: number;
  tracking_code?: string;
  notes?: string;
}

export interface DepartmentNote extends BaseEntity {
  department: string;
  title: string;
  content: string;
  author_id: string;
  tags?: string[];
  is_pinned?: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface FilterOptions {
  search?: string;
  status?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  filePath?: string;
  error?: string;
}

export interface DataTransformResult<T = unknown> {
  success: boolean;
  data?: T[];
  errors?: string[];
  warnings?: string[];
  processedCount?: number;
}

export type Role = 'ceo' | 'cto' | 'admin' | 'manager' | 'user';

export type ViewMode = 'ceo' | 'cto' | 'shared';

export type DashboardSection =
  | 'overview'
  | 'analytics'
  | 'compliance'
  | 'operations'
  | 'development'
  | 'finance';

export interface UserProfile extends BaseEntity {
  email: string;
  full_name?: string;
  display_name?: string;
  role?: Role;
  org_id?: string;
  avatar_url?: string;
  preferences?: Record<string, unknown>;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  label?: string;
  color?: string;
}

export interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: string;
}
