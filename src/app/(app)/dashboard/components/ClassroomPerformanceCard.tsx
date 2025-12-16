"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, TrendingDown, UserCheck, UserX, School } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { ClassroomPerformance } from '../hooks/useClassroomPerformance'

interface ClassroomRankingsCardProps {
  highestScore: ClassroomPerformance | null
  lowestScore: ClassroomPerformance | null
  highestAttendance: ClassroomPerformance | null
  lowestAttendance: ClassroomPerformance | null
  loading?: boolean
}

export const ClassroomRankingsCard = React.memo<ClassroomRankingsCardProps>(function ClassroomRankingsCard({
  highestScore,
  lowestScore,
  highestAttendance,
  lowestAttendance,
  loading = false
}: ClassroomRankingsCardProps) {
  const { t } = useTranslation()
  const router = useRouter()

  const handleClassroomClick = (classroomId: string) => {
    router.push(`/sessions?classroomId=${classroomId}`)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full animate-pulse">
        <div className="px-4 sm:px-5 py-3 bg-blue-50 border-b border-gray-100">
          <div className="h-5 bg-blue-200 rounded w-40"></div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <div className="w-7 h-7 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded-full w-14"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const getScoreColor = (value: number, type: 'score' | 'attendance', isHighest: boolean) => {
    if (isHighest) {
      return 'text-green-600 bg-green-50'
    }
    if (value >= 80) return 'text-blue-600 bg-blue-50'
    if (value >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const renderMetric = (
    classroom: ClassroomPerformance | null,
    label: string,
    getValue: (c: ClassroomPerformance) => number,
    type: 'score' | 'attendance',
    isHighest: boolean,
    Icon: React.ElementType
  ) => {
    const iconColor = isHighest ? 'text-green-500' : 'text-gray-400'

    return (
      <div
        onClick={() => classroom && handleClassroomClick(classroom.id)}
        className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors ${classroom ? 'cursor-pointer' : ''}`}
      >
        <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 shrink-0">
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          {classroom ? (
            <>
              <div className="flex items-center gap-2">
                {classroom.color && (
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: classroom.color }}
                  />
                )}
                <p className="font-medium text-gray-900 truncate">{classroom.name}</p>
              </div>
              <p className="text-xs text-gray-500">{label}</p>
            </>
          ) : (
            <>
              <p className="font-medium text-gray-400">{t('dashboard.noDataAvailable')}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </>
          )}
        </div>
        {classroom && (
          <div className={`px-2.5 py-1 rounded-full text-sm font-semibold ${getScoreColor(getValue(classroom), type, isHighest)}`}>
            {getValue(classroom)}%
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 h-full flex flex-col">
      <div className="px-4 sm:px-5 py-3 bg-blue-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <School className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-600">{t('dashboard.classroomPerformance')}</h3>
        </div>
      </div>
      <div className="p-4 sm:p-5 flex-1">
        <div className="space-y-1">
          {renderMetric(
            highestScore,
            String(t('dashboard.highestScoreClassroom')),
            (c) => c.averageScore,
            'score',
            true,
            Trophy
          )}
          {renderMetric(
            highestAttendance,
            String(t('dashboard.highestAttendanceClassroom')),
            (c) => c.attendanceRate,
            'attendance',
            true,
            UserCheck
          )}
          {renderMetric(
            lowestScore,
            String(t('dashboard.lowestScoreClassroom')),
            (c) => c.averageScore,
            'score',
            false,
            TrendingDown
          )}
          {renderMetric(
            lowestAttendance,
            String(t('dashboard.lowestAttendanceClassroom')),
            (c) => c.attendanceRate,
            'attendance',
            false,
            UserX
          )}
        </div>
      </div>
    </div>
  )
})

// Keep the old export name for backwards compatibility but it's not used anymore
export const ClassroomPerformanceCard = ClassroomRankingsCard
