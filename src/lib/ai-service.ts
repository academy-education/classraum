import OpenAI from 'openai'
import { getCachedFeedback, setCachedFeedback } from './ai-cache'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

// Initialize OpenAI client
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Types for individual grades
export interface IndividualGrade {
  id: string
  title: string
  type: string
  subject: string
  classroom: string
  categoryId: string
  score: number | null
  status: string
  dueDate: string
  completedDate: string
  feedback: string | null
}

// Types for the feedback generation
export interface StudentPerformanceData {
  student: {
    name: string
    grade?: string
    school?: string
  }
  period: {
    startDate: string
    endDate: string
  }
  metrics: {
    overall: {
      gradeAverage: number
      totalAssignments: number
      completedAssignments: number
      completionRate: number
    }
    attendance: {
      present: number
      total: number
      rate: number
    }
    byType: {
      quiz: AssignmentTypeMetrics
      homework: AssignmentTypeMetrics
      test: AssignmentTypeMetrics
      project: AssignmentTypeMetrics
    }
    byCategory?: Record<string, CategoryMetrics>
    classroomPercentiles?: Record<string, ClassroomPercentile>
  }
  selectedFilters: {
    classrooms: string[]
    categories: string[]
  }
  // Enhanced context data
  subjects?: Array<{ id: string; name: string }>
  classrooms?: Array<{ id: string; name: string; subject: string }>
  categories?: Array<{ id: string; name: string }>
  dataContext?: {
    hasGradeData: boolean
    hasAssignmentData: boolean
    hasAttendanceData: boolean
    selectedSubjectCount: number
    selectedClassroomCount: number
    selectedCategoryCount: number
  }
  // Individual grades for detailed analysis
  individualGrades?: IndividualGrade[]
}

interface AssignmentTypeMetrics {
  total: number
  completed: number
  completionRate: number
  averageGrade: number
  statuses: {
    submitted: number
    pending: number
    overdue: number
    notSubmitted: number
    excused: number
  }
}

interface CategoryMetrics {
  name: string
  total: number
  completed: number
  completionRate: number
  averageGrade: number
}

interface ClassroomPercentile {
  name: string
  subject: string
  percentile: number
  average: number
}

// Template types
export type FeedbackTemplate = 'comprehensive' | 'focused' | 'encouraging'
export type FeedbackLanguage = 'english' | 'korean'

// Prompt templates for each style
export const PROMPT_TEMPLATES = {
  comprehensive: {
    english: `Analyze student performance and provide comprehensive feedback.

Student: {studentName} | Period: {startDate} to {endDate}
Grade Average: {gradeAverage}% | Completion: {completionRate}% | Attendance: {attendanceRate}%

Report Scope:
{subjects}
{classrooms}
{dataContext}

Performance Breakdown:
{typeBreakdown}

{categoryBreakdown}

{classroomPercentiles}

Individual Assignment Analysis:
{individualGrades}

Provide detailed feedback covering:
1. Key strengths and achievements
2. Areas for improvement with specific context to the subjects and assignment types
3. Specific recommendations based on the data gaps (distinguish between "no assignments given" vs poor performance)
4. Study strategies tailored to the selected subjects and classroom performance

IMPORTANT: When you see "No assignments given during this period", do NOT treat this as poor performance. Focus on available data only.

Keep it professional, encouraging, and actionable (300-400 words).

FORMAT: Return the feedback as HTML using only these tags: <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>. Use <strong> for emphasis, <ul>/<li> for bullet points, <ol>/<li> for numbered lists. Structure your response with clear paragraphs using <p> tags.`,

    korean: `학생 성과를 분석하고 종합적인 피드백을 제공하세요.

학생: {studentName} | 기간: {startDate} ~ {endDate}
평균 점수: {gradeAverage}% | 완료율: {completionRate}% | 출석률: {attendanceRate}%

보고서 범위:
{subjects}
{classrooms}
{dataContext}

성과 분석:
{typeBreakdown}

{categoryBreakdown}

{classroomPercentiles}

개별 과제 분석:
{individualGrades}

다음을 포함한 상세한 피드백을 작성하세요:
1. 주요 강점과 성취
2. 과목과 과제 유형에 특화된 개선 영역
3. 데이터 격차에 기반한 구체적인 권장사항 ("과제 없음" vs 부족한 성과 구분)
4. 선택된 과목과 교실 성과에 맞춘 학습 전략

중요: "이 기간 동안 과제 없음"을 보면 이를 부족한 성과로 취급하지 마세요. 사용 가능한 데이터에만 초점을 맞춰주세요.

전문적이고 격려하며 실행 가능한 내용으로 작성하세요 (300-400 단어).

형식: 다음 HTML 태그만 사용하여 피드백을 반환하세요: <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>. 강조는 <strong>, 불릿 포인트는 <ul>/<li>, 번호 목록은 <ol>/<li>를 사용하세요. <p> 태그로 명확한 단락 구조를 만드세요.`
  },

  focused: {
    english: `Provide focused insights for {studentName}.

Metrics: {gradeAverage}% average | {completionRate}% completion | {attendanceRate}% attendance

Scope: {subjects} | {classrooms}
Context: {dataContext}

Performance: {typeBreakdown}

Key Assignments: {individualGrades}

Give concise feedback (200-250 words):
1. Top 3 strengths based on available data
2. Top 3 improvement areas (distinguish between "no data available" vs actual poor performance)
3. 5 actionable next steps specific to subjects and classrooms

IMPORTANT: When you see "No assignments given during this period", do NOT treat this as poor performance. Focus feedback on available data only.

Be direct and practical.

FORMAT: Return the feedback as HTML using only these tags: <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>. Use <strong> for emphasis, <ul>/<li> for bullet points, <ol>/<li> for numbered lists. Structure your response with clear paragraphs using <p> tags.`,

    korean: `{studentName} 학생을 위한 핵심 분석을 제공하세요.

지표: 평균 {gradeAverage}% | 완료율 {completionRate}% | 출석률 {attendanceRate}%

범위: {subjects} | {classrooms}
상황: {dataContext}

성과: {typeBreakdown}

주요 과제: {individualGrades}

간결한 피드백 (200-250 단어):
1. 사용 가능한 데이터 기반 상위 3가지 강점
2. 상위 3가지 개선 영역 ("데이터 없음" vs 실제 부족한 성과 구분)
3. 과목과 교실에 특화된 5가지 실행 가능한 다음 단계

중요: "이 기간 동안 과제 없음"을 보면 이를 부족한 성과로 취급하지 마세요. 사용 가능한 데이터에만 초점을 맞춰주세요.

직접적이고 실용적으로 작성하세요.

형식: 다음 HTML 태그만 사용하여 피드백을 반환하세요: <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>. 강조는 <strong>, 불릿 포인트는 <ul>/<li>, 번호 목록은 <ol>/<li>를 사용하세요. <p> 태그로 명확한 단락 구조를 만드세요.`
  },

  encouraging: {
    english: `Write encouraging feedback for {studentName}.

Performance: {gradeAverage}% average | {completionRate}% completion | {attendanceRate}% attendance

Learning Context: {subjects} | {classrooms}
Data Context: {dataContext}

Progress Indicators: {typeBreakdown}

Your Journey Through Assignments: {individualGrades}

Create motivational feedback (250-300 words):
1. Celebrate achievements and progress in specific subjects
2. Highlight growth areas with positive framing
3. Provide supportive suggestions addressing data gaps (distinguish between "no assignments given" vs areas needing improvement)
4. Emphasize potential across selected subjects and classrooms

IMPORTANT: When you see "No assignments given during this period", do NOT treat this as an area needing improvement. Focus on encouraging progress in available data.

Use a warm, encouraging tone focused on building confidence.

FORMAT: Return the feedback as HTML using only these tags: <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>. Use <strong> for emphasis, <ul>/<li> for bullet points, <ol>/<li> for numbered lists. Structure your response with clear paragraphs using <p> tags.`,

    korean: `{studentName} 학생을 위한 격려 피드백을 작성하세요.

성과: 평균 {gradeAverage}% | 완료율 {completionRate}% | 출석률 {attendanceRate}%

학습 환경: {subjects} | {classrooms}
데이터 상황: {dataContext}

진전 지표: {typeBreakdown}

과제별 성과: {individualGrades}

동기 부여 피드백 작성 (250-300 단어):
1. 특정 과목에서의 성취와 진전을 축하
2. 긍정적인 관점에서 성장 영역 강조
3. 개별 과제 성과와 교사 피드백을 반영한 구체적인 격려
4. 데이터 격차를 건설적으로 다루는 지지적인 제안 제공 ("과제 없음" vs 개선이 필요한 영역 구분)
5. 선택된 과목과 교실에서의 잠재력 강조

중요: "이 기간 동안 과제 없음"을 보면 이를 개선이 필요한 영역으로 취급하지 마세요. 사용 가능한 데이터의 진전에 초점을 맞춰 격려해주세요.

자신감을 기르는 따뜻하고 격려하는 어조를 사용하세요.

형식: 다음 HTML 태그만 사용하여 피드백을 반환하세요: <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>. 강조는 <strong>, 불릿 포인트는 <ul>/<li>, 번호 목록은 <ol>/<li>를 사용하세요. <p> 태그로 명확한 단락 구조를 만드세요.`
  }
}

// Helper function to format type breakdown for prompt
export function formatTypeBreakdown(byType: StudentPerformanceData['metrics']['byType'], language: FeedbackLanguage): string {
  const types = ['quiz', 'homework', 'test', 'project'] as const
  const labels = {
    english: {
      quiz: 'Quizzes',
      homework: 'Homework',
      test: 'Tests',
      project: 'Projects'
    },
    korean: {
      quiz: '퀴즈',
      homework: '숙제',
      test: '시험',
      project: '프로젝트'
    }
  }

  return types
    .map(type => {
      const data = byType[type]
      const label = labels[language][type]
      
      // Check if there are no assignments of this type
      if (data.total === 0) {
        if (language === 'english') {
          return `- ${label}: No assignments given during this period`
        } else {
          return `- ${label}: 이 기간 동안 과제 없음`
        }
      }
      
      if (language === 'english') {
        return `- ${label}: ${data.averageGrade}% average, ${data.completionRate}% completion (${data.completed}/${data.total})`
      } else {
        return `- ${label}: 평균 ${data.averageGrade}%, 완료율 ${data.completionRate}% (${data.completed}/${data.total})`
      }
    })
    .join('\n')
}

// Helper function to format category breakdown
export function formatCategoryBreakdown(byCategory: Record<string, CategoryMetrics> | undefined, language: FeedbackLanguage): string {
  if (!byCategory || Object.keys(byCategory).length === 0) {
    return language === 'english' ? 'No category-specific data available' : '카테고리별 데이터 없음'
  }

  return Object.entries(byCategory)
    .map(([, data]) => {
      // Check if there are no assignments in this category
      if (data.total === 0) {
        if (language === 'english') {
          return `- ${data.name}: No assignments given during this period`
        } else {
          return `- ${data.name}: 이 기간 동안 과제 없음`
        }
      }
      
      if (language === 'english') {
        return `- ${data.name}: ${data.averageGrade}% average, ${data.completionRate}% completion (${data.completed}/${data.total})`
      } else {
        return `- ${data.name}: 평균 ${data.averageGrade}%, 완료율 ${data.completionRate}% (${data.completed}/${data.total})`
      }
    })
    .join('\n')
}

// Helper function to format classroom percentiles
export function formatClassroomPercentiles(percentiles: Record<string, ClassroomPercentile> | undefined, language: FeedbackLanguage): string {
  if (!percentiles || Object.keys(percentiles).length === 0) {
    return language === 'english' ? 'No classroom ranking data available' : '클래스 순위 데이터 없음'
  }

  return Object.entries(percentiles)
    .map(([, data]) => {
      if (language === 'english') {
        return `- ${data.name} (${data.subject}): ${data.percentile}th percentile (class avg: ${data.average}%)`
      } else {
        return `- ${data.name} (${data.subject}): 상위 ${data.percentile}% (학급 평균: ${data.average}%)`
      }
    })
    .join('\n')
}

// Helper function to format subjects information
export function formatSubjects(subjects: Array<{ id: string; name: string }> | undefined, language: FeedbackLanguage): string {
  if (!subjects || subjects.length === 0) {
    return language === 'english' ? 'All subjects' : '모든 과목'
  }

  const subjectNames = subjects.map(s => s.name).join(', ')
  if (language === 'english') {
    return `Subjects: ${subjectNames}`
  } else {
    return `과목: ${subjectNames}`
  }
}

// Helper function to format classrooms information
export function formatClassrooms(classrooms: Array<{ id: string; name: string; subject: string }> | undefined, language: FeedbackLanguage): string {
  if (!classrooms || classrooms.length === 0) {
    return language === 'english' ? 'All classrooms' : '모든 교실'
  }

  const classroomInfo = classrooms.map(c => `${c.name} (${c.subject})`).join(', ')
  if (language === 'english') {
    return `Classrooms: ${classroomInfo}`
  } else {
    return `교실: ${classroomInfo}`
  }
}

// Helper function to format individual grades
export function formatIndividualGrades(grades: IndividualGrade[] | undefined, language: FeedbackLanguage): string {
  if (!grades || grades.length === 0) {
    return language === 'english' ? 'No individual grade data available' : '개별 성적 데이터 없음'
  }

  // Prioritize grades for token management
  const gradesWithFeedback = grades.filter(g => g.feedback)
  const failingGrades = grades.filter(g => !g.feedback && (g.score === null || g.score < 70))
  const normalGrades = grades.filter(g => !g.feedback && g.score !== null && g.score >= 70)

  // Build the grades string with priority
  let gradesList: IndividualGrade[] = []
  const MAX_GRADES = 50 // Limit to prevent token overflow

  // Always include grades with feedback first
  gradesList = [...gradesWithFeedback]

  // Add failing grades next
  if (gradesList.length < MAX_GRADES) {
    const remainingSlots = MAX_GRADES - gradesList.length
    gradesList = [...gradesList, ...failingGrades.slice(0, remainingSlots)]
  }

  // Add normal grades if there's still room
  if (gradesList.length < MAX_GRADES) {
    const remainingSlots = MAX_GRADES - gradesList.length
    gradesList = [...gradesList, ...normalGrades.slice(0, remainingSlots)]
  }

  // Format the grades
  const formattedGrades = gradesList.map(grade => {
    const scoreText = grade.score !== null ? `${grade.score}%` : (language === 'english' ? 'Not submitted' : '미제출')
    const statusText = language === 'english' ? grade.status : translateStatus(grade.status, language)
    
    let gradeInfo = language === 'english' ?
      `• ${grade.title} (${grade.type}, ${grade.subject}): ${scoreText} - ${statusText}` :
      `• ${grade.title} (${grade.type}, ${grade.subject}): ${scoreText} - ${statusText}`
    
    if (grade.feedback) {
      const feedbackText = language === 'english' ? 
        `\n  Teacher feedback: "${grade.feedback}"` :
        `\n  교사 피드백: "${grade.feedback}"`
      gradeInfo += feedbackText
    }
    
    return gradeInfo
  }).join('\n')

  // Add note if grades were truncated
  if (grades.length > gradesList.length) {
    const truncatedCount = grades.length - gradesList.length
    const truncatedNote = language === 'english' ?
      `\n... and ${truncatedCount} more assignments` :
      `\n... 그리고 ${truncatedCount}개 더 많은 과제`
    return formattedGrades + truncatedNote
  }

  return formattedGrades
}

// Helper function to translate status
function translateStatus(status: string, language: FeedbackLanguage): string {
  if (language === 'english') return status
  
  const translations: Record<string, string> = {
    'submitted': '제출됨',
    'graded': '채점됨',
    'pending': '대기중',
    'overdue': '지연',
    'not_submitted': '미제출',
    'excused': '면제'
  }
  
  return translations[status] || status
}

// Helper function to format data context information
interface DataContext {
  hasGradeData: boolean;
  hasAssignmentData: boolean;
  hasAttendanceData: boolean;
  selectedSubjectCount: number;
  selectedClassroomCount: number;
  selectedCategoryCount: number;
}

export function formatDataContext(dataContext: DataContext, language: FeedbackLanguage): string {
  if (!dataContext) return ''

  const contextInfo = []
  
  if (language === 'english') {
    if (!dataContext.hasGradeData) contextInfo.push('No grade data available')
    if (!dataContext.hasAssignmentData) contextInfo.push('No assignment data available')
    if (!dataContext.hasAttendanceData) contextInfo.push('No attendance data available')
    if (dataContext.selectedSubjectCount > 0) contextInfo.push(`${dataContext.selectedSubjectCount} subject(s) selected`)
    if (dataContext.selectedClassroomCount > 0) contextInfo.push(`${dataContext.selectedClassroomCount} classroom(s) selected`)
    if (dataContext.selectedCategoryCount > 0) contextInfo.push(`${dataContext.selectedCategoryCount} category(ies) selected`)
  } else {
    if (!dataContext.hasGradeData) contextInfo.push('성적 데이터 없음')
    if (!dataContext.hasAssignmentData) contextInfo.push('과제 데이터 없음')
    if (!dataContext.hasAttendanceData) contextInfo.push('출석 데이터 없음')
    if (dataContext.selectedSubjectCount > 0) contextInfo.push(`${dataContext.selectedSubjectCount}개 과목 선택`)
    if (dataContext.selectedClassroomCount > 0) contextInfo.push(`${dataContext.selectedClassroomCount}개 교실 선택`)
    if (dataContext.selectedCategoryCount > 0) contextInfo.push(`${dataContext.selectedCategoryCount}개 카테고리 선택`)
  }

  return contextInfo.length > 0 ? contextInfo.join('; ') : ''
}

// Retry utility function
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      // Don't retry on certain errors
      if (error instanceof Error) {
        if (error.message.includes('API key') || 
            error.message.includes('unauthorized') ||
            error.message.includes('invalid')) {
          throw error
        }
      }
      
      // If this was the last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError
      }
      
      // Wait before retrying (exponential backoff)
      const delay = baseDelay * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}


// Main function to generate AI feedback
export async function generateAIFeedback(
  data: StudentPerformanceData,
  template: FeedbackTemplate,
  language: FeedbackLanguage
): Promise<{ success: boolean; feedback?: string; error?: string }> {
  try {
    // Check cache first
    const cachedFeedback = getCachedFeedback(data, template, language)
    if (cachedFeedback) {
      console.log('Using cached AI feedback')
      return {
        success: true,
        feedback: cachedFeedback
      }
    }

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured')
    }

    // Get the appropriate prompt template
    const promptTemplate = PROMPT_TEMPLATES[template][language]

    // Format the prompt with actual data
    const prompt = promptTemplate
      .replace(/{studentName}/g, data.student.name)
      .replace(/{grade}/g, data.student.grade || 'N/A')
      .replace(/{school}/g, data.student.school || 'N/A')
      .replace(/{startDate}/g, data.period.startDate)
      .replace(/{endDate}/g, data.period.endDate)
      .replace(/{gradeAverage}/g, data.metrics.overall.gradeAverage.toString())
      .replace(/{completionRate}/g, data.metrics.overall.completionRate.toString())
      .replace(/{completed}/g, data.metrics.overall.completedAssignments.toString())
      .replace(/{total}/g, data.metrics.overall.totalAssignments.toString())
      .replace(/{attendanceRate}/g, data.metrics.attendance.rate.toString())
      .replace(/{present}/g, data.metrics.attendance.present.toString())
      .replace(/{totalDays}/g, data.metrics.attendance.total.toString())
      .replace(/{typeBreakdown}/g, formatTypeBreakdown(data.metrics.byType, language))
      .replace(/{categoryBreakdown}/g, formatCategoryBreakdown(data.metrics.byCategory, language))
      .replace(/{classroomPercentiles}/g, formatClassroomPercentiles(data.metrics.classroomPercentiles, language))
      .replace(/{subjects}/g, formatSubjects(data.subjects, language))
      .replace(/{classrooms}/g, formatClassrooms(data.classrooms, language))
      .replace(/{dataContext}/g, data.dataContext ? formatDataContext(data.dataContext, language) : '')
      .replace(/{individualGrades}/g, formatIndividualGrades(data.individualGrades, language))

    console.log('Calling OpenAI API with:', {
      model: 'gpt-4o-mini',
      template,
      language,
      studentName: data.student.name,
      promptLength: prompt.length
    })

    // Call OpenAI API with retry logic
    const completion = await retryWithBackoff(async () => {
      console.log('About to call OpenAI with model:', 'gpt-4o-mini')
      return await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: language === 'english' 
              ? 'You are an experienced academic advisor who provides thoughtful, data-driven feedback to help students improve their academic performance. Always format your response as clean HTML using only these tags: <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>. Use proper paragraph structure with <p> tags, <strong> for emphasis, and lists where appropriate.'
              : '당신은 학생들의 학업 성과 향상을 돕기 위해 사려 깊고 데이터 기반의 피드백을 제공하는 경험 많은 학업 상담사입니다. 항상 다음 HTML 태그만 사용하여 깔끔한 HTML 형식으로 응답하세요: <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>. <p> 태그로 적절한 단락 구조를 만들고, 강조는 <strong>, 필요시 목록을 사용하세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: template === 'comprehensive' ? 800 : template === 'focused' ? 500 : 600
      })
    }, 3, 1000) // Retry up to 3 times with 1 second base delay

    const feedback = completion.choices[0]?.message?.content

    if (!feedback) {
      throw new Error('No feedback generated from AI')
    }

    const trimmedFeedback = feedback.trim()

    // Cache the successful result
    setCachedFeedback(data, template, language, trimmedFeedback)

    return {
      success: true,
      feedback: trimmedFeedback
    }
  } catch (error) {
    console.error('Error generating AI feedback:', error)
    
    // Provide a meaningful error message
    let errorMessage = 'Failed to generate AI feedback'
    
    if (error instanceof Error) {
      if (error.message.includes('API key') || error.message.includes('unauthorized')) {
        errorMessage = 'OpenAI API key not configured or invalid. Please check your API key.'
      } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
        errorMessage = 'Rate limit exceeded. Please try again later.'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.'
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.'
      } else if (error.message.includes('insufficient_quota')) {
        errorMessage = 'OpenAI quota exceeded. Please check your usage limits.'
      } else if (error.message.includes('model_not_found')) {
        errorMessage = 'OpenAI model not available. Please try again later.'
      } else {
        errorMessage = `AI generation error: ${error.message}`
      }
    }

    return {
      success: false,
      error: errorMessage
    }
  }
}

// Streaming version of AI feedback generation
export async function generateStreamingAIFeedback(
  data: StudentPerformanceData,
  template: FeedbackTemplate,
  language: FeedbackLanguage
) {
  // Validate API key
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  // Get the appropriate prompt template
  const promptTemplate = PROMPT_TEMPLATES[template][language]

  // Format the prompt with actual data
  const prompt = promptTemplate
    .replace(/{studentName}/g, data.student.name)
    .replace(/{grade}/g, data.student.grade || 'N/A')
    .replace(/{school}/g, data.student.school || 'N/A')
    .replace(/{startDate}/g, data.period.startDate)
    .replace(/{endDate}/g, data.period.endDate)
    .replace(/{gradeAverage}/g, data.metrics.overall.gradeAverage.toString())
    .replace(/{completionRate}/g, data.metrics.overall.completionRate.toString())
    .replace(/{completed}/g, data.metrics.overall.completedAssignments.toString())
    .replace(/{total}/g, data.metrics.overall.totalAssignments.toString())
    .replace(/{attendanceRate}/g, data.metrics.attendance.rate.toString())
    .replace(/{present}/g, data.metrics.attendance.present.toString())
    .replace(/{totalDays}/g, data.metrics.attendance.total.toString())
    .replace(/{typeBreakdown}/g, formatTypeBreakdown(data.metrics.byType, language))
    .replace(/{categoryBreakdown}/g, formatCategoryBreakdown(data.metrics.byCategory, language))
    .replace(/{classroomPercentiles}/g, formatClassroomPercentiles(data.metrics.classroomPercentiles, language))
    .replace(/{subjects}/g, formatSubjects(data.subjects, language))
    .replace(/{classrooms}/g, formatClassrooms(data.classrooms, language))
    .replace(/{dataContext}/g, data.dataContext ? formatDataContext(data.dataContext, language) : '')
    .replace(/{individualGrades}/g, formatIndividualGrades(data.individualGrades, language))

  console.log('Creating streaming AI feedback with:', {
    model: 'gpt-4o-mini',
    template,
    language,
    studentName: data.student.name,
    promptLength: prompt.length
  })

  // Create OpenAI client for streaming
  const openai = createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })

  // Stream the response using Vercel AI SDK
  return await streamText({
    model: openai('gpt-4o-mini'),
    system: language === 'english' 
      ? 'You are an experienced academic advisor who provides thoughtful, data-driven feedback to help students improve their academic performance. Always format your response as clean HTML using only these tags: <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>. Use proper paragraph structure with <p> tags, <strong> for emphasis, and lists where appropriate.'
      : '당신은 학생들의 학업 성과 향상을 돕기 위해 사려 깊고 데이터 기반의 피드백을 제공하는 경험 많은 학업 상담사입니다. 항상 다음 HTML 태그만 사용하여 깔끔한 HTML 형식으로 응답하세요: <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>. <p> 태그로 적절한 단락 구조를 만들고, 강조는 <strong>, 필요시 목록을 사용하세요.',
    prompt,
    temperature: 0.7,
  })
}

// Function to extract performance data from report data
interface ReportData {
  student_name?: string;
  student_grade?: string;
  student_school?: string;
  subjects?: Record<string, unknown>;
  classrooms?: Record<string, unknown>;
  categories?: Record<string, unknown>;
  assignmentsByCategory?: Record<string, {
    total?: number;
    completed?: number;
    completionRate?: number;
    averageGrade?: number;
  }>;
  categoryNames?: Record<string, string>;
  classroomPercentiles?: Record<string, {
    name?: string;
    subject?: string;
    percentile?: number;
    classAverage?: number;
  }>;
  [key: string]: unknown;
}

interface FormData {
  student_name?: string;
  student_grade?: string;
  student_school?: string;
  [key: string]: unknown;
}

export function extractPerformanceData(reportData: ReportData, formData: FormData): StudentPerformanceData {
  // Extract student name from reportData if available, otherwise use a placeholder
  const studentName = reportData?.student_name || formData.student_name || 'Student'
  const studentGrade = reportData?.student_grade || formData.student_grade || ''
  const studentSchool = reportData?.student_school || formData.student_school || ''
  
  console.log('Extracted student data:', {
    name: studentName,
    grade: studentGrade,
    school: studentSchool,
    hasReportData: !!reportData,
    hasFormData: !!formData,
    hasEnhancedData: !!(reportData?.subjects || reportData?.classrooms || reportData?.categories)
  })
  
  return {
    student: {
      name: studentName,
      grade: studentGrade,
      school: studentSchool
    },
    period: {
      startDate: String(formData.start_date || ''),
      endDate: String(formData.end_date || '')
    },
    metrics: {
      overall: {
        gradeAverage: (reportData?.grades as any)?.average || 0,
        totalAssignments: (reportData?.assignments as any)?.total || 0,
        completedAssignments: (reportData?.assignments as any)?.completed || 0,
        completionRate: (reportData?.assignments as any)?.completionRate || 0
      },
      attendance: {
        present: (reportData?.attendance as any)?.present || 0,
        total: (reportData?.attendance as any)?.total || 0,
        rate: (reportData?.attendance as any)?.attendanceRate || 0
      },
      byType: {
        quiz: (reportData?.assignmentsByType as any)?.quiz || {
          total: 0,
          completed: 0,
          completionRate: 0,
          averageGrade: 0,
          statuses: {
            submitted: 0,
            pending: 0,
            overdue: 0,
            notSubmitted: 0,
            excused: 0
          }
        },
        homework: (reportData?.assignmentsByType as any)?.homework || {
          total: 0,
          completed: 0,
          completionRate: 0,
          averageGrade: 0,
          statuses: {
            submitted: 0,
            pending: 0,
            overdue: 0,
            notSubmitted: 0,
            excused: 0
          }
        },
        test: (reportData?.assignmentsByType as any)?.test || {
          total: 0,
          completed: 0,
          completionRate: 0,
          averageGrade: 0,
          statuses: {
            submitted: 0,
            pending: 0,
            overdue: 0,
            notSubmitted: 0,
            excused: 0
          }
        },
        project: (reportData?.assignmentsByType as any)?.project || {
          total: 0,
          completed: 0,
          completionRate: 0,
          averageGrade: 0,
          statuses: {
            submitted: 0,
            pending: 0,
            overdue: 0,
            notSubmitted: 0,
            excused: 0
          }
        }
      },
      byCategory: (reportData?.assignmentsByCategory as any) ?
        Object.entries((reportData.assignmentsByCategory as any)).reduce((acc, [id, data]: any) => {
          return {
            ...acc,
            [id]: data
          }
        }, {}) : undefined,
      classroomPercentiles: (reportData as any)?.classroomPercentiles ?
        Object.entries((reportData as any).classroomPercentiles).reduce((acc: any, [id, data]: [string, any]) => {
          acc[id] = {
            name: data.name || 'Unknown',
            subject: data.subject || 'Unknown',
            percentile: data.percentile || 0,
            average: data.classAverage || 0
          }
          return acc
        }, {}) : undefined
    },
    selectedFilters: {
      classrooms: (formData.selected_classrooms as any) || [],
      categories: (formData.selected_assignment_categories as any) || []
    },
    // Include enhanced context data if available
    subjects: (reportData?.subjects as any) || [],
    classrooms: (reportData?.classrooms as any) || [],
    categories: (reportData?.categories as any) || [],
    dataContext: (reportData?.dataContext as any) || {
      hasGradeData: false,
      hasAssignmentData: false,
      hasAttendanceData: false,
      selectedSubjectCount: 0,
      selectedClassroomCount: 0,
      selectedCategoryCount: 0
    },
    // Include individual grades for detailed analysis
    individualGrades: (reportData?.individualGrades as any) || []
  }
}