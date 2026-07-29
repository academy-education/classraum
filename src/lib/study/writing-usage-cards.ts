/**
 * TOEFL Writing usage cards.
 *
 * NOT word→definition. A TOEFL writer's problem is almost never "what
 * does `nevertheless` mean" — it is failing to reach for it, or reaching
 * for it in the wrong pattern. Recognition is already there; production
 * is what the rubric scores (`language_facility`, `grammar_vocabulary`).
 *
 * So each card carries three things:
 *
 *   front   the headword and its part of speech — the retrieval cue
 *   hint    the grammatical PATTERN, plus the error to avoid. Revealed
 *           on tap, so it scaffolds rather than gives the answer away.
 *   back    a one-line sense, then a model sentence in the register the
 *           task is actually scored in (academic discussion / email).
 *
 * The `avoid` line is the load-bearing part and is written against
 * errors a Korean-L1 writer actually makes — article drop, wrong
 * preposition, and using a noun where English wants a verb. A card that
 * only says "contribute: to give" teaches nothing the student did not
 * already have.
 *
 * Every headword must be on the Academic Word List sublists 1–3
 * (src/lib/study/awl.ts). That is enforced by a test, not by care: it is
 * the difference between "TOEFL-level words" as a claim and as a
 * property.
 *
 * No runtime imports — the deck is data, and the checks that guard it
 * have to run in jest.
 */

export interface UsageCard {
  /** AWL headword. Lowercase, uninflected — the AWL gate matches on it. */
  headword: string
  pos: 'v' | 'n' | 'adj' | 'adv'
  /** The pattern to internalise, e.g. "contribute TO something". */
  pattern: string
  /** The mistake this card is designed to prevent. */
  avoid: string
  /** One-line sense, in plain English. */
  sense: string
  /** Model sentence in TOEFL Writing register. MUST contain an
   *  inflection of the headword — asserted by a test, because a model
   *  sentence that never uses the word is the most useless card
   *  possible and is easy to write by accident. */
  example: string
}

export const WRITING_USAGE_CARDS: UsageCard[] = [
  // ── Making and supporting a claim ──────────────────────────────
  {
    headword: 'contribute', pos: 'v',
    pattern: 'contribute TO something (not "contribute in")',
    avoid: 'Do not write "contribute in the discussion".',
    sense: 'to be one of the causes of something, or to add to it',
    example: 'Longer feedback contributes to a fairer assessment than a single grade does.',
  },
  {
    headword: 'demonstrate', pos: 'v',
    pattern: 'demonstrate THAT + clause',
    avoid: 'Stronger than "show"; do not use it for a personal feeling.',
    sense: 'to prove something clearly with evidence',
    example: 'The study demonstrates that students retain more when they are tested weekly.',
  },
  {
    headword: 'illustrate', pos: 'v',
    pattern: 'X illustrates Y  /  as this example illustrates',
    avoid: 'Use it for an EXAMPLE, not for proof — that is "demonstrate".',
    sense: 'to make something clear by giving an example',
    example: 'My own experience illustrates why a strict deadline can help rather than hinder.',
  },
  {
    headword: 'imply', pos: 'v',
    pattern: 'X implies THAT + clause',
    avoid: 'The writer implies; the reader INFERS. Do not swap them.',
    sense: 'to suggest something without saying it directly',
    example: "Marcus's argument implies that grades and motivation are unrelated.",
  },
  {
    headword: 'justify', pos: 'v',
    pattern: 'justify + noun / justify + -ing',
    avoid: 'Not "justify to do". Use a gerund.',
    sense: 'to give a good reason for something',
    example: 'The cost of the programme is difficult to justify given how few students enrol.',
  },
  {
    headword: 'indicate', pos: 'v',
    pattern: 'indicate THAT + clause',
    avoid: 'Weaker than "prove" — use it when the evidence only points.',
    sense: 'to show or suggest that something is true',
    example: 'Attendance records indicate that the change had little effect on participation.',
  },
  {
    headword: 'assume', pos: 'v',
    pattern: 'assume THAT + clause',
    avoid: 'An assumption is UNPROVEN. Do not use it to mean "conclude".',
    sense: 'to accept something as true without proof',
    example: 'Priya assumes that every student has reliable internet access at home.',
  },
  {
    headword: 'emphasis', pos: 'n',
    pattern: 'place / put emphasis ON something',
    avoid: 'The verb is "emphasise" and takes no preposition: emphasise X.',
    sense: 'special importance given to something',
    example: 'Too much emphasis on final exams discourages steady work across the term.',
  },

  // ── Conceding and qualifying ───────────────────────────────────
  {
    headword: 'considerable', pos: 'adj',
    pattern: 'a considerable + uncountable noun (amount, effort, time)',
    avoid: 'Not "considerable students" — it does not count things.',
    sense: 'large in amount or degree',
    example: 'Preparing a portfolio requires considerable time that part-time students rarely have.',
  },
  {
    headword: 'alternative', pos: 'n',
    pattern: 'an alternative TO something',
    avoid: 'Not "alternative of". As an adjective it needs no preposition.',
    sense: 'another option that could be chosen instead',
    example: 'Written feedback is a realistic alternative to a numerical grade.',
  },
  {
    headword: 'constrain', pos: 'v',
    pattern: 'be constrained BY something',
    avoid: 'Usually passive. "Constraint" is the noun.',
    sense: 'to limit what someone can do',
    example: 'Teachers are constrained by class sizes that make individual comments impossible.',
  },
  {
    headword: 'relevant', pos: 'adj',
    pattern: 'relevant TO something',
    avoid: 'Not "relevant with" or "relevant for".',
    sense: 'connected with what is being discussed',
    example: "That objection is relevant to large lectures but not to a seminar of twelve.",
  },
  {
    headword: 'circumstance', pos: 'n',
    pattern: 'under / in these circumstances (usually plural)',
    avoid: 'Not "in this circumstance" when you mean a situation generally.',
    sense: 'the conditions affecting a situation',
    example: 'Under those circumstances a deadline extension seems entirely reasonable.',
  },
  {
    headword: 'sufficient', pos: 'adj',
    pattern: 'sufficient + noun  /  sufficient TO do something',
    avoid: 'More formal than "enough"; it goes BEFORE the noun.',
    sense: 'as much as is needed',
    example: 'One semester is not sufficient time to judge whether the policy works.',
  },
  {
    headword: 'valid', pos: 'adj',
    pattern: 'a valid point / argument / concern',
    avoid: 'Use it for reasoning, not for facts — a fact is "accurate".',
    sense: 'based on sound reasoning',
    example: 'Priya raises a valid concern about students who work evening shifts.',
  },
  {
    headword: 'minor', pos: 'adj',
    pattern: 'a minor + noun (opposite: major)',
    avoid: 'Do not use it as a verb in academic writing.',
    sense: 'small and not very important',
    example: 'These are minor drawbacks compared with the gain in fairness.',
  },

  // ── Cause, effect, and consequence ─────────────────────────────
  {
    headword: 'impact', pos: 'n',
    pattern: 'an impact ON something',
    avoid: 'Not "impact to". As a verb, prefer "affect".',
    sense: 'a strong effect',
    example: 'The new schedule has had a measurable impact on how often students attend.',
  },
  {
    headword: 'affect', pos: 'v',
    pattern: 'X affects Y  (verb)  /  the effect ON Y  (noun)',
    avoid: 'Affect = verb, effect = noun. This is the single most common slip.',
    sense: 'to produce a change in something',
    example: 'Grading on a curve affects how willing students are to help one another.',
  },
  {
    headword: 'consequent', pos: 'adj',
    pattern: 'consequently + clause  (adverb, sentence-initial)',
    avoid: 'Follow "consequently" with a comma, not with "of".',
    sense: 'happening as a result',
    example: 'Attendance fell; consequently, the seminar was moved online.',
  },
  {
    headword: 'outcome', pos: 'n',
    pattern: 'the outcome OF something',
    avoid: 'Use it for a RESULT, not for a goal — that is an "objective".',
    sense: 'the result of a process',
    example: 'The outcome of the trial suggests that shorter assignments are graded more consistently.',
  },
  {
    headword: 'factor', pos: 'n',
    pattern: 'a factor IN something',
    avoid: 'Not "a factor of" when you mean a contributing cause.',
    sense: 'one of the things that influences a result',
    example: 'Class size is the largest factor in whether students speak up.',
  },
  {
    headword: 'rely', pos: 'v',
    pattern: 'rely ON someone / something',
    avoid: 'Always with "on". The adjective is "reliable".',
    sense: 'to depend on something to work',
    example: 'Group projects rely on every member contributing at roughly the same rate.',
  },
  {
    headword: 'ensure', pos: 'v',
    pattern: 'ensure THAT + clause',
    avoid: 'Do not confuse with "insure" (money) or "assure" (a person).',
    sense: 'to make certain that something happens',
    example: 'A short weekly quiz ensures that nobody falls a month behind unnoticed.',
  },
  {
    headword: 'restrict', pos: 'v',
    pattern: 'restrict X TO Y',
    avoid: 'Not "restrict X in Y".',
    sense: 'to keep something within limits',
    example: 'The department restricts each seminar to fifteen students.',
  },

  // ── Structuring an argument ────────────────────────────────────
  {
    headword: 'aspect', pos: 'n',
    pattern: 'one aspect OF something',
    avoid: 'Not "aspect about". It needs "of".',
    sense: 'one part or side of a situation',
    example: 'The aspect of the proposal that worries me most is the cost to part-time students.',
  },
  {
    headword: 'distinct', pos: 'adj',
    pattern: 'distinct FROM something',
    avoid: '"Distinct" = clearly separate; "distinctive" = characteristic.',
    sense: 'clearly different or separate',
    example: 'Motivation is distinct from ability, and the two should be assessed separately.',
  },
  {
    headword: 'primary', pos: 'adj',
    pattern: 'the primary + noun (reason, concern, aim)',
    avoid: 'Use it for importance, not for time — that is "initial".',
    sense: 'most important',
    example: 'My primary objection is that the rule punishes students for circumstances they do not control.',
  },
  {
    headword: 'initial', pos: 'adj',
    pattern: 'initially, + clause  /  the initial + noun',
    avoid: 'Time, not rank. Do not use it to mean "most important".',
    sense: 'happening at the beginning',
    example: 'My initial reaction was scepticism, but the data changed my mind.',
  },
  {
    headword: 'previous', pos: 'adj',
    pattern: 'the previous + noun  /  previously + verb',
    avoid: 'Not "the previous of". Use "previously" for the adverb.',
    sense: 'coming before in time',
    example: 'The previous policy allowed resubmission, and completion rates were higher.',
  },
  {
    headword: 'conclude', pos: 'v',
    pattern: 'conclude THAT + clause  /  in conclusion',
    avoid: 'Do not open a body paragraph with "in conclusion".',
    sense: 'to decide after considering the evidence',
    example: 'I conclude that a mixed system would serve both groups better than either extreme.',
  },
  {
    headword: 'instance', pos: 'n',
    pattern: 'for instance,  /  an instance OF something',
    avoid: '"For instance" needs a comma after it.',
    sense: 'an example',
    example: 'Consider, for instance, a student who is caring for a family member.',
  },
  {
    headword: 'context', pos: 'n',
    pattern: 'in the context OF something',
    avoid: 'Not "in context with".',
    sense: 'the situation that makes something understandable',
    example: 'In the context of a first-year course, that expectation seems unrealistic.',
  },

  // ── Describing evidence and data ───────────────────────────────
  {
    headword: 'evident', pos: 'adj',
    pattern: 'it is evident THAT + clause',
    avoid: 'The noun is "evidence" and is UNCOUNTABLE — never "evidences".',
    sense: 'clear and easy to see',
    example: 'It is evident that the current system rewards speed over care.',
  },
  {
    headword: 'significant', pos: 'adj',
    pattern: 'a significant + noun  /  significantly + verb',
    avoid: 'Means "important", not "a lot" — do not use it for size alone.',
    sense: 'important enough to matter',
    example: 'There is a significant difference between skimming a text and studying it.',
  },
  {
    headword: 'proportion', pos: 'n',
    pattern: 'a large / small proportion OF something',
    avoid: 'Not "a proportion in". Use "of".',
    sense: 'a part of a whole, relative to the rest',
    example: 'A small proportion of students account for most of the questions asked in class.',
  },
  {
    headword: 'estimate', pos: 'v',
    pattern: 'estimate THAT + clause',
    avoid: 'Estimating is approximate — do not pair it with "exactly".',
    sense: 'to judge an amount approximately',
    example: 'I would estimate that half the reading can be done on a commute.',
  },
  {
    headword: 'vary', pos: 'v',
    pattern: 'X varies / vary WITH or ACROSS something',
    avoid: 'The noun is "variation"; the adjective is "various".',
    sense: 'to be different in different cases',
    example: 'Study habits vary considerably across the students I have worked with.',
  },
  {
    headword: 'range', pos: 'n',
    pattern: 'a range OF things  /  range FROM X TO Y',
    avoid: '"A range of" takes a PLURAL noun.',
    sense: 'a set of different things of the same kind',
    example: 'The course attracts a range of students, from first-years to working adults.',
  },
  {
    headword: 'criteria', pos: 'n',
    pattern: 'criteria are (PLURAL) — one criterion IS',
    avoid: 'Never "a criteria" or "criterias".',
    sense: 'the standards used to judge something',
    example: 'The criteria for the award are published, but they are applied inconsistently.',
  },
  {
    headword: 'data', pos: 'n',
    pattern: 'the data show / suggest (treated as plural in academic prose)',
    avoid: 'Avoid "datas". In formal writing prefer "the data show".',
    sense: 'facts and figures collected for analysis',
    example: 'The data suggest that attendance and final grade are only loosely related.',
  },

  // ── Process and change ─────────────────────────────────────────
  {
    headword: 'shift', pos: 'n',
    pattern: 'a shift FROM X TO Y',
    avoid: 'Not "a shift of". Use from/to.',
    sense: 'a change from one state to another',
    example: 'The shift from lectures to seminars has changed how much students read beforehand.',
  },
  {
    headword: 'acquire', pos: 'v',
    pattern: 'acquire + skill / knowledge / habit',
    avoid: 'More formal than "get"; do not use it for objects you bought.',
    sense: 'to gain something gradually',
    example: 'Students acquire the habit of citing sources only if it is modelled early.',
  },
  {
    headword: 'maintain', pos: 'v',
    pattern: 'maintain + noun  /  maintain THAT + clause',
    avoid: 'Two senses: keep something going, or argue a position.',
    sense: 'to keep something at the same level, or to assert',
    example: 'It is difficult to maintain steady progress without weekly checkpoints.',
  },
  {
    headword: 'establish', pos: 'v',
    pattern: 'establish + noun  /  establish THAT + clause',
    avoid: 'Not for temporary things — you do not "establish" a mood.',
    sense: 'to set something up, or to prove it firmly',
    example: 'The programme has established a clear standard for what counts as participation.',
  },
  {
    headword: 'occur', pos: 'v',
    pattern: 'X occurs  (no object)  /  it occurred TO me THAT',
    avoid: 'Intransitive — never "occur something". Double the r: occurred.',
    sense: 'to happen',
    example: 'These misunderstandings occur most often in the first weeks of term.',
  },
  {
    headword: 'transfer', pos: 'v',
    pattern: 'transfer X TO Y',
    avoid: 'Stress moves in the noun: TRANS-fer (n), trans-FER (v).',
    sense: 'to move from one place or form to another',
    example: 'Skills learned in group work transfer to almost any workplace.',
  },

  // ── Email and request register ─────────────────────────────────
  {
    headword: 'require', pos: 'v',
    pattern: 'require + noun  /  be required TO do something',
    avoid: 'Not "require to do" in the active. Use "need to" or the passive.',
    sense: 'to need something, or to make it compulsory',
    example: 'Could you let me know whether the workshop requires any preparation beforehand?',
  },
  {
    headword: 'obtain', pos: 'v',
    pattern: 'obtain + noun (permission, a copy, approval)',
    avoid: 'Formal register — do not use it with everyday objects.',
    sense: 'to get something, especially by effort or request',
    example: 'I am writing to ask how I might obtain a copy of the reading list.',
  },
  {
    headword: 'appropriate', pos: 'adj',
    pattern: 'appropriate FOR someone / TO a situation',
    avoid: 'The verb has different stress and means "to take" — avoid it.',
    sense: 'suitable for the situation',
    example: 'Please let me know which session would be most appropriate for a beginner.',
  },
  {
    headword: 'available', pos: 'adj',
    pattern: 'available TO someone  /  available FOR something',
    avoid: 'Not "available with". The noun is "availability".',
    sense: 'able to be used or obtained',
    example: 'I would be available for any session on Monday or Friday afternoon.',
  },
  {
    headword: 'assist', pos: 'v',
    pattern: 'assist someone WITH something  /  assist IN doing',
    avoid: 'Not "assist to do". Use "with" or "in -ing".',
    sense: 'to help',
    example: 'I would be grateful if you could assist me with rescheduling the session.',
  },
  {
    headword: 'participate', pos: 'v',
    pattern: 'participate IN something',
    avoid: 'Always "in" — never "participate to" or "participate at".',
    sense: 'to take part',
    example: 'I would very much like to participate in the workshop if a place remains.',
  },
  {
    headword: 'respond', pos: 'v',
    pattern: 'respond TO something  (noun: a response TO)',
    avoid: 'Not "respond at". Do not confuse with "answer", which takes no preposition.',
    sense: 'to react or reply',
    example: 'Thank you for responding to my earlier message so quickly.',
  },
  {
    headword: 'secure', pos: 'v',
    pattern: 'secure + noun (a place, funding, approval)',
    avoid: 'As an adjective it means "safe" — the two senses are unrelated.',
    sense: 'to succeed in getting something',
    example: 'I hope to secure a place before the workshop fills.',
  },

  // ── Comparing and evaluating ───────────────────────────────────
  {
    headword: 'similar', pos: 'adj',
    pattern: 'similar TO something',
    avoid: 'Not "similar with". The noun is "similarity".',
    sense: 'alike but not identical',
    example: 'This proposal is similar to one the department rejected two years ago.',
  },
  {
    headword: 'evaluate', pos: 'v',
    pattern: 'evaluate + noun  (noun: evaluation OF)',
    avoid: 'Not "evaluate about". It takes a direct object.',
    sense: 'to judge the value or quality of something',
    example: 'It is hard to evaluate a group project fairly when contributions are uneven.',
  },
  {
    headword: 'perceive', pos: 'v',
    pattern: 'perceive X AS Y',
    avoid: 'Not "perceive X like Y". The noun is "perception".',
    sense: 'to see or understand something in a particular way',
    example: 'Students perceive written comments as more useful than a bare number.',
  },
  {
    headword: 'potential', pos: 'n',
    pattern: 'the potential FOR something  /  a potential + noun',
    avoid: 'Not "potential of doing". Use "potential to do".',
    sense: 'the possibility of something developing',
    example: 'The policy has the potential to widen the gap between the two groups.',
  },
  {
    headword: 'benefit', pos: 'v',
    pattern: 'benefit FROM something  /  X benefits Y',
    avoid: 'Not "benefit of" as a verb. Note: benefited, one t.',
    sense: 'to gain an advantage',
    example: 'Quieter students benefit most from being asked to write before speaking.',
  },
  {
    headword: 'concept', pos: 'n',
    pattern: 'the concept OF something',
    avoid: 'Not "the concept about". The adjective is "conceptual".',
    sense: 'an abstract idea',
    example: 'The concept of a fair grade means different things to the two speakers.',
  },
  {
    headword: 'principle', pos: 'n',
    pattern: 'in principle  /  the principle THAT + clause',
    avoid: '"Principle" = a rule; "principal" = main, or a head teacher.',
    sense: 'a basic rule or belief',
    example: 'I agree in principle, though the practical difficulties seem underestimated.',
  },
  {
    headword: 'approach', pos: 'n',
    pattern: 'an approach TO something',
    avoid: 'Not "approach of". As a verb it takes no preposition.',
    sense: 'a way of dealing with something',
    example: 'A more gradual approach to the change would give staff time to adjust.',
  },
]
