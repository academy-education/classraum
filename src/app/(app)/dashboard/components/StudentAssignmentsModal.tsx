"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import {
  X,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  GraduationCap,
  ClipboardList,
  CheckSquare,
  TrendingUp
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { supabase } from '@/lib/supabase'

interface Assignment {
  id: string
  title: string
  due_date: string | null
  assignment_type: string
  score: number | null
  status: string
  feedback: string | null
  submitted_date: string | null
  classroom_name: string
  classroom_color: string | null
  session_date: string | null
}

interface StudentAssignmentsModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string | null
  studentName: string
}

export function StudentAssignmentsModal({
  isOpen,
  onClose,
  studentId,
  studentName
}: StudentAssignmentsModalProps) {
  const { t } = useTranslation()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAssignments = useCallback(async () => {
    if (!studentId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('assignment_grades')
        .select(`
          id,
          score,
          status,
          feedback,
          submitted_date,
          assignments (
            id,
            title,
            due_date,
            assignment_type,
            classroom_sessions (
              date,
              classrooms (
                name,
                color
              )
            )
          )
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedAssignments: Assignment[] = (data || []).map((grade: any) => ({
        id: grade.id,
        title: grade.assignments?.title || 'Unknown Assignment',
        due_date: grade.assignments?.due_date,
        assignment_type: grade.assignments?.assignment_type || 'assignment',
        score: grade.score,
        status: grade.status || 'pending',
        feedback: grade.feedback,
        submitted_date: grade.submitted_date,
        classroom_name: grade.assignments?.classroom_sessions?.classrooms?.name || 'Unknown',
        classroom_color: grade.assignments?.classroom_sessions?.classrooms?.color,
        session_date: grade.assignments?.classroom_sessions?.date
      }))

      setAssignments(formattedAssignments)
    } catch (error) {
      console.error('Error fetching student assignments:', error)
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    if (isOpen && studentId) {
      fetchAssignments()
    }
  }, [isOpen, studentId, fetchAssignments])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'graded':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'submitted':
        return <Clock className="w-4 h-4 text-blue-500" />
      case 'late':
        return <AlertCircle className="w-4 h-4 text-amber-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'graded':
        return t('assignments.graded')
      case 'submitted':
        return t('assignments.submitted')
      case 'late':
        return t('assignments.late')
      default:
        return t('assignments.pending')
    }
  }

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400 bg-gray-50'
    if (score >= 90) return 'text-green-600 bg-green-50'
    if (score >= 80) return 'text-blue-600 bg-blue-50'
    if (score >= 70) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  // Calculate average score
  const gradedAssignments = assignments.filter(a => a.score !== null)
  const averageScore = gradedAssignments.length > 0
    ? Math.round(gradedAssignments.reduce((sum, a) => sum + (a.score || 0), 0) / gradedAssignments.length * 10) / 10
    : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{studentName}</h2>
              <p className="text-sm text-gray-500">{t('dashboard.allAssignments')}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats Summary */}
        {!loading && assignments.length > 0 && (
          <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-b border-gray-200 space-y-3">
            {/* Top Row: Total and Graded */}
            <div className="flex items-center gap-3">
              {/* Total Assignments */}
              <div className="flex items-center gap-3 px-4 py-3 bg-slate-100 rounded-lg flex-1">
                <div className="w-9 h-9 bg-slate-200 rounded-lg flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">{t('dashboard.totalAssignments')}</p>
                  <p className="text-xl font-bold text-slate-700">{assignments.length}</p>
                </div>
              </div>
              {/* Graded Assignments */}
              <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 rounded-lg flex-1">
                <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <CheckSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-medium">{t('dashboard.gradedAssignments')}</p>
                  <p className="text-xl font-bold text-emerald-700">{gradedAssignments.length}</p>
                </div>
              </div>
            </div>
            {/* Bottom Row: Average Score */}
            {averageScore !== null && (
              <div className="flex justify-center">
                <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${getScoreColor(averageScore)}`}>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    averageScore >= 90 ? 'bg-green-100' :
                    averageScore >= 80 ? 'bg-blue-100' :
                    averageScore >= 70 ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <TrendingUp className={`w-5 h-5 ${
                      averageScore >= 90 ? 'text-green-600' :
                      averageScore >= 80 ? 'text-blue-600' :
                      averageScore >= 70 ? 'text-yellow-600' : 'text-red-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{t('dashboard.averageScore')}</p>
                    <p className="text-xl font-bold">{averageScore}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4 border border-gray-100 rounded-lg">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : assignments.length > 0 ? (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: assignment.classroom_color ? `${assignment.classroom_color}20` : '#E5E7EB' }}
                  >
                    <FileText
                      className="w-5 h-5"
                      style={{ color: assignment.classroom_color || '#6B7280' }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-gray-900 truncate">{assignment.title}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        {getStatusIcon(assignment.status)}
                        <span>{getStatusText(assignment.status)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: assignment.classroom_color || '#6B7280' }}
                        />
                        {assignment.classroom_name}
                      </span>
                      {assignment.session_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(assignment.session_date)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getScoreColor(assignment.score)}`}>
                    {assignment.score !== null ? `${assignment.score}%` : '-'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <FileText className="w-12 h-12 mb-3" />
              <p className="text-base font-medium">{t('dashboard.noAssignmentsFound')}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex items-center justify-end p-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
