import React from 'react';
import ToastNotificationComponent, { ToastNotification } from './ToastNotification';
import '../../../styles/ToastContainer.css';

interface ToastContainerProps {
  notifications: ToastNotification[];
  onRemoveNotification: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ notifications, onRemoveNotification }) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="toast-container">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="toast-container-item"
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