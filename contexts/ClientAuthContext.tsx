import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  mobile?: string;
  company?: string;
  type: 'Individual' | 'Corporate';
  status: 'Active' | 'Inactive';
}

interface ClientAuthContextType {
  client: Client | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

export const ClientAuthProvider = ({ children }: { children: ReactNode }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/client/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) return false;
      const data = await res.json();
      setClient(data.client);
      if (typeof window !== 'undefined') {
        localStorage.setItem('client_token', data.token);
        localStorage.setItem('client_user', JSON.stringify(data.client));
      }
      return true;
    } catch (e) {
      console.error('Client login failed', e);
      return false;
    }
  };

  const logout = () => {
    setClient(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('client_token');
      localStorage.removeItem('client_user');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('client_token');
      const storedClient = localStorage.getItem('client_user');
      if (token && storedClient) {
        try {
          setClient(JSON.parse(storedClient));
        } catch {
          logout();
        }
      }
      setLoading(false);
    }
  }, []);

  return (
    <ClientAuthContext.Provider value={{ client, isAuthenticated: !!client, login, logout, loading }}>
      {children}
    </ClientAuthContext.Provider>
  );
};

export const useClientAuth = () => {
  const context = useContext(ClientAuthContext);
  if (!context) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
};

