import { isPlausibleEmail, suggestEmailFix } from '../email'

describe('isPlausibleEmail', () => {
  it('rejects the dotless-domain typo that reached production', () => {
    expect(isPlausibleEmail('keekoonom@gmailcom')).toBe(false)
  })
  it('accepts ordinary addresses, including subdomains and plus tags', () => {
    for (const e of ['a@gmail.com', 'first.last+tag@sub.example.co.kr', '  padded@naver.com ']) {
      expect(isPlausibleEmail(e)).toBe(true)
    }
  })
  it('rejects empty, missing @, missing local, trailing dot, and spaces', () => {
    for (const e of ['', 'gmail.com', '@gmail.com', 'a@gmail.com.', 'a b@gmail.com', 'a@.com', null, undefined]) {
      expect(isPlausibleEmail(e)).toBe(false)
    }
  })
})

describe('suggestEmailFix', () => {
  it('offers the dotted domain for a known domain typed without its dots', () => {
    expect(suggestEmailFix('keekoonom@gmailcom')).toBe('keekoonom@gmail.com')
    expect(suggestEmailFix('Kim@NAVERCOM')).toBe('Kim@naver.com')
    expect(suggestEmailFix('x@hanmailnet')).toBe('x@hanmail.net')
  })
  it('stays silent when the domain already has a dot or is not a known domain', () => {
    expect(suggestEmailFix('a@gmail.com')).toBeNull()
    expect(suggestEmailFix('a@companycom')).toBeNull()
    expect(suggestEmailFix('nodomain')).toBeNull()
    expect(suggestEmailFix('@gmailcom')).toBeNull()
  })
})
