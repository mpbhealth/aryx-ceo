/**
 * Security Audit Service
 * 
 * Centralized audit logging service for SOC 2 Type II and HIPAA compliance.
 * Provides tamper-evident logging with checksums and comprehensive event tracking.
 * 
 * Features:
 * - Security event logging with severity levels
 * - PHI access tracking
 * - Administrative action logging
 * - Tamper detection via SHA-256 checksums
 * - Batch logging support
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { shouldQueryCosTable } from './schema/cosPublicTables';

// ============================================
// Types
// ============================================

/**
 * Security event types for classification
 */
export type SecurityEventType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'SESSION_EXPIRED'
  | 'PASSWORD_CHANGE'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'PHI_VIEW'
  | 'PHI_EXPORT'
  | 'PHI_MODIFY'
  | 'PHI_DELETE'
  | 'DATA_EXPORT'
  | 'DATA_IMPORT'
  | 'ADMIN_ACTION'
  | 'ROLE_CHANGE'
  | 'USER_CREATE'
  | 'USER_DELETE'
  | 'USER_SUSPEND'
  | 'CONFIG_CHANGE'
  | 'SECURITY_ALERT'
  | 'ACCESS_DENIED'
  | 'RATE_LIMIT'
  | 'EMERGENCY_ACCESS'
  | 'KEY_ROTATION'
  | 'AUDIT_ACCESS';

/**
 * Severity levels for security events
 */
export type SecuritySeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * Resource types for audit tracking
 */
export type ResourceType =
  | 'user'
  | 'member'
  | 'phi_record'
  | 'compliance_document'
  | 'baa'
  | 'audit_log'
  | 'system_config'
  | 'role'
  | 'session'
  | 'file'
  | 'report'
  | 'api_key';

/**
 * Security audit log entry
 */
export interface SecurityAuditEntry {
  id?: string;
  event_type: SecurityEventType;
  severity: SecuritySeverity;
  actor_id?: string;
  actor_email?: string;
  actor_ip?: string;
  actor_user_agent?: string;
  resource_type?: ResourceType;
  resource_id?: string;
  action: string;
  details?: Record<string, unknown>;
  checksum?: string;
  created_at?: string;
}

/**
 * Options for querying audit logs
 */
export interface AuditLogQueryOptions {
  eventTypes?: SecurityEventType[];
  severities?: SecuritySeverity[];
  actorId?: string;
  resourceType?: ResourceType;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

// ============================================
// Checksum Generation
// ============================================

/**
 * Generate SHA-256 checksum for tamper detection
 */
async function generateChecksum(data: Record<string, unknown>): Promise<string> {
  const encoder = new TextEncoder();
  const dataString = JSON.stringify(data, Object.keys(data).sort());
  const dataBuffer = encoder.encode(dataString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify audit log entry integrity
 */
export async function verifyAuditEntryIntegrity(entry: SecurityAuditEntry): Promise<boolean> {
  if (!entry.checksum) return false;

  const { checksum, id: _id, created_at: _created_at, ...dataToVerify } = entry;
  const calculatedChecksum = await generateChecksum(dataToVerify);
  return calculatedChecksum === checksum;
}

// ============================================
// Client Info Helpers
// ============================================

/**
 * Get client IP address (best effort in browser context)
 */
function getClientIP(): string {
  // In browser context, we can't reliably get IP
  // This will be captured by the Edge Function
  return 'client';
}

/**
 * Get client user agent
 */
function getUserAgent(): string {
  return typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
}

// ============================================
// Audit Logging Functions
// ============================================

/**
 * Log a security event to the audit log
 */
export async function logSecurityEvent(
  eventType: SecurityEventType,
  action: string,
  options: {
    severity?: SecuritySeverity;
    resourceType?: ResourceType;
    resourceId?: string;
    details?: Record<string, unknown>;
    actorId?: string;
    actorEmail?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    console.warn('[Audit] Supabase not configured, audit log not persisted');
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    const expiresAtMs = session?.expires_at ? session.expires_at * 1000 : 0;
    if (!accessToken || (expiresAtMs > 0 && expiresAtMs <= Date.now())) {
      return { success: false, error: 'no_session' };
    }

    let actorId = options.actorId || session.user?.id;
    let actorEmail = options.actorEmail || session.user?.email;

    // Determine severity based on event type if not provided
    const severity = options.severity || getSeverityForEventType(eventType);

    // Create audit entry (without checksum first)
    const entryData: Omit<SecurityAuditEntry, 'id' | 'checksum' | 'created_at'> = {
      event_type: eventType,
      severity,
      actor_id: actorId,
      actor_email: actorEmail,
      actor_ip: getClientIP(),
      actor_user_agent: getUserAgent(),
      resource_type: options.resourceType,
      resource_id: options.resourceId,
      action,
      details: options.details,
    };

    const checksum = await generateChecksum(entryData);

    if (!shouldQueryCosTable('audit_events')) {
      return { success: false, error: 'audit_events unavailable' };
    }

    const { data: orgId } = await supabase.rpc('current_org_id');
    if (!orgId || !actorId) {
      return { success: false, error: 'no_active_org' };
    }

    const { error } = await supabase
      .from('audit_events')
      .insert({
        org_id: orgId,
        actor_id: actorId,
        action: eventType,
        entity: options.resourceType ?? 'session',
        entity_id: options.resourceId ?? null,
        metadata: {
          action,
          severity,
          details: options.details ?? {},
          checksum,
          actor_email: actorEmail ?? null,
        },
      });

    if (error) {
      console.warn('[Audit] Failed to log security event:', error.message);
      return { success: false, error: error.message };
    }

    // Log critical events to console for immediate visibility
    if (severity === 'CRITICAL') {
      console.warn(`[SECURITY CRITICAL] ${eventType}: ${action}`, options.details);
    }

    return { success: true };
  } catch (error) {
    console.warn('[Audit] Error logging security event:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get default severity for event type
 */
function getSeverityForEventType(eventType: SecurityEventType): SecuritySeverity {
  const criticalEvents: SecurityEventType[] = [
    'LOGIN_FAILED',
    'ACCESS_DENIED',
    'RATE_LIMIT',
    'SECURITY_ALERT',
    'PHI_DELETE',
    'EMERGENCY_ACCESS',
  ];
  
  const warningEvents: SecurityEventType[] = [
    'PHI_EXPORT',
    'DATA_EXPORT',
    'ROLE_CHANGE',
    'USER_DELETE',
    'USER_SUSPEND',
    'CONFIG_CHANGE',
    'KEY_ROTATION',
  ];
  
  if (criticalEvents.includes(eventType)) return 'CRITICAL';
  if (warningEvents.includes(eventType)) return 'WARNING';
  return 'INFO';
}

// ============================================
// Convenience Logging Functions
// ============================================

/**
 * Log a successful login
 */
export async function logLogin(userId: string, email: string, method: string = 'password') {
  return logSecurityEvent('LOGIN', `User logged in via ${method}`, {
    actorId: userId,
    actorEmail: email,
    resourceType: 'session',
    details: { method },
  });
}

/**
 * Log a failed login attempt
 */
export async function logLoginFailed(email: string, reason: string) {
  return logSecurityEvent('LOGIN_FAILED', `Login attempt failed: ${reason}`, {
    actorEmail: email,
    severity: 'CRITICAL',
    details: { email, reason },
  });
}

/**
 * Log a logout
 */
export async function logLogout(userId: string, email: string, reason: string = 'user_initiated') {
  return logSecurityEvent('LOGOUT', `User logged out: ${reason}`, {
    actorId: userId,
    actorEmail: email,
    resourceType: 'session',
    details: { reason },
  });
}

/**
 * Log PHI access
 */
export async function logPHIAccess(
  action: 'VIEW' | 'EXPORT' | 'MODIFY' | 'DELETE',
  resourceId: string,
  details: {
    recordType?: string;
    fieldAccessed?: string[];
    purpose?: string;
    patientId?: string;
  }
) {
  const eventType: SecurityEventType = `PHI_${action}` as SecurityEventType;
  return logSecurityEvent(eventType, `PHI ${action.toLowerCase()}: ${details.recordType || 'record'}`, {
    resourceType: 'phi_record',
    resourceId,
    details,
  });
}

/**
 * Log data export
 */
export async function logDataExport(
  resourceType: ResourceType,
  recordCount: number,
  format: string,
  details?: Record<string, unknown>
) {
  return logSecurityEvent('DATA_EXPORT', `Exported ${recordCount} ${resourceType} records as ${format}`, {
    resourceType,
    severity: recordCount > 100 ? 'WARNING' : 'INFO',
    details: { recordCount, format, ...details },
  });
}

/**
 * Log administrative action
 */
export async function logAdminAction(
  action: string,
  resourceType: ResourceType,
  resourceId: string,
  details?: Record<string, unknown>
) {
  return logSecurityEvent('ADMIN_ACTION', action, {
    resourceType,
    resourceId,
    severity: 'WARNING',
    details,
  });
}

/**
 * Log role change
 */
export async function logRoleChange(
  targetUserId: string,
  targetEmail: string,
  oldRole: string,
  newRole: string
) {
  return logSecurityEvent('ROLE_CHANGE', `Role changed from ${oldRole} to ${newRole}`, {
    resourceType: 'user',
    resourceId: targetUserId,
    severity: 'WARNING',
    details: { targetEmail, oldRole, newRole },
  });
}

/**
 * Log access denied
 */
export async function logAccessDenied(
  resource: string,
  reason: string,
  details?: Record<string, unknown>
) {
  return logSecurityEvent('ACCESS_DENIED', `Access denied to ${resource}: ${reason}`, {
    severity: 'CRITICAL',
    details: { resource, reason, ...details },
  });
}

/**
 * Log security alert
 */
export async function logSecurityAlert(
  alertType: string,
  message: string,
  details?: Record<string, unknown>
) {
  return logSecurityEvent('SECURITY_ALERT', `${alertType}: ${message}`, {
    severity: 'CRITICAL',
    details: { alertType, ...details },
  });
}

/**
 * Log emergency access (break-glass)
 */
export async function logEmergencyAccess(
  reason: string,
  resourceId: string,
  details?: Record<string, unknown>
) {
  return logSecurityEvent('EMERGENCY_ACCESS', `Emergency access invoked: ${reason}`, {
    resourceType: 'phi_record',
    resourceId,
    severity: 'CRITICAL',
    details: { reason, ...details },
  });
}

// ============================================
// Query Functions
// ============================================

/**
 * Query audit logs with filters
 */
export async function queryAuditLogs(options: AuditLogQueryOptions = {}): Promise<{
  data: SecurityAuditEntry[];
  count: number;
  error?: string;
}> {
  if (!isSupabaseConfigured || !shouldQueryCosTable('security_audit_log')) {
    return { data: [], count: 0 };
  }

  try {
    let query = supabase
      .from('security_audit_log')
      .select('*', { count: 'exact' });

    // Apply filters
    if (options.eventTypes?.length) {
      query = query.in('event_type', options.eventTypes);
    }
    if (options.severities?.length) {
      query = query.in('severity', options.severities);
    }
    if (options.actorId) {
      query = query.eq('actor_id', options.actorId);
    }
    if (options.resourceType) {
      query = query.eq('resource_type', options.resourceType);
    }
    if (options.resourceId) {
      query = query.eq('resource_id', options.resourceId);
    }
    if (options.startDate) {
      query = query.gte('created_at', options.startDate);
    }
    if (options.endDate) {
      query = query.lte('created_at', options.endDate);
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(
        options.offset || 0,
        (options.offset || 0) + (options.limit || 50) - 1
      );

    const { data, count, error } = await query;

    if (error) {
      console.error('[Audit] Failed to query audit logs:', error);
      return { data: [], count: 0, error: error.message };
    }

    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error('[Audit] Error querying audit logs:', error);
    return { data: [], count: 0, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get recent critical security events
 */
export async function getRecentCriticalEvents(limit: number = 10): Promise<SecurityAuditEntry[]> {
  const result = await queryAuditLogs({
    severities: ['CRITICAL'],
    limit,
  });
  return result.data;
}

/**
 * Get user activity log
 */
export async function getUserActivityLog(userId: string, limit: number = 50): Promise<SecurityAuditEntry[]> {
  const result = await queryAuditLogs({
    actorId: userId,
    limit,
  });
  return result.data;
}

/**
 * Get PHI access log for a specific record
 */
export async function getPHIAccessLog(resourceId: string, limit: number = 50): Promise<SecurityAuditEntry[]> {
  const result = await queryAuditLogs({
    eventTypes: ['PHI_VIEW', 'PHI_EXPORT', 'PHI_MODIFY', 'PHI_DELETE'],
    resourceId,
    limit,
  });
  return result.data;
}

// ============================================
// Statistics Functions
// ============================================

/**
 * Get audit log statistics for dashboard
 */
export async function getAuditStatistics(days: number = 30): Promise<{
  totalEvents: number;
  criticalEvents: number;
  warningEvents: number;
  loginAttempts: number;
  failedLogins: number;
  phiAccesses: number;
  dataExports: number;
}> {
  if (!isSupabaseConfigured || !shouldQueryCosTable('security_audit_log')) {
    return {
      totalEvents: 0,
      criticalEvents: 0,
      warningEvents: 0,
      loginAttempts: 0,
      failedLogins: 0,
      phiAccesses: 0,
      dataExports: 0,
    };
  }

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString();

  try {
    // Get counts for different categories
    const [total, critical, warning, logins, failedLogins, phi, exports] = await Promise.all([
      supabase.from('security_audit_log').select('id', { count: 'exact', head: true })
        .gte('created_at', startDateStr),
      supabase.from('security_audit_log').select('id', { count: 'exact', head: true })
        .eq('severity', 'CRITICAL').gte('created_at', startDateStr),
      supabase.from('security_audit_log').select('id', { count: 'exact', head: true })
        .eq('severity', 'WARNING').gte('created_at', startDateStr),
      supabase.from('security_audit_log').select('id', { count: 'exact', head: true })
        .eq('event_type', 'LOGIN').gte('created_at', startDateStr),
      supabase.from('security_audit_log').select('id', { count: 'exact', head: true })
        .eq('event_type', 'LOGIN_FAILED').gte('created_at', startDateStr),
      supabase.from('security_audit_log').select('id', { count: 'exact', head: true })
        .in('event_type', ['PHI_VIEW', 'PHI_EXPORT', 'PHI_MODIFY', 'PHI_DELETE']).gte('created_at', startDateStr),
      supabase.from('security_audit_log').select('id', { count: 'exact', head: true })
        .eq('event_type', 'DATA_EXPORT').gte('created_at', startDateStr),
    ]);

    return {
      totalEvents: total.count || 0,
      criticalEvents: critical.count || 0,
      warningEvents: warning.count || 0,
      loginAttempts: logins.count || 0,
      failedLogins: failedLogins.count || 0,
      phiAccesses: phi.count || 0,
      dataExports: exports.count || 0,
    };
  } catch (error) {
    console.error('[Audit] Error getting audit statistics:', error);
    return {
      totalEvents: 0,
      criticalEvents: 0,
      warningEvents: 0,
      loginAttempts: 0,
      failedLogins: 0,
      phiAccesses: 0,
      dataExports: 0,
    };
  }
}
