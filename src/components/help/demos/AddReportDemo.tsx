"use client"

import { useMemo, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/ui/date-picker'
import { TableCheckbox } from '@/components/ui/dashboard'
import { SubjectAndClassroomSelector } from '@/components/ui/reports/SubjectAndClassroomSelector'
import { Eye } from 'lucide-react'
import { getReportStudents } from './sample-data'
import { NonFunctional } from './NonFunctional'

/**
 * Faithful preview of the Add Report modal — mirrors the inline modal
 * in components/ui/reports-page.tsx around line 2992 (NOT the
 * AddReportModal component, which is a separate, older shape with
 * fewer fields).
 *
 * Sections: Student selector, Report Title, Date Range, Subject +
 * Category + Classroom (uses the real SubjectAndClassroomSelector
 * component so the dropdowns + sample subjects line up), Display
 * Options checkboxes. Footer: 리포트 미리보기 on the left, Cancel +
 * 리포트 만들기 + 생성 및 완료 on the right.
 */

interface SampleSubject {
  id: string
  name: string
}

interface SampleCategory {
  id: string
  name: string
  subject_id: string | null
}

interface SampleClassroom {
  id: string
  name: string
  subject: string | null
  grade: string | null
  subject_id: string | null
  teacher?: { name: string }
}

export function AddReportDemo() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const students = useMemo(() => getReportStudents(language), [language])

  const subjects: SampleSubject[] = useMemo(() => ko
    ? [{ id: 'sub1', name: '수학' }, { id: 'sub2', name: '영어' }, { id: 'sub3', name: '과학' }]
    : [{ id: 'sub1', name: 'Mathematics' }, { id: 'sub2', name: 'English' }, { id: 'sub3', name: 'Science' }]
  , [ko])

  const categories: SampleCategory[] = useMemo(() => ko
    ? [
        { id: 'cat1', name: '연습', subject_id: 'sub1' },
        { id: 'cat2', name: '시험', subject_id: 'sub1' },
        { id: 'cat3', name: '독해', subject_id: 'sub2' },
      ]
    : [
        { id: 'cat1', name: 'Practice', subject_id: 'sub1' },
        { id: 'cat2', name: 'Test', subject_id: 'sub1' },
        { id: 'cat3', name: 'Reading', subject_id: 'sub2' },
      ]
  , [ko])

  const classrooms: SampleClassroom[] = useMemo(() => ko
    ? [
        { id: 'c1', name: '4학년 수학', subject: '수학', grade: '4학년', subject_id: 'sub1' },
        { id: 'c2', name: '5학년 영어', subject: '영어', grade: '5학년', subject_id: 'sub2' },
      ]
    : [
        { id: 'c1', name: 'Grade 4 Math', subject: 'Mathematics', grade: 'Grade 4', subject_id: 'sub1' },
        { id: 'c2', name: 'Grade 5 English', subject: 'English', grade: 'Grade 5', subject_id: 'sub2' },
      ]
  , [ko])

  const [studentId, setStudentId] = useState<string>(students[0]?.user_id || '')
  const [reportName, setReportName] = useState(ko ? '2026년 2월 진척 리포트' : 'February 2026 progress report')
  const [startDate, setStartDate] = useState('2026-02-01')
  const [endDate, setEndDate] = useState('2026-02-28')
  const [selectedSubject, setSelectedSubject] = useState('sub1')
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['cat1'])
  const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>(['c1'])
  const [showCategoryAverage, setShowCategoryAverage] = useState(true)
  const [showIndividualGrades, setShowIndividualGrades] = useState(false)
  const [showPercentileRanking, setShowPercentileRanking] = useState(true)
  const [studentSearch, setStudentSearch] = useState('')

  return (
    <NonFunctional>
      <ModalShell
        isOpen
        inline
        onClose={() => undefined}
        size="2xl"
        title={String(t('reports.createNewReport'))}
        subtitle={String(t('reports.generateComprehensiveReport'))}
        footer={
          <ModalShell.Footer justify="between">
            <Button variant="outline" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              {t('reports.previewReport')}
            </Button>
            <div className="flex items-center gap-3">
              <Button variant="outline">{t('common.cancel')}</Button>
              <Button className="bg-primary text-white flex items-center gap-2">
                {t('reports.createReport')}
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2">
                {t('reports.createAndFinish')}
              </Button>
            </div>
          </ModalShell.Footer>
        }
      >
        <div className="space-y-6">
          {/* Student Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {t('reports.student')} <span className="text-rose-500">*</span>
            </label>
            <div className="border border-border rounded-lg bg-gray-50 p-4">
              <div className="relative mb-3">
                <Input
                  readOnly
                  type="text"
                  placeholder={String(t('reports.searchStudentsPlaceholder'))}
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="h-9 pl-3 rounded-lg border border-border bg-white text-sm"
                />
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {students.map(s => (
                  <div
                    key={s.user_id}
                    className="flex items-center gap-3 p-2 hover:bg-white/50 rounded-md transition-colors"
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input
                        type="radio"
                        name="demo_selected_student"
                        checked={studentId === s.user_id}
                        onChange={() => setStudentId(s.user_id)}
                        readOnly
                        className="text-primary"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{s.name}</span>
                          {s.school_name && (
                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                              {s.school_name}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{s.email}</div>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              {studentId && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-600">
                    {t('reports.selected')} {students.find(s => s.user_id === studentId)?.name}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Report Title */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              {t('reports.reportTitle')} <span className="text-rose-500">*</span>
            </label>
            <Input
              readOnly
              type="text"
              value={reportName}
              onChange={e => setReportName(e.target.value)}
              placeholder={String(t('reports.enterReportTitlePlaceholder'))}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                {t('reports.startDate')} <span className="text-rose-500">*</span>
              </label>
              <DatePicker value={startDate} onChange={setStartDate} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                {t('reports.endDate')} <span className="text-rose-500">*</span>
              </label>
              <DatePicker value={endDate} onChange={setEndDate} />
            </div>
          </div>

          {/* Subject, Category and Classroom — uses the live component */}
          <div>
            <SubjectAndClassroomSelector
              subjects={subjects}
              assignmentCategories={categories}
              classrooms={classrooms}
              selectedSubject={selectedSubject}
              selectedCategories={selectedCategories}
              selectedClassrooms={selectedClassrooms}
              onSubjectChange={setSelectedSubject}
              onCategoriesChange={setSelectedCategories}
              onClassroomsChange={setSelectedClassrooms}
            />
          </div>

          {/* Display Options */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-900">
              {t('reports.displayOptions')}
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <TableCheckbox
                  checked={showCategoryAverage}
                  ariaLabel={String(t('reports.showCategoryAverage'))}
                  onChange={() => setShowCategoryAverage(!showCategoryAverage)}
                />
                <span className="text-sm text-gray-700">{t('reports.showCategoryAverage')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <TableCheckbox
                  checked={showIndividualGrades}
                  ariaLabel={String(t('reports.showIndividualGrades'))}
                  onChange={() => setShowIndividualGrades(!showIndividualGrades)}
                />
                <span className="text-sm text-gray-700">{t('reports.showIndividualGrades')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <TableCheckbox
                  checked={showPercentileRanking}
                  ariaLabel={String(t('reports.showPercentileRanking'))}
                  onChange={() => setShowPercentileRanking(!showPercentileRanking)}
                />
                <span className="text-sm text-gray-700">{t('reports.showPercentileRanking')}</span>
              </label>
            </div>
          </div>
        </div>
      </ModalShell>
    </NonFunctional>
  )
}
