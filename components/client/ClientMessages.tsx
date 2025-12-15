import React, { useState, useEffect, useRef } from 'react';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import { Send, Plus, Mail, Paperclip, X } from '../Icons';
import { gmailService, GmailMessage } from '../../services/gmailService';
import { toast } from '../Toast';

interface ClientMessage {
  id: string;
  matterId?: string;
  matter?: { id: string; name: string; caseNumber: string };
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const ClientMessages: React.FC = () => {
  const { client } = useClientAuth();
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<ClientMessage | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matters, setMatters] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'internal' | 'gmail'>('internal');
  const [gmailMessages, setGmailMessages] = useState<any[]>([]);
  const [gmailLoading, setGmailLoading] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [gmailAccessToken, setGmailAccessToken] = useState<string | null>(
    localStorage.getItem('gmail_access_token')
  );
  
  const [composeData, setComposeData] = useState({
    matterId: '',
    subject: '',
    message: ''
  });
  const [gmailComposeData, setGmailComposeData] = useState({
    to: '',
    subject: '',
    body: ''
  });
  const [showGmailCompose, setShowGmailCompose] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsGmailConnected(!!gmailAccessToken);
  }, [gmailAccessToken]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = localStorage.getItem('client_token');
        const [messagesRes, mattersRes] = await Promise.all([
          fetch('/api/client/messages', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('/api/client/matters', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        
        const messagesData = await messagesRes.json();
        const mattersData = await mattersRes.json();
        
        setMessages(messagesData);
        setMatters(mattersData);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  const handleGmailConnect = () => {
    const authUrl = gmailService.getAuthUrl();
    window.location.href = authUrl;
  };

  const loadGmailMessages = async () => {
    if (!gmailAccessToken) return;
    
    setGmailLoading(true);
    try {
      const gmailMsgs = await gmailService.getMessages(gmailAccessToken, 50);
      const parsed = gmailMsgs.map(msg => gmailService.parseMessage(msg));
      setGmailMessages(parsed);
    } catch (error) {
      console.error('Error loading Gmail:', error);
      toast.error('Failed to load Gmail messages. Please reconnect.');
      localStorage.removeItem('gmail_access_token');
      setGmailAccessToken(null);
      setIsGmailConnected(false);
    } finally {
      setGmailLoading(false);
    }
  };

  const handleGmailSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gmailAccessToken) return;
    
    try {
      await gmailService.sendEmail(
        gmailAccessToken,
        gmailComposeData.to,
        gmailComposeData.subject,
        gmailComposeData.body
      );
      toast.success('Email sent successfully!');
      setShowGmailCompose(false);
      setGmailComposeData({ to: '', subject: '', body: '' });
      loadGmailMessages();
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send email. Please try again.');
    }
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachedFiles([...attachedFiles, ...Array.from(e.target.files)]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(attachedFiles.filter((_, i) => i !== index));
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('client_token');
      
      // Convert files to base64 for JSON transmission
      const attachments = await Promise.all(
        attachedFiles.map(async (file) => {
          return new Promise<{name: string; size: number; type: string; data: string}>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({
              name: file.name,
              size: file.size,
              type: file.type,
              data: reader.result as string
            });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );
      
      const payload = {
        ...composeData,
        ...(attachments.length > 0 && { attachments })
      };
      
      const res = await fetch('/api/client/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const newMessage = await res.json();
        setMessages([newMessage, ...messages]);
        setShowCompose(false);
        setComposeData({ matterId: '', subject: '', message: '' });
        setAttachedFiles([]);
      } else {
        const error = await res.json();
        toast.error(error.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex bg-white relative">
      {/* Sidebar */}
      <div className="w-96 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-slate-800">Messages</h2>
            <button 
              onClick={() => {
                if (activeTab === 'internal') setShowCompose(true);
                else setShowGmailCompose(true);
              }}
              className="p-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          {/* Tab Switcher */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('internal')}
              className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                activeTab === 'internal'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Internal
            </button>
            <button
              onClick={() => {
                setActiveTab('gmail');
                if (isGmailConnected && gmailMessages.length === 0) {
                  loadGmailMessages();
                }
              }}
              className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                activeTab === 'gmail'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Gmail
            </button>
          </div>
          
          {/* Gmail Connect Button */}
          {activeTab === 'gmail' && !isGmailConnected && (
            <button
              onClick={handleGmailConnect}
              className="w-full mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              Connect Gmail
            </button>
          )}
          
          {activeTab === 'gmail' && isGmailConnected && (
            <button
              onClick={loadGmailMessages}
              disabled={gmailLoading}
              className="w-full mt-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {gmailLoading ? 'Loading...' : 'Refresh Gmail'}
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'internal' ? (
            messages.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No messages</div>
            ) : (
              messages.map(msg => (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedMessage?.id === msg.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm ${!msg.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-600'}`}>
                      {msg.subject}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{msg.message}</p>
                  {msg.matter && (
                    <span className="text-xs text-blue-600 mt-1 inline-block">Case: {msg.matter.caseNumber}</span>
                  )}
                </div>
              ))
            )
          ) : (
            gmailLoading ? (
              <div className="p-8 text-center text-gray-400 text-sm">Loading Gmail...</div>
            ) : gmailMessages.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">
                {isGmailConnected ? 'No Gmail messages' : 'Connect Gmail to view emails'}
              </div>
            ) : (
              gmailMessages.map((msg, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedMessage({
                    id: `gmail-${idx}`,
                    subject: msg.subject,
                    message: msg.preview,
                    read: true,
                    createdAt: msg.date
                  })}
                  className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-sm font-semibold text-slate-600">{msg.subject}</span>
                    <span className="text-xs text-gray-400">{msg.date}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{msg.from}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">{msg.preview}</p>
                </div>
              ))
            )
          )}
        </div>
      </div>

      {/* Message View */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedMessage ? (
          <div className="flex-1 flex flex-col bg-white m-4 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-slate-900">{selectedMessage.subject}</h2>
              <div className="text-xs text-gray-500 mt-2">
                {new Date(selectedMessage.createdAt).toLocaleString()}
                {selectedMessage.matter && ` • Case: ${selectedMessage.matter.caseNumber}`}
              </div>
            </div>
            <div className="p-8 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap flex-1 overflow-y-auto">
              {selectedMessage.message}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <Mail className="w-16 h-16 mb-4 opacity-10" />
            <h3 className="text-lg font-semibold text-gray-500">Select a message</h3>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-[600px]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Send className="w-4 h-4"/> Compose Message
              </h3>
              <button onClick={() => setShowCompose(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <form onSubmit={handleSend} className="flex-1 flex flex-col">
              <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Related Case (Optional)</label>
                  <select
                    value={composeData.matterId}
                    onChange={e => setComposeData({...composeData, matterId: e.target.value})}
                    className="w-full border border-gray-300 bg-white text-slate-900 rounded-lg p-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  >
                    <option value="">-- Select a case --</option>
                    {matters.map(m => (
                      <option key={m.id} value={m.id}>{m.caseNumber} - {m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject</label>
                  <input
                    required
                    type="text"
                    placeholder="Message subject..."
                    className="w-full border border-gray-300 bg-white text-slate-900 rounded-lg p-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    value={composeData.subject}
                    onChange={e => setComposeData({...composeData, subject: e.target.value})}
                  />
                </div>
                <div className="flex-1 h-64">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Message</label>
                  <textarea
                    required
                    className="w-full h-full border border-gray-300 bg-white text-slate-900 rounded-lg p-4 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 resize-none"
                    value={composeData.message}
                    onChange={e => setComposeData({...composeData, message: e.target.value})}
                    placeholder="Type your message here..."
                  ></textarea>
                </div>
                
                {/* File Attachments */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Attachments</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileAttach}
                      multiple
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Paperclip className="w-4 h-4" />
                      Attach Files
                    </button>
                    {attachedFiles.length > 0 && (
                      <span className="text-xs text-gray-600">{attachedFiles.length} file(s) attached</span>
                    )}
                  </div>
                  {attachedFiles.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {attachedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                          <span className="text-gray-700 truncate flex-1">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(index)}
                            className="ml-2 text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setShowCompose(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Send Message
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gmail Compose Modal */}
      {showGmailCompose && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-[600px]">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <Mail className="w-4 h-4"/> Compose Email (Gmail)
              </h3>
              <button onClick={() => setShowGmailCompose(false)} className="text-gray-400 hover:text-gray-600">
                <span className="text-2xl">&times;</span>
              </button>
            </div>
            <form onSubmit={handleGmailSend} className="flex-1 flex flex-col">
              <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To</label>
                  <input
                    required
                    type="email"
                    placeholder="recipient@example.com"
                    className="w-full border border-gray-300 bg-white text-slate-900 rounded-lg p-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    value={gmailComposeData.to}
                    onChange={e => setGmailComposeData({...gmailComposeData, to: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject</label>
                  <input
                    required
                    type="text"
                    placeholder="Email subject..."
                    className="w-full border border-gray-300 bg-white text-slate-900 rounded-lg p-2.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    value={gmailComposeData.subject}
                    onChange={e => setGmailComposeData({...gmailComposeData, subject: e.target.value})}
                  />
                </div>
                <div className="flex-1 h-64">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Message</label>
                  <textarea
                    required
                    className="w-full h-full border border-gray-300 bg-white text-slate-900 rounded-lg p-4 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 resize-none"
                    value={gmailComposeData.body}
                    onChange={e => setGmailComposeData({...gmailComposeData, body: e.target.value})}
                    placeholder="Type your email here..."
                  ></textarea>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setShowGmailCompose(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2"
                >
                  <Send className="w-4 h-4" /> Send Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientMessages;

