import React from 'react';
import '../../../styles/InfoModal.css';

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

  const typeConfig = {
    info: {
      icon: 'ℹ️',
      defaultTitle: 'Información'
    },
    success: {
      icon: '✅',
      defaultTitle: 'Éxito'
    },
    warning: {
      icon: '⚠️',
      defaultTitle: 'Advertencia'
    },
    error: {
      icon: '❌',
      defaultTitle: 'Error'
    }
  };

  const currentConfig = typeConfig[type];

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="info-modal-overlay" onClick={handleOverlayClick}>
      <div className="info-modal-content">
        <div className="info-modal-header">
          <div className={`info-modal-icon-container ${type}`}>
            <span className="info-modal-icon">{currentConfig.icon}</span>
          </div>
          <div>
            <h3 className="info-modal-title">
              {title || currentConfig.defaultTitle}
            </h3>
          </div>
        </div>
        
        <p className="info-modal-message">
          {message}
        </p>
        
        <div className="info-modal-actions">
          <button
            onClick={onClose}
            className="info-modal-button"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}; 