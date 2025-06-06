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
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '6px',
        color: '#dc2626',
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
            color: '#dc2626',
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