"use client"

import React, { forwardRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAccessibleId, useFormValidation } from '@/hooks/useAccessibility'

interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helperText?: string
  required?: boolean
  showRequiredIndicator?: boolean
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ 
    label, 
    error, 
    helperText, 
    required, 
    showRequiredIndicator = true,
    className = '',
    id,
    ...props 
  }, ref) => {
    const inputId = id || useAccessibleId('input')
    const errorId = useAccessibleId('error')
    const helperId = useAccessibleId('helper')
    const { announceError } = useFormValidation()

    // Announce errors when they change
    React.useEffect(() => {
      if (error) {
        announceError(label, error)
      }
    }, [error, label, announceError])

    const ariaDescribedBy = [
      helperText ? helperId : null,
      error ? errorId : null
    ].filter(Boolean).join(' ') || undefined

    return (
      <div className="space-y-2">
        <Label 
          htmlFor={inputId}
          className={`text-sm font-medium ${error ? 'text-red-700' : 'text-gray-700'}`}
        >
          {label}
          {required && showRequiredIndicator && (
            <span className="text-red-500 ml-1" aria-label="required">*</span>
          )}
        </Label>
        
        <Input
          ref={ref}
          id={inputId}
          aria-describedby={ariaDescribedBy}
          aria-invalid={error ? 'true' : 'false'}
          aria-required={required}
          className={`
            ${className}
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
          `}
          {...props}
        />
        
        {helperText && (
          <p id={helperId} className="text-sm text-gray-600">
            {helperText}
          </p>
        )}
        
        {error && (
          <p 
            id={errorId} 
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

AccessibleInput.displayName = 'AccessibleInput'

interface AccessibleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  helperText?: string
  options: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
}

export const AccessibleSelect = forwardRef<HTMLSelectElement, AccessibleSelectProps>(
  ({ 
    label, 
    error, 
    helperText, 
    options, 
    placeholder,
    required,
    className = '',
    id,
    ...props 
  }, ref) => {
    const selectId = id || useAccessibleId('select')
    const errorId = useAccessibleId('error')
    const helperId = useAccessibleId('helper')

    const ariaDescribedBy = [
      helperText ? helperId : null,
      error ? errorId : null
    ].filter(Boolean).join(' ') || undefined

    return (
      <div className="space-y-2">
        <Label 
          htmlFor={selectId}
          className={`text-sm font-medium ${error ? 'text-red-700' : 'text-gray-700'}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </Label>
        
        <select
          ref={ref}
          id={selectId}
          aria-describedby={ariaDescribedBy}
          aria-invalid={error ? 'true' : 'false'}
          aria-required={required}
          className={`
            w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-500
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            ${className}
          `}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        
        {helperText && (
          <p id={helperId} className="text-sm text-gray-600">
            {helperText}
          </p>
        )}
        
        {error && (
          <p 
            id={errorId} 
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

AccessibleSelect.displayName = 'AccessibleSelect'

interface AccessibleCheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  description?: string
  error?: string
}

export const AccessibleCheckbox = forwardRef<HTMLInputElement, AccessibleCheckboxProps>(
  ({ label, description, error, className = '', id, ...props }, ref) => {
    const checkboxId = id || useAccessibleId('checkbox')
    const descId = useAccessibleId('desc')
    const errorId = useAccessibleId('error')

    const ariaDescribedBy = [
      description ? descId : null,
      error ? errorId : null
    ].filter(Boolean).join(' ') || undefined

    return (
      <div className="space-y-2">
        <div className="flex items-start space-x-3">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            aria-describedby={ariaDescribedBy}
            aria-invalid={error ? 'true' : 'false'}
            className={`
              mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded
              focus:ring-2 focus:ring-blue-500
              ${error ? 'border-red-500' : ''}
              ${className}
            `}
            {...props}
          />
          <div className="flex-1">
            <Label 
              htmlFor={checkboxId}
              className={`text-sm font-medium ${error ? 'text-red-700' : 'text-gray-700'}`}
            >
              {label}
            </Label>
            {description && (
              <p id={descId} className="text-sm text-gray-600 mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
        
        {error && (
          <p 
            id={errorId} 
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

AccessibleCheckbox.displayName = 'AccessibleCheckbox'