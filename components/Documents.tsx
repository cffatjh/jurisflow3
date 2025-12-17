import React, { useRef, useState, useEffect } from 'react';
import { DocumentFile } from '../types';
import { Folder, FileText, Search, Plus, Filter, X, Trash2 } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { api } from '../services/api';
import mammoth from 'mammoth';
import { googleDocsService } from '../services/googleDocsService';
import { toast } from './Toast';
import { useConfirm } from './ConfirmDialog';

// API base URL - production'da relative path kullan
const API_BASE_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';

const Documents: React.FC = () => {
  const { t, formatDate } = useTranslation();
  const { matters, documents, addDocument, updateDocument, deleteDocument, bulkAssignDocuments } = useData();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [selectedMatter, setSelectedMatter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingDoc, setViewingDoc] = useState<DocumentFile | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [showMatterModal, setShowMatterModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [selectedMatterForUpload, setSelectedMatterForUpload] = useState<string>('');
  const [editingDoc, setEditingDoc] = useState<DocumentFile | null>(null);
  const [editMatterId, setEditMatterId] = useState<string>('');
  const [editTags, setEditTags] = useState<string>('');
  const [isGoogleDocsConnected, setIsGoogleDocsConnected] = useState(false);
  const [googleDocsAccessToken, setGoogleDocsAccessToken] = useState<string | null>(
    localStorage.getItem('google_docs_access_token')
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkMatterId, setBulkMatterId] = useState<string>('');

  useEffect(() => {
    setIsGoogleDocsConnected(!!googleDocsAccessToken);
  }, [googleDocsAccessToken]);

  const handleGoogleDocsConnect = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

    if (!clientId) {
      toast.error('Google Client ID bulunamadı! Lütfen .env dosyasına VITE_GOOGLE_CLIENT_ID ekleyin. (Detay: GOOGLE_INTEGRATION_SETUP.md)');
      return;
    }

    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = 'https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/drive.readonly';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    window.location.href = authUrl;
  };

  const handleGoogleDocsSync = async () => {
    if (!googleDocsAccessToken) return;

    try {
      const docs = await googleDocsService.getDocuments(googleDocsAccessToken);
      docs.forEach(doc => {
        addDocument({
          id: doc.id,
          name: doc.name,
          type: 'docx',
          size: 'Google Doc',
          updatedAt: doc.modifiedTime,
          content: doc.webViewLink
        });
      });
      toast.success('Google Docs synced successfully!');
    } catch (error) {
      console.error('Google Docs sync error:', error);
      toast.error('Failed to sync Google Docs. Please reconnect.');
      localStorage.removeItem('google_docs_access_token');
      setGoogleDocsAccessToken(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPendingFile(file);
      setShowMatterModal(true);
    }
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;

    try {
      // Upload to server
      const uploadedDoc = await api.uploadDocument(
        pendingFile,
        selectedMatterForUpload || undefined,
        undefined
      );

      if (uploadedDoc) {
        // Add to local state immediately
        const doc: DocumentFile = {
          id: uploadedDoc.id,
          name: uploadedDoc.name,
          type: uploadedDoc.mimeType?.includes('pdf') ? 'pdf' :
            uploadedDoc.mimeType?.includes('word') ? 'docx' :
              uploadedDoc.mimeType?.includes('text') ? 'txt' : 'img',
          size: `${(uploadedDoc.fileSize / 1024 / 1024).toFixed(2)} MB`,
          updatedAt: uploadedDoc.createdAt,
          matterId: uploadedDoc.matterId || undefined,
          filePath: uploadedDoc.filePath
        };

        // Add to context state - this will persist
        addDocument(doc);

        // Close modal and reset
        setShowMatterModal(false);
        setPendingFile(null);
        setSelectedMatterForUpload('');
        toast.success('✓ Dosya başarıyla yüklendi!');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Dosya yüklenirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  const filteredDocs = documents.filter(doc => {
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const hay = [
        doc.name,
        doc.description || '',
        ...(doc.tags || [])
      ].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    // Filter by matter if selected
    if (selectedMatter) {
      // If a matter is selected, only show documents for that matter
      if (doc.matterId !== selectedMatter) return false;
    }
    // If "My Files" is selected (selectedMatter === null), show ALL documents

    // Filter by type
    if (filterType === 'all') return true;
    return doc.type === filterType;
  });

  const getMatterName = (matterId?: string) => {
    if (!matterId) return 'Unassigned';
    const matter = matters.find(m => m.id === matterId);
    return matter ? `${matter.caseNumber} - ${matter.name}` : 'Unknown Matter';
  };

  const handleOpen = async (doc: DocumentFile) => {
    setViewingDoc(doc);
    setLoadingContent(true);
    setDocContent('');

    try {
      // If file has filePath, load from server
      if (doc.filePath) {
        const fileUrl = `${API_BASE_URL}${doc.filePath}`;

        if (doc.type === 'pdf') {
          // PDF: show in iframe
          setDocContent(fileUrl);
        } else if (doc.type === 'txt') {
          const response = await fetch(fileUrl);
          const text = await response.text();
          setDocContent(text);
        } else if (doc.type === 'docx') {
          const response = await fetch(fileUrl);
          const arrayBuffer = await response.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocContent(result.value);
        } else {
          // Images: show directly
          setDocContent(fileUrl);
        }
      } else if (doc.content) {
        // Fallback to old content storage
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
      } else {
        toast.warning('Bu dosya için içerik kaydı yok.');
        setViewingDoc(null);
      }
    } catch (error) {
      console.error('Error opening document:', error);
      toast.error('Dosya açılırken bir hata oluştu.');
      setViewingDoc(null);
    } finally {
      setLoadingContent(false);
    }
  };

  // Deep-link from Command Palette
  useEffect(() => {
    const targetId = localStorage.getItem('cmd_target_document');
    if (!targetId) return;
    const target = documents.find(d => d.id === targetId);
    if (target) {
      handleOpen(target);
      localStorage.removeItem('cmd_target_document');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents]);

  const handleDelete = async (doc: DocumentFile) => {
    const ok = await confirm({
      title: 'Dosyayı sil',
      message: `"${doc.name}" dosyasını silmek istediğinize emin misiniz?`,
      confirmText: 'Sil',
      cancelText: 'İptal',
      variant: 'danger'
    });
    if (!ok) return;

    // Optimistically remove from UI
    deleteDocument(doc.id);

    try {
      await api.deleteDocument(doc.id);
      toast.success('✓ Dosya silindi');
    } catch (error: any) {
      // Re-add document if deletion failed
      addDocument(doc);
      toast.error('Dosya silinirken hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  const handleDownload = async (doc: DocumentFile) => {
    try {
      if (doc.filePath) {
        // Download from server using fetch to avoid opening new tab
        const fileUrl = `${API_BASE_URL}${doc.filePath}`;
        const token = localStorage.getItem('auth_token');

        const response = await fetch(fileUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!response.ok) {
          throw new Error('Dosya indirilemedi');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else if (doc.content) {
        // Fallback to old content storage
        const link = document.createElement('a');
        link.href = doc.content as string;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        toast.warning('Bu dosya için içerik kaydı yok.');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      toast.error('Dosya indirilirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'));
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const clearSelected = () => {
    setSelectedIds([]);
    setBulkMatterId('');
  };

  const applyBulkAssign = async () => {
    if (selectedIds.length === 0) return;
    await bulkAssignDocuments(selectedIds, bulkMatterId || null);
    toast.success('✓ Dokümanlar güncellendi');
    clearSelected();
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('docs_title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('docs_subtitle')}</p>
        </div>
        <div className="flex gap-3 relative">
          <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Ara: isim / etiket / açıklama..."
              className="bg-transparent outline-none text-sm text-slate-700 placeholder:text-gray-400 w-56"
            />
          </div>
          <button
            onClick={() => setShowFilter(!showFilter)}
            className={`flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm font-medium transition-colors ${showFilter ? 'border-primary-500 text-primary-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
            <Filter className="w-4 h-4" /> {t('filter')}
          </button>

          {showFilter && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white shadow-xl rounded-lg border border-gray-100 z-10 p-2">
              <div className="text-xs font-bold text-gray-400 px-2 py-1 uppercase">Type</div>
              <button onClick={() => { setFilterType('all'); setShowFilter(false); }} className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded">All Files</button>
              <button onClick={() => { setFilterType('pdf'); setShowFilter(false); }} className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded">PDFs</button>
              <button onClick={() => { setFilterType('docx'); setShowFilter(false); }} className="w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50 rounded">Documents</button>
            </div>
          )}

          <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          {isGoogleDocsConnected && (
            <button
              onClick={handleGoogleDocsSync}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm">
              <FileText className="w-4 h-4" /> Sync Google Docs
            </button>
          )}
          {!isGoogleDocsConnected && (
            <button
              onClick={handleGoogleDocsConnect}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
              <FileText className="w-4 h-4" /> Connect Google Docs
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> {t('upload')}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Tree */}
        <div className="w-64 border-r border-gray-100 bg-gray-50 p-4 flex flex-col gap-1 overflow-y-auto">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-2">Locations</div>
          <button
            onClick={() => setSelectedMatter(null)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors text-left ${selectedMatter === null
                ? 'bg-white border border-gray-200 text-primary-600 shadow-sm'
                : 'hover:bg-gray-100 text-gray-600'
              }`}
          >
            <Folder className="w-4 h-4" /> {t('my_files')}
          </button>

          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-6 mb-2 px-2">{t('nav_matters')}</div>
          {matters.length === 0 && <div className="px-2 text-xs text-gray-400 italic">No matters created.</div>}
          {matters.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMatter(m.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left truncate ${selectedMatter === m.id
                  ? 'bg-white border border-gray-200 text-primary-600 shadow-sm'
                  : 'hover:bg-gray-100 text-gray-600'
                }`}
            >
              <Folder className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="truncate">{m.caseNumber}</span>
            </button>
          ))}
        </div>

        {/* File Grid */}
        <div className="flex-1 p-6 overflow-y-auto">
          {selectedIds.length > 0 && (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="text-sm text-indigo-900 font-semibold">
                {selectedIds.length} doküman seçildi
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={bulkMatterId}
                  onChange={e => setBulkMatterId(e.target.value)}
                  className="px-3 py-2 border border-indigo-200 rounded-lg bg-white text-sm"
                >
                  <option value="">-- Unassigned --</option>
                  {matters.map(m => (
                    <option key={m.id} value={m.id}>{m.caseNumber} - {m.name}</option>
                  ))}
                </select>
                <button
                  onClick={applyBulkAssign}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700"
                >
                  Matter’a Ata
                </button>
                <button
                  onClick={clearSelected}
                  className="px-3 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-50"
                >
                  Temizle
                </button>
              </div>
            </div>
          )}
          {filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Folder className="w-16 h-16 opacity-20 mb-4" />
              <p>No documents found.</p>
              <div className="flex gap-3 mt-4">
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700">
                  Upload a file
                </button>
                {isGoogleDocsConnected ? (
                  <button onClick={handleGoogleDocsSync} className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700">
                    Sync Google Docs
                  </button>
                ) : (
                  <button onClick={handleGoogleDocsConnect} className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700">
                    Connect Google Docs
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredDocs.map(doc => (
                <div key={doc.id} className="group p-4 bg-white border border-gray-200 rounded-xl hover:shadow-card hover:border-primary-200 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <label className="flex items-center gap-2 text-xs text-gray-500">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(doc.id)}
                        onChange={() => toggleSelected(doc.id)}
                        className="rounded border-gray-300"
                      />
                      Seç
                    </label>
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${doc.type === 'folder' ? 'bg-blue-50 text-blue-500' :
                        doc.type === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'
                      }`}>
                      {doc.type === 'folder' ? <Folder className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpen(doc)} className="text-xs text-primary-600 hover:underline">Aç</button>
                      <button onClick={() => handleDownload(doc)} className="text-xs text-gray-500 hover:underline">İndir</button>
                      <button
                        onClick={() => {
                          setEditingDoc(doc);
                          setEditMatterId(doc.matterId || '');
                          setEditTags((doc.tags || []).join(', '));
                        }}
                        className="text-xs text-gray-500 hover:underline"
                        title="Assign to matter"
                      >
                        📁
                      </button>
                      <button
                        onClick={() => handleDelete(doc)}
                        className="text-xs text-red-600 hover:underline"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-medium text-slate-800 truncate text-sm" title={doc.name}>{doc.name}</h3>
                  <div className="mt-2 space-y-1">
                    {doc.matterId && (
                      <div className="text-xs text-primary-600 font-medium truncate" title={getMatterName(doc.matterId)}>
                        📁 {getMatterName(doc.matterId)}
                      </div>
                    )}
                    {doc.tags && doc.tags.length > 0 && (
                      <div className="text-[11px] text-gray-500 truncate" title={doc.tags.join(', ')}>
                        🏷️ {doc.tags.join(', ')}
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>{doc.size || 'Unknown'}</span>
                      <span>{formatDate(doc.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
            {/* Header */}
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

            {/* Content */}
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

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => handleDownload(viewingDoc)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900"
              >
                İndir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Matter Modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-lg text-slate-800">Assign Document to Matter</h3>
              <p className="text-sm text-gray-500 mt-1">{editingDoc.name}</p>
            </div>

            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Matter</label>
              <select
                value={editMatterId}
                onChange={(e) => setEditMatterId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">-- No Matter (Unassigned) --</option>
                {matters.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.caseNumber} - {m.name}
                  </option>
                ))}
              </select>

              <label className="block text-sm font-medium text-gray-700 mb-2 mt-4">Tags</label>
              <input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="örn: sözleşme, vekalet, delil"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingDoc(null);
                  setEditMatterId('');
                  setEditTags('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (editingDoc) {
                    const tags = editTags
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean);
                    await updateDocument(editingDoc.id, { matterId: editMatterId || undefined, tags });
                    toast.success('✓ Doküman güncellendi');
                    setEditingDoc(null);
                    setEditMatterId('');
                    setEditTags('');
                  }
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Matter Selection Modal */}
      {showMatterModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-lg text-slate-800">Select Matter</h3>
              <p className="text-sm text-gray-500 mt-1">Choose a matter to associate with this document</p>
            </div>

            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Matter</label>
              <select
                value={selectedMatterForUpload}
                onChange={(e) => setSelectedMatterForUpload(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">-- No Matter (Unassigned) --</option>
                {matters.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.caseNumber} - {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowMatterModal(false);
                  setPendingFile(null);
                  setSelectedMatterForUpload('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documents;