import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { ToastData } from '../types';

interface ToastProps {
  toasts: ToastData[];
  removeToast: (id: number) => void;
}

const Toast: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastData; onRemove: () => void }> = ({ toast, onRemove }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    success: <CheckCircle size={18} className="text-emerald-600" />,
    error: <AlertCircle size={18} className="text-red-600" />,
    info: <Info size={18} className="text-blue-600" />,
  };

  return (
    <div className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg shadow-gray-200/50 min-w-[300px] animate-in slide-in-from-right-full duration-300 ${styles[toast.type]}`}>
      {icons[toast.type]}
      <p className="flex-1 font-medium text-sm">{toast.message}</p>
      <button onClick={onRemove} className="opacity-50 hover:opacity-100 transition-opacity">
        <X size={16} />
      </button>
    </div>
  );
};

export default Toast;