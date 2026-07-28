/**
 * TOEFL Speaking — "Take an Interview" question sets.
 *
 * WHAT WAS WRONG. The bank held 83 standalone interview questions, every
 * one with a null `passage_group_id`. assemble.ts draws this task type
 * through `drawGrouped`, so four ungrouped singletons came back: four
 * unrelated opinion questions with no scenario and no escalation. The
 * generator prompt already described the correct premise-first structure
 * and had done for months — it simply never ran, because Speaking is
 * served from the bank. Students saw the consequence directly: two
 * near-identical group-project questions in one test, because "group
 * projects" was the subject of a large share of those singletons.
 *
 * WHAT ETS ACTUALLY DOES. One interview, one topic, four questions on a
 * shared scenario, rising in difficulty along a fixed ladder:
 *   1. personal experience or fact
 *   2. personal habit or preference, with a reason
 *   3. opinion on a contested general claim
 *   4. policy, prediction, or recommendation
 * Each question stands alone — answerable without the earlier answers,
 * because the section is linear and never branches.
 *
 * WHY THESE ARE HAND-WRITTEN. CLAUDE.md records three separate cases of a
 * batch authored to one rigid brief developing a cross-item tell, the last
 * of which put identical key prose in all 8 lectures and was invisible to
 * both automated letter checks. A model asked for twelve sets against this
 * brief would very likely converge on one phrasing for rung 3 — which is
 * precisely the failure already in the bank, where "Some people believe X,
 * while others think Y" carried 7 of 12 delivered items. So the rung-3 and
 * rung-4 FORMS are rotated deliberately here and asserted by
 * `verify-interview-sets.ts`: no phrasing frame may carry more than a
 * third of the sets at either rung.
 */

/** One interviewer question, tagged by the rung it occupies. */
export interface InterviewQuestion {
  /** 1-4; the delivered order IS the escalation. */
  rung: 1 | 2 | 3 | 4
  /** Question text, WITHOUT the "[Interview] " tag — added at seed time. */
  text: string
  /** Rung-3/4 phrasing family. Used by the verifier to prove no single
   *  frame dominates; null for rungs 1-2, which are not opinion turns. */
  frame: InterviewFrame | null
  /** Shown in review after the test. */
  explanation: string
}

/** The distinct ways an opinion or forward-looking turn can be posed.
 *  Kept as a closed union so a new set cannot quietly invent a synonym
 *  for a frame that is already over-represented. */
export type InterviewFrame =
  // rung 3 — contested claim
  | 'agree_with_claim'      // "Some students say X. Do you agree?"
  | 'is_criticism_fair'     // "A common criticism is X. Is that fair?"
  | 'rank_two_goods'        // "Does X matter more than Y?"
  | 'answer_an_objector'    // "How would you answer someone who said X?"
  | 'worth_the_cost'        // "Is X worth giving up Y?"
  | 'name_the_problem'      // "What is the real problem with X?"
  // rung 4 — forward-looking
  | 'policy_decision'       // "Should the university do X?"
  | 'predict_change'        // "How will X change?"
  | 'one_recommendation'    // "What one change would you recommend?"
  | 'forced_tradeoff'       // "Budget for one of X or Y — which?"

export interface InterviewSet {
  /** Stable slug — becomes passage_group_id as `interview-<id>`, so it
   *  must never be reused for different content. */
  id: string
  /** Everyday subject the whole interview stays on. */
  subject: string
  /** Who is interviewing, in the student's world. Varied across sets so
   *  the framing device itself isn't the repeated element. */
  interviewer: string
  /** Scenario introduction, second person, 1-2 sentences. Delivered both
   *  aurally and in print, identically on all four items. */
  premise: string
  questions: [InterviewQuestion, InterviewQuestion, InterviewQuestion, InterviewQuestion]
}

export const INTERVIEW_SETS: InterviewSet[] = [
  {
    id: 'commuting',
    subject: 'getting to and from campus',
    interviewer: 'a university research study',
    premise: 'You have agreed to take part in a university research study about how students get to and from campus. The interviewer will ask you a few questions about your journey.',
    questions: [
      { rung: 1, frame: null,
        text: 'How do you usually travel to campus, and roughly how long does the trip take?',
        explanation: 'Rung 1 asks for a plain fact about your own routine. Name the mode and the time, then add one concrete detail.' },
      { rung: 2, frame: null,
        text: 'Is there a time of day you prefer to travel, and what makes that time better for you?',
        explanation: 'Rung 2 asks for a preference AND its reason. A preference with no reason attached is an incomplete answer.' },
      { rung: 3, frame: 'is_criticism_fair',
        text: 'People often complain that public transport near universities is unreliable. In your experience, is that complaint fair?',
        explanation: 'Rung 3 asks you to judge a claim, not repeat it. Take a side and support it from what you have actually seen.' },
      { rung: 4, frame: 'forced_tradeoff',
        text: 'Suppose the university could fund only one of two things: more frequent shuttle buses, or cheaper parking. Which should it choose, and why?',
        explanation: 'Rung 4 forces a choice between two reasonable options. Choose one and say what the other side loses.' },
    ],
  },
  {
    id: 'dining',
    subject: 'eating on campus',
    interviewer: 'the campus dining service',
    premise: 'The campus dining service is interviewing students about their eating habits during the school day. You have agreed to answer a few questions.',
    questions: [
      { rung: 1, frame: null,
        text: 'Where do you usually eat during a long day on campus, and what do you tend to have?',
        explanation: 'Rung 1 is descriptive. Name the place and the food; specifics make the answer easy to follow.' },
      { rung: 2, frame: null,
        text: 'Do you prefer to bring food from home or buy it on campus? What decides it for you?',
        explanation: 'Rung 2 wants the deciding factor behind the preference — cost, time, taste — not just the preference.' },
      { rung: 3, frame: 'rank_two_goods',
        text: 'For a campus cafeteria, which matters more to students: keeping prices low, or offering a wide range of food? Explain your view.',
        explanation: 'Rung 3 asks you to rank two things that are both good. Say why the one you pick matters more.' },
      { rung: 4, frame: 'one_recommendation',
        text: 'If you could recommend one change to how food is served on campus, what would it be, and who would benefit most?',
        explanation: 'Rung 4 asks for a single concrete recommendation and its beneficiary. One clear change beats three vague ones.' },
    ],
  },
  {
    id: 'library',
    subject: 'study spaces and the library',
    interviewer: 'the library planning committee',
    premise: 'The library is planning a renovation and is interviewing students about how they use study spaces. The interviewer will ask about your study habits.',
    questions: [
      { rung: 1, frame: null,
        text: 'Where do you go when you need to concentrate on schoolwork, and what is that place like?',
        explanation: 'Rung 1 asks you to describe a real place. Sensory detail — noise, light, how busy it is — carries this answer.' },
      { rung: 2, frame: null,
        text: 'Do you work better alone or near other people? What is it about that setting that helps you?',
        explanation: 'Rung 2 links a preference to a cause. "It just helps" is not yet an answer.' },
      { rung: 3, frame: 'answer_an_objector',
        text: 'Someone argues that libraries are no longer necessary because almost everything is available online. How would you answer them?',
        explanation: 'Rung 3 puts you opposite a stated position. Address their reasoning, not a weaker version of it.' },
      { rung: 4, frame: 'predict_change',
        text: 'How do you expect the way students use libraries to change over the next ten years?',
        explanation: 'Rung 4 asks for a prediction with a basis. Ground it in something you can already see happening.' },
    ],
  },
  {
    id: 'part-time-work',
    subject: 'working while studying',
    interviewer: 'a student careers office',
    premise: 'The careers office is collecting student views on working while studying. You have agreed to be interviewed about your experience and opinions.',
    questions: [
      { rung: 1, frame: null,
        text: 'Have you ever had a job or regular commitment alongside your studies? Describe what it involved.',
        explanation: 'Rung 1 draws on your own experience. If you have not worked, describe another regular commitment — the task is to describe, not to have the right background.' },
      { rung: 2, frame: null,
        text: 'How many hours a week do you think you could work without it affecting your studies, and what makes you say that number?',
        explanation: 'Rung 2 asks for a figure and the reasoning behind it. The number alone is only half the answer.' },
      { rung: 3, frame: 'worth_the_cost',
        text: 'Some students take demanding jobs that cut into their study time. Is the money and experience worth what they give up?',
        explanation: 'Rung 3 is a trade-off judgement. Name what is gained and what is lost before you come down on a side.' },
      { rung: 4, frame: 'policy_decision',
        text: 'Should universities limit how many hours their full-time students are allowed to work? Give reasons for your position.',
        explanation: 'Rung 4 asks about a rule affecting everyone, not just you. Consider students unlike yourself.' },
    ],
  },
  {
    id: 'housing',
    subject: 'where students live',
    interviewer: 'a housing office survey',
    premise: 'The university housing office is interviewing students about accommodation. The interviewer will ask about where you live and what you think about student housing.',
    questions: [
      { rung: 1, frame: null,
        text: 'Describe where you currently live and how it suits your daily routine.',
        explanation: 'Rung 1 is description plus fit. Connect the place to how your day actually runs.' },
      { rung: 2, frame: null,
        text: 'Would you rather live close to campus in a smaller space, or further away in a larger one? Why?',
        explanation: 'Rung 2 is a preference between two real options. The reason is what is being scored.' },
      { rung: 3, frame: 'agree_with_claim',
        text: 'Some students say that living with roommates teaches you more than living alone. Do you agree?',
        explanation: 'Rung 3 asks whether a claim holds. Agreeing is fine — agreeing without support is not.' },
      { rung: 4, frame: 'one_recommendation',
        text: 'What single improvement to student housing would make the biggest difference, and why that one?',
        explanation: 'Rung 4 asks you to prioritise. Explain why your choice beats the obvious alternatives.' },
    ],
  },
  {
    id: 'exercise',
    subject: 'sport and exercise',
    interviewer: 'the campus sports centre',
    premise: 'The campus sports centre is interviewing students about exercise habits. You have agreed to answer several questions about physical activity.',
    questions: [
      { rung: 1, frame: null,
        text: 'What kind of physical activity do you do in a typical week, if any?',
        explanation: 'Rung 1 is factual. "Very little" is an honest answer — describe what little there is.' },
      { rung: 2, frame: null,
        text: 'Do you prefer exercising on your own or as part of a team or class? What draws you to that?',
        explanation: 'Rung 2 wants the pull factor behind the preference.' },
      { rung: 3, frame: 'name_the_problem',
        text: 'Many students say they want to exercise more but do not. What do you think the real obstacle is?',
        explanation: 'Rung 3 asks you to diagnose, not just to list. Identify one obstacle and argue it is the binding one.' },
      { rung: 4, frame: 'predict_change',
        text: 'Do you think students will be more or less physically active ten years from now? What makes you think so?',
        explanation: 'Rung 4 asks for a direction and a mechanism — what would actually cause the change you predict.' },
    ],
  },
  {
    id: 'green-space',
    subject: 'outdoor space on campus',
    interviewer: 'a campus planning consultation',
    premise: 'The university is consulting students about outdoor spaces on campus. The interviewer will ask how you use these areas and what you think of them.',
    questions: [
      { rung: 1, frame: null,
        text: 'Is there an outdoor spot on or near campus that you use? Describe it and what you do there.',
        explanation: 'Rung 1 asks for a specific place. A named, concrete spot is easier to describe well than a general one.' },
      { rung: 2, frame: null,
        text: 'When do you choose to be outside rather than indoors between classes, and what makes the difference?',
        explanation: 'Rung 2 asks what tips the decision. Weather, company, time — pick one and develop it.' },
      { rung: 3, frame: 'rank_two_goods',
        text: 'A campus has limited land. Is open outdoor space more valuable to students than additional buildings?',
        explanation: 'Rung 3 pits two genuine goods against each other. Argue for the one you rank higher.' },
      { rung: 4, frame: 'policy_decision',
        text: 'Should the university close part of the campus to vehicles to create more open space? Explain your reasoning.',
        explanation: 'Rung 4 concerns a decision with losers as well as winners. Acknowledge who is inconvenienced.' },
    ],
  },
  {
    id: 'campus-media',
    subject: 'campus news and student media',
    interviewer: 'the student newspaper',
    premise: 'The student newspaper is interviewing readers about how they follow campus news. You have agreed to answer a few questions.',
    questions: [
      { rung: 1, frame: null,
        text: 'How do you normally find out what is happening on campus?',
        explanation: 'Rung 1 asks about your actual channels. Name them specifically.' },
      { rung: 2, frame: null,
        text: 'What kind of campus news do you actually pay attention to, and why that kind?',
        explanation: 'Rung 2 asks what earns your attention and what makes it worth your time.' },
      { rung: 3, frame: 'answer_an_objector',
        text: 'A classmate says student newspapers are pointless now that everyone gets news through social media. What would you say to them?',
        explanation: 'Rung 3 asks you to respond to a real objection. Take their point seriously before answering it.' },
      { rung: 4, frame: 'one_recommendation',
        text: 'What one change would help the student newspaper reach more students, and why would it work?',
        explanation: 'Rung 4 asks for a change plus a mechanism — why the change would produce the effect.' },
    ],
  },
  {
    id: 'volunteering',
    subject: 'volunteering and community work',
    interviewer: 'a community volunteering programme',
    premise: 'A volunteering programme is interviewing students about community work. The interviewer will ask about your experience and views.',
    questions: [
      { rung: 1, frame: null,
        text: 'Have you taken part in any volunteering or community activity? Describe what you did.',
        explanation: 'Rung 1 is narrative. Say what you did, where, and roughly when.' },
      { rung: 2, frame: null,
        text: 'What kind of volunteering would you be most willing to commit regular time to, and why that kind?',
        explanation: 'Rung 2 asks about willingness and its source — what makes that work appealing to you specifically.' },
      { rung: 3, frame: 'worth_the_cost',
        text: 'Volunteering takes time away from study and rest. For a busy student, is it worth that cost?',
        explanation: 'Rung 3 weighs a real cost against a real benefit. Do not pretend the cost is small.' },
      { rung: 4, frame: 'policy_decision',
        text: 'Should universities require students to complete some community service before graduating? Defend your position.',
        explanation: 'Rung 4 is about compulsion, which is a stronger claim than encouragement. Address that difference.' },
    ],
  },
  {
    id: 'orientation',
    subject: 'starting at a new school',
    interviewer: 'the orientation planning team',
    premise: 'The orientation team is interviewing students about their first weeks at the university, in order to improve next year\'s programme.',
    questions: [
      { rung: 1, frame: null,
        text: 'Think back to your first week at a new school. What do you remember most clearly?',
        explanation: 'Rung 1 asks for a memory. One vivid moment beats a general summary of the week.' },
      { rung: 2, frame: null,
        text: 'What helped you settle in fastest, and why do you think that worked for you?',
        explanation: 'Rung 2 asks what worked and why — the causal half is where the marks are.' },
      { rung: 3, frame: 'name_the_problem',
        text: 'Many new students say they feel lost in their first month. What do you think schools get most wrong about that period?',
        explanation: 'Rung 3 asks for a diagnosis of an institution, not a personal complaint. Be specific about the mistake.' },
      { rung: 4, frame: 'forced_tradeoff',
        text: 'If orientation could include only one of these — practical campus training or social events for meeting people — which should it be?',
        explanation: 'Rung 4 forces a choice. Name what the rejected option would have given, then justify dropping it.' },
    ],
  },
  {
    id: 'wellbeing',
    subject: 'rest, sleep and student wellbeing',
    interviewer: 'the campus health service',
    premise: 'The campus health service is interviewing students about rest and daily wellbeing. You have agreed to answer some questions about your routine.',
    questions: [
      { rung: 1, frame: null,
        text: 'Describe what a typical evening looks like for you before a normal school day.',
        explanation: 'Rung 1 asks for a routine in order. Walking through it in sequence keeps the answer organised.' },
      { rung: 2, frame: null,
        text: 'What is the first thing you give up when you are short of time, and why that first?',
        explanation: 'Rung 2 reveals a priority through a choice. Explain what makes that the most expendable thing.' },
      { rung: 3, frame: 'agree_with_claim',
        text: 'Some people say students simply need to manage their time better and would then have enough rest. Do you agree?',
        explanation: 'Rung 3 asks about a claim that blames the individual. Agree or push back, but engage with it directly.' },
      { rung: 4, frame: 'forced_tradeoff',
        text: 'If a school could do only one of these — reduce the amount of coursework, or move the first class of the day later — which would do more for student rest?',
        explanation: 'Rung 4 forces a choice between two plausible fixes. Say what the option you reject would still leave unsolved.' },
    ],
  },
  {
    id: 'arts',
    subject: 'music, theatre and the arts on campus',
    interviewer: 'an arts programme review',
    premise: 'The university is reviewing its arts programme and is interviewing students about music, theatre and other performances on campus.',
    questions: [
      { rung: 1, frame: null,
        text: 'Have you been to a concert, play or exhibition, on campus or elsewhere? Describe the occasion.',
        explanation: 'Rung 1 asks for one occasion described concretely — where, what, who you went with.' },
      { rung: 2, frame: null,
        text: 'Would you rather attend a performance or take part in one? What is behind that preference?',
        explanation: 'Rung 2 contrasts two roles. Say what each would ask of you and why one suits you better.' },
      { rung: 3, frame: 'is_criticism_fair',
        text: 'Arts programmes are sometimes criticised as a luxury when budgets are tight. Is that criticism fair?',
        explanation: 'Rung 3 asks you to evaluate a criticism. State the strongest version of it before you respond.' },
      { rung: 4, frame: 'predict_change',
        text: 'Do you think live performance will matter more or less to students in the future? What is driving that?',
        explanation: 'Rung 4 asks for a direction and the force behind it, not just an opinion about whether it is good.' },
    ],
  },
]
