import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutGrid,
  Clock,
  RefreshCw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import OrganizerCalendar from '../organizer/OrganizerCalendar';
import OrganizerNotes from '../organizer/OrganizerNotes';
import OrganizerTasks from '../organizer/OrganizerTasks';

interface DailyOrganizerProps {
  dashboardRole: 'ceo' | 'cto' | 'cos';
}

export default function DailyOrganizer({ dashboardRole }: DailyOrganizerProps) {
  const [expandedWidget, setExpandedWidget] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const today = new Date();
  const formattedDate = today.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const handleRefreshAll = () => {
    setIsRefreshing(true);
    setRefreshKey((key) => key + 1);
    setIsRefreshing(false);
  };

  const toggleExpand = (widgetId: string) => {
    setExpandedWidget(prev => (prev === widgetId ? null : widgetId));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <LayoutGrid className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Daily Organizer</h1>
              <p className="text-slate-600 mt-1">{formattedDate}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 px-3 py-2 bg-slate-100 rounded-lg">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">
              {today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh All</span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar - Takes 2 columns on large screens */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className={`${
            expandedWidget === 'calendar' ? 'lg:col-span-3' : 'lg:col-span-2'
          } ${expandedWidget && expandedWidget !== 'calendar' ? 'hidden lg:block' : ''}`}
        >
          <div className="relative">
            <button
              onClick={() => toggleExpand('calendar')}
              className="absolute top-4 right-14 z-10 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title={expandedWidget === 'calendar' ? 'Minimize' : 'Maximize'}
            >
              {expandedWidget === 'calendar' ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <OrganizerCalendar key={`cal-${refreshKey}`} />
          </div>
        </motion.div>

        {/* Right Column - Notes and Tasks */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className={`space-y-6 ${
            expandedWidget === 'calendar' ? 'hidden' : ''
          } ${expandedWidget && !['notes', 'tasks'].includes(expandedWidget) ? 'hidden lg:block' : ''}`}
        >
          {/* Notes Widget */}
          <div
            className={`relative ${
              expandedWidget === 'notes' ? 'lg:col-span-3' : ''
            } ${expandedWidget && expandedWidget !== 'notes' ? 'hidden lg:block' : ''}`}
          >
            <button
              onClick={() => toggleExpand('notes')}
              className="absolute top-4 right-14 z-10 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title={expandedWidget === 'notes' ? 'Minimize' : 'Maximize'}
            >
              {expandedWidget === 'notes' ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <OrganizerNotes key={`notes-${refreshKey}`} dashboardRole={dashboardRole} maxNotes={expandedWidget === 'notes' ? 10 : 5} />
          </div>

          {/* Tasks Widget */}
          <div
            className={`relative ${
              expandedWidget === 'tasks' ? 'lg:col-span-3' : ''
            } ${expandedWidget && expandedWidget !== 'tasks' ? 'hidden lg:block' : ''}`}
          >
            <button
              onClick={() => toggleExpand('tasks')}
              className="absolute top-4 right-14 z-10 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title={expandedWidget === 'tasks' ? 'Minimize' : 'Maximize'}
            >
              {expandedWidget === 'tasks' ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <OrganizerTasks key={`tasks-${refreshKey}`} maxTasks={expandedWidget === 'tasks' ? 10 : 5} />
          </div>
        </motion.div>
      </div>

      {/* Productivity Tip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4"
      >
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-lg">💡</span>
          </div>
          <div>
            <h3 className="font-medium text-indigo-900">Productivity Tip</h3>
            <p className="text-sm text-indigo-700 mt-1">
              Start your day by reviewing your calendar events and prioritizing your top 3 tasks. 
              Use quick notes to capture ideas as they come up throughout the day.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
