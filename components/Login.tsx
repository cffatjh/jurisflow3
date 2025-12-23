import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useClientAuth } from '../contexts/ClientAuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { Scale, Users, CheckSquare, Briefcase } from './Icons';

const Login = () => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Login.tsx:6', message: 'Login component render started', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
  // #endregion
  const [userType, setUserType] = useState<'attorney' | 'client'>('attorney');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, isAuthenticated } = useAuth();
  const { login: clientLogin, isAuthenticated: isClientAuthenticated } = useClientAuth();
  const { t } = useTranslation();
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Login.tsx:19', message: 'Login component hooks called successfully', data: { isAuthenticated, isClientAuthenticated }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
  // #endregion

  // Clear form state when user logs out (isAuthenticated becomes false)
  useEffect(() => {
    if (!isAuthenticated && !isClientAuthenticated) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Login.tsx:25', message: 'Login component - clearing form state after logout', data: { hadEmail: !!email, hadPassword: !!password }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' }) }).catch(() => { });
      // #endregion
      setEmail('');
      setPassword('');
      setError('');
      setLoading(false);
    }
  }, [isAuthenticated, isClientAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Login.tsx:35', message: 'Login form submitted', data: { userType, email, hasPassword: !!password, isAuthenticated, isClientAuthenticated }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' }) }).catch(() => { });
    // #endregion

    try {
      if (!email || !password) {
        throw new Error();
      }

      if (userType === 'attorney') {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Login.tsx:44', message: 'Calling attorney login function', data: { email }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' }) }).catch(() => { });
        // #endregion
        const success = await login(email, password);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Login.tsx:47', message: 'Attorney login result', data: { success }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' }) }).catch(() => { });
        // #endregion
        if (!success) {
          setError(t('error_login'));
        }
      } else {
        const success = await clientLogin(email, password);
        if (!success) {
          setError('Invalid email or password');
        } else {
          // Redirect to client portal
          window.location.href = '/client';
        }
      }
    } catch (err) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Login.tsx:58', message: 'Login form error', data: { errorMessage: err instanceof Error ? err.message : String(err) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' }) }).catch(() => { });
      // #endregion
      setError(userType === 'attorney' ? t('error_login') : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-white relative overflow-hidden font-sans">

      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-slate-900"></div>
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

      <div className="w-full max-w-md p-8 z-10">

        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xl mb-4 transform rotate-3">
            <Scale className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Juris<span className="text-blue-600">Flow</span></h1>
          <p className="text-gray-500 mt-2 font-medium">NextGen Legal Practice Management</p>
        </div>

        {/* Form Section */}
        <div className="bg-white p-2">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">{t('login_title')}</h2>

          {/* User Type Selection */}
          <div className="mb-6 flex gap-2 bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setUserType('attorney');
                setError('');
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${userType === 'attorney'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Scale className="w-4 h-4" />
                Attorney Login
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setUserType('client');
                setError('');
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${userType === 'client'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Briefcase className="w-4 h-4" />
                Client Login
              </div>
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{t('email')}</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all text-slate-900 font-medium placeholder-gray-400"
                placeholder="name@firm.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{t('password')}</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent outline-none transition-all text-slate-900 font-medium placeholder-gray-400"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-in fade-in">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <a
                href="/forgot-password"
                className="text-xs text-gray-500 hover:text-slate-800 transition-colors"
              >
                Şifremi Unuttum
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl shadow-lg shadow-blue-500/20 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-all transform active:scale-[0.98] ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing In...
                </div>
              ) : t('sign_in')}
            </button>
          </form>
        </div>

        {/* Footer Features */}
        <div className="mt-12 pt-8 border-t border-gray-100 grid grid-cols-3 gap-4 text-center">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2"><CheckSquare className="w-4 h-4" /></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Task Mgmt</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2"><Scale className="w-4 h-4" /></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">AI Drafter</span>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2"><Users className="w-4 h-4" /></div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">CRM</span>
          </div>
        </div>

        <p className="text-center text-xs text-gray-300 mt-8">
          &copy; 2025 JurisFlow Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'Login.tsx:139', message: 'Login component returning JSX', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'D' }) }).catch(() => { });
  // #endregion
};

export default Login;