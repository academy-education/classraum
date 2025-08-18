"use client"

import React, { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

// Context for sharing table state
interface DataTableContextType {
  data: any[]
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  selectedRows: string[]
  onSort: (field: string) => void
  onSelectRow: (id: string) => void
  onSelectAll: (selected: boolean) => void
}

const DataTableContext = React.createContext<DataTableContextType | null>(null)

// Hook to use table context
export const useDataTable = () => {
  const context = React.useContext(DataTableContext)
  if (!context) {
    throw new Error('DataTable components must be used within a DataTable')
  }
  return context
}

// Main DataTable component
interface DataTableProps<T = any> {
  data: T[]
  children: React.ReactNode
  onSort?: (field: string, direction: 'asc' | 'desc') => void
  onFilter?: (query: string) => void
  showSearch?: boolean
  searchPlaceholder?: string
  selectable?: boolean
  onSelectionChange?: (selectedIds: string[]) => void
  getRowId?: (row: T) => string
  className?: string
}

export const DataTable = React.memo<DataTableProps>(({
  data,
  children,
  onSort,
  onFilter,
  showSearch = false,
  searchPlaceholder = "Search...",
  selectable = false,
  onSelectionChange,
  getRowId = (row) => row.id,
  className = ""
}) => {
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Handle sorting
  const handleSort = React.useCallback((field: string) => {
    let newDirection: 'asc' | 'desc' = 'asc'
    
    if (sortField === field) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc'
    }
    
    setSortField(field)
    setSortDirection(newDirection)
    onSort?.(field, newDirection)
  }, [sortField, sortDirection, onSort])

  // Handle row selection
  const handleSelectRow = React.useCallback((id: string) => {
    const newSelection = selectedRows.includes(id)
      ? selectedRows.filter(rowId => rowId !== id)
      : [...selectedRows, id]
    
    setSelectedRows(newSelection)
    onSelectionChange?.(newSelection)
  }, [selectedRows, onSelectionChange])

  // Handle select all
  const handleSelectAll = React.useCallback((selected: boolean) => {
    const newSelection = selected ? data.map(getRowId) : []
    setSelectedRows(newSelection)
    onSelectionChange?.(newSelection)
  }, [data, getRowId, onSelectionChange])

  // Handle search
  const handleSearch = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    onFilter?.(query)
  }, [onFilter])

  const contextValue = useMemo(() => ({
    data,
    sortField,
    sortDirection,
    selectedRows,
    onSort: handleSort,
    onSelectRow: handleSelectRow,
    onSelectAll: handleSelectAll
  }), [data, sortField, sortDirection, selectedRows, handleSort, handleSelectRow, handleSelectAll])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={handleSearch}
            className="pl-10"
          />
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full">
          <DataTableContext.Provider value={contextValue}>
            {children}
          </DataTableContext.Provider>
        </table>
      </div>
    </div>
  )
})

// Table Header component
interface DataTableHeaderProps {
  children: React.ReactNode
  className?: string
}

export const DataTableHeader = React.memo<DataTableHeaderProps>(({
  children,
  className = ""
}) => {
  return (
    <thead className={`bg-gray-50 ${className}`}>
      <tr>
        {children}
      </tr>
    </thead>
  )
})

// Table Column Header component
interface DataTableColumnHeaderProps {
  field?: string
  children: React.ReactNode
  sortable?: boolean
  className?: string
  width?: string
}

export const DataTableColumnHeader = React.memo<DataTableColumnHeaderProps>(({
  field,
  children,
  sortable = false,
  className = "",
  width
}) => {
  const { sortField, sortDirection, onSort } = useDataTable()

  const handleSort = React.useCallback(() => {
    if (sortable && field) {
      onSort(field)
    }
  }, [sortable, field, onSort])

  const renderSortIcon = () => {
    if (!sortable || !field || sortField !== field) return null
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />
  }

  return (
    <th 
      className={`p-4 text-left font-medium text-gray-700 ${
        sortable ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''
      } ${className}`}
      onClick={handleSort}
      style={width ? { width } : undefined}
    >
      <div className="flex items-center gap-2">
        {children}
        {renderSortIcon()}
      </div>
    </th>
  )
})

// Checkbox column header for selection
export const DataTableSelectHeader = React.memo(() => {
  const { data, selectedRows, onSelectAll } = useDataTable()
  
  const isAllSelected = selectedRows.length === data.length && data.length > 0
  const isIndeterminate = selectedRows.length > 0 && selectedRows.length < data.length

  const handleSelectAll = React.useCallback(() => {
    onSelectAll(!isAllSelected)
  }, [isAllSelected, onSelectAll])

  return (
    <th className="p-4 w-12">
      <input
        type="checkbox"
        checked={isAllSelected}
        ref={(input) => {
          if (input) input.indeterminate = isIndeterminate
        }}
        onChange={handleSelectAll}
        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
    </th>
  )
})

// Table Body component
interface DataTableBodyProps {
  children: React.ReactNode
  className?: string
}

export const DataTableBody = React.memo<DataTableBodyProps>(({
  children,
  className = ""
}) => {
  return (
    <tbody className={className}>
      {children}
    </tbody>
  )
})

// Table Row component
interface DataTableRowProps {
  id: string
  children: React.ReactNode
  className?: string
  selectable?: boolean
}

export const DataTableRow = React.memo<DataTableRowProps>(({
  id,
  children,
  className = "",
  selectable = false
}) => {
  const { selectedRows, onSelectRow } = useDataTable()
  
  const isSelected = selectedRows.includes(id)

  const handleSelect = React.useCallback(() => {
    onSelectRow(id)
  }, [id, onSelectRow])

  return (
    <tr className={`border-b hover:bg-gray-50 transition-colors ${
      isSelected ? 'bg-blue-50' : ''
    } ${className}`}>
      {selectable && (
        <td className="p-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleSelect}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </td>
      )}
      {children}
    </tr>
  )
})

// Table Cell component
interface DataTableCellProps {
  children: React.ReactNode
  className?: string
}

export const DataTableCell = React.memo<DataTableCellProps>(({
  children,
  className = ""
}) => {
  return (
    <td className={`p-4 ${className}`}>
      {children}
    </td>
  )
})

// Empty state component
interface DataTableEmptyProps {
  children: React.ReactNode
  colSpan: number
  className?: string
}

export const DataTableEmpty = React.memo<DataTableEmptyProps>(({
  children,
  colSpan,
  className = ""
}) => {
  return (
    <tr>
      <td colSpan={colSpan} className={`p-8 text-center text-gray-500 ${className}`}>
        {children}
      </td>
    </tr>
  )
})

// Compound component assignments
DataTable.Header = DataTableHeader
DataTable.ColumnHeader = DataTableColumnHeader
DataTable.SelectHeader = DataTableSelectHeader
DataTable.Body = DataTableBody
DataTable.Row = DataTableRow
DataTable.Cell = DataTableCell
DataTable.Empty = DataTableEmpty

// Export types
export type {
  DataTableProps,
  DataTableHeaderProps,
  DataTableColumnHeaderProps,
  DataTableBodyProps,
  DataTableRowProps,
  DataTableCellProps,
  DataTableEmptyProps
}