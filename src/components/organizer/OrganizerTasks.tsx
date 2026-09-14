import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare,
  Plus,
  Clock,
  CheckCircle,
  Circle,
  AlertCircle,
  RefreshCw,
  Calendar,
  X,
  Save
} from 'lucide-react';
import { useAssignments } from '../../hooks/useAssignments';

interface OrganizerTasksProps {
  maxTasks?: number;
}

export default function OrganizerTasks({ maxTasks = 5 }: OrganizerTasksProps) {
  const { data: assignments, loading, error, refetch, addAssignment, updateAssignment } = useAssignments();

  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    due_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Get today's date string
  const _today = new Date().toISOString().split('T')[0];

  // Filter and categorize tasks
  const { todayTasks, overdueTasks, upcomingTasks, inProgressTasks } = useMemo(() => {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(todayDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const weekFromNow = new Date(todayDate);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const overdue: typeof assignments = [];
    const todayArr: typeof assignments = [];
    const upcoming: typeof assignments = [];
    const inProgress: typeof assignments = [];

    assignments.forEach(task => {
      if (task.status === 'completed') return;
      
      if (task.status === 'in_progress') {
        inProgress.push(task);
      }

      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate < todayDate && task.status !== 'completed') {
          overdue.push(task);
        } else if (dueDate.getTime() === todayDate.getTime()) {
          todayArr.push(task);
        } else if (dueDate < weekFromNow) {
          upcoming.push(task);
        }
      }
    });

    return {
      todayTasks: todayArr,
      overdueTasks: overdue,
      upcomingTasks: upcoming,
      inProgressTasks: inProgress,
    };
  }, [assignments]);

  // Combined priority list
  const priorityTasks = useMemo(() => {
    const allPriority = [
      ...overdueTasks.map(t => ({ ...t, priority: 'overdue' })),
      ...todayTasks.map(t => ({ ...t, priority: 'today' })),
      ...inProgressTasks.filter(t => !todayTasks.includes(t) && !overdueTasks.includes(t)).map(t => ({ ...t, priority: 'in_progress' })),
      ...upcomingTasks.map(t => ({ ...t, priority: 'upcoming' })),
    ];
    
    // Remove duplicates
    const seen = new Set();
    return allPriority.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    }).slice(0, maxTasks);
  }, [overdueTasks, todayTasks, inProgressTasks, upcomingTasks, maxTasks]);

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;

    try {
      setSaving(true);
      setSaveError(null);

      const result = await addAssignment({
        title: newTask.title,
        description: newTask.description || undefined,
        due_date: newTask.due_date || undefined,
        status: 'pending',
        project_id: undefined,
      });
      if (!result.success) {
        throw new Error(result.error || 'Failed to create task');
      }

      setNewTask({ title: '', description: '', due_date: '' });
      setShowAddTask(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (task: typeof assignments[0]) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : task.status === 'pending' ? 'in_progress' : 'completed';
      const result = await updateAssignment(task.id, { status: newStatus as 'pending' | 'in_progress' | 'completed' | 'blocked' });
      if (!result.success) {
        throw new Error(result.error || 'Failed to update task');
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to update task');
    }
  };

  const getStatusIcon = (status: string, priority: string) => {
    if (status === 'completed') {
      return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    }
    if (priority === 'overdue') {
      return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
    if (status === 'in_progress') {
      return <Clock className="w-4 h-4 text-amber-600" />;
    }
    return <Circle className="w-4 h-4 text-slate-400" />;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'overdue':
        return 'bg-red-50 border-red-200';
      case 'today':
        return 'bg-amber-50 border-amber-200';
      case 'in_progress':
        return 'bg-sky-50 border-sky-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'overdue':
        return 'Overdue';
      case 'today':
        return 'Due Today';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Upcoming';
    }
  };

  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((date.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <CheckSquare className="w-4 h-4 text-indigo-600" />
            </div>
            <h3 className="font-semibold text-slate-900">My Tasks</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddTask(true)}
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
              title="Add task"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => refetch()}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-center p-2 bg-red-50 rounded-lg">
            <div className="text-lg font-bold text-red-700">{overdueTasks.length}</div>
            <div className="text-xs text-red-600">Overdue</div>
          </div>
          <div className="text-center p-2 bg-amber-50 rounded-lg">
            <div className="text-lg font-bold text-amber-700">{todayTasks.length}</div>
            <div className="text-xs text-amber-600">Due Today</div>
          </div>
          <div className="text-center p-2 bg-sky-50 rounded-lg">
            <div className="text-lg font-bold text-sky-700">{inProgressTasks.length}</div>
            <div className="text-xs text-sky-600">In Progress</div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && priorityTasks.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : priorityTasks.length === 0 ? (
          <div className="text-center py-8">
            <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-500">No pending tasks</p>
            <button
              onClick={() => setShowAddTask(true)}
              className="mt-2 text-sm text-indigo-600 hover:text-indigo-700"
            >
              Create a new task
            </button>
          </div>
        ) : (
          priorityTasks.map(task => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 border rounded-lg group hover:shadow-sm transition-shadow ${getPriorityColor(task.priority)}`}
            >
              <div className="flex items-start space-x-3">
                <button
                  onClick={() => handleToggleStatus(task)}
                  className="mt-0.5 flex-shrink-0 hover:scale-110 transition-transform"
                  title={task.status === 'completed' ? 'Mark as pending' : 'Mark as completed'}
                >
                  {getStatusIcon(task.status, task.priority)}
                </button>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-medium text-sm ${task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{task.description}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-1.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      task.priority === 'overdue' ? 'bg-red-100 text-red-700' :
                      task.priority === 'today' ? 'bg-amber-100 text-amber-700' :
                      task.priority === 'in_progress' ? 'bg-sky-100 text-sky-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                    {task.due_date && (
                      <span className="text-xs text-slate-500 flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDueDate(task.due_date)}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Quick Add Form */}
      <AnimatePresence>
        {showAddTask && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-200"
          >
            <div className="p-4 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">New Task</span>
                <button
                  onClick={() => setShowAddTask(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {saveError && (
                <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  {saveError}
                </div>
              )}

              <input
                type="text"
                value={newTask.title}
                onChange={e => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Task title *"
                className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-2"
              />
              <textarea
                value={newTask.description}
                onChange={e => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none mb-2"
              />
              <div className="flex items-center space-x-2">
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={e => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                  className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  onClick={handleAddTask}
                  disabled={saving || !newTask.title.trim()}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Adding...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      {assignments.length > maxTasks && (
        <div className="p-3 border-t border-slate-200 text-center">
          <span className="text-xs text-slate-500">
            Showing {maxTasks} of {assignments.filter(a => a.status !== 'completed').length} active tasks
          </span>
        </div>
      )}
    </div>
  );
}
