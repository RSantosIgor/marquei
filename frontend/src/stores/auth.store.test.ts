import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from './auth.store'
import type { User } from '@/types/auth'

const mockUser: User = {
  id: 'user-1',
  email: 'test@marquei.com',
  name: 'Test User',
  phone: '11999990000',
  role: 'MANAGER',
}

describe('useAuthStore', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset store state
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    })
  })

  it('should start unauthenticated when localStorage is empty', () => {
    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
  })

  it('should set auth data and persist to localStorage', () => {
    useAuthStore.getState().setAuth(mockUser, 'access-123', 'refresh-456')

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.user).toEqual(mockUser)
    expect(state.accessToken).toBe('access-123')
    expect(state.refreshToken).toBe('refresh-456')

    // Check localStorage persistence
    expect(localStorage.getItem('access_token')).toBe('access-123')
    expect(localStorage.getItem('refresh_token')).toBe('refresh-456')
    expect(JSON.parse(localStorage.getItem('user')!)).toEqual(mockUser)
  })

  it('should update tokens without changing user', () => {
    useAuthStore.getState().setAuth(mockUser, 'old-access', 'old-refresh')
    useAuthStore.getState().setTokens('new-access', 'new-refresh')

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.accessToken).toBe('new-access')
    expect(state.refreshToken).toBe('new-refresh')
    expect(localStorage.getItem('access_token')).toBe('new-access')
  })

  it('should clear everything on logout', () => {
    useAuthStore.getState().setAuth(mockUser, 'access-123', 'refresh-456')
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.accessToken).toBeNull()
    expect(state.refreshToken).toBeNull()

    expect(localStorage.getItem('access_token')).toBeNull()
    expect(localStorage.getItem('refresh_token')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })
})
