# Security Audit & Hardening 🔴

## Overview
**Priority**: 🔴 Critical  
**Scope**: Application-wide security improvements  
**Estimated Effort**: 2-3 weeks  
**Dependencies**: CSRF implementation, CSP configuration, security headers

This document covers comprehensive security hardening across the entire application, focusing on preventing common vulnerabilities and implementing defense-in-depth strategies.

---

## Critical Security Vulnerabilities

### 🚨 Task 1: Payment Security (Checkout)

#### Objective
Address critical security vulnerabilities in the payment processing system.

#### Implementation Steps

##### Sub-task 1.1: Implement Subresource Integrity (SRI)
- [ ] **Generate and implement SRI hashes for external scripts**
  ```typescript
  const script = document.createElement('script')
  script.src = 'https://stgstdpay.inicis.com/stdjs/INIStdPay.js'
  script.integrity = 'sha384-[GENERATED_HASH]'
  script.crossOrigin = 'anonymous'
  script.onerror = () => {
    console.error('Failed to load payment script')
    setPaymentError(t('checkout.scriptLoadError'))
  }
  document.body.appendChild(script)
  ```

##### Sub-task 1.2: Add CSRF Protection
- [ ] **Implement CSRF token generation and validation**
  ```typescript
  const generateCSRFToken = () => crypto.randomUUID() + '-' + Date.now()
  
  const formFields = {
    ...paymentData,
    csrf_token: csrfToken,
    timestamp: Date.now()
  }
  ```

##### Sub-task 1.3: Input Sanitization
- [ ] **Install and implement DOMPurify**
  ```bash
  npm install dompurify @types/dompurify
  ```
  ```typescript
  import DOMPurify from 'dompurify'
  
  Object.entries(formFields).forEach(([key, value]) => {
    const input = document.createElement('input')
    input.name = DOMPurify.sanitize(key)
    input.value = DOMPurify.sanitize(String(value))
    form.appendChild(input)
  })
  ```

---

### 🚨 Task 2: Content Security Policy (CSP)

#### Objective
Implement comprehensive CSP to prevent XSS and other injection attacks.

#### Implementation Steps

##### Sub-task 2.1: Configure CSP Headers
- [ ] **Add CSP middleware**
  ```typescript
  // middleware.ts
  const securityHeaders = {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'nonce-{NONCE}' https://stgstdpay.inicis.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co",
      "form-action 'self' https://stgstdpay.inicis.com",
      "frame-ancestors 'none'",
      "base-uri 'self'"
    ].join('; ')
  }
  ```

##### Sub-task 2.2: Implement Nonce Strategy
- [ ] **Generate unique nonces for inline scripts**
  ```typescript
  const nonce = crypto.randomUUID()
  
  // Use in script tags
  <script nonce={nonce}>
    // Inline script content
  </script>
  ```

##### Sub-task 2.3: CSP Violation Reporting
- [ ] **Set up CSP violation endpoint**
  ```typescript
  // api/csp-report/route.ts
  export async function POST(request: Request) {
    const report = await request.json()
    console.error('CSP Violation:', report)
    // Send to monitoring service
    return new Response('OK', { status: 200 })
  }
  ```

---

### 🚨 Task 3: Authentication Security

#### Objective
Standardize and harden authentication patterns across the application.

#### Implementation Steps

##### Sub-task 3.1: Secure Session Management
- [ ] **Implement secure cookie settings**
  ```typescript
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
  }
  ```

##### Sub-task 3.2: Rate Limiting
- [ ] **Add authentication rate limiting**
  ```typescript
  // utils/rateLimiter.ts
  export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts',
    standardHeaders: true,
    legacyHeaders: false,
  })
  ```

##### Sub-task 3.3: Password Security
- [ ] **Implement password strength validation**
  ```typescript
  const validatePassword = (password: string) => {
    const minLength = 8
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    
    return {
      isValid: password.length >= minLength && hasUpperCase && 
               hasLowerCase && hasNumbers && hasSpecialChar,
      errors: [
        password.length < minLength && 'Password must be at least 8 characters',
        !hasUpperCase && 'Password must contain an uppercase letter',
        !hasLowerCase && 'Password must contain a lowercase letter',
        !hasNumbers && 'Password must contain a number',
        !hasSpecialChar && 'Password must contain a special character'
      ].filter(Boolean)
    }
  }
  ```

---

### 🚨 Task 4: Data Protection & Privacy

#### Objective
Implement comprehensive data protection measures.

#### Implementation Steps

##### Sub-task 4.1: Remove Production Logging
- [ ] **Audit and remove all console.log statements**
  ```bash
  # Find all console.log statements
  rg "console\.(log|info|warn|debug)" --type tsx --type ts
  ```
  ```typescript
  // Replace with proper logging service
  const logger = {
    info: (message: string, data?: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log(message, data)
      }
      // Send to logging service in production
    },
    error: (message: string, error?: Error) => {
      console.error(message, error)
      // Send to error tracking service
    }
  }
  ```

##### Sub-task 4.2: Sensitive Data Handling
- [ ] **Implement data masking for logs**
  ```typescript
  const maskSensitiveData = (data: any) => {
    const sensitiveKeys = ['password', 'email', 'phone', 'ssn', 'credit_card']
    const masked = { ...data }
    
    sensitiveKeys.forEach(key => {
      if (masked[key]) {
        masked[key] = '***REDACTED***'
      }
    })
    
    return masked
  }
  ```

##### Sub-task 4.3: Environment Variable Security
- [ ] **Audit environment variable usage**
  ```typescript
  // Create secure env validation
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ] as const
  
  const validateEnv = () => {
    const missing = requiredEnvVars.filter(key => !process.env[key])
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    }
  }
  ```

---

### 🚨 Task 5: API Security

#### Objective
Secure all API endpoints and external communications.

#### Implementation Steps

##### Sub-task 5.1: API Route Protection
- [ ] **Implement API authentication middleware**
  ```typescript
  // middleware/auth.ts
  export const withAuth = (handler: NextApiHandler) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      const token = req.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        return res.status(401).json({ error: 'Authentication required' })
      }
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token)
        if (error || !user) {
          return res.status(401).json({ error: 'Invalid token' })
        }
        
        req.user = user
        return handler(req, res)
      } catch (error) {
        return res.status(500).json({ error: 'Authentication error' })
      }
    }
  }
  ```

##### Sub-task 5.2: Input Validation
- [ ] **Implement comprehensive input validation**
  ```typescript
  import { z } from 'zod'
  
  const PaymentSchema = z.object({
    amount: z.number().positive().max(1000000),
    currency: z.enum(['KRW', 'USD']),
    buyername: z.string().min(1).max(100),
    buyeremail: z.string().email(),
    buyertel: z.string().regex(/^\+?[1-9]\d{1,14}$/)
  })
  
  export const validatePayment = (data: unknown) => {
    try {
      return PaymentSchema.parse(data)
    } catch (error) {
      throw new Error('Invalid payment data')
    }
  }
  ```

##### Sub-task 5.3: Rate Limiting for APIs
- [ ] **Add API rate limiting**
  ```typescript
  // utils/apiRateLimit.ts
  export const apiRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many API requests',
    standardHeaders: true,
    legacyHeaders: false,
  })
  ```

---

### 🚨 Task 6: Security Headers

#### Objective
Implement comprehensive security headers across the application.

#### Implementation Steps

##### Sub-task 6.1: Essential Security Headers
- [ ] **Configure security headers**
  ```typescript
  // next.config.js
  const securityHeaders = [
    {
      key: 'X-DNS-Prefetch-Control',
      value: 'on'
    },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=63072000; includeSubDomains; preload'
    },
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block'
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY'
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff'
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin'
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), payment=self'
    }
  ]
  ```

##### Sub-task 6.2: Feature Policy
- [ ] **Configure feature policy**
  ```typescript
  {
    key: 'Permissions-Policy',
    value: [
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=()',
      'battery=()',
      'camera=()',
      'cross-origin-isolated=()',
      'display-capture=()',
      'document-domain=()',
      'encrypted-media=()',
      'execution-while-not-rendered=()',
      'execution-while-out-of-viewport=()',
      'fullscreen=()',
      'geolocation=()',
      'gyroscope=()',
      'keyboard-map=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'navigation-override=()',
      'payment=self',
      'picture-in-picture=()',
      'publickey-credentials-get=()',
      'screen-wake-lock=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=()',
      'xr-spatial-tracking=()'
    ].join(', ')
  }
  ```

---

## Database Security

### 🔒 Task 7: Database Security Hardening

#### Objective
Implement Row Level Security and secure database access patterns.

#### Implementation Steps

##### Sub-task 7.1: Row Level Security (RLS)
- [ ] **Enable RLS on all tables**
  ```sql
  -- Enable RLS on users table
  ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  
  -- Create policy for users to only see their own data
  CREATE POLICY "Users can only see their own data" ON users
    FOR ALL USING (auth.uid() = id);
  
  -- Enable RLS on academy-specific tables
  ALTER TABLE academies ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Academy members can only see their academy" ON academies
    FOR ALL USING (
      id IN (
        SELECT academy_id FROM users 
        WHERE id = auth.uid()
      )
    );
  ```

##### Sub-task 7.2: Secure Query Patterns
- [ ] **Implement parameterized queries**
  ```typescript
  // SECURE: Using Supabase client with proper filtering
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('academy_id', academyId)
    .eq('user_id', userId)
  
  // AVOID: String concatenation in raw SQL
  // const query = `SELECT * FROM students WHERE academy_id = '${academyId}'`
  ```

##### Sub-task 7.3: Database Access Auditing
- [ ] **Implement database access logging**
  ```typescript
  // Create audit log table
  CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
  );
  ```

---

## Frontend Security

### 🔒 Task 8: Client-Side Security

#### Objective
Implement client-side security measures and secure coding practices.

#### Implementation Steps

##### Sub-task 8.1: XSS Prevention
- [ ] **Implement comprehensive XSS prevention**
  ```typescript
  // Use DOMPurify for user-generated content
  import DOMPurify from 'dompurify'
  
  const SafeHTML = ({ content }: { content: string }) => {
    const cleanContent = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: []
    })
    
    return <div dangerouslySetInnerHTML={{ __html: cleanContent }} />
  }
  ```

##### Sub-task 8.2: Secure Local Storage
- [ ] **Implement secure local storage wrapper**
  ```typescript
  class SecureStorage {
    private static encrypt(data: string): string {
      // Implement encryption logic
      return btoa(data) // Simple base64 for demo
    }
    
    private static decrypt(data: string): string {
      try {
        return atob(data)
      } catch {
        return ''
      }
    }
    
    static setItem(key: string, value: any): void {
      const encrypted = this.encrypt(JSON.stringify(value))
      localStorage.setItem(key, encrypted)
    }
    
    static getItem<T>(key: string): T | null {
      const encrypted = localStorage.getItem(key)
      if (!encrypted) return null
      
      try {
        const decrypted = this.decrypt(encrypted)
        return JSON.parse(decrypted)
      } catch {
        return null
      }
    }
  }
  ```

##### Sub-task 8.3: Component Security
- [ ] **Secure component patterns**
  ```typescript
  // Secure image component with loading validation
  const SecureImage = ({ src, alt, ...props }: ImageProps) => {
    const [isValid, setIsValid] = useState(false)
    
    const validateImageUrl = (url: string) => {
      try {
        const parsedUrl = new URL(url)
        const allowedDomains = ['images.unsplash.com', 'cdn.example.com']
        return allowedDomains.includes(parsedUrl.hostname)
      } catch {
        return false
      }
    }
    
    useEffect(() => {
      setIsValid(validateImageUrl(src))
    }, [src])
    
    if (!isValid) {
      return <div className="bg-gray-200 p-4">Invalid image source</div>
    }
    
    return <img src={src} alt={alt} {...props} />
  }
  ```

---

## Security Testing

### 🧪 Task 9: Security Testing Implementation

#### Objective
Implement comprehensive security testing strategies.

#### Implementation Steps

##### Sub-task 9.1: Automated Security Testing
- [ ] **Set up security testing tools**
  ```bash
  # Install security testing dependencies
  npm install --save-dev @typescript-eslint/eslint-plugin-security
  npm install --save-dev eslint-plugin-security
  ```

##### Sub-task 9.2: OWASP Testing
- [ ] **Implement OWASP top 10 tests**
  ```typescript
  // security.test.ts
  describe('Security Tests', () => {
    test('prevents SQL injection in search', async () => {
      const maliciousInput = "'; DROP TABLE users; --"
      const response = await searchStudents(maliciousInput)
      expect(response.error).toBeFalsy()
      expect(response.data).toBeDefined()
    })
    
    test('prevents XSS in user input', () => {
      const maliciousScript = '<script>alert("xss")</script>'
      const sanitized = DOMPurify.sanitize(maliciousScript)
      expect(sanitized).not.toContain('<script>')
    })
    
    test('validates CSRF tokens', async () => {
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 100 })
        // Missing CSRF token
      })
      expect(response.status).toBe(403)
    })
  })
  ```

##### Sub-task 9.3: Penetration Testing
- [ ] **Set up automated security scanning**
  ```yaml
  # .github/workflows/security.yml
  name: Security Scan
  on: [push, pull_request]
  jobs:
    security:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - name: Run security audit
          run: npm audit
        - name: Run dependency check
          run: npx audit-ci --moderate
  ```

---

## Monitoring & Incident Response

### 📊 Task 10: Security Monitoring

#### Objective
Implement comprehensive security monitoring and alerting.

#### Implementation Steps

##### Sub-task 10.1: Security Event Logging
- [ ] **Implement security event tracking**
  ```typescript
  interface SecurityEvent {
    type: 'failed_login' | 'suspicious_activity' | 'access_denied' | 'csp_violation'
    userId?: string
    ip: string
    userAgent: string
    timestamp: Date
    details: Record<string, any>
  }
  
  const logSecurityEvent = (event: SecurityEvent) => {
    // Log to security monitoring service
    console.error('[SECURITY]', event)
    
    // Send to external monitoring
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/security-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      })
    }
  }
  ```

##### Sub-task 10.2: Alerting Thresholds
- [ ] **Configure security alerts**
  ```typescript
  const SECURITY_THRESHOLDS = {
    FAILED_LOGINS_PER_MINUTE: 10,
    CSP_VIOLATIONS_PER_HOUR: 5,
    SUSPICIOUS_REQUESTS_PER_MINUTE: 50
  }
  
  const checkSecurityThresholds = async () => {
    const recentEvents = await getSecurityEvents(Date.now() - 60000) // Last minute
    
    if (recentEvents.failed_logins > SECURITY_THRESHOLDS.FAILED_LOGINS_PER_MINUTE) {
      await sendSecurityAlert('High number of failed login attempts')
    }
  }
  ```

---

## Compliance & Documentation

### 📋 Task 11: Security Documentation

#### Objective
Create comprehensive security documentation and compliance materials.

#### Implementation Steps

##### Sub-task 11.1: Security Policies
- [ ] **Create security policy documentation**
- [ ] **Document incident response procedures**
- [ ] **Create security training materials**
- [ ] **Document compliance requirements**

##### Sub-task 11.2: Regular Security Reviews
- [ ] **Schedule monthly security audits**
- [ ] **Create security checklist for deployments**
- [ ] **Document penetration testing procedures**
- [ ] **Create vulnerability disclosure process**

---

## Success Metrics

### 📊 Security Targets
- [ ] **Zero critical security vulnerabilities**
- [ ] **CSP compliance: 100%**
- [ ] **Security headers: All implemented**
- [ ] **XSS prevention: 100% coverage**
- [ ] **CSRF protection: All forms protected**
- [ ] **Authentication security: Rate limited and monitored**

### 📊 Monitoring Targets
- [ ] **Security event detection: <1 minute**
- [ ] **Incident response time: <15 minutes**
- [ ] **Vulnerability patching: <24 hours**
- [ ] **Security audit compliance: 100%**

This comprehensive security audit addresses all critical vulnerabilities and implements defense-in-depth strategies to protect user data and prevent security breaches.