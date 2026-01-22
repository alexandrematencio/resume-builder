'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, ChevronDown, Search, Check } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface Props {
  options: SelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  label?: string;
  maxDisplayedOptions?: number;
  disabled?: boolean;
  className?: string;
}

export default function SearchableMultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select items...',
  searchPlaceholder = 'Search...',
  emptyMessage = 'No items found',
  label,
  maxDisplayedOptions = 100,
  disabled = false,
  className = '',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return options.slice(0, maxDisplayedOptions);

    return options
      .filter(option =>
        option.label.toLowerCase().includes(query) ||
        (option.sublabel && option.sublabel.toLowerCase().includes(query))
      )
      .slice(0, maxDisplayedOptions);
  }, [options, searchQuery, maxDisplayedOptions]);

  // Get selected options for display
  const selectedOptions = useMemo(() => {
    return selected
      .map(value => options.find(opt => opt.value === value))
      .filter((opt): opt is SelectOption => opt !== undefined);
  }, [selected, options]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Reset highlighted index when filtered options change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredOptions]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const toggleOption = useCallback((value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value));
    } else {
      onChange([...selected, value]);
    }
  }, [selected, onChange]);

  const removeOption = useCallback((value: string, event: React.MouseEvent) => {
    event.stopPropagation();
    onChange(selected.filter(v => v !== value));
  }, [selected, onChange]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
        event.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          toggleOption(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setSearchQuery('');
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchQuery('');
        break;
    }
  }, [isOpen, filteredOptions, highlightedIndex, toggleOption]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setHighlightedIndex(0);
  }, []);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
          {label}
        </label>
      )}

      {/* Main container / trigger */}
      <div
        className={`
          min-h-[48px] px-3 py-2 rounded-lg
          bg-white dark:bg-primary-800
          border border-primary-200 dark:border-primary-600
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isOpen ? 'ring-2 ring-accent-500 border-accent-500' : 'hover:border-primary-300 dark:hover:border-primary-500'}
          transition-all duration-200
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-disabled={disabled}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 flex flex-wrap gap-1.5">
            {selectedOptions.length === 0 ? (
              <span className="text-primary-400 dark:text-primary-500 py-0.5">
                {placeholder}
              </span>
            ) : (
              selectedOptions.map(option => (
                <span
                  key={option.value}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-100 dark:bg-primary-700 text-primary-800 dark:text-primary-200 rounded-md text-sm"
                >
                  {option.label}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => removeOption(option.value, e)}
                      className="hover:text-error-500 dark:hover:text-error-400 transition-colors focus:outline-none"
                      aria-label={`Remove ${option.label}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              ))
            )}
          </div>
          <ChevronDown
            className={`w-5 h-5 text-primary-400 dark:text-primary-500 transition-transform flex-shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div
          className="absolute z-50 w-full mt-1 bg-white dark:bg-primary-800 border border-primary-200 dark:border-primary-600 rounded-lg shadow-lg overflow-hidden"
          role="listbox"
        >
          {/* Search input */}
          <div className="p-2 border-b border-primary-200 dark:border-primary-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 dark:text-primary-500" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 bg-primary-50 dark:bg-primary-700 border border-primary-200 dark:border-primary-600 rounded-md text-sm text-primary-900 dark:text-primary-100 placeholder:text-primary-400 dark:placeholder:text-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
              />
            </div>
          </div>

          {/* Options list */}
          <div
            ref={listRef}
            className="max-h-60 overflow-y-auto"
            role="listbox"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-primary-500 dark:text-primary-400">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = selected.includes(option.value);
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={option.value}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors
                      ${isHighlighted ? 'bg-primary-100 dark:bg-primary-700' : ''}
                      ${isSelected ? 'bg-accent-50 dark:bg-accent-900/20' : ''}
                      hover:bg-primary-100 dark:hover:bg-primary-700
                    `}
                    onClick={() => toggleOption(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div
                      className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                        ${isSelected
                          ? 'bg-accent-500 border-accent-500 text-white'
                          : 'border-primary-300 dark:border-primary-500'}
                      `}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-primary-900 dark:text-primary-100 truncate">
                        {option.label}
                      </div>
                      {option.sublabel && (
                        <div className="text-xs text-primary-500 dark:text-primary-400 truncate">
                          {option.sublabel}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected count */}
          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-primary-200 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-primary-600 dark:text-primary-400">
                  {selected.length} selected
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([]);
                  }}
                  className="text-error-600 dark:text-error-400 hover:text-error-700 dark:hover:text-error-300 font-medium"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
