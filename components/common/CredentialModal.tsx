import React from 'react';
import { CheckCircle, Copy, X } from './../Icons';
import { toast } from './../Toast';

interface CredentialModalProps {
    isOpen: boolean;
    onClose: () => void;
    email: string;
    tempPassword?: string;
    role: string;
}

export const CredentialModal: React.FC<CredentialModalProps> = ({
    isOpen,
    onClose,
    email,
    tempPassword,
    role
}) => {
    if (!isOpen) return null;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Kopyalandı!');
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden scale-100 animate-in zoom-in-95 duration-200 border border-gray-100">
                <div className="bg-emerald-500 p-6 text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                        <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Personel Oluşturuldu</h3>
                    <p className="text-emerald-50 text-sm">Hesap başarıyla sisteme eklendi.</p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-4">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">E-Posta</span>
                            <div className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                                <span className="font-mono text-slate-700">{email}</span>
                                <button onClick={() => copyToClipboard(email)} className="text-gray-400 hover:text-blue-600">
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {tempPassword && (
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Geçici Şifre</span>
                                <div className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                                    <span className="font-mono text-slate-700 font-bold tracking-wider">{tempPassword}</span>
                                    <button onClick={() => copyToClipboard(tempPassword)} className="text-gray-400 hover:text-blue-600">
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-[11px] text-amber-600 mt-2 flex items-start gap-1">
                                    <span className="font-bold">⚠️ Önemli:</span>
                                    Bu şifreyi personel ile paylaşın. Güvenlik nedeniyle tekrar görüntülenemez.
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Rol</span>
                            <span className="font-medium text-slate-800">{role}</span>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
                    >
                        Tamamlandı
                    </button>
                </div>
            </div>
        </div>
    );
};
