import React from 'react';
import { AlertCircle, X } from './../Icons';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    type?: 'danger' | 'warning' | 'info';
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    type = 'danger',
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'danger': return <AlertCircle className="w-6 h-6 text-red-600" />;
            case 'warning': return <AlertCircle className="w-6 h-6 text-yellow-600" />;
            default: return <AlertCircle className="w-6 h-6 text-blue-600" />;
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-20 px-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-[1px]"
                onClick={onCancel}
            ></div>

            {/* Dialog - Toast Style */}
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden scale-100 animate-in zoom-in-95 duration-200 border border-gray-100">
                <div className="p-5 flex gap-4">
                    <div className={`flex-shrink-0 p-2 rounded-full ${type === 'danger' ? 'bg-red-50' : 'bg-gray-50'}`}>
                        {getIcon()}
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {title}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                            {message}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={onCancel}
                                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                {cancelLabel}
                            </button>
                            <button
                                onClick={onConfirm}
                                className={`px-4 py-1.5 text-sm font-medium text-white rounded-lg shadow-sm transition-colors ${type === 'danger'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                            >
                                {confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
