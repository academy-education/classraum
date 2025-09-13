# ADR-001: Authentication Pattern Standardization

## Status
Accepted

## Context
The application had inconsistent authentication patterns across different pages and components. Some pages directly accessed authentication state from localStorage, others used various context patterns, and error handling was inconsistent. This led to:
- Duplicate authentication logic
- Inconsistent error handling
- Security vulnerabilities
- Poor user experience during auth state transitions

## Decision
We implemented a standardized authentication pattern using:

1. **Centralized AuthContext**: Single source of truth for authentication state
2. **HOC Pattern (withAuth)**: Consistent authentication wrapper for protected components
3. **Custom Hooks**: `useAuth()`, `useAuthCheck()`, and `usePageWithAuth()` for different auth needs
4. **Error Boundaries**: Proper error handling for auth failures

## Consequences

### Positive
- **Consistent Auth Handling**: All components use the same authentication pattern
- **Better Security**: Centralized auth logic reduces security vulnerabilities
- **Improved DX**: Developers can easily protect components with standard patterns
- **Error Recovery**: Graceful handling of auth failures with proper error boundaries
- **Type Safety**: Full TypeScript support for auth-related types

### Negative
- **Migration Effort**: Required updating all existing pages to use new patterns
- **Learning Curve**: Developers need to understand the new auth patterns
- **Additional Abstraction**: One more layer between components and auth state

### Neutral
- All protected pages now require the withAuth HOC or usePageWithAuth hook
- Authentication state is now managed through React Context instead of direct Supabase access

## Implementation Notes

### Basic Usage
```typescript
// Using HOC for page protection
export default withAuth(MyProtectedPage)

// Using hook for auth data
const { academyId, userId } = usePageWithAuth('academyId')

// Using auth check hook
const { isAuthorized, authError } = useAuthCheck({
  requireAuth: true,
  requireRole: ['manager', 'teacher']
})
```

### File Structure
```
src/
├── contexts/
│   └── AuthContext.tsx
├── hooks/
│   └── auth/
│       ├── useAuth.ts
│       ├── useAuthCheck.ts
│       └── usePageWithAuth.ts
└── components/
    └── hoc/
        └── withAuth.tsx
```

## References
- Phase 1 Critical Fixes documentation
- [Next.js Authentication Best Practices](https://nextjs.org/docs/authentication)
- [React Context API Documentation](https://react.dev/reference/react/useContext)

---
**Date**: 2025-01-11
**Authors**: Development Team
**Review**: Implemented and tested in Phase 1