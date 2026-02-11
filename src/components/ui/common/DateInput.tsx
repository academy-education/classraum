"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Calendar } from 'lucide-react'

interface DateInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  placeholder = 'Select date'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const datePickerRef = useRef<HTMLDivElement>(null)

  const currentDate = value ? (() => {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  })() : new Date()
  const today = new Date()

  const [viewMonth, setViewMonth] = useState(currentDate.getMonth())
  const [viewYear, setViewYear] = useState(currentDate.getFullYear())

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return placeholder

    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  const selectDate = (day: number) => {
    const selectedDate = new Date(viewYear, viewMonth, day)
    const year = selectedDate.getFullYear()
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const dayStr = String(selectedDate.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${dayStr}`
    onChange(dateString)
    setIsOpen(false)
  }

  const navigateMonth = (direction: number) => {
    let newMonth = viewMonth + direction
    let newYear = viewYear

    if (newMonth < 0) {
      newMonth = 11
      newYear -= 1
    } else if (newMonth > 11) {
      newMonth = 0
      newYear += 1
    }

    setViewMonth(newMonth)
    setViewYear(newYear)
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const daysInMonth = getDaysInMonth(viewMonth, viewYear)
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear)
  const selectedDate = value ? (() => {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  })() : null

  return (
    <div className="relative" ref={datePickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none ${
          isOpen ? 'border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50' : 'border-input focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-ring/50'
        }`}
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {formatDisplayDate(value)}
        </span>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 bg-white dark:bg-gray-800 border border-border rounded-lg shadow-lg p-4 w-80 left-0" style={{ zIndex: 9999 }}>
          {/* Header with month/year navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="font-medium text-gray-900 dark:text-gray-100">
              {monthNames[viewMonth]} {viewYear}
            </div>

            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day names header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-xs text-gray-500 dark:text-gray-400 text-center py-1 font-medium">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before the first day of the month */}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} className="h-8"></div>
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const isSelected = selectedDate &&
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === viewMonth &&
                selectedDate.getFullYear() === viewYear
              const isToday = today.getDate() === day &&
                today.getMonth() === viewMonth &&
                today.getFullYear() === viewYear

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`h-8 w-8 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center ${
                    isSelected
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-900 dark:text-blue-300 font-medium'
                      : isToday
                      ? 'bg-gray-100 dark:bg-gray-700 font-medium'
                      : ''
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Today button */}
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => {
                const year = today.getFullYear()
                const month = String(today.getMonth() + 1).padStart(2, '0')
                const dayStr = String(today.getDate()).padStart(2, '0')
                const todayString = `${year}-${month}-${dayStr}`
                onChange(todayString)
                setIsOpen(false)
              }}
              className="w-full text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
