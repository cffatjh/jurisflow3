import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import { useTranslation } from '../contexts/LanguageContext';
import { Clock, Pause, Timer, CheckSquare, CreditCard, Plus, X } from './Icons';
import { TimeEntry, Expense } from '../types';
import { toast } from './Toast';

const TimeTracker = () => {
  const { t, formatCurrency, formatDate } = useTranslation();
  const { matters, addTimeEntry, addExpense, timeEntries, expenses } = useData();
  
  const [activeTab, setActiveTab] = useState<'time' | 'expense'>('time');

  // --- TIMER STATE ---
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerDisplay, setTimerDisplay] = useState(0); // Total seconds to show
  
  // Refs for logic (values that don't trigger re-renders but are crucial for calculation)
  const startTimeRef = useRef<number | null>(null);
  const accumulatedTimeRef = useRef<number>(0);
  const intervalRef = useRef<any>(null);

  // Form State
  const [selectedMatterId, setSelectedMatterId] = useState('');
  const [description, setDescription] = useState('');
  const [hourlyRate, setHourlyRate] = useState<number | string>(450);
  
  // Expense Form State
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Court Fee');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseMatterId, setExpenseMatterId] = useState('');

  // --- TIMER LOGIC ---

  // Update the display every second if running
  useEffect(() => {
    if (isTimerRunning) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const currentSessionDuration = Math.floor((now - (startTimeRef.current || now)) / 1000);
        setTimerDisplay(accumulatedTimeRef.current + currentSessionDuration);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isTimerRunning]);

  const toggleTimer = () => {
    if (!isTimerRunning) {
      // START - Matter selection is now optional (can be "Serbest")
      startTimeRef.current = Date.now();
      setIsTimerRunning(true);
    } else {
      // PAUSE
      if (startTimeRef.current) {
        const now = Date.now();
        const sessionDuration = Math.floor((now - startTimeRef.current) / 1000);
        accumulatedTimeRef.current += sessionDuration;
      }
      startTimeRef.current = null;
      setIsTimerRunning(false);
    }
  };

  const saveTimeEntry = () => {
    // 1. Calculate final time
    let finalSeconds = accumulatedTimeRef.current;
    
    // If running, add the current session
    if (isTimerRunning && startTimeRef.current) {
        finalSeconds += Math.floor((Date.now() - startTimeRef.current) / 1000);
    }

    if (finalSeconds === 0) {
        return; 
    }

    // Matter selection is optional - can be "Serbest" (free/unassigned)
    // 2. Create Entry
    const newEntry: TimeEntry = {
        id: `t${Date.now()}`,
        matterId: selectedMatterId || undefined, // Optional - can be null for "Serbest"
        description: description || 'General Legal Services',
        duration: Math.ceil(finalSeconds / 60), // Save as minutes
        rate: Number(hourlyRate) || 0,
        date: new Date().toISOString(),
        billed: false,
        type: 'time'
    };

    // 3. Save
    addTimeEntry(newEntry);
    toast.success('Time Entry Saved');

    // 4. Reset Everything Hard
    clearInterval(intervalRef.current);
    setIsTimerRunning(false);
    
    startTimeRef.current = null;
    accumulatedTimeRef.current = 0;
    setTimerDisplay(0);
    setDescription('');
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
      ...timeEntries.map(x => ({...x, sortDate: new Date(x.date)})),
      ...expenses.map(x => ({...x, sortDate: new Date(x.date)}))
  ].sort((a,b) => b.sortDate.getTime() - a.sortDate.getTime());

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
                           disabled={isTimerRunning}
                        >
                            <option value="">Serbest (Free/Unassigned)</option>
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
                        onClick={toggleTimer}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-white shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 ${isTimerRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-primary-600 hover:bg-primary-700'}`}
                     >
                         {isTimerRunning ? <Pause className="w-5 h-5" /> : <Timer className="w-5 h-5" />}
                         {isTimerRunning ? "Pause" : "Start"}
                     </button>
                     <button 
                        onClick={saveTimeEntry}
                        disabled={timerDisplay === 0 && !isTimerRunning}
                        className="flex-1 py-3 px-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                         <CheckSquare className="w-5 h-5" />
                         Save
                     </button>
                 </div>
             </div>
         ) : (
             <div className="flex flex-col md:flex-row gap-6 items-end animate-in fade-in slide-in-from-top-4 duration-300">
                 <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
                     <div className="flex flex-col">
                         <label className="text-xs font-bold text-gray-500 uppercase mb-1">{t('select_matter')}</label>
                         <select 
                            className="border border-gray-300 rounded-lg p-2.5 bg-white text-slate-900 text-sm outline-none"
                            value={expenseMatterId}
                            onChange={e => setExpenseMatterId(e.target.value)}
                         >
                             <option value="">Serbest (Free/Unassigned)</option>
                             {matters.map(m => <option key={m.id} value={m.id}>{m.caseNumber} - {m.name}</option>)}
                         </select>
                     </div>
                     <div className="flex flex-col">
                         <label className="text-xs font-bold text-gray-500 uppercase mb-1">{t('expense_amount')}</label>
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
                 <h3 className="font-bold text-slate-800">{t('recent_entries')}</h3>
                 <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full font-bold">{allEntries.length} Items</span>
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
                                             {isExp ? <CreditCard className="w-4 h-4"/> : <Clock className="w-4 h-4"/>}
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