import React from 'react';
import './Input.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'primary' | 'success';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  variant = 'default',
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const containerClass = [
    'ui-input-container',
    fullWidth ? 'ui-input-container--full-width' : '',
    error ? 'ui-input-container--error' : '',
    className
  ].filter(Boolean).join(' ');

  const inputClass = [
    'ui-input',
    `ui-input--${variant}`,
    leftIcon ? 'ui-input--with-left-icon' : '',
    rightIcon ? 'ui-input--with-right-icon' : '',
    error ? 'ui-input--error' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClass}>
      {label && (
        <label htmlFor={inputId} className="ui-input-label">
          {label}
        </label>
      )}
      
      <div className="ui-input-wrapper">
        {leftIcon && (
          <div className="ui-input-icon ui-input-icon--left">
            {leftIcon}
          </div>
        )}
        
        <input
          id={inputId}
          className={inputClass}
          {...props}
        />
        
        {rightIcon && (
          <div className="ui-input-icon ui-input-icon--right">
            {rightIcon}
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <div className={`ui-input-message ${error ? 'ui-input-message--error' : 'ui-input-message--helper'}`}>
          {error || helperText}
        </div>
      )}
    </div>
  );
}; 