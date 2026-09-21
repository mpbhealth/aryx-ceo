import { useEffect, useState, useCallback } from 'react';
import { X, Keyboard } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
}

const shortcuts: { category: string; items: Shortcut[] }[] = [
  {
    category: 'Navigation',
    items: [
      { keys: ['Ctrl', 'K'], description: 'Open Command Palette' },
      { keys: ['Ctrl', 'Shift', 'A'], description: 'Toggle Orbit' },
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: ['Esc'], description: 'Close modals / panels' },
    ],
  },
  {
    category: 'Sidebar',
    items: [
      { keys: ['\u2191', '\u2193'], description: 'Navigate menu items' },
      { keys: ['\u2192'], description: 'Expand submenu' },
      { keys: ['\u2190'], description: 'Collapse submenu' },
      { keys: ['Enter'], description: 'Select menu item' },
      { keys: ['Home'], description: 'Jump to first item' },
      { keys: ['End'], description: 'Jump to last item' },
    ],
  },
  {
    category: 'AI Assistant',
    items: [
      { keys: ['\u2191'], description: 'Previous message in history' },
      { keys: ['\u2193'], description: 'Next message in history' },
      { keys: ['Enter'], description: 'Send message' },
    ],
  },
];

function isMac() {
  return typeof navigator !== 'undefined' && navigator.platform?.includes('Mac');
}

function formatKey(key: string): string {
  if (key === 'Ctrl') return isMac() ? '\u2318' : 'Ctrl';
  if (key === 'Shift') return isMac() ? '\u21E7' : 'Shift';
  if (key === 'Alt') return isMac() ? '\u2325' : 'Alt';
  return key;
}

export function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger when typing in inputs
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement ||
      e.target instanceof HTMLSelectElement ||
      (e.target as HTMLElement)?.isContentEditable
    ) {
      return;
    }

    if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setIsOpen(prev => !prev);
    }

    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="cos-modal bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        role="dialog"
        aria-label="Keyboard shortcuts"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {shortcuts.map((group) => (
            <div key={group.category}>
              <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                {group.category}
              </h3>
              <div className="space-y-2">
                {group.items.map((shortcut, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, j) => (
                        <span key={j} className="flex items-center gap-1">
                          {j > 0 && (
                            <span className="text-xs text-slate-400">+</span>
                          )}
                          <kbd className="px-2 py-1 text-xs font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 min-w-[24px] text-center">
                            {formatKey(key)}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <p className="text-xs text-slate-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-xs font-mono">?</kbd> to toggle this dialog
          </p>
        </div>
      </div>
    </div>
  );
}

export default KeyboardShortcutsModal;
