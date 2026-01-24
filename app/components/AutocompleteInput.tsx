'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

export interface AutocompleteOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface BaseProps {
  options: AutocompleteOption[];
  placeholder?: string;
  label?: string;
  className?: string;
}

interface SingleProps extends BaseProps {
  multi?: false;
  value: string;
  onChange: (value: string) => void;
}

interface MultiProps extends BaseProps {
  multi: true;
  value: string[];
  onChange: (value: string[]) => void;
}

type AutocompleteInputProps = SingleProps | MultiProps;

export default function AutocompleteInput(props: AutocompleteInputProps) {
  const { options, placeholder, label, className, multi } = props;

  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // For single mode, sync input with value
  useEffect(() => {
    if (!multi) {
      setInputValue((props as SingleProps).value);
    }
  }, [multi, (props as SingleProps).value]);

  const filteredOptions = inputValue.trim().length > 0
    ? options.filter(opt => {
        const query = inputValue.toLowerCase();
        const matchesLabel = opt.label.toLowerCase().includes(query);
        const matchesSublabel = opt.sublabel?.toLowerCase().includes(query);
        // In multi mode, exclude already selected values
        if (multi) {
          const selected = (props as MultiProps).value;
          return (matchesLabel || matchesSublabel) && !selected.includes(opt.value);
        }
        return matchesLabel || matchesSublabel;
      }).slice(0, 8)
    : [];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setHighlightedIndex(-1);
    setIsOpen(val.trim().length > 0);

    // For single mode, update value as user types (allows custom entries)
    if (!multi) {
      (props as SingleProps).onChange(val);
    }
  };

  const selectOption = useCallback((option: AutocompleteOption) => {
    if (multi) {
      const current = (props as MultiProps).value;
      if (!current.includes(option.value)) {
        (props as MultiProps).onChange([...current, option.value]);
      }
      setInputValue('');
    } else {
      (props as SingleProps).onChange(option.value);
      setInputValue(option.label);
    }
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [multi, props]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || filteredOptions.length === 0) {
      // In multi mode, Enter with text adds custom entry
      if (e.key === 'Enter' && multi && inputValue.trim()) {
        e.preventDefault();
        const current = (props as MultiProps).value;
        const trimmed = inputValue.trim();
        if (!current.includes(trimmed)) {
          (props as MultiProps).onChange([...current, trimmed]);
        }
        setInputValue('');
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          selectOption(filteredOptions[highlightedIndex]);
        } else if (multi && inputValue.trim()) {
          // Add custom value
          const current = (props as MultiProps).value;
          const trimmed = inputValue.trim();
          if (!current.includes(trimmed)) {
            (props as MultiProps).onChange([...current, trimmed]);
          }
          setInputValue('');
          setIsOpen(false);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const removeTag = (val: string) => {
    if (multi) {
      (props as MultiProps).onChange(
        (props as MultiProps).value.filter(v => v !== val)
      );
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleBlur = () => {
    // Delay to allow click on dropdown items
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }, 150);
  };

  return (
    <div ref={containerRef} className={`relative ${className || ''}`}>
      {label && (
        <label className="block text-sm font-medium text-primary-700 dark:text-primary-300 mb-2">
          {label}
        </label>
      )}

      {/* Multi mode: tags */}
      {multi && (props as MultiProps).value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {(props as MultiProps).value.map(val => (
            <span
              key={val}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-100 dark:bg-accent-900/30 text-accent-800 dark:text-accent-200 rounded text-sm"
            >
              {val}
              <button
                type="button"
                onClick={() => removeTag(val)}
                className="text-accent-600 dark:text-accent-400 hover:text-accent-800 dark:hover:text-accent-200"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (inputValue.trim()) setIsOpen(true); }}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="input-primary"
        autoComplete="off"
      />

      {/* Dropdown */}
      {isOpen && filteredOptions.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 max-h-48 overflow-y-auto bg-white dark:bg-primary-800 border border-primary-200 dark:border-primary-700 rounded-lg shadow-lg"
        >
          {filteredOptions.map((opt, idx) => (
            <li
              key={opt.value}
              onMouseDown={(e) => { e.preventDefault(); selectOption(opt); }}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={`px-3 py-2 cursor-pointer text-sm ${
                idx === highlightedIndex
                  ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-900 dark:text-accent-100'
                  : 'text-primary-800 dark:text-primary-200 hover:bg-primary-50 dark:hover:bg-primary-700'
              }`}
            >
              <span>{opt.label}</span>
              {opt.sublabel && (
                <span className="ml-2 text-xs text-primary-500 dark:text-primary-400">
                  {opt.sublabel}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Hint for multi mode with custom input */}
      {multi && isOpen && inputValue.trim() && filteredOptions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 px-3 py-2 bg-white dark:bg-primary-800 border border-primary-200 dark:border-primary-700 rounded-lg shadow-lg">
          <p className="text-sm text-primary-500 dark:text-primary-400">
            Press <kbd className="px-1 py-0.5 bg-primary-100 dark:bg-primary-700 rounded text-xs">Enter</kbd> to add &quot;{inputValue.trim()}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
