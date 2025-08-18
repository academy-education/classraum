// Development authentication bypass
export const DEV_AUTH = {
  enabled: false, // Set to false to disable development bypass
  mockUser: {
    userId: '00000000-0000-0000-0000-000000000123',
    userName: 'Development User',
    academyId: '00000000-0000-0000-0000-000000000456',
    role: 'manager'
  }
}

export function isDevAuthEnabled() {
  return DEV_AUTH.enabled
}

export function getDevAuthUser() {
  return DEV_AUTH.mockUser
}