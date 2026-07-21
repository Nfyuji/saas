import { api } from '@/lib/api';

export const authService = {
  login: (email: string, password: string) =>
    api.post<{
      accessToken: string;
      user: { id: string; name: string; email: string; role: string; companyId: string | null };
      company: unknown;
      isPlatformAdmin?: boolean;
    }>('/auth/login', { email, password }),

  register: (body: Record<string, unknown>) => api.post('/auth/register', body),

  profile: () => api.get<{ user: Record<string, unknown>; company: Record<string, unknown> | null }>('/auth/profile'),

  updateProfile: (name: string) => api.put('/auth/profile', { name }),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),

  publicSettings: () =>
    api.get<{ allowRegistration: boolean; platformName: string; maintenanceMode?: boolean }>(
      '/auth/public-settings',
    ),
};
