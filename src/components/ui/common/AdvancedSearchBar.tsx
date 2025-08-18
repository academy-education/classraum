"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Search, Filter, X, ChevronDown, Download, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAdvancedSearch, SearchFilter, SearchConfig } from '@/hooks/useAdvancedSearch'

interface AdvancedSearchBarProps<T> {
  searchHook: ReturnType<typeof useAdvancedSearch<T>>
  config: SearchConfig
  placeholder?: string
  showExport?: boolean
  showReset?: boolean
}

export function AdvancedSearchBar<T extends Record<string, any>>({
  searchHook,
  config,
  placeholder = 'Search...',
  showExport = true,
  showReset = true
}: AdvancedSearchBarProps<T>) {
  const [showFilters, setShowFilters] = useState(false)
  const [newFilter, setNewFilter] = useState<Partial<SearchFilter>>({})
  const filterDropdownRef = useRef<HTMLDivElement>(null)

  const {
    searchQuery,
    setSearchQuery,
    filters,
    addFilter,
    removeFilter,
    clearFilters,
    getFilterSuggestions,
    reset,
    exportData,
    isSearchActive,
    totalItems
  } = searchHook

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setShowFilters(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddFilter = () => {
    if (newFilter.field && newFilter.operator && newFilter.value !== undefined) {
      const fieldConfig = config.filterableFields.find(f => f.field === newFilter.field)
      addFilter({
        field: newFilter.field,
        operator: newFilter.operator,
        value: newFilter.value,
        type: fieldConfig?.type || 'string',
        label: fieldConfig?.label || newFilter.field
      } as SearchFilter)
      
      setNewFilter({})
      setShowFilters(false)
    }
  }

  const handleExport = (format: 'json' | 'csv') => {
    const data = exportData(format)
    const mimeType = format === 'csv' ? 'text/csv' : 'application/json'
    const fileName = `export_${new Date().toISOString().split('T')[0]}.${format}`
    
    const blob = new Blob([data], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getOperatorOptions = (fieldType: string) => {
    switch (fieldType) {
      case 'string':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'equals', label: 'Equals' },
          { value: 'startsWith', label: 'Starts with' },
          { value: 'endsWith', label: 'Ends with' }
        ]
      case 'number':
      case 'date':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'gt', label: 'Greater than' },
          { value: 'lt', label: 'Less than' },
          { value: 'gte', label: 'Greater or equal' },
          { value: 'lte', label: 'Less or equal' },
          { value: 'between', label: 'Between' }
        ]
      case 'boolean':
        return [
          { value: 'equals', label: 'Equals' }
        ]
      case 'select':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'in', label: 'In' }
        ]
      default:
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'equals', label: 'Equals' }
        ]
    }
  }

  const renderFilterValue = () => {
    const fieldConfig = config.filterableFields.find(f => f.field === newFilter.field)
    if (!fieldConfig) return null

    switch (fieldConfig.type) {
      case 'select':
        return (
          <Select value={newFilter.value} onValueChange={(value) => setNewFilter(prev => ({ ...prev, value }))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select value..." />
            </SelectTrigger>
            <SelectContent>
              {fieldConfig.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      case 'boolean':
        return (
          <Select value={newFilter.value?.toString()} onValueChange={(value) => setNewFilter(prev => ({ ...prev, value: value === 'true' }))}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select value..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        )
      
      case 'date':
        return (
          <Input
            type="date"
            value={newFilter.value || ''}
            onChange={(e) => setNewFilter(prev => ({ ...prev, value: e.target.value }))}
            className="w-full"
          />
        )
      
      case 'number':
        return (
          <Input
            type="number"
            value={newFilter.value || ''}
            onChange={(e) => setNewFilter(prev => ({ ...prev, value: parseFloat(e.target.value) || '' }))}
            placeholder="Enter number..."
            className="w-full"
          />
        )
      
      default:
        return (
          <Input
            type="text"
            value={newFilter.value || ''}
            onChange={(e) => setNewFilter(prev => ({ ...prev, value: e.target.value }))}
            placeholder="Enter value..."
            className="w-full"
          />
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Main search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 p-1 h-auto"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="relative" ref={filterDropdownRef}>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`${filters.length > 0 ? 'bg-blue-50 border-blue-300' : ''}`}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            {filters.length > 0 && (
              <span className="ml-1 bg-blue-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                {filters.length}
              </span>
            )}
            <ChevronDown className="w-4 h-4 ml-2" />
          </Button>

          {showFilters && (
            <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-96 z-10">
              <h3 className="font-medium text-gray-900 mb-3">Add Filter</h3>
              
              <div className="space-y-3">
                {/* Field selection */}
                <Select value={newFilter.field} onValueChange={(value) => setNewFilter(prev => ({ ...prev, field: value, operator: undefined, value: undefined }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select field..." />
                  </SelectTrigger>
                  <SelectContent>
                    {config.filterableFields.map(field => (
                      <SelectItem key={field.field} value={field.field}>
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Operator selection */}
                {newFilter.field && (
                  <Select value={newFilter.operator} onValueChange={(value) => setNewFilter(prev => ({ ...prev, operator: value as any, value: undefined }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select operator..." />
                    </SelectTrigger>
                    <SelectContent>
                      {getOperatorOptions(config.filterableFields.find(f => f.field === newFilter.field)?.type || 'string').map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {/* Value input */}
                {newFilter.field && newFilter.operator && (
                  <div>
                    {renderFilterValue()}
                  </div>
                )}

                {/* Add filter button */}
                <Button
                  onClick={handleAddFilter}
                  disabled={!newFilter.field || !newFilter.operator || newFilter.value === undefined}
                  className="w-full"
                >
                  Add Filter
                </Button>
              </div>
            </div>
          )}
        </div>

        {showExport && (
          <div className="relative group">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <button
                onClick={() => handleExport('json')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Export as JSON
              </button>
              <button
                onClick={() => handleExport('csv')}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Export as CSV
              </button>
            </div>
          </div>
        )}

        {showReset && isSearchActive && (
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        )}
      </div>

      {/* Active filters */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.map((filter, index) => (
            <div
              key={`${filter.field}-${index}`}
              className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
            >
              <span className="font-medium">{filter.label || filter.field}</span>
              <span className="text-blue-600">{filter.operator}</span>
              <span>{Array.isArray(filter.value) ? filter.value.join(', ') : String(filter.value)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter(filter.field)}
                className="p-0 h-auto text-blue-600 hover:text-blue-800"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-gray-600 hover:text-gray-800 text-sm"
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Results summary */}
      <div className="text-sm text-gray-600">
        {isSearchActive && (
          <span>
            Showing {totalItems} result{totalItems !== 1 ? 's' : ''}
            {searchQuery && ` for "${searchQuery}"`}
            {filters.length > 0 && ` with ${filters.length} filter${filters.length !== 1 ? 's' : ''}`}
          </span>
        )}
      </div>
    </div>
  )
}