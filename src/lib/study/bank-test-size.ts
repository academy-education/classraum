/**
 * How many study_item_bank ROWS one full test draws, per family/section.
 *
 * Read from the blueprints the assemblers use, never restated:
 *   sat    SAT_MODULE_CONFIG (sat-adaptive.ts): two modules of moduleSize
 *   act    ACT_BLUEPRINT (act-test.ts): `questions` of the block whose
 *          bankSection matches
 *   ssat / isee / map
 *          ADMISSION_BLUEPRINT (admission-tests.ts): the SUM over every block
 *          drawing from that bankSection — ISEE's Quantitative Reasoning and
 *          Mathematics Achievement both draw `math`, so one ISEE test uses
 *          37 + 47 math rows
 *   toefl  toeflSectionShape(section, 'upper').total.cards (assemble.ts):
 *          bank rows, not scored questions — a Complete-the-Words row is ten
 *          questions but one row. Both module-2 paths draw the same number of
 *          rows for every section today.
 *
 * Server-only: assemble.ts imports the service-role client.
 */
import { SAT_MODULE_CONFIG } from './sat-adaptive'
import { ACT_BLUEPRINT } from './act-test'
import { ADMISSION_BLUEPRINT, type AdmissionFamily } from './admission-tests'
import { toeflSectionShape, type ToeflSection } from './assemble'

const TOEFL_SECTIONS: readonly ToeflSection[] = ['reading', 'listening', 'writing', 'speaking']

export function bankRowsPerTest(family: string, section: string): number | null {
  if (family === 'sat') {
    const c = (SAT_MODULE_CONFIG as Record<string, { moduleSize: number } | undefined>)[section]
    return c ? c.moduleSize * 2 : null
  }
  if (family === 'act') {
    const b = ACT_BLUEPRINT.find(s => s.bankSection === section)
    return b ? b.questions : null
  }
  if (family === 'ssat' || family === 'isee' || family === 'map') {
    const n = ADMISSION_BLUEPRINT[family as AdmissionFamily]
      .filter(s => s.bankSection === section)
      .reduce((sum, s) => sum + s.questions, 0)
    return n > 0 ? n : null
  }
  if (family === 'toefl') {
    if (!(TOEFL_SECTIONS as readonly string[]).includes(section)) return null
    return toeflSectionShape(section as ToeflSection, 'upper').total.cards
  }
  return null
}
