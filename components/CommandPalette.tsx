import React, { useEffect, useState, useRef } from 'react';
import { Search, Plus, CreditCard, Users, Briefcase, FileText, Calendar, Clock, ChevronRight } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

type PaletteItem =
  | { id: string; label: string; icon: any; kind: 'action' | 'nav'; tab: string; hint?: string }
  | { id: string; label: string; icon: any; kind: 'matter'; tab: 'matters'; matterId: string; hint?: string }
  | { id: string; label: string; icon: any; kind: 'document'; tab: 'documents'; documentId: string; hint?: string }
  | { id: string; label: string; icon: any; kind: 'client'; tab: 'crm'; clientId: string; hint?: string }
  | { id: string; label: string; icon: any; kind: 'task'; tab: 'tasks'; taskId: string; hint?: string };

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const { t } = useTranslation();
  const { matters, clients, documents, tasks } = useData();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  const actions: PaletteItem[] = [
    { id: 'new_matter', label: t('new_matter'), icon: Briefcase, kind: 'action', tab: 'matters', hint: 'Command' },
    { id: 'new_timer', label: t('start_timer'), icon: Clock, kind: 'action', tab: 'time', hint: 'Command' },
    { id: 'new_invoice', label: t('create_invoice'), icon: CreditCard, kind: 'action', tab: 'billing', hint: 'Command' },
    { id: 'nav_dashboard', label: 'Go to Dashboard', icon: ChevronRight, kind: 'nav', tab: 'dashboard', hint: 'Jump To' },
    { id: 'nav_matters', label: 'Go to Matters', icon: ChevronRight, kind: 'nav', tab: 'matters', hint: 'Jump To' },
    { id: 'nav_tasks', label: 'Go to Tasks', icon: ChevronRight, kind: 'nav', tab: 'tasks', hint: 'Jump To' },
    { id: 'nav_calendar', label: 'Go to Calendar', icon: Calendar, kind: 'nav', tab: 'calendar', hint: 'Jump To' },
    { id: 'nav_docs', label: 'Go to Documents', icon: FileText, kind: 'nav', tab: 'documents', hint: 'Jump To' },
    { id: 'nav_crm', label: 'Go to CRM', icon: Users, kind: 'nav', tab: 'crm', hint: 'Jump To' },
  ];

  const q = query.trim().toLowerCase();

  const matchedMatters: PaletteItem[] = !q
    ? []
    : matters
        .filter(m => [m.name, m.caseNumber, m.client?.name].some(v => (v || '').toLowerCase().includes(q)))
        .slice(0, 6)
        .map(m => ({
          id: `matter-${m.id}`,
          label: `${m.caseNumber} • ${m.name}`,
          icon: Briefcase,
          kind: 'matter',
          tab: 'matters',
          matterId: m.id,
          hint: m.client?.name ? `Client: ${m.client.name}` : undefined
        }));

  const matchedClients: PaletteItem[] = !q
    ? []
    : clients
        .filter(c => [c.name, c.email, c.company].some(v => (v || '').toLowerCase().includes(q)))
        .slice(0, 6)
        .map(c => ({
          id: `client-${c.id}`,
          label: c.name,
          icon: Users,
          kind: 'client',
          tab: 'crm',
          clientId: c.id,
          hint: c.email || c.company || undefined
        }));

  const matchedDocs: PaletteItem[] = !q
    ? []
    : documents
        .filter(d => (d.name || '').toLowerCase().includes(q))
        .slice(0, 6)
        .map(d => ({
          id: `doc-${d.id}`,
          label: d.name,
          icon: FileText,
          kind: 'document',
          tab: 'documents',
          documentId: d.id,
          hint: d.updatedAt ? new Date(d.updatedAt).toLocaleString() : undefined
        }));

  const matchedTasks: PaletteItem[] = !q
    ? []
    : tasks
        .filter(tsk => [tsk.title, tsk.description, tsk.assignedTo, tsk.status].some(v => (v || '').toLowerCase().includes(q)))
        .slice(0, 8)
        .map(tsk => ({
          id: `task-${tsk.id}`,
          label: tsk.title,
          icon: Clock,
          kind: 'task',
          tab: 'tasks',
          taskId: tsk.id,
          hint: `${tsk.status}${tsk.dueDate ? ` • Due ${new Date(tsk.dueDate).toLocaleDateString()}` : ''}`
        }));

  const matchedActions: PaletteItem[] = actions.filter(a => !q || a.label.toLowerCase().includes(q));

  const sections = q
    ? [
        { title: 'Matters', items: matchedMatters },
        { title: 'Documents', items: matchedDocs },
        { title: 'Tasks', items: matchedTasks },
        { title: 'Clients', items: matchedClients },
        { title: 'Commands', items: matchedActions },
      ].filter(s => s.items.length > 0)
    : [{ title: 'Suggestions', items: actions }];

  const flatItems = sections.flatMap(s => s.items);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % Math.max(1, flatItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + Math.max(1, flatItems.length)) % Math.max(1, flatItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[activeIndex]) {
        handleSelect(flatItems[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleSelect = (item: PaletteItem) => {
    if (item.kind === 'matter') {
      localStorage.setItem('cmd_target_matter', item.matterId);
    } else if (item.kind === 'document') {
      localStorage.setItem('cmd_target_document', item.documentId);
    } else if (item.kind === 'client') {
      localStorage.setItem('cmd_target_client', item.clientId);
    } else if (item.kind === 'task') {
      localStorage.setItem('cmd_target_task', item.taskId);
    }
    onNavigate(item.tab);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ring-1 ring-gray-900/5">
        <div className="flex items-center px-4 py-3 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            className="flex-1 px-4 py-2 bg-transparent text-slate-800 placeholder-gray-400 focus:outline-none text-lg"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={handleKeyDown}
          />
          <div className="hidden sm:flex items-center gap-1">
             <kbd className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-500 border border-gray-200">ESC</kbd>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
           {flatItems.length === 0 ? (
             <div className="px-6 py-8 text-center text-gray-500 text-sm">No commands found.</div>
           ) : (
             <>
               {sections.map((section) => (
                 <div key={section.title} className="mb-2">
                   <div className="px-4 py-1 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                     {section.title}
                   </div>
                   {section.items.map((action) => {
                     const idx = flatItems.findIndex(x => x.id === action.id);
                     return (
                       <button
                         key={action.id}
                         onClick={() => handleSelect(action as any)}
                         onMouseEnter={() => setActiveIndex(idx)}
                         className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                           idx === activeIndex ? 'bg-indigo-50 text-indigo-900' : 'text-slate-700 hover:bg-gray-50'
                         }`}
                       >
                         <div className={`p-2 rounded-lg ${idx === activeIndex ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                           <action.icon className="w-5 h-5" />
                         </div>
                         <div className="flex-1 overflow-hidden">
                           <span className={`text-sm font-medium ${idx === activeIndex ? 'font-bold' : ''} truncate block`}>
                             {action.label}
                           </span>
                           <span className="block text-[10px] text-gray-400 uppercase truncate">
                             {action.hint || (action.kind === 'action' ? 'Command' : action.kind === 'nav' ? 'Jump To' : action.kind)}
                           </span>
                         </div>
                         {idx === activeIndex && <ChevronRight className="w-4 h-4 text-indigo-400" />}
                       </button>
                     );
                   })}
                 </div>
               ))}
             </>
           )}
        </div>
        
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
            <span>JurisFlow OS v1.2</span>
            <div className="flex gap-2">
                <span>Navigate <kbd className="font-sans font-bold">↑↓</kbd></span>
                <span>Select <kbd className="font-sans font-bold">↵</kbd></span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;