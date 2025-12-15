import React, { useState } from 'react';
import { useClientAuth } from '../../contexts/ClientAuthContext';
import ClientLogin from './ClientLogin';
import ClientDashboard from './ClientDashboard';
import ClientMatters from './ClientMatters';
import ClientInvoices from './ClientInvoices';
import ClientDocuments from './ClientDocuments';
import ClientMessages from './ClientMessages';
import ClientProfile from './ClientProfile';
import VideoCall from '../VideoCall';
import ClientCalendar from './ClientCalendar';
import { Briefcase, CreditCard, Folder, Mail, User, Bell, Scale, X, Calendar as CalendarIcon, Video } from '../Icons';

type ClientTab = 'dashboard' | 'matters' | 'invoices' | 'documents' | 'messages' | 'calendar' | 'profile' | 'videocall';

const ClientPortal: React.FC = () => {
  const { isAuthenticated, client, logout } = useClientAuth();
  const [activeTab, setActiveTab] = useState<ClientTab>('dashboard');
  const [showNotifications, setShowNotifications] = useState(false);

  if (!isAuthenticated) {
    return <ClientLogin />;
  }

  const NavButton = ({ tab, icon: Icon, label }: { tab: ClientTab; icon: any; label: string }) => (
    <button 
      onClick={() => setActiveTab(tab)}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
        activeTab === tab 
        ? 'bg-blue-600 text-white font-medium shadow-sm' 
        : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      <Icon className={`w-5 h-5 ${activeTab === tab ? 'text-white' : 'text-gray-500'}`} />
      <span className="text-sm">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col z-20 relative">
        <div className="h-16 flex items-center px-6 mb-2 border-b border-gray-200">
          <Scale className="w-6 h-6 text-blue-600 mr-3" />
          <span className="text-xl font-bold text-slate-900 tracking-tight">Juris<span className="text-blue-600">Flow</span></span>
        </div>

        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 text-white font-bold flex items-center justify-center text-sm shadow-lg">
              {client?.name?.charAt(0) || 'C'}
            </div>
            <div className="flex flex-col items-start overflow-hidden">
              <span className="text-sm font-semibold text-slate-900 truncate w-full text-left">{client?.name}</span>
              <span className="text-xs text-gray-500">Client Portal</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavButton tab="dashboard" icon={Briefcase} label="Dashboard" />
          <NavButton tab="matters" icon={Briefcase} label="My Cases" />
          <NavButton tab="invoices" icon={CreditCard} label="Invoices" />
          <NavButton tab="documents" icon={Folder} label="Documents" />
          <NavButton tab="messages" icon={Mail} label="Messages" />
          <NavButton tab="calendar" icon={CalendarIcon} label="Calendar" />
          <NavButton tab="videocall" icon={Video} label="Video Calls" />
          <NavButton tab="profile" icon={User} label="Profile" />
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <X className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-gray-50 relative">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 sticky top-0">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {activeTab === 'dashboard' && 'Dashboard'}
              {activeTab === 'matters' && 'My Cases'}
              {activeTab === 'invoices' && 'Invoices'}
              {activeTab === 'documents' && 'Documents'}
              {activeTab === 'messages' && 'Messages'}
              {activeTab === 'calendar' && 'Calendar'}
              {activeTab === 'profile' && 'Profile'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden relative">
          {activeTab === 'dashboard' && <ClientDashboard />}
          {activeTab === 'matters' && <ClientMatters />}
          {activeTab === 'invoices' && <ClientInvoices />}
          {activeTab === 'documents' && <ClientDocuments />}
          {activeTab === 'messages' && <ClientMessages />}
          {activeTab === 'calendar' && <ClientCalendar />}
          {activeTab === 'videocall' && <VideoCall />}
          {activeTab === 'profile' && <ClientProfile />}
        </div>
      </main>
    </div>
  );
};

export default ClientPortal;

