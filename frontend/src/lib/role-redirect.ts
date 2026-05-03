import type { Role } from '@/types/auth'

const roleRoutes: Record<Role, string> = {
  MANAGER: '/manager',
  PROFESSIONAL: '/professional',
  CLIENT: '/customer',
}

export function getRoleRedirect(role: Role): string {
  return roleRoutes[role] || '/'
}
