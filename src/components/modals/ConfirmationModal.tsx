import React from 'react';
import '../../styles/ConfirmationModal.css';

interface ConfirmationModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  type?: 'warning' | 'info' | 'success' | 'error';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = "Confirmar",
  type = "warning",
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    warning: {
      icon: '⚠️',
      defaultTitle: 'Advertencia'
    },
    info: {
      icon: 'ℹ️',
      defaultTitle: 'Información'
    },
    success: {
      icon: '✅',
      defaultTitle: 'Éxito'
    },
    error: {
      icon: '❌',
      defaultTitle: 'Error'
    }
  };

  const currentTypeStyle = typeStyles[type];

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="confirmation-modal-overlay" onClick={handleOverlayClick}>
      <div className="confirmation-modal-content">
        <div className="confirmation-modal-header">
          <div className={`confirmation-modal-icon-container ${type}`}>
            <span className={`confirmation-modal-icon ${type}`}>
              {currentTypeStyle.icon}
            </span>
          </div>
          <div>
            <h3 className="confirmation-modal-title">
              {title || currentTypeStyle.defaultTitle}
            </h3>
          </div>
        </div>
        
        <p className="confirmation-modal-message">
          {message}
        </p>
        
        <div className="confirmation-modal-actions">
          <button
            onClick={onCancel}
            className="confirmation-modal-cancel-button"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`confirmation-modal-confirm-button ${type}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}; 