import fs from 'fs'
import path from 'path'

/**
 * BOTH SIGNUP DOORS MUST REDEEM THE FRIEND-INVITE CODE.
 *
 * `?ref=CODE` is stashed in localStorage the moment the auth page reads
 * it, so it survives whichever route the user then takes. The password
 * path redeems it at the end of handleSignUp. The OAuth path did not —
 * it left the code stashed for the study home's claim banner.
 *
 * That is not a lost code, which is why no test caught it and why it
 * would never appear in an error log: the user simply arrives without
 * the credits they were promised and has to notice a banner. The two
 * doors have to behave the same.
 *
 * This is a source-level guard rather than a render test because
 * `finishOAuthReturn` only runs on a real provider round-trip. It is
 * written to fail if the call is deleted from EITHER path — both
 * directions were checked by removing each call in turn.
 */

const repo = path.resolve(__dirname, '../../../..')
const AUTH_PAGE = 'src/app/auth/page.tsx'
const source = fs.readFileSync(path.join(repo, AUTH_PAGE), 'utf8')

/** The body of a named arrow/async function declared with `const`. */
function bodyOf(name: string): string {
  const start = source.indexOf(`const ${name} = `)
  expect(start).toBeGreaterThan(-1)
  const open = source.indexOf('{', start)
  expect(open).toBeGreaterThan(start)
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) return source.slice(open, i + 1)
    }
  }
  throw new Error(`unbalanced braces reading ${name}`)
}

describe('referral redeem parity across signup doors', () => {
  it('the helper both paths depend on still exists', () => {
    // If this is renamed, the two assertions below would silently stop
    // meaning anything, so anchor on it first.
    expect(source).toContain('async function redeemReferralCode(')
  })

  it('the password path redeems', () => {
    expect(bodyOf('handleSignUp')).toContain('redeemReferralCode(')
  })

  it('the OAuth return path redeems', () => {
    expect(bodyOf('finishOAuthReturn')).toContain('redeemReferralCode(')
  })

  it('the OAuth path redeems only on a session it is keeping', () => {
    // A 'blocked' outcome is signed out moments later. Redeeming against
    // it would burn a one-time code on an account the user never gets.
    const body = bodyOf('finishOAuthReturn')
    const at = body.indexOf('redeemReferralCode(')
    expect(at).toBeGreaterThan(-1)
    const guard = body.slice(Math.max(0, at - 400), at)
    expect(guard).toContain("result.kind === 'ok'")
  })

  it('the OAuth path reads the SAME stash the claim banner reads', () => {
    // Redeeming from anywhere else would leave the banner up afterwards,
    // offering a code that has already been spent.
    expect(bodyOf('finishOAuthReturn')).toContain('readPendingReferral()')
    expect(source).toContain('readPendingReferral')
  })
})
