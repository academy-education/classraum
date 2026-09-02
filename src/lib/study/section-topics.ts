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
    // 2026-09-02: the ssat-quant-1 row was RENAMED to ssat-math and now
    // backs the single 50-question Math block; ssat-quant-2 and
    // ssat-experimental rows were deleted.
    math:    'f893611f-6cb3-44ce-a89d-0e08fdb5c9fd',  // ssat-math
    reading: '279e6668-d9a2-4ea9-900e-fbf5fc18222e',  // ssat-reading
    verbal:  '28834e18-d204-4ecc-883d-29628ff718c8',  // ssat-verbal
    writing: 'ba85cab2-ef6d-40fa-b7e1-32a7c3ec2d95',  // ssat-writing
  },
  /*
   * ACT, keyed by blueprint section key. The five topic rows predate the
   * bank work (they were seeded with the other test_prep parents) and are
   * reused rather than recreated; verify-section-topics.mjs checks each
   * uuid still resolves to the slug in its comment.
   */
  act: {
    english: 'c68f82a5-4b50-4235-9b41-aa94c4ab829b',  // act-english
    math:    '3b5f147b-3ba4-4be3-9515-06f9a9fd3799',  // act-math
    reading: '859131cb-f125-4d3e-861e-ba81821ee5f5',  // act-reading
    science: '8671e406-e939-4c30-8513-3a99fccac065',  // act-science
    writing: '21fcb0a0-7246-42c0-80f9-6728567d0780',  // act-writing
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
