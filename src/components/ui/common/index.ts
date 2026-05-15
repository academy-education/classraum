// Barrel export for the common/ primitives. Only re-exports components that
// have at least one downstream consumer. Direct subpath imports
// (`@/components/ui/common/EmptyState`) are still preferred — most of the app
// uses those — but this file stays consistent with what's actually shipped.
export { LoadingSpinner } from './LoadingSpinner'
export { EmptyState } from './EmptyState'
export { SearchInput } from './SearchInput'
export { StatusBadge } from './StatusBadge'
