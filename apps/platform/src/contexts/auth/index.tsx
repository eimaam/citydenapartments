import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { AuthUser, LoginResponse } from '../../lib/types';
import { api } from '../../lib/api';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isSwitchingBranch: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchBranch: (branchId: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitchingBranch, setIsSwitchingBranch] = useState(false);

  const fetchMe = useCallback(async () => {
    try {
      const me = await api.get<AuthUser>('/auth/me');
      setUser(me);
    } catch {
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchMe();
    } else {
      setIsLoading(false);
    }
  }, [token, fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post<LoginResponse>('/auth/login', { email, password });
    localStorage.setItem('token', res.accessToken);
    setToken(res.accessToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* ok */ }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const switchBranch = useCallback(async (branchId: string) => {
    setIsSwitchingBranch(true);
    try {
      const res = await api.post<LoginResponse>('/auth/switch-branch', { branchId });
      localStorage.setItem('token', res.accessToken);
      setUser(res.user);
      setToken(res.accessToken);
    } finally {
      setIsSwitchingBranch(false);
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.post('/auth/change-password', { currentPassword, newPassword });
    const me = await api.get<AuthUser>('/auth/me');
    setUser(me);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user, token, isLoading, isSwitchingBranch,
        isAuthenticated: !!token && !!user,
        login, logout, switchBranch, changePassword,
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
