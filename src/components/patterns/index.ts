// Export all composition patterns
export { Modal, useModal } from './Modal'
export type { ModalProps, ModalHeaderProps, ModalBodyProps, ModalFooterProps } from './Modal'

export { DataTable, useDataTable } from './DataTable'
export type { 
  DataTableProps, 
  DataTableHeaderProps, 
  DataTableColumnHeaderProps,
  DataTableBodyProps,
  DataTableRowProps,
  DataTableCellProps,
  DataTableEmptyProps
} from './DataTable'

export { FormField, useFormField } from './FormField'
export type {
  FormFieldProps,
  FormFieldLabelProps,
  FormFieldControlProps,
  FormFieldErrorProps,
  FormFieldSuccessProps,
  FormFieldHelpProps,
  FormFieldDescriptionProps,
  FormFieldGroupProps
} from './FormField'

export { Card } from './Card'
export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardSubtitleProps,
  CardContentProps,
  CardFooterProps,
  CardActionsProps,
  CardBadgeProps,
  ClickableCardProps,
  StatCardProps
} from './Card'

export { PageLayout } from './PageLayout'
export type {
  PageLayoutProps,
  PageHeaderProps,
  PageTitleProps,
  PageDescriptionProps,
  PageContentProps,
  PageSectionProps,
  PageGridProps,
  PageToolbarProps,
  PageStatsProps,
  PageEmptyStateProps
} from './PageLayout'

export { 
  withLoading, 
  useLoading, 
  LoadingSpinner, 
  ErrorDisplay, 
  Skeleton, 
  LoadingBoundary 
} from './withLoading'

// Re-export example component
export { CompositionExample } from '../examples/CompositionExample'