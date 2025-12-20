import React, { useState, useMemo } from 'react';
import { CreditCard, Plus, X, Search, Filter, Download, Edit, Trash2, CheckCircle, AlertCircle, Clock, DollarSign, FileText, Send, AlertTriangle } from './Icons';
import { Can } from './common/Can';
import { useTranslation } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { Invoice, InvoiceStatus } from '../types';
import { toast } from './Toast';
import { useConfirm } from './ConfirmDialog';

// Helper functions for status checks (handles both legacy strings and new enums)
const isPaid = (status: any) => status === 'Paid' || status === 'PAID';
const isDraft = (status: any) => status === 'Draft' || status === 'DRAFT';
const isApproved = (status: any) => status === 'APPROVED';

// Extended Invoice type with additional fields
interface ExtendedInvoice {
    id: string;
    number?: string;
    client: any;
    amount: number;
    dueDate: string;
    status: any; // Can be string or InvoiceStatus enum
    lineItems?: {
        id: string;
        description: string;
        quantity: number;
        rate: number;
        amount: number;
        type: 'time' | 'expense' | 'fixed' | string;
    }[];
    payments?: {
        id: string;
        date: string;
        amount: number;
        method: string;
        reference?: string;
    }[];
    notes?: string;
    terms?: string;
    tax?: number;
    discount?: number;
    subtotal?: number;
}

const Billing: React.FC = () => {
    const { t, formatCurrency, formatDate } = useTranslation();
    const { invoices, addInvoice, updateInvoice, deleteInvoice, matters, timeEntries, expenses, markAsBilled, clients } = useData();
    const { confirm } = useConfirm();

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<ExtendedInvoice | null>(null);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });

    // Create invoice form state
    const [selectedMatterId, setSelectedMatterId] = useState('');
    const [invoiceNotes, setInvoiceNotes] = useState('');
    const [invoiceTerms, setInvoiceTerms] = useState('Payment due within 14 days');
    const [taxRate, setTaxRate] = useState(0);
    const [discountAmount, setDiscountAmount] = useState(0);

    // Payment form state
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
    const [paymentReference, setPaymentReference] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    // Stats calculations
    const stats = useMemo(() => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const totalOutstanding = invoices.reduce((acc, inv) =>
            !isPaid(inv.status) ? acc + inv.amount : acc, 0);
        const totalPaid = invoices.reduce((acc, inv) =>
            isPaid(inv.status) ? acc + inv.amount : acc, 0);
        const overdueInvoices = invoices.filter(inv =>
            !isPaid(inv.status) && new Date(inv.dueDate) < now);
        const totalOverdue = overdueInvoices.reduce((acc, inv) => acc + inv.amount, 0);

        // WIP calculation
        const unbilledTime = timeEntries.filter(t => !t.billed).reduce((sum, t) =>
            sum + ((t.duration / 60) * t.rate), 0);
        const unbilledExp = expenses.filter(e => !e.billed).reduce((sum, e) =>
            sum + e.amount, 0);
        const totalWIP = unbilledTime + unbilledExp;

        // This month's revenue
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthPaid = invoices
            .filter(inv => isPaid(inv.status))
            .reduce((acc, inv) => acc + inv.amount, 0);

        return {
            totalOutstanding,
            totalPaid,
            totalOverdue,
            overdueCount: overdueInvoices.length,
            totalWIP,
            thisMonthPaid,
            invoiceCount: invoices.length,
            paidCount: invoices.filter(inv => isPaid(inv.status)).length,
        };
    }, [invoices, timeEntries, expenses]);

    // Filter invoices
    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            // Search
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesNumber = inv.number?.toLowerCase().includes(query);
                const matchesClient = inv.client?.name?.toLowerCase().includes(query);
                if (!matchesNumber && !matchesClient) return false;
            }
            // Status
            if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
            // Date range
            if (dateRange.from && new Date(inv.dueDate) < new Date(dateRange.from)) return false;
            if (dateRange.to && new Date(inv.dueDate) > new Date(dateRange.to)) return false;
            return true;
        });
    }, [invoices, searchQuery, statusFilter, dateRange]);

    // Calculate invoice preview
    const invoicePreview = useMemo(() => {
        if (!selectedMatterId) return null;

        const matter = matters.find(m => m.id === selectedMatterId);
        if (!matter) return null;

        const matTime = timeEntries
            .filter(t => t.matterId === selectedMatterId && !t.billed)
            .map(t => ({
                id: t.id,
                description: t.description,
                quantity: t.duration / 60,
                rate: t.rate,
                amount: (t.duration / 60) * t.rate,
                type: 'time' as const,
            }));

        const matExp = expenses
            .filter(e => e.matterId === selectedMatterId && !e.billed)
            .map(e => ({
                id: e.id,
                description: e.description,
                quantity: 1,
                rate: e.amount,
                amount: e.amount,
                type: 'expense' as const,
            }));

        const lineItems = [...matTime, ...matExp];
        const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
        const taxAmount = subtotal * (taxRate / 100);
        const total = subtotal + taxAmount - discountAmount;

        return {
            matter,
            lineItems,
            subtotal,
            taxAmount,
            discount: discountAmount,
            total,
            timeHours: matTime.reduce((sum, t) => sum + t.quantity, 0),
            expenseCount: matExp.length,
        };
    }, [selectedMatterId, matters, timeEntries, expenses, taxRate, discountAmount]);

    // Create Invoice
    const handleCreateInvoice = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMatterId || !invoicePreview) return;

        if (invoicePreview.total <= 0) {
            toast.warning('No unbilled items found for this matter.');
            return;
        }

        const newInvoice: ExtendedInvoice = {
            id: `inv${Date.now()}`,
            number: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`,
            client: invoicePreview.matter.client,
            amount: invoicePreview.total,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'DRAFT',
            lineItems: invoicePreview.lineItems,
            notes: invoiceNotes,
            terms: invoiceTerms,
            tax: invoicePreview.taxAmount,
            discount: discountAmount,
            subtotal: invoicePreview.subtotal,
        };

        addInvoice(newInvoice);
        markAsBilled(selectedMatterId);

        // Reset form
        setShowCreateModal(false);
        setSelectedMatterId('');
        setInvoiceNotes('');
        setTaxRate(0);
        setDiscountAmount(0);
        toast.success('Invoice created successfully!');
    };

    // Record Payment
    const handleRecordPayment = async () => {
        if (!selectedInvoice || !paymentAmount) return;

        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Please enter a valid payment amount');
            return;
        }

        const remainingBalance = selectedInvoice.amount - (selectedInvoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0);

        if (amount > remainingBalance) {
            toast.error(`Payment amount cannot exceed remaining balance: ${formatCurrency(remainingBalance)}`);
            return;
        }

        const newPayment = {
            id: `pay${Date.now()}`,
            date: paymentDate,
            amount,
            method: paymentMethod,
            reference: paymentReference || undefined,
        };

        const updatedPayments = [...(selectedInvoice.payments || []), newPayment];
        const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        const newStatus: any = totalPaid >= selectedInvoice.amount ? 'PAID' : 'PARTIALLY_PAID';

        updateInvoice(selectedInvoice.id, {
            payments: updatedPayments,
            status: newStatus,
        });

        // Reset form
        setShowPaymentModal(false);
        setPaymentAmount('');
        setPaymentMethod('Bank Transfer');
        setPaymentReference('');
        toast.success('Payment recorded successfully!');

        // Refresh selected invoice
        setSelectedInvoice(prev => prev ? {
            ...prev,
            payments: updatedPayments,
            status: newStatus,
        } : null);
    };

    // Send Invoice
    const handleSendInvoice = async (invoice: ExtendedInvoice) => {
        const ok = await confirm({
            title: 'Send Invoice',
            message: `Send invoice ${invoice.number} to ${invoice.client.name}?`,
            confirmText: 'Send',
            cancelText: 'Cancel',
        });
        if (!ok) return;

        updateInvoice(invoice.id, { status: 'SENT' });
        toast.success('Invoice sent to client!');
    };

    // Delete Invoice
    const handleDeleteInvoice = async (invoice: ExtendedInvoice) => {
        const ok = await confirm({
            title: 'Delete Invoice',
            message: `Are you sure you want to delete invoice ${invoice.number}? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            variant: 'danger',
        });
        if (!ok) return;

        deleteInvoice(invoice.id);
        setShowDetailModal(false);
        setSelectedInvoice(null);
        toast.success('Invoice deleted');
    };

    // Get status badge
    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            Draft: 'bg-gray-100 text-gray-700',
            DRAFT: 'bg-gray-100 text-gray-700',
            PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700',
            APPROVED: 'bg-indigo-100 text-indigo-700',
            Sent: 'bg-blue-100 text-blue-700',
            SENT: 'bg-blue-100 text-blue-700',
            Paid: 'bg-green-100 text-green-700',
            PAID: 'bg-green-100 text-green-700',
            Partial: 'bg-amber-100 text-amber-700',
            PARTIALLY_PAID: 'bg-amber-100 text-amber-700',
            Overdue: 'bg-red-100 text-red-700',
            OVERDUE: 'bg-red-100 text-red-700',
            Cancelled: 'bg-gray-100 text-gray-500',
            CANCELLED: 'bg-gray-100 text-gray-500',
            WRITTEN_OFF: 'bg-gray-100 text-gray-500',
        };
        return styles[status] || styles.Draft;
    };

    // Check if invoice is overdue
    const isOverdue = (invoice: any) => {
        return !isPaid(invoice.status) && new Date(invoice.dueDate) < new Date();
    };

    return (
        <div className="h-full flex flex-col bg-gray-50/50">
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-200 bg-white">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">{t('billing_title')}</h1>
                        <p className="text-sm text-gray-500 mt-1">{t('billing_subtitle')}</p>
                    </div>
                    <Can perform="billing.manage">
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            {t('create_invoice')}
                        </button>
                    </Can>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="px-8 py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase">{t('outstanding_balance')}</p>
                                <h2 className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(stats.totalOutstanding)}</h2>
                            </div>
                            <div className="p-3 bg-red-50 rounded-lg">
                                <AlertCircle className="w-6 h-6 text-red-500" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase">Overdue</p>
                                <h2 className="text-2xl font-bold text-amber-600 mt-1">{formatCurrency(stats.totalOverdue)}</h2>
                                <p className="text-xs text-amber-600 mt-1">{stats.overdueCount} invoices</p>
                            </div>
                            <div className="p-3 bg-amber-50 rounded-lg">
                                <AlertTriangle className="w-6 h-6 text-amber-500" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase">{t('paid_last_30')}</p>
                                <h2 className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(stats.totalPaid)}</h2>
                                <p className="text-xs text-emerald-600 mt-1">{stats.paidCount} paid</p>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-lg">
                                <CheckCircle className="w-6 h-6 text-emerald-500" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase">{t('unbilled_wip')}</p>
                                <h2 className="text-2xl font-bold text-slate-800 mt-1">{formatCurrency(stats.totalWIP)}</h2>
                                <p className="text-xs text-gray-500 mt-1">Time + Expenses</p>
                            </div>
                            <div className="p-3 bg-slate-100 rounded-lg">
                                <Clock className="w-6 h-6 text-slate-600" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-r from-primary-600 to-indigo-600 p-5 rounded-xl shadow-sm text-white">
                        <div>
                            <p className="text-xs font-semibold text-white/80 uppercase">This Month</p>
                            <h2 className="text-2xl font-bold mt-1">{formatCurrency(stats.thisMonthPaid)}</h2>
                            <p className="text-xs text-white/80 mt-1">Revenue collected</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="px-8 pb-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-3 items-center">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search invoices..."
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                        <option value="all">All Status</option>
                        <option value="Draft">Draft</option>
                        <option value="DRAFT">Draft (New)</option>
                        <option value="PENDING_APPROVAL">Pending Approval</option>
                        <option value="APPROVED">Approved</option>
                        <option value="Sent">Sent</option>
                        <option value="SENT">Sent (New)</option>
                        <option value="PARTIALLY_PAID">Partially Paid</option>
                        <option value="Paid">Paid</option>
                        <option value="PAID">Paid (New)</option>
                        <option value="Overdue">Overdue</option>
                    </select>

                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={dateRange.from}
                            onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
                            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                        />
                        <span className="text-gray-400">to</span>
                        <input
                            type="date"
                            value={dateRange.to}
                            onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
                            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                        />
                    </div>

                    <button
                        onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('all');
                            setDateRange({ from: '', to: '' });
                        }}
                        className="px-3 py-2.5 text-gray-500 hover:text-gray-700 text-sm"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Invoice Table */}
            <div className="flex-1 px-8 pb-8 overflow-hidden">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full flex flex-col overflow-hidden">
                    {filteredInvoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center flex-1 text-gray-400">
                            <CreditCard className="w-16 h-16 opacity-20 mb-4" />
                            <p className="text-lg font-medium">No invoices found</p>
                            <p className="text-sm mt-1">Create your first invoice to get started</p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700"
                            >
                                Create Invoice
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-y-auto flex-1">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase sticky top-0">
                                    <tr>
                                        <th className="px-6 py-4">{t('col_invoice')}</th>
                                        <th className="px-6 py-4">{t('col_client')}</th>
                                        <th className="px-6 py-4">Issue Date</th>
                                        <th className="px-6 py-4">{t('col_due_date')}</th>
                                        <th className="px-6 py-4 text-right">{t('col_amount')}</th>
                                        <th className="px-6 py-4 text-right">Paid</th>
                                        <th className="px-6 py-4">{t('status')}</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredInvoices.map(inv => {
                                        const extInv = inv as unknown as ExtendedInvoice;
                                        const totalPaid = extInv.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
                                        const displayStatus = isOverdue(inv) && !isPaid(inv.status) ? 'Overdue' : inv.status;

                                        return (
                                            <tr
                                                key={inv.id}
                                                className="hover:bg-gray-50 cursor-pointer"
                                                onClick={() => {
                                                    setSelectedInvoice(extInv);
                                                    setShowDetailModal(true);
                                                }}
                                            >
                                                <td className="px-6 py-4">
                                                    <span className="font-mono text-sm font-bold text-slate-900">{inv.number}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-gray-700">{inv.client?.name}</div>
                                                    <div className="text-xs text-gray-500">{inv.client?.email}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {formatDate(new Date().toISOString())}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {formatDate(inv.dueDate)}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="font-bold text-gray-800">{formatCurrency(inv.amount)}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={`font-medium ${totalPaid > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                        {formatCurrency(totalPaid)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusBadge(displayStatus)}`}>
                                                        {displayStatus}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                                        {inv.status === 'DRAFT' && (
                                                            <Can perform="billing.manage">
                                                                <button
                                                                    onClick={() => handleSendInvoice(extInv)}
                                                                    className="p-2 hover:bg-blue-50 rounded-lg text-blue-600"
                                                                    title="Send Invoice"
                                                                >
                                                                    <Send className="w-4 h-4" />
                                                                </button>
                                                            </Can>
                                                        )}
                                                        {inv.status !== 'PAID' && (
                                                            <Can perform="billing.manage">
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedInvoice(extInv);
                                                                        setShowPaymentModal(true);
                                                                    }}
                                                                    className="p-2 hover:bg-green-50 rounded-lg text-green-600"
                                                                    title="Record Payment"
                                                                >
                                                                    <DollarSign className="w-4 h-4" />
                                                                </button>
                                                            </Can>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteInvoice(extInv)}
                                                            className="p-2 hover:bg-red-50 rounded-lg text-red-600"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Invoice Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900">{t('create_invoice')}</h3>
                            <button onClick={() => setShowCreateModal(false)}>
                                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            <form onSubmit={handleCreateInvoice}>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Left - Form */}
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Select Matter *</label>
                                            <select
                                                required
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                                value={selectedMatterId}
                                                onChange={e => setSelectedMatterId(e.target.value)}
                                            >
                                                <option value="">-- Select Matter --</option>
                                                {matters.map(m => (
                                                    <option key={m.id} value={m.id}>{m.caseNumber} - {m.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    min="0"
                                                    max="100"
                                                    value={taxRate === 0 ? '' : taxRate}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/[^0-9.]/g, '');
                                                        setTaxRate(val === '' ? 0 : parseFloat(val));
                                                    }}
                                                    placeholder="0"
                                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Discount</label>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    min="0"
                                                    value={discountAmount === 0 ? '' : discountAmount}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/[^0-9.]/g, '');
                                                        setDiscountAmount(val === '' ? 0 : parseFloat(val));
                                                    }}
                                                    placeholder="0"
                                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                            <textarea
                                                value={invoiceNotes}
                                                onChange={e => setInvoiceNotes(e.target.value)}
                                                rows={3}
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                                placeholder="Additional notes for the client..."
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                                            <input
                                                type="text"
                                                value={invoiceTerms}
                                                onChange={e => setInvoiceTerms(e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Right - Preview */}
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                        <h4 className="font-bold text-gray-700 mb-4">Invoice Preview</h4>

                                        {!invoicePreview ? (
                                            <div className="text-center py-8 text-gray-400">
                                                <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                                                <p>Select a matter to preview invoice</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="bg-white p-3 rounded-lg border border-gray-200">
                                                    <div className="text-sm font-bold text-gray-700">{invoicePreview.matter.client.name}</div>
                                                    <div className="text-xs text-gray-500">{invoicePreview.matter.caseNumber} - {invoicePreview.matter.name}</div>
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="text-xs font-bold text-gray-500 uppercase">Line Items</div>
                                                    {invoicePreview.lineItems.length === 0 ? (
                                                        <div className="text-sm text-gray-400 italic">No unbilled items</div>
                                                    ) : (
                                                        <div className="max-h-40 overflow-y-auto space-y-1">
                                                            {invoicePreview.lineItems.slice(0, 5).map(item => (
                                                                <div key={item.id} className="flex justify-between text-xs bg-white p-2 rounded border border-gray-100">
                                                                    <span className="truncate flex-1">{item.description}</span>
                                                                    <span className="font-bold text-gray-700 ml-2">{formatCurrency(item.amount)}</span>
                                                                </div>
                                                            ))}
                                                            {invoicePreview.lineItems.length > 5 && (
                                                                <div className="text-xs text-gray-400 text-center">
                                                                    +{invoicePreview.lineItems.length - 5} more items
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="border-t border-gray-200 pt-3 space-y-2">
                                                    <div className="flex justify-between text-sm">
                                                        <span className="text-gray-500">Subtotal</span>
                                                        <span className="font-medium">{formatCurrency(invoicePreview.subtotal)}</span>
                                                    </div>
                                                    {invoicePreview.taxAmount > 0 && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-500">Tax ({taxRate}%)</span>
                                                            <span className="font-medium">{formatCurrency(invoicePreview.taxAmount)}</span>
                                                        </div>
                                                    )}
                                                    {invoicePreview.discount > 0 && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-gray-500">Discount</span>
                                                            <span className="font-medium text-red-600">-{formatCurrency(invoicePreview.discount)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                                                        <span>Total</span>
                                                        <span className="text-primary-600">{formatCurrency(invoicePreview.total)}</span>
                                                    </div>
                                                </div>

                                                <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-700">
                                                    <strong>{invoicePreview.timeHours.toFixed(1)} hours</strong> of time and <strong>{invoicePreview.expenseCount} expenses</strong> will be marked as billed.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg"
                                    >
                                        {t('cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!invoicePreview || invoicePreview.total <= 0}
                                        className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Generate Invoice
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Detail Modal */}
            {showDetailModal && selectedInvoice && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900">Invoice {selectedInvoice.number}</h3>
                                <p className="text-sm text-gray-500">{selectedInvoice.client?.name}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusBadge(isOverdue(selectedInvoice) && selectedInvoice.status !== 'Paid' ? 'Overdue' : selectedInvoice.status)}`}>
                                    {isOverdue(selectedInvoice) && selectedInvoice.status !== 'Paid' ? 'Overdue' : selectedInvoice.status}
                                </span>
                                <button onClick={() => setShowDetailModal(false)}>
                                    <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Invoice Summary */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-xs font-bold text-gray-500 uppercase">Amount</div>
                                    <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(selectedInvoice.amount)}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-xs font-bold text-gray-500 uppercase">Paid</div>
                                    <div className="text-2xl font-bold text-emerald-600 mt-1">
                                        {formatCurrency(selectedInvoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-xs font-bold text-gray-500 uppercase">Balance Due</div>
                                    <div className="text-2xl font-bold text-red-600 mt-1">
                                        {formatCurrency(selectedInvoice.amount - (selectedInvoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0))}
                                    </div>
                                </div>
                            </div>

                            {/* Line Items */}
                            {selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="font-bold text-gray-700 mb-3">Line Items</h4>
                                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left text-xs font-bold text-gray-500">Description</th>
                                                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-500">Qty</th>
                                                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-500">Rate</th>
                                                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-500">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {selectedInvoice.lineItems.map(item => (
                                                    <tr key={item.id}>
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium">{item.description}</div>
                                                            <div className="text-xs text-gray-500 capitalize">{item.type}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">{item.quantity.toFixed(2)}</td>
                                                        <td className="px-4 py-3 text-right">{formatCurrency(item.rate)}</td>
                                                        <td className="px-4 py-3 text-right font-bold">{formatCurrency(item.amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Payment History */}
                            {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="font-bold text-gray-700 mb-3">Payment History</h4>
                                    <div className="space-y-2">
                                        {selectedInvoice.payments.map(payment => (
                                            <div key={payment.id} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                                                <div>
                                                    <div className="font-medium text-emerald-800">{formatCurrency(payment.amount)}</div>
                                                    <div className="text-xs text-emerald-600">
                                                        {formatDate(payment.date)} • {payment.method}
                                                        {payment.reference && ` • Ref: ${payment.reference}`}
                                                    </div>
                                                </div>
                                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {selectedInvoice.notes && (
                                <div className="mb-6">
                                    <h4 className="font-bold text-gray-700 mb-2">Notes</h4>
                                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedInvoice.notes}</p>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
                            <button
                                onClick={() => handleDeleteInvoice(selectedInvoice)}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium"
                            >
                                Delete Invoice
                            </button>
                            <div className="flex gap-2">
                                {(selectedInvoice.status === 'DRAFT' || selectedInvoice.status === 'DRAFT') && (
                                    <>
                                        <button
                                            onClick={async () => {
                                                updateInvoice(selectedInvoice.id, { status: 'APPROVED' });
                                                toast.success('Fatura onaylandı!');
                                                setSelectedInvoice(prev => prev ? { ...prev, status: 'APPROVED' as any } : null);
                                            }}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
                                        >
                                            ✓ Approve
                                        </button>
                                        <button
                                            onClick={() => handleSendInvoice(selectedInvoice)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
                                        >
                                            Send Invoice
                                        </button>
                                    </>
                                )}
                                {(selectedInvoice.status === 'APPROVED') && (
                                    <button
                                        onClick={() => handleSendInvoice(selectedInvoice)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700"
                                    >
                                        Send Invoice
                                    </button>
                                )}
                                {selectedInvoice.status !== 'PAID' && (
                                    <button
                                        onClick={() => {
                                            setShowDetailModal(false);
                                            setShowPaymentModal(true);
                                        }}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700"
                                    >
                                        Record Payment
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Record Payment Modal */}
            {showPaymentModal && selectedInvoice && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-900">Record Payment</h3>
                            <button onClick={() => setShowPaymentModal(false)}>
                                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <div className="text-sm text-gray-500">Invoice {selectedInvoice.number}</div>
                                <div className="flex justify-between mt-1">
                                    <span className="font-bold text-gray-900">Balance Due:</span>
                                    <span className="font-bold text-red-600">
                                        {formatCurrency(selectedInvoice.amount - (selectedInvoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0))}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={paymentAmount}
                                    onChange={e => setPaymentAmount(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                                <input
                                    type="date"
                                    value={paymentDate}
                                    onChange={e => setPaymentDate(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                                <select
                                    value={paymentMethod}
                                    onChange={e => setPaymentMethod(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                >
                                    <option>Bank Transfer</option>
                                    <option>Credit Card</option>
                                    <option>Check</option>
                                    <option>Cash</option>
                                    <option>Other</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reference (optional)</label>
                                <input
                                    type="text"
                                    value={paymentReference}
                                    onChange={e => setPaymentReference(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                                    placeholder="Transaction ID, check number, etc."
                                />
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="flex-1 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRecordPayment}
                                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700"
                            >
                                Record Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Billing;