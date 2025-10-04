"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { 
  MoreHorizontal,
  BookOpen,
  Home,
  UserX,
  UserCheck,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { Student } from '@/hooks/useStudentData'

interface StudentsTableProps {
  students: Student[]
  selectedStudents: Set<string>
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  statusFilter: 'all' | 'active' | 'inactive'
  showStatusFilter: boolean
  dropdownOpen: string | null
  dropdownButtonRefs: React.MutableRefObject<{ [key: string]: HTMLButtonElement | null }>
  statusFilterRef: React.RefObject<HTMLDivElement | null>
  initialized: boolean
  t: (key: string) => string
  onSort: (field: string) => void
  onSelectAll: (checked: boolean) => void
  onSelectStudent: (studentId: string, checked: boolean) => void
  onStatusFilterChange: (filter: 'all' | 'active' | 'inactive') => void
  onShowStatusFilterChange: (show: boolean) => void
  onDropdownOpenChange: (studentId: string | null) => void
  onViewFamilyClick: (student: Student) => void
  onViewClassroomsClick: (student: Student) => void
  onDeleteClick: (student: Student) => void
  onActivateClick: (student: Student) => void
}

export function StudentsTable({
  students,
  selectedStudents,
  sortField,
  sortDirection,
  statusFilter,
  showStatusFilter,
  dropdownOpen,
  dropdownButtonRefs,
  statusFilterRef,
  initialized,
  t,
  onSort,
  onSelectAll,
  onSelectStudent,
  onStatusFilterChange,
  onShowStatusFilterChange,
  onDropdownOpenChange,
  onViewFamilyClick,
  onViewClassroomsClick,
  onDeleteClick,
  onActivateClick
}: StudentsTableProps) {
  const renderSortIcon = (field: string) => {
    const isActiveField = sortField === field
    const isAscending = isActiveField && sortDirection === 'asc'
    const isDescending = isActiveField && sortDirection === 'desc'
    
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 9l4-4 4 4" 
          stroke={isAscending ? '#2885e8' : 'currentColor'}
          className={isAscending ? '' : 'text-gray-400'}
        />
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 15l4 4 4-4" 
          stroke={isDescending ? '#2885e8' : 'currentColor'}
          className={isDescending ? '' : 'text-gray-400'}
        />
      </svg>
    )
  }

  return (
    <div className="overflow-x-auto min-h-[640px] flex flex-col">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="text-left p-4 font-medium text-gray-900">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  className="rounded border-gray-300 accent-primary"
                  checked={students.length > 0 && selectedStudents.size === students.length}
                  onChange={(e) => onSelectAll(e.target.checked)}
                />
              </div>
            </th>
            <th className="text-left p-4 font-medium text-gray-900">
              <div className="flex items-center gap-2">
                <button onClick={() => onSort('name')} className="flex items-center gap-1 ">
                  {t("students.student")}
                  {renderSortIcon('name')}
                </button>
              </div>
            </th>
            <th className="text-left p-4 font-medium text-gray-900">
              <div className="flex items-center gap-2">
                <button onClick={() => onSort('phone')} className="flex items-center gap-1 ">
                  {t("students.phone")}
                  {renderSortIcon('phone')}
                </button>
              </div>
            </th>
            <th className="text-left p-4 font-medium text-gray-900">
              <div className="flex items-center gap-2">
                <button onClick={() => onSort('school')} className="flex items-center gap-1 ">
                  {t("students.school")}
                  {renderSortIcon('school')}
                </button>
              </div>
            </th>
            <th className="text-left p-4 font-medium text-gray-900">
              <div className="flex items-center gap-2">
                <button onClick={() => onSort('family')} className="flex items-center gap-1 ">
                  {t("students.family")}
                  {renderSortIcon('family')}
                </button>
              </div>
            </th>
            <th className="text-left p-4 font-medium text-gray-900">
              <div className="flex items-center gap-2 relative">
                {t("students.status")}
                <div className="relative z-20" ref={statusFilterRef}>
                  <button
                    onClick={() => onShowStatusFilterChange(!showStatusFilter)}
                    className={`flex items-center ${
                      statusFilter !== 'all' ? 'text-primary' : 'text-gray-400 '
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </button>
                  
                  {showStatusFilter && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[120px] z-50">
                      <button
                        onClick={() => {
                          onStatusFilterChange('all')
                          onShowStatusFilterChange(false)
                        }}
                        className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                      >
                        {t("students.all")}
                      </button>
                      <button
                        onClick={() => {
                          onStatusFilterChange('active')
                          onShowStatusFilterChange(false)
                        }}
                        className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'active' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                      >
                        {t("students.active")}
                      </button>
                      <button
                        onClick={() => {
                          onStatusFilterChange('inactive')
                          onShowStatusFilterChange(false)
                        }}
                        className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${statusFilter === 'inactive' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                      >
                        {t("students.inactive")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </th>
            <th className="text-left p-4 font-medium text-gray-900"></th>
          </tr>
        </thead>
        <tbody>
          {!initialized ? null : students.length > 0 ? students.map((student) => (
            <tr key={student.user_id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="p-4">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 accent-primary"
                  checked={selectedStudents.has(student.user_id)}
                  onChange={(e) => onSelectStudent(student.user_id, e.target.checked)}
                />
              </td>
              <td className="p-4">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium text-gray-900">{student.name}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      {student.email}
                    </div>
                  </div>
                </div>
              </td>
              <td className="p-4">
                {student.phone ? (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    {student.phone}
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">—</span>
                )}
              </td>
              <td className="p-4">
                {student.school_name ? (
                  <div className="flex items-center gap-1 text-sm">
                    <span>{student.school_name}</span>
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">—</span>
                )}
              </td>
              <td className="p-4">
                {student.family_name ? (
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-blue-600">{student.family_name}</span>
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm">—</span>
                )}
              </td>
              <td className="p-4">
                <div className="flex items-center gap-2">
                  {student.active ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-gray-600" />
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    student.active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {student.active ? t('students.active') : t('students.inactive')}
                  </span>
                </div>
              </td>
              <td className="p-4">
                <div className="relative">
                  <Button
                    ref={(el) => { dropdownButtonRefs.current[student.user_id] = el }}
                    variant="ghost"
                    size="sm"
                    onClick={() => onDropdownOpenChange(dropdownOpen === student.user_id ? null : student.user_id)}
                    className="p-1"
                  >
                    <MoreHorizontal className="w-4 h-4 text-gray-500" />
                  </Button>
                  
                  {dropdownOpen === student.user_id && (
                    <div 
                      className="dropdown-menu absolute right-0 top-8 z-50 bg-white rounded-lg border border-gray-300 shadow-xl py-1 min-w-[160px]"
                      style={{ zIndex: 9999 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onViewFamilyClick(student)
                        }}
                      >
                        <Home className="w-4 h-4" />
                        {t("students.viewFamily")}
                      </button>
                      <button
                        className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onViewClassroomsClick(student)
                        }}
                      >
                        <BookOpen className="w-4 h-4" />
                        {t("students.viewClassrooms")}
                      </button>
                      {student.active ? (
                        <button
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-red-600"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onDeleteClick(student)
                          }}
                        >
                          <UserX className="w-4 h-4" />
                          {t("students.makeInactive")}
                        </button>
                      ) : (
                        <button
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-green-600"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onActivateClick(student)
                          }}
                        >
                          <UserCheck className="w-4 h-4" />
                          {t("students.makeActive")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={7} className="p-12 text-center">
                <div className="flex flex-col items-center">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{t("students.noStudentsFound")}</h3>
                  <p className="text-gray-600">
                    {t("students.tryAdjustingSearch")}
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}