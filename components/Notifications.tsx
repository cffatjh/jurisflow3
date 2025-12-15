import React, { useState, useEffect } from 'react';
import { Bell, X, CheckSquare, AlertCircle, Info, AlertTriangle } from './Icons';
import { useTranslation } from '../contexts/LanguageContext';
import { useData } from '../contexts/DataContext';
import { Notification } from '../types';

const Notifications: React.FC = () => {
  const { t } = useTranslation();
  const { notifications, markNotificationRead, markNotificationUnread, markAllNotificationsRead } = useData();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);

  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.read) {
      markNotificationRead(notif.id);
    }
    if (notif.link) {
      // In-app navigation convention: "tab:tasks" / "tab:documents" etc.
      if (notif.link.startsWith('tab:')) {
        const tab = notif.link.replace('tab:', '').trim();
        window.dispatchEvent(new CustomEvent('jf:navigate', { detail: { tab } }));
      } else {
        window.location.href = notif.link;
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckSquare className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative text-gray-400 hover:text-slate-700 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 top-10 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-slate-800 text-sm">Notifications</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setUnreadOnly(v => !v)}
                  className={`text-xs font-medium px-2 py-1 rounded border ${
                    unreadOnly ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600'
                  }`}
                  title="Show only unread notifications"
                >
                  Unread
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllNotificationsRead()}
                    className="text-xs text-primary-600 hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {(unreadOnly ? notifications.filter(n => !n.read) : notifications).length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {(unreadOnly ? notifications.filter(n => !n.read) : notifications).map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        !notif.read ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-semibold ${!notif.read ? 'text-slate-900' : 'text-gray-700'}`}>
                              {notif.title}
                            </h4>
                            {!notif.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></div>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{notif.message}</p>
                          <p className="text-[10px] text-gray-400 mt-2">
                            {new Date(notif.createdAt).toLocaleString()}
                          </p>
                          <div className="flex items-center gap-2 mt-3">
                            {notif.link && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleNotificationClick(notif); }}
                                className="text-[11px] font-bold text-primary-700 bg-primary-50 border border-primary-100 px-2 py-1 rounded hover:bg-primary-100"
                              >
                                Open
                              </button>
                            )}
                            {notif.read && (
                              <button
                                onClick={(e) => { e.stopPropagation(); markNotificationUnread(notif.id); }}
                                className="text-[11px] font-bold text-gray-700 bg-white border border-gray-200 px-2 py-1 rounded hover:bg-gray-50"
                              >
                                Mark unread
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Notifications;

