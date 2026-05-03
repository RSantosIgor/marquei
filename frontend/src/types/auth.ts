export type Role = 'MANAGER' | 'PROFESSIONAL' | 'CLIENT'

export interface User {
  id: string
  email: string
  name: string
  phone: string | null
  role: Role
}

export interface AuthResponse {
  data: {
    user: User
    accessToken: string
    refreshToken: string
  }
}

export interface RefreshResponse {
  data: {
    accessToken: string
    refreshToken: string
  }
}

export interface LoginData {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  phone?: string
}
