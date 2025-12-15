import React, { useState, useEffect } from 'react';
import { Message } from '../types';
import { Mail, Search, Filter, Plus, FileText, Send, X } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { gmailService } from '../services/gmailService';
import { toast } from './Toast';

const Communications: React.FC = () => {
  const { t } = useTranslation();
  const { messages, addMessage, markMessageRead } = useData();
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inbox'|'sent'>('inbox');
  const [showCompose, setShowCompose] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [gmailAccessToken, setGmailAccessToken] = useState<string | null>(
    localStorage.getItem('gmail_access_token')
  );

  useEffect(() => {
    setIsGmailConnected(!!gmailAccessToken);
  }, [gmailAccessToken]);

  const handleGmailConnect = () => {
    const authUrl = gmailService.getAuthUrl();
    window.location.href = authUrl;
  };

  const handleGmailSync = async () => {
    if (!gmailAccessToken) return;
    
    try {
      const gmailMessages = await gmailService.getMessages(gmailAccessToken, 20);
      gmailMessages.forEach(gmailMsg => {
        const parsed = gmailService.parseMessage(gmailMsg);
        addMessage({
          id: gmailMsg.id,
          from: parsed.from,
          subject: parsed.subject,
          preview: parsed.preview,
          date: parsed.date,
          read: false
        });
      });
      toast.success('Gmail messages synced successfully!');
    } catch (error) {
      console.error('Gmail sync error:', error);
      toast.error('Failed to sync Gmail messages. Please reconnect.');
      localStorage.removeItem('gmail_access_token');
      setGmailAccessToken(null);
    }
  };

  // Compose State
  const [composeData, setComposeData] = useState({ to: '', subject: '', body: '' });

  const selectedMessage = messages.find(m => m.id === selectedMsgId);

  // Filter messages based on simplistic logic for demo
  // "Sent" messages are those where from is "Me". Inbox is everything else.
  const filteredMessages = messages.filter(m => {
     if (activeTab === 'sent') return m.from === 'Me';
     return m.from !== 'Me';
  });

  const handleSelectMessage = (id: string) => {
    setSelectedMsgId(id);
    markMessageRead(id);
  }

  const handleSend = (e: React.FormEvent) => {
     e.preventDefault();
     // Simulate sending internally
     addMessage({
        id: `msg${Date.now()}`,
        from: 'Me',
        subject: composeData.subject,
        preview: composeData.body.substring(0, 50) + '...',
        date: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        read: true
     });
     
     // Also open default mail client as requested option
     // window.open(`mailto:${composeData.to}?subject=${composeData.subject}&body=${composeData.body}`);
     
     setShowCompose(false);
     setComposeData({ to: '', subject: '', body: '' });
     setActiveTab('sent');
  };

  const openExternalMail = () => {
      window.location.href = "mailto:?subject=Legal Matter";
  };

  return (
    <div className="h-full flex bg-white relative">
      {/* Sidebar List */}
      <div className="w-96 border-r border-gray-200 flex flex-col">
         <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-800">{t('comms_title')}</h2>
                <button onClick={() => setShowCompose(true)} className="p-2 bg-slate-800 text-white rounded-lg shadow hover:bg-slate-900 transition-colors">
                    <Plus className="w-5 h-5" />
                </button>
            </div>
            
            <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-lg">
               <button onClick={() => setActiveTab('inbox')} className={`flex-1 text-xs font-bold py-1.5 rounded ${activeTab === 'inbox' ? 'bg-white shadow text-slate-900' : 'text-gray-500'}`}>{t('inbox')}</button>
               <button onClick={() => setActiveTab('sent')} className={`flex-1 text-xs font-bold py-1.5 rounded ${activeTab === 'sent' ? 'bg-white shadow text-slate-900' : 'text-gray-500'}`}>{t('sent')}</button>
            </div>

            <div className="relative">
               <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
               <input type="text" placeholder="Search messages..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-400 transition-all text-slate-800" />
            </div>
         </div>
         <div className="flex-1 overflow-y-auto">
            {filteredMessages.length === 0 && (
                <div className="p-8 text-center text-gray-400 text-sm">No messages found.</div>
            )}
            {filteredMessages.map(msg => (
               <div 
                  key={msg.id} 
                  onClick={() => handleSelectMessage(msg.id)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedMsgId === msg.id ? 'bg-primary-50 border-primary-200' : ''} ${!msg.read ? 'bg-blue-50/30' : ''}`}
               >
                  <div className="flex justify-between items-start mb-1">
                     <span className={`text-sm ${!msg.read ? 'font-bold text-slate-900' : 'font-semibold text-slate-600'}`}>{msg.from}</span>
                     <span className="text-xs text-gray-400">{msg.date}</span>
                  </div>
                  <h4 className={`text-sm mb-1 truncate ${!msg.read ? 'font-bold text-slate-800' : 'font-medium text-slate-700'}`}>{msg.subject}</h4>
                  <p className="text-xs text-gray-500 line-clamp-2">{msg.preview}</p>
               </div>
            ))}
         </div>
      </div>

      {/* Message View */}
      <div className="flex-1 flex flex-col bg-gray-50/50">
         {selectedMessage ? (
             <div className="flex-1 flex flex-col bg-white m-4 rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                 <div className="p-6 border-b border-gray-100">
                     <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xl font-bold text-slate-900">{selectedMessage.subject}</h2>
                        <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded">{selectedMessage.date}</span>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                            {selectedMessage.from.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">{selectedMessage.from}</p>
                            <p className="text-xs text-gray-500">to Me</p>
                        </div>
                     </div>
                 </div>
                 <div className="p-8 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                     {/* Simulating full body content based on preview if not available */}
                     {selectedMessage.preview}
                     <br/><br/>
                     Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                 </div>
             </div>
         ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <Mail className="w-16 h-16 mb-4 opacity-10" />
                <h3 className="text-lg font-semibold text-gray-500">Select a message</h3>
                <p className="text-sm">Securely communicate with clients and staff.</p>
                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg max-w-sm text-center">
                    {isGmailConnected ? (
                      <>
                        <p className="text-xs text-blue-800 font-bold mb-2">✓ Gmail Connected</p>
                        <p className="text-xs text-blue-700 mb-3">Your Gmail account is connected. Click below to sync messages.</p>
                        <button onClick={handleGmailSync} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded shadow-sm hover:bg-blue-700">
                          Sync Gmail Messages
                        </button>
                        <button 
                          onClick={() => {
                            localStorage.removeItem('gmail_access_token');
                            setGmailAccessToken(null);
                            setIsGmailConnected(false);
                          }}
                          className="mt-2 px-4 py-2 bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded shadow-sm hover:bg-gray-50 block w-full"
                        >
                          Disconnect
                        </button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-blue-800 font-bold mb-2">Gmail Integration</p>
                        <p className="text-xs text-blue-700 mb-3">Connect your Gmail account to sync emails directly into JurisFlow.</p>
                        <button onClick={handleGmailConnect} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded shadow-sm hover:bg-blue-700">
                          Connect Gmail
                        </button>
                        <p className="text-xs text-gray-500 mt-2">Note: Requires Google Cloud Console OAuth2 setup</p>
                      </>
                    )}
                </div>
             </div>
         )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col h-[600px]">
                 <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Send className="w-4 h-4"/> {t('compose')}</h3>
                    <button onClick={() => setShowCompose(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                 </div>
                 <form onSubmit={handleSend} className="flex-1 flex flex-col">
                    <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('to')}</label>
                           <input required type="email" placeholder="client@example.com" className="w-full border border-gray-300 bg-white text-slate-900 rounded-lg p-2.5 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400" value={composeData.to} onChange={e => setComposeData({...composeData, to: e.target.value})} />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('subject')}</label>
                           <input required type="text" placeholder="Case Update..." className="w-full border border-gray-300 bg-white text-slate-900 rounded-lg p-2.5 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400" value={composeData.subject} onChange={e => setComposeData({...composeData, subject: e.target.value})} />
                        </div>
                        <div className="flex-1 h-64">
                           <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('message')}</label>
                           <textarea required className="w-full h-full border border-gray-300 bg-white text-slate-900 rounded-lg p-4 text-sm outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 resize-none" value={composeData.body} onChange={e => setComposeData({...composeData, body: e.target.value})}></textarea>
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 flex justify-between items-center bg-gray-50">
                       <button type="button" onClick={() => window.open(`mailto:${composeData.to}`)} className="text-xs text-gray-500 hover:text-primary-600 underline">{t('open_external')}</button>
                       <div className="flex gap-3">
                           <button type="button" onClick={() => setShowCompose(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg">{t('cancel')}</button>
                           <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg flex items-center gap-2">
                               <Send className="w-4 h-4" /> {t('send')}
                           </button>
                       </div>
                    </div>
                 </form>
             </div>
          </div>
      )}
    </div>
  );
};

export default Communications;