// ============================================
// NotificationCenter Component
// Dropdown panel showing notification list
// ============================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Check,
  CheckCheck,
  Bell,
  AlertTriangle,
  AlertOctagon,
  Shield,
  Clock,
  FolderKanban,
  UserPlus,
  XCircle,
  Settings,
  Trash2,
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import type { Notification, NotificationType, NotificationPriority } from '../../types/notifications';

interface NotificationCenterProps {
  onClose: () => void;
}

// Icon mapping for notification types
const typeIcons: Record<NotificationType, React.ElementType> = {
  system_incident: AlertTriangle,
  deployment_failed: XCircle,
  assignment: UserPlus,
  project_update: FolderKanban,
  compliance_alert: Shield,
  sla_breach: Clock,
  ticket_escalation: AlertOctagon,
  general: Bell,
};

// Priority styles
const priorityStyles: Record<NotificationPriority, { bg: string; border: string; icon: string }> = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-l-red-500',
    icon: 'text-red-600',
  },
  high: {
    bg: 'bg-orange-50',
    border: 'border-l-orange-500',
    icon: 'text-orange-600',
  },
  info: {
    bg: 'bg-aryx-elevated',
    border: 'border-l-aryx-accent',
    icon: 'text-aryx-accent',
  },
};

// Filter options
type FilterOption = 'all' | 'unread' | 'critical';

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    permissionStatus,
    requestPermission,
  } = useNotifications();

  const [filter, setFilter] = useState<FilterOption>('all');

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    switch (filter) {
      case 'unread':
        return notifications.filter((n) => !n.read_at);
      case 'critical':
        return notifications.filter((n) => n.priority === 'critical');
      default:
        return notifications;
    }
  }, [notifications, filter]);

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }

    // Navigate to relevant page
    if (notification.data?.url) {
      navigate(notification.data.url);
      onClose();
    }
  };

  // Handle dismiss
  const handleDismiss = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await dismissNotification(id);
  };

  // Handle mark as read
  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await markAsRead(id);
  };

  return (
    <div className="aryx-surface w-80 overflow-hidden rounded-xl border border-aryx-line bg-aryx-elevated text-aryx-ink shadow-2xl sm:w-96">
      {/* Header */}
      <div className="bg-aryx-void px-4 py-3 text-[#F4F1EA]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close notifications"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mt-3">
          {(['all', 'unread', 'critical'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`
                px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize
                ${filter === option
                  ? 'bg-aryx-accent text-white'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
                }
              `}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* Permission Banner */}
      {permissionStatus !== 'granted' && (
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center justify-between">
            <p className="text-xs text-amber-800">
              {permissionStatus === 'denied'
                ? 'Notifications blocked. Check browser settings.'
                : 'Enable notifications to stay updated'}
            </p>
            {permissionStatus === 'default' && (
              <button
                onClick={requestPermission}
                className="text-xs font-medium text-amber-700 hover:text-amber-900"
              >
                Enable
              </button>
            )}
          </div>
        </div>
      )}

      {/* Notification List */}
      <div className="max-h-[400px] overflow-y-auto">
        {filteredNotifications.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No notifications</p>
            <p className="text-xs text-gray-400 mt-1">
              {filter !== 'all' ? 'Try changing the filter' : "You're all caught up!"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => {
              const Icon = typeIcons[notification.type] || Bell;
              const styles = priorityStyles[notification.priority];
              const isUnread = !notification.read_at;

              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`
                    px-4 py-3 cursor-pointer transition-colors
                    hover:bg-gray-50 border-l-4
                    ${styles.bg} ${styles.border}
                    ${isUnread ? 'bg-opacity-100' : 'bg-opacity-50'}
                  `}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className={`flex-shrink-0 mt-0.5 ${styles.icon}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm ${
                            isUnread ? 'font-semibold text-gray-900' : 'text-gray-700'
                          }`}
                        >
                          {notification.title}
                        </p>
                        
                        {/* Unread indicator */}
                        {isUnread && (
                          <span className="flex-shrink-0 w-2 h-2 bg-indigo-600 rounded-full mt-1.5" />
                        )}
                      </div>

                      {notification.body && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                          {notification.body}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(notification.created_at)}
                        </span>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {isUnread && (
                            <button
                              onClick={(e) => handleMarkAsRead(e, notification.id)}
                              className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                              title="Mark as read"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDismiss(e, notification.id)}
                            className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                            title="Dismiss"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        )}
        <button
          onClick={() => {
            navigate('/settings');
            onClose();
          }}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors ml-auto"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>
    </div>
  );
}

// Helper function for time formatting
function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  } catch {
    return 'Unknown';
  }
}

