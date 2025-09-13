# Testing Strategy

## Overview
This document outlines the comprehensive testing strategy for the Classraum application, covering unit tests, integration tests, and end-to-end testing approaches.

## Testing Philosophy
- **Test Behavior, Not Implementation**: Focus on what the code does, not how
- **Prioritize Critical Paths**: Test user-critical features first
- **Maintain Test Independence**: Tests should not depend on each other
- **Keep Tests Simple**: Each test should verify one thing
- **Fast Feedback**: Tests should run quickly

## Testing Pyramid

```
         /\
        /E2E\        (5%)  - Critical user journeys
       /------\
      /  Integ  \    (20%) - API & component integration
     /------------\
    /     Unit     \ (75%) - Functions, hooks, utilities
   /________________\
```

## Test Types

### 1. Unit Tests
**Purpose**: Test individual functions, hooks, and components in isolation

#### What to Test
- Utility functions
- Custom hooks
- Simple components
- Business logic
- Data transformations

#### Example
```typescript
// src/utils/__tests__/formatters.test.ts
describe('formatCurrency', () => {
  it('formats Korean won correctly', () => {
    expect(formatCurrency(1234567)).toBe('₩1,234,567')
  })

  it('handles zero values', () => {
    expect(formatCurrency(0)).toBe('₩0')
  })

  it('handles negative values', () => {
    expect(formatCurrency(-1000)).toBe('-₩1,000')
  })
})
```

### 2. Component Tests
**Purpose**: Test React components with their props and interactions

#### What to Test
- Component rendering
- User interactions
- State changes
- Event handling
- Conditional rendering

#### Example
```typescript
// src/components/ui/common/__tests__/Button.test.tsx
describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    fireEvent.click(screen.getByText('Click'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when loading', () => {
    render(<Button loading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### 3. Integration Tests
**Purpose**: Test how multiple components work together

#### What to Test
- Page components with child components
- API integration
- Form submissions
- Navigation flows
- State management

#### Example
```typescript
// src/app/(app)/dashboard/__tests__/dashboard.integration.test.tsx
describe('Dashboard Integration', () => {
  it('loads and displays user data', async () => {
    render(<Dashboard />)
    
    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Welcome back')).toBeInTheDocument()
    })
    
    // Check if stats are displayed
    expect(screen.getByText('Total Students')).toBeInTheDocument()
    expect(screen.getByText('Active Sessions')).toBeInTheDocument()
  })

  it('navigates to sessions page when session card is clicked', async () => {
    const { router } = render(<Dashboard />)
    
    const sessionCard = await screen.findByText('Today\'s Sessions')
    fireEvent.click(sessionCard)
    
    expect(router.push).toHaveBeenCalledWith('/sessions')
  })
})
```

### 4. End-to-End Tests
**Purpose**: Test complete user workflows from start to finish

#### What to Test
- Critical user journeys
- Authentication flows
- Payment processes
- Data creation/editing workflows

#### Example (using Playwright)
```typescript
// e2e/auth.spec.ts
test('user can login and access dashboard', async ({ page }) => {
  // Navigate to login
  await page.goto('/auth')
  
  // Fill in credentials
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  
  // Submit form
  await page.click('button[type="submit"]')
  
  // Verify redirect to dashboard
  await expect(page).toHaveURL('/dashboard')
  await expect(page.locator('h1')).toContainText('Dashboard')
})
```

## Testing Tools

### Core Testing Stack
- **Jest**: Test runner and assertion library
- **React Testing Library**: React component testing
- **MSW**: API mocking for tests
- **Playwright**: E2E testing
- **@testing-library/user-event**: User interaction simulation

### Configuration Files

#### jest.config.js
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}
```

## Test Organization

### File Structure
```
src/
├── components/
│   └── ui/
│       ├── Button.tsx
│       └── __tests__/
│           └── Button.test.tsx
├── hooks/
│   ├── useAuth.ts
│   └── __tests__/
│       └── useAuth.test.ts
├── utils/
│   ├── formatters.ts
│   └── __tests__/
│       └── formatters.test.ts
└── app/
    └── (app)/
        └── dashboard/
            ├── page.tsx
            └── __tests__/
                ├── dashboard.test.tsx
                └── dashboard.integration.test.tsx
```

## Test Data Management

### Mock Data
```typescript
// src/tests/fixtures/users.ts
export const mockStudent = {
  id: 'test-student-1',
  name: 'Test Student',
  email: 'student@test.com',
  role: 'student',
  academyId: 'test-academy-1'
}

export const mockTeacher = {
  id: 'test-teacher-1',
  name: 'Test Teacher',
  email: 'teacher@test.com',
  role: 'teacher',
  academyId: 'test-academy-1'
}
```

### Test Utilities
```typescript
// src/tests/utils/render.tsx
export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions
) {
  return render(
    <AuthProvider>
      <QueryClient>
        {ui}
      </QueryClient>
    </AuthProvider>,
    options
  )
}
```

## Coverage Requirements

### Minimum Coverage Targets
- **Overall**: 70%
- **Critical Paths**: 90%
- **Utility Functions**: 100%
- **API Handlers**: 80%
- **UI Components**: 60%

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:ci
      - run: npm run test:e2e
```

## Testing Best Practices

### Do's
- ✅ Write tests alongside code development
- ✅ Use descriptive test names
- ✅ Test edge cases and error conditions
- ✅ Keep tests focused and isolated
- ✅ Use data-testid for E2E test selectors
- ✅ Mock external dependencies
- ✅ Run tests before committing

### Don'ts
- ❌ Test implementation details
- ❌ Use setTimeout in tests
- ❌ Share state between tests
- ❌ Test third-party libraries
- ❌ Write brittle selectors
- ❌ Ignore flaky tests

## Test Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- Button.test.tsx

# Run tests matching pattern
npm test -- --testNamePattern="renders"

# Update snapshots
npm test -- -u

# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode
npm run test:e2e:headed
```

## Performance Testing

### Load Testing
```javascript
// tests/performance/load.test.js
describe('Performance', () => {
  it('renders dashboard within 2 seconds', async () => {
    const start = Date.now()
    render(<Dashboard />)
    await screen.findByText('Dashboard')
    const loadTime = Date.now() - start
    expect(loadTime).toBeLessThan(2000)
  })
})
```

### Bundle Size Testing
```javascript
// tests/bundle-size.test.js
it('keeps bundle size under limit', () => {
  const stats = require('../.next/build-stats.json')
  const mainBundle = stats.bundles.find(b => b.name === 'main')
  expect(mainBundle.size).toBeLessThan(500000) // 500KB
})
```

## Debugging Tests

### Debug Output
```javascript
// Use screen.debug() to see rendered output
screen.debug()

// Use prettyDOM for specific elements
import { prettyDOM } from '@testing-library/react'
console.log(prettyDOM(element))
```

### VS Code Debugging
```json
// .vscode/launch.json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache", "${file}"],
  "console": "integratedTerminal"
}
```

## Testing Checklist

### Before Commit
- [ ] All tests passing locally
- [ ] Coverage meets requirements
- [ ] No console.log in tests
- [ ] Tests are deterministic
- [ ] New features have tests

### Before Release
- [ ] E2E tests passing
- [ ] Performance tests passing
- [ ] Cross-browser testing complete
- [ ] Mobile testing complete
- [ ] Accessibility tests passing

---

Last Updated: 2025-01-11