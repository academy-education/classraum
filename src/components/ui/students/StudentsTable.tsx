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
  XCircle,
  UserPlus,
} from 'lucide-react'
import { Student } from '@/hooks/useStudentData'
import { cn } from '@/lib/utils'
import { TableCheckbox } from '@/components/ui/dashboard'
import { EmptyState } from '@/components/ui/common/EmptyState'

interface StudentsTableProps {
  students: Student[]
  selectedStudents: Set<string>
  sortField: string | null
  sortDirection: 'asc' | 'desc'
  statusFilter: 'all' | 'active' | 'inactive'
  showStatusFilter: boolean
  searchQuery?: string
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
  searchQuery = '',
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

  const allSelected = students.length > 0 && selectedStudents.size === students.length
  const someSelected = selectedStudents.size > 0 && selectedStudents.size < students.length

  return (
    <div className="overflow-x-auto min-h-[640px] flex flex-col">
      <table className="w-full min-w-[800px]">
        <thead className="bg-gray-50/60">
          <tr>
            <th className="text-left p-3 sm:p-4 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-500 whitespace-nowrap w-10">
              <TableCheckbox
                checked={allSelected}
                indeterminate={someSelected}
                ariaLabel={t('common.selectAll') || 'Select all'}
                onChange={() => onSelectAll(!allSelected)}
              />
            </th>
            <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[150px]">
              <div className="flex items-center gap-2">
                <button onClick={() => onSort('name')} className="flex items-center gap-1 ">
                  {t("students.student")}
                  {renderSortIcon('name')}
                </button>
              </div>
            </th>
            <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[120px]">
              <div className="flex items-center gap-2">
                <button onClick={() => onSort('phone')} className="flex items-center gap-1 ">
                  {t("students.phone")}
                  {renderSortIcon('phone')}
                </button>
              </div>
            </th>
            <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[100px]">
              <div className="flex items-center gap-2">
                <button onClick={() => onSort('school')} className="flex items-center gap-1 ">
                  {t("students.school")}
                  {renderSortIcon('school')}
                </button>
              </div>
            </th>
            <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[100px]">
              <div className="flex items-center gap-2">
                <button onClick={() => onSort('family')} className="flex items-center gap-1 ">
                  {t("students.family")}
                  {renderSortIcon('family')}
                </button>
              </div>
            </th>
            <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap min-w-[100px]">
              <div className="flex items-center gap-2 relative">
                {t("students.status")}
                <div className="relative z-20" ref={statusFilterRef}>
                  <button
                    onClick={() => onShowStatusFilterChange(!showStatusFilter)}
                    className={`flex items-center ${
                      statusFilter !== 'all' ? 'text-primary' : 'text-gray-400 '
                    }`}
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </button>
                  
                  {showStatusFilter && (
                    <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[120px] z-50 normal-case tracking-normal font-normal">
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
            <th className="text-left p-3 sm:p-4 text-[11px] font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {!initialized ? null : students.length > 0 ? students.map((student) => (
            <tr key={student.user_id} className={cn(
              'transition-colors',
              selectedStudents.has(student.user_id) ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-gray-50'
            )}>
              <td className="p-3 sm:p-4">
                <TableCheckbox
                  checked={selectedStudents.has(student.user_id)}
                  ariaLabel={t('common.selectRow') || 'Select row'}
                  onChange={() => onSelectStudent(student.user_id, !selectedStudents.has(student.user_id))}
                  onClick={(e) => e.stopPropagation()}
                />
              </td>
              <td className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {student.name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{student.name}</div>
                    <div className="text-xs text-gray-500 truncate">{student.email}</div>
                  </div>
                </div>
              </td>
              <td className="p-3 sm:p-4">
                {student.phone ? (
                  <div className="flex items-center gap-1 text-xs sm:text-sm text-gray-600">
                    {student.phone}
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs sm:text-sm">—</span>
                )}
              </td>
              <td className="p-3 sm:p-4">
                {student.school_name ? (
                  <div className="flex items-center gap-1 text-xs sm:text-sm">
                    <span>{student.school_name}</span>
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs sm:text-sm">—</span>
                )}
              </td>
              <td className="p-3 sm:p-4">
                {student.family_name ? (
                  <div className="flex items-center gap-1 text-xs sm:text-sm">
                    <span className="text-blue-600">{student.family_name}</span>
                  </div>
                ) : (
                  <span className="text-gray-400 text-xs sm:text-sm">—</span>
                )}
              </td>
              <td className="p-3 sm:p-4">
                <div className="flex items-center gap-1 sm:gap-2">
                  {student.active ? (
                    <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                  )}
                  <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium ${
                    student.active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-50 text-gray-700'
                  }`}>
                    {student.active ? t('students.active') : t('students.inactive')}
                  </span>
                </div>
              </td>
              <td className="p-3 sm:p-4">
                <div className="relative">
                  <Button
                    ref={(el) => { dropdownButtonRefs.current[student.user_id] = el }}
                    variant="ghost"
                    size="sm"
                    onClick={() => onDropdownOpenChange(dropdownOpen === student.user_id ? null : student.user_id)}
                    className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                  >
                    <MoreHorizontal className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
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
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-rose-600"
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
              <td colSpan={7}>
                <EmptyState
                  icon={UserPlus}
                  title={t("students.noStudentsFound")}
                  description={searchQuery ? t('common.tryAdjustingSearch') : t('students.getStartedFirstStudent')}
                />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}