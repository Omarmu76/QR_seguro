import React from 'react';

interface ModalProps {
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ onClose, title, children }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-[#1e2a47] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-blue-900/50">
                {title && (
                    <div className="flex justify-between items-center p-4 border-b border-blue-900/50 bg-[#151e32]">
                        <h3 className="text-lg font-bold text-white">{title}</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                )}
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
