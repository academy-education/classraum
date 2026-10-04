/** @jest-environment node */
import { describeSubmitFailure, describeGradeFailure, classifySubmitStatus } from '@/lib/study/submit-error'

const SERVER_STRINGS = /bad payload|bad body|persist failed|session not found|unauthorized|invalid_enum|HTTP \d/

describe('submit / grade failure copy never exposes server internals', () => {
  it.each([null, 400, 401, 403, 404, 409, 429, 500, 502, 503])('status %s', status => {
    for (const ko of [false, true]) {
      const f = describeSubmitFailure(status, { error: 'bad payload', details: 'invalid_enum_value essay_choice' }, ko)
      expect(f.message).not.toMatch(SERVER_STRINGS)
      expect(describeGradeFailure(status, ko)).not.toMatch(SERVER_STRINGS)
    }
    // ...but the detail keeps them for the console.
    expect(describeSubmitFailure(status, { error: 'bad payload' }, false).detail).toContain(status == null ? 'no response' : `HTTP ${status}`)
  })

  it('every submit message says the answers are saved', () => {
    for (const s of [null, 400, 401, 404, 429, 500]) {
      expect(describeSubmitFailure(s, null, false).message).toMatch(/answers are saved/)
      expect(describeSubmitFailure(s, null, true).message).toMatch(/저장/)
    }
  })

  it('classifies statuses', () => {
    expect([null, 401, 429, 404, 400, 503].map(classifySubmitStatus))
      .toEqual(['network', 'auth', 'rate_limit', 'not_found', 'rejected', 'server'])
  })
})
