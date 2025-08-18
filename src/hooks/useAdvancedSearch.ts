import { useState, useMemo, useCallback, useEffect } from 'react'
import { useDebounced } from './usePerformanceOptimizations'

export interface SearchFilter {
  field: string
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between'
  value: any
  type?: 'string' | 'number' | 'date' | 'boolean'
  label?: string
}

export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

export interface SearchConfig {
  searchableFields: string[]
  filterableFields: Array<{
    field: string
    label: string
    type: 'string' | 'number' | 'date' | 'boolean' | 'select'
    options?: Array<{ value: any; label: string }>
  }>
  sortableFields: Array<{
    field: string
    label: string
  }>
  defaultSort?: SortConfig
}

export function useAdvancedSearch<T extends Record<string, any>>(
  data: T[],
  config: SearchConfig,
  debounceMs: number = 300
) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilter[]>([])
  const [sort, setSort] = useState<SortConfig>(config.defaultSort || { field: '', direction: 'asc' })
  const [pagination, setPagination] = useState({ page: 1, limit: 20 })

  const debouncedSearchQuery = useDebounced(searchQuery, debounceMs)

  // Advanced search function
  const searchData = useCallback((items: T[], query: string, searchFields: string[]): T[] => {
    if (!query.trim()) return items

    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 0)
    
    return items.filter(item => {
      return searchTerms.every(term => {
        return searchFields.some(field => {
          const value = getNestedValue(item, field)
          if (value == null) return false
          
          const stringValue = String(value).toLowerCase()
          
          // Support fuzzy search, exact phrases, and wildcards
          if (term.startsWith('"') && term.endsWith('"')) {
            // Exact phrase search
            const phrase = term.slice(1, -1)
            return stringValue.includes(phrase)
          } else if (term.includes('*')) {
            // Wildcard search
            const regex = new RegExp(term.replace(/\*/g, '.*'), 'i')
            return regex.test(stringValue)
          } else {
            // Fuzzy search
            return stringValue.includes(term) || fuzzyMatch(stringValue, term)
          }
        })
      })
    })
  }, [])

  // Apply filters
  const filterData = useCallback((items: T[], activeFilters: SearchFilter[]): T[] => {
    return items.filter(item => {
      return activeFilters.every(filter => {
        const value = getNestedValue(item, filter.field)
        return applyFilter(value, filter)
      })
    })
  }, [])

  // Apply sorting
  const sortData = useCallback((items: T[], sortConfig: SortConfig): T[] => {
    if (!sortConfig.field) return items

    return [...items].sort((a, b) => {
      const aValue = getNestedValue(a, sortConfig.field)
      const bValue = getNestedValue(b, sortConfig.field)
      
      const comparison = compareValues(aValue, bValue)
      return sortConfig.direction === 'desc' ? -comparison : comparison
    })
  }, [])

  // Apply pagination
  const paginateData = useCallback((items: T[], page: number, limit: number): T[] => {
    const startIndex = (page - 1) * limit
    return items.slice(startIndex, startIndex + limit)
  }, [])

  // Process all data transformations
  const processedData = useMemo(() => {
    let result = data

    // Apply search
    if (debouncedSearchQuery) {
      result = searchData(result, debouncedSearchQuery, config.searchableFields)
    }

    // Apply filters
    if (filters.length > 0) {
      result = filterData(result, filters)
    }

    // Store total before pagination
    const totalItems = result.length

    // Apply sorting
    if (sort.field) {
      result = sortData(result, sort)
    }

    // Apply pagination
    const paginatedResult = paginateData(result, pagination.page, pagination.limit)

    return {
      items: paginatedResult,
      totalItems,
      totalPages: Math.ceil(totalItems / pagination.limit),
      currentPage: pagination.page,
      hasNextPage: pagination.page < Math.ceil(totalItems / pagination.limit),
      hasPreviousPage: pagination.page > 1
    }
  }, [
    data,
    debouncedSearchQuery,
    filters,
    sort,
    pagination,
    searchData,
    filterData,
    sortData,
    paginateData,
    config.searchableFields
  ])

  // Filter management
  const addFilter = useCallback((filter: SearchFilter) => {
    setFilters(prev => {
      // Remove existing filter for the same field
      const filtered = prev.filter(f => f.field !== filter.field)
      return [...filtered, filter]
    })
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }, [])

  const removeFilter = useCallback((field: string) => {
    setFilters(prev => prev.filter(f => f.field !== field))
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters([])
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  // Sort management
  const updateSort = useCallback((field: string) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [])

  // Pagination management
  const goToPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page: Math.max(1, page) }))
  }, [])

  const changePageSize = useCallback((limit: number) => {
    setPagination(prev => ({ ...prev, limit, page: 1 }))
  }, [])

  // Reset all
  const reset = useCallback(() => {
    setSearchQuery('')
    setFilters([])
    setSort(config.defaultSort || { field: '', direction: 'asc' })
    setPagination({ page: 1, limit: 20 })
  }, [config.defaultSort])

  // Get filter suggestions based on current data
  const getFilterSuggestions = useCallback((field: string, type: string) => {
    const values = data.map(item => getNestedValue(item, field))
      .filter(value => value != null)
      .filter((value, index, array) => array.indexOf(value) === index) // Unique values
      .sort()

    if (type === 'string') {
      return values.slice(0, 10).map(value => ({ value, label: String(value) }))
    }
    
    return values.slice(0, 10).map(value => ({ value, label: String(value) }))
  }, [data])

  // Export filtered data
  const exportData = useCallback((format: 'json' | 'csv' = 'json') => {
    let exportItems = data

    // Apply search and filters but not pagination
    if (debouncedSearchQuery) {
      exportItems = searchData(exportItems, debouncedSearchQuery, config.searchableFields)
    }
    if (filters.length > 0) {
      exportItems = filterData(exportItems, filters)
    }
    if (sort.field) {
      exportItems = sortData(exportItems, sort)
    }

    if (format === 'csv') {
      return convertToCSV(exportItems)
    }
    
    return JSON.stringify(exportItems, null, 2)
  }, [data, debouncedSearchQuery, filters, sort, searchData, filterData, sortData, config.searchableFields])

  return {
    // Data
    ...processedData,
    
    // Search
    searchQuery,
    setSearchQuery,
    
    // Filters
    filters,
    addFilter,
    removeFilter,
    clearFilters,
    getFilterSuggestions,
    
    // Sort
    sort,
    updateSort,
    
    // Pagination
    pagination,
    goToPage,
    changePageSize,
    
    // Utilities
    reset,
    exportData,
    
    // Computed
    isSearchActive: !!debouncedSearchQuery || filters.length > 0,
    isLoading: false // Can be enhanced with async operations
  }
}

// Helper functions
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

function fuzzyMatch(text: string, pattern: string): boolean {
  const textLen = text.length
  const patternLen = pattern.length
  
  if (patternLen > textLen) return false
  if (patternLen === textLen) return text === pattern
  
  let textIndex = 0
  let patternIndex = 0
  
  while (textIndex < textLen && patternIndex < patternLen) {
    if (text[textIndex] === pattern[patternIndex]) {
      patternIndex++
    }
    textIndex++
  }
  
  return patternIndex === patternLen
}

function applyFilter(value: any, filter: SearchFilter): boolean {
  if (value == null) return false

  switch (filter.operator) {
    case 'equals':
      return value === filter.value
    case 'contains':
      return String(value).toLowerCase().includes(String(filter.value).toLowerCase())
    case 'startsWith':
      return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase())
    case 'endsWith':
      return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase())
    case 'gt':
      return value > filter.value
    case 'lt':
      return value < filter.value
    case 'gte':
      return value >= filter.value
    case 'lte':
      return value <= filter.value
    case 'in':
      return Array.isArray(filter.value) && filter.value.includes(value)
    case 'between':
      return Array.isArray(filter.value) && 
             filter.value.length === 2 && 
             value >= filter.value[0] && 
             value <= filter.value[1]
    default:
      return true
  }
}

function compareValues(a: any, b: any): number {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1
  
  if (typeof a === 'string' && typeof b === 'string') {
    return a.localeCompare(b)
  }
  
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime()
  }
  
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  
  return String(a).localeCompare(String(b))
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header]
        const stringValue = value == null ? '' : String(value)
        // Escape quotes and wrap in quotes if necessary
        return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')
          ? `"${stringValue.replace(/"/g, '""')}"`
          : stringValue
      }).join(',')
    )
  ].join('\n')
  
  return csvContent
}