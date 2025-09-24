// Development authentication bypass
export const DEV_AUTH = {
  enabled: false, // Set to false to disable development bypass
  mockUser: {
    userId: '38afc623-1d9b-49d9-a264-2bdc6149d61b', // alex.student@gmail.com - student (has 4 invoices)
    userName: 'Alex Student',
    academyIds: ['08b8913f-f1a6-4dbe-8487-06bdb0621491'], // Real academy ID from database
    role: 'student'
  }
}

export function isDevAuthEnabled() {
  return DEV_AUTH.enabled
}

export function getDevAuthUser() {
  return DEV_AUTH.mockUser
}