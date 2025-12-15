import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { FileText, Download, Calendar, DollarSign, Clock, Users, BarChart3, Filter } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { toast } from './Toast';

interface DateRange {
    start: Date;
    end: Date;
}

const Reports: React.FC = () => {
    const { t } = useTranslation();
    const { matters, clients, timeEntries, invoices, tasks } = useData();

    const [activeReport, setActiveReport] = useState<'performance' | 'profitability' | 'matters' | 'billing'>('performance');
    const [dateRange, setDateRange] = useState<DateRange>({
        start: new Date(new Date().setMonth(new Date().getMonth() - 3)),
        end: new Date()
    });
    const [selectedAttorney, setSelectedAttorney] = useState<string>('all');
    const [isExporting, setIsExporting] = useState(false);

    // Calculate attorney performance data
    const performanceData = useMemo(() => {
        const attorneyStats: Record<string, { name: string; billableHours: number; revenue: number; matters: number; tasks: number }> = {};

        // Get unique attorneys from matters
        matters?.forEach(matter => {
            if (matter.responsibleAttorney && !attorneyStats[matter.responsibleAttorney]) {
                attorneyStats[matter.responsibleAttorney] = {
                    name: matter.responsibleAttorney,
                    billableHours: 0,
                    revenue: 0,
                    matters: 0,
                    tasks: 0
                };
            }
        });

        // Count time entries
        timeEntries?.forEach(entry => {
            const date = new Date(entry.date);
            if (date >= dateRange.start && date <= dateRange.end) {
                // For simplicity, attribute to first available attorney
                const firstAttorney = Object.keys(attorneyStats)[0];
                if (firstAttorney) {
                    attorneyStats[firstAttorney].billableHours += entry.duration / 60;
                    attorneyStats[firstAttorney].revenue += (entry.duration / 60) * entry.rate;
                }
            }
        });

        // Count matters by responsible attorney
        matters?.forEach(matter => {
            const date = new Date(matter.openDate);
            if (date >= dateRange.start && date <= dateRange.end) {
                const attorney = Object.values(attorneyStats).find(a => a.name === matter.responsibleAttorney);
                if (attorney) {
                    attorney.matters += 1;
                }
            }
        });

        // Count completed tasks
        tasks?.forEach(task => {
            if (task.completedAt) {
                const date = new Date(task.completedAt);
                if (date >= dateRange.start && date <= dateRange.end && task.assignedTo) {
                    const attorney = Object.values(attorneyStats).find(a => a.name === task.assignedTo);
                    if (attorney) {
                        attorney.tasks += 1;
                    }
                }
            }
        });

        return Object.values(attorneyStats);
    }, [timeEntries, matters, tasks, dateRange]);

    // Calculate client profitability
    const profitabilityData = useMemo(() => {
        const clientStats: Record<string, { name: string; revenue: number; hours: number; matters: number }> = {};

        clients?.forEach(client => {
            clientStats[client.id] = {
                name: client.name,
                revenue: 0,
                hours: 0,
                matters: 0
            };
        });

        // Count invoices
        invoices?.forEach(invoice => {
            const clientId = invoice.client?.id;
            if (invoice.status === 'Paid' && clientId && clientStats[clientId]) {
                clientStats[clientId].revenue += invoice.amount;
            }
        });

        // Count matters and hours per client
        matters?.forEach(matter => {
            const clientId = matter.client?.id;
            if (clientId && clientStats[clientId]) {
                clientStats[clientId].matters += 1;

                // Sum time entries for this matter
                const matterEntries = timeEntries?.filter(e => e.matterId === matter.id) || [];
                clientStats[clientId].hours += matterEntries.reduce((sum, e) => sum + e.duration / 60, 0);
            }
        });

        return Object.values(clientStats)
            .filter(c => c.revenue > 0 || c.hours > 0)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
    }, [clients, invoices, matters, timeEntries]);

    // Matter statistics by practice area
    const matterStats = useMemo(() => {
        const areaStats: Record<string, { area: string; open: number; closed: number; total: number }> = {};

        matters?.forEach(matter => {
            if (!areaStats[matter.practiceArea]) {
                areaStats[matter.practiceArea] = { area: matter.practiceArea, open: 0, closed: 0, total: 0 };
            }
            areaStats[matter.practiceArea].total += 1;
            if (matter.status === 'Open') {
                areaStats[matter.practiceArea].open += 1;
            } else {
                areaStats[matter.practiceArea].closed += 1;
            }
        });

        return Object.values(areaStats);
    }, [matters]);

    // Billing trends
    const billingTrends = useMemo(() => {
        const months: Record<string, { month: string; billed: number; collected: number }> = {};

        // Last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            months[key] = { month: key, billed: 0, collected: 0 };
        }

        invoices?.forEach(invoice => {
            const date = new Date(invoice.dueDate);
            const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            if (months[key]) {
                months[key].billed += invoice.amount;
                if (invoice.status === 'Paid') {
                    months[key].collected += invoice.amount;
                }
            }
        });

        return Object.values(months);
    }, [invoices]);

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    // Export to CSV
    const exportToCSV = async (data: any[], filename: string) => {
        setIsExporting(true);
        try {
            const headers = Object.keys(data[0] || {}).join(',');
            const rows = data.map(row => Object.values(row).join(','));
            const csv = [headers, ...rows].join('\n');

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            toast.success('Report exported successfully');
        } catch (error) {
            toast.error('Failed to export report');
        }
        setIsExporting(false);
    };

    // Export to PDF (calls server endpoint)
    const exportToPDF = async () => {
        setIsExporting(true);
        try {
            const response = await fetch('/api/reports/export/pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    reportType: activeReport,
                    dateRange: {
                        start: dateRange.start.toISOString(),
                        end: dateRange.end.toISOString()
                    },
                    data: activeReport === 'performance' ? performanceData :
                        activeReport === 'profitability' ? profitabilityData :
                            activeReport === 'matters' ? matterStats : billingTrends
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${activeReport}_report_${new Date().toISOString().split('T')[0]}.pdf`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('PDF exported successfully');
            } else {
                throw new Error('Export failed');
            }
        } catch (error) {
            toast.error('Failed to export PDF');
        }
        setIsExporting(false);
    };

    const reportTabs = [
        { id: 'performance', label: 'Attorney Performance', icon: BarChart3 },
        { id: 'profitability', label: 'Client Profitability', icon: DollarSign },
        { id: 'matters', label: 'Matter Analysis', icon: FileText },
        { id: 'billing', label: 'Billing Trends', icon: Clock }
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
                    <p className="text-gray-500 text-sm mt-1">Analyze firm performance and trends</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Date Range Picker */}
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            value={dateRange.start.toISOString().split('T')[0]}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
                            className="border-none text-sm focus:ring-0 bg-transparent"
                        />
                        <span className="text-gray-400">to</span>
                        <input
                            type="date"
                            value={dateRange.end.toISOString().split('T')[0]}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
                            className="border-none text-sm focus:ring-0 bg-transparent"
                        />
                    </div>

                    {/* Export Buttons */}
                    <button
                        onClick={() => {
                            const data = activeReport === 'performance' ? performanceData :
                                activeReport === 'profitability' ? profitabilityData :
                                    activeReport === 'matters' ? matterStats : billingTrends;
                            exportToCSV(data, activeReport);
                        }}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        CSV
                    </button>
                    <button
                        onClick={exportToPDF}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        <FileText className="w-4 h-4" />
                        PDF
                    </button>
                </div>
            </div>

            {/* Report Type Tabs */}
            <div className="flex gap-2 border-b border-gray-200 pb-4">
                {reportTabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveReport(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeReport === tab.id
                                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Report Content */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                {activeReport === 'performance' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-800">Attorney Performance</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={performanceData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="billableHours" name="Billable Hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="matters" name="Matters" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="tasks" name="Tasks Completed" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-4 gap-4">
                            {performanceData.slice(0, 4).map((attorney, i) => (
                                <div key={i} className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-sm text-gray-500">{attorney.name}</p>
                                    <p className="text-2xl font-bold text-slate-800">{attorney.billableHours.toFixed(1)}h</p>
                                    <p className="text-xs text-green-600">${attorney.revenue.toLocaleString()} revenue</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeReport === 'profitability' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-800">Top 10 Profitable Clients</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={profitabilityData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis type="number" tick={{ fontSize: 12 }} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="revenue" name="Revenue ($)" fill="#10b981" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="hours" name="Hours" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {activeReport === 'matters' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-800">Matters by Practice Area</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={matterStats}
                                            dataKey="total"
                                            nameKey="area"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={100}
                                            label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        >
                                            {matterStats.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-3">
                                {matterStats.map((stat, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                            <span className="font-medium text-slate-700">{stat.area}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <span className="text-green-600">{stat.open} open</span>
                                            <span className="text-gray-500">{stat.closed} closed</span>
                                            <span className="font-bold text-slate-800">{stat.total} total</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeReport === 'billing' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-800">Billing & Collection Trends</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={billingTrends}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                                    <Legend />
                                    <Line type="monotone" dataKey="billed" name="Billed" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="collected" name="Collected" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                <p className="text-sm text-blue-600 font-medium">Total Billed</p>
                                <p className="text-2xl font-bold text-blue-700">
                                    ${billingTrends.reduce((sum, m) => sum + m.billed, 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                                <p className="text-sm text-green-600 font-medium">Total Collected</p>
                                <p className="text-2xl font-bold text-green-700">
                                    ${billingTrends.reduce((sum, m) => sum + m.collected, 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                                <p className="text-sm text-amber-600 font-medium">Collection Rate</p>
                                <p className="text-2xl font-bold text-amber-700">
                                    {(() => {
                                        const billed = billingTrends.reduce((sum, m) => sum + m.billed, 0);
                                        const collected = billingTrends.reduce((sum, m) => sum + m.collected, 0);
                                        return billed > 0 ? ((collected / billed) * 100).toFixed(1) : 0;
                                    })()}%
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
