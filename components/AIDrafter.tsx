import React, { useState, useRef, useEffect } from 'react';
import { createLegalChatSession } from '../services/geminiService';
import { Matter, DocumentFile } from '../types';
import { BrainCircuit, FileText, Send, Paperclip, Search, Scale, File, X, Sparkles, Briefcase, CheckSquare, Edit } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { toast } from './Toast';

interface AIDrafterProps {
    matters: Matter[];
}

interface ChatMsg {
    id: string;
    role: 'user' | 'model';
    text: string;
    sources?: { title: string, uri: string }[];
    timestamp: Date;
}

const AIDrafter: React.FC<AIDrafterProps> = ({ matters }) => {
    const { t } = useTranslation();
    const { documents } = useData();

    // Chat State
    const [messages, setMessages] = useState<ChatMsg[]>([
        {
            id: 'welcome',
            role: 'model',
            text: "Hello, counselor. I am Juris, your AI Associate. I can help you draft documents, summarize depositions, or research case law. Select documents from the right to give me context.",
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    // Context State
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [useSearch, setUseSearch] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userText = inputValue;
        setInputValue(''); // Clear input

        // 1. Add User Message
        const userMsg: ChatMsg = {
            id: Date.now().toString(),
            role: 'user',
            text: userText,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        // 2. Prepare Context (Mocking document content reading)
        const selectedDocs = documents.filter(d => selectedDocIds.includes(d.id));
        const contextString = selectedDocs.map(d => `[Document: ${d.name} (${d.type})]`).join(', ');

        // 3. Prepare History for API
        const apiHistory = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        // 4. Call API
        const response = await createLegalChatSession(apiHistory, userText, contextString, useSearch);

        // 5. Add Model Message
        const modelMsg: ChatMsg = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: response.text,
            sources: response.sources,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, modelMsg]);
        setIsTyping(false);
    };

    const toggleDocSelection = (id: string) => {
        setSelectedDocIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleQuickAction = (action: 'summarize' | 'research' | 'draft' | 'analyze' | 'tasks' | 'template') => {
        let prompt = "";
        if (action === 'summarize') {
            if (selectedDocIds.length === 0) {
                toast.warning('Please select a document from the sidebar to summarize.');
                return;
            }
            prompt = "Please provide a detailed summary of the selected documents, highlighting key legal facts, dates, and inconsistencies.";
        } else if (action === 'research') {
            setUseSearch(true);
            prompt = "I need to research case law regarding... (please complete)";
        } else if (action === 'draft') {
            prompt = "Draft a formal demand letter based on the selected case context. The details are...";
        } else if (action === 'analyze') {
            // Case Analysis - predict outcome based on facts
            prompt = `Analyze this case and provide:
1. STRENGTHS: Key factors favoring our client
2. WEAKNESSES: Potential vulnerabilities
3. SIMILAR CASES: Reference relevant precedents
4. OUTCOME PREDICTION: Estimated probability of success (High/Medium/Low)
5. RECOMMENDED STRATEGY: Next steps to maximize chances

Case details: [Please describe the case facts, parties involved, and legal issues]`;
        } else if (action === 'tasks') {
            // Suggest tasks based on case type
            prompt = `Based on this matter, suggest a comprehensive task list:

1. IMMEDIATE ACTIONS: Tasks needed in the next 7 days
2. DISCOVERY PHASE: Document requests, depositions, interrogatories
3. MOTIONS: Potential motions to file
4. DEADLINES: Key dates and statute of limitations
5. CLIENT COMMUNICATIONS: Scheduled updates and meetings

Matter type: [Specify: Litigation/Corporate/Family Law/Criminal/IP/Estate]
Current status: [Specify current stage of the case]`;
        } else if (action === 'template') {
            // Template-based document generation
            prompt = `Generate a legal document using the following template:

DOCUMENT TYPE: [Motion to Dismiss / Demand Letter / Settlement Agreement / Contract / NDA]
CLIENT NAME: 
OPPOSING PARTY: 
CASE NUMBER: 
COURT/JURISDICTION: 
KEY FACTS: 
RELIEF REQUESTED: 

Please fill in the brackets and I will generate a complete, professionally formatted document.`;
        }
        setInputValue(prompt);
    };

    return (
        <div className="h-full flex bg-gray-50 overflow-hidden relative">

            {/* LEFT: MAIN CHAT AREA */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Header */}
                <div className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900 p-2 rounded-lg">
                            <BrainCircuit className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 text-lg">AI Legal Associate</h2>
                            <p className="text-xs text-gray-500 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span> Online • Gemini 2.5 Flash
                            </p>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={() => handleQuickAction('summarize')} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full hover:bg-indigo-100 transition-colors flex items-center gap-1">
                            <FileText className="w-3 h-3" /> Summarize
                        </button>
                        <button onClick={() => handleQuickAction('research')} className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-full hover:bg-purple-100 transition-colors flex items-center gap-1">
                            <Scale className="w-3 h-3" /> Research
                        </button>
                        <button onClick={() => handleQuickAction('draft')} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-full hover:bg-blue-100 transition-colors flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Draft
                        </button>
                        <button onClick={() => handleQuickAction('analyze')} className="px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-bold rounded-full hover:bg-amber-100 transition-colors flex items-center gap-1">
                            <Briefcase className="w-3 h-3" /> Case Analysis
                        </button>
                        <button onClick={() => handleQuickAction('tasks')} className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-full hover:bg-green-100 transition-colors flex items-center gap-1">
                            <CheckSquare className="w-3 h-3" /> Suggest Tasks
                        </button>
                        <button onClick={() => handleQuickAction('template')} className="px-3 py-1.5 bg-rose-50 text-rose-700 text-xs font-bold rounded-full hover:bg-rose-100 transition-colors flex items-center gap-1">
                            <Edit className="w-3 h-3" /> Template
                        </button>
                    </div>
                </div>

                {/* Chat Stream */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 scroll-smooth">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} max-w-4xl mx-auto`}>

                            {/* Avatar */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-200' : 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white'}`}>
                                {msg.role === 'user' ? <span className="font-bold text-slate-600">Me</span> : <BrainCircuit className="w-6 h-6" />}
                            </div>

                            {/* Bubble */}
                            <div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`px-6 py-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                    ? 'bg-white text-slate-800 border border-gray-100 rounded-tr-none'
                                    : 'bg-white text-slate-800 border border-indigo-100 rounded-tl-none ring-1 ring-indigo-50'
                                    }`}>
                                    {msg.text}
                                </div>

                                {/* Sources / Grounding */}
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3 w-full">
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                                            <Search className="w-3 h-3" /> Sources Found
                                        </p>
                                        <div className="space-y-1">
                                            {msg.sources.map((src, idx) => (
                                                <a key={idx} href={src.uri} target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-600 hover:underline truncate">
                                                    {idx + 1}. {src.title}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                        </div>
                    ))}
                    {isTyping && (
                        <div className="flex gap-4 max-w-4xl mx-auto">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shrink-0">
                                <BrainCircuit className="w-6 h-6 text-white" />
                            </div>
                            <div className="bg-white px-6 py-4 rounded-2xl rounded-tl-none border border-indigo-100 shadow-sm flex items-center gap-2">
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></span>
                                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="bg-white border-t border-gray-200 p-4 pb-6">
                    <div className="max-w-4xl mx-auto relative">
                        <div className="absolute top-[-40px] left-0 flex gap-2">
                            {useSearch && (
                                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 border border-purple-200">
                                    <Search className="w-3 h-3" /> Web Search Active
                                    <button onClick={() => setUseSearch(false)}><X className="w-3 h-3 hover:text-purple-900" /></button>
                                </span>
                            )}
                            {selectedDocIds.length > 0 && (
                                <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 border border-indigo-200">
                                    <File className="w-3 h-3" /> {selectedDocIds.length} Docs Attached
                                    <button onClick={() => setSelectedDocIds([])}><X className="w-3 h-3 hover:text-indigo-900" /></button>
                                </span>
                            )}
                        </div>

                        <div className="relative flex items-end gap-2 bg-gray-50 border border-gray-300 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white focus-within:border-transparent transition-all">
                            <button
                                onClick={() => setUseSearch(!useSearch)}
                                className={`p-2 rounded-lg transition-colors ${useSearch ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:bg-gray-200'}`}
                                title="Toggle Web Research"
                            >
                                <Search className="w-5 h-5" />
                            </button>
                            <textarea
                                className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-2.5 text-sm text-slate-800 placeholder-gray-400"
                                placeholder="Ask Juris to draft, summarize, or research..."
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage();
                                    }
                                }}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() && !isTyping}
                                className={`p-2 rounded-lg mb-0.5 transition-all ${inputValue.trim() ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' : 'bg-gray-200 text-gray-400'}`}
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-center text-[10px] text-gray-400 mt-2">AI can make mistakes. Please review generated legal documents.</p>
                    </div>
                </div>
            </div>

            {/* RIGHT: CONTEXT SIDEBAR */}
            <div className="w-72 bg-white border-l border-gray-200 flex flex-col shadow-xl z-20">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wide">Context & Files</h3>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    <div className="mb-4">
                        <p className="text-xs font-bold text-gray-400 px-2 mb-2 uppercase">Available Documents</p>
                        {documents.length === 0 && (
                            <div className="px-4 py-8 text-center text-gray-400 text-xs border-2 border-dashed border-gray-100 rounded-lg">
                                No documents found. Upload files in the 'Documents' tab to reference them here.
                            </div>
                        )}
                        {documents.map(doc => (
                            <div
                                key={doc.id}
                                onClick={() => toggleDocSelection(doc.id)}
                                className={`group flex items-center gap-3 p-2.5 rounded-lg mb-1 cursor-pointer transition-all border ${selectedDocIds.includes(doc.id)
                                    ? 'bg-indigo-50 border-indigo-200'
                                    : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                                    }`}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedDocIds.includes(doc.id) ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300 bg-white'}`}>
                                    {selectedDocIds.includes(doc.id) && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm truncate ${selectedDocIds.includes(doc.id) ? 'font-bold text-indigo-900' : 'text-slate-700'}`}>{doc.name}</p>
                                    <p className="text-[10px] text-gray-400">{doc.type.toUpperCase()} • {doc.size}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Stats or Info */}
                <div className="p-4 bg-slate-50 border-t border-gray-200">
                    <div className="text-xs text-slate-500">
                        <p className="font-bold mb-1">Capabilities:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li>Up to 1M tokens context</li>
                            <li>Deposition summarization</li>
                            <li>Case law search</li>
                        </ul>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default AIDrafter;