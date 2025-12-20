import React, { useEffect, useState } from 'react';
import { Matter, CaseStatus, PracticeArea, FeeStructure, Client, DocumentFile } from '../types';
import { Search, ChevronRight, Filter, Plus, X, Clock, FileText, Mail, Calendar, Trash } from './Icons';
import { Can } from './common/Can';
import { useTranslation } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import mammoth from 'mammoth';
import { toast } from './Toast';

const Matters: React.FC = () => {
  const { t, formatCurrency, formatDate } = useTranslation();
  const { matters, clients, leads, addMatter, updateMatter, deleteMatter, addClient, timeEntries, documents, messages, tasks } = useData();
  const [showModal, setShowModal] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState<Matter | null>(null);
  const [showDocs, setShowDocs] = useState(false);
  const [editData, setEditData] = useState<Partial<Matter> | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | CaseStatus>('all');
  const [viewingDoc, setViewingDoc] = useState<DocumentFile | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientData, setNewClientData] = useState({
    name: '',
    email: '',
    phone: '',
    mobile: '',
    company: '',
    type: 'Individual' as 'Individual' | 'Corporate',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    taxId: '',
    notes: ''
  });

  // Deep-link from Command Palette
  useEffect(() => {
    const targetId = localStorage.getItem('cmd_target_matter');
    if (!targetId) return;
    const target = matters.find(m => m.id === targetId);
    if (target) {
      setSelectedMatter(target);
      localStorage.removeItem('cmd_target_matter');
    }
  }, [matters]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    caseNumber: '',
    practiceArea: PracticeArea.CivilLitigation,
    feeStructure: FeeStructure.Hourly,
    partyId: '',
    partyType: 'client' as 'client' | 'lead',
    trustAmount: '' as string | number,
    courtType: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedClient = formData.partyType === 'client'
      ? clients.find((c) => c.id === formData.partyId)
      : undefined;
    const selectedLead = formData.partyType === 'lead'
      ? leads.find((l) => l.id === formData.partyId)
      : undefined;

    if (!selectedClient && !selectedLead) {
      return;
    }

    const resolvedClient: Client = selectedClient ?? {
      id: `lead-${selectedLead?.id || Date.now()}`,
      name: selectedLead?.name || '',
      email: '',
      phone: '',
      type: 'Individual',
      status: 'Active'
    };

    const newMatter: Matter = {
      id: `m${Date.now()}`,
      name: formData.name,
      caseNumber: formData.caseNumber || `24-${Math.floor(Math.random() * 10000)}`,
      practiceArea: formData.practiceArea,
      feeStructure: formData.feeStructure,
      status: CaseStatus.Open,
      openDate: new Date().toISOString(),
      responsibleAttorney: 'Partner',
      billableRate: 400,
      trustBalance: parseFloat(String(formData.trustAmount)) || 0,
      client: resolvedClient,
      courtType: formData.courtType
    };
    addMatter({
      ...newMatter,
      clientId: selectedClient?.id,
      clientName: resolvedClient.name,
      client: resolvedClient,
      sourceLeadId: selectedLead?.id
    });
    setShowModal(false);
    setFormData({ name: '', caseNumber: '', practiceArea: PracticeArea.CivilLitigation, feeStructure: FeeStructure.Hourly, partyId: '', partyType: 'client', trustAmount: '', courtType: '' });
  };

  // Generate a mock timeline based on matter creation + related data
  const getTimeline = (matterId: string) => {
    const items = [
      // Basic Open Event
      { type: 'opened', date: selectedMatter?.openDate || new Date().toISOString(), title: 'Case Opened', detail: 'Initial file creation' },
      // Linked Docs
      ...documents.filter(d => d.matterId === matterId || !d.matterId).slice(0, 2).map(d => ({ type: 'doc', date: d.updatedAt, title: 'Document Added', detail: d.name })),
      // Linked Time
      ...timeEntries.filter(te => te.matterId === matterId).map(te => ({ type: 'time', date: te.date, title: 'Billable Activity', detail: te.description })),
    ];
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const handleOpenDoc = async (doc: DocumentFile) => {
    if (!doc.content) {
      toast.warning('Bu dosya için içerik kaydı yok. Lütfen tekrar yükleyin.');
      return;
    }

    setViewingDoc(doc);
    setLoadingContent(true);
    setDocContent('');

    try {
      if (doc.type === 'txt') {
        const base64 = (doc.content as string).split(',')[1];
        const text = atob(base64);
        setDocContent(text);
      } else if (doc.type === 'docx') {
        const base64 = (doc.content as string).split(',')[1];
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const arrayBuffer = bytes.buffer;
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setDocContent(result.value);
      } else if (doc.type === 'pdf') {
        setDocContent(doc.content as string);
      } else {
        setDocContent(doc.content as string);
      }
    } catch (error) {
      console.error('Error opening document:', error);
      toast.error('Dosya açılırken bir hata oluştu.');
      setViewingDoc(null);
    } finally {
      setLoadingContent(false);
    }
  };

  const filteredMatters = matters.filter(m => {
    const q = search.toLowerCase();
    const matchesQuery = [m.name, m.client.name, m.caseNumber].some(v => v?.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'all' ? true : m.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="p-8 h-full flex flex-col bg-gray-50/50 relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('matters_title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('matters_subtitle')}</p>
        </div>
        <Can perform="matter.create">
          <button
            onClick={() => setShowModal(true)}
            className="bg-slate-800 text-white px-5 py-2.5 rounded-lg shadow-lg hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>{t('new_matter')}</span>
          </button>
        </Can>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm mb-6 flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border-none rounded-lg text-sm focus:outline-none focus:ring-0 text-gray-700 font-medium bg-transparent"
          />
        </div>
        <div className="h-8 w-px bg-gray-200 mx-2"></div>
        <div className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 rounded-lg transition-colors border border-gray-200 bg-white">
          <Filter className="w-4 h-4" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-transparent outline-none text-sm text-gray-700"
          >
            <option value="all">All</option>
            {Object.values(CaseStatus).map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-card flex-1 overflow-hidden flex flex-col">
        {matters.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-lg font-medium text-gray-500">No matters found.</p>
            <p className="text-sm">Create a new matter to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="pl-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-10"></th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Matter Details</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fee Structure</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Court</th>
                  <th className="px-4 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Trust Funds</th>
                  <th className="pr-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredMatters.map((matter) => (
                  <tr
                    key={matter.id}
                    onClick={() => setSelectedMatter(matter)}
                    className="hover:bg-gray-50/80 transition-all cursor-pointer group"
                  >
                    <td className="pl-6 py-4">
                      <div className={`w-1.5 h-10 rounded-full ${matter.status === CaseStatus.Open ? 'bg-emerald-500' :
                        matter.status === CaseStatus.Trial ? 'bg-red-500' :
                          matter.status === CaseStatus.Pending ? 'bg-amber-400' : 'bg-gray-300'
                        }`}></div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-sm">{matter.name}</span>
                        <span className="text-xs font-medium text-gray-400 mt-0.5">{matter.caseNumber}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-xs font-bold uppercase">
                          {matter.client.name.substring(0, 2)}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-700">{matter.client.name}</span>
                          {matter.client.company && <span className="text-xs text-gray-400">{matter.client.company}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                      <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded text-xs">
                        {matter.feeStructure || 'Hourly'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-none font-bold rounded-md 
                      ${matter.status === CaseStatus.Open ? 'bg-emerald-100 text-emerald-700' :
                          matter.status === CaseStatus.Trial ? 'bg-red-100 text-red-700' :
                            matter.status === CaseStatus.Pending ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'}`}>
                        {matter.status === CaseStatus.Open ? t('status_open') :
                          matter.status === CaseStatus.Trial ? t('status_trial') :
                            matter.status === CaseStatus.Pending ? t('status_pending') : t('status_closed')}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                      {matter.courtType || '-'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-mono font-medium text-gray-600">
                      {formatCurrency(matter.trustBalance)}
                    </td>
                    <td className="pr-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-slate-800 transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Slide-over */}
      {selectedMatter && (
        <div className="absolute inset-0 z-20 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-[1px]" onClick={() => setSelectedMatter(null)}></div>
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-gray-400 bg-white px-1.5 py-0.5 rounded border border-gray-200">{selectedMatter.caseNumber}</span>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">{selectedMatter.status}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">{selectedMatter.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{selectedMatter.client.name} • {selectedMatter.practiceArea} {selectedMatter.courtType && `• ${selectedMatter.courtType}`}</p>
              </div>
              <button onClick={() => setSelectedMatter(null)} className="p-1 hover:bg-gray-200 rounded-full text-gray-400"><X className="w-6 h-6" /></button>
            </div>

            {/* Financial Quick View */}
            <div className="p-6 grid grid-cols-2 gap-4 border-b border-gray-100">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="text-xs font-bold text-blue-600 uppercase mb-1">Trust Balance</p>
                <p className="text-xl font-mono font-bold text-slate-800">{formatCurrency(selectedMatter.trustBalance)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Fee Structure</p>
                <p className="text-xl font-bold text-slate-800">{selectedMatter.feeStructure}</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              <h3 className="font-bold text-slate-800 mb-6 text-sm uppercase tracking-wide flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" /> Case History
              </h3>

              <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 pb-8">
                {getTimeline(selectedMatter.id).map((event, idx) => (
                  <div key={idx} className="relative pl-8 group">
                    {/* Dot */}
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center 
                                      ${event.type === 'opened' ? 'bg-emerald-500' : event.type === 'doc' ? 'bg-blue-500' : 'bg-amber-500'}`}>
                    </div>

                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                        {formatDate(event.date)}
                      </span>
                      <span className="text-sm font-bold text-slate-800">{event.title}</span>
                      <p className="text-xs text-gray-500 mt-1 bg-gray-50 p-2 rounded border border-gray-100 inline-block group-hover:bg-white group-hover:shadow-sm transition-all">
                        {event.detail}
                      </p>
                    </div>
                  </div>
                ))}

                {/* "Start" dot */}
                <div className="relative pl-8">
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-gray-200"></div>
                </div>
              </div>

              {/* Matter Tasks Section */}
              <div className="mt-8">
                <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wide flex items-center gap-2">
                  <span className="w-4 h-4 text-purple-500">📋</span> Related Tasks
                </h3>
                {tasks.filter(t => t.matterId === selectedMatter.id).length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No tasks assigned to this matter.</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.filter(t => t.matterId === selectedMatter.id).map(task => (
                      <div key={task.id} className={`p-3 rounded-lg border ${task.status === 'Done' ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={`font-medium text-sm ${task.status === 'Done' ? 'text-gray-400 line-through' : 'text-slate-800'}`}>{task.title}</p>
                            {task.dueDate && (
                              <p className="text-xs text-gray-500 mt-1">
                                Due: {formatDate(task.dueDate)}
                              </p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${task.priority === 'High' ? 'bg-red-100 text-red-700' :
                            task.priority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>{task.priority}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2">
              <Can perform="matter.edit">
                <button
                  className="flex-1 py-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-100 shadow-sm"
                  onClick={() => {
                    setEditData(selectedMatter);
                    setShowModal(true);
                  }}
                >
                  Edit Matter
                </button>
              </Can>
              <Can perform="matter.delete">
                <button
                  className="py-2 px-3 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50 shadow-sm flex items-center gap-2"
                  onClick={() => {
                    if (selectedMatter) {
                      deleteMatter(selectedMatter.id);
                      setSelectedMatter(null);
                    }
                  }}
                >
                  <Trash className="w-4 h-4" /> Delete
                </button>
              </Can>
              <button
                className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 shadow-lg"
                onClick={() => setShowDocs(true)}
              >
                Open Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-slate-800">{editData ? 'Edit Matter' : t('create_matter_modal')}</h3>
              <button onClick={() => { setShowModal(false); setEditData(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={editData ? (e) => {
              e.preventDefault();
              if (editData) {
                updateMatter(editData.id!, {
                  name: editData.name,
                  caseNumber: editData.caseNumber,
                  practiceArea: editData.practiceArea,
                  feeStructure: editData.feeStructure,
                  status: editData.status,
                  billableRate: editData.billableRate,
                  trustBalance: editData.trustBalance,
                  courtType: editData.courtType,
                });
                setShowModal(false);
                setEditData(null);
              }
            } : handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('case_name')}</label>
                <input required type="text" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none" value={editData ? editData.name || '' : formData.name} onChange={e => editData ? setEditData({ ...editData, name: e.target.value }) : setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('case_number') || 'Dosya No'}</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none" placeholder="2024/123 vb." value={editData ? editData.caseNumber || '' : formData.caseNumber} onChange={e => editData ? setEditData({ ...editData, caseNumber: e.target.value }) : setFormData({ ...formData, caseNumber: e.target.value })} />
              </div>
              {!editData && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('select_client_or_lead')}</label>
                  <select
                    required
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
                    value={formData.partyId ? `${formData.partyType}:${formData.partyId}` : ''}
                    onChange={e => {
                      const value = e.target.value;
                      if (!value) {
                        setFormData({ ...formData, partyId: '', partyType: 'client' });
                        return;
                      }
                      const [type, id] = value.split(':');
                      setFormData({ ...formData, partyId: id, partyType: type as 'client' | 'lead' });
                    }}
                  >
                    <option value="">{t('select_client_placeholder')}</option>
                    <optgroup label={t('clients')}>
                      {clients.map((c) => (
                        <option key={`client-${c.id}`} value={`client:${c.id}`}>
                          {c.name} {c.company ? `(${c.company})` : ''}
                        </option>
                      ))}
                    </optgroup>
                    {leads.length > 0 && (
                      <optgroup label={t('leads')}>
                        {leads.map((l) => (
                          <option key={`lead-${l.id}`} value={`lead:${l.id}`}>
                            {l.name} • {t('lead_label')}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  {formData.partyType === 'lead' && (
                    <p className="text-xs text-amber-600 mt-1">{t('lead_selection_hint')}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowNewClientModal(true)}
                    className="mt-2 text-xs text-primary-600 hover:underline font-medium"
                  >
                    + Yeni Müvekkil Ekle
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('practice_area')}</label>
                  <select className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none" value={editData ? editData.practiceArea : formData.practiceArea} onChange={e => editData ? setEditData({ ...editData, practiceArea: e.target.value as PracticeArea }) : setFormData({ ...formData, practiceArea: e.target.value as PracticeArea })}>
                    {Object.values(PracticeArea).map(pa => <option key={pa} value={pa}>{pa}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('court_type') || 'Mahkeme Türü'}</label>
                  <input list="court-types" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none" value={editData ? editData.courtType || '' : formData.courtType} onChange={e => editData ? setEditData({ ...editData, courtType: e.target.value }) : setFormData({ ...formData, courtType: e.target.value })} />
                  <datalist id="court-types">
                    <option value="Ağır Ceza Mahkemesi" />
                    <option value="Asliye Ceza Mahkemesi" />
                    <option value="Asliye Hukuk Mahkemesi" />
                    <option value="Aile Mahkemesi" />
                    <option value="İş Mahkemesi" />
                    <option value="Sulh Hukuk Mahkemesi" />
                    <option value="İcra Hukuk Mahkemesi" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('fee_structure')}</label>
                  <select className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none" value={editData ? editData.feeStructure : formData.feeStructure} onChange={e => editData ? setEditData({ ...editData, feeStructure: e.target.value as FeeStructure }) : setFormData({ ...formData, feeStructure: e.target.value as FeeStructure })}>
                    <option value={FeeStructure.Hourly}>{t('fee_hourly')}</option>
                    <option value={FeeStructure.FlatFee}>{t('fee_flat')}</option>
                    <option value={FeeStructure.Contingency}>{t('fee_contingency')}</option>
                  </select>
                </div>
              </div>
              {editData && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none" value={editData.status} onChange={e => setEditData({ ...editData, status: e.target.value as CaseStatus })}>
                    {Object.values(CaseStatus).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('trust_account')} (Initial Deposit)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-white text-slate-900 focus:ring-2 focus:ring-primary-500 outline-none"
                  value={editData ? editData.trustBalance ?? 0 : formData.trustAmount}
                  onChange={e => {
                    const val = e.target.value;
                    if (editData) {
                      setEditData({ ...editData, trustBalance: val === '' ? 0 : parseFloat(val) });
                    } else {
                      setFormData({ ...formData, trustAmount: val === '' ? '' : parseFloat(val) });
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => { setShowModal(false); setEditData(null); }} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg">{t('cancel')}</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg">{t('save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Matter Documents Drawer */}
      {showDocs && selectedMatter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Matter Folder</h3>
                <p className="text-xs text-gray-500 mt-1">{selectedMatter.caseNumber} • {selectedMatter.name}</p>
              </div>
              <button onClick={() => setShowDocs(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-3">
              {documents.filter(d => d.matterId === selectedMatter.id).length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-sm font-medium">Bu dava için doküman bulunamadı.</p>
                  <p className="text-xs text-gray-400 mt-1">Documents sekmesinden dosya yükleyebilirsiniz.</p>
                </div>
              ) : (
                documents.filter(d => d.matterId === selectedMatter.id).map(doc => (
                  <div key={doc.id} className="border border-gray-200 rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{doc.name}</p>
                      <p className="text-xs text-gray-500">{doc.type.toUpperCase()} • {doc.size || 'Unknown'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{formatDate(doc.updatedAt)}</span>
                      {doc.content && (
                        <>
                          <button onClick={() => handleOpenDoc(doc)} className="text-xs text-primary-600 hover:underline">Aç</button>
                          <button onClick={() => {
                            const a = document.createElement('a');
                            a.href = doc.content!;
                            a.download = doc.name;
                            a.click();
                          }} className="text-xs text-gray-500 hover:underline">İndir</button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-lg text-slate-800">{viewingDoc.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{viewingDoc.size} • {formatDate(viewingDoc.updatedAt)}</p>
              </div>
              <button
                onClick={() => { setViewingDoc(null); setDocContent(''); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-white">
              {loadingContent ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-gray-400">Yükleniyor...</div>
                </div>
              ) : viewingDoc.type === 'pdf' ? (
                <iframe
                  src={docContent}
                  className="w-full h-full border-0"
                  title={viewingDoc.name}
                />
              ) : viewingDoc.type === 'txt' ? (
                <pre className="whitespace-pre-wrap font-mono text-sm text-slate-800 bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-full overflow-auto">
                  {docContent}
                </pre>
              ) : viewingDoc.type === 'docx' ? (
                <div
                  className="prose max-w-none text-slate-800"
                  dangerouslySetInnerHTML={{ __html: docContent }}
                />
              ) : (
                <img
                  src={docContent}
                  alt={viewingDoc.name}
                  className="max-w-full h-auto mx-auto"
                />
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = viewingDoc.content!;
                  a.download = viewingDoc.name;
                  a.click();
                }}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900"
              >
                İndir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Client Modal */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0">
              <h3 className="font-bold text-lg text-slate-800">Yeni Müvekkil Ekle</h3>
              <button onClick={() => { setShowNewClientModal(false); setNewClientData({ name: '', email: '', phone: '', mobile: '', company: '', type: 'Individual', address: '', city: '', state: '', zipCode: '', country: '', taxId: '', notes: '' }); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const newClient = await addClient(newClientData);
                setFormData({ ...formData, partyId: newClient.id, partyType: 'client' });
                setShowNewClientModal(false);
                setNewClientData({ name: '', email: '', phone: '', mobile: '', company: '', type: 'Individual', address: '', city: '', state: '', zipCode: '', country: '', taxId: '', notes: '' });
              } catch (error) {
                toast.error('Müvekkil oluşturulurken bir hata oluştu.');
              }
            }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ad Soyad / Şirket Adı *</label>
                  <input required type="text" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" value={newClientData.name} onChange={e => setNewClientData({ ...newClientData, name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-posta *</label>
                  <input required type="email" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" value={newClientData.email} onChange={e => setNewClientData({ ...newClientData, email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input type="tel" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" value={newClientData.phone} onChange={e => setNewClientData({ ...newClientData, phone: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cep Telefonu</label>
                  <input type="tel" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" value={newClientData.mobile} onChange={e => setNewClientData({ ...newClientData, mobile: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tür</label>
                  <select className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" value={newClientData.type} onChange={e => setNewClientData({ ...newClientData, type: e.target.value as 'Individual' | 'Corporate' })}>
                    <option value="Individual">Bireysel</option>
                    <option value="Corporate">Kurumsal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Şirket (Kurumsal ise)</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" value={newClientData.company} onChange={e => setNewClientData({ ...newClientData, company: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adres</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" value={newClientData.address} onChange={e => setNewClientData({ ...newClientData, address: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Şehir</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" value={newClientData.city} onChange={e => setNewClientData({ ...newClientData, city: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">İl/İlçe</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" value={newClientData.state} onChange={e => setNewClientData({ ...newClientData, state: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posta Kodu</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" value={newClientData.zipCode} onChange={e => setNewClientData({ ...newClientData, zipCode: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ülke</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" value={newClientData.country} onChange={e => setNewClientData({ ...newClientData, country: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vergi No / TC Kimlik No</label>
                  <input type="text" className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" value={newClientData.taxId} onChange={e => setNewClientData({ ...newClientData, taxId: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notlar</label>
                <textarea rows={3} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm" value={newClientData.notes} onChange={e => setNewClientData({ ...newClientData, notes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setShowNewClientModal(false); setNewClientData({ name: '', email: '', phone: '', mobile: '', company: '', type: 'Individual', address: '', city: '', state: '', zipCode: '', country: '', taxId: '', notes: '' }); }} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg">İptal</button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Matters;