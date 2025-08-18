import { useCallback, useMemo } from 'react'

// Currency formatting
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Amount formatting with commas
export const formatAmountWithCommas = (amount: string | number): string => {
  const numAmount = typeof amount === 'string' ? parseInt(amount.replace(/,/g, '')) : amount
  if (isNaN(numAmount)) return '0'
  return numAmount.toLocaleString('ko-KR')
}

// Parse amount with commas
export const parseAmountWithCommas = (amountStr: string): number => {
  const cleaned = amountStr.replace(/,/g, '')
  const parsed = parseInt(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

// Date formatting utilities
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  } catch (error) {
    return dateString
  }
}

export const formatDateWithTime = (dateString: string): string => {
  try {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return dateString
  }
}

// Get next payment date based on recurrence type
export const getNextPaymentDate = (lastDate: string, recurrenceType: string): Date => {
  const date = new Date(lastDate)
  
  switch (recurrenceType) {
    case 'weekly':
      date.setDate(date.getDate() + 7)
      break
    case 'biweekly':
      date.setDate(date.getDate() + 14)
      break
    case 'monthly':
      date.setMonth(date.getMonth() + 1)
      break
    case 'quarterly':
      date.setMonth(date.getMonth() + 3)
      break
    case 'yearly':
      date.setFullYear(date.getFullYear() + 1)
      break
    default:
      date.setMonth(date.getMonth() + 1) // Default to monthly
  }
  
  return date
}

// Status formatting
export const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'paid':
      return 'text-green-600 bg-green-50'
    case 'pending':
      return 'text-yellow-600 bg-yellow-50'
    case 'overdue':
      return 'text-red-600 bg-red-50'
    case 'cancelled':
      return 'text-gray-600 bg-gray-50'
    case 'active':
      return 'text-green-600 bg-green-50'
    case 'paused':
      return 'text-yellow-600 bg-yellow-50'
    case 'inactive':
      return 'text-gray-600 bg-gray-50'
    default:
      return 'text-gray-600 bg-gray-50'
  }
}

export const getStatusText = (status: string, t: (key: string) => string): string => {
  switch (status?.toLowerCase()) {
    case 'paid':
      return t('payments.status.paid')
    case 'pending':
      return t('payments.status.pending')
    case 'overdue':
      return t('payments.status.overdue')
    case 'cancelled':
      return t('payments.status.cancelled')
    case 'active':
      return t('payments.status.active')
    case 'paused':
      return t('payments.status.paused')
    case 'inactive':
      return t('payments.status.inactive')
    default:
      return status || t('payments.status.unknown')
  }
}

// Sorting utilities
export type SortField = 'amount' | 'date' | 'status' | 'student_name' | 'template_name'
export type SortDirection = 'asc' | 'desc'

export const useSortingUtils = () => {
  const sortData = useCallback(<T extends Record<string, any>>(
    data: T[],
    field: SortField | null,
    direction: SortDirection
  ): T[] => {
    if (!field) return data

    return [...data].sort((a, b) => {
      let aValue = a[field]
      let bValue = b[field]

      // Handle different field types
      if (field === 'amount' || field.includes('amount')) {
        aValue = parseFloat(aValue) || 0
        bValue = parseFloat(bValue) || 0
      } else if (field.includes('date')) {
        aValue = new Date(aValue).getTime()
        bValue = new Date(bValue).getTime()
      } else if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return direction === 'asc' ? -1 : 1
      if (aValue > bValue) return direction === 'asc' ? 1 : -1
      return 0
    })
  }, [])

  return { sortData }
}

// Filtering utilities
export const useFilteringUtils = () => {
  const filterBySearch = useCallback(<T extends Record<string, any>>(
    data: T[],
    searchQuery: string,
    searchFields: string[]
  ): T[] => {
    if (!searchQuery.trim()) return data

    const query = searchQuery.toLowerCase()
    return data.filter(item =>
      searchFields.some(field => {
        const value = item[field]
        return value && value.toString().toLowerCase().includes(query)
      })
    )
  }, [])

  const filterByStatus = useCallback(<T extends Record<string, any>>(
    data: T[],
    statusFilter: string
  ): T[] => {
    if (!statusFilter || statusFilter === 'all') return data
    return data.filter(item => item.status === statusFilter)
  }, [])

  return { filterBySearch, filterByStatus }
}

// Payment calculation utilities
export const usePaymentCalculations = () => {
  const calculateTotalRevenue = useCallback((invoices: any[]): number => {
    return invoices.reduce((total, invoice) => {
      if (invoice.status === 'paid') {
        return total + (parseFloat(invoice.final_amount) || 0)
      }
      return total
    }, 0)
  }, [])

  const calculatePendingAmount = useCallback((invoices: any[]): number => {
    return invoices.reduce((total, invoice) => {
      if (invoice.status === 'pending') {
        return total + (parseFloat(invoice.final_amount) || 0)
      }
      return total
    }, 0)
  }, [])

  const calculateOverdueAmount = useCallback((invoices: any[]): number => {
    return invoices.reduce((total, invoice) => {
      if (invoice.status === 'overdue') {
        return total + (parseFloat(invoice.final_amount) || 0)
      }
      return total
    }, 0)
  }, [])

  const calculateMonthlyRecurring = useCallback((templates: any[]): number => {
    return templates.reduce((total, template) => {
      if (template.is_active && template.recurrence_type === 'monthly') {
        const enrolledCount = template.enrolled_students_count || 0
        return total + (parseFloat(template.amount) * enrolledCount)
      }
      return total
    }, 0)
  }, [])

  return {
    calculateTotalRevenue,
    calculatePendingAmount,
    calculateOverdueAmount,
    calculateMonthlyRecurring
  }
}

// Validation utilities
export const useValidationUtils = () => {
  const validatePaymentForm = useCallback((formData: any): { [key: string]: string } => {
    const errors: { [key: string]: string } = {}

    if (!formData.selected_students || formData.selected_students.length === 0) {
      errors.students = 'At least one student must be selected'
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0'
    }

    if (!formData.due_date) {
      errors.due_date = 'Due date is required'
    } else {
      const dueDate = new Date(formData.due_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (dueDate < today) {
        errors.due_date = 'Due date cannot be in the past'
      }
    }

    return errors
  }, [])

  const validateTemplateForm = useCallback((formData: any): { [key: string]: string } => {
    const errors: { [key: string]: string } = {}

    if (!formData.name?.trim()) {
      errors.name = 'Template name is required'
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = 'Amount must be greater than 0'
    }

    if (!formData.recurrence_type) {
      errors.recurrence_type = 'Recurrence type is required'
    }

    if (!formData.selected_students || formData.selected_students.length === 0) {
      errors.students = 'At least one student must be selected'
    }

    return errors
  }, [])

  return {
    validatePaymentForm,
    validateTemplateForm
  }
}

// Custom hook that combines all payment utilities
export const usePaymentUtils = () => {
  const sortingUtils = useSortingUtils()
  const filteringUtils = useFilteringUtils()
  const calculationUtils = usePaymentCalculations()
  const validationUtils = useValidationUtils()

  const formatters = useMemo(() => ({
    formatCurrency,
    formatAmountWithCommas,
    parseAmountWithCommas,
    formatDate,
    formatDateWithTime,
    getNextPaymentDate,
    getStatusColor,
    getStatusText
  }), [])

  return {
    ...formatters,
    ...sortingUtils,
    ...filteringUtils,
    ...calculationUtils,
    ...validationUtils
  }
}