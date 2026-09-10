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

/**
 * PDF — a CONTRACT test, not a parse test.
 *
 * This path was broken exactly like the hwpx one: pdf-parse 2.x exports a
 * `PDFParse` class, the code asked for a callable default and cast until it
 * compiled, and every upload threw "pdfParse is not a function".
 *
 * Actually parsing a PDF here is not possible: pdfjs-dist loads its worker
 * through a dynamic import that jest's CJS VM refuses without
 * --experimental-vm-modules, and turning that on globally to test one
 * function is a bad trade. So this asserts the thing that actually broke —
 * the shape of the module we import — which is cheap, runs anywhere, and
 * fails the moment the package changes its exports again.
 *
 * End-to-end PDF extraction is covered by uploading a real PDF to
 * /api/assignments/extract-text.
 */
describe('extractFromPdf — module contract', () => {
  it('pdf-parse still exports the PDFParse class this file calls', async () => {
    const mod = await import('pdf-parse')
    expect(typeof mod.PDFParse).toBe('function')
    expect(typeof mod.PDFParse.prototype.getText).toBe('function')
    expect(typeof mod.PDFParse.prototype.destroy).toBe('function')
  })

  it('does NOT export a callable default — the shape this file used to assume', async () => {
    // Kept as a live assertion rather than a comment: if pdf-parse ever
    // restores a callable default, this fails and someone re-reads the code
    // above instead of discovering it through a broken upload.
    const mod: Record<string, unknown> = await import('pdf-parse')
    expect(typeof mod.default).not.toBe('function')
  })
})

/**
 * DOCX and legacy HWP — the two remaining lazy imports in this file.
 *
 * Two of the four extraction paths here were found silently broken on
 * 2026-09-10 and -11 (hwpx threw on the parser options, pdf threw because
 * pdf-parse stopped exporting a callable default). Both had shipped for
 * months. These cover the other two so the file stops being a place where
 * that can happen unnoticed.
 *
 * A .docx is a zip of XML like .hwpx, so the fixture is built here too and
 * runs through mammoth for real rather than through a mock.
 */
async function makeDocx(paragraphs: string[]): Promise<Buffer> {
  const AdmZip = (await import('adm-zip')).default
  const zip = new AdmZip()
  zip.addFile('[Content_Types].xml', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>', 'utf8'))
  zip.addFile('_rels/.rels', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>', 'utf8'))
  zip.addFile('word/document.xml', Buffer.from(
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    paragraphs.map(t => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`).join('') +
    '</w:body></w:document>', 'utf8'))
  return zip.toBuffer()
}

describe('extractTextFromFile — docx', () => {
  it('extracts paragraphs from a real .docx', async () => {
    const buf = await makeDocx(['첫째 줄', 'Second line'])
    const { text, kind } = await extractTextFromFile(
      buf, '과제.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    expect(kind).toBe('docx')
    expect(text).toContain('첫째 줄')
    expect(text).toContain('Second line')
  })
})

describe('extractFromHwp — module contract', () => {
  // Legacy .hwp is a binary CFB format; there is no readable way to build a
  // fixture inline, and a committed binary would not say what it contains.
  // So this asserts the shape the code depends on, which is the thing that
  // rotted in the other two paths.
  it('hwp.js still exports the parse function this file calls', async () => {
    const mod = await import('hwp.js')
    const parse = mod.parse ?? (mod as unknown as { default?: { parse?: unknown } }).default?.parse
    expect(typeof parse).toBe('function')
  })
})

describe('mammoth — module contract', () => {
  it('still exports extractRawText', async () => {
    const mammoth = await import('mammoth')
    expect(typeof mammoth.extractRawText).toBe('function')
  })
})
