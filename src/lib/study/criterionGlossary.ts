/**
 * Plain-English explanation of every rubric criterion.
 *
 * The rubrics themselves (responseRubrics.ts) carry a LABEL — "On-topic
 * response & elaboration", "Delivery (pace, pausing, intelligibility)" —
 * which is written for the grader prompt, not for a fifteen-year-old
 * reading their results. These are the same criteria said in a way a
 * student can act on.
 *
 * The two are kept in sync by a test that fails if either side gains a
 * key the other lacks, so a new rubric criterion cannot reach the screen
 * as a bare snake_case string.
 *
 * No runtime imports, so the glossary is reachable from jest without
 * dragging zod and the model SDKs into the suite.
 */

export interface CriterionGloss {
  /** Short display name. Shorter than the rubric's own label, which is
   *  written for a grader and runs to eight words. */
  short: string
  /** One sentence: what this criterion is measuring. */
  what: string
  /** One sentence: what raises it. Phrased as an action, because the
   *  point of naming a weak criterion is to say what to do about it. */
  raise: string
}

export const CRITERION_GLOSSARY: Record<string, CriterionGloss> = {
  // TOEFL Speaking — Take an Interview
  topic_relevance: {
    short: 'Staying on topic',
    what: 'Whether you answer the question that was actually asked, and develop it.',
    raise: 'Give a clear position, then two reasons with a real example each.',
  },
  delivery: {
    short: 'Delivery',
    what: 'How easy you are to follow — pace, pausing and clarity.',
    raise: 'Slow down slightly and finish sentences instead of restarting them.',
  },
  language_use: {
    short: 'Grammar & vocabulary',
    what: 'The range of language you reach for and how accurately you use it.',
    raise: 'Vary your sentence openings and swap one vague word per answer for a precise one.',
  },

  // TOEFL Writing — Write an Email
  task_fulfillment: {
    short: 'Covering the task',
    what: 'Whether you did everything the prompt asked, with enough detail.',
    raise: 'Check the bullet list in the prompt and give each point its own sentence.',
  },
  social_conventions: {
    short: 'Tone & politeness',
    what: 'Whether your register fits the person you are writing to.',
    raise: 'Open and close properly, and soften requests ("could you let me know…").',
  },
  language_facility: {
    short: 'Language range',
    what: 'The variety and accuracy of the words and structures you use.',
    raise: 'Join short sentences with because, although or which instead of listing them.',
  },

  // TOEFL Writing — Academic Discussion
  contribution: {
    short: 'Your own contribution',
    what: 'Whether you add something rather than restating the other speakers.',
    raise: 'Name a classmate, say where you agree, then add a point neither made.',
  },
  grammar_vocabulary: {
    short: 'Grammar & word choice',
    what: 'Precision in tense, agreement and the words you pick.',
    raise: 'Reread once for verb endings and articles before you submit.',
  },

  // TOEFL Speaking — Listen and Repeat
  repetition_accuracy: {
    short: 'Repetition accuracy',
    what: 'How closely your repetition matches the sentence you heard.',
    raise: 'Listen for the whole phrase before speaking rather than starting early.',
  },
  meaning_preservation: {
    short: 'Keeping the meaning',
    what: 'Whether the sentence still means the same thing after you repeat it.',
    raise: 'If you miss a word, keep the sentence intact rather than guessing a new one.',
  },
  intelligibility: {
    short: 'Being understood',
    what: 'Whether a listener can catch every word without effort.',
    raise: 'Finish word endings — the -s and -ed are where clarity is usually lost.',
  },

  // IELTS Writing Task 2
  task_response: {
    short: 'Answering the question',
    what: 'Whether you address every part of the task with a clear position.',
    raise: 'State your position in the introduction and keep every paragraph tied to it.',
  },
  coherence_cohesion: {
    short: 'Structure & flow',
    what: 'Whether your ideas are ordered and linked so they are easy to follow.',
    raise: 'One idea per paragraph, and open each with a sentence that states it.',
  },
  lexical_resource: {
    short: 'Vocabulary',
    what: 'The range and precision of the words you choose.',
    raise: 'Replace repeated words with a more exact alternative, not a longer one.',
  },
  grammatical_range: {
    short: 'Grammar range',
    what: 'The variety of structures you use and how accurately you control them.',
    raise: 'Use a conditional or a relative clause where you would normally use two sentences.',
  },

  // IELTS Speaking
  fluency_coherence: {
    short: 'Fluency',
    what: 'Whether you keep going without long pauses and stay on the topic.',
    raise: 'Keep talking through a hesitation instead of stopping to find the perfect word.',
  },
  pronunciation: {
    short: 'Pronunciation',
    what: 'How clearly individual sounds and stress patterns come across.',
    raise: 'Stress the content words; let the small grammar words stay unstressed.',
  },
}

/** Gloss for a key, or null when it is one we have not written yet —
 *  the UI then falls back to the humanised key rather than showing an
 *  empty explanation. */
export function glossFor(key: string): CriterionGloss | null {
  return CRITERION_GLOSSARY[key] ?? null
}
