# Development Guidelines

## Table of Contents
1. [Code Standards](#code-standards)
2. [Component Development](#component-development)
3. [State Management](#state-management)
4. [Testing Strategy](#testing-strategy)
5. [Performance Guidelines](#performance-guidelines)
6. [Security Best Practices](#security-best-practices)
7. [Git Workflow](#git-workflow)

## Code Standards

### TypeScript
- **Strict Mode**: Always maintain TypeScript strict mode compliance
- **Type Definitions**: Provide explicit types for all function parameters and return values
- **Interfaces over Types**: Use interfaces for object shapes, types for unions/intersections
- **No Any**: Avoid `any` type; use `unknown` if type is truly unknown

```typescript
// ✅ Good
interface UserData {
  id: string
  name: string
  role: 'student' | 'teacher' | 'manager' | 'parent'
}

function processUser(user: UserData): Promise<void> {
  // Implementation
}

// ❌ Bad
function processUser(user: any) {
  // Implementation
}
```

### React Components
- **Functional Components**: Always use functional components with hooks
- **Component Organization**: Props interface → Component → Export
- **Memoization**: Use React.memo for components with stable props
- **Custom Hooks**: Extract complex logic into custom hooks

```typescript
// Component template
interface ComponentProps {
  title: string
  onAction: (id: string) => void
}

export const MyComponent = React.memo<ComponentProps>(function MyComponent({
  title,
  onAction
}) {
  // Component logic
  return <div>{title}</div>
})
```

## Component Development

### File Structure
```
src/components/
├── ui/                    # UI components
│   ├── common/           # Reusable components
│   ├── [page-name]/      # Page-specific components
│   └── [component].tsx   # Component file
├── error-boundaries/      # Error boundary components
├── hoc/                  # Higher-order components
└── providers/            # Context providers
```

### Component Checklist
- [ ] TypeScript interfaces defined
- [ ] Props documented with JSDoc
- [ ] Error boundaries implemented
- [ ] Loading states handled
- [ ] Accessibility attributes added
- [ ] Memoization applied where appropriate
- [ ] Tests written

### Naming Conventions
- **Components**: PascalCase (e.g., `StudentDashboard`)
- **Files**: kebab-case for pages, PascalCase for components
- **Hooks**: camelCase with 'use' prefix (e.g., `useStudentData`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)

## State Management

### State Hierarchy
1. **Local State**: Component-specific state using `useState`
2. **Context State**: Shared state using React Context
3. **Server State**: API data using React Query/SWR
4. **Global State**: App-wide state using Zustand

### Best Practices
```typescript
// Local state for UI
const [isModalOpen, setIsModalOpen] = useState(false)

// Context for auth
const { userId, academyId } = useAuth()

// Server state with React Query
const { data, error, isLoading } = useQuery({
  queryKey: ['students', academyId],
  queryFn: () => fetchStudents(academyId)
})

// Global state with Zustand
const { theme, setTheme } = useThemeStore()
```

## Testing Strategy

### Test Types
1. **Unit Tests**: Individual functions and utilities
2. **Component Tests**: React component behavior
3. **Integration Tests**: Feature workflows
4. **E2E Tests**: Critical user paths

### Testing Guidelines
```typescript
// Component test example
describe('LoadingSpinner', () => {
  it('renders without crashing', () => {
    render(<LoadingSpinner />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('displays custom text', () => {
    render(<LoadingSpinner text="Loading..." />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
```

### Test Coverage Goals
- **Critical Paths**: 90% coverage
- **Utility Functions**: 100% coverage
- **UI Components**: 70% coverage
- **Error Handling**: 100% coverage

## Performance Guidelines

### Optimization Checklist
- [ ] Components memoized with React.memo
- [ ] Callbacks memoized with useCallback
- [ ] Expensive computations memoized with useMemo
- [ ] Large lists virtualized
- [ ] Images lazy loaded
- [ ] Code split at route level

### Performance Patterns
```typescript
// Memoize expensive computations
const expensiveValue = useMemo(() => {
  return calculateExpensiveValue(data)
}, [data])

// Memoize callbacks
const handleClick = useCallback((id: string) => {
  doSomething(id)
}, [doSomething])

// Lazy load components
const HeavyComponent = lazy(() => import('./HeavyComponent'))
```

### Bundle Size Guidelines
- **Page Components**: < 200KB
- **Shared Components**: < 50KB
- **Utilities**: < 10KB
- **Total Bundle**: < 500KB (initial load)

## Security Best Practices

### Data Handling
- **Never trust client input**: Always validate on server
- **Sanitize user content**: Use DOMPurify for HTML content
- **Use HTTPS**: All API calls over HTTPS
- **Secure storage**: Never store sensitive data in localStorage

### Authentication & Authorization
```typescript
// Always check authorization on sensitive operations
const { isAuthorized } = useAuthCheck({
  requireAuth: true,
  requireRole: ['manager', 'teacher']
})

if (!isAuthorized) {
  return <PermissionDenied />
}
```

### Security Checklist
- [ ] Input validation implemented
- [ ] XSS prevention (DOMPurify)
- [ ] CSRF protection enabled
- [ ] SQL injection prevented (parameterized queries)
- [ ] Rate limiting configured
- [ ] Security headers set

## Git Workflow

### Branch Naming
- **Features**: `feature/description`
- **Bugfixes**: `fix/issue-description`
- **Hotfixes**: `hotfix/critical-issue`
- **Refactoring**: `refactor/component-name`

### Commit Messages
```bash
# Format: <type>(<scope>): <subject>

feat(auth): add two-factor authentication
fix(sessions): resolve attendance status bug
refactor(dashboard): optimize performance
docs(api): update endpoint documentation
test(students): add unit tests for student service
```

### Pull Request Process
1. Create feature branch from `main`
2. Write code following guidelines
3. Add/update tests
4. Update documentation
5. Create PR with description
6. Address code review feedback
7. Merge after approval

### Code Review Checklist
- [ ] Code follows style guidelines
- [ ] Tests pass and coverage maintained
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Error handling implemented
- [ ] Performance considered
- [ ] Security reviewed

## Deployment Process

### Pre-deployment Checklist
- [ ] All tests passing
- [ ] Build successful
- [ ] Bundle size acceptable
- [ ] Performance metrics met
- [ ] Security scan passed
- [ ] Documentation updated

### Environment Variables
```bash
# Required environment variables
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
```

### Monitoring
- **Error Tracking**: Monitor error rates
- **Performance**: Track Core Web Vitals
- **Usage**: Monitor feature adoption
- **Security**: Track authentication failures

---

## Quick Reference

### Common Commands
```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run test            # Run tests
npm run test:coverage   # Run tests with coverage
npm run lint            # Run ESLint
ANALYZE=true npm run build  # Analyze bundle

# Git
git checkout -b feature/new-feature
git commit -m "feat: add new feature"
git push origin feature/new-feature
```

### Useful Resources
- [React Documentation](https://react.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Supabase Documentation](https://supabase.io/docs)
- [Testing Library](https://testing-library.com)

---

Last Updated: 2025-01-11