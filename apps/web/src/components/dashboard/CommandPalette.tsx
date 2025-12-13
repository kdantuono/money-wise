/**
 * Command Palette Component
 *
 * Provides a Cmd+K / Ctrl+K command palette for quick navigation
 * and actions within the application.
 *
 * @module components/dashboard/CommandPalette
 */

'use client';

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Home,
  CreditCard,
  Wallet,
  PiggyBank,
  Settings,
  Plus,
  ArrowRight,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface Command {
  id: string;
  label: string;
  description?: string;
  group: string;
  icon?: React.ReactNode;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

// =============================================================================
// Context
// =============================================================================

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

export function useCommandPalette(): CommandPaletteContextValue {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    // Return default context when not wrapped in provider
    return {
      isOpen: false,
      open: () => {},
      close: () => {},
      toggle: () => {},
    };
  }
  return context;
}

// =============================================================================
// Component
// =============================================================================

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Open/close handlers
  const open = useCallback(() => {
    setIsOpen(true);
    setSearch('');
    setSelectedIndex(0);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch('');
    setSelectedIndex(0);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  // Define available commands
  const commands: Command[] = useMemo(
    () => [
      // Navigation
      {
        id: 'go-dashboard',
        label: 'Go to Dashboard',
        description: 'Navigate to the main dashboard',
        group: 'Navigation',
        icon: <Home className="h-4 w-4" />,
        action: () => router.push('/dashboard'),
        keywords: ['home', 'main'],
      },
      {
        id: 'go-transactions',
        label: 'Go to Transactions',
        description: 'View and manage transactions',
        group: 'Navigation',
        icon: <CreditCard className="h-4 w-4" />,
        action: () => router.push('/dashboard/transactions'),
        keywords: ['payments', 'history'],
      },
      {
        id: 'go-accounts',
        label: 'Go to Accounts',
        description: 'Manage your accounts',
        group: 'Navigation',
        icon: <Wallet className="h-4 w-4" />,
        action: () => router.push('/dashboard/accounts'),
        keywords: ['bank', 'balance'],
      },
      {
        id: 'go-budgets',
        label: 'Go to Budgets',
        description: 'View and manage budgets',
        group: 'Navigation',
        icon: <PiggyBank className="h-4 w-4" />,
        action: () => router.push('/dashboard/budgets'),
        keywords: ['spending', 'limits'],
      },
      {
        id: 'go-settings',
        label: 'Go to Settings',
        description: 'Configure your preferences',
        group: 'Navigation',
        icon: <Settings className="h-4 w-4" />,
        action: () => router.push('/dashboard/settings'),
        keywords: ['preferences', 'config'],
      },
      // Actions
      {
        id: 'add-transaction',
        label: 'Add Transaction',
        description: 'Create a new transaction',
        group: 'Actions',
        icon: <Plus className="h-4 w-4" />,
        action: () => router.push('/dashboard/transactions?action=add'),
        keywords: ['new', 'create', 'expense', 'income'],
      },
      {
        id: 'add-account',
        label: 'Add Account',
        description: 'Link a new bank account',
        group: 'Actions',
        icon: <Plus className="h-4 w-4" />,
        action: () => router.push('/dashboard/accounts?action=add'),
        keywords: ['new', 'create', 'link', 'bank'],
      },
      {
        id: 'add-budget',
        label: 'Add Budget',
        description: 'Create a new budget',
        group: 'Actions',
        icon: <Plus className="h-4 w-4" />,
        action: () => router.push('/dashboard/budgets?action=add'),
        keywords: ['new', 'create', 'spending'],
      },
    ],
    [router]
  );

  // Filter commands based on search
  const filteredCommands = useMemo(() => {
    if (!search.trim()) return commands;

    const searchLower = search.toLowerCase();
    return commands.filter((cmd) => {
      const labelMatch = cmd.label.toLowerCase().includes(searchLower);
      const descMatch = cmd.description?.toLowerCase().includes(searchLower);
      const keywordMatch = cmd.keywords?.some((kw) => kw.includes(searchLower));
      return labelMatch || descMatch || keywordMatch;
    });
  }, [commands, search]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.group]) {
        groups[cmd.group] = [];
      }
      groups[cmd.group].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Execute selected command
  const executeCommand = useCallback(
    (command: Command) => {
      command.action();
      close();
    },
    [close]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
        return;
      }

      // Close with Escape
      if (isOpen && e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      // Navigation within palette
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, filteredCommands.length - 1)
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggle, close, selectedIndex, filteredCommands, executeCommand]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const selectedElement = listRef.current.querySelector(
        '[aria-selected="true"]'
      );
      if (selectedElement && typeof selectedElement.scrollIntoView === 'function') {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, selectedIndex]);

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Context value
  const contextValue = useMemo(
    () => ({ isOpen, open, close, toggle }),
    [isOpen, open, close, toggle]
  );

  if (!isOpen) {
    return (
      <CommandPaletteContext.Provider value={contextValue}>
        {null}
      </CommandPaletteContext.Provider>
    );
  }

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={close}
        data-testid="command-palette-backdrop"
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="fixed inset-x-4 top-[15%] z-50 mx-auto max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
          <Search className="h-5 w-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-list"
            aria-autocomplete="list"
            placeholder="Type a command or search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-gray-900 placeholder:text-gray-400
              focus:outline-none text-base"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1
            text-xs font-medium text-gray-500 bg-gray-100 rounded">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div
          ref={listRef}
          id="command-list"
          role="listbox"
          className="max-h-[60vh] overflow-y-auto p-2"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p>No results found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([group, cmds]) => (
              <div key={group} className="mb-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {group}
                </div>
                {cmds.map((cmd) => {
                  const globalIndex = filteredCommands.indexOf(cmd);
                  const isSelected = globalIndex === selectedIndex;

                  return (
                    <div
                      key={cmd.id}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => executeCommand(cmd)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer
                        transition-colors ${
                          isSelected
                            ? 'bg-blue-50 text-blue-900'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      <div
                        className={`p-1.5 rounded-md ${
                          isSelected ? 'bg-blue-100' : 'bg-gray-100'
                        }`}
                      >
                        {cmd.icon || <ArrowRight className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{cmd.label}</p>
                        {cmd.description && (
                          <p className="text-sm text-gray-500 truncate">
                            {cmd.description}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <kbd className="hidden sm:inline-flex px-2 py-0.5 text-xs
                          font-medium text-gray-500 bg-gray-100 rounded">
                          Enter
                        </kbd>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-4 py-2 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">↓</kbd>
              <span className="ml-1">Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Enter</kbd>
              <span className="ml-1">Select</span>
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">Esc</kbd>
            <span className="ml-1">Close</span>
          </span>
        </div>
      </div>
    </CommandPaletteContext.Provider>
  );
}

export default CommandPalette;
