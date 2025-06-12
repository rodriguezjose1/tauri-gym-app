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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
    <div className={containerClasses} ref={dropdownRef}>
      {label && (
        <label className="ui-select-label">
          {label}
        </label>
      )}
      
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
        <div className="ui-select-dropdown">
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

      {helperText && (
        <p className={`ui-select-helper ${error ? 'ui-select-helper--error' : ''}`}>
          {helperText}
        </p>
      )}
    </div>
  );
}; 