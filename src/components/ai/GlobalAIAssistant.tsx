import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { X, Minus, Send, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { useAIAssistant } from '../../providers/AIAssistantProvider';
import { useAuth } from '../../contexts/AuthContext';
import { useOrg } from '../../contexts/OrgContext';
import { useDeskPeriod } from '../../contexts/DeskPeriodContext';
import { useAgentChat, ChatEntry, createChatId } from '../../hooks/useAgentChat';
import { ToolCallVisualization } from './ToolCallVisualization';
import { OrbitMark } from './OrbitMark';
import {
  ORBIT_CHARACTER,
  ORBIT_OPERATOR_ONLY,
  ORBIT_PRESETS,
  ORBIT_REFUSE_WRITE,
  buildOrbitSystemPrompt,
  classifyOrbitIntent,
  loadOrbitSnapshot,
  runOrbitWrite,
  type OrbitScope,
  type OrbitWriteAction,
} from '@/lib/orbit';
import { cn } from '@/lib/utils';

function writeCopy(action: OrbitWriteAction): { title: string; summary: string } {
  if (action === 'sync') {
    return {
      title: 'Refresh all sources?',
      summary: 'Runs connector-sync for this org. Warehouse facts update after extractors finish.',
    };
  }
  return {
    title: 'Save this 90-day forecast?',
    summary: 'Inserts a forecast_runs row from the same inputs Command uses. Not collected revenue.',
  };
}

export function GlobalAIAssistant() {
  const { user, profileReady } = useAuth();
  const { orgId, memberships, rollup, linked, isOperator } = useOrg();
  const { period, customStart, customEnd, pnlGrain } = useDeskPeriod();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    isOpen,
    isMinimized,
    unreadCount,
    toggleAssistant,
    closeAssistant,
    minimizeAssistant,
    restoreAssistant,
    setMessages,
    clearMessages,
    markAsRead,
  } = useAIAssistant();

  const orgIds = rollup ? memberships.map((row) => row.org_id) : orgId ? [orgId] : [];
  const scope: OrbitScope = {
    orgId,
    orgIds,
    period,
    customStart,
    customEnd,
    pnlGrain,
    linked,
    pathname: location.pathname,
    isOperator,
  };

  const systemPrompt = buildOrbitSystemPrompt({
    pathname: location.pathname,
    period,
    orgId,
    linked,
    isOperator,
  });

  const {
    messages: chatMessages,
    isLoading,
    sendMessage,
    pushEntries,
    clearHistory,
    setSystemPrompt,
  } = useAgentChat({
    systemPrompt,
    onError: (error) => {
      console.error('Orbit error:', error);
    },
  });

  const [inputValue, setInputValue] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [pendingWrite, setPendingWrite] = useState<OrbitWriteAction | null>(null);
  const [writeBusy, setWriteBusy] = useState(false);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = isLoading || snapshotBusy || writeBusy;

  useEffect(() => {
    if (chatMessages.length > 0) {
      setMessages(chatMessages);
    }
  }, [chatMessages, setMessages]);

  useEffect(() => {
    setSystemPrompt(systemPrompt);
  }, [setSystemPrompt, systemPrompt]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
      markAsRead();
    }
  }, [isOpen, isMinimized, markAsRead]);

  useEffect(() => {
    if (!isOpen || isMinimized) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAssistant();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeAssistant, isOpen, isMinimized]);

  const ask = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;

    const intent = classifyOrbitIntent(text);

    if (intent.kind === 'refuse') {
      pushEntries([
        { id: createChatId(), role: 'user', content: text, timestamp: new Date() },
        { id: createChatId(), role: 'assistant', content: ORBIT_REFUSE_WRITE, timestamp: new Date() },
      ]);
      return;
    }

    if (intent.kind === 'write') {
      if (!isOperator) {
        pushEntries([
          { id: createChatId(), role: 'user', content: text, timestamp: new Date() },
          { id: createChatId(), role: 'assistant', content: ORBIT_OPERATOR_ONLY, timestamp: new Date() },
        ]);
        return;
      }
      const copy = writeCopy(intent.action);
      setPendingWrite(intent.action);
      pushEntries([
        { id: createChatId(), role: 'user', content: text, timestamp: new Date() },
        {
          id: createChatId(),
          role: 'assistant',
          content: `${copy.title} ${copy.summary}`,
          timestamp: new Date(),
          confirm: { action: intent.action, ...copy },
        },
      ]);
      return;
    }

    if (intent.kind === 'snapshot') {
      setSnapshotBusy(true);
      pushEntries([{ id: createChatId(), role: 'user', content: text, timestamp: new Date() }]);
      try {
        const reply = await loadOrbitSnapshot(intent.snapshot, scope, intent.period || period, {
          explain: intent.explain,
        });
        pushEntries([
          {
            id: createChatId(),
            role: 'assistant',
            content: reply.text,
            timestamp: new Date(),
            href: reply.href,
            label: reply.label,
          },
        ]);
      } catch (error) {
        pushEntries([
          {
            id: createChatId(),
            role: 'assistant',
            content: error instanceof Error ? error.message : 'I could not read that fact.',
            timestamp: new Date(),
            isError: true,
          },
        ]);
      } finally {
        setSnapshotBusy(false);
      }
      return;
    }

    const response = await sendMessage(text, {
      orgId,
      orgIds,
      pathname: location.pathname,
      period,
      pnlGrain,
      linked,
    });
    const href = extractNavigateHref(response?.tool_results);
    if (href) navigate(href);
  };

  const confirmWrite = async (action: OrbitWriteAction) => {
    if (!isOperator || writeBusy) return;
    setWriteBusy(true);
    try {
      const text = await runOrbitWrite(action, scope);
      await queryClient.invalidateQueries();
      setPendingWrite(null);
      pushEntries([{ id: createChatId(), role: 'assistant', content: text, timestamp: new Date() }]);
    } catch (error) {
      pushEntries([
        {
          id: createChatId(),
          role: 'assistant',
          content: error instanceof Error ? error.message : 'Write failed.',
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setWriteBusy(false);
    }
  };

  if (!profileReady || !user) {
    return null;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || busy) return;
    const message = inputValue.trim();
    setInputValue('');
    setCommandHistory((prev) => [...prev, message]);
    setHistoryIndex(-1);
    await ask(message);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[commandHistory.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInputValue(commandHistory[commandHistory.length - 1 - newIndex] || '');
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputValue('');
      }
    }
  };

  const handleClear = () => {
    clearHistory();
    clearMessages();
    setPendingWrite(null);
  };

  if (isOpen && isMinimized) {
    return (
      <button
        type="button"
        onClick={restoreAssistant}
        className="fixed bottom-24 right-6 z-[60] flex items-center gap-2 rounded-full bg-[#0B0B0D] px-4 py-2 text-white shadow-[0_10px_28px_rgba(255,122,0,0.35)] ring-1 ring-[#FF7A00]/50 hover:ring-[#FFC300]"
        aria-label="Open Orbit"
      >
        <OrbitMark size={28} spinning />
        <span className="text-sm font-medium">{ORBIT_CHARACTER.name}</span>
        {unreadCount > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-aryx-accent text-xs font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={toggleAssistant}
        className="fixed bottom-24 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-[#0B0B0D] text-white shadow-[0_10px_28px_rgba(255,122,0,0.35)] ring-1 ring-[#FF7A00]/50 hover:ring-[#FFC300] focus:outline-none focus:ring-2 focus:ring-[#FF7A00]"
        aria-label="Open Orbit"
        title="Open Orbit (Ctrl+Shift+A)"
      >
        <OrbitMark size={40} spinning />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-aryx-accent text-xs font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      data-testid="orbit-assistant"
      className="fixed bottom-24 right-3 z-[60] flex h-[70vh] max-h-[520px] w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[1.55rem] p-[3px] shadow-[0_18px_50px_rgba(11,11,13,0.35)] sm:right-6 sm:h-[500px] sm:w-[400px]"
      style={{
        background: 'linear-gradient(160deg, #FF5A1F 0%, #0B0B0D 42%, #1A1A1A 70%, #FFC300 100%)',
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.35rem] bg-[#0F1014] text-[#F5F5F5]">
        <div className="relative flex items-center justify-between px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <OrbitMark size={36} spinning={busy} />
            <div className="leading-tight">
              <p className="text-[13px] font-semibold tracking-wide">{ORBIT_CHARACTER.name}</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#A1A1AA]">{ORBIT_CHARACTER.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg p-1.5 hover:bg-white/10"
              title="Clear conversation"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={minimizeAssistant}
              className="rounded-lg p-1.5 hover:bg-white/10"
              title="Minimize"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={closeAssistant}
              className="rounded-lg p-1.5 hover:bg-white/10"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div
            className="pointer-events-none absolute inset-x-3 bottom-0 h-px"
            style={{ background: 'linear-gradient(90deg, #FF5A1F 0%, #FF7A00 50%, #FFC300 100%)' }}
          />
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {chatMessages.length === 0 ? (
            <div className="space-y-3">
              <div className="flex gap-3 rounded-2xl bg-white/[0.04] px-3 py-3 ring-1 ring-white/10">
                <OrbitMark size={44} />
                <div>
                  <p className="text-sm font-medium">{ORBIT_CHARACTER.tagline}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#A1A1AA]">{ORBIT_CHARACTER.idle}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ORBIT_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs hover:border-[#FF7A00]/50 hover:bg-[#FF7A00]/10"
                    onClick={() => void ask(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            chatMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                writeBusy={writeBusy}
                pendingWrite={pendingWrite}
                onConfirm={confirmWrite}
                onOpen={(href) => navigate(href)}
              />
            ))
          )}

          {busy && (
            <div className="flex items-center gap-2 text-xs text-[#A1A1AA]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#FF7A00]" />
              {ORBIT_CHARACTER.scanning}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t border-white/10 p-2">
          <div className="flex items-center gap-1">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Orbit…"
              disabled={busy}
              className="flex-1 rounded-xl border border-white/10 bg-[#0B0B0D] px-3 py-2 text-sm text-[#F5F5F5] outline-none placeholder:text-[#A1A1AA] focus:ring-2 focus:ring-[#FF7A00] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || busy}
              className="rounded-lg bg-aryx-accent p-2 text-white hover:bg-[#FF5A1F] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function extractNavigateHref(results: ChatEntry['toolResults']): string | null {
  for (const result of results || []) {
    if (result.name !== 'navigate' || !result.success) continue;
    const payload = result.result;
    if (payload && typeof payload === 'object' && 'href' in payload) {
      const href = String((payload as { href?: unknown }).href || '');
      if (href.startsWith('/')) return href;
    }
  }
  return null;
}

function MessageBubble({
  message,
  writeBusy,
  pendingWrite,
  onConfirm,
  onOpen,
}: {
  message: ChatEntry;
  writeBusy: boolean;
  pendingWrite: OrbitWriteAction | null;
  onConfirm: (action: OrbitWriteAction) => void;
  onOpen: (href: string) => void;
}) {
  const isUser = message.role === 'user';
  const isError = message.isError;

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3 py-2',
          isUser
            ? 'bg-[#FF7A00]/15 text-[#FFF4ED] ring-1 ring-[#FF7A00]/25'
            : isError
              ? 'bg-red-50 text-red-800 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-200'
              : 'bg-white/[0.05] text-[#F5F5F5] ring-1 ring-white/10',
        )}
      >
        <div className="flex items-start gap-2">
          {!isUser && (
            isError ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            ) : (
              <OrbitMark size={20} spinning={false} />
            )
          )}
          <div className="min-w-0 flex-1">
            {!isUser && !isError && (
              <p className="mb-1 text-[10px] uppercase tracking-[0.16em] text-[#FFC300]">
                {ORBIT_CHARACTER.name}
              </p>
            )}
            <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>

            {message.confirm && pendingWrite === message.confirm.action && (
              <div className="mt-2 rounded-xl border border-white/10 bg-[#0B0B0D] p-2">
                <p className="font-medium">{message.confirm.title}</p>
                <p className="mt-1 text-xs text-[#A1A1AA]">{message.confirm.summary}</p>
                <button
                  type="button"
                  className="mt-2 rounded-full bg-aryx-accent px-3 py-1 text-xs text-white hover:bg-[#FF5A1F] disabled:opacity-50"
                  disabled={writeBusy}
                  onClick={() => onConfirm(message.confirm!.action)}
                >
                  {writeBusy ? 'Working…' : 'Confirm'}
                </button>
              </div>
            )}

            {message.href && (
              <button
                type="button"
                className="mt-2 rounded-full border border-white/10 bg-[#0B0B0D] px-2 py-0.5 text-xs text-[#FFC300]"
                onClick={() => onOpen(message.href!)}
              >
                {message.label || 'Open'}
              </button>
            )}

            {message.toolCalls && message.toolCalls.length > 0 && (
              <ToolCallVisualization
                toolCalls={message.toolCalls}
                toolResults={message.toolResults}
              />
            )}

            <p className={cn('mt-1 text-xs', isUser ? 'text-[#FFC300]/70' : 'text-[#A1A1AA]')}>
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
