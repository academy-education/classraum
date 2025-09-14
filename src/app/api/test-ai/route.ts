import { NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function GET() {
  try {
    console.log('Testing OpenAI API connection...')
    
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'OpenAI API key not configured'
      })
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    console.log('Making simple OpenAI API call...')

    // Make a simple test call
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Say "Hello, AI test successful!" in exactly those words.'
        }
      ],
      max_tokens: 50
    })

    const response = completion.choices[0]?.message?.content || 'No response'

    console.log('OpenAI API test successful:', response)

    return NextResponse.json({
      success: true,
      response: response,
      model: 'gpt-4o-mini',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('OpenAI API test failed:', error)
    
    let errorMessage = 'Unknown error'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      timestamp: new Date().toISOString()
    })
  }
}