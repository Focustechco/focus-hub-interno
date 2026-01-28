import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon } from './icons';

// Toast Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

interface ToastContextData {
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

const toastStyles: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: { bg: 'bg-green-900/90', border: 'border-green-500', icon: '✓' },
    error: { bg: 'bg-red-900/90', border: 'border-red-500', icon: '✕' },
    warning: { bg: 'bg-yellow-900/90', border: 'border-yellow-500', icon: '⚠' },
    info: { bg: 'bg-blue-900/90', border: 'border-blue-500', icon: 'ℹ' },
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
        const id = `toast-${Date.now()}`;
        setToasts(prev => [...prev, { id, message, type, duration }]);

        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, [removeToast]);

    const success = useCallback((message: string) => showToast(message, 'success'), [showToast]);
    const error = useCallback((message: string) => showToast(message, 'error', 6000), [showToast]);
    const warning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);
    const info = useCallback((message: string) => showToast(message, 'info'), [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
            {children}

            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
                <AnimatePresence>
                    {toasts.map(toast => {
                        const style = toastStyles[toast.type];
                        return (
                            <motion.div
                                key={toast.id}
                                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                                transition={{ duration: 0.3 }}
                                className={`${style.bg} ${style.border} border-l-4 rounded-lg shadow-xl p-4 flex items-start gap-3`}
                            >
                                <span className="text-lg">{style.icon}</span>
                                <p className="flex-1 text-white text-sm">{toast.message}</p>
                                <button
                                    onClick={() => removeToast(toast.id)}
                                    className="text-white/70 hover:text-white transition-colors"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
