import React from 'react';

export interface InfoModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  title,
  message,
  buttonText = "Aceptar",
  onClose,
  type = 'info'
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#dcfce7',
          color: '#16a34a',
          icon: '✅',
          defaultTitle: 'Éxito'
        };
      case 'warning':
        return {
          backgroundColor: '#fef3c7',
          color: '#d97706',
          icon: '⚠️',
          defaultTitle: 'Advertencia'
        };
      case 'error':
        return {
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          icon: '❌',
          defaultTitle: 'Error'
        };
      default: // info
        return {
          backgroundColor: '#dbeafe',
          color: '#1d4ed8',
          icon: 'ℹ️',
          defaultTitle: 'Información'
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: typeStyles.backgroundColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '16px'
          }}>
            <span style={{ fontSize: '24px', color: typeStyles.color }}>{typeStyles.icon}</span>
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {title || typeStyles.defaultTitle}
            </h3>
          </div>
        </div>
        
        <p style={{
          margin: '0 0 24px 0',
          color: '#6b7280',
          lineHeight: '1.5'
        }}>
          {message}
        </p>
        
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
}; 