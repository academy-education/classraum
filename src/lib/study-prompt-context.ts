/**
 * Builds a richer "what is the student studying right now" context
 * blob that the practice / lesson / test generators inject into their
 * prompts. The key insight: a topic named "Math" means something
 * totally different under SAT (passage-based, 4-choice, 70-min
 * section) vs under Mathematics > Algebra (concept-focused, no
 * specific test format).
 *
 * The helper walks the topic tree once to find the level-1 parent
 * for test_prep leaves so we know which standardized test we're in
 * (SAT vs TOEFL vs KSAT vs ...) and emits the format guidance per
 * test.
 */

export interface StudyPromptContext {
  /** Display name in the session's language, used as the prompt subject. */
  topicName: string
  /** 'subject' | 'test_prep' — drives which guidance block to use. */
  category: 'subject' | 'test_prep'
  /** Approx grade range, e.g. "9-12". Null for tests where grade is N/A. */
  gradeRange: string | null
  /** For test_prep: which test (KSAT / SAT / TOEFL / ...). null otherwise. */
  testFamily: TestFamily | null
  /** For test_prep: leaf section label like "Reading" / "Math". null when
   *  the user is at the test root. */
  testSection: string | null
}

export type TestFamily =
  | 'ksat'   // 수능
  | 'sat'
  | 'toefl'
  | 'toeic'
  | 'ielts'
  | 'act'
  | 'ap'
  | 'gre'

interface TopicRow {
  id: string
  parent_id: string | null
  slug: string
  name_en: string
  name_ko: string
  level: number
  category: string
  grade_min: number | null
  grade_max: number | null
}

/**
 * Loads the topic + walks parents to derive the full context.
 * Returns null when the topic_id doesn't resolve.
 */
export async function loadStudyPromptContext(
  topicId: string,
  language: 'en' | 'ko'
): Promise<StudyPromptContext | null> {
  // Lazy-import the admin client so this module stays safe to pull
  // into a client component's import graph. The admin client throws at
  // module-init when the service-role key is missing (always true in
  // the browser).
  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { data: topic } = await supabaseAdmin
    .from('study_topics')
    .select('id, parent_id, slug, name_en, name_ko, level, category, grade_min, grade_max')
    .eq('id', topicId)
    .maybeSingle()
  if (!topic) return null
  const t = topic as TopicRow

  // For test_prep, the level-1 parent is the test (SAT, TOEFL, ...).
  // For subjects, gradeRange comes from the leaf row itself.
  let testFamily: TestFamily | null = null
  let testSection: string | null = null

  if (t.category === 'test_prep') {
    // Climb to the level-1 (test) row. Leaves have parent_id pointing
    // to it; if we ARE at level 1, this is the test root itself.
    let rootSlug = t.slug
    if (t.level === 2 && t.parent_id) {
      const { supabaseAdmin } = await import('@/lib/supabase-admin')
      const { data: parent } = await supabaseAdmin
        .from('study_topics')
        .select('slug')
        .eq('id', t.parent_id)
        .maybeSingle()
      if (parent?.slug) rootSlug = parent.slug
      testSection = language === 'ko' ? t.name_ko : t.name_en
    }
    testFamily = mapTestFamily(rootSlug)
  }

  const gradeRange = t.grade_min && t.grade_max
    ? `${t.grade_min}-${t.grade_max}`
    : t.grade_min ? `${t.grade_min}+` : null

  return {
    topicName: language === 'ko' ? t.name_ko : t.name_en,
    category: t.category === 'test_prep' ? 'test_prep' : 'subject',
    gradeRange,
    testFamily,
    testSection,
  }
}

function mapTestFamily(slug: string): TestFamily | null {
  if (slug === 'test-ksat') return 'ksat'
  if (slug === 'test-sat')  return 'sat'
  if (slug === 'test-toefl') return 'toefl'
  if (slug === 'test-toeic') return 'toeic'
  if (slug === 'test-ielts') return 'ielts'
  if (slug === 'test-act')  return 'act'
  if (slug === 'test-ap')   return 'ap'
  if (slug === 'test-gre')  return 'gre'
  return null
}

/**
 * One-paragraph format guidance per test. Surfaced into prompts so
 * the AI produces realistic test-shaped questions instead of generic
 * subject drills. Bilingual — the practice generator already speaks
 * the session's language, this matches.
 *
 * The blocks are deliberately specific about *what makes the test's
 * questions distinctive* (length, choice count, passage style, time
 * pressure cues) — those are the levers that produce credible mock
 * items. Generic "make it like SAT" doesn't work; the model needs
 * the constraints.
 */
export function testFormatGuidanceEn(family: TestFamily, section: string | null): string {
  switch (family) {
    case 'ksat': return [
      'This is the KSAT (대학수학능력시험 / 수능), Korea\'s university entrance exam. Korean students study for this for years.',
      'Format: 5-choice multiple choice (5지선다). Passages and prompts can be quite long. Questions test deep reading comprehension and rigorous logical inference, not surface facts.',
      section ? `Section: ${section}. Use the section's standard question style — for 국어 use 비문학/문학 passage-based comprehension, for 수학 use the 객관식 number-answer format, for 영어 use 빈칸 추론 / 어법 / 어휘 style.` : '',
      'Calibrate difficulty to a typical 모의고사 — challenging but fair for a senior high school student.',
    ].filter(Boolean).join(' ')

    case 'sat': return [
      'This is the SAT, the US college admissions test. Digital-format SAT (post-2024).',
      'Format: 4-choice multiple choice. Each section is timed and adaptive in difficulty.',
      section === 'Reading & Writing'
        ? 'Reading and Writing questions are short — one question per ~25-150 word passage. Test main idea, inference, text structure, grammar in context, vocabulary in context, and rhetorical synthesis.'
        : section === 'Math'
          ? 'Math questions cover Heart of Algebra, Problem Solving and Data Analysis, Passport to Advanced Math, and Additional Topics. Both multiple-choice AND student-produced response (SPR / 단답) appear; for this generator stick to multiple choice. Calculator is permitted throughout the digital SAT.'
          : '',
    ].filter(Boolean).join(' ')

    case 'toefl': return [
      'This is the TOEFL iBT, the standardized English proficiency test for non-native speakers seeking US/Canada admission.',
      'Format: 4-choice multiple choice for Reading and Listening; written/spoken response for Writing and Speaking.',
      section === 'Reading'
        ? 'Reading: 700-word academic passages with 10 questions each. Test detail, vocabulary in context, inference, reference, sentence simplification, and "insert sentence" placement.'
        : section === 'Listening'
          ? 'Listening: lecture- or conversation-based. Without audio we generate text transcripts of short university-life dialogues or 3-5 paragraph lectures, then ask the questions.'
          : section === 'Speaking'
            ? 'Speaking is normally spoken; for this written practice render the prompt and ask the student to type the answer they would speak. Independent Task = personal-opinion; Integrated Task = read/listen, then summarise.'
            : section === 'Writing'
              ? 'Writing: Integrated Task (read + listen, then summarise the relationship) and Academic Discussion (respond to a professor\'s prompt and two student replies).'
              : '',
    ].filter(Boolean).join(' ')

    case 'toeic': return [
      'This is the TOEIC (Test of English for International Communication), the workplace-English test very common in Korea.',
      'Format: 4-choice multiple choice for Reading and Listening. Score is on a 990 scale.',
      section === 'Listening'
        ? 'Without audio we generate the transcript of short business-context conversations (phone calls, meetings, announcements) or short talks.'
        : section === 'Reading'
          ? 'Reading Part 5 is single-sentence grammar / vocab; Part 6 is short-passage cloze; Part 7 is single + multi-passage comprehension in business contexts (emails, ads, schedules).'
          : '',
    ].filter(Boolean).join(' ')

    case 'ielts': return [
      'This is the IELTS Academic, the British-English-leaning proficiency test used for UK/Australia/Canada admission and immigration. Score: 1-9 band.',
      section === 'Reading'
        ? 'Reading: 3 long academic passages, varied question types — multiple choice, True/False/Not Given, matching headings, sentence completion, summary completion.'
        : section === 'Listening'
          ? 'Listening: short answer + multiple choice + matching + form completion across 4 recordings.'
          : '',
    ].filter(Boolean).join(' ')

    case 'act': return [
      'This is the ACT, an alternative to the SAT for US college admissions.',
      'Format: 4-choice multiple choice for English/Reading/Science; 5-choice for Math.',
      section === 'English'
        ? 'English: short passages with underlined portions; pick the best revision or NO CHANGE.'
        : section === 'Math'
          ? 'Math: 60 questions in 60 minutes covering algebra, geometry, trig. 5 choices.'
          : section === 'Reading'
            ? 'Reading: 4 long passages, 10 questions each, vary genre (prose fiction, social science, humanities, natural science).'
            : section === 'Science'
              ? 'Science: data interpretation + experiment summaries + conflicting viewpoints. Tests reasoning, not recall.'
              : '',
    ].filter(Boolean).join(' ')

    case 'ap': return [
      `This is an Advanced Placement (AP) exam.${section ? ` Subject: ${section}.` : ''}`,
      'Format: multiple choice (4-5 choices depending on subject) plus free-response. For this generator stick to multiple choice unless the subject demands otherwise.',
      'AP questions are college-introductory in rigor. Reference relevant rubric standards in the explanation.',
    ].filter(Boolean).join(' ')

    case 'gre': return [
      'This is the GRE General Test, graduate school admissions.',
      section === 'Verbal Reasoning'
        ? 'Verbal: reading comprehension, text completion (1-3 blanks with provided choices), sentence equivalence (pick 2 of 6 that produce equivalent sentences).'
        : section === 'Quantitative Reasoning'
          ? 'Quant: Quantitative Comparison + standard multiple choice + numeric entry. Topics: arithmetic, algebra, geometry, data analysis.'
          : section === 'Analytical Writing'
            ? 'Analytical Writing is normally essay-format; for written practice render the prompt and ask the student to outline or full-draft a response.'
            : '',
    ].filter(Boolean).join(' ')
  }
}

export function testFormatGuidanceKo(family: TestFamily, section: string | null): string {
  switch (family) {
    case 'ksat': return [
      '이것은 대학수학능력시험(수능)입니다. 한국 학생들이 수년간 준비하는 시험입니다.',
      '형식: 5지선다. 지문과 발문이 길 수 있습니다. 표면적 사실보다 깊이 있는 독해와 엄밀한 논리적 추론을 묻습니다.',
      section ? `영역: ${section}. 해당 영역의 표준 출제 방식을 따르세요 — 국어는 비문학/문학 지문 기반 문제, 수학은 객관식, 영어는 빈칸 추론·어법·어휘 등.` : '',
      '난이도는 일반적인 모의고사 수준 — 고3 학생에게 도전적이지만 공정하게.',
    ].filter(Boolean).join(' ')

    case 'sat': return [
      'SAT(미국 대학입학시험) 디지털 포맷입니다.',
      '형식: 4지선다 객관식. 각 섹션은 시간 제한과 난이도 적응형.',
      section === 'Reading & Writing' || section === '읽기와 쓰기'
        ? 'Reading and Writing: 25–150단어의 짧은 지문마다 1문항. 주제, 추론, 글의 구조, 문맥 속 문법·어휘, 수사적 종합을 평가합니다.'
        : section === 'Math' || section === '수학'
          ? '수학: Heart of Algebra, Problem Solving and Data Analysis, Passport to Advanced Math, Additional Topics. 객관식과 단답형(SPR) 모두 출제되지만 이 생성기에서는 객관식으로 작성하세요. 디지털 SAT는 전 영역 계산기 사용 가능.'
          : '',
    ].filter(Boolean).join(' ')

    case 'toefl': return [
      'TOEFL iBT(영어 비원어민의 미국·캐나다 입학 표준 영어 시험)입니다.',
      '형식: Reading/Listening은 4지선다, Writing/Speaking은 작성/구술 응답.',
      section === 'Reading' || section === '리딩'
        ? 'Reading: 약 700단어의 학술 지문에 10문항. 세부사항, 문맥 어휘, 추론, 지시어, 문장 단순화, 문장 삽입 등을 평가합니다.'
        : section === 'Listening' || section === '리스닝'
          ? 'Listening: 강의·대화 기반. 오디오 없이 대학 생활 대화나 3–5문단 강의의 텍스트 전사를 만들고 그것에 대한 문제를 출제하세요.'
          : section === 'Speaking' || section === '스피킹'
            ? 'Speaking은 본래 구술. 이 실전 연습에서는 문제 지문을 제시하고 학생이 말할 답을 글로 쓰게 하세요. Independent Task = 개인 의견, Integrated Task = 읽기+듣기 후 요약.'
            : section === 'Writing' || section === '라이팅'
              ? 'Writing: Integrated Task(읽기+듣기 후 관계 요약), Academic Discussion(교수 질문과 학생 답변에 대한 응답).'
              : '',
    ].filter(Boolean).join(' ')

    case 'toeic': return [
      'TOEIC(국제 의사소통 영어 시험), 한국에서 매우 보편적인 직장 영어 시험입니다.',
      '형식: 4지선다(Reading + Listening), 990점 만점.',
      section === 'Listening' || section === '리스닝'
        ? '오디오 없이 짧은 비즈니스 맥락의 대화(전화, 회의, 안내방송)나 짧은 강연의 전사를 생성하세요.'
        : section === 'Reading' || section === '리딩'
          ? 'Part 5는 단문 문법·어휘, Part 6은 짧은 지문 빈칸, Part 7은 단일/복합 비즈니스 문서(이메일, 광고, 일정표) 독해입니다.'
          : '',
    ].filter(Boolean).join(' ')

    case 'ielts': return [
      'IELTS Academic — 영국 영어 기반의 영어 시험으로 영국·호주·캐나다 입학 및 이민에 사용됩니다. 1–9 밴드.',
      section === 'Reading' || section === '리딩'
        ? '3개의 긴 학술 지문, 다양한 문항 유형 — 객관식, True/False/Not Given, 제목 매칭, 문장 완성, 요약 완성 등.'
        : section === 'Listening' || section === '리스닝'
          ? '단답·객관식·매칭·서식 완성 등 4개의 녹음 기반 문제.'
          : '',
    ].filter(Boolean).join(' ')

    case 'act': return [
      'ACT — SAT의 대안인 미국 대학입학시험.',
      '형식: English/Reading/Science는 4지선다, Math는 5지선다.',
      section === 'English' || section === '영어'
        ? 'English: 짧은 지문에 밑줄 친 부분의 가장 좋은 수정 또는 NO CHANGE 선택.'
        : section === 'Math' || section === '수학'
          ? '수학: 60분 60문항, 대수·기하·삼각법, 5지선다.'
          : section === 'Reading' || section === '읽기'
            ? '4개의 긴 지문, 각 10문항, 장르 다양(픽션·사회과학·인문·자연과학).'
            : section === 'Science' || section === '과학'
              ? '과학: 자료 해석, 실험 요약, 상반된 견해. 암기보다 추론을 평가합니다.'
              : '',
    ].filter(Boolean).join(' ')

    case 'ap': return [
      `Advanced Placement(AP) 시험입니다.${section ? ` 과목: ${section}.` : ''}`,
      '형식: 4–5지선다(과목에 따라 다름) + 자유응답. 이 생성기는 객관식으로 작성하세요.',
      'AP 문제는 대학 입문 수준의 엄밀함을 가집니다. 해설에 관련 평가 기준을 언급하세요.',
    ].filter(Boolean).join(' ')

    case 'gre': return [
      'GRE General Test — 대학원 입학 시험.',
      section === 'Verbal Reasoning' || section === '언어 추론'
        ? 'Verbal: 독해, 빈칸 완성(1–3개 빈칸과 보기), 동등 문장(6개 중 동등한 문장을 만드는 2개 선택).'
        : section === 'Quantitative Reasoning' || section === '수리 추론'
          ? '수리: 양적 비교 + 일반 객관식 + 숫자 입력. 산술·대수·기하·자료 분석.'
          : section === 'Analytical Writing' || section === '분석적 작문'
            ? 'Analytical Writing은 본래 에세이. 글로 연습할 때는 문제만 제시하고 학생이 개요 또는 전체 글을 쓰도록 하세요.'
            : '',
    ].filter(Boolean).join(' ')
  }
}

/**
 * Convenience: render the right guidance block for the session's
 * language, returning empty string when category isn't test_prep.
 * Practice / lesson generators append this to their existing prompt
 * body so subject-mode prompts stay unchanged.
 */
export function renderTestPrepBlock(ctx: StudyPromptContext, language: 'en' | 'ko'): string {
  if (ctx.category !== 'test_prep' || !ctx.testFamily) return ''
  const block = language === 'ko'
    ? testFormatGuidanceKo(ctx.testFamily, ctx.testSection)
    : testFormatGuidanceEn(ctx.testFamily, ctx.testSection)
  return block.trim()
}
