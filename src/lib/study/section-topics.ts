/**
 * family → section → seed topic row, so a bank-assembled session
 * attaches to the right study topic. Section keys match the bank's
 * `section` column and the SECTION_CREDIT_COST keys in plans.ts.
 *
 * Lived inline in /api/study/test/assemble until camp mode needed the
 * same map (a Next route file may only export route handlers, so it
 * could not be imported from there).
 */
export const SECTION_TOPIC: Record<string, Record<string, string>> = {
  sat: {
    math: '6cf0bc6a-a430-4fe5-b03c-db031df8a691',            // sat-math
    reading_writing: 'fc784bfb-e3bd-48ea-a794-7da1fe219ba4',  // sat-reading-writing
  },
  toefl: {
    reading:   '33af1b61-bd97-4bd3-9cbf-843f9bb8a2a9',  // toefl-reading
    listening: '1ac8d73b-1e16-4a18-9e79-7fe2f012a202',  // toefl-listening
    writing:   'b6712354-2de8-4b7d-8b74-64cc7a520bba',  // toefl-writing
    speaking:  '0c729add-5617-4fbe-8a35-2af9f521757d',  // toefl-speaking
  },
}

/** Topic for a camp assignment's session: its own section when the
 *  teacher scoped the draw, otherwise the family's default section
 *  (mixed-section assignments have no single right answer; the topic
 *  only anchors the session row, grading reads the cached payload). */
export function campTopicId(family: string, section: string | null): string | null {
  const byFamily = SECTION_TOPIC[family]
  if (!byFamily) return null
  if (section && byFamily[section]) return byFamily[section]
  return family === 'sat' ? byFamily['reading_writing']! : byFamily['reading']!
}
