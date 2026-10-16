import React, { useEffect } from 'react';
import './Modal.css';

let openModalCount = 0;
let bodyOverflowBeforeModals = '';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  children,
  className = ''
}) => {
  useEffect(() => {
    if (!isOpen) return;

    if (openModalCount === 0) {
      bodyOverflowBeforeModals = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openModalCount += 1;

    const handleEscape = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose();
      }
    };

    if (closeOnEscape) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.body.style.overflow = bodyOverflowBeforeModals;
      }
    };
  }, [isOpen, onClose, closeOnEscape]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalClasses = [
    'ui-modal-content',
    `ui-modal-content--${size}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="ui-modal-overlay" onClick={handleOverlayClick}>
      <div className={modalClasses}>
        {title && (
          <div className="ui-modal-header">
            <h3 className="ui-modal-title">{title}</h3>
            <button
              className="ui-modal-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        )}
        
        <div className="ui-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
};
