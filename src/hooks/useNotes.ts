import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';

export interface Note {
  id: string;
  title?: string;
  content: string;
  owner_role: 'ceo' | 'cto' | 'cos';
  created_for_role?: 'ceo' | 'cto' | 'cos' | null;
  is_shared: boolean;
  is_collaborative: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  category?: string;
  tags?: string[];
  is_pinned?: boolean;
}

export interface NoteShare {
  id: string;
  note_id: string;
  shared_by_user_id: string;
  shared_with_user_id: string;
  shared_with_role: 'ceo' | 'cto';
  permission_level: 'view' | 'edit';
  share_message?: string;
  created_at: string;
  shared_by_email?: string;
  shared_by_name?: string;
}

export interface NoteNotification {
  id: string;
  note_id: string;
  recipient_user_id: string;
  notification_type: 'shared' | 'edited' | 'unshared' | 'commented';
  is_read: boolean;
  sent_via: 'in-app' | 'email' | 'both';
  metadata: Record<string, unknown>;
  created_at: string;
  note?: Note;
}

export interface UseNotesOptions {
  dashboardRole: 'ceo' | 'cto' | 'cos';
  autoRefresh?: boolean;
}

// Demo mode mock data
const createDemoNote = (dashboardRole: 'ceo' | 'cto' | 'cos', index: number): Note => ({
  id: `demo-note-${dashboardRole}-${index}`,
  title: index === 0 ? 'Welcome to Notes' : `Sample Note ${index}`,
  content: index === 0
    ? 'This is a demo note. Notes are stored locally in demo mode. Sign in to save notes to the cloud.'
    : `This is sample note content #${index} for the ${dashboardRole.toUpperCase()} dashboard.`,
  owner_role: dashboardRole,
  created_for_role: null,
  is_shared: false,
  is_collaborative: false,
  created_by: `demo-${dashboardRole}`,
  created_at: new Date(Date.now() - index * 86400000).toISOString(),
  updated_at: new Date(Date.now() - index * 86400000).toISOString(),
  category: 'general',
  tags: ['demo'],
  is_pinned: index === 0,
});

const DEMO_STORAGE_KEY = 'mpb_demo_notes';

function loadDemoNotes(dashboardRole: 'ceo' | 'cto' | 'cos'): Note[] {
  try {
    const stored = localStorage.getItem(`${DEMO_STORAGE_KEY}_${dashboardRole}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  // Return default demo notes
  return [createDemoNote(dashboardRole, 0), createDemoNote(dashboardRole, 1)];
}

function saveDemoNotes(dashboardRole: 'ceo' | 'cto' | 'cos', notes: Note[]): void {
  try {
    localStorage.setItem(`${DEMO_STORAGE_KEY}_${dashboardRole}`, JSON.stringify(notes));
  } catch {
    // Ignore storage errors
  }
}

export function useNotes(options: UseNotesOptions) {
  const { dashboardRole, autoRefresh = false } = options;
  const { user, isDemoMode } = useAuth();
  const { orgId } = useOrg();
  const [notes, setNotes] = useState<Note[]>([]);
  const [sharedNotes, setSharedNotes] = useState<Note[]>([]);
  const [notifications, setNotifications] = useState<NoteNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if we should use demo mode (either explicit demo mode or Supabase not configured)
  const isInDemoMode = isDemoMode || !isSupabaseConfigured;

  // Demo mode functions
  const fetchDemoNotes = useCallback(() => {
    const demoNotes = loadDemoNotes(dashboardRole);
    setNotes(demoNotes);
    setSharedNotes([]);
    setNotifications([]);
    setLoading(false);
    setError(null);
  }, [dashboardRole]);

  const fetchMyNotes = async () => {
    if (!user) throw new Error('Not authenticated');
    if (isInDemoMode) return loadDemoNotes(dashboardRole);

    if (!orgId) return [];

    const initialResult = await supabase
      .from('notes')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    let data = initialResult.data;
    const fetchError = initialResult.error;

    // If owner_role column doesn't exist, fall back to basic query
    if (fetchError && (fetchError.message.includes('owner_role') || fetchError.code === '42703')) {
      console.warn('[useNotes] Falling back to basic notes query - enhanced schema may not be applied');
      const fallbackResult = await supabase
        .from('notes')
        .select('*')
        .or(`created_by.eq.${user.id},user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (fallbackResult.error) throw fallbackResult.error;

      // Map basic notes to enhanced format
      data = (fallbackResult.data || []).map(note => ({
        ...note,
        owner_role: dashboardRole,
        is_shared: note.is_shared ?? false,
        is_collaborative: note.is_collaborative ?? false,
        created_by: note.created_by || note.user_id,
      }));
    } else if (fetchError) {
      throw fetchError;
    }

    return data || [];
  };

  const fetchSharedNotes = async () => [];

  const fetchNotifications = async () => [];

  const fetchAllNotes = useCallback(async () => {
    // In demo mode, use local storage
    if (isInDemoMode) {
      fetchDemoNotes();
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [myNotesData, sharedNotesData, notificationsData] = await Promise.all([
        fetchMyNotes(),
        fetchSharedNotes(),
        fetchNotifications()
      ]);

      setNotes(myNotesData);
      setSharedNotes(sharedNotesData);
      setNotifications(notificationsData as NoteNotification[]);
    } catch (err) {
      console.error('[useNotes] Error fetching notes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch notes');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInDemoMode, fetchDemoNotes]);

  useEffect(() => {
    fetchAllNotes();

    // Only set up real-time subscription if not in demo mode
    if (autoRefresh && !isInDemoMode) {
      const subscription = supabase
        .channel('notes_changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'notes' },
          () => {
            fetchAllNotes();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'note_shares' },
          () => {
            fetchAllNotes();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'note_notifications' },
          () => {
            fetchAllNotes();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [dashboardRole, autoRefresh, isInDemoMode, orgId, fetchAllNotes]);

  const createNote = async (
    content: string,
    options?: {
      title?: string;
      createdForRole?: 'ceo' | 'cto';
      shareImmediately?: boolean;
      permissionLevel?: 'view' | 'edit';
      shareMessage?: string;
    }
  ) => {
    if (!user) throw new Error('Not authenticated');

    // Demo mode: save to local storage
    if (isInDemoMode) {
      const newNote: Note = {
        id: `demo-note-${Date.now()}`,
        content,
        title: options?.title || undefined,
        owner_role: dashboardRole,
        created_for_role: options?.createdForRole || null,
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_shared: false,
        is_collaborative: false,
        category: 'general',
        tags: ['demo'],
        is_pinned: false,
      };
      const currentNotes = loadDemoNotes(dashboardRole);
      const updatedNotes = [newNote, ...currentNotes];
      saveDemoNotes(dashboardRole, updatedNotes);
      setNotes(updatedNotes);
      return newNote;
    }

    if (!orgId) throw new Error('No active organization');

    const noteData = {
      org_id: orgId,
      content,
      title: options?.title || null,
      owner_role: dashboardRole,
      created_for_role: options?.createdForRole || null,
      created_by: user.id,
      owner_user_id: user.id,
      is_shared: false,
      is_collaborative: false,
    };

    const { data, error: insertError } = await supabase
      .from('notes')
      .insert([noteData])
      .select()
      .single();

    if (insertError) throw insertError;

    await fetchAllNotes();
    return data;
  };

  const updateNote = async (id: string, content: string, title?: string) => {
    // Demo mode: update in local storage
    if (isInDemoMode) {
      const currentNotes = loadDemoNotes(dashboardRole);
      const updatedNotes = currentNotes.map(note =>
        note.id === id
          ? { ...note, content, title: title || note.title, updated_at: new Date().toISOString() }
          : note
      );
      saveDemoNotes(dashboardRole, updatedNotes);
      setNotes(updatedNotes);
      return;
    }

    const { error: updateError } = await supabase
      .from('notes')
      .update({ content, title, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) throw updateError;

    await fetchAllNotes();
  };

  const deleteNote = async (id: string) => {
    // Demo mode: delete from local storage
    if (isInDemoMode) {
      const currentNotes = loadDemoNotes(dashboardRole);
      const updatedNotes = currentNotes.filter(note => note.id !== id);
      saveDemoNotes(dashboardRole, updatedNotes);
      setNotes(updatedNotes);
      return;
    }

    const { error: deleteError } = await supabase
      .from('notes')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    await fetchAllNotes();
  };

  const shareNoteWithRole = async (
    noteId: string,
    targetRole: 'ceo' | 'cto',
    permissionLevel: 'view' | 'edit' = 'view',
    shareMessage?: string
  ) => {
    // Demo mode: sharing is not supported
    if (isInDemoMode) {
      console.warn('[useNotes] Sharing is not available in demo mode');
      throw new Error('Note sharing is not available in demo mode. Please sign in to share notes.');
    }

    const { data, error: rpcError } = await supabase.rpc('share_note_with_role', {
      p_note_id: noteId,
      p_target_role: targetRole,
      p_permission_level: permissionLevel,
      p_share_message: shareMessage || null
    });

    if (rpcError) {
      console.error('[useNotes] Error sharing note:', rpcError);
      throw new Error(rpcError.message || 'Failed to share note. The sharing function may not be available.');
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Failed to share note');
    }

    await fetchAllNotes();
    return data;
  };

  const unshareNote = async (noteId: string, userId?: string) => {
    if (!user) throw new Error('Not authenticated');

    // Demo mode: unsharing is not supported
    if (isInDemoMode) {
      console.warn('[useNotes] Unsharing is not available in demo mode');
      return;
    }

    let query = supabase
      .from('note_shares')
      .delete()
      .eq('note_id', noteId)
      .eq('shared_by_user_id', user.id);

    if (userId) {
      query = query.eq('shared_with_user_id', userId);
    }

    const { error: deleteError } = await query;
    if (deleteError) throw deleteError;

    const { count } = await supabase
      .from('note_shares')
      .select('*', { count: 'exact', head: true })
      .eq('note_id', noteId);

    if (count === 0) {
      await supabase
        .from('notes')
        .update({ is_shared: false, is_collaborative: false })
        .eq('id', noteId);
    }

    await fetchAllNotes();
  };

  const getNoteShares = async (noteId: string): Promise<NoteShare[]> => {
    // Demo mode: no shares
    if (isInDemoMode) {
      return [];
    }

    const { data, error: fetchError } = await supabase
      .from('note_shares')
      .select(`
        *,
        shared_by:auth.users!note_shares_shared_by_user_id_fkey(email),
        shared_with:auth.users!note_shares_shared_with_user_id_fkey(email)
      `)
      .eq('note_id', noteId);

    if (fetchError) throw fetchError;
    return data || [];
  };

  const markNotificationAsRead = async (notificationId: string) => {
    // Demo mode: no notifications
    if (isInDemoMode) {
      return;
    }

    const { error: updateError } = await supabase
      .from('note_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (updateError) throw updateError;

    await fetchAllNotes();
  };

  const markAllNotificationsAsRead = async () => {
    if (!user) throw new Error('Not authenticated');

    // Demo mode: no notifications
    if (isInDemoMode) {
      return;
    }

    const { error: updateError } = await supabase
      .from('note_notifications')
      .update({ is_read: true })
      .eq('recipient_user_id', user.id)
      .eq('is_read', false);

    if (updateError) throw updateError;

    await fetchAllNotes();
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notes,
    sharedNotes,
    notifications,
    unreadCount,
    loading,
    error,
    isInDemoMode,
    createNote,
    updateNote,
    deleteNote,
    shareNoteWithRole,
    unshareNote,
    getNoteShares,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    refresh: fetchAllNotes
  };
}
