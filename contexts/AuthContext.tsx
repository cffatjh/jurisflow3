import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Permission, ROLE_PERMISSIONS, EmployeeRole } from '../types';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock Users Database
const MOCK_USERS: Record<string, User> = {
  'harvey@lexos.com': { id: 'u1', name: 'Harvey Specter', email: 'harvey@lexos.com', role: 'Partner', initials: 'HS' },
  'mike@lexos.com': { id: 'u2', name: 'Mike Ross', email: 'mike@lexos.com', role: 'Associate', initials: 'MR' },
  'jessica@lexos.com': { id: 'u3', name: 'Jessica Pearson', email: 'jessica@lexos.com', role: 'Partner', initials: 'JP' },
  'louis@lexos.com': { id: 'u4', name: 'Louis Litt', email: 'louis@lexos.com', role: 'Partner', initials: 'LL' },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AuthContext.tsx:28', message: 'AuthProvider initialization started', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
  // #endregion
  const [user, setUser] = useState<User | null>(null);

  const can = (permission: Permission): boolean => {
    if (!user) return false;

    // Admin always has access
    if (user.role === 'Admin') return true;

    // Check role permissions
    // Note: user.role comes from server as effectiveRole (e.g. 'PARALEGAL' or 'Partner')
    // We need to cast it to EmployeeRole if it matches, or handle string keys
    const permissions = ROLE_PERMISSIONS[user.role as EmployeeRole] || ROLE_PERMISSIONS[user.role] || [];

    return permissions.includes(permission);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AuthContext.tsx:34', message: 'Login attempt started', data: { email }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
    // #endregion
    try {
      // Use Vite proxy instead of direct localhost:3001 to avoid CORS issues
      const API_URL = typeof window !== 'undefined' ? '/api' : 'http://localhost:3001/api';
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AuthContext.tsx:38', message: 'Login fetch starting', data: { apiUrl: API_URL, endpoint: '/login' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
      // #endregion
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AuthContext.tsx:50', message: 'Login response received', data: { status: res.status, statusText: res.statusText, ok: res.ok }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion
      if (!res.ok) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AuthContext.tsx:53', message: 'Login failed - response not ok', data: { status: res.status, statusText: res.statusText }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
        // #endregion
        return false;
      }
      const data = await res.json();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AuthContext.tsx:59', message: 'Login succeeded', data: { hasToken: !!data.token, hasUser: !!data.user, userRole: data.user?.role }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion
      setUser(data.user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      }
      return true;
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AuthContext.tsx:70', message: 'Login exception', data: { errorMessage: e instanceof Error ? e.message : String(e), errorName: e instanceof Error ? e.name : 'Unknown', errorStack: e instanceof Error ? e.stack : undefined }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'E' }) }).catch(() => { });
      // #endregion
      console.error('Login failed', e);
      return false;
    }
  };

  const logout = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AuthContext.tsx:77', message: 'Logout called', data: { hasUser: !!user, userEmail: user?.email }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' }) }).catch(() => { });
    // #endregion
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AuthContext.tsx:83', message: 'Logout completed - localStorage cleared', data: { hasToken: !!localStorage.getItem('auth_token'), hasUser: !!localStorage.getItem('auth_user') }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'F' }) }).catch(() => { });
      // #endregion
    }
  };

  React.useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AuthContext.tsx:60', message: 'AuthProvider useEffect started', data: { hasWindow: typeof window !== 'undefined' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
    // #endregion
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AuthContext.tsx:64', message: 'AuthProvider localStorage check', data: { hasToken: !!token, hasStoredUser: !!storedUser }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
      // #endregion
      if (token && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AuthContext.tsx:67', message: 'AuthProvider user restored from localStorage', data: {}, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
          // #endregion
        } catch (error) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AuthContext.tsx:70', message: 'AuthProvider JSON parse error', data: { errorMessage: error instanceof Error ? error.message : String(error) }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
          // #endregion
          logout();
        }
      }
    }
  }, []);

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/468b8283-de18-4f31-b7cb-52da7f0bb927', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'AuthContext.tsx:74', message: 'AuthProvider returning JSX', data: { userExists: !!user, isAuthenticated: !!user }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run1', hypothesisId: 'B' }) }).catch(() => { });
  // #endregion
  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};