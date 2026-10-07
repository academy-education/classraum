/** @jest-environment node */
import { isSchemaFailure, withSchemaRetry, STAGE_SCHEMA_RETRIES } from '../study/gradeRetry'

function named(name: string, message = name): Error {
  const e = new Error(message)
  e.name = name
  return e
}

const schemaErr = () => named('AI_NoObjectGeneratedError', 'No object generated: response did not match schema.')

beforeEach(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  jest.restoreAllMocks()
})

describe('isSchemaFailure', () => {
  it.each(['AI_NoObjectGeneratedError', 'AI_TypeValidationError', 'AI_JSONParseError', 'ZodError', 'SyntaxError'])(
    'treats %s as a schema failure', name => {
      expect(isSchemaFailure(named(name))).toBe(true)
    })

  it.each(['AI_APICallError', 'AI_RetryError', 'TypeError', 'Error', 'GradePersistError'])(
    'does not treat %s as a schema failure', name => {
      expect(isSchemaFailure(named(name))).toBe(false)
    })

  it('is false for non-errors', () => {
    expect(isSchemaFailure(undefined)).toBe(false)
    expect(isSchemaFailure('AI_NoObjectGeneratedError')).toBe(false)
  })
})

describe('withSchemaRetry', () => {
  it('allows at most 3 attempts by default', () => {
    expect(STAGE_SCHEMA_RETRIES).toBe(2)
  })

  it('returns the first success without retrying', async () => {
    const call = jest.fn().mockResolvedValue('ok')
    await expect(withSchemaRetry('rubric_grade', call)).resolves.toBe('ok')
    expect(call).toHaveBeenCalledTimes(1)
  })

  it('recovers from schema failures with the same inputs', async () => {
    const call = jest.fn()
      .mockRejectedValueOnce(schemaErr())
      .mockRejectedValueOnce(schemaErr())
      .mockResolvedValue({ overallBand: 2 })
    const onRetry = jest.fn()
    await expect(withSchemaRetry('rubric_grade', call, { onRetry })).resolves.toEqual({ overallBand: 2 })
    expect(call).toHaveBeenCalledTimes(3)
    expect(onRetry).toHaveBeenCalledTimes(2)
    expect(onRetry.mock.calls.map(c => c[0].attempt)).toEqual([1, 2])
    expect(onRetry.mock.calls[0][0].stage).toBe('rubric_grade')
    // Every retry is logged, so a recovered failure is still visible.
    expect(console.warn).toHaveBeenCalledTimes(2)
  })

  it('all retries fail → throws the last error, never a score', async () => {
    const errors = [schemaErr(), schemaErr(), named('AI_NoObjectGeneratedError', 'third')]
    let i = 0
    const call = jest.fn(async () => { throw errors[i++] })
    let result: unknown = 'not set'
    let thrown: unknown
    try {
      result = await withSchemaRetry('rubric_grade', call)
    } catch (e) {
      thrown = e
    }
    expect(thrown).toBe(errors[2])
    // Nothing was returned: no default object, no zero band.
    expect(result).toBe('not set')
    expect(call).toHaveBeenCalledTimes(1 + STAGE_SCHEMA_RETRIES)
  })

  it('does not retry a non-schema failure (network, provider, our bug)', async () => {
    const err = named('AI_APICallError', '500 from provider')
    const call = jest.fn().mockRejectedValue(err)
    await expect(withSchemaRetry('zero_gate', call)).rejects.toBe(err)
    expect(call).toHaveBeenCalledTimes(1)
  })

  it('stops retrying as soon as a non-schema error appears', async () => {
    const err = named('AI_APICallError', '429')
    const call = jest.fn().mockRejectedValueOnce(schemaErr()).mockRejectedValueOnce(err)
    await expect(withSchemaRetry('relevance_ladder', call)).rejects.toBe(err)
    expect(call).toHaveBeenCalledTimes(2)
  })
})
