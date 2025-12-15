import React, { useState, useEffect } from 'react';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import { Invoice } from '../../types';
import { CreditCard, Download, CheckCircle } from '../Icons';

const ClientInvoices: React.FC = () => {
  const { client } = useClientAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'overdue'>('all');

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const token = localStorage.getItem('client_token');
        const res = await fetch('/api/client/invoices', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setInvoices(data);
      } catch (error) {
        console.error('Error loading invoices:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadInvoices();
  }, []);

  const filteredInvoices = invoices.filter(inv => {
    if (filter === 'paid') return inv.status === 'Paid';
    if (filter === 'unpaid') return inv.status === 'Sent';
    if (filter === 'overdue') return inv.status === 'Overdue';
    return true;
  });

  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const unpaidAmount = invoices
    .filter(i => i.status === 'Overdue' || i.status === 'Sent')
    .reduce((sum, inv) => sum + inv.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Invoices</h2>
        <p className="text-gray-600 mt-1">View and manage your invoices</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Total Invoices</div>
          <div className="text-2xl font-bold text-slate-900">{invoices.length}</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Unpaid</div>
          <div className="text-2xl font-bold text-yellow-600">
            {invoices.filter(i => i.status === 'Sent' || i.status === 'Overdue').length}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="text-sm text-gray-600 mb-1">Outstanding Balance</div>
          <div className="text-2xl font-bold text-red-600">${unpaidAmount.toLocaleString()}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-2">
          {(['all', 'unpaid', 'overdue', 'paid'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <p className="text-gray-400">No invoices found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map(invoice => (
            <div key={invoice.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CreditCard className="w-5 h-5 text-gray-400" />
                    <h3 className="text-lg font-bold text-slate-900">{invoice.number}</h3>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>Amount: <span className="font-semibold text-slate-900">${invoice.amount.toLocaleString()}</span></div>
                    <div>Due Date: {new Date(invoice.dueDate).toLocaleDateString()}</div>
                    <div>Client: {invoice.client.name}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                    invoice.status === 'Paid' ? 'bg-green-100 text-green-700' :
                    invoice.status === 'Overdue' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {invoice.status}
                  </span>
                  <div className="flex gap-2">
                    {invoice.status === 'Paid' && (
                      <div className="flex items-center gap-1 text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4" />
                        Paid
                      </div>
                    )}
                    <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientInvoices;

