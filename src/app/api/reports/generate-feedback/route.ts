import { NextRequest, NextResponse } from 'next/server'
import { generateAIFeedback, extractPerformanceData, type FeedbackTemplate, type FeedbackLanguage } from '@/lib/ai-service'
import { enforceRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limit: by IP at 5/min as a basic shield, since this endpoint
    // doesn't auth at the request level (the user identity comes inside
    // body.requestedBy). Each call hits Anthropic — at ~$0.10/call, an
    // unrate-limited attacker rotating IPs could rack up real cost fast.
    // For tighter control, the body's requestedBy/formData.student_id
    // could be added to the key once the body is parsed (see ipBlocked
    // first, then userBlocked after the parse below).
    const ipBlocked = enforceRateLimit(
      `generate-feedback:ip:${getClientIp(request)}`,
      { windowMs: 60 * 1000, max: 5 }
    )
    if (ipBlocked) return ipBlocked

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

    // Per-student rate limit: 3 AI feedback generations per student per
    // hour. This is the tighter ceiling — a single legitimate use case
    // generates 1, maybe 2 versions for the same student. Anything more
    // is either accidental double-clicks or scripted abuse.
    const studentBlocked = enforceRateLimit(
      `generate-feedback:student:${formData.student_id}`,
      { windowMs: 60 * 60 * 1000, max: 3 }
    )
    if (studentBlocked) return studentBlocked

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