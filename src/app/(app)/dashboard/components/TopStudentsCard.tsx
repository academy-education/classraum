"use client"

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { Medal, TrendingUp, TrendingDown, GraduationCap } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { EmptyState } from '@/components/ui/common/EmptyState'
import type { StudentPerformance } from '../hooks/useClassroomPerformance'

// Modal is only mounted when a row is clicked. Defer the 305-line
// bundle (and its supabase + grade-fetching code path) until then.
const StudentAssignmentsModal = dynamic(
  () => import('./StudentAssignmentsModal').then(m => m.StudentAssignmentsModal),
  { ssr: false }
)

interface TopStudentsCardProps {
  title: string
  students: StudentPerformance[]
  type: 'top' | 'bottom'
  loading?: boolean
}

const getMedalColor = (index: number, type: 'top' | 'bottom') => {
  if (type === 'top') {
    switch (index) {
      case 0: return 'text-yellow-500' // Gold
      case 1: return 'text-gray-400'   // Silver
      case 2: return 'text-amber-600'  // Bronze
      default: return 'text-gray-300'
    }
  }
  return 'text-gray-400'
}

export const TopStudentsCard = React.memo<TopStudentsCardProps>(function TopStudentsCard({
  title,
  students,
  type,
  loading = false
}: TopStudentsCardProps) {
  const { t } = useTranslation()
  const [selectedStudent, setSelectedStudent] = useState<StudentPerformance | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleStudentClick = (student: StudentPerformance) => {
    setSelectedStudent(student)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedStudent(null)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] h-full animate-pulse">
        <div className="flex items-center gap-2 px-4 sm:px-6 pt-4 sm:pt-6 pb-3">
          <div className="w-7 h-7 bg-gray-200 rounded-lg"></div>
          <div className="h-3 bg-gray-200 rounded w-28"></div>
        </div>
        <div className="space-y-3 px-4 sm:px-6 pb-4 sm:pb-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="h-5 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const HeaderIcon = type === 'top' ? TrendingUp : TrendingDown

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-700 bg-emerald-50'
    if (score >= 80) return 'text-sky-700 bg-sky-50'
    if (score >= 70) return 'text-amber-700 bg-amber-50'
    return 'text-rose-700 bg-rose-50'
  }

  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)] h-full flex flex-col overflow-hidden">
      {/* Header — eyebrow style to match the four graph cards. */}
      <div className="flex items-center gap-2 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <HeaderIcon className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
        </div>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-gray-500 truncate">{title}</h3>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {students.length > 0 ? (
          <div className="space-y-2 px-4 sm:px-6 pb-4 sm:pb-5">
            {students.map((student, index) => (
              <div
                key={student.id}
                onClick={() => handleStudentClick(student)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 shrink-0">
                  {type === 'top' && index < 3 ? (
                    <Medal className={`w-4 h-4 sm:w-5 sm:h-5 ${getMedalColor(index, type)}`} />
                  ) : (
                    <span className="text-sm font-medium text-gray-400">
                      {index + 1}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{student.name}</p>
                  <p className="text-xs text-gray-500">
                    {student.totalAssignments} {t('dashboard.assignmentsGraded')}
                  </p>
                </div>

                <div className={`px-2.5 py-1 rounded-full text-sm font-semibold ${getScoreColor(student.averageScore)}`}>
                  {student.averageScore}%
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={GraduationCap}
            title={String(t('dashboard.noStudentData'))}
            size="sm"
            variant="subtle"
          />
        )}
      </div>

      {/* Student Assignments Modal */}
      <StudentAssignmentsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        studentId={selectedStudent?.id || null}
        studentName={selectedStudent?.name || ''}
      />
    </div>
  )
})
