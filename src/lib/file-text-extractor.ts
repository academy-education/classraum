/**
 * Server-side text extraction from binary document uploads.
 *
 * Split out so the API route stays thin and so the heavy libraries
 * (pdf-parse, mammoth) can be lazy-imported only when actually needed.
 * pdf-parse in particular has known side effects on module load in some
 * versions — keeping the import behind a function guards against that.
 */

export const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB upload limit
export const MAX_EXTRACTED_CHARS = 10_000 // must match client-side paste limit

export type FileKind = 'pdf' | 'docx' | 'hwp' | 'hwpx' | 'unknown'

export interface ExtractionResult {
  text: string
  kind: FileKind
}

function detectKind(filename: string, mime: string): FileKind {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.pdf') || mime === 'application/pdf') return 'pdf'
  if (
    lower.endsWith('.docx') ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx'
  }
  // HWP (Hangul Word Processor, Korean) — common in Korean education
  if (lower.endsWith('.hwpx')) return 'hwpx'
  if (lower.endsWith('.hwp')) return 'hwp'
  return 'unknown'
}

export async function extractTextFromFile(
  buffer: Buffer,
  filename: string,
  mime: string
): Promise<ExtractionResult> {
  const kind = detectKind(filename, mime)

  if (kind === 'pdf') {
    return { text: await extractFromPdf(buffer), kind }
  }
  if (kind === 'docx') {
    return { text: await extractFromDocx(buffer), kind }
  }
  if (kind === 'hwp') {
    return { text: await extractFromHwp(buffer), kind }
  }
  if (kind === 'hwpx') {
    return { text: await extractFromHwpx(buffer), kind }
  }
  throw new Error('Unsupported file type')
}

async function extractFromPdf(buffer: Buffer): Promise<string> {
  // Lazy import keeps the heavy dependency out of the cold-start path for
  // routes that don't use it, and avoids pdf-parse's known module-load issues.
  const pdfParseModule = await import('pdf-parse')
  const pdfParse = (pdfParseModule.default ?? pdfParseModule) as (b: Buffer) => Promise<{ text: string }>
  const result = await pdfParse(buffer)
  return cleanupExtractedText(result.text)
}

async function extractFromDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  // extractRawText preserves paragraph breaks but drops formatting — perfect
  // for feeding into the AI parser, which only cares about content.
  const { value } = await mammoth.extractRawText({ buffer })
  return cleanupExtractedText(value)
}

/**
 * Legacy HWP (Hangul Word Processor) binary format.
 * hwp.js walks the document and returns a tree of sections → paragraphs → chars.
 * Each char's `value` is either a Unicode codepoint (number) or the literal string.
 */
async function extractFromHwp(buffer: Buffer): Promise<string> {
  const hwp = await import('hwp.js')
  const doc = (hwp.parse ?? (hwp as unknown as { default: { parse: typeof hwp.parse } }).default?.parse)(
    // hwp.js expects a CFB$Blob — Buffer satisfies the shape
    buffer as unknown as Parameters<typeof hwp.parse>[0]
  )

  const paragraphs: string[] = []
  for (const section of doc.sections) {
    for (const paragraph of section.content) {
      let line = ''
      for (const ch of paragraph.content) {
        if (typeof ch.value === 'string') {
          line += ch.value
        } else if (typeof ch.value === 'number') {
          // Control chars (< 0x20) are formatting markers; render as spaces/newlines
          if (ch.value === 0 || ch.value === 0x0a || ch.value === 0x0d) {
            line += '\n'
          } else if (ch.value >= 0x20) {
            line += String.fromCodePoint(ch.value)
          }
        }
      }
      paragraphs.push(line.trim())
    }
  }

  return cleanupExtractedText(paragraphs.filter(Boolean).join('\n'))
}

/**
 * HWPX (Hangul Word Processor XML) — zip of XML files, similar to .docx.
 * Contents/section*.xml hold the body text inside <hp:t> elements.
 */
async function extractFromHwpx(buffer: Buffer): Promise<string> {
  const AdmZip = (await import('adm-zip')).default
  const { DOMParser } = await import('@xmldom/xmldom')

  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()

  // Prefer Contents/section*.xml in numeric order so the output reads
  // front-to-back. Anything else in Contents/ is ignored (metadata, headers).
  const sectionEntries = entries
    .filter(e => /^Contents\/section\d+\.xml$/i.test(e.entryName))
    .sort((a, b) => {
      const nA = parseInt(a.entryName.match(/section(\d+)/i)?.[1] ?? '0', 10)
      const nB = parseInt(b.entryName.match(/section(\d+)/i)?.[1] ?? '0', 10)
      return nA - nB
    })

  if (sectionEntries.length === 0) {
    // Not a valid HWPX or at least not a standard layout
    return ''
  }

  const parser = new DOMParser({
    errorHandler: { warning: () => {}, error: () => {}, fatalError: () => {} },
  })

  const parts: string[] = []
  for (const entry of sectionEntries) {
    const xml = entry.getData().toString('utf8')
    const doc = parser.parseFromString(xml, 'application/xml')
    // hp:t elements hold the text runs. Namespace-agnostic selector:
    const textNodes = doc.getElementsByTagName('*')
    let currentPara = ''
    for (let i = 0; i < textNodes.length; i++) {
      const node = textNodes.item(i)
      if (!node) continue
      // hp:p = paragraph boundary
      const localName = node.localName || node.nodeName.replace(/^[^:]*:/, '')
      if (localName === 'p') {
        if (currentPara.trim()) parts.push(currentPara.trim())
        currentPara = ''
        continue
      }
      if (localName === 't') {
        currentPara += node.textContent ?? ''
      }
    }
    if (currentPara.trim()) parts.push(currentPara.trim())
  }

  return cleanupExtractedText(parts.join('\n'))
}

/**
 * PDF extraction often leaves excessive whitespace and isolated page-number
 * lines. Compact it so we don't waste characters (and tokens) on junk.
 */
export function cleanupExtractedText(raw: string): string {
  return raw
    // Normalize line endings
    .replace(/\r\n?/g, '\n')
    // Collapse 3+ blank lines into 2
    .replace(/\n{3,}/g, '\n\n')
    // Strip leading/trailing whitespace on each line
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim()
}
