import { api } from '@/lib/api'
import type { AuthResponse, LoginData, RegisterData, RefreshResponse } from '@/types/auth'

export const authService = {
  login: (data: LoginData) =>
    api.post<AuthResponse>('/auth/login', data),

  register: (data: RegisterData) =>
    api.post<AuthResponse>('/auth/register', data),

  refresh: (refreshToken: string) =>
    api.post<RefreshResponse>('/auth/refresh', { refreshToken }),

  me: () =>
    api.get('/auth/me'),
}
