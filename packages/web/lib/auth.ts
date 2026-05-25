import type { UserRole } from '@unigest/shared'

export const ROLE_HOME: Record<UserRole, string> = {
  student:   '/student/dashboard',
  teacher:   '/teacher/dashboard',
  secretary: '/admin/dashboard',
  admin:     '/admin/dashboard',
}

export function getRoleHome(role: UserRole | string): string {
  return ROLE_HOME[role as UserRole] ?? '/'
}
