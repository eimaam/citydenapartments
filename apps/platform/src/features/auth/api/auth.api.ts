import { api } from '../../../lib/api';
import type { LoginResponse, AuthUser } from '../../../lib/types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }),

  register: (data: { email: string; password: string; name: string; role: string }) =>
    api.post<AuthUser>('/auth/register', data),

  me: () => api.get<AuthUser>('/auth/me'),

  switchBranch: (branchId: string) =>
    api.post<LoginResponse>('/auth/switch-branch', { branchId }),
};
