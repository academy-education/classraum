# Checkout Security Fixes 🔴

## Overview
**Priority**: 🔴 Critical Security  
**File**: `/src/app/(app)/checkout/page.tsx`  
**Security Level**: High Risk  
**Estimated Effort**: 1 week  
**Dependencies**: Backend CSRF implementation, CSP setup

This component contains multiple critical security vulnerabilities that must be addressed immediately before production deployment.

---

## Security Vulnerabilities Identified

### 🚨 Critical Vulnerabilities

#### 1. Script Injection Vulnerability
**Severity**: 🔴 Critical  
**Lines**: 44-50
```typescript
// VULNERABLE CODE:
const script = document.createElement('script')
script.src = 'https://stgstdpay.inicis.com/stdjs/INIStdPay.js'
script.async = true
document.body.appendChild(script)
```
**Risk**: External script injection without integrity verification

#### 2. XSS via Form Manipulation
**Severity**: 🔴 Critical  
**Lines**: 170-209
```typescript
// VULNERABLE CODE:
form.innerHTML = ''
Object.entries(formFields).forEach(([key, value]) => {
  const input = document.createElement('input')
  input.value = String(value) // No sanitization
  form.appendChild(input)
})
```
**Risk**: Potential XSS if user data reaches form creation

#### 3. Type Safety Bypass
**Severity**: 🟠 High  
**Lines**: 212-214
```typescript
// UNSAFE CODE:
const windowWithINI = window as unknown as { INIStdPay: { pay: (formId: string) => void } }
windowWithINI.INIStdPay.pay('SendPayForm_id')
```
**Risk**: Type system bypass allows runtime errors

#### 4. No CSRF Protection
**Severity**: 🔴 Critical  
**Lines**: Payment form creation
**Risk**: Cross-site request forgery attacks

---

## Security Fix Implementation

### Task 1: Implement Subresource Integrity (SRI)

#### 🎯 Objective
Prevent script injection attacks by verifying external script integrity.

#### ✅ Implementation Steps
- [ ] **Generate SRI hash for INIStdPay.js**
  ```bash
  # Generate hash for external script
  curl -s https://stgstdpay.inicis.com/stdjs/INIStdPay.js | \
  openssl dgst -sha384 -binary | \
  openssl base64 -A
  ```

- [ ] **Implement secure script loading**
  ```typescript
  // SECURE IMPLEMENTATION:
  useEffect(() => {
    const scriptId = 'inicis-script'
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script')
      script.src = 'https://stgstdpay.inicis.com/stdjs/INIStdPay.js'
      script.integrity = 'sha384-[ACTUAL_HASH_HERE]' // Generated hash
      script.crossOrigin = 'anonymous'
      script.id = scriptId
      script.async = true
      
      // Add error handling
      script.onerror = () => {
        console.error('Failed to load payment script')
        setPaymentLoading(false)
        alert(t('checkout.scriptLoadError'))
      }
      
      document.body.appendChild(script)
    }
  }, [])
  ```

- [ ] **Add script loading verification**
- [ ] **Test with integrity hash validation**

#### 🧪 Testing Requirements
- [ ] **Verify script loads correctly with SRI**
- [ ] **Test script loading failure scenarios**
- [ ] **Validate hash generation process**

---

### Task 2: Implement Content Security Policy (CSP)

#### 🎯 Objective
Prevent script injection and other XSS attacks through CSP headers.

#### ✅ Implementation Steps
- [ ] **Configure CSP middleware**
  ```typescript
  // middleware.ts or next.config.js
  const securityHeaders = [
    {
      key: 'Content-Security-Policy',
      value: [
        "default-src 'self'",
        "script-src 'self' 'nonce-{NONCE}' https://stgstdpay.inicis.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "connect-src 'self' https://api.supabase.co",
        "form-action 'self' https://stgstdpay.inicis.com",
      ].join('; ')
    }
  ]
  ```

- [ ] **Implement nonce-based script execution**
  ```typescript
  // Generate unique nonce for each request
  const nonce = crypto.randomUUID()
  
  // Use nonce in script tags
  script.setAttribute('nonce', nonce)
  ```

- [ ] **Add CSP reporting endpoint**
- [ ] **Test CSP compliance across all pages**

#### 🧪 Testing Requirements
- [ ] **Verify CSP blocks unauthorized scripts**
- [ ] **Test legitimate script execution**
- [ ] **Validate CSP reporting functionality**

---

### Task 3: Add CSRF Protection

#### 🎯 Objective
Prevent cross-site request forgery attacks on payment forms.

#### ✅ Implementation Steps
- [ ] **Generate CSRF tokens**
  ```typescript
  // Generate CSRF token
  const generateCSRFToken = () => {
    return crypto.randomUUID() + '-' + Date.now()
  }
  
  // Store in secure httpOnly cookie
  const csrfToken = generateCSRFToken()
  document.cookie = `csrf-token=${csrfToken}; Secure; HttpOnly; SameSite=Strict`
  ```

- [ ] **Add CSRF token to payment forms**
  ```typescript
  const formFields = {
    // ... existing fields
    csrf_token: csrfToken,
    // Double-submit cookie pattern
    csrf_cookie: getCsrfTokenFromCookie(),
  }
  ```

- [ ] **Implement backend CSRF validation**
- [ ] **Add CSRF token refresh mechanism**

#### 🧪 Testing Requirements
- [ ] **Test CSRF token validation**
- [ ] **Verify protection against CSRF attacks**
- [ ] **Test token refresh scenarios**

---

### Task 4: Input Sanitization & Validation

#### 🎯 Objective
Prevent XSS attacks through proper input sanitization.

#### ✅ Implementation Steps
- [ ] **Install DOMPurify for sanitization**
  ```bash
  npm install dompurify
  npm install -D @types/dompurify
  ```

- [ ] **Implement input sanitization**
  ```typescript
  import DOMPurify from 'dompurify'
  
  // SECURE FORM CREATION:
  Object.entries(formFields).forEach(([key, value]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = DOMPurify.sanitize(key)
    
    // Sanitize and validate value
    const sanitizedValue = DOMPurify.sanitize(String(value))
    
    // Additional validation based on field type
    if (key === 'price') {
      if (!/^\d+$/.test(sanitizedValue)) {
        throw new Error('Invalid price format')
      }
    }
    
    input.value = sanitizedValue
    form.appendChild(input)
  })
  ```

- [ ] **Add form field validation**
  ```typescript
  const validateFormData = (formData: PaymentFormData) => {
    const errors: string[] = []
    
    // Validate required fields
    if (!formData.buyername?.trim()) {
      errors.push('Buyer name is required')
    }
    
    // Validate email format
    if (!isValidEmail(formData.buyeremail)) {
      errors.push('Valid email is required')
    }
    
    // Validate phone format
    if (!isValidPhone(formData.buyertel)) {
      errors.push('Valid phone number is required')
    }
    
    // Validate price
    if (!isValidPrice(formData.price)) {
      errors.push('Valid price is required')
    }
    
    return errors
  }
  ```

- [ ] **Implement length limits for all inputs**
- [ ] **Add server-side validation backup**

#### 🧪 Testing Requirements
- [ ] **Test XSS prevention with malicious inputs**
- [ ] **Verify sanitization doesn't break legitimate data**
- [ ] **Test validation error handling**

---

### Task 5: Secure Payment Form Handling

#### 🎯 Objective
Improve security of payment form creation and submission.

#### ✅ Implementation Steps
- [ ] **Add type-safe window object access**
  ```typescript
  // SECURE WINDOW OBJECT ACCESS:
  const handlePaymentSubmission = () => {
    // Check if INIStdPay is available
    if (typeof window === 'undefined') {
      throw new Error('Payment system not available')
    }
    
    const inicisWindow = window as any
    if (!inicisWindow.INIStdPay?.pay) {
      throw new Error('Payment system not loaded')
    }
    
    try {
      inicisWindow.INIStdPay.pay('SendPayForm_id')
    } catch (error) {
      console.error('Payment submission failed:', error)
      alert(t('checkout.paymentSystemError'))
    }
  }
  ```

- [ ] **Add payment timeout handling**
  ```typescript
  const PAYMENT_TIMEOUT = 30000 // 30 seconds
  
  const handlePaymentWithTimeout = () => {
    const timeoutId = setTimeout(() => {
      setPaymentLoading(false)
      alert(t('checkout.paymentTimeout'))
    }, PAYMENT_TIMEOUT)
    
    try {
      handlePaymentSubmission()
    } finally {
      clearTimeout(timeoutId)
    }
  }
  ```

- [ ] **Implement secure error handling**
- [ ] **Add payment form cleanup on unmount**

#### 🧪 Testing Requirements
- [ ] **Test payment timeout scenarios**
- [ ] **Test error handling for failed payments**
- [ ] **Verify form cleanup prevents data leaks**

---

## Additional Security Measures

### 🔒 Security Headers
```typescript
// Add to next.config.js or middleware
const securityHeaders = [
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
    value: 'payment=self'
  }
]
```

### 🔒 Environment Security
- [ ] **Secure environment variable handling**
- [ ] **Remove hardcoded URLs in favor of environment variables**
- [ ] **Add payment gateway configuration validation**

---

## Security Testing

### 🧪 Automated Security Tests
```typescript
// security.test.ts
describe('Checkout Security', () => {
  test('prevents XSS in form inputs', () => {
    const maliciousInput = '<script>alert("xss")</script>'
    const sanitized = DOMPurify.sanitize(maliciousInput)
    expect(sanitized).not.toContain('<script>')
  })
  
  test('validates CSRF tokens', async () => {
    const invalidToken = 'invalid-token'
    const response = await submitPayment({ csrfToken: invalidToken })
    expect(response.status).toBe(403)
  })
  
  test('blocks scripts without proper nonce', () => {
    const scriptWithoutNonce = document.createElement('script')
    scriptWithoutNonce.src = 'https://malicious-site.com/script.js'
    
    expect(() => {
      document.body.appendChild(scriptWithoutNonce)
    }).toThrow()
  })
})
```

### 🧪 Manual Security Testing
- [ ] **Penetration testing for payment flow**
- [ ] **XSS vulnerability scanning**
- [ ] **CSRF attack simulation**
- [ ] **Script injection testing**

---

## Monitoring & Alerting

### 📊 Security Monitoring
- [ ] **CSP violation reporting**
- [ ] **Failed payment attempt monitoring**
- [ ] **Suspicious form submission detection**
- [ ] **Script loading failure alerts**

### 📊 Security Metrics
- [ ] **CSP compliance score: 100%**
- [ ] **XSS prevention rate: 100%**
- [ ] **CSRF attack prevention: 100%**
- [ ] **Payment security audit score: A+**

---

## Deployment Checklist

### ✅ Pre-deployment Security Audit
- [ ] **All console.log statements removed**
- [ ] **SRI hashes verified and current**
- [ ] **CSP headers properly configured**
- [ ] **CSRF protection active**
- [ ] **Input validation comprehensive**
- [ ] **Error handling secure (no data leaks)**
- [ ] **Payment timeout properly implemented**
- [ ] **Security headers configured**

### ✅ Post-deployment Monitoring
- [ ] **CSP violation monitoring active**
- [ ] **Payment success rate maintained**
- [ ] **Security alert system operational**
- [ ] **Error tracking for security issues**

---

## Emergency Response Plan

### 🚨 Security Incident Response
1. **Immediate**: Disable payment processing if vulnerability exploited
2. **Assessment**: Determine scope and impact of security breach
3. **Containment**: Block malicious requests at CDN/firewall level
4. **Recovery**: Deploy security fixes via emergency deployment
5. **Communication**: Notify users if personal data potentially affected

### 🚨 Rollback Plan
- **Feature flag**: Instantly disable new payment flow
- **Backup system**: Fallback to previous payment implementation
- **User notification**: Clear communication about temporary service changes

---

This security refactor is absolutely critical and must be completed before any production deployment. The current implementation presents significant risks to user data and financial transactions.