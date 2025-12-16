import React, { useState, useEffect } from 'react';
import { Wallet, TrendingUp, TrendingDown, Plus, DollarSign, AlertCircle } from './Icons';
import { TrustTransaction } from '../types';

interface TrustAccountingProps {
    matterId: string;
    matterName?: string;
    onClose?: () => void;
}

const TrustAccounting: React.FC<TrustAccountingProps> = ({ matterId, matterName, onClose }) => {
    const [transactions, setTransactions] = useState<TrustTransaction[]>([]);
    const [currentBalance, setCurrentBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        type: 'deposit' as 'deposit' | 'withdrawal' | 'transfer' | 'refund',
        amount: '',
        description: '',
        reference: '',
    });

    useEffect(() => {
        fetchTransactions();
    }, [matterId]);

    const fetchTransactions = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/matters/${matterId}/trust`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTransactions(data.transactions);
                setCurrentBalance(data.currentBalance);
            }
        } catch (error) {
            console.error('Error fetching trust transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        try {
            const res = await fetch(`/api/matters/${matterId}/trust`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    type: formData.type,
                    amount: parseFloat(formData.amount),
                    description: formData.description,
                    reference: formData.reference || undefined,
                }),
            });

            if (res.ok) {
                setShowForm(false);
                setFormData({ type: 'deposit', amount: '', description: '', reference: '' });
                fetchTransactions();
            }
        } catch (error) {
            console.error('Error creating transaction:', error);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getTypeInfo = (type: string) => {
        switch (type) {
            case 'deposit':
                return { label: 'Para Yatırma', color: 'text-green-600', bg: 'bg-green-100', icon: TrendingUp };
            case 'withdrawal':
                return { label: 'Para Çekme', color: 'text-red-600', bg: 'bg-red-100', icon: TrendingDown };
            case 'transfer':
                return { label: 'Transfer', color: 'text-blue-600', bg: 'bg-blue-100', icon: DollarSign };
            case 'refund':
                return { label: 'İade', color: 'text-orange-600', bg: 'bg-orange-100', icon: TrendingDown };
            default:
                return { label: type, color: 'text-gray-600', bg: 'bg-gray-100', icon: DollarSign };
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Emanet Hesabı</h2>
                            {matterName && <p className="text-blue-100 text-sm">{matterName}</p>}
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-blue-100 text-sm">Mevcut Bakiye</p>
                        <p className="text-3xl font-bold text-white">{formatCurrency(currentBalance)}</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="p-4 bg-gray-50 border-b border-gray-200">
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    Yeni İşlem
                </button>
            </div>

            {/* New Transaction Form */}
            {showForm && (
                <div className="p-6 border-b border-gray-200 bg-blue-50">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">İşlem Türü</label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="deposit">Para Yatırma</option>
                                    <option value="withdrawal">Para Çekme</option>
                                    <option value="transfer">Transfer</option>
                                    <option value="refund">İade</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tutar (₺)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="İşlem açıklaması..."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Referans No (opsiyonel)</label>
                            <input
                                type="text"
                                value={formData.reference}
                                onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Çek numarası, havale referansı vb."
                            />
                        </div>

                        {formData.type !== 'deposit' && parseFloat(formData.amount || '0') > currentBalance && (
                            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                                <AlertCircle className="w-5 h-5" />
                                <span className="text-sm">Uyarı: Bu işlem bakiyeyi negatife düşürecek!</span>
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                İşlemi Kaydet
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Transactions List */}
            <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">İşlem Geçmişi</h3>

                {transactions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Henüz işlem kaydı yok</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((tx) => {
                            const typeInfo = getTypeInfo(tx.type);
                            const TypeIcon = typeInfo.icon;
                            const isPositive = tx.type === 'deposit';

                            return (
                                <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full ${typeInfo.bg} flex items-center justify-center`}>
                                            <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{tx.description}</p>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeInfo.bg} ${typeInfo.color}`}>
                                                    {typeInfo.label}
                                                </span>
                                                <span>•</span>
                                                <span>{formatDate(tx.createdAt)}</span>
                                                {tx.reference && (
                                                    <>
                                                        <span>•</span>
                                                        <span>Ref: {tx.reference}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                            {isPositive ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Bakiye: {formatCurrency(tx.balance)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TrustAccounting;
