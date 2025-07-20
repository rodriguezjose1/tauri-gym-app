import React, { useState, useRef, useEffect } from 'react';
import './Select.css';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  variant?: 'default' | 'primary';
  size?: 'sm' | 'md' | 'lg';
  error?: boolean;
  helperText?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  disabled = false,
  fullWidth = false,
  variant = 'default',
  size = 'md',
  error = false,
  helperText
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<SelectOption | null>(
    options.find(option => option.value === value) || null
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const option = options.find(option => option.value === value);
    setSelectedOption(option || null);
  }, [value, options]);

  // Remove overflow hidden from parent containers when dropdown is open
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      // Find parent containers that might have overflow hidden
      const parentContainers: HTMLElement[] = [];
      let parent = buttonRef.current.parentElement;
      
      while (parent) {
        const style = window.getComputedStyle(parent);
        if (style.overflow === 'hidden' || style.overflowY === 'hidden') {
          parentContainers.push(parent);
          parent.style.overflow = 'visible';
          parent.style.overflowY = 'visible';
        }
        parent = parent.parentElement;
      }

      // Restore overflow when dropdown closes
      return () => {
        parentContainers.forEach(container => {
          container.style.overflow = '';
          container.style.overflowY = '';
        });
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if clicking on the button itself
      if (buttonRef.current && buttonRef.current.contains(event.target as Node)) {
        return;
      }
      
      // Don't close if clicking inside the dropdown
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
        return;
      }
      
      // Close if clicking outside both button and dropdown
      setIsOpen(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionSelect = (option: SelectOption) => {
    if (!option.disabled) {
      setSelectedOption(option);
      onChange(option.value);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        }
        break;
    }
  };

  const containerClasses = [
    'ui-select-container',
    fullWidth ? 'ui-select-container--full-width' : '',
    isOpen ? 'ui-select-container--open' : '',
  ].filter(Boolean).join(' ');

  const buttonClasses = [
    'ui-select-button',
    `ui-select-button--${variant}`,
    `ui-select-button--${size}`,
    error ? 'ui-select-button--error' : '',
    disabled ? 'ui-select-button--disabled' : '',
    isOpen ? 'ui-select-button--open' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {label && (
        <label className="ui-select-label">
          {label}
        </label>
      )}
      
      <div style={{ position: 'relative' }}>
        <button
          ref={buttonRef}
          type="button"
          className={buttonClasses}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={label ? undefined : 'select-button'}
        >
          <span className="ui-select-value">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <span className={`ui-select-arrow ${isOpen ? 'ui-select-arrow--open' : ''}`}>
            ▼
          </span>
        </button>

        {isOpen && (
          <div 
            className="ui-select-dropdown" 
            ref={dropdownRef}
          >
            <ul className="ui-select-options" role="listbox">
              {options.map((option) => (
                <li
                  key={option.value}
                  className={`ui-select-option ${
                    option.disabled ? 'ui-select-option--disabled' : ''
                  } ${
                    selectedOption?.value === option.value ? 'ui-select-option--selected' : ''
                  }`}
                  onClick={() => handleOptionSelect(option)}
                  role="option"
                  aria-selected={selectedOption?.value === option.value}
                >
                  {option.label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {helperText && (
        <p className={`ui-select-helper ${error ? 'ui-select-helper--error' : ''}`}>
          {helperText}
        </p>
      )}
    </div>
  );
}; 