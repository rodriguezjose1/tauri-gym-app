import React, { useEffect, useState } from 'react';

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastNotificationProps {
  notification: ToastNotification;
  onRemove: (id: string) => void;
}

const ToastNotificationComponent: React.FC<ToastNotificationProps> = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    
    // Auto-remove after duration
    const duration = notification.duration || 4000;
    const removeTimer = setTimeout(() => {
      handleRemove();
    }, duration);

    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, []);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 300);
  };

  const getTypeStyles = () => {
    switch (notification.type) {
      case 'success':
        return {
          backgroundColor: '#10b981',
          borderColor: '#059669',
          icon: '✓'
        };
      case 'error':
        return {
          backgroundColor: '#ef4444',
          borderColor: '#dc2626',
          icon: '✕'
        };
      case 'warning':
        return {
          backgroundColor: '#f59e0b',
          borderColor: '#d97706',
          icon: '⚠'
        };
      case 'info':
        return {
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          icon: 'ℹ'
        };
      default:
        return {
          backgroundColor: '#6b7280',
          borderColor: '#4b5563',
          icon: 'ℹ'
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <div
      style={{
        position: 'relative',
        backgroundColor: 'white',
        border: `2px solid ${typeStyles.borderColor}`,
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        minWidth: '300px',
        maxWidth: '400px',
        transform: isRemoving 
          ? 'translateX(100%) scale(0.8)' 
          : isVisible 
            ? 'translateX(0) scale(1)' 
            : 'translateX(100%) scale(0.8)',
        opacity: isRemoving ? 0 : isVisible ? 1 : 0,
        transition: 'all 0.3s ease-in-out',
        cursor: 'pointer'
      }}
      onClick={handleRemove}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div
          style={{
            backgroundColor: typeStyles.backgroundColor,
            color: 'white',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 'bold',
            flexShrink: 0
          }}
        >
          {typeStyles.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#1f2937',
            lineHeight: '1.4',
            wordBreak: 'break-word'
          }}>
            {notification.message}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default ToastNotificationComponent; 