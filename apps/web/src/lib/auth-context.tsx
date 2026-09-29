'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from './api';
import { AuthResult } from '@pulsetime/types';

interface AuthContextType {
  user: any | null;
  employee: any | null;
  organization: any | null;
  role: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  hasPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [employee, setEmployee] = useState<any | null>(null);
  const [organization, setOrganization] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function loadSession() {
      const token = localStorage.getItem('pulsetime_token');
      if (!token) {
        setIsLoading(false);
        if (pathname !== '/login') {
          router.push('/login');
        }
        return;
      }

      try {
        const profile = await api.me();
        setUser(profile.user);
        setEmployee(profile.employee);
        setOrganization(profile.organization);
        setRole(profile.role);
        setPermissions(profile.permissions || []);
      } catch (err) {
        console.error('Session validation error:', err);
        localStorage.removeItem('pulsetime_token');
        setUser(null);
        if (pathname !== '/login') {
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, [pathname, router]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const res: AuthResult = await api.login({ email, password: pass });
      localStorage.setItem('pulsetime_token', res.tokens.accessToken);
      localStorage.setItem('pulsetime_refresh', res.tokens.refreshToken);
      setUser(res.user);
      setEmployee(res.employee);
      setOrganization(res.organization);
      setRole(res.role);
      setPermissions(res.permissions || []);
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('pulsetime_refresh') || undefined;
    api.logout(refreshToken).catch(() => {});
    localStorage.removeItem('pulsetime_token');
    localStorage.removeItem('pulsetime_refresh');
    setUser(null);
    setEmployee(null);
    setOrganization(null);
    setRole(null);
    setPermissions([]);
    router.push('/login');
  };

  const hasPermission = (permissionKey: string): boolean => {
    if (role === 'OWNER') return true;
    return permissions.includes(permissionKey);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        employee,
        organization,
        role,
        permissions,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
