"use client"

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Check, User } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { Student } from '@/hooks/useReports'

interface StudentSelectorProps {
  students: Student[]
  selectedStudentId: string
  onStudentSelect: (studentId: string) => void
  loading?: boolean
  error?: string
}

export const StudentSelector = React.memo<StudentSelectorProps>(({
  students,
  selectedStudentId,
  onStudentSelect,
  loading = false,
  error
}) => {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Filter students based on search query
  const filteredStudents = React.useMemo(() => {
    if (!searchQuery) return students
    
    const query = searchQuery.toLowerCase()
    return students.filter(student =>
      student.name.toLowerCase().includes(query) ||
      student.email.toLowerCase().includes(query) ||
      (student.school_name && student.school_name.toLowerCase().includes(query))
    )
  }, [students, searchQuery])

  // Find selected student
  const selectedStudent = React.useMemo(() =>
    students.find(student => student.user_id === selectedStudentId),
    [students, selectedStudentId]
  )

  const handleStudentSelect = React.useCallback((student: Student) => {
    onStudentSelect(student.user_id)
    setIsOpen(false)
    setSearchQuery('')
  }, [onStudentSelect])

  const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
    if (!isOpen) setIsOpen(true)
  }, [isOpen])

  const handleInputFocus = React.useCallback(() => {
    setIsOpen(true)
  }, [])

  const handleInputBlur = React.useCallback((e: React.FocusEvent) => {
    // Delay closing to allow clicking on dropdown items
    setTimeout(() => {
      if (!e.currentTarget.contains(document.activeElement)) {
        setIsOpen(false)
      }
    }, 150)
  }, [])

  return (
    <div className="space-y-2">
      <div className="relative">
        {/* Display selected student or search input */}
        {selectedStudent && !isOpen ? (
          <div 
            className="flex items-center justify-between p-3 border rounded-lg bg-white cursor-pointer hover:border-primary transition-colors"
            onClick={() => setIsOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">
                  {selectedStudent.name}
                </div>
                <div className="text-sm text-gray-500">
                  {selectedStudent.email}
                </div>
                {selectedStudent.school_name && (
                  <div className="text-xs text-gray-400">
                    {selectedStudent.school_name}
                  </div>
                )}
              </div>
            </div>
            <Button variant="ghost" size="sm">
              {t('common.change')}
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            <Input
              placeholder={String(t('reports.searchStudents'))}
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              className="pl-10"
              autoComplete="off"
            />
          </div>
        )}

        {/* Dropdown list */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto" style={{ zIndex: 9999 }}>
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="ml-2">{t('common.loading')}</span>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {searchQuery 
                  ? t('reports.noStudentsFound')
                  : t('reports.noStudentsAvailable')
                }
              </div>
            ) : (
              filteredStudents.map((student) => (
                <button
                  key={student.user_id}
                  onClick={() => handleStudentSelect(student)}
                  className="w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {student.name}
                    </div>
                    <div className="text-sm text-gray-500 truncate">
                      {student.email}
                    </div>
                    {student.school_name && (
                      <div className="text-xs text-gray-400 truncate">
                        {student.school_name}
                      </div>
                    )}
                  </div>
                  {selectedStudentId === student.user_id && (
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
})

StudentSelector.displayName = 'StudentSelector'