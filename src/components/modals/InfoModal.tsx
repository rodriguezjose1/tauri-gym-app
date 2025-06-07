import React from 'react';

interface InfoModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  isOpen,
  title,
  message,
  type = 'info',
  onClose
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    info: {
      backgroundColor: 'var(--info-color)',
      color: 'white',
      icon: 'ℹ️',
      defaultTitle: 'Información'
    },
    success: {
      backgroundColor: 'var(--success-color)',
      color: 'white',
      icon: '✅',
      defaultTitle: 'Éxito'
    },
    warning: {
      backgroundColor: 'var(--warning-color)',
      color: 'white',
      icon: '⚠️',
      defaultTitle: 'Advertencia'
    },
    error: {
      backgroundColor: 'var(--error-color)',
      color: 'white',
      icon: '❌',
      defaultTitle: 'Error'
    }
  };

  const currentTypeStyle = typeStyles[type];

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

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
    }} onClick={handleOverlayClick}>
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 20px 25px -5px var(--shadow-medium), 0 10px 10px -5px var(--shadow-light)',
        border: '1px solid var(--border-color)'
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
            backgroundColor: currentTypeStyle.backgroundColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '16px'
          }}>
            <span style={{ fontSize: '24px', color: currentTypeStyle.color }}>{currentTypeStyle.icon}</span>
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: 'var(--text-primary)'
            }}>
              {title || currentTypeStyle.defaultTitle}
            </h3>
          </div>
        </div>
        
        <p style={{
          margin: '0 0 24px 0',
          color: 'var(--text-secondary)',
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
              backgroundColor: 'var(--accent-primary)',
              border: '1px solid var(--accent-primary)',
              borderRadius: '6px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}; 