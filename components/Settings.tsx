import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Globe, DollarSign, Bell, Lock, X, Shield, Moon, Sun } from './Icons';
import { useTranslation, Currency } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useTheme } from '../contexts/ThemeContext';
import { Language } from '../translations';
import AdminPanel from './AdminPanel';
import { toast } from './Toast';

const Settings: React.FC = () => {
  const { t, language, setLanguage, currency, setCurrency } = useTranslation();
  const { user } = useAuth();
  const { updateUserProfile } = useData();
  const { theme, setTheme, resolvedTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'notifications' | 'security' | 'admin'>('profile');
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    barNumber: '',
    bio: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: '',
        mobile: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: '',
        barNumber: '',
        bio: ''
      });
    }
  }, [user]);

  const FLAGS: Partial<Record<Language, string>> = {
    en: '🇺🇸',
    tr: '🇹🇷'
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateUserProfile(profileData);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-gray-50/50">
      <div className="px-8 py-6 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-6 h-6 text-slate-800" />
          <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        </div>
        <p className="text-sm text-gray-500">Manage your account settings and preferences</p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 p-4">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile'
                ? 'bg-slate-100 text-slate-900'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <User className="w-5 h-5" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'preferences'
                ? 'bg-slate-100 text-slate-900'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Globe className="w-5 h-5" />
              Preferences
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'notifications'
                ? 'bg-slate-100 text-slate-900'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Bell className="w-5 h-5" />
              Notifications
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'security'
                ? 'bg-slate-100 text-slate-900'
                : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Lock className="w-5 h-5" />
              Security
            </button>
            {/* Sadece Admin rolündeki kullanıcılar admin panel sekmesini görebilir */}
            {user?.role === 'Admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'admin'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-gray-600 hover:bg-gray-50'
                  }`}
              >
                <Shield className="w-5 h-5" />
                Admin Panel
                <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">
                  Admin Only
                </span>
              </button>
            )}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {activeTab === 'profile' && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Profile Information</h2>
              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                      value={profileData.name}
                      onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                      value={profileData.email}
                      onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                      value={profileData.phone}
                      onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                    <input
                      type="tel"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                      value={profileData.mobile}
                      onChange={e => setProfileData({ ...profileData, mobile: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                    value={profileData.address}
                    onChange={e => setProfileData({ ...profileData, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                      value={profileData.city}
                      onChange={e => setProfileData({ ...profileData, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                      value={profileData.state}
                      onChange={e => setProfileData({ ...profileData, state: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                      value={profileData.zipCode}
                      onChange={e => setProfileData({ ...profileData, zipCode: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                    value={profileData.country}
                    onChange={e => setProfileData({ ...profileData, country: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bar Number</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                    value={profileData.barNumber}
                    onChange={e => setProfileData({ ...profileData, barNumber: e.target.value })}
                    placeholder="Bar association registration number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                  <textarea
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                    value={profileData.bio}
                    onChange={e => setProfileData({ ...profileData, bio: e.target.value })}
                    placeholder="Professional bio or description"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Preferences</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Language</label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(FLAGS).map(([lang, flag]) => (
                      <button
                        key={lang}
                        onClick={() => setLanguage(lang as Language)}
                        className={`p-4 border-2 rounded-lg text-center transition-all ${language === lang
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        <div className="text-2xl mb-2">{flag}</div>
                        <div className="text-xs font-bold uppercase">{lang}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Currency</label>
                  <div className="grid grid-cols-4 gap-3">
                    {['USD', 'EUR', 'TRY', 'GBP'].map(curr => (
                      <button
                        key={curr}
                        onClick={() => setCurrency(curr as Currency)}
                        className={`p-4 border-2 rounded-lg text-center font-bold transition-all ${currency === curr
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                          }`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Theme</label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-4 border-2 rounded-lg text-center transition-all ${theme === 'light'
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <Sun className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                      <div className="text-xs font-bold uppercase">Light</div>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-4 border-2 rounded-lg text-center transition-all ${theme === 'dark'
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <Moon className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
                      <div className="text-xs font-bold uppercase">Dark</div>
                    </button>
                    <button
                      onClick={() => setTheme('system')}
                      className={`p-4 border-2 rounded-lg text-center transition-all ${theme === 'system'
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                    >
                      <div className="flex justify-center gap-1 mb-2">
                        <Sun className="w-4 h-4 text-amber-500" />
                        <Moon className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="text-xs font-bold uppercase">System</div>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Currently using: {resolvedTheme} mode
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Notification Preferences</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-slate-800">Email Notifications</h3>
                    <p className="text-sm text-gray-500">Receive email notifications for important updates</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-slate-800">Task Reminders</h3>
                    <p className="text-sm text-gray-500">Get reminders for upcoming tasks</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5" />
                </div>
                <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-slate-800">Calendar Events</h3>
                    <p className="text-sm text-gray-500">Notifications for calendar events</p>
                  </div>
                  <input type="checkbox" defaultChecked className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-2xl">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Security Settings</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                    placeholder="Enter current password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm"
                    placeholder="Confirm new password"
                  />
                </div>
                <div className="flex justify-end">
                  <button className="px-6 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900">
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Admin Panel - Sadece Admin rolündeki kullanıcılar erişebilir */}
          {activeTab === 'admin' && (
            <AdminPanel />
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;

