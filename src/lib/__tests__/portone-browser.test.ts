import { describeCheckoutFailure, isPortOneLoadFailure } from '../portone-browser'

describe('PortOne load failure detection', () => {
  const loaderError = new Error('[PortOne] Failed to load window.PortOne')

  it("recognises the loader's own rejection message", () => {
    expect(isPortOneLoadFailure(loaderError)).toBe(true)
    expect(isPortOneLoadFailure(loaderError.message)).toBe(true)
  })
  it('does not fire on PG or network errors', () => {
    expect(isPortOneLoadFailure(new Error('charge failed'))).toBe(false)
    expect(isPortOneLoadFailure(new Error('PortOne not configured'))).toBe(false)
    expect(isPortOneLoadFailure(undefined)).toBe(false)
  })
  it('gives the load failure its own remedy copy, in both languages', () => {
    expect(describeCheckoutFailure(loaderError, true)).toMatch(/결제 모듈을 불러오지 못했어요/)
    expect(describeCheckoutFailure(loaderError, false)).toMatch(/payment module could not be loaded/i)
  })
  it('passes any other message through, with a generic fallback', () => {
    expect(describeCheckoutFailure(new Error('카드 한도 초과'), true)).toBe('카드 한도 초과')
    expect(describeCheckoutFailure({}, false)).toBe('Payment failed.')
  })
})
