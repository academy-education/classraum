'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * AssignmentsDatePicker — calendar popover used by the assignment create/edit
 * and submission grading modals.
 *
 * Lives outside the AssignmentsPage component to avoid hooks-in-nested-
 * component issues, and outside the giant assignments-page.tsx orchestrator
 * so the extracted modals don't have to reach back into their own parent
 * for a sub-component. Pure presentational — date state and the active-
 * picker registration are owned by the caller.
 *
 * Supports single-date (default) and multi-select modes. Multi-select keeps
 * the popover open after each click so the user can build up a set; the
 * "Done" button explicitly closes it.
 */
export function AssignmentsDatePicker({
  value,
  onChange,
  fieldId,
  multiSelect = false,
  selectedDates = [],
  disabled = false,
  placeholder,
  height = 'h-12',
  shadow = 'shadow-sm',
  activeDatePicker,
  setActiveDatePicker,
  t,
  language
}: {
  value: string
  onChange: (value: string | string[]) => void
  fieldId: string
  multiSelect?: boolean
  selectedDates?: string[]
  disabled?: boolean
  placeholder?: string
  height?: string
  shadow?: string
  activeDatePicker: string | null
  setActiveDatePicker: (id: string | null) => void
  // Match the real signature from LanguageContext so callers can pass
  // their `t` directly. Internally we coerce with String() at JSX render
  // sites — DatePicker only consumes leaf keys (placeholders, button
  // labels, month/day names) so the array branch never fires in practice.
  t: (key: string, params?: Record<string, string | number | undefined>) => string | string[]
  language: string
}) {
  const isOpen = activeDatePicker === fieldId
  const datePickerRef = useRef<HTMLDivElement>(null)
  // Local string-coerced wrapper so JSX renders cleanly. The real `t` may
  // also return string[], but every key DatePicker uses is a leaf string.
  const tStr = (key: string): string => String(t(key))

  // Parse date string as local date to avoid timezone issues
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date()
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const currentDate = value ? parseLocalDate(value) : new Date()
  const today = new Date()

  // Get current month and year for navigation
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
    if (!dateString) return placeholder || tStr('assignments.selectDate')
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
    const selectedDateObj = new Date(viewYear, viewMonth, day)
    // Format as YYYY-MM-DD in local timezone instead of UTC
    const year = selectedDateObj.getFullYear()
    const month = String(selectedDateObj.getMonth() + 1).padStart(2, '0')
    const dayStr = String(selectedDateObj.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${dayStr}`

    if (multiSelect) {
      // Handle multiple date selection
      const currentDates = [...selectedDates]
      const dateIndex = currentDates.indexOf(dateString)

      if (dateIndex > -1) {
        // Date already selected, remove it
        currentDates.splice(dateIndex, 1)
      } else {
        // Add new date
        currentDates.push(dateString)
        currentDates.sort() // Keep dates sorted
      }

      onChange(currentDates)
      // Don't close picker in multi-select mode
    } else {
      // Single date selection
      onChange(dateString)
      setActiveDatePicker(null)
    }
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
    tStr('assignments.months.january'), tStr('assignments.months.february'), tStr('assignments.months.march'),
    tStr('assignments.months.april'), tStr('assignments.months.may'), tStr('assignments.months.june'),
    tStr('assignments.months.july'), tStr('assignments.months.august'), tStr('assignments.months.september'),
    tStr('assignments.months.october'), tStr('assignments.months.november'), tStr('assignments.months.december')
  ]
  const dayNames = [
    tStr('assignments.days.sun'), tStr('assignments.days.mon'), tStr('assignments.days.tue'),
    tStr('assignments.days.wed'), tStr('assignments.days.thu'), tStr('assignments.days.fri'), tStr('assignments.days.sat')
  ]
  const daysInMonth = getDaysInMonth(viewMonth, viewYear)
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear)
  const selectedDate = value ? parseLocalDate(value) : null
  return (
    <div className="relative" ref={datePickerRef}>
      <div
        onClick={() => !disabled && setActiveDatePicker(isOpen ? null : fieldId)}
        className={`w-full ${height} px-3 py-2 text-left text-sm border rounded-lg cursor-pointer ${shadow} flex items-center ${
          disabled
            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
            : isOpen
              ? 'bg-white border-primary'
              : 'bg-white border-border hover:border-primary'
        }`}
      >
        {multiSelect ? (
          selectedDates.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedDates.map((date, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-sky-50 text-sky-700 text-xs rounded-full"
                >
                  {formatDisplayDate(date)}
                  <span
                    onClick={(e) => {
                      e.stopPropagation()
                      const newDates = selectedDates.filter(d => d !== date)
                      onChange(newDates)
                    }}
                    className="text-blue-600 hover:text-blue-800 ml-1 cursor-pointer"
                  >
                    ×
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <span className="text-gray-500">{tStr("assignments.selectDates")}</span>
          )
        ) : (
          formatDisplayDate(value)
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute top-full mt-1 bg-white border border-border rounded-lg shadow-lg p-4 w-80 max-w-[90vw] left-0" style={{ zIndex: 9999 }}>
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
            {dayNames.map((day) => (
              <div key={String(day)} className="text-xs text-gray-500 text-center py-1 font-medium">
                {String(day)}
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
              const currentDateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

              const isSelected = multiSelect
                ? selectedDates.includes(currentDateStr)
                : selectedDate &&
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
                      ? multiSelect
                        ? 'bg-primary text-white font-medium'
                        : 'bg-sky-50 text-sky-700 font-medium'
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
          {/* Footer actions */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            {multiSelect ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange([])
                  }}
                  className="flex-1 text-sm text-gray-600 hover:text-gray-700 font-medium"
                >
                  {tStr("common.selectAll") === "Select All" ? "Clear All" : "전체 해제"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveDatePicker(null)
                  }}
                  className="flex-1 text-sm bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 font-medium"
                >
                  {tStr("common.done")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const year = today.getFullYear()
                  const month = String(today.getMonth() + 1).padStart(2, '0')
                  const day = String(today.getDate()).padStart(2, '0')
                  const todayString = `${year}-${month}-${day}`
                  onChange(todayString)
                  setActiveDatePicker(null)
                }}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {tStr("assignments.today")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
