import { cleanupExtractedText, extractTextFromFile } from '../file-text-extractor'

describe('cleanupExtractedText', () => {
  it('normalizes CRLF line endings to LF', () => {
    expect(cleanupExtractedText('a\r\nb\r\nc')).toBe('a\nb\nc')
  })

  it('collapses 3+ blank lines into 2', () => {
    expect(cleanupExtractedText('a\n\n\n\n\nb')).toBe('a\n\nb')
  })

  it('trims trailing whitespace on each line', () => {
    expect(cleanupExtractedText('a   \nb\t\nc')).toBe('a\nb\nc')
  })

  it('trims overall whitespace', () => {
    expect(cleanupExtractedText('\n\n  text  \n\n')).toBe('text')
  })

  it('handles an empty string', () => {
    expect(cleanupExtractedText('')).toBe('')
  })

  it('preserves intentional double newlines (paragraph breaks)', () => {
    expect(cleanupExtractedText('para one\n\npara two')).toBe('para one\n\npara two')
  })
})

describe('extractTextFromFile', () => {
  it('throws for an unsupported file type', async () => {
    await expect(
      extractTextFromFile(Buffer.from('x'), 'notes.rtf', 'application/rtf')
    ).rejects.toThrow(/Unsupported file type/)
  })

  // Note: PDF and DOCX extraction paths are not unit-tested here because they
  // require real sample fixtures and exercise third-party parsers. They are
  // better covered by manual/integration tests against real uploads.
})
