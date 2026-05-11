import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './CustomSelect.css';

export interface CustomSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  options: CustomSelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  size?: 'sm' | 'md';
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Select...',
  size = 'md',
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const selectedIndex = useMemo(
    () => options.findIndex(option => option.value === value),
    [options, value]
  );
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const firstEnabledIndex = () => options.findIndex(option => !option.disabled);

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const maxMenuHeight = 260;
    const gap = 4;
    const edgePadding = 8;
    const spaceBelow = window.innerHeight - rect.bottom - edgePadding;
    const spaceAbove = rect.top - edgePadding;
    const openUpward = spaceBelow < 180 && spaceAbove > spaceBelow;
    const availableHeight = Math.max(120, Math.min(maxMenuHeight, (openUpward ? spaceAbove : spaceBelow) - gap));

    setMenuStyle({
      position: 'fixed',
      left: rect.left,
      top: openUpward ? rect.top - availableHeight - gap : rect.bottom + gap,
      width: rect.width,
      maxHeight: availableHeight,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    const nextIndex = selectedIndex >= 0 && !options[selectedIndex]?.disabled
      ? selectedIndex
      : firstEnabledIndex();
    setHighlightedIndex(nextIndex);
    updateMenuPosition();

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setIsOpen(false);
    };

    const handleLayoutChange = () => updateMenuPosition();

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', handleLayoutChange);
    window.addEventListener('scroll', handleLayoutChange, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', handleLayoutChange);
      window.removeEventListener('scroll', handleLayoutChange, true);
    };
  }, [isOpen, options, selectedIndex]);

  const selectOption = (option: CustomSelectOption) => {
    if (option.disabled) return;
    onChange(option.value);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const moveHighlight = (direction: 1 | -1) => {
    if (options.length === 0) return;

    let nextIndex = highlightedIndex;
    for (let i = 0; i < options.length; i += 1) {
      nextIndex = (nextIndex + direction + options.length) % options.length;
      if (!options[nextIndex].disabled) {
        setHighlightedIndex(nextIndex);
        return;
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        moveHighlight(1);
      }
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        moveHighlight(-1);
      }
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const option = options[highlightedIndex];
      if (option) {
        selectOption(option);
      }
      return;
    }

    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const menu = isOpen ? createPortal(
    <div ref={menuRef} className="custom-select-menu" style={menuStyle} role="listbox">
      {options.length === 0 ? (
        <div className="custom-select-empty">{placeholder}</div>
      ) : (
        options.map((option, index) => (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={option.value === value}
            className={`custom-select-option ${option.value === value ? 'selected' : ''} ${index === highlightedIndex ? 'highlighted' : ''}`}
            disabled={option.disabled}
            onMouseEnter={() => setHighlightedIndex(index)}
            onClick={() => selectOption(option)}
          >
            <span>{option.label}</span>
          </button>
        ))
      )}
    </div>,
    document.body
  ) : null;

  return (
    <div
      ref={rootRef}
      className={`custom-select custom-select-${size} ${isOpen ? 'open' : ''}`}
      onKeyDown={handleKeyDown}
    >
      <button
        ref={triggerRef}
        type="button"
        className="custom-select-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => {
          if (!disabled) {
            setIsOpen(open => !open);
          }
        }}
      >
        <span className={`custom-select-value ${selectedOption ? '' : 'placeholder'}`}>
          {selectedOption?.label || placeholder}
        </span>
        <span className="custom-select-arrow" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {menu}
    </div>
  );
};
