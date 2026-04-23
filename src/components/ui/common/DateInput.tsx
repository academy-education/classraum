"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Calendar } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'

interface DateInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  placeholder,
}) => {
  const { t } = useTranslation()
  const { language } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const datePickerRef = useRef<HTMLDivElement>(null)

  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const currentDate = value ? parseLocalDate(value) : new Date()
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

  const resolvedPlaceholder = placeholder ?? String(t('common.datePicker.selectDate'))

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return resolvedPlaceholder

    const date = parseLocalDate(dateString)
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'

    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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
    String(t('common.datePicker.months.january')),
    String(t('common.datePicker.months.february')),
    String(t('common.datePicker.months.march')),
    String(t('common.datePicker.months.april')),
    String(t('common.datePicker.months.may')),
    String(t('common.datePicker.months.june')),
    String(t('common.datePicker.months.july')),
    String(t('common.datePicker.months.august')),
    String(t('common.datePicker.months.september')),
    String(t('common.datePicker.months.october')),
    String(t('common.datePicker.months.november')),
    String(t('common.datePicker.months.december')),
  ]

  const dayNames = [
    String(t('common.datePicker.days.sun')),
    String(t('common.datePicker.days.mon')),
    String(t('common.datePicker.days.tue')),
    String(t('common.datePicker.days.wed')),
    String(t('common.datePicker.days.thu')),
    String(t('common.datePicker.days.fri')),
    String(t('common.datePicker.days.sat')),
  ]

  const daysInMonth = getDaysInMonth(viewMonth, viewYear)
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear)
  const selectedDate = value ? parseLocalDate(value) : null

  // In Korean, format header as "2025년 11월" instead of "November 2025"
  const headerLabel = language === 'korean'
    ? `${viewYear}년 ${monthNames[viewMonth]}`
    : `${monthNames[viewMonth]} ${viewYear}`

  return (
    <div className="relative" ref={datePickerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-10 w-full items-center justify-between rounded-lg border bg-transparent px-3 py-2 text-sm outline-none ${
          isOpen ? 'border-primary' : 'border-border focus:border-primary'
        }`}
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {formatDisplayDate(value)}
        </span>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </button>

      {isOpen && (
        <div
          className="absolute top-full mt-1 bg-white dark:bg-gray-800 border border-border rounded-lg shadow-lg p-4 w-80 left-0"
          style={{ zIndex: 9999 }}
        >
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
              {headerLabel}
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
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} className="h-8"></div>
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const isSelected =
                selectedDate &&
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === viewMonth &&
                selectedDate.getFullYear() === viewYear
              const isToday =
                today.getDate() === day &&
                today.getMonth() === viewMonth &&
                today.getFullYear() === viewYear

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDate(day)}
                  className={`h-8 w-8 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-medium'
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
              className="w-full text-sm text-primary hover:text-primary/80 font-medium"
            >
              {String(t('common.datePicker.today'))}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
