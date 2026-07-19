'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from './api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  companyId: string | null;
}

interface Company {
  id: string;
  name: string;
  plan: string;
  planExpiresAt?: string;
  isActive?: boolean;
  settings?: {
    salesAgentEnabled?: boolean;
    autoFollowUp?: boolean;
    invoicesEnabled?: boolean;
    knowledgeEnabled?: boolean;
    opportunitiesEnabled?: boolean;
  };
  whatsapp?: {
    configured?: boolean;
    displayPhoneNumber?: string;
    aiAutoReply?: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  company: Company | null;
  loading: boolean;
  isPlatformAdmin: boolean;
  login: (email: string, password: string) => Promise<{ isPlatformAdmin: boolean }>;
  register: (data: {
    companyName: string;
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function normalizeUser(raw: User & { _id?: string }): User {
  return {
    id: raw._id || raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role,
    companyId: raw.companyId ? String(raw.companyId) : null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      api
        .get<{ user: User & { _id?: string }; company: (Company & { _id?: string }) | null }>('/auth/profile')
        .then((data) => {
          setUser(normalizeUser(data.user));
          if (data.company) {
            setCompany({
              id: (data.company as { _id?: string })._id || data.company.id,
              name: data.company.name,
              plan: data.company.plan,
              planExpiresAt: data.company.planExpiresAt,
              isActive: data.company.isActive,
              settings: data.company.settings,
              whatsapp: (data.company as { whatsapp?: Company['whatsapp'] }).whatsapp,
            });
          } else {
            setCompany(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.post<{
      accessToken: string;
      user: User;
      company: Company | null;
      isPlatformAdmin?: boolean;
    }>('/auth/login', { email, password });

    localStorage.setItem('token', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setCompany(data.company);
    return { isPlatformAdmin: !!(data.isPlatformAdmin || ['super_admin', 'platform_support', 'platform_finance'].includes(data.user.role)) };
  };

  const register = async (payload: {
    companyName: string;
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => {
    const data = await api.post<{
      accessToken: string;
      user: User;
      company: Company;
    }>('/auth/register', payload);

    localStorage.setItem('token', data.accessToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setCompany(data.company);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setCompany(null);
    window.location.href = '/login';
  };

  const refreshProfile = async () => {
    const data = await api.get<{
      user: User & { _id?: string };
      company: (Company & { _id?: string }) | null;
    }>('/auth/profile');
    setUser(normalizeUser(data.user));
    if (data.company) {
      setCompany({
        id: data.company._id || data.company.id,
        name: data.company.name,
        plan: data.company.plan,
        planExpiresAt: data.company.planExpiresAt,
        isActive: data.company.isActive,
        settings: data.company.settings,
        whatsapp: data.company.whatsapp,
      });
    } else {
      setCompany(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        loading,
        isPlatformAdmin: !!user && ['super_admin', 'platform_support', 'platform_finance'].includes(user.role),
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
