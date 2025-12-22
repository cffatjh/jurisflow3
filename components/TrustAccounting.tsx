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
    const [showCreateAccount, setShowCreateAccount] = useState(false);
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

    const [accountForm, setAccountForm] = useState({
        name: '',
        bankName: '',
        routingNumber: '',
        accountNumber: '',
        jurisdiction: 'CA'  // Default to California
    });

    // US States for IOLTA jurisdiction
    const usStates = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
    ];

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
            toast.error('Failed to load trust data');
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
                toast.error('You must select at least one client ledger');
                return;
            }

            const totalAlloc = allocations.reduce((sum, a) => sum + a.amount, 0);
            if (Math.abs(totalAlloc - parseFloat(depositForm.amount)) > 0.01) {
                toast.error('Allocation total must equal deposit amount');
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

            toast.success('Deposit recorded');
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
            toast.error(err.message || 'Deposit failed');
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

            toast.success('Withdrawal recorded');
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
            toast.error(err.message || 'Withdrawal failed');
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
                toast.success('✅ Reconciliation successful! Three-way match confirmed.');
            } else {
                toast.warning(`⚠️ Reconciliation discrepancy: $${result.discrepancy.toFixed(2)} - Review needed`);
            }

            setShowReconcileForm(false);
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Reconciliation failed');
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

    // Handle create trust account
    const handleCreateAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountForm.name || !accountForm.bankName || !accountForm.routingNumber || !accountForm.accountNumber) {
            toast.error('All fields are required');
            return;
        }
        // Validate routing number (9 digits for US)
        if (!/^\d{9}$/.test(accountForm.routingNumber)) {
            toast.error('Routing/ABA number must be exactly 9 digits');
            return;
        }
        try {
            await api.post('/api/trust/accounts', {
                name: accountForm.name,
                bankName: accountForm.bankName,
                routingNumber: accountForm.routingNumber,
                accountNumber: accountForm.accountNumber, // Backend expects 'accountNumber'
                jurisdiction: accountForm.jurisdiction
            });
            toast.success('Trust account created successfully');
            setShowCreateAccount(false);
            setAccountForm({ name: '', bankName: '', routingNumber: '', accountNumber: '', jurisdiction: 'CA' });
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Failed to create trust account');
        }
    };

    // Handle void transaction
    const handleVoidTransaction = async (txId: string) => {
        const reason = prompt('Void reason:');
        if (!reason) return;

        try {
            await api.post(`/api/trust/transactions/${txId}/void`, { reason });
            toast.success('Transaction voided');
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Void failed');
        }
    };

    // Handle approve transaction
    const handleApproveTransaction = async (txId: string) => {
        try {
            await api.post(`/api/trust/transactions/${txId}/approve`, {});
            toast.success('Transaction approved');
            loadData();
        } catch (err: any) {
            toast.error(err.message || 'Approval failed');
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
                        ABA Model Rule 1.15 Compliant Trust Account Management
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowDepositForm(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <ArrowDownCircle className="w-4 h-4" />
                        Deposit
                    </button>
                    <button
                        onClick={() => setShowWithdrawalForm(true)}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <ArrowUpCircle className="w-4 h-4" />
                        Withdrawal
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
                            <p className="text-sm text-gray-500">Client Ledgers</p>
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
                            <p className="text-sm text-gray-500">Reconciliation Status</p>
                            <p className={`text-xl font-bold ${unreconciledAccounts > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {unreconciledAccounts > 0 ? `${unreconciledAccounts} Pending` : 'Up to Date'}
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
                                ⚠️ Balance Discrepancy Detected
                            </h3>
                            <p className="text-sm text-red-700 dark:text-red-300">
                                Trust account balance ({formatCurrency(totalTrustBalance)}) does not match client ledgers total
                                ({formatCurrency(totalClientLedgers)}).
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
                        { id: 'overview', label: 'Overview', icon: Eye },
                        { id: 'accounts', label: 'Accounts', icon: Building2 },
                        { id: 'ledgers', label: 'Client Ledgers', icon: Users },
                        { id: 'transactions', label: 'Transactions', icon: History },
                        { id: 'reconciliation', label: 'Reconciliation', icon: FileCheck }
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
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Trust Bank Accounts</h2>
                            <button
                                onClick={() => setShowCreateAccount(true)}
                                className="btn-sm btn-primary flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> New Account
                            </button>
                        </div>
                        {accounts.length === 0 ? (
                            <p className="text-gray-500">No trust accounts yet. Click "New Account" to create one.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b dark:border-gray-700">
                                            <th className="text-left py-3 px-4">Account Name</th>
                                            <th className="text-left py-3 px-4">Bank</th>
                                            <th className="text-left py-3 px-4">Account #</th>
                                            <th className="text-left py-3 px-4">Jurisdiction</th>
                                            <th className="text-right py-3 px-4">Balance</th>
                                            <th className="text-center py-3 px-4">Status</th>
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
                            <h2 className="text-lg font-semibold">Client Trust Ledgers</h2>
                            <button
                                onClick={() => setShowCreateLedger(true)}
                                className="btn-sm btn-primary flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> New Ledger
                            </button>
                        </div>
                        {ledgers.length === 0 ? (
                            <p className="text-gray-500">No client ledgers yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b dark:border-gray-700">
                                            <th className="text-left py-3 px-4">Client</th>
                                            <th className="text-left py-3 px-4">Matter</th>
                                            <th className="text-left py-3 px-4">Trust Account</th>
                                            <th className="text-right py-3 px-4">Balance</th>
                                            <th className="text-center py-3 px-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledgers.map(ledger => (
                                            <tr key={ledger.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                                                <td className="py-3 px-4 font-medium">
                                                    {(ledger as any).client?.name || ledger.clientId}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {ledger.matterId || '(General)'}
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
                        <h2 className="text-lg font-semibold">Transaction History</h2>
                        {transactions.length === 0 ? (
                            <p className="text-gray-500">No transactions yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b dark:border-gray-700">
                                            <th className="text-left py-3 px-4">Date</th>
                                            <th className="text-left py-3 px-4">Type</th>
                                            <th className="text-left py-3 px-4">Description</th>
                                            <th className="text-left py-3 px-4">Payor/Payee</th>
                                            <th className="text-right py-3 px-4">Amount</th>
                                            <th className="text-center py-3 px-4">Status</th>
                                            <th className="text-center py-3 px-4">Action</th>
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
                                                        {tx.isVoided ? 'VOIDED' : tx.status}
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
                                                            title="Void"
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
                        <h2 className="text-lg font-semibold">Reconciliation Records</h2>
                        {reconciliations.length === 0 ? (
                            <p className="text-gray-500">No reconciliation records yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b dark:border-gray-700">
                                            <th className="text-left py-3 px-4">Period End</th>
                                            <th className="text-left py-3 px-4">Trust Account</th>
                                            <th className="text-right py-3 px-4">Bank Balance</th>
                                            <th className="text-right py-3 px-4">Trust Balance</th>
                                            <th className="text-right py-3 px-4">Client Total</th>
                                            <th className="text-center py-3 px-4">Status</th>
                                            <th className="text-center py-3 px-4">Approval</th>
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
                                                        {recon.isReconciled ? '✓ Matched' : `Diff: ${formatCurrency(Number(recon.discrepancyAmount || 0))}`}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    {recon.approvedAt ? (
                                                        <span className="text-green-600">✓ Approved</span>
                                                    ) : (
                                                        <span className="text-yellow-600">Pending</span>
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
                            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
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
                            <h3 className="text-lg font-semibold mb-4">Client Balances</h3>
                            <div className="space-y-2">
                                {ledgers.slice(0, 5).map(ledger => (
                                    <div key={ledger.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div>
                                            <p className="font-medium text-sm">
                                                {(ledger as any).client?.name || 'Client'}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {ledger.matterId || 'General Ledger'}
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
                            Deposit to Trust Account
                        </h2>
                        <form onSubmit={handleDeposit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Trust Account</label>
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
                                <label className="block text-sm font-medium mb-1">Amount ($)</label>
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
                                <label className="block text-sm font-medium mb-1">Payor Name</label>
                                <input
                                    type="text"
                                    value={depositForm.payorPayee}
                                    onChange={e => setDepositForm({ ...depositForm, payorPayee: e.target.value })}
                                    className="input w-full"
                                    placeholder="Client name or organization"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <input
                                    type="text"
                                    value={depositForm.description}
                                    onChange={e => setDepositForm({ ...depositForm, description: e.target.value })}
                                    className="input w-full"
                                    placeholder="Retainer, filing fees, etc."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Check/Reference # (Optional)</label>
                                <input
                                    type="text"
                                    value={depositForm.checkNumber}
                                    onChange={e => setDepositForm({ ...depositForm, checkNumber: e.target.value })}
                                    className="input w-full"
                                />
                            </div>

                            {/* Allocations */}
                            <div className="border-t pt-4">
                                <label className="block text-sm font-medium mb-2">Allocation (to Client Ledgers)</label>
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
                                            <option value="">Select Ledger...</option>
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
                                            placeholder="Amount"
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
                                    + Add another ledger
                                </button>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowDepositForm(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Save Deposit
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
                            Withdrawal from Trust Account
                        </h2>
                        <form onSubmit={handleWithdrawal} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Trust Account</label>
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
                                <label className="block text-sm font-medium mb-1">Client Ledger</label>
                                <select
                                    value={withdrawalForm.ledgerId}
                                    onChange={e => setWithdrawalForm({ ...withdrawalForm, ledgerId: e.target.value })}
                                    className="input w-full"
                                    required
                                >
                                    <option value="">Select Ledger...</option>
                                    {ledgers.filter(l => l.status === 'ACTIVE' && Number(l.runningBalance) > 0).map(l => (
                                        <option key={l.id} value={l.id}>
                                            {(l as any).client?.name || l.clientId} - Available: {formatCurrency(Number(l.runningBalance))}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Amount ($)</label>
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
                                <label className="block text-sm font-medium mb-1">Payee Name</label>
                                <input
                                    type="text"
                                    value={withdrawalForm.payorPayee}
                                    onChange={e => setWithdrawalForm({ ...withdrawalForm, payorPayee: e.target.value })}
                                    className="input w-full"
                                    placeholder="Court, expert, client, etc."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <input
                                    type="text"
                                    value={withdrawalForm.description}
                                    onChange={e => setWithdrawalForm({ ...withdrawalForm, description: e.target.value })}
                                    className="input w-full"
                                    placeholder="Fee, expense, refund, etc."
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Check # (Optional)</label>
                                <input
                                    type="text"
                                    value={withdrawalForm.checkNumber}
                                    onChange={e => setWithdrawalForm({ ...withdrawalForm, checkNumber: e.target.value })}
                                    className="input w-full"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowWithdrawalForm(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Save Withdrawal
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
                            Three-Way Reconciliation
                        </h2>
                        <form onSubmit={handleReconcile} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Trust Account</label>
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
                                <label className="block text-sm font-medium mb-1">Period End Date</label>
                                <input
                                    type="date"
                                    value={reconcileForm.periodEnd}
                                    onChange={e => setReconcileForm({ ...reconcileForm, periodEnd: e.target.value })}
                                    className="input w-full"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Bank Statement Balance ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={reconcileForm.bankStatementBalance}
                                    onChange={e => setReconcileForm({ ...reconcileForm, bankStatementBalance: e.target.value })}
                                    className="input w-full"
                                    placeholder="Balance from bank statement"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Notes (Optional)</label>
                                <textarea
                                    value={reconcileForm.notes}
                                    onChange={e => setReconcileForm({ ...reconcileForm, notes: e.target.value })}
                                    className="input w-full"
                                    rows={3}
                                    placeholder="Reconciliation notes..."
                                />
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg text-sm">
                                <p className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                                    Three-Way Check:
                                </p>
                                <ul className="text-blue-700 dark:text-blue-300 space-y-1">
                                    <li>✓ Bank Statement Balance</li>
                                    <li>✓ Trust Account Balance (Software)</li>
                                    <li>✓ Client Ledgers Total</li>
                                </ul>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowReconcileForm(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Perform Reconciliation
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

            {/* Create Trust Account Modal */}
            {showCreateAccount && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-green-600" />
                            Create Trust Bank Account
                        </h2>
                        <form onSubmit={handleCreateAccount} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Account Name *</label>
                                <input
                                    type="text"
                                    value={accountForm.name}
                                    onChange={e => setAccountForm({ ...accountForm, name: e.target.value })}
                                    className="input w-full"
                                    placeholder="e.g., Primary IOLTA Account"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Bank Name *</label>
                                <input
                                    type="text"
                                    value={accountForm.bankName}
                                    onChange={e => setAccountForm({ ...accountForm, bankName: e.target.value })}
                                    className="input w-full"
                                    placeholder="e.g., Chase Bank, Bank of America"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Routing/ABA Number *</label>
                                    <input
                                        type="text"
                                        value={accountForm.routingNumber}
                                        onChange={e => setAccountForm({ ...accountForm, routingNumber: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                                        className="input w-full"
                                        placeholder="9 digits"
                                        maxLength={9}
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">9-digit routing number</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Account Number *</label>
                                    <input
                                        type="text"
                                        value={accountForm.accountNumber}
                                        onChange={e => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                                        className="input w-full"
                                        placeholder="Account number"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">State/Jurisdiction *</label>
                                <select
                                    value={accountForm.jurisdiction}
                                    onChange={e => setAccountForm({ ...accountForm, jurisdiction: e.target.value })}
                                    className="input w-full"
                                    required
                                >
                                    {usStates.map(state => (
                                        <option key={state} value={state}>{state}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Each state has different IOLTA rules</p>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-sm">
                                <p className="text-blue-800 dark:text-blue-200">
                                    <strong>Note:</strong> This account must be an IOLTA-compliant trust account at an approved financial institution.
                                    Account numbers are encrypted and stored securely.
                                </p>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button type="button" onClick={() => setShowCreateAccount(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    Create Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
