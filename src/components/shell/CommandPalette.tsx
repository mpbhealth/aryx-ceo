import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  LayoutDashboard,
  Terminal,
  Orbit,
  Ticket,
  BarChart3,
  ShieldCheck,
  Settings,
  Map,
  ArrowRight,
  Command,
} from 'lucide-react';
import { useApps } from '@/hooks/useApps';
import { useShell } from './AppShell';
import { useAIAssistant } from '@/providers/AIAssistantProvider';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CommandItem {
  id: string;
  type: 'app' | 'action' | 'entity';
  title: string;
  description?: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  keywords?: string[];
}

/**
 * Icon mapping for commands
 */
const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Terminal,
  Orbit,
  Ticket,
  BarChart3,
  ShieldCheck,
  Settings,
  Map,
  Command,
};

/**
 * CommandPalette - Quick navigation and actions via Cmd+K
 * 
 * Features:
 * - Fuzzy search across apps, actions, and entities
 * - Keyboard navigation
 * - Grouped results by type
 * - Deep linking to any page
 */
export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { openMap } = useShell();
  const { openAssistant } = useAIAssistant();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { apps, isLoading } = useApps();

  // Build command list from apps + static actions
  const commands = useMemo<CommandItem[]>(() => {
    const appCommands: CommandItem[] = apps.map((app) => ({
      id: `app-${app.key}`,
      type: 'app' as const,
      title: app.name,
      description: app.description,
      icon: iconMap[app.icon] || LayoutDashboard,
      href: app.href,
      keywords: [app.key, app.category.toLowerCase()],
    }));

    const staticActions: CommandItem[] = [
      {
        id: 'action-ask-orbit',
        type: 'action',
        title: 'Ask Orbit…',
        description: 'Read live desk facts',
        icon: Orbit,
        keywords: ['orbit', 'assistant', 'ai', 'ask'],
        action: () => {
          onClose();
          openAssistant();
        },
      },
      {
        id: 'action-galaxy-map',
        type: 'action',
        title: 'Open Galaxy Map',
        description: 'View all available apps',
        icon: Map,
        action: () => {
          onClose();
          openMap();
        },
      },
      {
        id: 'action-go-ceo',
        type: 'action',
        title: 'Go to Home',
        description: 'Company operating view',
        icon: LayoutDashboard,
        href: '/home',
      },
      {
        id: 'action-go-inbox',
        type: 'action',
        title: 'Go to Inbox',
        description: 'Connected mailbox',
        icon: Terminal,
        href: '/inbox',
      },
    ];

    return [...appCommands, ...staticActions];
  }, [apps, onClose, openAssistant, openMap]);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter((cmd) => {
      const titleMatch = cmd.title.toLowerCase().includes(lowerQuery);
      const descMatch = cmd.description?.toLowerCase().includes(lowerQuery);
      const keywordMatch = cmd.keywords?.some((k) => k.includes(lowerQuery));
      return titleMatch || descMatch || keywordMatch;
    });
  }, [commands, query]);

  // Group filtered commands by type
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {
      app: [],
      action: [],
      entity: [],
    };

    filteredCommands.forEach((cmd) => {
      groups[cmd.type].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // Handle command execution
  const executeCommand = useCallback(
    (cmd: CommandItem) => {
      onClose();
      if (cmd.href) {
        navigate(cmd.href);
      } else if (cmd.action) {
        cmd.action();
      }
    },
    [navigate, onClose]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = filteredCommands[selectedIndex];
        if (cmd) executeCommand(cmd);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [filteredCommands, selectedIndex, executeCommand, onClose]
  );

  // Don't render if not open (must be after all hooks)
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="command-palette" onClick={onClose}>
        <motion.div
          className="command-palette-content"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.15 }}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search apps, actions, and more..."
              className="flex-1 bg-transparent text-base text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : filteredCommands.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No results found for &ldquo;{query}&rdquo;
              </div>
            ) : (
              <>
                {/* Apps */}
                {groupedCommands.app.length > 0 && (
                  <div className="mb-4">
                    <div className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase">
                      Apps
                    </div>
                    {groupedCommands.app.map((cmd) => {
                      const globalIdx = filteredCommands.indexOf(cmd);
                      return (
                        <CommandRow
                          key={cmd.id}
                          command={cmd}
                          isSelected={globalIdx === selectedIndex}
                          onSelect={() => executeCommand(cmd)}
                          onHover={() => setSelectedIndex(globalIdx)}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Actions */}
                {groupedCommands.action.length > 0 && (
                  <div className="mb-4">
                    <div className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase">
                      Quick Actions
                    </div>
                    {groupedCommands.action.map((cmd) => {
                      const globalIdx = filteredCommands.indexOf(cmd);
                      return (
                        <CommandRow
                          key={cmd.id}
                          command={cmd}
                          isSelected={globalIdx === selectedIndex}
                          onSelect={() => executeCommand(cmd)}
                          onHover={() => setSelectedIndex(globalIdx)}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">↵</kbd>
                <span>Select</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Command className="w-3 h-3" />
              <span>K to toggle</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

/**
 * Individual command row
 */
function CommandRow({
  command,
  isSelected,
  onSelect,
  onHover,
}: {
  command: CommandItem;
  isSelected: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const Icon = command.icon;

  return (
    <button
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left
        transition-colors duration-100
        ${isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}
      `}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      <div
        className={`
          w-9 h-9 rounded-lg flex items-center justify-center
          ${isSelected ? 'bg-primary/20' : 'bg-slate-100 dark:bg-slate-800'}
        `}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
          {command.title}
        </div>
        {command.description && (
          <div className="text-xs text-slate-500 truncate">{command.description}</div>
        )}
      </div>
      {isSelected && <ArrowRight className="w-4 h-4 text-primary" />}
    </button>
  );
}

