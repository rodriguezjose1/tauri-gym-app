import { useState } from 'react';

interface ConfirmModalData {
  title?: string;
  message: string;
  confirmText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  type?: 'warning' | 'info' | 'success' | 'error';
}

export const useConfirmModal = () => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<ConfirmModalData>({ 
    message: '', 
    onConfirm: () => {} 
  });

  const showConfirm = (message: string, options?: { 
    title?: string; 
    confirmText?: string;
    type?: 'warning' | 'info' | 'success' | 'error';
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      const handleConfirm = () => {
        setShowConfirmModal(false);
        resolve(true);
      };
      
      const handleCancel = () => {
        setShowConfirmModal(false);
        resolve(false);
      };
      
      setConfirmModalData({
        message,
        title: options?.title,
        confirmText: options?.confirmText,
        type: options?.type || 'warning',
        onConfirm: handleConfirm,
        onCancel: handleCancel
      });
      setShowConfirmModal(true);
    });
  };

  const closeConfirmModal = () => {
    setShowConfirmModal(false);
  };

  return {
    showConfirmModal,
    confirmModalData,
    showConfirm,
    closeConfirmModal,
    setShowConfirmModal
  };
}; 