import React from 'react';
import ToastNotificationComponent, { ToastNotification } from './ToastNotification';

interface ToastContainerProps {
  notifications: ToastNotification[];
  onRemoveNotification: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ notifications, onRemoveNotification }) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'none'
      }}
    >
      {notifications.map((notification) => (
        <div
          key={notification.id}
          style={{ pointerEvents: 'auto' }}
        >
          <ToastNotificationComponent
            notification={notification}
            onRemove={onRemoveNotification}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer; 