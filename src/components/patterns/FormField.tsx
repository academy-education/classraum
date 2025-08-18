"use client"

import React from 'react'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'

// Context for sharing form field state
interface FormFieldContextType {
  id: string
  error?: string
  required?: boolean
  disabled?: boolean
}

const FormFieldContext = React.createContext<FormFieldContextType | null>(null)

// Hook to use form field context
export const useFormField = () => {
  const context = React.useContext(FormFieldContext)
  if (!context) {
    throw new Error('FormField components must be used within a FormField')
  }
  return context
}

// Main FormField component
interface FormFieldProps {
  id: string
  children: React.ReactNode
  error?: string
  required?: boolean
  disabled?: boolean
  className?: string
}

export const FormField = React.memo<FormFieldProps>(({
  id,
  children,
  error,
  required = false,
  disabled = false,
  className = ""
}) => {
  const contextValue = React.useMemo(() => ({
    id,
    error,
    required,
    disabled
  }), [id, error, required, disabled])

  return (
    <div className={`space-y-2 ${className}`}>
      <FormFieldContext.Provider value={contextValue}>
        {children}
      </FormFieldContext.Provider>
    </div>
  )
})

// Form Field Label component
interface FormFieldLabelProps {
  children: React.ReactNode
  className?: string
  hideRequired?: boolean
}

export const FormFieldLabel = React.memo<FormFieldLabelProps>(({
  children,
  className = "",
  hideRequired = false
}) => {
  const { id, required } = useFormField()

  return (
    <Label 
      htmlFor={id} 
      className={`text-sm font-medium ${className}`}
    >
      {children}
      {required && !hideRequired && (
        <span className="text-red-500 ml-1">*</span>
      )}
    </Label>
  )
})

// Form Field Control wrapper
interface FormFieldControlProps {
  children: React.ReactNode
  className?: string
}

export const FormFieldControl = React.memo<FormFieldControlProps>(({
  children,
  className = ""
}) => {
  const { error } = useFormField()

  return (
    <div className={`relative ${className}`}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, {
            className: `${child.props.className || ''} ${
              error ? 'border-red-500 focus:border-red-500' : ''
            }`.trim()
          })
        }
        return child
      })}
    </div>
  )
})

// Form Field Error Message component
interface FormFieldErrorProps {
  children?: React.ReactNode
  className?: string
}

export const FormFieldError = React.memo<FormFieldErrorProps>(({
  children,
  className = ""
}) => {
  const { error } = useFormField()

  if (!error && !children) return null

  return (
    <div className={`flex items-center gap-2 text-sm text-red-600 ${className}`}>
      <AlertCircle className="w-4 h-4 flex-shrink-0" />
      <span>{children || error}</span>
    </div>
  )
})

// Form Field Success Message component
interface FormFieldSuccessProps {
  children: React.ReactNode
  show?: boolean
  className?: string
}

export const FormFieldSuccess = React.memo<FormFieldSuccessProps>(({
  children,
  show = false,
  className = ""
}) => {
  if (!show) return null

  return (
    <div className={`flex items-center gap-2 text-sm text-green-600 ${className}`}>
      <CheckCircle className="w-4 h-4 flex-shrink-0" />
      <span>{children}</span>
    </div>
  )
})

// Form Field Help Text component
interface FormFieldHelpProps {
  children: React.ReactNode
  className?: string
}

export const FormFieldHelp = React.memo<FormFieldHelpProps>(({
  children,
  className = ""
}) => {
  return (
    <div className={`flex items-start gap-2 text-sm text-gray-600 ${className}`}>
      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  )
})

// Form Field Description component
interface FormFieldDescriptionProps {
  children: React.ReactNode
  className?: string
}

export const FormFieldDescription = React.memo<FormFieldDescriptionProps>(({
  children,
  className = ""
}) => {
  return (
    <div className={`text-sm text-gray-500 ${className}`}>
      {children}
    </div>
  )
})

// Group of form fields
interface FormFieldGroupProps {
  children: React.ReactNode
  title?: string
  description?: string
  className?: string
  columns?: 1 | 2 | 3 | 4
}

export const FormFieldGroup = React.memo<FormFieldGroupProps>(({
  children,
  title,
  description,
  className = "",
  columns = 1
}) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {(title || description) && (
        <div>
          {title && (
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className={`grid gap-4 ${gridCols[columns]}`}>
        {children}
      </div>
    </div>
  )
})

// Compound component assignments
FormField.Label = FormFieldLabel
FormField.Control = FormFieldControl
FormField.Error = FormFieldError
FormField.Success = FormFieldSuccess
FormField.Help = FormFieldHelp
FormField.Description = FormFieldDescription
FormField.Group = FormFieldGroup

// Export types
export type {
  FormFieldProps,
  FormFieldLabelProps,
  FormFieldControlProps,
  FormFieldErrorProps,
  FormFieldSuccessProps,
  FormFieldHelpProps,
  FormFieldDescriptionProps,
  FormFieldGroupProps
}