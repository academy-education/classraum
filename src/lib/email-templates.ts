/**
 * Email Templates for Supabase Auth
 *
 * Copy these templates into your Supabase Dashboard:
 * Authentication > Email Templates
 *
 * These are bilingual (English + Korean) templates.
 * The templates use {{ .ConfirmationURL }} which Supabase replaces with the actual link.
 */

// ===========================================
// CONFIRM SIGNUP TEMPLATE
// ===========================================
// Use this in: Supabase Dashboard > Authentication > Email Templates > Confirm signup
export const CONFIRM_SIGNUP_SUBJECT = 'Confirm your email / 이메일 인증'

export const CONFIRM_SIGNUP_HTML = `
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
    .divider { height: 1px; background: #eee; margin: 30px 0; }
    .lang-section { margin-bottom: 30px; }
    .lang-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>Classraum</h1>
      </div>

      <!-- English -->
      <div class="lang-section">
        <div class="lang-label">English</div>
        <h2 style="margin-top: 0; color: #111;">Confirm Your Email</h2>
        <p>Welcome to Classraum! Please confirm your email address to complete your registration.</p>
      </div>

      <!-- Korean -->
      <div class="lang-section">
        <div class="lang-label">한국어</div>
        <h2 style="margin-top: 0; color: #111;">이메일 인증</h2>
        <p>Classraum에 오신 것을 환영합니다! 가입을 완료하려면 이메일 주소를 인증해 주세요.</p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" class="button">
          Confirm Email / 이메일 인증하기
        </a>
      </p>

      <div class="divider"></div>

      <p style="color: #666; font-size: 13px;">
        If the button doesn't work, copy and paste this link:<br>
        버튼이 작동하지 않으면 이 링크를 복사하세요:
      </p>
      <p style="color: #2563eb; font-size: 12px; word-break: break-all;">
        {{ .ConfirmationURL }}
      </p>

      <div class="footer">
        <p>
          If you didn't create an account, you can ignore this email.<br>
          계정을 만들지 않으셨다면 이 이메일을 무시하셔도 됩니다.
        </p>
        <p>&copy; Classraum</p>
      </div>
    </div>
  </div>
</body>
</html>
`

// ===========================================
// RESET PASSWORD TEMPLATE
// ===========================================
// Use this in: Supabase Dashboard > Authentication > Email Templates > Reset password
export const RESET_PASSWORD_SUBJECT = 'Reset your password / 비밀번호 재설정'

export const RESET_PASSWORD_HTML = `
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
    .divider { height: 1px; background: #eee; margin: 30px 0; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin: 20px 0; font-size: 14px; }
    .lang-section { margin-bottom: 30px; }
    .lang-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>Classraum</h1>
      </div>

      <!-- English -->
      <div class="lang-section">
        <div class="lang-label">English</div>
        <h2 style="margin-top: 0; color: #111;">Reset Your Password</h2>
        <p>We received a request to reset your password. Click the button below to create a new password.</p>
      </div>

      <!-- Korean -->
      <div class="lang-section">
        <div class="lang-label">한국어</div>
        <h2 style="margin-top: 0; color: #111;">비밀번호 재설정</h2>
        <p>비밀번호 재설정 요청을 받았습니다. 아래 버튼을 클릭하여 새 비밀번호를 설정하세요.</p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" class="button">
          Reset Password / 비밀번호 재설정
        </a>
      </p>

      <div class="warning">
        <strong>This link expires in 24 hours.</strong><br>
        <strong>이 링크는 24시간 후에 만료됩니다.</strong>
      </div>

      <div class="divider"></div>

      <p style="color: #666; font-size: 13px;">
        If the button doesn't work, copy and paste this link:<br>
        버튼이 작동하지 않으면 이 링크를 복사하세요:
      </p>
      <p style="color: #2563eb; font-size: 12px; word-break: break-all;">
        {{ .ConfirmationURL }}
      </p>

      <div class="footer">
        <p>
          If you didn't request a password reset, please ignore this email.<br>
          비밀번호 재설정을 요청하지 않으셨다면 이 이메일을 무시하세요.
        </p>
        <p>&copy; Classraum</p>
      </div>
    </div>
  </div>
</body>
</html>
`

// ===========================================
// MAGIC LINK TEMPLATE
// ===========================================
// Use this in: Supabase Dashboard > Authentication > Email Templates > Magic Link
export const MAGIC_LINK_SUBJECT = 'Your login link / 로그인 링크'

export const MAGIC_LINK_HTML = `
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
    .divider { height: 1px; background: #eee; margin: 30px 0; }
    .lang-section { margin-bottom: 30px; }
    .lang-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>Classraum</h1>
      </div>

      <!-- English -->
      <div class="lang-section">
        <div class="lang-label">English</div>
        <h2 style="margin-top: 0; color: #111;">Your Login Link</h2>
        <p>Click the button below to log in to your Classraum account.</p>
      </div>

      <!-- Korean -->
      <div class="lang-section">
        <div class="lang-label">한국어</div>
        <h2 style="margin-top: 0; color: #111;">로그인 링크</h2>
        <p>아래 버튼을 클릭하여 Classraum 계정에 로그인하세요.</p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" class="button">
          Log In / 로그인
        </a>
      </p>

      <div class="divider"></div>

      <p style="color: #666; font-size: 13px;">
        If the button doesn't work, copy and paste this link:<br>
        버튼이 작동하지 않으면 이 링크를 복사하세요:
      </p>
      <p style="color: #2563eb; font-size: 12px; word-break: break-all;">
        {{ .ConfirmationURL }}
      </p>

      <div class="footer">
        <p>
          If you didn't request this link, you can ignore this email.<br>
          이 링크를 요청하지 않으셨다면 이 이메일을 무시하세요.
        </p>
        <p>&copy; Classraum</p>
      </div>
    </div>
  </div>
</body>
</html>
`

// ===========================================
// INVITE USER TEMPLATE
// ===========================================
// Use this in: Supabase Dashboard > Authentication > Email Templates > Invite user
export const INVITE_USER_SUBJECT = "You've been invited to Classraum / Classraum 초대"

export const INVITE_USER_HTML = `
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
    .divider { height: 1px; background: #eee; margin: 30px 0; }
    .lang-section { margin-bottom: 30px; }
    .lang-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>Classraum</h1>
      </div>

      <!-- English -->
      <div class="lang-section">
        <div class="lang-label">English</div>
        <h2 style="margin-top: 0; color: #111;">You've Been Invited!</h2>
        <p>You've been invited to join an academy on Classraum. Click the button below to accept the invitation and create your account.</p>
      </div>

      <!-- Korean -->
      <div class="lang-section">
        <div class="lang-label">한국어</div>
        <h2 style="margin-top: 0; color: #111;">초대를 받으셨습니다!</h2>
        <p>Classraum의 학원에 초대되었습니다. 아래 버튼을 클릭하여 초대를 수락하고 계정을 만드세요.</p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" class="button">
          Accept Invitation / 초대 수락
        </a>
      </p>

      <div class="divider"></div>

      <p style="color: #666; font-size: 13px;">
        If the button doesn't work, copy and paste this link:<br>
        버튼이 작동하지 않으면 이 링크를 복사하세요:
      </p>
      <p style="color: #2563eb; font-size: 12px; word-break: break-all;">
        {{ .ConfirmationURL }}
      </p>

      <div class="footer">
        <p>&copy; Classraum</p>
      </div>
    </div>
  </div>
</body>
</html>
`

// ===========================================
// CHANGE EMAIL TEMPLATE
// ===========================================
// Use this in: Supabase Dashboard > Authentication > Email Templates > Change Email Address
export const CHANGE_EMAIL_SUBJECT = 'Confirm email change / 이메일 변경 확인'

export const CHANGE_EMAIL_HTML = `
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
    .divider { height: 1px; background: #eee; margin: 30px 0; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 4px; margin: 20px 0; font-size: 14px; }
    .lang-section { margin-bottom: 30px; }
    .lang-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo">
        <h1>Classraum</h1>
      </div>

      <!-- English -->
      <div class="lang-section">
        <div class="lang-label">English</div>
        <h2 style="margin-top: 0; color: #111;">Confirm Email Change</h2>
        <p>Click the button below to confirm your new email address.</p>
      </div>

      <!-- Korean -->
      <div class="lang-section">
        <div class="lang-label">한국어</div>
        <h2 style="margin-top: 0; color: #111;">이메일 변경 확인</h2>
        <p>아래 버튼을 클릭하여 새 이메일 주소를 확인하세요.</p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="{{ .ConfirmationURL }}" class="button">
          Confirm Email / 이메일 확인
        </a>
      </p>

      <div class="warning">
        <strong>If you didn't request this change, please contact support immediately.</strong><br>
        <strong>이 변경을 요청하지 않으셨다면 즉시 지원팀에 문의하세요.</strong>
      </div>

      <div class="divider"></div>

      <p style="color: #666; font-size: 13px;">
        If the button doesn't work, copy and paste this link:<br>
        버튼이 작동하지 않으면 이 링크를 복사하세요:
      </p>
      <p style="color: #2563eb; font-size: 12px; word-break: break-all;">
        {{ .ConfirmationURL }}
      </p>

      <div class="footer">
        <p>&copy; Classraum</p>
      </div>
    </div>
  </div>
</body>
</html>
`
