# Keyboard Shortcuts & Command Palette System

This directory contains a comprehensive keyboard shortcuts and command palette system that enhances user productivity across the application.

## Components

### CommandPalette.tsx
A powerful command palette component that allows users to quickly access features and navigate the application.

**Features:**
- 🔍 **Fuzzy search** with keyword matching
- 📂 **Categorized commands** with icons
- ⌨️ **Keyboard navigation** (arrows, enter, escape)
- 🎨 **Visual feedback** with hover and selection states
- 📱 **Responsive design** with proper mobile support

**Usage:**
```tsx
import { CommandPalette } from '@/components/ui/common/CommandPalette'

const commands = [
  {
    id: 'nav-students',
    label: 'Students',
    description: 'Manage students',
    icon: Users,
    category: 'navigation',
    action: () => router.push('/students'),
    shortcut: 'Ctrl + 1'
  }
]

<CommandPalette
  isOpen={isOpen}
  onClose={onClose}
  commands={commands}
  placeholder="Search commands..."
/>
```

### KeyboardShortcutsHelp.tsx
A help modal that displays all available keyboard shortcuts organized by category.

**Features:**
- 📋 **Categorized shortcuts** display
- 🎯 **Visual key indicators** with proper formatting
- 📖 **User-friendly descriptions**
- 🎨 **Clean, readable layout**

### KeyboardShortcutIndicator.tsx
Utility components for displaying keyboard shortcut hints in the UI.

**Components:**
- `KeyboardShortcutIndicator` - Display shortcut keys
- `ButtonWithShortcut` - Button component with integrated shortcut display

## Hooks

### useKeyboardShortcuts.ts
Core hook for handling keyboard shortcuts with advanced features.

**Features:**
- 🎯 **Precise key matching** (ctrl, meta, shift, alt combinations)
- 🚫 **Input field exclusion** (prevents shortcuts when typing)
- 🔄 **Dynamic shortcut registration**
- 📝 **TypeScript support** with full type safety

**Usage:**
```tsx
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

useKeyboardShortcuts({
  shortcuts: [
    {
      key: 's',
      ctrlKey: true,
      action: () => save(),
      description: 'Save document'
    }
  ]
})
```

### usePageShortcuts.ts
Page-specific shortcuts hook with predefined shortcut sets.

**Features:**
- 📄 **Page-specific shortcuts** that auto-cleanup
- 🎯 **Command palette integration**
- 📋 **Predefined shortcut sets** for common pages
- 🔄 **Dynamic command registration**

**Available presets:**
- `studentPageShortcuts`
- `paymentsPageShortcuts`
- `classroomsPageShortcuts`
- `reportsPageShortcuts`

## Context

### CommandPaletteContext.tsx
Global context provider that manages the command palette state and provides global navigation commands.

**Features:**
- 🌐 **Global command registration**
- 🧭 **Built-in navigation commands**
- ⚡ **Context-aware actions**
- 🎯 **Smart button detection**

## Global Shortcuts

### Default Shortcuts
- `Ctrl + K` / `⌘ + K` - Open command palette
- `/` - Open command palette (when not typing)
- `Ctrl + N` - Create new item (context-aware)
- `Ctrl + F` - Focus search
- `Ctrl + S` - Save
- `Escape` - Close modals/cancel actions

### Page-Specific Shortcuts

#### Students Page
- `Ctrl + N` - Add new student
- `Ctrl + E` - Export students
- `Ctrl + I` - Import students

#### Payments Page
- `Ctrl + N` - Add new payment
- `Ctrl + P` - View payment plans

#### General Navigation
- `Ctrl + 1` - Dashboard
- `Ctrl + 2` - Students
- `Ctrl + 3` - Classrooms
- `Ctrl + 4` - Sessions
- `Ctrl + 5` - Payments

## Setup Instructions

1. **Add to Layout** - The `CommandPaletteProvider` is already added to the root layout.

2. **Page Implementation** - Add shortcuts to any page:
```tsx
import { usePageShortcuts, studentPageShortcuts } from '@/hooks/usePageShortcuts'

export function StudentsPage() {
  usePageShortcuts({
    shortcuts: studentPageShortcuts.shortcuts,
    commands: studentPageShortcuts.commands
  })
  
  return <div>...</div>
}
```

3. **Button Integration** - Add data attributes to enable shortcuts:
```tsx
<Button data-new-student onClick={handleCreate}>
  Add Student
</Button>
```

## Best Practices

1. **Data Attributes** - Use semantic data attributes (`data-new-*`, `data-export-*`) for button targeting
2. **Consistent Shortcuts** - Follow platform conventions (Ctrl on Windows/Linux, Cmd on Mac)
3. **Non-Conflicting** - Avoid conflicts with browser shortcuts
4. **Discoverable** - Display shortcuts in tooltips and help documentation
5. **Context-Aware** - Different shortcuts for different pages/contexts

## Accessibility

- ✅ **Keyboard navigation** fully supported
- ✅ **Screen reader friendly** with proper ARIA labels
- ✅ **Focus management** with proper tab order
- ✅ **Visual indicators** for keyboard users
- ✅ **Escape key support** for closing modals

## Browser Support

- ✅ **Modern browsers** (Chrome, Firefox, Safari, Edge)
- ✅ **Mac/Windows/Linux** keyboard handling
- ✅ **Touch devices** (command palette works with on-screen keyboard)