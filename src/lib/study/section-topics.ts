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
  /*
   * SSAT and ISEE are keyed by BLUEPRINT BLOCK KEY, not by bank section.
   * The two differ for these families and only these: SSAT delivers two
   * separate quantitative blocks that both draw from section 'math', and
   * ISEE delivers Quantitative Reasoning and Mathematics Achievement the
   * same way. A map keyed by bank section could not name them apart, and
   * a student's two SSAT quant sittings would attach to one topic.
   */
  ssat: {
    writing: 'ba85cab2-ef6d-40fa-b7e1-32a7c3ec2d95',  // ssat-writing
    quant1:  'f893611f-6cb3-44ce-a89d-0e08fdb5c9fd',  // ssat-quant-1
    reading: '279e6668-d9a2-4ea9-900e-fbf5fc18222e',  // ssat-reading
    verbal:  '28834e18-d204-4ecc-883d-29628ff718c8',  // ssat-verbal
    quant2:  '0c9bc853-9f42-4f33-a79f-206bbd183398',  // ssat-quant-2
  },
  isee: {
    verbal:  '0d1696f0-de6e-4370-97ba-756e6cacea9f',  // isee-verbal
    quant:   '68a96b37-a37b-43aa-bc45-5e8451cb432c',  // isee-quant-reasoning
    reading: 'd6bf9e8c-fa7c-463a-a61b-0d958db7447f',  // isee-reading
    mathach: 'fa7876ea-0d61-4623-9b27-47a7fc3a9150',  // isee-math-achievement
    essay:   '423e647d-5f83-471d-85b5-92d8324780d7',  // isee-essay
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
