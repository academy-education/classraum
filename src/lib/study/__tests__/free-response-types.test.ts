/** @jest-environment node */
/**
 * SSAT Writing Sample and ISEE Essay were banked with a question type
 * the draw did not know ('essay', 'essay_choice') and a null
 * correct_answer the reader rejected. Both sections therefore threw
 * "no verified items" for any student who selected them — they had
 * NEVER been servable, and verify-admission-forms.mjs reported them as
 * fine because it counted rows without applying the reader's contract.
 *
 * This pins the type list, which is the load-bearing half of the fix.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const assemble = readFileSync(join(process.cwd(), 'src/lib/study/assemble.ts'), 'utf8')
const verify = readFileSync(join(process.cwd(), 'src/lib/test-verify.ts'), 'utf8')
const checker = readFileSync(join(process.cwd(), 'scripts/study-bank/verify-admission-forms.mjs'), 'utf8')
const helper = readFileSync(join(process.cwd(), 'scripts/study-bank/essay-bank-helper.mjs'), 'utf8')

describe('the essay types are known everywhere they must be', () => {
  it.each(['essay', 'essay_choice'])('%s is in the QuestionType union', t => {
    expect(verify).toMatch(new RegExp(`'${t}'`))
  })

  it.each(['essay', 'essay_choice'])("%s is in assemble's QUESTION_TYPES", t => {
    // A type missing here makes readBankItem return null, which the draw
    // logs as "malformed" and skips — so the section empties silently.
    const list = assemble.slice(assemble.indexOf('const QUESTION_TYPES'), assemble.indexOf('] as const'))
    expect(list).toContain(`'${t}'`)
  })

  it.each(['essay', 'essay_choice'])('%s is known to the form checker too', t => {
    // The checker gave writing a clean bill while it was unservable,
    // because it counted rows the assembler discards.
    expect(checker).toContain(`'${t}'`)
  })

  it('the form checker reads the item column it needs to judge a row', () => {
    // It selected only id,passage_group_id, so the contract saw
    // undefined for every row and reported 0 drawable everywhere.
    expect(checker).toMatch(/\.select\('id,passage_group_id,item'\)/)
  })

  it('the bank helper writes an empty-string key, never null', () => {
    // The bank's convention for free response, set by 182 live TOEFL
    // writing rows, is '' — not null.
    expect(helper).not.toMatch(/correct_answer:\s*null/)
    expect(helper).toMatch(/correct_answer:\s*''/)
  })
})
