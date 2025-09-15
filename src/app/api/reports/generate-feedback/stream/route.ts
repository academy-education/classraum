import { NextRequest } from 'next/server'
import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { extractPerformanceData, type FeedbackTemplate, type FeedbackLanguage } from '@/lib/ai-service'

// Simple rate limiting (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10 // 10 requests per minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(identifier)

  if (!userLimit) {
    rateLimitMap.set(identifier, { count: 1, timestamp: now })
    return true
  }

  // Reset if window has passed
  if (now - userLimit.timestamp > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(identifier, { count: 1, timestamp: now })
    return true
  }

  // Check if under limit
  if (userLimit.count < RATE_LIMIT_MAX_REQUESTS) {
    userLimit.count++
    return true
  }

  return false
}

export async function POST(request: NextRequest) {
  try {
    // Simple rate limiting by IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit(ip)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await request.json()
    const { 
      reportData, 
      formData, 
      template = 'comprehensive', 
      language = 'english',
      requestedBy = 'Unknown User'
    } = body

    // Validate inputs
    if (!reportData || !formData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate template and language
    const validTemplates: FeedbackTemplate[] = ['comprehensive', 'focused', 'encouraging']
    const validLanguages: FeedbackLanguage[] = ['english', 'korean']

    if (!validTemplates.includes(template as FeedbackTemplate)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid template' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!validLanguages.includes(language as FeedbackLanguage)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid language' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate required data
    if (!reportData || !formData || !formData.student_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing student or report data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Extract performance data with enhanced student info
    const performanceData = extractPerformanceData(reportData, formData)
    
    console.log('Generating streaming AI feedback for:', {
      student: performanceData.student.name,
      template,
      language,
      studentId: formData.student_id,
      requestedBy,
      metrics: {
        gradeAverage: performanceData.metrics.overall.gradeAverage,
        completionRate: performanceData.metrics.overall.completionRate
      }
    })

    // Import the AI service to get the prompt templates
    const { PROMPT_TEMPLATES, formatTypeBreakdown, formatCategoryBreakdown, formatClassroomPercentiles, formatSubjects, formatClassrooms, formatIndividualGrades, formatDataContext } = await import('@/lib/ai-service')

    // Get the appropriate prompt template
    const promptTemplate = PROMPT_TEMPLATES[template as FeedbackTemplate][language as FeedbackLanguage]

    // Format the prompt with actual data
    const prompt = promptTemplate
      .replace(/{studentName}/g, performanceData.student.name)
      .replace(/{grade}/g, performanceData.student.grade || 'N/A')
      .replace(/{school}/g, performanceData.student.school || 'N/A')
      .replace(/{startDate}/g, performanceData.period.startDate)
      .replace(/{endDate}/g, performanceData.period.endDate)
      .replace(/{gradeAverage}/g, performanceData.metrics.overall.gradeAverage.toString())
      .replace(/{completionRate}/g, performanceData.metrics.overall.completionRate.toString())
      .replace(/{completed}/g, performanceData.metrics.overall.completedAssignments.toString())
      .replace(/{total}/g, performanceData.metrics.overall.totalAssignments.toString())
      .replace(/{attendanceRate}/g, performanceData.metrics.attendance.rate.toString())
      .replace(/{present}/g, performanceData.metrics.attendance.present.toString())
      .replace(/{totalDays}/g, performanceData.metrics.attendance.total.toString())
      .replace(/{typeBreakdown}/g, formatTypeBreakdown(performanceData.metrics.byType, language))
      .replace(/{categoryBreakdown}/g, formatCategoryBreakdown(performanceData.metrics.byCategory, language))
      .replace(/{classroomPercentiles}/g, formatClassroomPercentiles(performanceData.metrics.classroomPercentiles, language))
      .replace(/{subjects}/g, formatSubjects(performanceData.subjects, language))
      .replace(/{classrooms}/g, formatClassrooms(performanceData.classrooms, language))
      .replace(/{dataContext}/g, performanceData.dataContext ? formatDataContext(performanceData.dataContext, language) : '')
      .replace(/{individualGrades}/g, formatIndividualGrades(performanceData.individualGrades, language))

    // Create OpenAI client
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Stream the response using Vercel AI SDK
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      system: language === 'english' 
        ? 'You are an experienced academic advisor who provides thoughtful, data-driven feedback to help students improve their academic performance. Always format your response as clean HTML using only these tags: <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>. Use proper paragraph structure with <p> tags, <strong> for emphasis, and lists where appropriate.'
        : '당신은 학생들의 학업 성과 향상을 돕기 위해 사려 깊고 데이터 기반의 피드백을 제공하는 경험 많은 학업 상담사입니다. 항상 다음 HTML 태그만 사용하여 깔끔한 HTML 형식으로 응답하세요: <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>. <p> 태그로 적절한 단락 구조를 만들고, 강조는 <strong>, 필요시 목록을 사용하세요.',
      prompt,
      temperature: 0.7,
    })

    return result.toTextStreamResponse()

  } catch (error) {
    console.error('Streaming API route error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An unexpected error occurred' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}