import React, { useState, useMemo } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { FileText, Download, Calendar, DollarSign, Clock, Users, BarChart3, Filter } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { toast } from './Toast';

// Helper function for status checks (handles both legacy strings and new enums)
const isPaid = (status: any) => status === 'Paid' || status === 'PAID';

interface DateRange {
    start: Date;
    end: Date;
}

const Reports: React.FC = () => {
    const { t } = useTranslation();
    const { matters, clients, timeEntries, invoices, tasks } = useData();

    const [activeReport, setActiveReport] = useState<'performance' | 'profitability' | 'matters' | 'billing' | 'kpis'>('performance');
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
            if (isPaid(invoice.status) && clientId && clientStats[clientId]) {
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
                if (isPaid(invoice.status)) {
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

    // Export to PDF (Client-side)
    const exportToPDF = async () => {
        setIsExporting(true);
        try {
            const element = document.getElementById('report-content');
            if (!element) throw new Error('Report content not found');

            const canvas = await html2canvas(element, {
                scale: 2,
                logging: false,
                useCORS: true,
                backgroundColor: '#ffffff'
            } as any);

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pdfHeight;
            }

            pdf.save(`report-${activeReport}-${new Date().toISOString().split('T')[0]}.pdf`);
            toast.success(t('entry_saved') || 'Report exported successfully');
        } catch (error) {
            console.error('Error exporting PDF:', error);
            toast.error(t('error_login') || 'Failed to export PDF');
        } finally {
            setIsExporting(false);
        }
    };

    const reportTabs = [
        { id: 'performance', label: t('rep_attorney_perf'), icon: BarChart3 },
        { id: 'profitability', label: t('rep_top_clients'), icon: DollarSign },
        { id: 'matters', label: t('rep_matters'), icon: FileText },
        { id: 'billing', label: t('rep_billing_trends'), icon: Clock },
        { id: 'kpis', label: t('rep_kpi'), icon: Users }
    ];

    // Advanced KPIs calculation
    const kpiData = useMemo(() => {
        const now = new Date();

        // Total available hours (standard 8h/day, 20 days/month for 3 months = 480 hours per attorney)
        const attorneyCount = Object.keys(performanceData).length || 1;
        const totalAvailableHours = attorneyCount * 480;

        // Total billable hours worked
        const totalBillableHours = timeEntries?.reduce((sum, t) => sum + (t.duration / 60), 0) || 0;

        // Total hours billed to clients (from invoices)
        const totalBilledAmount = invoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0;
        const totalCollected = invoices?.filter(i => i.status === 'PAID').reduce((sum, inv) => sum + inv.amount, 0) || 0;

        // Worked value (hours * rate)
        const totalWorkedValue = timeEntries?.reduce((sum, t) => sum + ((t.duration / 60) * t.rate), 0) || 0;

        // Utilization Rate = Billable Hours / Available Hours
        const utilizationRate = totalAvailableHours > 0 ? (totalBillableHours / totalAvailableHours) * 100 : 0;

        // Realization Rate = Billed / Worked Value
        const realizationRate = totalWorkedValue > 0 ? (totalBilledAmount / totalWorkedValue) * 100 : 0;

        // Collection Rate = Collected / Billed
        const collectionRate = totalBilledAmount > 0 ? (totalCollected / totalBilledAmount) * 100 : 0;

        // A/R Aging buckets
        const aging = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };

        invoices?.forEach(inv => {
            if (inv.status === 'PAID') return;

            const dueDate = new Date(inv.dueDate);
            const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

            if (daysOverdue <= 0) {
                aging.current += inv.amount;
            } else if (daysOverdue <= 30) {
                aging.days30 += inv.amount;
            } else if (daysOverdue <= 60) {
                aging.days60 += inv.amount;
            } else if (daysOverdue <= 90) {
                aging.days90 += inv.amount;
            } else {
                aging.over90 += inv.amount;
            }
        });

        // WIP (Work In Progress) - unbilled time & expenses
        const wip = timeEntries?.filter(t => !t.billed).reduce((sum, t) => sum + ((t.duration / 60) * t.rate), 0) || 0;

        return {
            utilizationRate,
            realizationRate,
            collectionRate,
            totalBillableHours,
            totalBilledAmount,
            totalCollected,
            wip,
            aging,
            agingData: [
                { name: 'Current', value: aging.current, color: '#10b981' },
                { name: '1-30 Days', value: aging.days30, color: '#f59e0b' },
                { name: '31-60 Days', value: aging.days60, color: '#f97316' },
                { name: '61-90 Days', value: aging.days90, color: '#ef4444' },
                { name: '90+ Days', value: aging.over90, color: '#dc2626' }
            ]
        };
    }, [timeEntries, invoices, performanceData]);

    return (
        <div className="p-6 space-y-6 h-full overflow-y-auto">
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
                        {t('export_csv')}
                    </button>
                    <button
                        onClick={exportToPDF}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        <FileText className="w-4 h-4" />
                        {t('export_pdf')}
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
            <div id="report-content" className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                {activeReport === 'performance' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-800">{t('rep_attorney_perf')}</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={performanceData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="billableHours" name={t('rep_billable_hours')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="matters" name={t('rep_matters')} fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="tasks" name={t('rep_tasks_completed')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
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
                        <h3 className="text-lg font-bold text-slate-800">{t('rep_top_clients')}</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={profitabilityData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis type="number" tick={{ fontSize: 12 }} />
                                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="revenue" name={t('rep_revenue')} fill="#10b981" radius={[0, 4, 4, 0]} />
                                    <Bar dataKey="hours" name={t('rep_hours')} fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {activeReport === 'matters' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-800">{t('rep_matters_by_area')}</h3>
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
                        <h3 className="text-lg font-bold text-slate-800">{t('rep_billing_trends')}</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={billingTrends}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                                    <Legend />
                                    <Bar dataKey="billed" name={t('rep_billed')} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="collected" name={t('rep_collected')} fill="#10b981" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                                <p className="text-sm text-blue-600 font-medium">{t('rep_total_billed')}</p>
                                <p className="text-2xl font-bold text-blue-700">
                                    ${billingTrends.reduce((sum, m) => sum + m.billed, 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                                <p className="text-sm text-green-600 font-medium">{t('rep_total_collected')}</p>
                                <p className="text-2xl font-bold text-green-700">
                                    ${billingTrends.reduce((sum, m) => sum + m.collected, 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                                <p className="text-sm text-amber-600 font-medium">{t('rep_collection_rate')}</p>
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

                {activeReport === 'kpis' && (
                    <div className="space-y-6">
                        <h3 className="text-lg font-bold text-slate-800">{t('rep_kpi')}</h3>

                        {/* Rate Cards */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                                <p className="text-sm text-blue-100 font-medium">{t('rep_utilization')}</p>
                                <p className="text-3xl font-bold mt-2">{kpiData.utilizationRate.toFixed(1)}%</p>
                                <p className="text-xs text-blue-200 mt-1">{t('rep_util_desc')}</p>
                                <div className="mt-3 bg-blue-400/30 rounded-full h-2">
                                    <div
                                        className="bg-white rounded-full h-2 transition-all"
                                        style={{ width: `${Math.min(kpiData.utilizationRate, 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
                                <p className="text-sm text-purple-100 font-medium">{t('rep_realization')}</p>
                                <p className="text-3xl font-bold mt-2">{kpiData.realizationRate.toFixed(1)}%</p>
                                <p className="text-xs text-purple-200 mt-1">{t('rep_real_desc')}</p>
                                <div className="mt-3 bg-purple-400/30 rounded-full h-2">
                                    <div
                                        className="bg-white rounded-full h-2 transition-all"
                                        style={{ width: `${Math.min(kpiData.realizationRate, 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
                                <p className="text-sm text-emerald-100 font-medium">{t('rep_collection_kpi')}</p>
                                <p className="text-3xl font-bold mt-2">{kpiData.collectionRate.toFixed(1)}%</p>
                                <p className="text-xs text-emerald-200 mt-1">{t('rep_coll_desc')}</p>
                                <div className="mt-3 bg-emerald-400/30 rounded-full h-2">
                                    <div
                                        className="bg-white rounded-full h-2 transition-all"
                                        style={{ width: `${Math.min(kpiData.collectionRate, 100)}%` }}
                                    />
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
                                <p className="text-sm text-amber-100 font-medium">{t('rep_wip')}</p>
                                <p className="text-3xl font-bold mt-2">${kpiData.wip.toLocaleString()}</p>
                                <p className="text-xs text-amber-200 mt-1">{t('rep_wip_desc')}</p>
                            </div>
                        </div>

                        {/* A/R Aging Chart */}
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <h4 className="font-bold text-gray-700 mb-4">{t('rep_ar_aging')}</h4>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={kpiData.agingData} layout="vertical">
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis type="number" tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                                            <YAxis dataKey="name" type="category" width={80} />
                                            <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                {kpiData.agingData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div>
                                <h4 className="font-bold text-gray-700 mb-4">{t('rep_aging_breakdown')}</h4>
                                <div className="space-y-3">
                                    {kpiData.agingData.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="font-medium text-gray-700">{item.name}</span>
                                            </div>
                                            <span className="font-bold text-gray-900">${item.value.toLocaleString()}</span>
                                        </div>
                                    ))}
                                    <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg text-white">
                                        <span className="font-bold">{t('rep_total_outstanding')}</span>
                                        <span className="font-bold text-lg">
                                            ${Object.values(kpiData.aging).reduce((a, b) => a + b, 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;
