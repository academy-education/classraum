# Classraum UI Component Library

A comprehensive, reusable UI component library built with React, TypeScript, and Tailwind CSS. This library provides both primitive components and advanced composition patterns for building modern web applications.

## 🚀 Features

- **Type-safe**: Built with TypeScript for excellent developer experience
- **Accessible**: Following WAI-ARIA guidelines and best practices  
- **Themeable**: Consistent design system with customizable variants
- **Performance**: Optimized with React.memo, useMemo, and useCallback
- **Composition**: Advanced patterns for flexible component composition
- **Modern**: Uses latest React patterns and hooks

## 📦 Core Components

### Form Components
- **Button** - Flexible button with multiple variants and sizes
- **Input** - Text input with validation states
- **Textarea** - Multi-line text input
- **Label** - Accessible form labels
- **Select** - Dropdown selection component

### Data Display
- **Badge** - Status indicators and labels with icons
- **Avatar** - User profile pictures with status indicators
- **AvatarGroup** - Collection of avatars with overflow handling
- **Card** - Flexible content containers
- **Table** - Data tables with sorting and selection

### Feedback
- **Alert** - Contextual feedback messages
- **Progress** - Linear and circular progress indicators
- **Spinner** - Loading indicators

### Composition Patterns
- **Modal** - Flexible modal dialogs
- **DataTable** - Advanced data tables with sorting, filtering, selection
- **FormField** - Form field composition with validation
- **PageLayout** - Page layout patterns
- **withLoading** - Higher-order component for loading states

## 🎨 Usage Examples

### Basic Components

```tsx
import { Button, Badge, Avatar, Alert } from '@/components/ui'

// Button variants
<Button variant="primary" size="lg">Primary Action</Button>
<Button variant="outline" disabled>Disabled</Button>

// Badge with icon
<Badge variant="success" icon={<CheckIcon />} removable onRemove={() => {}}>
  Completed
</Badge>

// Avatar with status
<Avatar 
  src="/avatar.jpg" 
  name="John Doe" 
  size="lg"
  status="online" 
  showStatus 
/>

// Alert with dismissal
<Alert variant="warning" dismissible onDismiss={() => {}}>
  <Alert.Title>Warning</Alert.Title>
  <Alert.Description>Please review your settings</Alert.Description>
</Alert>
```

### Composition Patterns

```tsx
import { Modal, DataTable, FormField, Card } from '@/components/ui'

// Modal composition
<Modal isOpen={open} onClose={() => setOpen(false)} size="lg">
  <Modal.Header>
    <h2>Create User</h2>
  </Modal.Header>
  <Modal.Body>
    <FormField id="name" required error={errors.name}>
      <FormField.Label>Full Name</FormField.Label>
      <FormField.Control>
        <Input value={name} onChange={setName} />
      </FormField.Control>
      <FormField.Error />
      <FormField.Help>Enter first and last name</FormField.Help>
    </FormField>
  </Modal.Body>
  <Modal.Footer>
    <Button onClick={handleSave}>Save</Button>
  </Modal.Footer>
</Modal>

// DataTable with selection
<DataTable 
  data={users} 
  showSearch 
  selectable 
  onSelectionChange={setSelected}
>
  <DataTable.Header>
    <DataTable.SelectHeader />
    <DataTable.ColumnHeader field="name" sortable>Name</DataTable.ColumnHeader>
    <DataTable.ColumnHeader field="email" sortable>Email</DataTable.ColumnHeader>
    <DataTable.ColumnHeader>Actions</DataTable.ColumnHeader>
  </DataTable.Header>
  <DataTable.Body>
    {users.map(user => (
      <DataTable.Row key={user.id} id={user.id} selectable>
        <DataTable.Cell>{user.name}</DataTable.Cell>
        <DataTable.Cell>{user.email}</DataTable.Cell>
        <DataTable.Cell>
          <Button size="sm">Edit</Button>
        </DataTable.Cell>
      </DataTable.Row>
    ))}
  </DataTable.Body>
</DataTable>

// Page layout composition
<PageLayout maxWidth="2xl">
  <PageLayout.Header>
    <PageLayout.Title>Dashboard</PageLayout.Title>
    <PageLayout.Description>Manage your application</PageLayout.Description>
  </PageLayout.Header>
  <PageLayout.Content>
    <PageLayout.Section title="Statistics">
      <PageLayout.Stats stats={statsData} />
    </PageLayout.Section>
    <PageLayout.Grid columns={3}>
      <Card>Content 1</Card>
      <Card>Content 2</Card>
      <Card>Content 3</Card>
    </PageLayout.Grid>
  </PageLayout.Content>
</PageLayout>
```

### Higher-Order Components

```tsx
import { withLoading, useLoading } from '@/components/ui'

// HOC pattern
const MyComponent = withLoading(UserList, {
  loadingText: 'Loading users...',
  loadingSize: 'lg'
})

<MyComponent loading={isLoading} error={error} />

// Hook pattern
function MyComponent() {
  const { loading, error, withLoadingWrapper } = useLoading()
  
  const handleSubmit = async () => {
    await withLoadingWrapper(async () => {
      await api.saveUser(userData)
    })
  }
  
  return (
    <div>
      {loading && <Spinner />}
      {error && <Alert variant="destructive">{error.message}</Alert>}
      <Button onClick={handleSubmit}>Save</Button>
    </div>
  )
}
```

## 🛠 Component API

### Variants System

Components use a consistent variant system:

```tsx
// Size variants
size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'

// Color variants  
variant: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'destructive'

// Button variants
variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
```

### Accessibility

All components follow accessibility best practices:

- Semantic HTML elements
- ARIA attributes and roles
- Keyboard navigation support
- Focus management
- Screen reader support

### Performance

Components are optimized for performance:

- `React.memo` for preventing unnecessary re-renders
- `useMemo` for expensive calculations
- `useCallback` for stable function references
- Lazy loading where appropriate

## 🎯 Best Practices

### Component Composition

```tsx
// ✅ Good - Use composition patterns
<FormField id="email" required error={errors.email}>
  <FormField.Label>Email</FormField.Label>
  <FormField.Control>
    <Input type="email" />
  </FormField.Control>
  <FormField.Error />
</FormField>

// ❌ Avoid - Prop drilling
<Input 
  label="Email"
  required
  error={errors.email}
  showError
  type="email"
/>
```

### Performance Optimization

```tsx
// ✅ Good - Memoize expensive calculations
const expensiveValue = useMemo(() => 
  processLargeDataset(data), [data]
)

// ✅ Good - Stable event handlers
const handleClick = useCallback((id: string) => {
  onItemClick(id)
}, [onItemClick])

// ✅ Good - Use composition for loading states
<LoadingBoundary loading={loading} error={error}>
  <MyComponent />
</LoadingBoundary>
```

### Type Safety

```tsx
// ✅ Good - Use component prop types
import type { ButtonProps } from '@/components/ui'

interface MyButtonProps extends ButtonProps {
  customProp: string
}

// ✅ Good - Use variant types
import type { VariantProps } from 'class-variance-authority'
import { buttonVariants } from '@/components/ui'

type ButtonVariant = VariantProps<typeof buttonVariants>['variant']
```

## 📁 File Structure

```
src/components/
├── ui/                     # Core UI components
│   ├── button.tsx
│   ├── input.tsx
│   ├── badge.tsx
│   ├── avatar.tsx
│   ├── Alert.tsx
│   ├── Progress.tsx
│   ├── Spinner.tsx
│   ├── index.ts           # Main exports
│   └── README.md          # This file
├── patterns/              # Composition patterns
│   ├── Modal.tsx
│   ├── DataTable.tsx
│   ├── FormField.tsx
│   ├── Card.tsx
│   ├── PageLayout.tsx
│   ├── withLoading.tsx
│   └── index.ts
└── examples/              # Usage examples
    └── CompositionExample.tsx
```

## 🔄 Migration from Legacy Components

The new component library is designed to be a drop-in replacement for legacy components:

```tsx
// Legacy
import { StatusBadge } from '@/components/ui/reports/StatusBadge'

// New
import { Badge } from '@/components/ui'
<Badge variant="success">Active</Badge>

// Legacy modal pattern
<div className="modal">
  <div className="modal-header">Title</div>
  <div className="modal-body">Content</div>
</div>

// New modal pattern
<Modal isOpen={open} onClose={close}>
  <Modal.Header>Title</Modal.Header>
  <Modal.Body>Content</Modal.Body>
</Modal>
```

## 🧪 Testing

Components are designed to be easily testable:

```tsx
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui'

test('button renders with correct variant', () => {
  render(<Button variant="primary">Click me</Button>)
  expect(screen.getByRole('button')).toHaveClass('bg-primary')
})
```

## 🤝 Contributing

When adding new components:

1. Follow the existing patterns and conventions
2. Add TypeScript types and interfaces
3. Include accessibility features
4. Add performance optimizations (memo, callbacks)
5. Update the index.ts exports
6. Add usage examples

---

This component library provides the foundation for building consistent, accessible, and performant user interfaces across the Classraum application.