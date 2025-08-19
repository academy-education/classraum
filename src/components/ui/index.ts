// Core UI Components
export { Button } from './button'
export { Input } from './input'
export { Label } from './label'
export { Textarea } from './textarea'
export { Badge, badgeVariants } from './badge'
export { Card } from './card'
export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, avatarVariants } from './avatar'

// Form Components
export { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator
} from './select'

// Feedback Components
export { Alert, AlertTitle, AlertDescription } from './Alert'
export { Progress, CircularProgress } from './Progress'
export { Spinner } from './Spinner'

// Layout Components
// export { Separator } from './separator'  // File does not exist

// Data Display Components
// export {
//   Table,
//   TableBody,
//   TableCaption,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from './table'  // File does not exist

// Re-export patterns for easy access (patterns directory may not exist)
// export * from '../patterns'

// Export types for TypeScript users
export type { ButtonProps } from './button'
// export type { InputProps } from './input'  // InputProps not exported
// export type { BadgeProps } from './badge'  // BadgeProps may not exist