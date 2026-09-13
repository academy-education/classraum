/**
 * The review card must show the student what they were actually looking at.
 *
 * A student reported that reviewing a reading item showed neither the passage
 * nor the other options, so she could not tell what she had chosen between —
 * and asking the AI why the other choices were wrong produced nothing useful,
 * because the model was never sent the passage either.
 *
 * None of that was missing data. Measured over the notebook's whole population
 * on 2026-09-13: of 2,246 wrong attempts, 1,755 (78.1%) already carried a
 * non-empty `passage` and 2,045 (91.1%) carried `choices`. Both were on the
 * wire and undeclared in the TypeScript interfaces, so the UI never read them.
 *
 * These assertions are on the SOURCE rather than a render, because the defect
 * was that a field was never referenced at all — a render test over a fixture
 * whose type does not declare the field cannot express the bug.
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(__dirname, '..', '..', '..', '..', p), 'utf8')
const CARD = read('app/mobile/study/_shared/WrongNotebookView.tsx')
const ROUTE = read('app/api/study/wrong-notebook/route.ts')
const EXPLAIN_UI = read('app/mobile/study/_shared/ExplainMore.tsx')
const EXPLAIN_API = read('app/api/study/explain/route.ts')

/** Source with // and block comments removed, for assertions that a string is
 *  ABSENT — every file here documents what it dropped by naming it. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('review card shows the passage and every choice', () => {
  it('declares passage on both the server and client question types', () => {
    // Undeclared is invisible: this is the whole original defect.
    expect(ROUTE).toMatch(/passage\?: string \| null/)
    expect(CARD).toMatch(/passage\?: string \| null/)
  })

  it('reads the passage out of the entry and renders it', () => {
    expect(CARD).toContain('entry.question.passage')
    expect(CARD).toMatch(/passageText/)
  })

  it('treats a `Transcript:` passage as a listening script and strips the prefix', () => {
    // `passage` carries BOTH reading prose and the listening transcript; the
    // prefix is the only thing distinguishing them, and the student should not
    // read the word "Transcript:" as the first line of the script.
    expect(CARD).toMatch(/isTranscript/)
    // The detector and the stripper must use the SAME anchored pattern: a
    // passage merely containing the word "transcript" is not a transcript.
    expect(CARD).toContain("/^\\s*transcript:/i.test(rawPassage)")
    expect(CARD).toContain("replace(/^\\s*transcript:\\s*/i, '')")
  })

  it('maps over the full choices array rather than printing two lines', () => {
    expect(CARD).toMatch(/entry\.question\.choices!\.map/)
  })

  it('marks the student pick and the key distinctly', () => {
    // Red for what they chose, green for what was right.
    expect(CARD).toMatch(/rose-50/)
    expect(CARD).toMatch(/emerald-50/)
    expect(CARD).toMatch(/const picked = sameAnswer\(choice, entry\.student_answer\)/)
    expect(CARD).toMatch(/const correct = sameAnswer\(choice, entry\.question\.correct_answer\)/)
  })

  it('keeps the two-line fallback for item types that store no choices', () => {
    // 150 arrange_words, 53 fill_in_blanks and every speaking type store no
    // choices at all; they must not render an empty list.
    expect(CARD).toMatch(/hasChoiceList \?/)
  })

  it('renders the author-written reason a distractor is wrong', () => {
    // Usable on 839 of 2,246 (37.4%) — present as an array on 1,507, but on
    // the rest every `reason` is an empty string, so the array's presence is
    // the wrong denominator. Only non-empty text may render.
    expect(CARD).toContain('distractor_rationales')
    expect(CARD).toMatch(/reasonFor/)
    expect(CARD).toMatch(/\.reason\?\.trim\(\) \|\| ''/)
  })
})

describe('the AI is given the text it is asked about', () => {
  it('ExplainMore accepts a passage and sends it', () => {
    expect(EXPLAIN_UI).toMatch(/passage\?: string/)
    expect(EXPLAIN_UI).toMatch(/prompt, passage, choices/)
  })

  it('the explain route reads the passage into the model context', () => {
    expect(EXPLAIN_API).toMatch(/passage\?: string/)
    expect(EXPLAIN_API).toMatch(/const passage = \(body\.passage \?\? ''\)/)
    expect(EXPLAIN_API).toMatch(/PASSAGE \/ TRANSCRIPT/)
  })

  it('the card passes the passage down', () => {
    expect(CARD).toMatch(/passage=\{passageText \|\| undefined\}/)
  })
})

describe('the two languages make the same promise', () => {
  /* The student saw the English step-by-step name the wrong options and the
   * Korean one not. Both instructions were hedged — "Where relevant" and
   * "필요하면" — so the model was free to drop the distractors, and did so far
   * more often in Korean. Neither may hedge now. */
  /* Assert on the INSTRUCTION STRINGS, not the surrounding block. The first
   * draft of this test sliced from `const MODE_INSTRUCTION` and failed its own
   * negative assertions — the code comment above the strings QUOTES the old
   * hedged wording to explain why it changed, so `not.toMatch` found it in the
   * comment. A test that reads comments is testing the wrong bytes. */
  const modeBlock = EXPLAIN_API.slice(
    EXPLAIN_API.indexOf('const MODE_INSTRUCTION'),
    EXPLAIN_API.indexOf('export async function POST'),
  )
  const stepsBlock = modeBlock.slice(modeBlock.indexOf('steps: {'), modeBlock.indexOf('followup: {'))
  /** Just the quoted value of `en:` / `ko:` — no comments. */
  const instruction = (lang: 'en' | 'ko') => {
    const m = stepsBlock.match(new RegExp(`\\n\\s*${lang}: '((?:[^'\\\\]|\\\\.)*)'`))
    if (!m) throw new Error(`could not extract the ${lang} steps instruction`)
    return m[1]
  }
  const steps = { en: instruction('en'), ko: instruction('ko') }

  it('the English steps instruction is unconditional about the wrong options', () => {
    expect(steps.en).toMatch(/MUST account for every wrong one/)
    expect(steps.en).not.toMatch(/Where relevant/)
  })

  it('the Korean steps instruction is unconditional about the wrong options', () => {
    expect(steps.ko).toContain('오답을 하나도 빠짐없이 다뤄야 합니다')
    expect(steps.ko).not.toContain('필요하면')
  })

  it('the word cap leaves room to enumerate options in steps mode', () => {
    // A ~150-word cap and "account for every wrong option" are contradictory
    // instructions; the model obeyed the cap and dropped the options.
    expect(EXPLAIN_API).toMatch(/mode === 'steps'/)
    expect(EXPLAIN_API).toMatch(/under ~250 words/)
  })
})

describe('both locales carry every key the card renders', () => {
  // A key missing from ko.json renders its raw dotted path to the student.
  const en = JSON.parse(read('locales/en.json')).study.wrongNotebook
  const ko = JSON.parse(read('locales/ko.json')).study.wrongNotebook

  it.each(['passage', 'transcript', 'whyWrong', 'yourAnswer', 'noAnswer'])(
    'has %s in both languages', key => {
      expect(typeof en[key]).toBe('string')
      expect(typeof ko[key]).toBe('string')
      expect(en[key].length).toBeGreaterThan(0)
      expect(ko[key].length).toBeGreaterThan(0)
    })

  it('the two key sets are symmetric', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ko).sort())
  })
})

describe('saved explanations are kept per language', () => {
  /* The table was keyed (student_id, attempt_id) with the language in per-mode
   * `steps_lang` / `simpler_lang` / `followup_lang` columns, so generating the
   * Korean step-by-step OVERWROTE the English one: the student lost it on the
   * next reload, and flipping the toggle re-billed a model call for text
   * already paid for. Migration `study_attempt_explanations_per_language`
   * (2026-09-13) put language in the primary key and dropped those columns as
   * a second source of truth for what the key now says. Verified live: writing
   * en then ko leaves TWO rows, and re-writing en updates rather than
   * duplicating. */

  it('the write path keys the upsert on language', () => {
    expect(EXPLAIN_API).toMatch(/language: ko \? 'ko' : 'en'/)
    expect(EXPLAIN_API).toMatch(/onConflict: 'student_id,attempt_id,language'/)
  })

  it('the three *_lang columns are gone from every layer', () => {
    /* Assert over CODE, not comments. These files explain the migration by
     * naming the columns it dropped, and a bare `not.toMatch` finds them in
     * the prose — the same trap the steps-instruction test fell into above. */
    for (const src of [EXPLAIN_API, ROUTE, EXPLAIN_UI, CARD]) {
      const code = stripComments(src)
      expect(code).not.toMatch(/steps_lang/)
      expect(code).not.toMatch(/simpler_lang/)
      expect(code).not.toMatch(/followup_lang/)
    }
    const types = read('lib/database.types.ts')
    const block = types.slice(
      types.indexOf('      study_attempt_explanations: {'),
      types.indexOf('      study_attempt_explanations: {') + 1400,
    )
    expect(block).not.toMatch(/steps_lang/)
    expect(block).toMatch(/language/)
  })

  it('the read path keys its map by attempt AND language', () => {
    // Keyed by attempt alone it would silently keep whichever row came back
    // last — the same data loss in a new place.
    expect(ROUTE).toMatch(/\$\{e\.attempt_id as string\}:\$\{lang\}/)
    expect(ROUTE).toMatch(/select\('attempt_id, language, steps, simpler, followup, followup_question'\)/)
  })

  it('SERVER AND CLIENT PAYLOAD SHAPES AGREE — nothing in the compiler relates them', () => {
    /* `NotebookEntry` (server) and `Entry` (client) are separate declarations
     * of one JSON payload. The first draft of this change type-checked clean
     * while the client still read `saved_steps` from a payload that no longer
     * had it, so tsc is not evidence here and this assertion is. */
    /* TOP-LEVEL fields only — exactly two spaces of indent. The client spells
     * `saved` as an inline Record and the server via a named interface, so a
     * trimmed match also collected the inline type's nested keys and reported
     * a difference that was in my extractor, not in the payload. */
    const topLevel = (block: string) => block.split('\n')
      .map(l => l.match(/^ {2}([a-z_]+)\??:/)?.[1]).filter(Boolean).sort()
    const serverFields = topLevel(ROUTE.match(/interface NotebookEntry \{([\s\S]*?)\n\}/)?.[1] ?? '')
    const clientFields = topLevel(CARD.match(/interface Entry \{([\s\S]*?)\n\}/)?.[1] ?? '')
    expect(serverFields.length).toBeGreaterThan(5)
    expect(clientFields).toEqual(serverFields)
    expect(serverFields).toContain('saved')
    expect(serverFields).not.toContain('saved_steps')
  })

  it('ExplainMore seeds BOTH languages so the toggle does not re-bill', () => {
    expect(EXPLAIN_UI).toMatch(/for \(const l of \['en', 'ko'\] as Lang\[\]\)/)
    expect(EXPLAIN_UI).toMatch(/saved\?\.\[l\]/)
  })

  it('opens on the language that actually has saved work', () => {
    // A student returning to a card must not see an empty panel beside a
    // toggle that would reveal their own saved text.
    expect(EXPLAIN_UI).toMatch(/has\(language\) \|\| !has\(other\) \? language : other/)
  })
})
