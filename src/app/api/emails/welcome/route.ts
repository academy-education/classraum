import { NextResponse } from 'next/server'

const EMAIL_TEMPLATES = {
  en: {
    subject: 'Welcome to Classraum!',
    html: (name: string, role: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo h1 { color: #2563eb; margin: 0; font-size: 28px; }
    .button { display: inline-block; background: #2563eb; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { margin-top: 30px; text-align: center; color: #888; font-size: 13px; }
    .features { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .features li { margin: 8px 0; }
    .role-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>Classraum</h1>
      </div>

      <h2 style="margin-top: 0; color: #111;">Welcome to Classraum, ${name}!</h2>

      <p>Your account has been successfully created as a <span class="role-badge">${role}</span>.</p>

      <p>You're now ready to start your academy experience with Classraum.</p>

      <div class="features">
        <strong>Here's what you can do:</strong>
        <ul>
          <li>View your schedule and upcoming classes</li>
          <li>Track assignments and progress</li>
          <li>Communicate with teachers and staff</li>
          <li>Manage your profile and settings</li>
        </ul>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="https://app.classraum.com" class="button">Go to Classraum</a>
      </p>

      <div class="footer">
        <p>Need help? Contact your academy administrator.</p>
        <p>&copy; Classraum - Academy Management Platform</p>
      </div>
    </div>
  </div>
</body>
</html>
    `
  },
  ko: {
    subject: 'Classraum에 오신 것을 환영합니다!',
    html: (name: string, role: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .logo { text-align: center; margin-bottom: 30px; }
    .logo h1 { color: #2563eb; margin: 0; font-size: 28px; }
    .button { display: inline-block; background: #2563eb; color: white !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .footer { margin-top: 30px; text-align: center; color: #888; font-size: 13px; }
    .features { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .features li { margin: 8px 0; }
    .role-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>Classraum</h1>
      </div>

      <h2 style="margin-top: 0; color: #111;">${name}님, Classraum에 오신 것을 환영합니다!</h2>

      <p><span class="role-badge">${role}</span> 계정이 성공적으로 생성되었습니다.</p>

      <p>이제 Classraum과 함께 학원 생활을 시작할 준비가 되었습니다.</p>

      <div class="features">
        <strong>이용 가능한 기능:</strong>
        <ul>
          <li>수업 일정 및 시간표 확인</li>
          <li>과제 및 학습 진도 관리</li>
          <li>선생님 및 직원과 소통</li>
          <li>프로필 및 설정 관리</li>
        </ul>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="https://app.classraum.com" class="button">Classraum 시작하기</a>
      </p>

      <div class="footer">
        <p>도움이 필요하시면 학원 관리자에게 문의하세요.</p>
        <p>&copy; Classraum - 학원 관리 플랫폼</p>
      </div>
    </div>
  </div>
</body>
</html>
    `
  }
}

const ROLE_NAMES = {
  en: {
    student: 'Student',
    parent: 'Parent',
    teacher: 'Teacher',
    manager: 'Manager',
    admin: 'Admin'
  },
  ko: {
    student: '학생',
    parent: '학부모',
    teacher: '선생님',
    manager: '관리자',
    admin: '관리자'
  }
}

export async function POST(request: Request) {
  try {
    const { email, name, role, language = 'en' } = await request.json()

    if (!email || !name || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, name, role' },
        { status: 400 }
      )
    }

    const postmarkToken = process.env.POSTMARK_SERVER_TOKEN
    if (!postmarkToken) {
      console.error('[Welcome Email] POSTMARK_SERVER_TOKEN not configured')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    const lang = language === 'korean' || language === 'ko' ? 'ko' : 'en'
    const template = EMAIL_TEMPLATES[lang]
    const roleName = ROLE_NAMES[lang][role as keyof typeof ROLE_NAMES.en] || role

    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Postmark-Server-Token': postmarkToken,
      },
      body: JSON.stringify({
        From: process.env.POSTMARK_FROM_EMAIL || 'no-reply@classraum.com',
        To: email,
        Subject: template.subject,
        HtmlBody: template.html(name, roleName),
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Welcome Email] Postmark error:', error)
      return NextResponse.json(
        { error: error.Message || 'Failed to send email' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Welcome Email] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
