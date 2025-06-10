import React from 'react';
import '../../../styles/DeleteConfirmationModal.css';

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  title = "Confirmar eliminación",
  message = "¿Estás seguro de que quieres eliminar este elemento? Esta acción no se puede deshacer.",
  confirmText = "Eliminar",
  cancelText = "Cancelar",
  isDeleting = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="delete-modal-overlay">
      <div className="delete-modal-content">
        <div className="delete-modal-header">
          <div className="delete-modal-icon">
            <span className="delete-modal-icon-emoji">⚠️</span>
          </div>
          <div>
            <h3 className="delete-modal-title">
              {title}
            </h3>
          </div>
        </div>
        
        <p className="delete-modal-message">
          {message}
        </p>
        
        <div className="delete-modal-actions">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="delete-modal-button delete-modal-cancel"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="delete-modal-button delete-modal-confirm"
          >
            {isDeleting && (
              <div className="delete-modal-spinner" />
            )}
            {isDeleting ? 'Eliminando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}; 