/**
 * @jest-environment node
 *
 * Server-side extraction: it runs in an API route, reads Buffers and loads
 * adm-zip and @xmldom/xmldom. The suite default is jsdom, where the hwpx
 * path yields empty text, so testing it there would assert the wrong runtime.
 */
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

/**
 * HWPX — the one path that actually loads adm-zip and @xmldom/xmldom, and
 * until now the one with no coverage at all. That gap had teeth: both are
 * pulled in as `await import(...)`, a form that a grep for `from 'x'` and
 * `require('x')` misses, so on 2026-09-10 they were moved to
 * devDependencies as "imported by zero files". A test that opens a real
 * archive is what makes that claim checkable instead of arguable.
 *
 * The fixtures are built here rather than committed as binaries: an .hwpx is
 * a zip of XML, so adm-zip can write one in memory and the test stays
 * readable.
 */
async function makeHwpx(sections: Record<string, string>): Promise<Buffer> {
  const AdmZip = (await import('adm-zip')).default
  const zip = new AdmZip()
  for (const [name, xml] of Object.entries(sections)) {
    zip.addFile(name, Buffer.from(xml, 'utf8'))
  }
  return zip.toBuffer()
}

/** A section body. `hp:p` opens a paragraph, `hp:t` holds the text runs. */
const section = (...paragraphs: string[][]) =>
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<hml xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph">' +
  paragraphs
    .map(runs => `<hp:p>${runs.map(r => `<hp:t>${r}</hp:t>`).join('')}</hp:p>`)
    .join('') +
  '</hml>'

describe('extractTextFromFile — hwpx', () => {
  it('reads paragraphs out of a real archive, joining runs within a paragraph', async () => {
    const buf = await makeHwpx({
      'Contents/section0.xml': section(['첫 번째 문단'], ['두 번째 ', '문단']),
    })
    const { text, kind } = await extractTextFromFile(buf, '숙제.hwpx', '')
    expect(kind).toBe('hwpx')
    // The second paragraph proves runs are concatenated, not newline-joined —
    // Hangul splits mid-word across runs constantly, so this is the common case.
    expect(text).toBe('첫 번째 문단\n두 번째 문단')
  })

  it('orders sections numerically, not lexicographically', async () => {
    const buf = await makeHwpx({
      'Contents/section0.xml': section(['one']),
      'Contents/section2.xml': section(['three']),
      'Contents/section10.xml': section(['eleven']),
    })
    const { text } = await extractTextFromFile(buf, 'doc.hwpx', '')
    // A string sort puts section10 before section2 and the document reads out
    // of order. This is the assertion that catches that.
    expect(text).toBe('one\nthree\neleven')
  })

  it('ignores non-section entries in Contents/', async () => {
    const buf = await makeHwpx({
      'Contents/section0.xml': section(['body text']),
      'Contents/header.xml': section(['header junk']),
      'META-INF/manifest.xml': '<manifest/>',
    })
    const { text } = await extractTextFromFile(buf, 'doc.hwpx', '')
    expect(text).toBe('body text')
  })

  it('returns empty text for a zip with no section files', async () => {
    const buf = await makeHwpx({ 'mimetype': 'application/hwp+zip' })
    const { text, kind } = await extractTextFromFile(buf, 'empty.hwpx', '')
    expect(kind).toBe('hwpx')
    expect(text).toBe('')
  })
})
