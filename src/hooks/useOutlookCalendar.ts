import { useState, useEffect, useCallback } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface CalendarEvent {
  id: string;
  subject: string;
  bodyPreview?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  isAllDay: boolean;
  organizer?: {
    emailAddress: {
      name: string;
      address: string;
    };
  };
  attendees?: Array<{
    emailAddress: {
      name: string;
      address: string;
    };
    status: {
      response: string;
    };
  }>;
  categories?: string[];
  importance?: 'low' | 'normal' | 'high';
  showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  webLink?: string;
  isOnlineMeeting?: boolean;
  onlineMeetingUrl?: string;
}

export interface CalendarEventCreate {
  subject: string;
  body?: string;
  start: string; // ISO date string
  end: string; // ISO date string
  isAllDay?: boolean;
  location?: string;
  attendees?: string[]; // email addresses
}

export interface UseOutlookCalendarOptions {
  autoRefresh?: boolean;
  startDate?: Date;
  endDate?: Date;
}

function emptyCalendar(): CalendarEvent[] {
  return [];
}

export function useOutlookCalendar(options: UseOutlookCalendarOptions = {}) {
  const { autoRefresh = false } = options;
  const { isDemoMode } = useAuth();
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // Check if we should use demo mode
  const isInDemoMode = isDemoMode || !isSupabaseConfigured;

  // Get default date range (current week)
  const getDefaultDateRange = useCallback(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    return { startDate: startOfWeek, endDate: endOfWeek };
  }, []);

  const fetchEvents = useCallback(async (startDate?: Date, endDate?: Date) => {
    const dateRange = startDate && endDate 
      ? { startDate, endDate } 
      : getDefaultDateRange();

    if (isInDemoMode) {
      setEvents([]);
      setIsConnected(false);
      setLoading(false);
      setError(null);
      return emptyCalendar();
    }

    try {
      setLoading(true);
      setSyncStatus('syncing');
      setError(null);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outlook-calendar`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'getEvents',
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch calendar events: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.connected === false || data.demo) {
        setIsConnected(false);
        setEvents([]);
      } else {
        setIsConnected(true);
        setEvents(data.events || []);
      }

      setSyncStatus('success');
      return data.events || [];
    } catch (err) {
      console.error('[useOutlookCalendar] Error fetching events:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch calendar events';
      setError(errorMessage);
      setSyncStatus('error');
      setEvents([]);
      setIsConnected(false);
      return emptyCalendar();
    } finally {
      setLoading(false);
    }
  }, [isInDemoMode, getDefaultDateRange]);

  const createEvent = async (eventData: CalendarEventCreate) => {
    if (isInDemoMode || !isConnected) {
      throw new Error('Outlook is not connected. Events are not stored locally.');
    }

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outlook-calendar`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'createEvent',
          event: eventData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create event: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Refresh events after creation
      await fetchEvents();
      return data.event;
    } catch (err) {
      console.error('[useOutlookCalendar] Error creating event:', err);
      throw err;
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (isInDemoMode || !isConnected) {
      throw new Error('Outlook is not connected. Events are not stored locally.');
    }

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outlook-calendar`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'deleteEvent',
          eventId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete event: ${response.statusText}`);
      }

      // Refresh events after deletion
      await fetchEvents();
    } catch (err) {
      console.error('[useOutlookCalendar] Error deleting event:', err);
      throw err;
    }
  };

  const updateEvent = async (eventId: string, eventData: Partial<CalendarEventCreate>) => {
    if (isInDemoMode || !isConnected) {
      throw new Error('Outlook is not connected. Events are not stored locally.');
    }

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/outlook-calendar`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'updateEvent',
          eventId,
          event: eventData,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update event: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Refresh events after update
      await fetchEvents();
      return data.event;
    } catch (err) {
      console.error('[useOutlookCalendar] Error updating event:', err);
      throw err;
    }
  };

  // Get events for a specific date
  const getEventsForDate = useCallback((date: Date): CalendarEvent[] => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime).toISOString().split('T')[0];
      return eventDate === dateStr;
    });
  }, [events]);

  // Get today's events
  const getTodayEvents = useCallback((): CalendarEvent[] => {
    return getEventsForDate(new Date());
  }, [getEventsForDate]);

  // Initial fetch
  useEffect(() => {
    fetchEvents(options.startDate, options.endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && !isInDemoMode) {
      const interval = setInterval(() => {
        fetchEvents(options.startDate, options.endDate);
      }, 5 * 60 * 1000); // Refresh every 5 minutes

      return () => clearInterval(interval);
    }
  }, [autoRefresh, isInDemoMode, fetchEvents, options.startDate, options.endDate]);

  return {
    events,
    loading,
    error,
    isConnected,
    isInDemoMode,
    syncStatus,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    getEventsForDate,
    getTodayEvents,
    refresh: () => fetchEvents(options.startDate, options.endDate),
  };
}
