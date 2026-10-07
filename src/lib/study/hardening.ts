/**
 * The co-founder hardening pass — pure rules, shared by the admin route, the
 * panel and scripts/study-bank/hardening-gate.ts.
 *
 * A save NEVER edits a live row. It produces the jsonb for a NEW staged row
 * (migration 124, study_item_hardening_stage) and the gate decides whether
 * that row replaces the original. Everything here is a pure function so the
 * rules can be pinned without a database.
 */

export type Band = 'easy' | 'medium' | 'hard'
export const BANDS: readonly Band[] = ['easy', 'medium', 'hard']

/** Only a super_admin may harden. An `admin` can read the QC page but this
 *  tool writes bank content, so it is narrower than requireAdmin. */
export const HARDENING_ROLE = 'super_admin'
export const canHarden = (role: string | null | undefined) => role === HARDENING_ROLE

/** The stored Question shape, as far as this tool touches it. Every other
 *  key (graphic, blanks, metadata) is carried through unchanged. */
export interface BankItemJson {
  prompt?: string | null
  passage?: string | null
  choices?: unknown
  correct_answer?: string | null
  explanation?: string | null
  distractor_rationales?: Array<{ choice?: string; reason?: string }> | null
  [k: string]: unknown
}

export interface HardeningEditInput {
  prompt?: string
  passage?: string | null
  choices?: string[]
  /** Index into `choices` of the key. Defaults to the original key's index. */
  correctIndex?: number
  explanation?: string
}

export type ChangedField = 'prompt' | 'passage' | 'choices' | 'correct_answer' | 'explanation'

export type ApplyResult =
  | { ok: true; item: BankItemJson; changed: ChangedField[] }
  | { ok: false; error: string }

export const LIMITS = { prompt: 4000, passage: 20000, choice: 1000, explanation: 8000 } as const

const normText = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()

/** The choices as strings, or null when this item's choices are not a plain
 *  string array (grid-ins, objects) — those are out of scope for the tool. */
export function stringChoices(item: BankItemJson): string[] | null {
  const c = item.choices
  if (!Array.isArray(c) || c.length < 2 || !c.every(x => typeof x === 'string')) return null
  return c as string[]
}

/**
 * Build the staged item from the original plus the co-founder's edit.
 *
 * Refuses (never repairs) anything the gate would only reject later:
 *   - an option set that changed size, has a blank, or two options that read
 *     the same once punctuation/case are ignored (the dedup key ignores them
 *     too, so two such options are one option to a student scanning);
 *   - a key index outside the options;
 *   - a passage edit on an item that shares its passage with siblings — the
 *     siblings would keep the old text and the set would stop agreeing;
 *   - an edit that changes no stem, passage or option text. Rewording only
 *     the explanation cannot make an item harder, and the database would
 *     refuse it anyway (it would collide with its own original on dedup_key).
 */
export function applyHardeningEdit(
  original: BankItemJson,
  edit: HardeningEditInput,
  opts: { passageShared: boolean },
): ApplyResult {
  const oldChoices = stringChoices(original)
  if (!oldChoices) return { ok: false, error: 'This item does not have a plain list of text options, so it cannot be edited here.' }
  const oldKeyIndex = oldChoices.indexOf(String(original.correct_answer ?? ''))
  if (oldKeyIndex < 0) return { ok: false, error: 'The original key is not one of its options; fix the item before hardening it.' }

  const prompt = edit.prompt ?? String(original.prompt ?? '')
  const passage = edit.passage === undefined ? (original.passage ?? null) : (edit.passage?.length ? edit.passage : null)
  const choices = edit.choices ?? oldChoices
  const keyIndex = edit.correctIndex ?? oldKeyIndex
  const explanation = edit.explanation ?? String(original.explanation ?? '')

  if (!prompt.trim()) return { ok: false, error: 'The question stem cannot be empty.' }
  if (prompt.length > LIMITS.prompt) return { ok: false, error: `The stem is longer than ${LIMITS.prompt} characters.` }
  if (passage && passage.length > LIMITS.passage) return { ok: false, error: `The passage is longer than ${LIMITS.passage} characters.` }
  if (!explanation.trim()) return { ok: false, error: 'The explanation cannot be empty — it is what a student reads after answering.' }
  if (explanation.length > LIMITS.explanation) return { ok: false, error: `The explanation is longer than ${LIMITS.explanation} characters.` }
  if (!Array.isArray(choices) || choices.some(c => typeof c !== 'string')) return { ok: false, error: 'Options must be text.' }
  if (choices.length !== oldChoices.length) return { ok: false, error: `Keep ${oldChoices.length} options; this edit has ${choices.length}.` }
  if (choices.some(c => !c.trim())) return { ok: false, error: 'An option is blank.' }
  if (choices.some(c => c.length > LIMITS.choice)) return { ok: false, error: `An option is longer than ${LIMITS.choice} characters.` }
  const seen = new Set<string>()
  for (const c of choices) {
    const k = normText(c)
    if (seen.has(k)) return { ok: false, error: `Two options read the same: "${c}".` }
    seen.add(k)
  }
  if (!Number.isInteger(keyIndex) || keyIndex < 0 || keyIndex >= choices.length) return { ok: false, error: 'Pick which option is the key.' }

  const passageChanged = (passage ?? '') !== (original.passage ?? '')
  if (passageChanged && opts.passageShared) {
    return { ok: false, error: 'This passage is shared with other questions. Edit the stem or an option instead; a passage change here would leave its siblings on the old text.' }
  }

  const changed: ChangedField[] = []
  if (prompt !== String(original.prompt ?? '')) changed.push('prompt')
  if (passageChanged) changed.push('passage')
  if (choices.some((c, i) => c !== oldChoices[i])) changed.push('choices')
  if (choices[keyIndex] !== original.correct_answer) changed.push('correct_answer')
  if (explanation !== String(original.explanation ?? '')) changed.push('explanation')

  const contentChanged = normText(prompt) !== normText(String(original.prompt ?? ''))
    || normText(passage ?? '') !== normText(original.passage ?? '')
    || [...choices].map(normText).sort().join('|') !== [...oldChoices].map(normText).sort().join('|')
  if (!contentChanged) {
    return { ok: false, error: 'Change the stem, the passage or an option. An explanation-only or reorder-only edit cannot make the item harder.' }
  }

  // Rationales are kept only for distractors whose text did not change; an
  // edited distractor's old rationale would explain a different option.
  const oldRationales = Array.isArray(original.distractor_rationales) ? original.distractor_rationales : []
  const key = choices[keyIndex]
  const distractor_rationales = choices.filter(c => c !== key).map(c => {
    const prior = oldRationales.find(r => r && r.choice === c)
    return { choice: c, reason: prior?.reason ?? '' }
  })

  return {
    ok: true,
    changed,
    item: { ...original, prompt, passage, choices, correct_answer: key, explanation, distractor_rationales },
  }
}

// ── The with-source grade ────────────────────────────────────────────

export interface GradeSample {
  /** The letter this sample chose, in ITS shown order. */
  pick: string | null
  difficulty: string | null
  second_defensible?: string | boolean | null
  note?: string | null
}

export interface GradeVerdict {
  pass: boolean
  /** Median of the samples' bands, or null when a sample gave none. */
  difficulty: Band | null
  onKey: number
  samples: number
  secondDefensible: number
  reasons: string[]
}

const bandOf = (d: string | null | undefined): Band | null => {
  const s = String(d ?? '').trim().toLowerCase()
  return (BANDS as readonly string[]).includes(s) ? (s as Band) : null
}

/** Median band of three (or any odd number of) samples; null if any sample
 *  gave no band — a missing grade is not a medium. */
export function medianBand(ds: Array<string | null | undefined>): Band | null {
  const bands = ds.map(bandOf)
  if (!bands.length || bands.some(b => b === null)) return null
  const idx = bands.map(b => BANDS.indexOf(b as Band)).sort((a, b) => a - b)
  return BANDS[idx[Math.floor((idx.length - 1) / 2)]]
}

const named = (v: GradeSample['second_defensible']) =>
  v === true || (typeof v === 'string' && v.trim() !== '' && !/^(none|no|false|null|-)$/i.test(v.trim()))

/**
 * The gate's verdict on one edited item from three with-source samples.
 *
 * Pass requires ALL of:
 *   - exactly three samples (fewer is not a measurement; the caller must
 *     not be able to pass an item on one grader's say-so);
 *   - every sample picked the key — the key is the one thing a co-founder
 *     edit can silently break, and on maths there is no sandbox recompute
 *     for a hand edit, so three cold solves ARE the key check;
 *   - a second defensible option named by fewer than two samples (the
 *     standing drop rule);
 *   - median difficulty HARD. A sound edit that is still medium is recorded
 *     and not swapped: the original is already a sound medium item.
 */
export function gradeVerdict(samples: GradeSample[], keyLetters: string[]): GradeVerdict {
  const reasons: string[] = []
  if (samples.length !== 3 || keyLetters.length !== 3) {
    return { pass: false, difficulty: null, onKey: 0, samples: samples.length, secondDefensible: 0, reasons: [`need exactly 3 samples with a key each, got ${samples.length}/${keyLetters.length}`] }
  }
  const onKey = samples.filter((s, i) => s.pick != null && s.pick.toUpperCase() === keyLetters[i].toUpperCase()).length
  const secondDefensible = samples.filter(s => named(s.second_defensible)).length
  const difficulty = medianBand(samples.map(s => s.difficulty))
  if (onKey < 3) reasons.push(`key reached by ${onKey}/3 samples`)
  if (secondDefensible >= 2) reasons.push(`a second defensible option named by ${secondDefensible}/3 samples`)
  if (difficulty === null) reasons.push('a sample gave no difficulty band')
  else if (difficulty !== 'hard') reasons.push(`median difficulty ${difficulty}, not hard`)
  return { pass: reasons.length === 0, difficulty, onKey, samples: 3, secondDefensible, reasons }
}

// ── What usually makes an item hard, per subskill (REGISTER findings) ─

export interface Hint { en: string; ko: string; source: string }

const GENERAL: Hint = {
  en: 'Ask: with the source covered, how many options stay legal? Lift difficulty with a stem condition or one distractor, not the key. Remove any sentence that tells the student the order of steps.',
  ko: '지문을 가렸을 때 몇 개의 선택지가 여전히 가능한가? 정답이 아니라 문제 조건이나 오답 하나를 바꿔 난이도를 올리세요. 풀이 순서를 알려주는 문장은 지우세요.',
  source: 'CLAUDE.md "can the OPTION SET alone decide it?"; REGISTER 2026-09-11 AM7I-19 vs AM7I-10',
}

const HINTS: Array<{ match: (f: string, s: string, d: string, sub: string) => boolean; hint: Hint }> = [
  {
    match: (f, s, d) => f === 'sat' && s === 'math' && d === 'Algebra',
    hint: {
      en: 'The one Algebra shape that reliably grades hard: a solution-count question with a trap candidate (the coefficient condition alone gives a wrong k; offer the coincident-lines value as an option). Check Desmos cannot slide past the insight. Never make a distractor the sign-flipped key or "the number from two lines ago".',
      ko: '대수에서 꾸준히 어렵게 평가되는 유형은 함정 후보가 있는 해의 개수 문제입니다(계수 조건만으로는 틀린 k가 나오고, 일치하는 직선의 값을 선택지로 제시). Desmos로 우회되지 않는지 확인하세요. 부호만 바꾼 정답이나 바로 앞 단계의 값을 오답으로 쓰지 마세요.',
      source: 'REGISTER 2026-10-02 Algebra v19, 2026-09-28 B8 sign-pair, 2026-09-11 sat-alg-hard-v4',
    },
  },
  {
    match: (f, s, d) => f === 'sat' && s === 'math' && d === 'Advanced Math',
    hint: {
      en: 'Hard Advanced Math items hide a trap the stem never flags: an extraneous root, a sign split in a rational inequality. Do not let one option be the only one written in the designed form (2000(1.1)^5 among decimals was solved blind).',
      ko: '어려운 고급 수학 문항은 문제에서 알려주지 않는 함정을 숨깁니다: 무연근, 유리부등식의 부호 분리. 설계된 형태로 쓰인 선택지가 하나뿐이면 안 됩니다.',
      source: 'REGISTER alg18/adv21 entries; A2 options-as-expressions finding',
    },
  },
  {
    match: (f, s, d) => f === 'sat' && s === 'reading_writing' && d === 'Standard English Conventions',
    hint: {
      en: 'Every hard SEC survivor so far tests a BOUNDARY (clause joins, supplements) where two options are each grammatical in isolation; form/agreement items have produced none. Hide agreement behind a long intervening phrase. Pronoun case is not on the digital SAT.',
      ko: '지금까지 살아남은 어려운 SEC 문항은 모두 경계(절 연결, 보충 요소)를 다루며, 두 선택지가 각각 따로 보면 문법적입니다. 형태/일치 문항은 어렵게 나온 적이 없습니다. 긴 삽입구 뒤에 일치를 숨기세요. 대명사 격은 디지털 SAT 범위가 아닙니다.',
      source: 'REGISTER 2026-10-04 SEC v10 (half A boundaries gave all 3 hard survivors); SEC9B-11/12 held',
    },
  },
  {
    match: (f, s, d) => f === 'sat' && s === 'reading_writing' && d === 'Craft and Structure',
    hint: {
      en: 'Give the distractors a two-move architecture too. If only the key describes two moves (concede-then-reverse) the set is solvable without the passage. For Words in Context, make several options fit the sentence frame so only the passage decides.',
      ko: '오답에도 두 단계 구조를 주세요. 정답만 두 단계(인정 후 반전)를 설명하면 지문 없이 풀립니다. 어휘 문항은 여러 선택지가 문장 틀에 맞도록 해서 지문만이 답을 결정하게 하세요.',
      source: 'REGISTER 2026-09-15 shipped C&S bank (two-move distractors); CLAUDE.md axis rule',
    },
  },
  {
    match: (f, s, d) => f === 'sat' && s === 'reading_writing' && d === 'Information and Ideas',
    hint: {
      en: 'The key must need two parts of the text, not paraphrase one sentence (the most common reason a with-source grader calls these easy). Make distractors true in the world but unsupported by THIS text.',
      ko: '정답은 한 문장을 바꿔 쓴 것이 아니라 지문의 두 부분을 결합해야 합니다(가장 흔한 쉬움 판정 이유). 오답은 세상에서는 사실이지만 이 지문으로는 뒷받침되지 않게 만드세요.',
      source: 'REGISTER 2026-09-16 sat-cs-v10 (CS10-05: key lifts a single stated sentence)',
    },
  },
  {
    match: (f, s, d) => f === 'sat' && s === 'reading_writing' && d === 'Expression of Ideas',
    hint: {
      en: 'Keep all four options in ONE frame that differs only along the axis the goal names; when each option performs a different rhetorical act the asked-for one is identifiable without reading.',
      ko: '네 선택지를 하나의 틀에 두고 목표가 지정한 축에서만 다르게 하세요. 선택지마다 다른 수사적 행위를 하면 읽지 않고도 답이 보입니다.',
      source: 'CLAUDE.md rsw vs v2 (100.0% vs 19-30.6% blind)',
    },
  },
  {
    match: (f, s) => f === 'act' && s === 'math',
    hint: {
      en: 'One sentence of scaffolding is the whole difference: "average speed over two legs" graded hard because the student must REJECT averaging the rates and nothing says so; the same idea with the legs handed over in order graded medium.',
      ko: '안내 문장 하나가 차이를 만듭니다: 두 구간의 평균 속력 문제는 속력을 평균 내면 안 된다는 것을 아무도 알려주지 않을 때 어려웠고, 구간을 순서대로 제시하면 보통이었습니다.',
      source: 'REGISTER 2026-09-11 ACT Math 299 -> 345 (AM7I-10 vs AM7I-19)',
    },
  },
  {
    match: (f, s) => f === 'act' && (s === 'reading' || s === 'science'),
    hint: {
      en: 'The key should not be retrievable from a single sentence or a single data point; require comparing two. Distractors that are true in the world but not shown in the passage/figure are the strong ones.',
      ko: '정답이 한 문장이나 한 데이터 값에서 바로 나오지 않게 두 가지를 비교하도록 하세요. 세상에서는 사실이지만 지문/그림에 없는 오답이 강한 오답입니다.',
      source: 'CLAUDE.md "where it saturates, the with-source half decides"',
    },
  },
  {
    match: (f, s) => f === 'act' && s === 'english',
    hint: {
      en: 'With-source graders called 86 of 120 recent ACT English items easy. Hard ones put two grammatical options side by side and decide on concision or the paragraph\'s logic, not on a rule that fails outright.',
      ko: '최근 ACT 영어 120문항 중 86개가 쉬움으로 평가되었습니다. 어려운 문항은 문법적으로 맞는 두 선택지를 나란히 두고 간결성이나 문단 논리로 결정합니다.',
      source: 'ledger.json act-english-v8 with-source stage (grader-median easy 86 / medium 33 / hard 1)',
    },
  },
  {
    match: (f, s) => (f === 'ssat' || f === 'isee') && s === 'verbal',
    hint: {
      en: 'Solvers pick "the harder, more test-like word" and that lands on hard keys. Make the distractors as rare and as test-like as the key so register alone decides nothing.',
      ko: '풀이자는 "더 어렵고 시험다운 단어"를 고르고, 그것이 어려운 정답에 맞아떨어집니다. 오답도 정답만큼 드물고 시험다운 단어로 만들어 어휘 수준만으로는 답이 나오지 않게 하세요.',
      source: 'REGISTER 2026-10-06 ssat-verbal-a18-hard (held, +14.2 options-only)',
    },
  },
  {
    match: (f, s) => (f === 'ssat' || f === 'isee') && s === 'math',
    hint: {
      en: 'Check for free eliminations a with-source reader sees without working: a range bound readable off the stem, an option set closed under the asked operation, the one option that is the no-denominator answer.',
      ko: '풀지 않고도 지울 수 있는 선택지가 있는지 확인하세요: 문제에서 바로 읽히는 범위, 묻는 연산에 닫힌 선택지 집합, 분모를 무시한 답 하나.',
      source: 'CLAUDE.md 2026-09-24 options-only attack withholds the stem',
    },
  },
]

export function hardeningHint(family: string, section: string, domain: string | null, subskill: string | null): Hint {
  const h = HINTS.find(x => x.match(family, section, domain ?? '', subskill ?? ''))
  return h ? h.hint : GENERAL
}
