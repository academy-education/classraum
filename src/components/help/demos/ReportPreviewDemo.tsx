"use client"

import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { Button } from '@/components/ui/button'
import { Bot, Filter, Sparkles, Edit } from 'lucide-react'
import { getReportStudents } from './sample-data'
import { NonFunctional } from './NonFunctional'

/**
 * Live preview of the report-card Preview modal — mirrors
 * reports-page.tsx:3686+ (ModalShell title=previewReport, gradient
 * header, scope chips, AI feedback card). Embedded with AI feedback
 * already generated so users see what the published report looks like
 * before they decide to hit "만들기 및 완료".
 */
export function ReportPreviewDemo() {
  const { t, language } = useTranslation()
  const ko = language === 'korean'
  const students = useMemo(() => getReportStudents(language), [language])
  const student = students[0]

  const reportName = ko ? '2026년 5월 진척 리포트' : 'May 2026 progress report'
  const period = ko ? '2026년 5월 1일 – 2026년 5월 31일' : 'May 1, 2026 – May 31, 2026'

  const subjects = ko ? ['수학'] : ['Mathematics']
  const categories = ko ? ['연습', '시험'] : ['Practice', 'Test']
  const classrooms = ko ? ['4학년 수학'] : ['Grade 4 Math']

  const aiFeedback = ko
    ? `${student.name} 학생은 5월 한 달 동안 분수 단원에서 꾸준한 향상을 보였습니다. 평균 점수가 78점에서 89점으로 상승했고, 특히 응용 문제 영역에서 두드러진 발전이 있었습니다. 다음 달에는 소수 변환 연습에 집중하면 더 안정적인 성과를 기대할 수 있습니다.`
    : `${student.name} showed steady improvement in fractions throughout May. Average scores rose from 78 to 89, with the biggest gains on word problems. For June, focusing on decimal conversion will help solidify these gains.`

  return (
    <NonFunctional>
      <ModalShell
        isOpen
        inline
        onClose={() => undefined}
        size="5xl"
        title={String(t('reports.previewReport'))}
        footer={
          <ModalShell.Footer>
            <Button variant="outline">{t('reports.closePreview')}</Button>
          </ModalShell.Footer>
        }
      >
        <div className="space-y-6">
          {/* Title */}
          <div className="text-center py-4 border-b border-gray-100">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{reportName}</h1>
            <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mx-auto"></div>
          </div>

          {/* Student header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-xl">
                {student.name.charAt(0)}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                <p className="text-sm text-gray-600">{student.email}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('reports.reportPeriod')} {period}</p>
              </div>
            </div>
          </div>

          {/* Scope */}
          <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              {t('reports.reportScope')}
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h5 className="text-xs font-medium text-gray-600 mb-1.5">{t('reports.subjects')}</h5>
                <div className="flex flex-wrap gap-1">
                  {subjects.map(s => (
                    <span key={s} className="text-xs bg-sky-50 text-sky-700 px-2 py-0.5 rounded-full font-medium">{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <h5 className="text-xs font-medium text-gray-600 mb-1.5">{t('reports.categories')}</h5>
                <div className="flex flex-wrap gap-1">
                  {categories.map(c => (
                    <span key={c} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{c}</span>
                  ))}
                </div>
              </div>
              <div>
                <h5 className="text-xs font-medium text-gray-600 mb-1.5">{t('reports.classrooms')}</h5>
                <div className="flex flex-wrap gap-1">
                  {classrooms.map(c => (
                    <span key={c} className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-medium">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI Feedback */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-gray-600" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{t('reports.aiFeedback')}</div>
                  <div className="text-xs text-gray-500">{t('reports.aiInsightsGenerated')}</div>
                </div>
              </div>
              <Button size="sm" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {t('reports.regenerateAi')}
              </Button>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-blue-600" />
                  <h5 className="font-semibold text-sky-900 text-sm">{t('reports.aiGeneratedFeedback')}</h5>
                </div>
                <Button size="sm" variant="outline" className="text-xs">
                  <Edit className="w-3.5 h-3.5 mr-1" />
                  {t('common.edit')}
                </Button>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{aiFeedback}</p>
            </div>
          </div>
        </div>
      </ModalShell>
    </NonFunctional>
  )
}
