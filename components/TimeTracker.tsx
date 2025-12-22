import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useTranslation } from '../contexts/LanguageContext';
import { Clock, Pause, Timer, CheckSquare, CreditCard, Plus, X, Camera } from './Icons';
import Tesseract from 'tesseract.js';
import { TimeEntry, Expense } from '../types';
import { toast } from './Toast';

const TimeTracker = () => {
    const { t, formatCurrency, formatDate } = useTranslation();
    const { matters, addTimeEntry, addExpense, timeEntries, expenses, activeTimer, startTimer, stopTimer, pauseTimer, resumeTimer } = useData();

    const [activeTab, setActiveTab] = useState<'time' | 'expense'>('time');
    const [showBilled, setShowBilled] = useState(false);

    // Display-only state (synced with activeTimer)
    const [timerDisplay, setTimerDisplay] = useState(0);

    // Interval ref for UI updating
    const intervalRef = useRef<any>(null);

    // Form State
    const [selectedMatterId, setSelectedMatterId] = useState('');
    const [description, setDescription] = useState('');
    const [hourlyRate, setHourlyRate] = useState<number | string>(450);

    // Sync form with active timer on load
    useEffect(() => {
        if (activeTimer) {
            setSelectedMatterId(activeTimer.matterId || '');
            setDescription(activeTimer.description || '');
            // Calculate initial display time
            let totalSeconds = Math.floor(activeTimer.elapsed / 1000);
            if (activeTimer.isRunning) {
                totalSeconds += Math.floor((Date.now() - activeTimer.startTime) / 1000);
            }
            setTimerDisplay(totalSeconds);
            // Sync rate if it exists in timer
            if (activeTimer.rate) {
                setHourlyRate(activeTimer.rate);
            }
        }
    }, [activeTimer?.startTime, activeTimer?.elapsed]);

    // Update rate when matter is selected (if no active timer to avoid overwriting running timer rate)
    useEffect(() => {
        if (!activeTimer && selectedMatterId) {
            const m = matters.find(matter => matter.id === selectedMatterId);
            if (m && m.billableRate) {
                setHourlyRate(m.billableRate);
            }
        }
    }, [selectedMatterId, matters, activeTimer]);


    // Expense Form State
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseCategory, setExpenseCategory] = useState('Court Fee');
    const [expenseDesc, setExpenseDesc] = useState('');
    const [expenseMatterId, setExpenseMatterId] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setIsScanning(true);
        const file = e.target.files[0];

        try {
            const { data: { text } } = await Tesseract.recognize(
                file,
                'tur+eng', // Try both Turkish and English
                { logger: m => console.log(m) }
            );

            // Simple heuristics extraction
            console.log('OCR Text:', text);
            let extractedAmount = '';
            let extractedDesc = '';

            // Try to find amount (looking for currency symbols or "Total")
            const amountMatches = text.match(/(?:Total|Tutar|Toplam|Amount|Grand Total).*?(\d+[.,]\d{2})/i);
            if (amountMatches && amountMatches[1]) {
                extractedAmount = amountMatches[1].replace(',', '.');
            } else {
                // Fallback: look for largest number that looks like a price
                const prices = text.match(/\d+[.,]\d{2}/g);
                if (prices && prices.length > 0) {
                    // rudimentary guess: usually total is near the end or is the largest? 
                    // Let's just take the first one found after typical keywords if above failed, 
                    // or just leave it blank to avoid bad guesses.
                    // Actually, let's try to match standalone numbers with currency signs
                    const currencyMatch = text.match(/[₺$€£]\s*(\d+[.,]\d{2})/);
                    if (currencyMatch) extractedAmount = currencyMatch[1].replace(',', '.');
                }
            }

            // Try to find description (Vendor name usually at top)
            const lines = text.split('\n').filter(l => l.trim().length > 3);
            if (lines.length > 0) {
                // First non-empty line is often the vendor name
                extractedDesc = lines[0].trim();
            }

            if (extractedAmount) setExpenseAmount(extractedAmount);
            if (extractedDesc) setExpenseDesc(`Fatura: ${extractedDesc}`);

            toast.success('Invoice scanned! Please verify the information.');

        } catch (error) {
            console.error(error);
            toast.error('OCR operation failed.');
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // --- TIMER UI LOOP ---
    useEffect(() => {
        if (activeTimer && activeTimer.isRunning) {
            intervalRef.current = setInterval(() => {
                const now = Date.now();
                const currentSession = Math.floor((now - activeTimer.startTime) / 1000);
                const total = Math.floor(activeTimer.elapsed / 1000) + currentSession;
                setTimerDisplay(total);
            }, 1000);
        } else {
            clearInterval(intervalRef.current);
        }
        return () => clearInterval(intervalRef.current);
    }, [activeTimer]); // Depend on activeTimer state

    const handleToggleTimer = () => {
        if (!activeTimer) {
            // START NEW TIMER
            startTimer(selectedMatterId || undefined, description, Number(hourlyRate) || 0);
        } else {
            if (activeTimer.isRunning) {
                pauseTimer();
            } else {
                resumeTimer();
            }
        }
    };

    const handleSaveTimeEntry = async () => {
        if (!activeTimer) return;

        // Stop and Save (handled by Context)
        await stopTimer();
        toast.success('Time Entry Saved');

        // Reset form
        setTimerDisplay(0);
        setDescription('');
        // retain matter choice for convenience? or reset? Let's keep matter, reset description.
    };

    const saveExpenseEntry = () => {
        // Only amount is required, matter is optional (can be "Free/Unassigned")
        if (!expenseAmount) {
            toast.error('Please fill in required fields.');
            return;
        }

        const newExpense: Expense = {
            id: `e${Date.now()}`,
            matterId: expenseMatterId || undefined, // Optional - can be null for "Free/Unassigned"
            description: expenseDesc || expenseCategory,
            amount: parseFloat(expenseAmount),
            date: new Date().toISOString(),
            category: expenseCategory as any,
            billed: false,
            type: 'expense'
        };

        addExpense(newExpense);
        toast.success('Expense Logged');
        setExpenseAmount('');
        setExpenseDesc('');
        setExpenseMatterId(''); // Reset matter selection
    };

    const formatSeconds = (sec: number) => {
        const h = Math.floor(sec / 3600).toString().padStart(2, '0');
        const m = Math.floor((sec % 3600) / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    // Combine and sort list
    const allEntries = [
        ...timeEntries.map(x => ({ ...x, sortDate: new Date(x.date) })),
        ...expenses.map(x => ({ ...x, sortDate: new Date(x.date) }))
    ]
        .filter(entry => showBilled ? true : !entry.billed)
        .sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());

    const isRunning = activeTimer?.isRunning || false;
    const hasActiveTimer = !!activeTimer;

    return (
        <div className="h-full flex flex-col bg-gray-50 overflow-hidden relative">

            {/* HEADER SECTION */}
            <div className="px-8 pt-8 pb-6 bg-white border-b border-gray-200 shrink-0">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{t('time_title')}</h1>
                        <p className="text-gray-500 text-sm">{t('time_subtitle')}</p>
                    </div>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('time')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'time' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('tab_time')}
                        </button>
                        <button
                            onClick={() => setActiveTab('expense')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'expense' ? 'bg-white text-slate-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {t('tab_expense')}
                        </button>
                    </div>
                </div>

                {/* CONTROLS AREA */}
                {activeTab === 'time' ? (
                    <div className="flex flex-col md:flex-row gap-6 items-end">
                        {/* Timer Display */}
                        <div className="bg-slate-900 text-white px-6 py-3 rounded-xl shadow-lg flex flex-col items-center justify-center min-w-[180px]">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Duration</span>
                            <span className="text-4xl font-mono font-bold tabular-nums tracking-wider">{formatSeconds(timerDisplay)}</span>
                        </div>

                        {/* Inputs */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1">{t('select_matter')}</label>
                                <select
                                    className="border border-gray-300 rounded-lg p-2.5 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                    value={selectedMatterId}
                                    onChange={e => setSelectedMatterId(e.target.value)}
                                    disabled={hasActiveTimer} // Disable changing matter while timer active for now
                                >
                                    <option value="">Free/Unassigned</option>
                                    {matters.map(m => <option key={m.id} value={m.id}>{m.caseNumber} - {m.name}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1">{t('description')}</label>
                                <input
                                    type="text"
                                    className="border border-gray-300 rounded-lg p-2.5 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="Drafting motions..."
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    disabled={hasActiveTimer} // Disable desc change for simplicity
                                />
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1">{t('hourly_rate')}</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-500 text-sm">$</span>
                                    <input
                                        type="number"
                                        className="pl-6 border border-gray-300 rounded-lg p-2.5 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-primary-500 outline-none w-full"
                                        value={hourlyRate}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setHourlyRate(val === '' ? '' : parseFloat(val));
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-2 min-w-[240px]">
                            <button
                                onClick={handleToggleTimer}
                                className={`flex-1 py-3 px-4 rounded-xl font-bold text-white shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 ${isRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary-600 hover:bg-primary-700'}`}
                            >
                                {isRunning ? <Pause className="w-5 h-5" /> : <Timer className="w-5 h-5" />}
                                {isRunning ? "Pause" : (hasActiveTimer ? "Resume" : "Start")}
                            </button>
                            <button
                                onClick={handleSaveTimeEntry}
                                disabled={!hasActiveTimer}
                                className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CheckSquare className="w-5 h-5" />
                                Save
                            </button>
                        </div>
                    </div>
                ) : (
                    // EXPENSE TAB (Keep as is)
                    <div className="flex flex-col md:flex-row gap-6 items-end animate-in fade-in slide-in-from-top-4 duration-300 relative">
                        {isScanning && (
                            <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center rounded-xl backdrop-blur-sm">
                                <div className="flex flex-col items-center">
                                    <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mb-2"></div>
                                    <p className="text-sm font-bold text-slate-800">Scanning Invoice...</p>
                                </div>
                            </div>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*,.pdf"
                            onChange={handleScan}
                        />
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1">{t('select_matter')}</label>
                                <select
                                    className="border border-gray-300 rounded-lg p-2.5 bg-white text-slate-900 text-sm outline-none"
                                    value={expenseMatterId}
                                    onChange={e => setExpenseMatterId(e.target.value)}
                                >
                                    <option value="">Free/Unassigned</option>
                                    {matters.map(m => <option key={m.id} value={m.id}>{m.caseNumber} - {m.name}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1 flex justify-between items-center">
                                    {t('expense_amount')}
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1 font-bold"
                                        title="Scan Invoice"
                                    >
                                        <Camera className="w-3 h-3" /> Scan
                                    </button>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-gray-500 text-sm">$</span>
                                    <input
                                        type="number"
                                        className="pl-6 border border-gray-300 rounded-lg p-2.5 bg-white text-slate-900 text-sm outline-none w-full"
                                        placeholder="0.00"
                                        value={expenseAmount}
                                        onChange={e => setExpenseAmount(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1">{t('expense_category')}</label>
                                <select
                                    className="border border-gray-300 rounded-lg p-2.5 bg-white text-slate-900 text-sm outline-none"
                                    value={expenseCategory}
                                    onChange={e => setExpenseCategory(e.target.value)}
                                >
                                    <option value="Court Fee">{t('category_court_fee')}</option>
                                    <option value="Travel">{t('category_travel')}</option>
                                    <option value="Printing">{t('category_printing')}</option>
                                    <option value="Research">{t('category_research')}</option>
                                    <option value="Expert">{t('category_expert')}</option>
                                    <option value="Courier">{t('category_courier')}</option>
                                    <option value="Other">{t('category_other')}</option>
                                </select>
                            </div>
                            <div className="flex flex-col">
                                <label className="text-xs font-bold text-gray-500 uppercase mb-1">{t('description')}</label>
                                <input
                                    type="text"
                                    className="border border-gray-300 rounded-lg p-2.5 bg-white text-slate-900 text-sm outline-none"
                                    placeholder="Details..."
                                    value={expenseDesc}
                                    onChange={e => setExpenseDesc(e.target.value)}
                                />
                            </div>
                        </div>
                        <button
                            onClick={saveExpenseEntry}
                            className="py-3 px-8 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-md transition-transform active:scale-95 whitespace-nowrap"
                        >
                            {t('save_expense')}
                        </button>
                    </div>
                )}
            </div>

            {/* LIST SECTION - THIS IS THE FIX FOR SCROLLING */}
            <div className="flex-1 min-h-0 bg-gray-50 p-8 flex flex-col">
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-slate-800">{t('recent_entries')}</h3>
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full font-bold">{allEntries.length} Items</span>
                        </div>
                        <label className="flex items-center gap-2 text-xs font-bold text-gray-500 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={showBilled}
                                onChange={e => setShowBilled(e.target.checked)}
                                className="rounded border-gray-300 text-slate-900 focus:ring-slate-900"
                            />
                            Show Billed / Archived
                        </label>
                    </div>

                    {/* SCROLLABLE TABLE CONTAINER */}
                    <div className="flex-1 overflow-y-auto">
                        {allEntries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                <Clock className="w-12 h-12 mb-2 opacity-20" />
                                <p>No activity logged yet.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-10"></th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('col_date')}</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('case_name')}</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('description')}</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('duration')}</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('status')}</th>
                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">{t('expense_amount')} / Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {allEntries.map((entry) => {
                                        const matter = matters.find(m => m.id === entry.matterId);
                                        const isExp = entry.type === 'expense';
                                        // Calculate cost correctly: Expense Amount OR (Minutes / 60) * Rate
                                        const cost = isExp
                                            ? (entry as Expense).amount
                                            : ((entry as TimeEntry).duration / 60) * (entry as TimeEntry).rate;

                                        return (
                                            <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className={`p-1.5 rounded-lg w-fit ${isExp ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        {isExp ? <CreditCard className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-mono text-gray-500">{formatDate(entry.date)}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-700">{matter?.name || 'Unknown Matter'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{entry.description}</td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {isExp ? '-' : (
                                                        <span className="font-mono">{Math.floor((entry as TimeEntry).duration / 60)}h {(entry as TimeEntry).duration % 60}m</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 text-xs font-bold rounded ${entry.billed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {entry.billed ? 'Billed' : 'Unbilled'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-800 text-right">
                                                    {formatCurrency(cost)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TimeTracker;