import React from 'react';
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
  const containerClasses = [
    'ui-select-container',
    fullWidth ? 'ui-select-container--full-width' : '',
  ].filter(Boolean).join(' ');

  const selectClasses = [
    'ui-select-native',
    `ui-select-native--${variant}`,
    `ui-select-native--${size}`,
    error ? 'ui-select-native--error' : '',
    disabled ? 'ui-select-native--disabled' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {label && (
        <label className="ui-select-label">
          {label}
        </label>
      )}
      
      <div className="ui-select-wrapper">
        <select
          className={selectClasses}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        <span className="ui-select-arrow">▼</span>
      </div>

      {helperText && (
        <p className={`ui-select-helper ${error ? 'ui-select-helper--error' : ''}`}>
          {helperText}
        </p>
      )}
    </div>
  );
}; 