'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * AddAccountDropdown Component
 *
 * A unified dropdown button with two options:
 * - Manual Account: Opens form to create cash/portfolio/custom accounts
 * - Link Bank Account: Triggers SaltEdge OAuth flow
 *
 * @example
 * <AddAccountDropdown
 *   onManualAccount={() => setShowManualForm(true)}
 *   onLinkBank={() => initiateBankLink()}
 * />
 */

interface AddAccountDropdownProps {
  /** Called when user selects "Manual Account" option */
  onManualAccount: () => void;
  /** Called when user selects "Link Bank Account" option */
  onLinkBank: () => void;
  /** Optional CSS classes for the container */
  className?: string;
  /** Disable the dropdown button */
  disabled?: boolean;
  /** Show loading state (when bank linking is in progress) */
  isLinking?: boolean;
}

export function AddAccountDropdown({
  onManualAccount,
  onLinkBank,
  className = '',
  disabled = false,
  isLinking = false,
}: AddAccountDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const menuItems = [
    {
      id: 'manual',
      label: 'Manual Account',
      description: 'Cash, portfolio, or custom account',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      ),
      action: onManualAccount,
    },
    {
      id: 'bank',
      label: 'Link Bank Account',
      description: 'Connect via SaltEdge',
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
          />
        </svg>
      ),
      action: onLinkBank,
    },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen) {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
          event.preventDefault();
          setIsOpen(true);
          setFocusedIndex(0);
        }
        return;
      }

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          buttonRef.current?.focus();
          break;
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) =>
            prev < menuItems.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) =>
            prev > 0 ? prev - 1 : menuItems.length - 1
          );
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < menuItems.length) {
            handleSelectItem(menuItems[focusedIndex]);
          }
          break;
        case 'Tab':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    },
    [isOpen, focusedIndex, menuItems]
  );

  // Focus menu item when focusedIndex changes
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && menuRef.current) {
      const items = menuRef.current.querySelectorAll('[role="menuitem"]');
      const item = items[focusedIndex] as HTMLElement;
      item?.focus();
    }
  }, [isOpen, focusedIndex]);

  const handleSelectItem = (item: (typeof menuItems)[0]) => {
    setIsOpen(false);
    setFocusedIndex(-1);
    item.action();
  };

  const toggleDropdown = () => {
    if (disabled || isLinking) return;
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setFocusedIndex(-1);
    }
  };

  const isButtonDisabled = disabled || isLinking;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Dropdown Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        disabled={isButtonDisabled}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Add Account"
        className={`
          inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg
          font-medium text-sm transition-colors duration-200
          ${
            isButtonDisabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500'
          }
        `}
      >
        {isLinking ? (
          <svg
            className="w-4 h-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        )}
        Add Account
        {/* Chevron Icon */}
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="add-account-menu"
          onKeyDown={handleKeyDown}
          className="
            absolute right-0 z-50 mt-2 w-72
            origin-top-right rounded-lg bg-white
            shadow-lg ring-1 ring-black ring-opacity-5
            focus:outline-none
          "
        >
          <div className="py-1">
            {menuItems.map((item, index) => (
              <button
                key={item.id}
                role="menuitem"
                tabIndex={focusedIndex === index ? 0 : -1}
                onClick={() => handleSelectItem(item)}
                onMouseEnter={() => setFocusedIndex(index)}
                aria-label={item.label}
                className={`
                  w-full flex items-start gap-3 px-4 py-3 text-left
                  transition-colors duration-150
                  ${
                    focusedIndex === index
                      ? 'bg-blue-50 text-blue-900'
                      : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <span
                  className={`
                    flex-shrink-0 mt-0.5
                    ${focusedIndex === index ? 'text-blue-600' : 'text-gray-400'}
                  `}
                >
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AddAccountDropdown;
