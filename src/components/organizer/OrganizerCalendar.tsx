import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  RefreshCw,
  Video,
  ExternalLink,
  CheckCircle,
  X,
  Settings,
  Link2
} from 'lucide-react';
import { useOutlookCalendar, CalendarEvent, CalendarEventCreate } from '../../hooks/useOutlookCalendar';
import OutlookSetupModal from './OutlookSetupModal';
import EventDetailModal from './EventDetailModal';

interface OrganizerCalendarProps {
  compact?: boolean;
}

export default function OrganizerCalendar({ compact = false }: OrganizerCalendarProps) {
  const {
    events,
    loading,
    error,
    isConnected,
    syncStatus: _syncStatus,
    fetchEvents,
    createEvent,
    deleteEvent,
    getTodayEvents,
    refresh
  } = useOutlookCalendar({ autoRefresh: true });

  const [showOutlookSetup, setShowOutlookSetup] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showEventDetail, setShowEventDetail] = useState(false);

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return start;
  });

  const [showAddEvent, setShowAddEvent] = useState(false);
  const [_selectedDate, _setSelectedDate] = useState<Date | null>(null);
  const [newEvent, setNewEvent] = useState<Partial<CalendarEventCreate>>({
    subject: '',
    start: '',
    end: '',
    isAllDay: false,
    location: '',
  });
  const [saving, setSaving] = useState(false);

  // Get week days
  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(currentWeekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentWeekStart]);

  // Get events for each day
  const eventsByDay = useMemo(() => {
    const byDay: Record<string, CalendarEvent[]> = {};
    weekDays.forEach(day => {
      const dateKey = day.toISOString().split('T')[0];
      byDay[dateKey] = events.filter(event => {
        const eventDate = new Date(event.start.dateTime).toISOString().split('T')[0];
        return eventDate === dateKey;
      });
    });
    return byDay;
  }, [events, weekDays]);

  // Today's events
  const todayEvents = getTodayEvents();

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newStart);
    
    const endDate = new Date(newStart);
    endDate.setDate(newStart.getDate() + 7);
    fetchEvents(newStart, endDate);
  };

  const goToToday = () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    setCurrentWeekStart(start);
    refresh();
  };

  const handleAddEvent = async () => {
    if (!newEvent.subject || !newEvent.start || !newEvent.end) return;

    try {
      setSaving(true);
      await createEvent(newEvent as CalendarEventCreate);
      setShowAddEvent(false);
      setNewEvent({
        subject: '',
        start: '',
        end: '',
        isAllDay: false,
        location: '',
      });
    } catch (err) {
      console.error('Failed to create event:', err);
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateHeader = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    return {
      day: date.toLocaleDateString([], { weekday: 'short' }),
      date: date.getDate(),
      isToday,
    };
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.showAs === 'tentative') return 'bg-amber-100 border-amber-300 text-amber-800';
    if (event.showAs === 'free') return 'bg-emerald-100 border-emerald-300 text-emerald-800';
    if (event.importance === 'high') return 'bg-red-100 border-red-300 text-red-800';
    return 'bg-sky-100 border-sky-300 text-sky-800';
  };

  if (compact) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-sky-600" />
            <h3 className="font-semibold text-slate-900">Today's Schedule</h3>
          </div>
          <div className="flex items-center space-x-2">
            {!isConnected && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">Not connected</span>
            )}
            <button
              onClick={refresh}
              disabled={loading}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {todayEvents.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No events scheduled for today</p>
          ) : (
            todayEvents.map(event => (
              <div
                key={event.id}
                className={`p-2 rounded-lg border text-sm ${getEventColor(event)}`}
              >
                <div className="font-medium truncate">{event.subject}</div>
                <div className="flex items-center space-x-2 text-xs mt-1 opacity-75">
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Calendar</h2>
              <p className="text-sm text-slate-500">
                {currentWeekStart.toLocaleDateString([], { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isConnected && (
              <button
                onClick={() => setShowOutlookSetup(true)}
                className="text-xs text-amber-600 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded flex items-center space-x-1 transition-colors cursor-pointer"
              >
                <Link2 className="w-3 h-3" />
                <span>Not connected</span>
              </button>
            )}
            {isConnected && (
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded flex items-center space-x-1">
                <CheckCircle className="w-3 h-3" />
                <span>Outlook synced</span>
              </span>
            )}
            {isConnected && (
              <button
                onClick={() => setShowAddEvent(true)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Event</span>
              </button>
            )}
            {!isConnected && (
              <button
                onClick={() => setShowOutlookSetup(true)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Configure Outlook"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-1.5 text-sm font-medium text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Week View */}
      <div className="p-4">
        <div className="grid grid-cols-7 gap-2">
          {/* Day Headers */}
          {weekDays.map(day => {
            const { day: dayName, date, isToday } = formatDateHeader(day);
            return (
              <div
                key={day.toISOString()}
                className={`text-center p-2 rounded-lg ${
                  isToday ? 'bg-sky-600 text-white' : 'bg-slate-50'
                }`}
              >
                <div className="text-xs font-medium">{dayName}</div>
                <div className={`text-lg font-bold ${isToday ? '' : 'text-slate-900'}`}>{date}</div>
              </div>
            );
          })}

          {/* Day Columns with Events */}
          {weekDays.map(day => {
            const dateKey = day.toISOString().split('T')[0];
            const dayEvents = eventsByDay[dateKey] || [];
            const { isToday } = formatDateHeader(day);

            return (
              <div
                key={`events-${day.toISOString()}`}
                className={`min-h-32 p-1 rounded-lg border ${
                  isToday ? 'border-sky-200 bg-sky-50/30' : 'border-slate-100'
                }`}
              >
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowEventDetail(true);
                      }}
                      className={`p-1.5 rounded text-xs cursor-pointer hover:shadow-md hover:scale-105 transition-all ${getEventColor(event)}`}
                      title={`${event.subject}\n${formatTime(event.start.dateTime)} - ${formatTime(event.end.dateTime)}`}
                    >
                      <div className="font-medium truncate">{event.subject}</div>
                      <div className="opacity-75 text-[10px]">
                        {formatTime(event.start.dateTime)}
                      </div>
                    </motion.div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-slate-500 text-center">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Today's Detailed Schedule */}
      <div className="border-t border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 mb-3 flex items-center space-x-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Today's Schedule</span>
          <span className="text-sm font-normal text-slate-500">({todayEvents.length} events)</span>
        </h3>

        <div className="space-y-2 max-h-48 overflow-y-auto">
          {todayEvents.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No events scheduled for today</p>
          ) : (
            todayEvents.map(event => (
              <div
                key={event.id}
                onClick={() => {
                  setSelectedEvent(event);
                  setShowEventDetail(true);
                }}
                className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${getEventColor(event)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{event.subject}</div>
                    <div className="flex items-center space-x-3 text-xs mt-1">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}</span>
                      </span>
                      {event.location?.displayName && (
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3" />
                          <span>{event.location.displayName}</span>
                        </span>
                      )}
                      {event.isOnlineMeeting && (
                        <span className="flex items-center space-x-1">
                          <Video className="w-3 h-3" />
                          <span>Online</span>
                        </span>
                      )}
                    </div>
                  </div>
                  {event.webLink && (
                    <a
                      href={event.webLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      <AnimatePresence>
        {showAddEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddEvent(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Add Event</h3>
                <button
                  onClick={() => setShowAddEvent(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Event Title *
                  </label>
                  <input
                    type="text"
                    value={newEvent.subject || ''}
                    onChange={e => setNewEvent(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="Meeting with team"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Start *
                    </label>
                    <input
                      type="datetime-local"
                      value={newEvent.start || ''}
                      onChange={e => setNewEvent(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      End *
                    </label>
                    <input
                      type="datetime-local"
                      value={newEvent.end || ''}
                      onChange={e => setNewEvent(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={newEvent.location || ''}
                    onChange={e => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    placeholder="Conference Room A"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isAllDay"
                    checked={newEvent.isAllDay || false}
                    onChange={e => setNewEvent(prev => ({ ...prev, isAllDay: e.target.checked }))}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  <label htmlFor="isAllDay" className="text-sm text-slate-700">
                    All-day event
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowAddEvent(false)}
                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddEvent}
                    disabled={saving || !newEvent.subject || !newEvent.start || !newEvent.end}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Adding...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Add Event</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Outlook Setup Modal */}
      <OutlookSetupModal
        isOpen={showOutlookSetup}
        onClose={() => setShowOutlookSetup(false)}
        onSuccess={() => {
          refresh();
        }}
      />

      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={showEventDetail}
        onClose={() => {
          setShowEventDetail(false);
          setSelectedEvent(null);
        }}
        onDelete={async (eventId) => {
          await deleteEvent(eventId);
        }}
        isConnected={isConnected}
      />
    </div>
  );
}
