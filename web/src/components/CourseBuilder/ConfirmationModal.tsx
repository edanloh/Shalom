import React from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';
import { Colors } from '../../constants/Colors';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancel = false,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check className="h-12 w-12" style={{ color: Colors.green }} />;
      case 'error':
        return <X className="h-12 w-12" style={{ color: Colors.error }} />;
      case 'warning':
        return <AlertCircle className="h-12 w-12" style={{ color: Colors.yellow }} />;
      case 'info':
      default:
        return <Info className="h-12 w-12" style={{ color: Colors.secondary }} />;
    }
  };

  const getHeaderColor = () => {
    switch (type) {
      case 'success':
        return Colors.green;
      case 'error':
        return Colors.error;
      case 'warning':
        return Colors.yellow;
      case 'info':
      default:
        return Colors.secondary;
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: Colors.cardBackground,
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '480px',
          width: '90%',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
          border: `1px solid ${Colors.gray600}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          {getIcon()}
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: '24px',
            fontWeight: '600',
            color: getHeaderColor(),
            textAlign: 'center',
            marginBottom: '16px',
          }}
        >
          {title}
        </h3>

        {/* Message */}
        <p
          style={{
            fontSize: '16px',
            color: Colors.textSecondary,
            textAlign: 'center',
            marginBottom: '32px',
            lineHeight: '1.5',
          }}
        >
          {message}
        </p>

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
          }}
        >
          {showCancel && (
            <button
              onClick={onClose}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: `1px solid ${Colors.gray600}`,
                backgroundColor: Colors.backgroundGray,
                color: Colors.textSecondary,
                fontSize: '16px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                minWidth: '100px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = Colors.gray700;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = Colors.backgroundGray;
              }}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: type === 'error' ? Colors.error : Colors.secondary,
              color: Colors.textPrimary,
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
              minWidth: '100px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
