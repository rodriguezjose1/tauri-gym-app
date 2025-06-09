import React from 'react';
import './Button.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseClass = 'ui-button';
  const variantClass = `ui-button--${variant}`;
  const sizeClass = `ui-button--${size}`;
  const fullWidthClass = fullWidth ? 'ui-button--full-width' : '';
  const loadingClass = loading ? 'ui-button--loading' : '';
  
  const classes = [
    baseClass,
    variantClass,
    sizeClass,
    fullWidthClass,
    loadingClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="ui-button__spinner">⏳</span>}
      <span className={loading ? 'ui-button__content--loading' : 'ui-button__content'}>
        {children}
      </span>
    </button>
  );
}; 