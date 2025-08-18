"use client"

import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchInput } from './SearchInput'

interface FilterOption {
  value: string
  label: string
}

interface FilterConfig {
  key: string
  placeholder: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
}

interface FilterBarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters: FilterConfig[]
  className?: string
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters,
  className = ''
}: FilterBarProps) {
  return (
    <div className={`flex flex-col lg:flex-row gap-4 ${className}`}>
      <SearchInput
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        onClear={() => onSearchChange('')}
        className="flex-1"
      />
      
      {filters.map((filter) => (
        <Select 
          key={filter.key}
          value={filter.value} 
          onValueChange={filter.onChange}
        >
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder={filter.placeholder} />
          </SelectTrigger>
          <SelectContent>
            {filter.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
    </div>
  )
}