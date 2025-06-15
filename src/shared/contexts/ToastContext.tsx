import React, { createContext, useContext } from 'react';
import { useToastNotifications } from '../hooks/useToastNotifications';

const ToastContext = createContext<ReturnType<typeof useToastNotifications> | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const toastNotifications = useToastNotifications();

  return (
    <ToastContext.Provider value={toastNotifications}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}; 