"use client"

import React, { useState } from 'react'
import { Medal, TrendingUp, TrendingDown, GraduationCap } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { StudentPerformance } from '../hooks/useClassroomPerformance'
import { StudentAssignmentsModal } from './StudentAssignmentsModal'

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
      <div className="bg-white rounded-lg p-4 sm:p-5 shadow-sm border border-gray-100 h-full">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-200 rounded-full animate-pulse"></div>
          <div className="h-5 bg-gray-200 rounded w-40 animate-pulse"></div>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
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

  const getHeaderColor = () => {
    return type === 'top' ? 'text-green-600' : 'text-red-600'
  }

  const getHeaderBg = () => {
    return type === 'top' ? 'bg-green-50' : 'bg-red-50'
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50'
    if (score >= 80) return 'text-blue-600 bg-blue-50'
    if (score >= 70) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full flex flex-col overflow-hidden">
      <div className={`px-4 sm:px-5 py-3 ${getHeaderBg()} border-b border-gray-100 flex-shrink-0`}>
        <div className="flex items-center gap-2">
          {type === 'top' ? (
            <TrendingUp className={`w-4 h-4 sm:w-5 sm:h-5 ${getHeaderColor()}`} />
          ) : (
            <TrendingDown className={`w-4 h-4 sm:w-5 sm:h-5 ${getHeaderColor()}`} />
          )}
          <h3 className={`font-semibold ${getHeaderColor()}`}>{title}</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {students.length > 0 ? (
          <div className="space-y-2 p-4 sm:p-5">
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
          <div className="flex flex-col items-center justify-center py-8 px-4 sm:px-5 text-gray-400">
            <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 mb-2" />
            <span className="text-sm">{t('dashboard.noStudentData')}</span>
          </div>
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
