/**
 * IOLTA Trust Accounting Dashboard
 * ABA Model Rule 1.15 Compliant
 */

import React, { useState, useEffect } from 'react';
import {
    AlertTriangle, DollarSign, Scale, RefreshCw,
    Users, Plus, Eye, Check, X
} from './Icons';
import { useTranslation } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import {
    TrustBankAccount, ClientTrustLedger, TrustTransactionV2,
    TrustTxStatus, TrustTransactionTypeV2, ReconciliationRecord
} from '../types';

// Simple icons for Trust-specific actions (inline SVG)
const ArrowDownCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" /><path d="M12 8v8" /><path d="m8 12 4 4 4-4" />
    </svg>
);

const ArrowUpCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" /><path d="M12 16V8" /><path d="m8 12 4-4 4 4" />
    </svg>
);

const Calculator = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="16" height="20" x="4" y="2" rx="2" /><line x1="8" x2="16" y1="6" y2="6" /><line x1="16" x2="16" y1="14" y2="18" /><path d="M8 10h.01" /><path d="M12 10h.01" /><path d="M16 10h.01" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" />
    </svg>
);

const CheckCircle2 = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
    </svg>
);

const Ban = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" />
    </svg>
);

const FileCheck = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="m9 15 2 2 4-4" />
    </svg>
);

const History = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" />
    </svg>
);

const Building2 = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
    </svg>
);

// Simple toast replacement (using alerts)
const toast = {
    success: (msg: string) => alert('✅ ' + msg),
    error: (msg: string) => alert('❌ ' + msg),
    warning: (msg: string) => alert('⚠️ ' + msg)
};

// API helper
const api = {
    async get(url: string) {
        const res = await fetch(url, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
    },
    async post(url: string, data: any) {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Request failed');
        }
        return res.json();
    }
};

export default function TrustAccounting() {
    const { t } = useTranslation();
    const { clients, matters } = useData();

    // State
    const [activeTab, setActiveTab] = useState<'overview' | 'accounts' | 'ledgers' | 'transactions' | 'reconciliation'>('overview');
    const [accounts, setAccounts] = useState<TrustBankAccount[]>([]);
    const [ledgers, setLedgers] = useState<ClientTrustLedger[]>([]);
    const [transactions, setTransactions] = useState<TrustTransactionV2[]>([]);
    const [reconciliations, setReconciliations] = useState<ReconciliationRecord[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showDepositForm, setShowDepositForm] = useState(false);
    const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
    const [showReconcileForm, setShowReconcileForm] = useState(false);
    const [showCreateLedger, setShowCreateLedger] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<string>('');

    // Form states
    const [depositForm, setDepositForm] = useState({
        trustAccountId: '',
        amount: '',
        payorPayee: '',
        description: '',
        checkNumber: '',
        allocations: [{ ledgerId: '', amount: '', description: '' }]
    });

    const [withdrawalForm, setWithdrawalForm] = useState({
        trustAccountId: '',
        ledgerId: '',
        amount: '',
        payorPayee: '',
        description: '',
        checkNumber: ''
    });

    const [reconcileForm, setReconcileForm] = useState({
        trustAccountId: '',
        periodEnd: new Date().toISOString().split('T')[0],
        bankStatementBalance: '',
        notes: ''
    });

    const [ledgerForm, setLedgerForm] = useState({
        clientId: '',
        matterId: '',
        trustAccountId: '',
        notes: ''
    });

    // Load data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [accountsData, ledgersData, txData, reconData] = await Promise.all([
                api.get('/api/trust/accounts'),
                api.get('/api/trust/ledgers'),
                api.get('/api/trust/transactions?limit=50'),
                api.get('/api/trust/reconciliations')
            ]);
            setAccounts(accountsData);
            setLedgers(ledgersData);
            setTransactions(txData);
            setReconciliations(reconData);
            if (accountsData.length > 0) {
                setSelectedAccount(accountsData[0].id);
                setDepositForm(f => ({ ...f, trustAccountId: accountsData[0].id }));
                setWithdrawalForm(f => ({ ...f, trustAccountId: accountsData[0].id }));
                setReconcileForm(f => ({ ...f, trustAccountId: accountsData[0].id }));
            }
        } catch (err: any) {
            console.error('Failed to load trust data:', err);
            toast.error('Trust verisi yüklenemedi');
        }
        setLoading(false);
    };

    // Calculate totals
    const totalTrustBalance = accounts.reduce((sum, a) => sum + Number(a.currentBalance), 0);
    const totalClientLedgers = ledgers.reduce((sum, l) => sum + Number(l.runningBalance), 0);
    const pendingTransactions = transactions.filter(t => t.status === 'PENDING').length;
    const unreconciledAccounts = accounts.filter(a => {
        const lastRecon = reconciliations.find(r => r.trustAccountId === a.id);
        if (!lastRecon) return true;
        const lastReconDate = new Date(lastRecon.periodEnd);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return lastReconDate < monthAgo;
    }).length;

    // Handle deposit
    const handleDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const allocations = depositForm.allocations
                .filter(a => a.ledgerId && a.amount)
                .map(a => ({
                    ledgerId: a.ledgerId,
                    amount: parseFloat(a.amount),
                    description: a.description
                }));

            if (allocations.length === 0) {
                toast.error('En az bir müvekkil defteri seçmelisiniz');
                return;
            }

            const totalAlloc = allocations.reduce((sum, a) => sum + a.amount, 0);
            if (Math.abs(totalAlloc - parseFloat(depositForm.amount)) > 0.01) {
                toast.error('Dağıtım toplamı yatırılan tutara eşit olmalı');
                return;
            }

            await api.post('/api/trust/deposit', {
                trustAccountId: depositForm.trustAccountId,
                amount: parseFloat(depositForm.amount),
                payorPayee: depositForm.payorPayee,
                description: depositForm.description,
                checkNumber: depositForm.checkNumber || undefined,
                allocations
            });

            toast.success('Yatırım kaydedildi');
            setShowDepositForm(false);
            setDepositForm({
                trustAccountId: selectedAccount,
                amount: '',
                payorPayee: '',
                description: '',
                checkNumber: '',
                allocations: [{ ledgerId: '', amount: '', description: '' }]
            });
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Yatırım başarısız');
        }
    };

    // Handle withdrawal
    const handleWithdrawal = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/api/trust/withdrawal', {
                trustAccountId: withdrawalForm.trustAccountId,
                ledgerId: withdrawalForm.ledgerId,
                amount: parseFloat(withdrawalForm.amount),
                payorPayee: withdrawalForm.payorPayee,
                description: withdrawalForm.description,
                checkNumber: withdrawalForm.checkNumber || undefined
            });

            toast.success('Çekim kaydedildi');
            setShowWithdrawalForm(false);
            setWithdrawalForm({
                trustAccountId: selectedAccount,
                ledgerId: '',
                amount: '',
                payorPayee: '',
                description: '',
                checkNumber: ''
            });
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Çekim başarısız');
        }
    };

    // Handle reconciliation
    const handleReconcile = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const result = await api.post('/api/trust/reconcile', {
                trustAccountId: reconcileForm.trustAccountId,
                periodEnd: reconcileForm.periodEnd,
                bankStatementBalance: parseFloat(reconcileForm.bankStatementBalance),
                notes: reconcileForm.notes
            });

            if (result.isReconciled) {
                toast.success('✅ Mutabakat başarılı! Üç yönlü eşleşme sağlandı.');
            } else {
                toast.warning(`⚠️ Mutabakat farkı: $${result.discrepancy.toFixed(2)} - İnceleme gerekli`);
            }

            setShowReconcileForm(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Mutabakat başarısız');
        }
    };

    // Handle create ledger
    const handleCreateLedger = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ledgerForm.clientId || !ledgerForm.trustAccountId) {
            toast.error('Client and Trust Account are required');
            return;
        }
        try {
            await api.post('/api/trust/ledgers', {
                clientId: ledgerForm.clientId,
                matterId: ledgerForm.matterId || null,
                trustAccountId: ledgerForm.trustAccountId,
                notes: ledgerForm.notes || null
            });
            toast.success('Client ledger created successfully');
            setShowCreateLedger(false);
            setLedgerForm({ clientId: '', matterId: '', trustAccountId: selectedAccount, notes: '' });
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to create ledger');
        }
    };

    // Handle void transaction
    const handleVoidTransaction = async (txId: string) => {
        const reason = prompt('İptal nedeni:');
        if (!reason) return;

        try {
            await api.post(`/api/trust/transactions/${txId}/void`, { reason });
            toast.success('İşlem iptal edildi');
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'İptal başarısız');
        }
    };

    // Handle approve transaction
    const handleApproveTransaction = async (txId: string) => {
        try {
            await api.post(`/api/trust/transactions/${txId}/approve`, {});
            toast.success('İşlem onaylandı');
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Onay başarısız');
        }
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    // Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Scale className="w-7 h-7 text-primary-600" />
                        IOLTA Trust Accounting
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        ABA Model Rule 1.15 Uyumlu Emanet Hesap Yönetimi
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowDepositForm(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <ArrowDownCircle className="w-4 h-4" />
                        Yatırım
                    </button>
                    <button
                        onClick={() => setShowWithdrawalForm(true)}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <ArrowUpCircle className="w-4 h-4" />
                        Çekim
                    </button>
                    <button
                        onClick={() => setShowReconcileForm(true)}
                        className="btn-outline flex items-center gap-2"
                    >
                        <Calculator className="w-4 h-4" />
                        Mutabakat
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                            <DollarSign className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Trust Hesap Bakiyesi</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(totalTrustBalance)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Müvekkil Defterleri</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {formatCurrency(totalClientLedgers)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${pendingTransactions > 0 ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            <CheckCircle2 className={`w-6 h-6 ${pendingTransactions > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Bekleyen Onay</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white">
                                {pendingTransactions}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-4 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${unreconciledAccounts > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                            {unreconciledAccounts > 0 ? (
                                <AlertTriangle className="w-6 h-6 text-red-600" />
                            ) : (
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Mutabakat Durumu</p>
                            <p className={`text-xl font-bold ${unreconciledAccounts > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {unreconciledAccounts > 0 ? `${unreconciledAccounts} Bekliyor` : 'Güncel'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Three-Way Balance Check */}
            {Math.abs(totalTrustBalance - totalClientLedgers) > 0.01 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                        <div>
                            <h3 className="font-semibold text-red-800 dark:text-red-200">
                                ⚠️ Bakiye Uyumsuzluğu Tespit Edildi
                            </h3>
                            <p className="text-sm text-red-700 dark:text-red-300">
                                Trust hesap bakiyesi ({formatCurrency(totalTrustBalance)}) ile müvekkil defterleri toplamı
                                ({formatCurrency(totalClientLedgers)}) eşleşmiyor.
                                Fark: {formatCurrency(Math.abs(totalTrustBalance - totalClientLedgers))}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-4">
                    {[
                        { id: 'overview', label: 'Genel Bakış', icon: Eye },
                        { id: 'accounts', label: 'Hesaplar', icon: Building2 },
                        { id: 'ledgers', label: 'Müvekkil Defterleri', icon: Users },
                        { id: 'transactions', label: 'İşlemler', icon: History },
                        { id: 'reconciliation', label: 'Mutabakat', icon: FileCheck }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="glass-card rounded-xl p-6">
                {/* Accounts Tab */}
                {activeTab === 'accounts' && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Trust Banka Hesapları</h2>
                        {accounts.length === 0 ? (
                            <p className="text-gray-500">Henüz trust hesabı bulunmuyor.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b dark:border-gray-700">
                                            <th className="text-left py-3 px-4">Hesap Adı</th>
                                            <th className="text-left py-3 px-4">Banka</th>
                                            <th className="text-left py-3 px-4">Hesap No</th>
                                            <th className="text-left py-3 px-4">Yargı Bölgesi</th>
                                            <th className="text-right py-3 px-4">Bakiye</th>
                                            <th className="text-center py-3 px-4">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {accounts.map(account => (
                                            <tr key={account.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="py-3 px-4 font-medium">{account.name}</td>
                                                <td className="py-3 px-4">{account.bankName}</td>
                                                <td className="py-3 px-4 font-mono">{account.accountNumberEnc}</td>
                                                <td className="py-3 px-4">{account.jurisdiction}</td>
                                                <td className="py-3 px-4 text-right font-semibold">
                                                    {formatCurrency(Number(account.currentBalance))}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${account.status === 'ACTIVE'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {account.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Ledgers Tab */}
                {activeTab === 'ledgers' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Müvekkil Emanet Defterleri</h2>
                            <button
                                onClick={() => setShowCreateLedger(true)}
                                className="btn-sm btn-primary flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> Yeni Defter
                            </button>
                        </div>
                        {ledgers.length === 0 ? (
                            <p className="text-gray-500">Henüz müvekkil defteri bulunmuyor.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b dark:border-gray-700">
                                            <th className="text-left py-3 px-4">Müvekkil</th>
                                            <th className="text-left py-3 px-4">Dava</th>
                                            <th className="text-left py-3 px-4">Trust Hesabı</th>
                                            <th className="text-right py-3 px-4">Bakiye</th>
                                            <th className="text-center py-3 px-4">Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledgers.map(ledger => (
                                            <tr key={ledger.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="py-3 px-4 font-medium">
                                                    {(ledger as any).client?.name || ledger.clientId}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {ledger.matterId || '(Genel)'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {(ledger as any).trustAccount?.name || ledger.trustAccountId}
                                                </td>
                                                <td className="py-3 px-4 text-right font-semibold">
                                                    {formatCurrency(Number(ledger.runningBalance))}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${ledger.status === 'ACTIVE'
                                                        ? 'bg-green-100 text-green-800'
                                                        : ledger.status === 'FROZEN'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {ledger.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Transactions Tab */}
                {activeTab === 'transactions' && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">İşlem Geçmişi</h2>
                        {transactions.length === 0 ? (
                            <p className="text-gray-500">Henüz işlem bulunmuyor.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b dark:border-gray-700">
                                            <th className="text-left py-3 px-4">Tarih</th>
                                            <th className="text-left py-3 px-4">Tip</th>
                                            <th className="text-left py-3 px-4">Açıklama</th>
                                            <th className="text-left py-3 px-4">Ödeme Yapan/Alan</th>
                                            <th className="text-right py-3 px-4">Tutar</th>
                                            <th className="text-center py-3 px-4">Durum</th>
                                            <th className="text-center py-3 px-4">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map(tx => (
                                            <tr key={tx.id} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 ${tx.isVoided ? 'opacity-50 line-through' : ''}`}>
                                                <td className="py-3 px-4 text-sm">{formatDate(tx.createdAt)}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${tx.type === 'DEPOSIT' ? 'bg-green-100 text-green-800' :
                                                        tx.type === 'WITHDRAWAL' ? 'bg-red-100 text-red-800' :
                                                            tx.type === 'FEE_EARNED' ? 'bg-blue-100 text-blue-800' :
                                                                'bg-gray-100 text-gray-800'
                                                        }`}>
                                                        {tx.type === 'DEPOSIT' && <ArrowDownCircle className="w-3 h-3" />}
                                                        {tx.type === 'WITHDRAWAL' && <ArrowUpCircle className="w-3 h-3" />}
                                                        {tx.type}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">{tx.description}</td>
                                                <td className="py-3 px-4">{tx.payorPayee}</td>
                                                <td className="py-3 px-4 text-right font-semibold">
                                                    <span className={tx.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'}>
                                                        {tx.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${tx.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                        tx.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                            tx.status === 'VOIDED' ? 'bg-gray-100 text-gray-800' :
                                                                'bg-red-100 text-red-800'
                                                        }`}>
                                                        {tx.isVoided ? 'İPTAL' : tx.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {!tx.isVoided && tx.status === 'PENDING' && (
                                                        <button
                                                            onClick={() => handleApproveTransaction(tx.id)}
                                                            className="text-green-600 hover:text-green-800 mr-2"
                                                            title="Onayla"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {!tx.isVoided && tx.status === 'APPROVED' && (
                                                        <button
                                                            onClick={() => handleVoidTransaction(tx.id)}
                                                            className="text-red-600 hover:text-red-800"
                                                            title="İptal Et"
                                                        >
                                                            <Ban className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Reconciliation Tab */}
                {activeTab === 'reconciliation' && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold">Mutabakat Kayıtları</h2>
                        {reconciliations.length === 0 ? (
                            <p className="text-gray-500">Henüz mutabakat kaydı bulunmuyor.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b dark:border-gray-700">
                                            <th className="text-left py-3 px-4">Dönem Sonu</th>
                                            <th className="text-left py-3 px-4">Trust Hesabı</th>
                                            <th className="text-right py-3 px-4">Banka Bakiyesi</th>
                                            <th className="text-right py-3 px-4">Trust Bakiyesi</th>
                                            <th className="text-right py-3 px-4">Müvekkil Toplamı</th>
                                            <th className="text-center py-3 px-4">Durum</th>
                                            <th className="text-center py-3 px-4">Onay</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reconciliations.map(recon => (
                                            <tr key={recon.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="py-3 px-4">{formatDate(recon.periodEnd)}</td>
                                                <td className="py-3 px-4">
                                                    {(recon as any).trustAccount?.name || recon.trustAccountId}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {formatCurrency(Number(recon.bankStatementBalance))}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {formatCurrency(Number(recon.trustLedgerBalance))}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    {formatCurrency(Number(recon.clientLedgerSumBalance))}
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${recon.isReconciled
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {recon.isReconciled ? '✓ Eşleşti' : `Fark: ${formatCurrency(Number(recon.discrepancyAmount || 0))}`}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {recon.approvedAt ? (
                                                        <span className="text-green-600">✓ Onaylı</span>
                                                    ) : (
                                                        <span className="text-yellow-600">Bekliyor</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Recent Transactions */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Son İşlemler</h3>
                            <div className="space-y-2">
                                {transactions.slice(0, 5).map(tx => (
                                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            {tx.type === 'DEPOSIT' ? (
                                                <ArrowDownCircle className="w-5 h-5 text-green-600" />
                                            ) : (
                                                <ArrowUpCircle className="w-5 h-5 text-red-600" />
                                            )}
                                            <div>
                                                <p className="font-medium text-sm">{tx.description}</p>
                                                <p className="text-xs text-gray-500">{tx.payorPayee}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`font-semibold ${tx.type === 'DEPOSIT' ? 'text-green-600' : 'text-red-600'}`}>
                                                {tx.type === 'DEPOSIT' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                                            </p>
                                            <p className="text-xs text-gray-500">{formatDate(tx.createdAt)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Client Ledger Summary */}
                        <div>
                            <h3 className="text-lg font-semibold mb-4">Müvekkil Bakiyeleri</h3>
                            <div className="space-y-2">
                                {ledgers.slice(0, 5).map(ledger => (
                                    <div key={ledger.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div>
                                            <p className="font-medium text-sm">
                                                {(ledger as any).client?.name || 'Müvekkil'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {ledger.matterId || 'Genel Defter'}
                                            </p>
                                        </div>
                                        <p className="font-semibold text-green-600">
                                            {formatCurrency(Number(ledger.runningBalance))}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Deposit Modal */}
            {showDepositForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <ArrowDownCircle className="w-5 h-5 text-green-600" />
                            Trust Hesabına Yatırım
                        </h2>
                        <form onSubmit={handleDeposit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Trust Hesabı</label>
                                <select
                                    value={depositForm.trustAccountId}
                                    onChange={e => setDepositForm({ ...depositForm, trustAccountId: e.target.value })}
                                    className="input w-full"
                                    required
                                >
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Tutar ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={depositForm.amount}
                                    onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })}
                                    className="input w-full"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Ödeme Yapan</label>
                                <input
                                    type="text"
                                    value={depositForm.payorPayee}
                                    onChange={e => setDepositForm({ ...depositForm, payorPayee: e.target.value })}
                                    className="input w-full"
                                    placeholder="Müvekkil adı veya kurum"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Açıklama</label>
                                <input
                                    type="text"
                                    value={depositForm.description}
                                    onChange={e => setDepositForm({ ...depositForm, description: e.target.value })}
                                    className="input w-full"
                                    placeholder="Avans, dosya masrafı, vb."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Çek/Referans No (Opsiyonel)</label>
                                <input
                                    type="text"
                                    value={depositForm.checkNumber}
                                    onChange={e => setDepositForm({ ...depositForm, checkNumber: e.target.value })}
                                    className="input w-full"
                                />
                            </div>

                            {/* Allocations */}
                            <div className="border-t pt-4">
                                <label className="block text-sm font-medium mb-2">Dağıtım (Müvekkil Defterlerine)</label>
                                {depositForm.allocations.map((alloc, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2">
                                        <select
                                            value={alloc.ledgerId}
                                            onChange={e => {
                                                const newAllocs = [...depositForm.allocations];
                                                newAllocs[idx].ledgerId = e.target.value;
                                                setDepositForm({ ...depositForm, allocations: newAllocs });
                                            }}
                                            className="input flex-1"
                                        >
                                            <option value="">Defter Seç...</option>
                                            {ledgers.filter(l => l.status === 'ACTIVE').map(l => (
                                                <option key={l.id} value={l.id}>
                                                    {(l as any).client?.name || l.clientId} - {formatCurrency(Number(l.runningBalance))}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={alloc.amount}
                                            onChange={e => {
                                                const newAllocs = [...depositForm.allocations];
                                                newAllocs[idx].amount = e.target.value;
                                                setDepositForm({ ...depositForm, allocations: newAllocs });
                                            }}
                                            className="input w-28"
                                            placeholder="Tutar"
                                        />
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setDepositForm({
                                        ...depositForm,
                                        allocations: [...depositForm.allocations, { ledgerId: '', amount: '', description: '' }]
                                    })}
                                    className="text-sm text-primary-600 hover:underline"
                                >
                                    + Başka defter ekle
                                </button>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowDepositForm(false)} className="btn-secondary">
                                    İptal
                                </button>
                                <button type="submit" className="btn-primary">
                                    Yatırımı Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Withdrawal Modal */}
            {showWithdrawalForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <ArrowUpCircle className="w-5 h-5 text-red-600" />
                            Trust Hesabından Çekim
                        </h2>
                        <form onSubmit={handleWithdrawal} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Trust Hesabı</label>
                                <select
                                    value={withdrawalForm.trustAccountId}
                                    onChange={e => setWithdrawalForm({ ...withdrawalForm, trustAccountId: e.target.value })}
                                    className="input w-full"
                                    required
                                >
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.name} - {formatCurrency(Number(a.currentBalance))}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Müvekkil Defteri</label>
                                <select
                                    value={withdrawalForm.ledgerId}
                                    onChange={e => setWithdrawalForm({ ...withdrawalForm, ledgerId: e.target.value })}
                                    className="input w-full"
                                    required
                                >
                                    <option value="">Defter Seç...</option>
                                    {ledgers.filter(l => l.status === 'ACTIVE' && Number(l.runningBalance) > 0).map(l => (
                                        <option key={l.id} value={l.id}>
                                            {(l as any).client?.name || l.clientId} - Mevcut: {formatCurrency(Number(l.runningBalance))}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Tutar ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={withdrawalForm.amount}
                                    onChange={e => setWithdrawalForm({ ...withdrawalForm, amount: e.target.value })}
                                    className="input w-full"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Ödeme Yapılan</label>
                                <input
                                    type="text"
                                    value={withdrawalForm.payorPayee}
                                    onChange={e => setWithdrawalForm({ ...withdrawalForm, payorPayee: e.target.value })}
                                    className="input w-full"
                                    placeholder="Mahkeme, uzman, müvekkil, vb."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Açıklama</label>
                                <input
                                    type="text"
                                    value={withdrawalForm.description}
                                    onChange={e => setWithdrawalForm({ ...withdrawalForm, description: e.target.value })}
                                    className="input w-full"
                                    placeholder="Harç, masraf, iade, vb."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Çek No (Opsiyonel)</label>
                                <input
                                    type="text"
                                    value={withdrawalForm.checkNumber}
                                    onChange={e => setWithdrawalForm({ ...withdrawalForm, checkNumber: e.target.value })}
                                    className="input w-full"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowWithdrawalForm(false)} className="btn-secondary">
                                    İptal
                                </button>
                                <button type="submit" className="btn-primary">
                                    Çekimi Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reconciliation Modal */}
            {showReconcileForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-blue-600" />
                            Üç Yönlü Mutabakat
                        </h2>
                        <form onSubmit={handleReconcile} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Trust Hesabı</label>
                                <select
                                    value={reconcileForm.trustAccountId}
                                    onChange={e => setReconcileForm({ ...reconcileForm, trustAccountId: e.target.value })}
                                    className="input w-full"
                                    required
                                >
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Dönem Sonu Tarihi</label>
                                <input
                                    type="date"
                                    value={reconcileForm.periodEnd}
                                    onChange={e => setReconcileForm({ ...reconcileForm, periodEnd: e.target.value })}
                                    className="input w-full"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Banka Ekstresi Bakiyesi ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={reconcileForm.bankStatementBalance}
                                    onChange={e => setReconcileForm({ ...reconcileForm, bankStatementBalance: e.target.value })}
                                    className="input w-full"
                                    placeholder="Banka ekstresindeki bakiye"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Notlar (Opsiyonel)</label>
                                <textarea
                                    value={reconcileForm.notes}
                                    onChange={e => setReconcileForm({ ...reconcileForm, notes: e.target.value })}
                                    className="input w-full"
                                    rows={3}
                                    placeholder="Mutabakat notları..."
                                />
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm">
                                <p className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                                    Üç Yönlü Kontrol:
                                </p>
                                <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                                    <li>✓ Banka Bakiyesi</li>
                                    <li>✓ Trust Hesap Bakiyesi (Yazılım)</li>
                                    <li>✓ Müvekkil Defterleri Toplamı</li>
                                </ul>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowReconcileForm(false)} className="btn-secondary">
                                    İptal
                                </button>
                                <button type="submit" className="btn-primary">
                                    Mutabakatı Gerçekleştir
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create Ledger Modal */}
            {showCreateLedger && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-600" />
                            Create Client Ledger
                        </h2>
                        <form onSubmit={handleCreateLedger} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Trust Account *</label>
                                <select
                                    value={ledgerForm.trustAccountId}
                                    onChange={e => setLedgerForm({ ...ledgerForm, trustAccountId: e.target.value })}
                                    className="input w-full"
                                    required
                                >
                                    <option value="">Select Trust Account...</option>
                                    {accounts.map(a => (
                                        <option key={a.id} value={a.id}>{a.name} - {a.bankName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Client *</label>
                                <select
                                    value={ledgerForm.clientId}
                                    onChange={e => setLedgerForm({ ...ledgerForm, clientId: e.target.value })}
                                    className="input w-full"
                                    required
                                >
                                    <option value="">Select Client...</option>
                                    {clients.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Matter (Optional)</label>
                                <select
                                    value={ledgerForm.matterId}
                                    onChange={e => setLedgerForm({ ...ledgerForm, matterId: e.target.value })}
                                    className="input w-full"
                                >
                                    <option value="">General Ledger (No specific matter)</option>
                                    {matters.map(m => (
                                        <option key={m.id} value={m.id}>{m.name} - {m.caseNumber}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                                <textarea
                                    value={ledgerForm.notes}
                                    onChange={e => setLedgerForm({ ...ledgerForm, notes: e.target.value })}
                                    className="input w-full"
                                    rows={2}
                                    placeholder="Any notes about this ledger..."
                                />
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                                <p className="text-blue-800 dark:text-blue-200">
                                    <strong>Note:</strong> A client ledger tracks trust funds held for a specific client.
                                    Each client can have multiple ledgers if needed (one per matter).
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowCreateLedger(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Create Ledger
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
