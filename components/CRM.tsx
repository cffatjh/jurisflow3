import React, { useEffect, useState } from 'react';
import { Lead } from '../types';
import { Users, ChevronRight, Search, CheckSquare, X, Scale } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';

const CRM: React.FC = () => {
   const [view, setView] = React.useState<'pipeline' | 'clients'>('pipeline');
   const { t, formatCurrency } = useTranslation();
   const { clients, leads, addLead, updateLead, deleteLead } = useData();
   const [highlightClientId, setHighlightClientId] = useState<string | null>(null);

   const [showModal, setShowModal] = useState(false);
   const [showConflictModal, setShowConflictModal] = useState(false);
   const [newLeadName, setNewLeadName] = useState('');
   const [newLeadVal, setNewLeadVal] = useState<string | number>('');
   const [newLeadSource, setNewLeadSource] = useState('Referral');

   // Conflict Search State
   const [conflictQuery, setConflictQuery] = useState('');
   const [conflictResults, setConflictResults] = useState<any[] | null>(null);

   const pipelineStages = ['New', 'Contacted', 'Consultation', 'Retained', 'Lost'];

   // Deep-link from Command Palette
   useEffect(() => {
      const targetId = localStorage.getItem('cmd_target_client');
      if (!targetId) return;
      setView('clients');
      setHighlightClientId(targetId);
      localStorage.removeItem('cmd_target_client');
   }, []);

   const moveLead = (lead: Lead, direction: 'prev' | 'next') => {
      const idx = pipelineStages.indexOf(lead.status);
      if (idx === -1) return;
      const targetIdx = direction === 'prev' ? Math.max(0, idx - 1) : Math.min(pipelineStages.length - 1, idx + 1);
      const nextStatus = pipelineStages[targetIdx];
      updateLead(lead.id, { status: nextStatus as any });
   };

   const handleAddDeal = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newLeadName) return;

      addLead({
         id: `l${Date.now()}`,
         name: newLeadName,
         source: newLeadSource,
         estimatedValue: parseFloat(String(newLeadVal)) || 0,
         status: 'New',
         practiceArea: 'Civil Litigation' as any
      });
      setShowModal(false);
      setNewLeadName('');
      setNewLeadVal('');
   };

   const [isSearching, setIsSearching] = useState(false);

   const performConflictCheck = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!conflictQuery || conflictQuery.trim().length < 2) {
         alert('Please enter at least 2 characters');
         return;
      }

      setIsSearching(true);
      setConflictResults(null);

      try {
         const token = localStorage.getItem('auth_token');
         const res = await fetch(`/api/crm/conflict-check?q=${encodeURIComponent(conflictQuery)}`, {
            headers: {
               'Authorization': `Bearer ${token}`
            }
         });

         if (!res.ok) {
            throw new Error('Search failed');
         }

         const data = await res.json();
         setConflictResults(data);
      } catch (err) {
         console.error(err);
         alert('Failed to perform conflict check');
      } finally {
         setIsSearching(false);
      }
   };

   return (
      <div className="h-full flex flex-col bg-gray-50/50">
         <div className="px-8 py-6 flex justify-between items-center bg-white border-b border-gray-200">
            <div>
               <h1 className="text-2xl font-bold text-slate-800">{t('crm_title')}</h1>
               <p className="text-sm text-gray-500 mt-1">{t('crm_subtitle')}</p>
            </div>
            <div className="flex gap-4">
               {/* Conflict Check Button */}
               <button
                  onClick={() => { setConflictResults(null); setConflictQuery(''); setShowConflictModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors"
               >
                  <Scale className="w-4 h-4" />
                  {t('conflict_check')}
               </button>

               <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                  <button
                     onClick={() => setView('pipeline')}
                     className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'pipeline' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                     {t('pipeline')}
                  </button>
                  <button
                     onClick={() => setView('clients')}
                     className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${view === 'clients' ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                     {t('clients')}
                  </button>
               </div>
            </div>
         </div>

         {view === 'pipeline' ? (
            <div className="flex-1 overflow-x-auto p-6">
               <div className="flex gap-4 min-w-[1000px] h-full">
                  {pipelineStages.map(stage => {
                     const stageLeads = leads.filter(l => l.status === stage);
                     return (
                        <div key={stage} className="flex-1 flex flex-col min-w-[200px]">
                           <div className="flex justify-between items-center mb-4 px-2">
                              <h3 className="font-bold text-gray-700 text-sm">{stage}</h3>
                              <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{stageLeads.length}</span>
                           </div>
                           <div className="flex-1 bg-gray-100/50 rounded-xl p-2 space-y-3">
                              {stageLeads.map(lead => (
                                 <div key={lead.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow space-y-2">
                                    <div className="flex justify-between items-start mb-2">
                                       <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">{lead.practiceArea}</span>
                                       <span className="text-xs text-gray-400 font-medium">{formatCurrency(lead.estimatedValue)}</span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-sm">{lead.name}</h4>
                                    <p className="text-xs text-gray-500 mt-1">{t('source')}: {lead.source}</p>
                                    <div className="flex justify-between items-center pt-1">
                                       <div className="flex gap-1">
                                          <button onClick={() => moveLead(lead, 'prev')} className="text-[11px] px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">&larr;</button>
                                          <button onClick={() => moveLead(lead, 'next')} className="text-[11px] px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200">&rarr;</button>
                                       </div>
                                       <button onClick={() => deleteLead(lead.id)} className="text-[11px] px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100">Sil</button>
                                    </div>
                                 </div>
                              ))}
                              <button onClick={() => setShowModal(true)} className="w-full py-2 text-xs font-medium text-gray-500 border border-dashed border-gray-300 rounded hover:bg-white transition-colors">
                                 {t('add_deal')}
                              </button>
                           </div>
                        </div>
                     )
                  })}
               </div>
            </div>
         ) : (
            <div className="p-6 overflow-y-auto">
               {clients.length === 0 ? (
                  <div className="text-center text-gray-400 mt-12">No clients found. Add a Matter to create clients.</div>
               ) : (
                  <div className="bg-white rounded-xl shadow-card border border-gray-200 overflow-hidden">
                     <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                           <tr>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">ID</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t('col_name')}</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t('col_contact')}</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t('col_type')}</th>
                              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">{t('status')}</th>
                              <th className="px-6 py-4"></th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                           {clients.map(client => (
                              <tr
                                 key={client.id}
                                 className={`transition-colors ${highlightClientId === client.id ? 'bg-indigo-50' : 'hover:bg-gray-50'
                                    }`}
                              >
                                 <td className="px-6 py-4">
                                    <span className="font-mono text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                       {client.clientNumber || '-'}
                                    </span>
                                 </td>
                                 <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                       <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                                          {client.name.substring(0, 2).toUpperCase()}
                                       </div>
                                       <div>
                                          <p className="text-sm font-semibold text-slate-900">{client.name}</p>
                                          {client.company && <p className="text-xs text-gray-500">{client.company}</p>}
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-6 py-4">
                                    <p className="text-sm text-gray-600">{client.email || '-'}</p>
                                    <p className="text-xs text-gray-400">{client.phone || '-'}</p>
                                 </td>
                                 <td className="px-6 py-4">
                                    <span className="text-sm text-gray-600">{client.type}</span>
                                 </td>
                                 <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded font-medium">Active</span>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    <button className="text-gray-400 hover:text-primary-600">
                                       <ChevronRight className="w-5 h-5" />
                                    </button>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               )}
            </div>
         )}

         {/* Add Deal Modal */}
         {showModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-2xl p-6 w-96">
                  <h3 className="font-bold text-lg mb-4 text-slate-800">Add Potential Lead</h3>
                  <form onSubmit={handleAddDeal} className="space-y-3">
                     <input required className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-slate-900" placeholder="Name" value={newLeadName} onChange={e => setNewLeadName(e.target.value)} />
                     <input
                        type="number"
                        className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-slate-900"
                        placeholder="Est. Value ($)"
                        value={newLeadVal}
                        onChange={e => {
                           const val = e.target.value;
                           setNewLeadVal(val === '' ? '' : parseFloat(val))
                        }}
                     />
                     <select className="w-full border border-gray-300 p-2.5 rounded-lg bg-white text-slate-900" value={newLeadSource} onChange={e => setNewLeadSource(e.target.value)}>
                        <option>Referral</option>
                        <option>Website</option>
                        <option>Ad</option>
                     </select>
                     <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={() => setShowModal(false)} className="px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-3 py-2 bg-slate-800 text-white font-bold rounded-lg text-sm">Add</button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* Conflict Check Modal */}
         {showConflictModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                     <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Scale className="w-5 h-5" /> Conflict Check</h3>
                     <button onClick={() => setShowConflictModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-6">
                     <p className="text-sm text-gray-500 mb-4">
                        Search across all database records (Clients, Leads, Opposing Parties) to ensure no conflict of interest exists before accepting a new case.
                     </p>
                     <form onSubmit={performConflictCheck} className="flex gap-2 mb-6">
                        <input
                           autoFocus
                           type="text"
                           className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 outline-none focus:ring-2 focus:ring-primary-500"
                           placeholder="Enter name (e.g. John Doe, Corp Inc)..."
                           value={conflictQuery}
                           onChange={e => setConflictQuery(e.target.value)}
                        />
                        <button type="submit" disabled={isSearching} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50">
                           {isSearching ? 'Searching...' : 'Search'}
                        </button>
                     </form>

                     {isSearching && (
                        <div className="text-center py-8">
                           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800 mx-auto"></div>
                           <p className="mt-2 text-sm text-gray-500">Checking database...</p>
                        </div>
                     )}

                     {!isSearching && conflictResults && (
                        <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                           {conflictResults.length === 0 ? (
                              <div className="p-8 text-center">
                                 <CheckSquare className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                 <p className="text-sm font-bold text-green-700">No conflicts found.</p>
                                 <p className="text-xs text-gray-500">No records match "{conflictQuery}".</p>
                              </div>
                           ) : (
                              <div>
                                 <div className="bg-red-50 p-3 border-b border-red-100 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    <p className="text-xs font-bold text-red-700">{conflictResults.length} Potential Match(es) Found</p>
                                 </div>
                                 <div className="max-h-60 overflow-y-auto">
                                    {conflictResults.map((res, idx) => (
                                       <div key={idx} className="p-3 border-b border-gray-100 last:border-0 hover:bg-white transition-colors">
                                          <div className="flex justify-between">
                                             <span className="font-bold text-slate-800 text-sm">{res.name}</span>
                                             <span className="text-xs font-mono bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">{res.type}</span>
                                          </div>
                                          <p className="text-xs text-gray-500 mt-1">Status: {res.status}</p>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default CRM;