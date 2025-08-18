# Global State Management with Zustand

This directory contains the global state management system built with Zustand, providing a centralized, performant, and type-safe state management solution for the Classraum application.

## 🏗 Architecture Overview

### Stores Structure

```
src/stores/
├── useAcademyStore.ts    # Academy data and statistics
├── useUserStore.ts       # User profile and preferences
├── useUIStore.ts         # UI state (modals, toasts, loading)
├── useDashboardStore.ts  # Dashboard-specific metrics
├── index.ts              # Centralized exports
└── README.md            # This file
```

## 🎯 Benefits

1. **Eliminates Prop Drilling**: Access state anywhere without passing props
2. **Performance**: Only components that use specific state slices re-render
3. **Persistence**: Automatic state persistence with localStorage
4. **Type Safety**: Full TypeScript support with autocompletion
5. **Developer Experience**: Simple API with minimal boilerplate

## 📦 Store Details

### Academy Store
Manages academy-related data and statistics.

```typescript
import { useAcademyStore } from '@/stores'

function MyComponent() {
  const { 
    academy,           // Current academy data
    academyStats,      // Statistics (students, revenue, etc.)
    loading,          
    fetchAcademy,      // Load academy data
    fetchAcademyStats, // Load statistics
    refreshStats       // Refresh statistics
  } = useAcademyStore()

  // Usage
  useEffect(() => {
    fetchAcademy(academyId)
  }, [academyId])
}
```

### User Store
Manages user authentication, profile, and preferences.

```typescript
import { useUserStore } from '@/stores'

function MyComponent() {
  const { 
    user,              // User profile
    preferences,       // User preferences (language, theme, etc.)
    setPreferences,    // Update preferences
    updateUser,        // Update user profile
    fetchUser         // Load user data
  } = useUserStore()

  // Change language
  const handleLanguageChange = () => {
    setPreferences({ language: 'korean' })
  }
}
```

### UI Store
Manages UI state like modals, toasts, and global loading.

```typescript
import { useUIStore, showSuccessToast, showErrorToast } from '@/stores'

function MyComponent() {
  const { 
    // Sidebar
    sidebarCollapsed,
    toggleSidebar,
    
    // Modals
    openModal,
    closeModal,
    
    // Loading
    setGlobalLoading
  } = useUIStore()

  // Show toast notifications
  const handleSuccess = () => {
    showSuccessToast('Operation completed!', 'Your changes have been saved.')
  }
  
  // Open modal with data
  const handleOpenModal = () => {
    openModal('edit-user', { userId: 123 })
  }
}
```

### Dashboard Store
Manages dashboard-specific metrics and filters.

```typescript
import { useDashboardStore } from '@/stores'

function Dashboard() {
  const { 
    metrics,            // Dashboard metrics (trends, growth, etc.)
    filters,            // Date range filters
    loading,
    fetchDashboardData,
    setFilters
  } = useDashboardStore()

  // Change date range
  const handleDateRangeChange = (range: 'week' | 'month' | 'year') => {
    setFilters({ dateRange: range })
    fetchDashboardData(academyId)
  }
}
```

## 🚀 Usage Examples

### 1. Basic Store Usage

```typescript
// Access store state
const academy = useAcademyStore(state => state.academy)
const user = useUserStore(state => state.user)

// Access multiple values (better performance)
const { academy, academyStats, loading } = useAcademyStore()
```

### 2. Store Initialization

```typescript
// In your app root or layout
import { StoreProvider } from '@/providers/StoreProvider'

export default function RootLayout({ children }) {
  return (
    <StoreProvider userId={userId} academyId={academyId}>
      {children}
    </StoreProvider>
  )
}
```

### 3. Toast Notifications

```typescript
import { showSuccessToast, showErrorToast, showWarningToast } from '@/stores'

// Success notification
showSuccessToast('User created', 'The user has been successfully added.')

// Error notification
showErrorToast('Error', 'Failed to save changes. Please try again.')

// Warning notification
showWarningToast('Warning', 'This action cannot be undone.')
```

### 4. Global Loading State

```typescript
const { setGlobalLoading } = useUIStore()

const handleLongOperation = async () => {
  setGlobalLoading(true, 'Processing your request...')
  
  try {
    await longRunningOperation()
  } finally {
    setGlobalLoading(false)
  }
}
```

### 5. Modal Management

```typescript
const { openModal, closeModal } = useUIStore()

// Open modal with data
openModal('user-details', { userId: 123, mode: 'edit' })

// Access modal data in modal component
const modalData = useUIStore(state => state.modals['user-details']?.data)

// Close modal
closeModal('user-details')
```

### 6. Persisted State

```typescript
// Academy and User stores automatically persist to localStorage
// State is restored on app reload

// Clear persisted state
localStorage.removeItem('academy-storage')
localStorage.removeItem('user-storage')
```

## 🔧 Advanced Patterns

### 1. Computed Values

```typescript
// Create derived state using selectors
const totalUsers = useAcademyStore(state => 
  (state.academyStats?.totalStudents || 0) + 
  (state.academyStats?.totalTeachers || 0)
)
```

### 2. Async Actions

```typescript
const fetchAllData = async (academyId: string) => {
  // Actions can be composed
  await Promise.all([
    useAcademyStore.getState().fetchAcademy(academyId),
    useAcademyStore.getState().fetchAcademyStats(academyId),
    useDashboardStore.getState().fetchDashboardData(academyId)
  ])
}
```

### 3. Subscribe to Changes

```typescript
// Subscribe to specific state changes
const unsubscribe = useAcademyStore.subscribe(
  (state) => state.academyStats,
  (stats) => {
    console.log('Academy stats updated:', stats)
  }
)

// Clean up
unsubscribe()
```

### 4. Testing

```typescript
// Reset store state for testing
beforeEach(() => {
  useAcademyStore.getState().clearAcademy()
  useUserStore.getState().clearUser()
  useUIStore.getState().clearToasts()
})

// Mock store state
useAcademyStore.setState({
  academy: mockAcademy,
  academyStats: mockStats
})
```

## 📋 Best Practices

### 1. Use Selectors for Performance

```typescript
// ✅ Good - Only re-renders when academy changes
const academy = useAcademyStore(state => state.academy)

// ❌ Avoid - Re-renders on any store change
const store = useAcademyStore()
const academy = store.academy
```

### 2. Group Related Updates

```typescript
// ✅ Good - Single state update
useAcademyStore.setState({
  academy: newAcademy,
  loading: false,
  error: null
})

// ❌ Avoid - Multiple updates
setAcademy(newAcademy)
setLoading(false)
setError(null)
```

### 3. Handle Errors Gracefully

```typescript
const fetchData = async () => {
  try {
    await fetchAcademy(academyId)
    showSuccessToast('Data loaded')
  } catch (error) {
    showErrorToast('Failed to load data')
  }
}
```

### 4. Clean Up When Needed

```typescript
// Clear sensitive data on logout
const handleLogout = () => {
  useUserStore.getState().clearUser()
  useAcademyStore.getState().clearAcademy()
  useDashboardStore.getState().clearDashboard()
}
```

## 🔍 Debugging

### Enable Zustand DevTools

```typescript
// In development, stores are automatically connected to Redux DevTools
// Open Redux DevTools Extension to inspect state changes
```

### Log State Changes

```typescript
// Enable logging for debugging
if (process.env.NODE_ENV === 'development') {
  useAcademyStore.subscribe((state) => {
    console.log('Academy store updated:', state)
  })
}
```

## 🚦 Migration Guide

### From Props to Store

```typescript
// Before - Props drilling
function Dashboard({ user, academy, stats, loading }) {
  return <ChildComponent user={user} academy={academy} />
}

// After - Direct store access
function Dashboard() {
  const { user } = useUserStore()
  const { academy, academyStats, loading } = useAcademyStore()
  
  return <ChildComponent />
}

function ChildComponent() {
  // Access stores directly, no props needed
  const { user } = useUserStore()
  const { academy } = useAcademyStore()
}
```

### From Context to Store

```typescript
// Before - React Context
const { user } = useContext(UserContext)
const { academy } = useContext(AcademyContext)

// After - Zustand Store
const { user } = useUserStore()
const { academy } = useAcademyStore()
```

## 📊 Performance Benefits

1. **Selective Re-renders**: Only components using changed state re-render
2. **No Provider Nesting**: No wrapper components needed
3. **Optimized Updates**: Batched state updates
4. **Minimal Bundle Size**: ~8KB gzipped for Zustand
5. **Built-in Memoization**: Automatic selector memoization

## 🤝 Contributing

When adding new stores:

1. Create a new store file in `src/stores/`
2. Define clear TypeScript interfaces
3. Include loading and error states
4. Add persistence if needed
5. Export from `index.ts`
6. Update this documentation

---

The global state management system provides a robust foundation for managing application state with excellent performance and developer experience.