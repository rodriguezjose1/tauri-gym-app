import React from 'react';

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

  return (
    <div 
      className={className}
      style={{
        padding: '8px 12px',
        backgroundColor: 'var(--error-bg)',
        border: '1px solid var(--error-border)',
        borderRadius: '6px',
        color: 'var(--error-color)',
        fontSize: '14px',
        marginBottom: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        ...style
      }}
    >
      <span>{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--error-color)',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0 4px',
            marginLeft: '8px'
          }}
          title="Cerrar mensaje de error"
        >
          ×
        </button>
      )}
    </div>
  );
}; 