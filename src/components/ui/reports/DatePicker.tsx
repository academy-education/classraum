"use client"

import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
  
  const currentDate = value ? new Date(value) : new Date()
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

  const formatDisplayDate = React.useCallback((dateString: string) => {
    if (!dateString) return placeholder || t('reports.selectDatePlaceholder')
    
    const date = new Date(dateString)
    
    if (language === 'korean') {
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const day = date.getDate()
      const weekday = date.getDay()
      const weekdayNames = ['일', '월', '화', '수', '목', '금', '토']
      
      return `${year}년 ${month}월 ${day}일 (${weekdayNames[weekday]})`
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  }, [language, placeholder, t])

  const getDaysInMonth = React.useCallback((month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }, [])

  const getFirstDayOfMonth = React.useCallback((month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }, [])

  const monthNames = React.useMemo(() => 
    language === 'korean' ? [
      '1월', '2월', '3월', '4월', '5월', '6월',
      '7월', '8월', '9월', '10월', '11월', '12월'
    ] : [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ], [language]
  )
  
  const dayHeaders = React.useMemo(() => 
    language === 'korean' ? 
      ['일', '월', '화', '수', '목', '금', '토'] : 
      ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'], [language]
  )

  const handleDateSelect = React.useCallback((day: number) => {
    const selectedDate = new Date(viewYear, viewMonth, day)
    const formattedDate = selectedDate.toISOString().split('T')[0]
    onChange(formattedDate)
    setActiveDatePicker(null)
  }, [viewYear, viewMonth, onChange, setActiveDatePicker])

  const navigateMonth = React.useCallback((direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (viewMonth === 0) {
        setViewMonth(11)
        setViewYear(viewYear - 1)
      } else {
        setViewMonth(viewMonth - 1)
      }
    } else {
      if (viewMonth === 11) {
        setViewMonth(0)
        setViewYear(viewYear + 1)
      } else {
        setViewMonth(viewMonth + 1)
      }
    }
  }, [viewMonth, viewYear])

  const handleTodayClick = React.useCallback(() => {
    const today = new Date()
    const formattedDate = today.toISOString().split('T')[0]
    onChange(formattedDate)
    setActiveDatePicker(null)
  }, [onChange, setActiveDatePicker])

  return (
    <div className="relative" ref={datePickerRef}>
      <div 
        className="flex items-center justify-between h-10 px-3 py-2 border border-border rounded-lg bg-white cursor-pointer hover:border-primary focus:border-primary transition-colors"
        onClick={() => setActiveDatePicker(isOpen ? null : fieldId)}
      >
        <span className={`text-sm ${value ? 'text-gray-900' : 'text-gray-500'}`}>
          {formatDisplayDate(value)}
        </span>
      </div>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-border rounded-lg shadow-lg p-4 z-50 min-w-[280px]">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <h3 className="font-medium text-sm">
              {monthNames[viewMonth]} {viewYear}
            </h3>
            <button
              onClick={() => navigateMonth('next')}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {dayHeaders.map(day => (
              <div key={day} className="p-2 font-medium text-gray-500">
                {day}
              </div>
            ))}
            
            {Array.from({ length: getFirstDayOfMonth(viewMonth, viewYear) }).map((_, index) => (
              <div key={`empty-${index}`} className="p-2" />
            ))}
            
            {Array.from({ length: getDaysInMonth(viewMonth, viewYear) }).map((_, index) => {
              const day = index + 1
              const isSelected = value && new Date(value).getDate() === day && 
                               new Date(value).getMonth() === viewMonth && 
                               new Date(value).getFullYear() === viewYear
              const isToday = today.getDate() === day && 
                            today.getMonth() === viewMonth && 
                            today.getFullYear() === viewYear
              
              return (
                <button
                  key={day}
                  onClick={() => handleDateSelect(day)}
                  className={`p-2 text-sm rounded hover:bg-gray-100 transition-colors ${
                    isSelected 
                      ? 'bg-primary text-white hover:bg-primary/90' 
                      : isToday 
                        ? 'bg-blue-50 text-primary font-medium' 
                        : ''
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <button
              onClick={handleTodayClick}
              className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t("dashboard.today")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
})