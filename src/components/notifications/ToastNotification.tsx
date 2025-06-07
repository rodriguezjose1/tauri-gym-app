import React, { useState, useEffect } from 'react';
import '../../styles/ToastNotification.css';

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
    // Show animation
    const showTimer = setTimeout(() => setIsVisible(true), 10);
    
    // Auto-remove timer
    const removeTimer = setTimeout(() => {
      handleRemove();
    }, notification.duration || 5000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(removeTimer);
    };
  }, [notification.duration]);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 300);
  };

  const getTypeIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
      default:
        return 'ℹ';
    }
  };

  const getToastClasses = () => {
    let classes = 'toast-notification';
    classes += ` ${notification.type}`;
    
    if (isRemoving) {
      classes += ' removing';
    } else if (isVisible) {
      classes += ' visible';
    } else {
      classes += ' hidden';
    }
    
    return classes;
  };

  return (
    <div
      className={getToastClasses()}
      onClick={handleRemove}
    >
      <div className="toast-notification-content">
        <div className={`toast-notification-icon ${notification.type}`}>
          {getTypeIcon()}
        </div>
        <div className="toast-notification-message">
          <p className="toast-notification-text">
            {notification.message}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleRemove();
          }}
          className="toast-notification-close"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default ToastNotificationComponent; 