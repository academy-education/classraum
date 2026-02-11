"use client"

import { useState, useEffect, useRef } from 'react'
import { useTranslation } from '@/hooks/useTranslation'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  required?: boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  disabled = false,
  placeholder,
  required = false,
  className = ''
}: DatePickerProps) {
  const { t, language } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const datePickerRef = useRef<HTMLDivElement>(null)

  // Parse date string as local date to avoid timezone issues
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date()
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const currentDate = value ? parseLocalDate(value) : new Date()

  // Get current month and year for navigation
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
    if (!dateString) return placeholder || t('sessions.selectDate')
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    const localDate = parseLocalDate(dateString)
    return localDate.toLocaleDateString(locale, {
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
    // Format as YYYY-MM-DD in local timezone
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
    String(t('sessions.months.january')),
    String(t('sessions.months.february')),
    String(t('sessions.months.march')),
    String(t('sessions.months.april')),
    String(t('sessions.months.may')),
    String(t('sessions.months.june')),
    String(t('sessions.months.july')),
    String(t('sessions.months.august')),
    String(t('sessions.months.september')),
    String(t('sessions.months.october')),
    String(t('sessions.months.november')),
    String(t('sessions.months.december'))
  ]

  const dayNames = [
    String(t('sessions.days.sun')),
    String(t('sessions.days.mon')),
    String(t('sessions.days.tue')),
    String(t('sessions.days.wed')),
    String(t('sessions.days.thu')),
    String(t('sessions.days.fri')),
    String(t('sessions.days.sat'))
  ]

  const daysInMonth = getDaysInMonth(viewMonth, viewYear)
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear)
  const selectedDate = value ? parseLocalDate(value) : null
  const today = new Date()

  return (
    <div className={`relative ${className}`} ref={datePickerRef}>
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full h-10 px-3 py-2 text-left text-sm border rounded-lg cursor-pointer shadow-sm flex items-center ${
          disabled
            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
            : isOpen
            ? 'bg-white border-primary focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0'
            : 'bg-white border-border hover:border-primary focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0'
        }`}
      >
        {formatDisplayDate(value)}
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full mt-1 bg-white border border-border rounded-lg shadow-lg p-4 w-80 left-0" style={{ zIndex: 9999 }}>
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

          {/* Day names */}
          <div className="grid grid-cols-7 mb-2">
            {dayNames.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: firstDay }).map((_, index) => (
              <div key={`empty-${index}`} />
            ))}

            {/* Days of the month */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1
              const dateToCheck = new Date(viewYear, viewMonth, day)
              const isSelected =
                selectedDate &&
                selectedDate.getFullYear() === viewYear &&
                selectedDate.getMonth() === viewMonth &&
                selectedDate.getDate() === day
              const isToday =
                today.getFullYear() === viewYear &&
                today.getMonth() === viewMonth &&
                today.getDate() === day

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`
                    aspect-square flex items-center justify-center text-sm rounded-lg transition-colors
                    ${
                      isSelected
                        ? 'bg-primary text-white font-medium'
                        : isToday
                        ? 'bg-blue-50 text-primary font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }
                  `}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
