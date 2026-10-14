import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './Input';
import './SearchInput.css';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder: string;
  ariaLabel: string;
  clearLabel?: string;
  disabled?: boolean;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onClear,
  placeholder,
  ariaLabel,
  clearLabel = 'Limpiar búsqueda',
  disabled = false,
  className = '',
}) => (
  <div className={`ui-search-input ${className}`.trim()}>
    <Input
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      leftIcon={<Search size={17} aria-hidden="true" />}
      disabled={disabled}
      fullWidth
    />
    {value && (
      <button
        type="button"
        className="ui-search-input__clear"
        onClick={onClear ?? (() => onChange(''))}
        aria-label={clearLabel}
        disabled={disabled}
      >
        <X size={17} aria-hidden="true" />
      </button>
    )}
  </div>
);
