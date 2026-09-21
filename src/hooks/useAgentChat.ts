import { useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  sendAgentMessage,
  ChatMessage,
  ChatResponse,
  ToolCall,
  ToolResult,
  AgentApiClientError,
  AgentTurnContext,
} from '../lib/agentApi';
import type { OrbitWriteAction } from '../lib/orbit/intent';

export interface ChatConfirm {
  action: OrbitWriteAction;
  title: string;
  summary: string;
}

export interface ChatEntry {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  isError?: boolean;
  href?: string;
  label?: string;
  confirm?: ChatConfirm;
}

export interface UseAgentChatOptions {
  systemPrompt?: string;
  onToolCall?: (toolCall: ToolCall) => void;
  onError?: (error: Error) => void;
}

export interface UseAgentChatReturn {
  messages: ChatEntry[];
  isLoading: boolean;
  error: Error | null;
  sendMessage: (content: string, context?: AgentTurnContext) => Promise<ChatResponse | null>;
  pushEntries: (entries: ChatEntry[]) => void;
  clearHistory: () => void;
  setSystemPrompt: (prompt: string) => void;
}

export function createChatId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function useAgentChat(options: UseAgentChatOptions = {}): UseAgentChatReturn {
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const systemPromptRef = useRef<string>(options.systemPrompt || '');
  const messagesRef = useRef<ChatEntry[]>([]);
  messagesRef.current = messages;
  const onToolCall = options.onToolCall;
  const onError = options.onError;

  const setSystemPrompt = useCallback((prompt: string) => {
    systemPromptRef.current = prompt;
  }, []);

  const pushEntries = useCallback((entries: ChatEntry[]) => {
    setMessages((prev) => {
      const next = [...prev, ...entries];
      messagesRef.current = next;
      return next;
    });
  }, []);

  const sendMessage = useCallback(async (content: string, context?: AgentTurnContext) => {
    if (!content.trim()) return null;

    setIsLoading(true);
    setError(null);

    const userEntry: ChatEntry = {
      id: createChatId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    const history = messagesRef.current;
    setMessages((prev) => {
      const next = [...prev, userEntry];
      messagesRef.current = next;
      return next;
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('Not authenticated. Please sign in to use the AI assistant.');
      }

      const apiMessages: ChatMessage[] = [];

      if (systemPromptRef.current) {
        apiMessages.push({
          role: 'system',
          content: systemPromptRef.current,
        });
      }

      history.forEach((msg) => {
        if (msg.role !== 'system') {
          apiMessages.push({
            role: msg.role,
            content: msg.content,
            tool_calls: msg.toolCalls,
          });
        }
      });

      apiMessages.push({
        role: 'user',
        content: content.trim(),
      });

      const response: ChatResponse = await sendAgentMessage(
        apiMessages,
        session.access_token,
        context,
      );

      if (response.tool_calls && response.tool_calls.length > 0) {
        response.tool_calls.forEach((toolCall) => {
          onToolCall?.(toolCall);
        });
      }

      const assistantEntry: ChatEntry = {
        id: createChatId(),
        role: 'assistant',
        content: response.message.content,
        timestamp: new Date(),
        toolCalls: response.tool_calls,
        toolResults: response.tool_results,
      };

      setMessages((prev) => {
        const next = [...prev, assistantEntry];
        messagesRef.current = next;
        return next;
      });
      return response;
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(nextError);
      onError?.(nextError);

      const errorEntry: ChatEntry = {
        id: createChatId(),
        role: 'assistant',
        content: nextError instanceof AgentApiClientError
          ? `Error: ${nextError.message}${nextError.status === 401 ? ' Please sign in again.' : ''}`
          : `Error: ${nextError.message}`,
        timestamp: new Date(),
        isError: true,
      };

      setMessages((prev) => {
        const next = [...prev, errorEntry];
        messagesRef.current = next;
        return next;
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [onError, onToolCall]);

  const clearHistory = useCallback(() => {
    messagesRef.current = [];
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    pushEntries,
    clearHistory,
    setSystemPrompt,
  };
}
