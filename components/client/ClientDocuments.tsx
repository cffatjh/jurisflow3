import React, { useState, useEffect, useRef } from 'react';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import { DocumentFile } from '../../types';
import { Folder, FileText, Download, Plus, X } from '../Icons';
import mammoth from 'mammoth';
import { googleDocsService } from '../../services/googleDocsService';
import { toast } from '../Toast';
import { getGoogleClientId } from '../../services/googleConfig';

const ClientDocuments: React.FC = () => {
  const { client } = useClientAuth();
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [matters, setMatters] = useState<any[]>([]);
  const [selectedMatter, setSelectedMatter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [selectedMatterForUpload, setSelectedMatterForUpload] = useState<string>('');
  const [viewingDoc, setViewingDoc] = useState<DocumentFile | null>(null);
  const [docContent, setDocContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [isGoogleDocsConnected, setIsGoogleDocsConnected] = useState(false);
  const [googleDocsAccessToken, setGoogleDocsAccessToken] = useState<string | null>(
    localStorage.getItem('google_docs_access_token')
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsGoogleDocsConnected(!!googleDocsAccessToken);
  }, [googleDocsAccessToken]);

  const handleGoogleDocsConnect = () => {
    const clientId = getGoogleClientId();

    if (!clientId) return;

    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = 'https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/drive.readonly';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
    window.location.href = authUrl;
  };

  const handleGoogleDocsSync = async () => {
    if (!googleDocsAccessToken) return;

    try {
      const docs = await googleDocsService.getDocuments(googleDocsAccessToken);
      const newDocs = docs.map(doc => ({
        id: doc.id,
        name: doc.name,
        type: 'docx' as const,
        size: 'Google Doc',
        updatedAt: doc.modifiedTime,
        matterId: undefined,
        content: doc.webViewLink
      }));

      // Save to localStorage
      const existingDocs = JSON.parse(localStorage.getItem('documents') || '[]');
      const updatedDocs = [...newDocs, ...existingDocs];
      localStorage.setItem('documents', JSON.stringify(updatedDocs));

      setDocuments([...newDocs, ...documents]);
      toast.success('Google Docs synced successfully!');
    } catch (error) {
      console.error('Google Docs sync error:', error);
      toast.error('Failed to sync Google Docs. Please reconnect.');
      localStorage.removeItem('google_docs_access_token');
      setGoogleDocsAccessToken(null);
      setIsGoogleDocsConnected(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('client_token');
        const mattersRes = await fetch('/api/client/matters', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const mattersData = await mattersRes.json();
        setMatters(mattersData);

        // Load documents from localStorage (they're stored there in the main app)
        // In production, this would come from the API
        const storedDocs = localStorage.getItem('documents');
        if (storedDocs) {
          const allDocs = JSON.parse(storedDocs);
          const matterIds = mattersData.map((m: any) => m.id);
          const clientDocs = allDocs.filter((doc: DocumentFile) =>
            doc.matterId && matterIds.includes(doc.matterId)
          );
          setDocuments(clientDocs);
        }
      } catch (error) {
        console.error('Error loading documents:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredDocs = selectedMatter
    ? documents.filter(doc => doc.matterId === selectedMatter)
    : documents;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPendingFile(file);
      setShowUploadModal(true);
    }
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const isTxt = pendingFile.name.endsWith('.txt');
      const isDocx = pendingFile.name.endsWith('.docx');
      const isPdf = pendingFile.name.endsWith('.pdf');

      const payload: DocumentFile = {
        id: `d${Date.now()}`,
        name: pendingFile.name,
        type: isPdf ? 'pdf' : isDocx ? 'docx' : isTxt ? 'txt' : 'img',
        size: `${(pendingFile.size / 1024 / 1024).toFixed(2)} MB`,
        updatedAt: new Date().toISOString(),
        matterId: selectedMatterForUpload || undefined,
        content: reader.result as string
      };

      // Save to localStorage (in production, this would go to API)
      const existingDocs = JSON.parse(localStorage.getItem('documents') || '[]');
      existingDocs.push(payload);
      localStorage.setItem('documents', JSON.stringify(existingDocs));

      setDocuments([payload, ...documents]);
      setShowUploadModal(false);
      setPendingFile(null);
      setSelectedMatterForUpload('');

      // Also send to server if API endpoint exists
      try {
        const token = localStorage.getItem('client_token');
        await fetch('/api/client/documents/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        console.error('Error uploading to server:', error);
      }
    };
    reader.readAsDataURL(pendingFile);
  };

  const handleOpen = async (doc: DocumentFile) => {
    if (!doc.content) {
      toast.warning('No content available for this file.');
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
      toast.error('An error occurred while opening the file.');
      setViewingDoc(null);
    } finally {
      setLoadingContent(false);
    }
  };

  const handleDownload = (doc: DocumentFile) => {
    if (!doc.content) {
      toast.warning('No content available for this file.');
      return;
    }
    const link = document.createElement('a');
    link.href = doc.content;
    link.download = doc.name;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Documents</h2>
          <p className="text-gray-600 mt-1">Access and upload documents related to your cases</p>
        </div>
        <div className="flex gap-2">
          <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          {isGoogleDocsConnected ? (
            <button
              onClick={handleGoogleDocsSync}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4" /> Sync Google Docs
            </button>
          ) : (
            <button
              onClick={handleGoogleDocsConnect}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4" /> Connect Google Docs
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Upload Document
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Matter Filter */}
        <div className="w-64 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-bold text-slate-900 mb-3">Filter by Case</h3>
          <button
            onClick={() => setSelectedMatter(null)}
            className={`w-full text-left px-3 py-2 rounded-lg mb-2 ${selectedMatter === null ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'
              }`}
          >
            All Documents
          </button>
          {matters.map(matter => (
            <button
              key={matter.id}
              onClick={() => setSelectedMatter(matter.id)}
              className={`w-full text-left px-3 py-2 rounded-lg mb-2 ${selectedMatter === matter.id ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'
                }`}
            >
              {matter.caseNumber}
            </button>
          ))}
        </div>

        {/* Documents Grid */}
        <div className="flex-1">
          {filteredDocs.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-400">No documents found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map(doc => (
                <div key={doc.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${doc.type === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-600'
                      }`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleOpen(doc)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="View"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-1 truncate">{doc.name}</h4>
                  <div className="text-xs text-gray-500">
                    {doc.size || 'Unknown size'} • {new Date(doc.updatedAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="font-bold text-lg text-slate-800">Upload Document</h3>
              <p className="text-sm text-gray-500 mt-1">{pendingFile?.name}</p>
            </div>

            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Case (Optional)</label>
              <select
                value={selectedMatterForUpload}
                onChange={(e) => setSelectedMatterForUpload(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- No Case (General) --</option>
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
                  setShowUploadModal(false);
                  setPendingFile(null);
                  setSelectedMatterForUpload('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Upload
              </button>
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
                <p className="text-xs text-gray-500 mt-1">{viewingDoc.size} • {new Date(viewingDoc.updatedAt).toLocaleDateString()}</p>
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
                  <div className="text-gray-400">Loading...</div>
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
                onClick={() => handleDownload(viewingDoc)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDocuments;

