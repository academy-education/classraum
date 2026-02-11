"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/hooks/useTranslation'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  fieldId: string
  placeholder?: string
  activeDatePicker: string | null
  setActiveDatePicker: (id: string | null) => void
}

export const DatePicker = React.memo<DatePickerProps>(({ 
  value, 
  onChange, 
  fieldId,
  placeholder,
  activeDatePicker,
  setActiveDatePicker
}) => {
  const { t, language } = useTranslation()
  const isOpen = activeDatePicker === fieldId
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
        setActiveDatePicker(null)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, setActiveDatePicker])

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return placeholder || t('reports.selectDatePlaceholder')
    
    // Parse date string manually to avoid timezone conversion
    const [year, month, day] = dateString.split('-').map(Number)
    const date = new Date(year, month - 1, day)
    
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    return date.toLocaleDateString(locale, {
      weekday: 'short',
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
    // Format as YYYY-MM-DD in local timezone instead of UTC
    const year = selectedDate.getFullYear()
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const dayStr = String(selectedDate.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${dayStr}`
    onChange(dateString)
    setActiveDatePicker(null)
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
    t('assignments.months.january'), t('assignments.months.february'), t('assignments.months.march'), 
    t('assignments.months.april'), t('assignments.months.may'), t('assignments.months.june'),
    t('assignments.months.july'), t('assignments.months.august'), t('assignments.months.september'), 
    t('assignments.months.october'), t('assignments.months.november'), t('assignments.months.december')
  ]

  const dayNames = [
    t('assignments.days.sun'), t('assignments.days.mon'), t('assignments.days.tue'), 
    t('assignments.days.wed'), t('assignments.days.thu'), t('assignments.days.fri'), t('assignments.days.sat')
  ]

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
        onClick={() => setActiveDatePicker(isOpen ? null : fieldId)}
        className={`w-full h-10 px-3 py-2 text-left text-sm bg-white border rounded-lg focus:outline-none ${
          isOpen ? 'border-primary' : 'border-border focus:border-primary'
        }`}
      >
        {formatDisplayDate(value)}
      </button>
      
      {isOpen && (
        <div className="absolute top-full z-[250] mt-1 bg-white border border-border rounded-lg shadow-lg p-4 w-80 left-0">
          {/* Header with month/year navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigateMonth(-1)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="font-medium text-gray-900">
              {monthNames[viewMonth]} {viewYear}
            </div>
            
            <button
              type="button"
              onClick={() => navigateMonth(1)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day names header */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={String(day)} className="text-xs text-gray-500 text-center py-1 font-medium">
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
                  className={`h-8 w-8 text-sm rounded hover:bg-gray-100 flex items-center justify-center ${
                    isSelected 
                      ? 'bg-blue-50 text-blue-600 font-medium' 
                      : isToday 
                      ? 'bg-gray-100 font-medium' 
                      : ''
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Today button */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                // Format today in local timezone instead of UTC
                const year = today.getFullYear()
                const month = String(today.getMonth() + 1).padStart(2, '0')
                const dayStr = String(today.getDate()).padStart(2, '0')
                const todayString = `${year}-${month}-${dayStr}`
                onChange(todayString)
                setActiveDatePicker(null)
              }}
              className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t("assignments.today")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
})

DatePicker.displayName = 'DatePicker'