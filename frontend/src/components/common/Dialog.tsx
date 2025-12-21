import React from 'react';
import './Dialog.css';

export interface DialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  type?: 'alert' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  title,
  message,
  type = 'alert',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  return (
    <div className="dialog-backdrop" onClick={handleBackdropClick}>
      <div className="dialog-container">
        {title && <div className="dialog-header">{title}</div>}
        <div className="dialog-body">{message}</div>
        <div className="dialog-footer">
          {type === 'confirm' && (
            <button className="dialog-button dialog-button-secondary" onClick={handleCancel}>
              {cancelText}
            </button>
          )}
          <button className="dialog-button dialog-button-primary" onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dialog;
