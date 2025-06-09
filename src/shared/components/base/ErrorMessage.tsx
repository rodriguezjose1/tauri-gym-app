import React from 'react';
import './ErrorMessage.css';

interface ErrorMessageProps {
  message: string | null;
  onDismiss?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  message, 
  onDismiss, 
  className,
  style 
}) => {
  if (!message) return null;

  const errorClasses = `error-message ${className || ''}`.trim();

  return (
    <div 
      className={errorClasses}
      style={style}
    >
      <span className="error-message-text">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="error-message-close"
          title="Cerrar mensaje de error"
        >
          ×
        </button>
      )}
    </div>
  );
}; 