import React, { useState, useEffect } from 'react';
import { CreditCard, Check, AlertCircle, Clock, DollarSign } from '../Icons';
import { Payment, Invoice } from '../../types';

interface ClientPaymentsProps {
    clientId: string;
}

const ClientPayments: React.FC<ClientPaymentsProps> = ({ clientId }) => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('clientToken');
            const res = await fetch('/api/client/invoices', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInvoices(data);
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async (invoice: any) => {
        setSelectedInvoice(invoice);
        setProcessing(true);

        // Simulate payment process - in real app, this would integrate with Stripe
        try {
            const token = localStorage.getItem('clientToken');
            // In a real implementation, this would create a Stripe PaymentIntent
            // and redirect to Stripe Checkout or use Stripe Elements

            // For demo purposes, we'll simulate a successful payment
            await new Promise(resolve => setTimeout(resolve, 2000));

            alert('Payment successful! (Demo mode)');
            setSelectedInvoice(null);
            fetchData();
        } catch (error) {
            console.error('Payment error:', error);
            alert('Payment failed.');
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Paid':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 flex items-center gap-1"><Check className="w-3 h-3" /> Paid</span>;
            case 'Overdue':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Overdue</span>;
            case 'Sent':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 flex items-center gap-1"><Clock className="w-3 h-3" /> Sent</span>;
            case 'Draft':
                return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Draft</span>;
            default:
                return null;
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const unpaidInvoices = invoices.filter(inv => inv.status !== 'Paid' && inv.status !== 'Draft');
    const paidInvoices = invoices.filter(inv => inv.status === 'Paid');

    return (
        <div className="p-6 h-full overflow-auto">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Payments</h2>
                    <p className="text-gray-600 mt-1">View your invoices and make online payments</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Unpaid</p>
                                <p className="text-xl font-bold text-gray-900">
                                    {formatCurrency(unpaidInvoices.reduce((sum, inv) => sum + inv.amount, 0))}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <Check className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Paid</p>
                                <p className="text-xl font-bold text-gray-900">
                                    {formatCurrency(paidInvoices.reduce((sum, inv) => sum + inv.amount, 0))}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Total Invoices</p>
                                <p className="text-xl font-bold text-gray-900">{invoices.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Unpaid Invoices */}
                {unpaidInvoices.length > 0 && (
                    <div className="mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Unpaid Invoices</h3>
                        <div className="space-y-3">
                            {unpaidInvoices.map((invoice) => (
                                <div key={invoice.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                                                <DollarSign className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-semibold text-gray-900">Fatura #{invoice.number}</span>
                                                    {getStatusBadge(invoice.status)}
                                                </div>
                                                <p className="text-sm text-gray-500">Due date: {formatDate(invoice.dueDate)}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-xl font-bold text-gray-900">{formatCurrency(invoice.amount)}</span>
                                            <button
                                                onClick={() => handlePayment(invoice)}
                                                disabled={processing && selectedInvoice?.id === invoice.id}
                                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                            >
                                                {processing && selectedInvoice?.id === invoice.id ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                        Processing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <CreditCard className="w-4 h-4" />
                                                        Pay Now
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Paid Invoices */}
                {paidInvoices.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment History</h3>
                        <div className="space-y-3">
                            {paidInvoices.map((invoice) => (
                                <div key={invoice.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 opacity-75">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                                <Check className="w-6 h-6 text-green-600" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-semibold text-gray-900">Fatura #{invoice.number}</span>
                                                    {getStatusBadge(invoice.status)}
                                                </div>
                                                <p className="text-sm text-gray-500">Paid on: {formatDate(invoice.dueDate)}</p>
                                            </div>
                                        </div>
                                        <span className="text-xl font-bold text-gray-900">{formatCurrency(invoice.amount)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {invoices.length === 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                        <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices yet</h3>
                        <p className="text-gray-500">Invoices from your attorney will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClientPayments;
