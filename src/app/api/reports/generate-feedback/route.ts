import { NextRequest, NextResponse } from 'next/server'
import { generateAIFeedback, extractPerformanceData, type FeedbackTemplate, type FeedbackLanguage } from '@/lib/ai-service'

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
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
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
      return NextResponse.json(
        { success: false, error: 'Missing required data' },
        { status: 400 }
      )
    }

    // Validate template and language
    const validTemplates: FeedbackTemplate[] = ['comprehensive', 'focused', 'encouraging']
    const validLanguages: FeedbackLanguage[] = ['english', 'korean']

    if (!validTemplates.includes(template as FeedbackTemplate)) {
      return NextResponse.json(
        { success: false, error: 'Invalid template' },
        { status: 400 }
      )
    }

    if (!validLanguages.includes(language as FeedbackLanguage)) {
      return NextResponse.json(
        { success: false, error: 'Invalid language' },
        { status: 400 }
      )
    }

    // Validate required data
    if (!reportData || !formData || !formData.student_id) {
      return NextResponse.json(
        { success: false, error: 'Missing student or report data' },
        { status: 400 }
      )
    }

    // Extract performance data with enhanced student info
    const performanceData = extractPerformanceData(reportData, formData)
    
    console.log('Generating AI feedback for:', {
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

    // Generate AI feedback
    const result = await generateAIFeedback(
      performanceData,
      template as FeedbackTemplate,
      language as FeedbackLanguage
    )

    if (!result.success) {
      // Log error for monitoring but don't expose internal details
      console.error('AI generation error:', result.error)
      
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to generate feedback' 
        },
        { status: 500 }
      )
    }

    // Return the generated feedback
    return NextResponse.json({
      success: true,
      feedback: result.feedback
    })

  } catch (error) {
    console.error('API route error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'An unexpected error occurred' 
      },
      { status: 500 }
    )
  }
}