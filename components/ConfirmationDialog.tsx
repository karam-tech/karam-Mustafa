import React from 'react';
import { X, Check, AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  showCancel?: boolean;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  confirmVariant = 'danger',
  showCancel = true,
}) => {
  if (!isOpen) return null;

  const confirmButtonClass = confirmVariant === 'danger' 
    ? 'bg-red-600 hover:bg-red-700' 
    : 'bg-accent hover:bg-accent-dark';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onCancel} role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
      <div className="bg-primary p-6 rounded-2xl shadow-neumo w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 bg-primary p-3 rounded-full shadow-neumo-sm ${confirmVariant === 'danger' ? 'text-red-500' : 'text-amber-500'}`}>
                <AlertTriangle size={28} />
            </div>
            <div className="flex-1">
                <h2 id="dialog-title" className="text-2xl font-bold text-text-primary">{title}</h2>
                <p className="text-text-secondary mt-2">{message}</p>
            </div>
        </div>
        <div className="mt-8 flex justify-end gap-4">
          {showCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-primary text-text-primary rounded-xl hover:shadow-neumo-inset shadow-neumo-sm font-bold transition-all"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex items-center gap-2 px-6 py-3 text-white rounded-md font-bold shadow-sm transition-all ${confirmButtonClass}`}
          >
            <Check size={20} />
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;
