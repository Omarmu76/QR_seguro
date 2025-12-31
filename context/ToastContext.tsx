import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface ToastContextType { showToast: (message: string, type: ToastType) => void; }
const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<{ msg: string; type: ToastType } | null>(null);
    const showToast = useCallback((msg: string, type: ToastType) => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {toast && (
                <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-[9999] font-bold text-sm flex items-center gap-2 animate-bounce ${toast.type === 'success' ? 'bg-green-600 text-white' : toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                    }`}>
                    <span>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '⛔' : 'ℹ️'}</span> {toast.msg}
                </div>
            )}
        </ToastContext.Provider>
    );
};
export const useToast = () => { const c = useContext(ToastContext); if (!c) throw new Error("useToast error"); return c; };
