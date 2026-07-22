/**
 * Study-path templates — hand-crafted per-test node graphs that
 * become the primary progression surface at /mobile/study/path.
 *
 * A path is a linear sequence of nodes. Each node represents a
 * concrete activity (a practice session, a section mini-test, a full
 * timed test), NOT a topic in the catalog. This mirrors Duolingo's
 * unit-tree pattern (each node is a lesson, not a concept) — the
 * research pass flagged it as the highest-leverage UX shift over our
 * current shelf-and-grid landing.
 *
 * CURRICULUM SHAPE (v2): each node focuses on ONE College Board
 * content domain at a time (the `domain` field filters the bank draw),
 * ramping Level I (easy/medium) → Level II (medium/hard) → timed
 * section test → final full-length mocks. One skill at a time, slowly
 * building up to the real test.
 *
 * Progression rules:
 *   - Node 0 always starts unlocked.
 *   - Nodes are strictly linear: the first non-completed node is
 *     "active", everything after it is locked.
 *   - A node is "completed" once a session tagged with its id
 *     (config.pathNode) reaches status='completed' — practice sessions
 *     complete via /api/study/practice/complete when the set is
 *     finished; full tests complete on submit.
 *   - Completed nodes are TERMINAL: a single stop can never be
 *     replayed (server-enforced in practice/generate + test/assemble).
 *     The only repeat is the WHOLE path via /api/study/path/repeat,
 *     which costs PATH_REPEAT_CREDITS and archives every path-tagged
 *     session so the student starts over from node 0.
 *   - Every non-mock stop serves exactly 3 questions. Mock-test stops
 *     (launchMode 'full_test') keep their full-length behavior.
 *
 * Templates live in code so we can iterate on shape before committing
 * to a DB schema. Once validated, migrate to `study_path_definitions`.
 */

export type PathNodeKind = 'diagnostic' | 'practice' | 'section_test' | 'full_test' | 'lesson'

export interface StudyPathNode {
  /** Stable id for progression lookups — stored in session config. */
  id: string
  /** Node kind — drives icon + copy + launch behavior. */
  kind: PathNodeKind
  /** Bilingual short label rendered on the node. */
  labelEn: string
  labelKo: string
  /** One-line description shown when the node is the active one. */
  detailEn: string
  detailKo: string
  /** Catalog slug this node exercises. Matches study_topics.slug. */
  subtopicSlug: string
  /** Which session mode to launch — matches study_sessions.mode. */
  launchMode: 'full_test' | 'practice' | 'lesson' | 'chat'
  /** Bank content-domain filter for practice draws. Must match
   *  study_item_bank.domain exactly (e.g. 'Algebra'). Omitted →
   *  mixed draw across the section. */
  domain?: string
  /** Bank difficulty filter for practice draws. Omitted → all. */
  difficulties?: Array<'easy' | 'medium' | 'hard'>
  /** Items in the session: practice batch size or section-test length. */
  questionCount?: number
  /** Milestone nodes get a bigger visual + gold ring. */
  milestone?: boolean
}

export interface StudyPathTemplate {
  testSlug: string
  titleEn: string
  titleKo: string
  nodes: StudyPathNode[]
}

/** Credits charged to repeat the whole path once it's fully completed.
 *  Shared by the repeat API route (server-side charge) and the path
 *  page (client-side confirm copy + balance pre-check). */
export const PATH_REPEAT_CREDITS = 2

/** Question count for every non-mock path stop. Mock-test stops
 *  (launchMode 'full_test') keep their own full-length counts. */
export const PATH_STOP_QUESTION_COUNT = 3

/** How many questions a standalone practice set serves (the topic-page
 *  "Practice questions" card). Kept here so the card's label and the
 *  generate route's default draw the same number. */
export const PRACTICE_SESSION_QUESTION_COUNT = 5

const RW = 'sat-reading-writing'
const MATH = 'sat-math'

const SAT_PATH: StudyPathTemplate = {
  testSlug: 'test-sat',
  titleEn: 'Your SAT Path',
  titleKo: 'SAT 학습 경로',
  nodes: [
    {
      id: 'sat-diagnostic',
      kind: 'diagnostic',
      labelEn: 'Diagnostic',
      labelKo: '진단 평가',
      detailEn: 'Quick 3-question check across Reading & Writing to gauge where you are.',
      detailKo: '읽기·쓰기 3문항으로 현재 수준을 빠르게 확인해요.',
      subtopicSlug: RW,
      launchMode: 'practice',
      questionCount: PATH_STOP_QUESTION_COUNT,
    },
    // ── Unit 1 · Reading & Writing — one domain at a time ──
    {
      id: 'sat-rw-info-1',
      kind: 'practice',
      labelEn: 'Info & Ideas I',
      labelKo: '정보와 아이디어 I',
      detailEn: 'Central ideas, evidence, and inference — the core reading skills.',
      detailKo: '중심 내용, 근거 찾기, 추론 — 독해의 핵심 스킬이에요.',
      subtopicSlug: RW,
      launchMode: 'practice',
      domain: 'Information and Ideas',
      difficulties: ['easy', 'medium'],
      questionCount: PATH_STOP_QUESTION_COUNT,
    },
    {
      id: 'sat-rw-info-2',
      kind: 'practice',
      labelEn: 'Info & Ideas II',
      labelKo: '정보와 아이디어 II',
      detailEn: 'Same skills, tougher passages — quantitative evidence and dense inference.',
      detailKo: '같은 스킬, 더 어려운 지문 — 자료 해석과 고난도 추론.',
      subtopicSlug: RW,
      launchMode: 'practice',
      domain: 'Information and Ideas',
      difficulties: ['medium', 'hard'],
      questionCount: PATH_STOP_QUESTION_COUNT,
    },
    {
      id: 'sat-rw-craft-1',
      kind: 'practice',
      labelEn: 'Craft & Structure I',
      labelKo: '표현과 구조 I',
      detailEn: 'Words in context, text structure, and author purpose.',
      detailKo: '문맥 속 어휘, 글의 구조, 저자의 의도를 다뤄요.',
      subtopicSlug: RW,
      launchMode: 'practice',
      domain: 'Craft and Structure',
      difficulties: ['easy', 'medium'],
      questionCount: PATH_STOP_QUESTION_COUNT,
    },
    {
      id: 'sat-rw-craft-2',
      kind: 'practice',
      labelEn: 'Craft & Structure II',
      labelKo: '표현과 구조 II',
      detailEn: 'Cross-text connections and precision vocabulary at test difficulty.',
      detailKo: '지문 간 비교와 고난도 어휘 문제를 실전 난이도로.',
      subtopicSlug: RW,
      launchMode: 'practice',
      domain: 'Craft and Structure',
      difficulties: ['medium', 'hard'],
      questionCount: PATH_STOP_QUESTION_COUNT,
    },
    {
      id: 'sat-rw-conventions-1',
      kind: 'practice',
      labelEn: 'Conventions I',
      labelKo: '문법 규칙 I',
      detailEn: 'Sentence boundaries, punctuation, and agreement basics.',
      detailKo: '문장 경계, 구두점, 수 일치의 기본기를 다져요.',
      subtopicSlug: RW,
      launchMode: 'practice',
      domain: 'Standard English Conventions',
      difficulties: ['easy', 'medium'],
      questionCount: PATH_STOP_QUESTION_COUNT,
    },
    {
      id: 'sat-rw-conventions-2',
      kind: 'practice',
      labelEn: 'Conventions II',
      labelKo: '문법 규칙 II',
      detailEn: 'Trickier boundaries, modifiers, and verb forms.',
      detailKo: '까다로운 문장 구조, 수식어, 동사 형태 문제.',
      subtopicSlug: RW,
      launchMode: 'practice',
      domain: 'Standard English Conventions',
      difficulties: ['medium', 'hard'],
      questionCount: PATH_STOP_QUESTION_COUNT,
    },
    {
      id: 'sat-rw-expression',
      kind: 'practice',
      labelEn: 'Expression of Ideas',
      labelKo: '아이디어 표현',
      detailEn: 'Rhetorical synthesis and transitions — writing that flows.',
      detailKo: '수사적 종합과 연결어 — 자연스러운 글쓰기 감각.',
      subtopicSlug: RW,
      launchMode: 'practice',
      domain: 'Expression of Ideas',
      questionCount: PATH_STOP_QUESTION_COUNT,
    },
    {
      id: 'sat-rw-section',
      kind: 'section_test',
      labelEn: 'R&W Section Test',
      labelKo: '읽기·쓰기 섹션 테스트',
      detailEn: 'Timed R&W section — 27 items mixing every domain you just trained.',
      detailKo: '지금까지 익힌 모든 영역을 섞은 27문항 실전 섹션.',
      subtopicSlug: RW,
      launchMode: 'full_test',
      questionCount: 27,
      milestone: true,
    },
    // ── Unit 2 · Math — one domain at a time ──
    {
      id: 'sat-math-algebra-1',
      kind: 'practice',
      labelEn: 'Algebra I',
      labelKo: '대수 I',
      detailEn: 'Linear equations, inequalities, and systems.',
      detailKo: '일차방정식, 부등식, 연립방정식을 다뤄요.',
      subtopicSlug: MATH,
      launchMode: 'practice',
      domain: 'Algebra',
      difficulties: ['easy', 'medium'],
      questionCount: PATH_STOP_QUESTION_COUNT,
    },
    {
      id: 'sat-math-algebra-2',
      kind: 'practice',
      labelEn: 'Algebra II',
      labelKo: '대수 II',
      detailEn: 'Harder linear modeling and multi-step systems.',
      detailKo: '고난도 일차 모델링과 다단계 연립 문제.',
      subtopicSlug: MATH,
      launchMode: 'practice',
      domain: 'Algebra',
      difficulties: ['medium', 'hard'],
      questionCount: PATH_STOP_QUESTION_COUNT,
    },
    {
      id: 'sat-math-advanced-1',
      kind: 'practice',
      labelEn: 'Advanced Math I',
      labelKo: '심화 수학 I',
      detailEn: 'Quadratics, exponentials, and nonlinear functions.',
      detailKo: '이차식, 지수함수, 비선형 함수를 다뤄요.',
      subtopicSlug: MATH,
      launchMode: 'practice',
      domain: 'Advanced Math',
      difficulties: ['easy', 'medium'],
      questionCount: PATH_STOP_QUESTION_COUNT,
    },
    {
      id: 'sat-math-advanced-2',
      kind: 'practice',
      labelEn: 'Advanced Math II',
      labelKo: '심화 수학 II',
      detailEn: 'Function composition and the hardest nonlinear items.',
      detailKo: '함수 합성과 최고난도 비선형 문제.',
      subtopicSlug: MATH,
      launchMode: 'practice',
      domain: 'Advanced Math',
      difficulties: ['medium', 'hard'],
      questionCount: PATH_STOP_QUESTION_COUNT,
    },
    {
      id: 'sat-math-data',
      kind: 'practice',
      labelEn: 'Data Analysis',
      labelKo: '자료 분석',
      detailEn: 'Ratios, percentages, and interpreting data.',
      detailKo: '비율, 백분율, 자료 해석을 다뤄요.',
      subtopicSlug: MATH,
      launchMode: 'practice',
      domain: 'Problem-Solving and Data Analysis',
      questionCount: PATH_STOP_QUESTION_COUNT,
    },
    {
      id: 'sat-math-geometry',
      kind: 'practice',
      labelEn: 'Geometry & Trig',
      labelKo: '기하와 삼각비',
      detailEn: 'Angles, circles, triangles, and trigonometry.',
      detailKo: '각, 원, 삼각형, 삼각비 문제를 풀어요.',
      subtopicSlug: MATH,
      launchMode: 'practice',
      domain: 'Geometry and Trigonometry',
      questionCount: PATH_STOP_QUESTION_COUNT,
    },
    {
      id: 'sat-math-section',
      kind: 'section_test',
      labelEn: 'Math Section Test',
      labelKo: '수학 섹션 테스트',
      detailEn: 'Timed Math section — 22 items across every domain.',
      detailKo: '모든 영역을 섞은 22문항 실전 수학 섹션.',
      subtopicSlug: MATH,
      launchMode: 'full_test',
      questionCount: 22,
      milestone: true,
    },
    // ── Finale · fresh full-length mocks (the exposure ledger keeps
    //    these from repeating items you saw in earlier nodes) ──
    {
      id: 'sat-final-rw',
      kind: 'full_test',
      labelEn: 'Final Mock · R&W',
      labelKo: '파이널 모의고사 · 읽기·쓰기',
      detailEn: 'Full-length R&W mock with fresh questions. Test-day conditions.',
      detailKo: '새 문항으로 구성된 실전 읽기·쓰기 모의고사.',
      subtopicSlug: RW,
      launchMode: 'full_test',
      questionCount: 27,
      milestone: true,
    },
    {
      id: 'sat-final-math',
      kind: 'full_test',
      labelEn: 'Final Mock · Math',
      labelKo: '파이널 모의고사 · 수학',
      detailEn: 'Full-length Math mock with fresh questions. You are ready.',
      detailKo: '새 문항으로 구성된 실전 수학 모의고사. 이제 준비됐어요.',
      subtopicSlug: MATH,
      launchMode: 'full_test',
      questionCount: 22,
      milestone: true,
    },
  ],
}

const TOEFL_PATH: StudyPathTemplate = {
  testSlug: 'test-toefl',
  titleEn: 'Your TOEFL Path',
  titleKo: 'TOEFL 학습 경로',
  nodes: [
    {
      id: 'toefl-reading-practice',
      kind: 'practice',
      labelEn: 'Reading · Warmup',
      labelKo: '읽기 · 워밍업',
      detailEn: 'Short-passage comprehension.',
      detailKo: '짧은 지문 이해 문제로 시작해요.',
      subtopicSlug: 'toefl-reading',
      launchMode: 'practice',
      questionCount: PATH_STOP_QUESTION_COUNT,
    },
    {
      id: 'toefl-reading-section',
      kind: 'section_test',
      labelEn: 'Reading Section',
      labelKo: '읽기 섹션',
      detailEn: 'Timed Reading — 35 min, 20 items.',
      detailKo: '읽기 섹션을 실전 시간으로 풀어요. 35분, 20문항.',
      subtopicSlug: 'toefl-reading',
      launchMode: 'full_test',
      milestone: true,
    },
    {
      id: 'toefl-listening-practice',
      kind: 'practice',
      labelEn: 'Listening · Warmup',
      labelKo: '듣기 · 워밍업',
      detailEn: 'Lecture and conversation excerpts.',
      detailKo: '강의와 대화 발췌 듣기.',
      subtopicSlug: 'toefl-listening',
      launchMode: 'practice',
      questionCount: PATH_STOP_QUESTION_COUNT,
    },
    {
      id: 'toefl-listening-section',
      kind: 'section_test',
      labelEn: 'Listening Section',
      labelKo: '듣기 섹션',
      detailEn: 'Timed Listening — 36 min, 28 items.',
      detailKo: '듣기 섹션을 실전 시간으로 풀어요. 36분, 28문항.',
      subtopicSlug: 'toefl-listening',
      launchMode: 'full_test',
      milestone: true,
    },
    {
      id: 'toefl-speaking',
      kind: 'section_test',
      labelEn: 'Speaking Section',
      labelKo: '말하기 섹션',
      detailEn: 'Four speaking tasks with recording + AI feedback.',
      detailKo: '녹음과 AI 피드백으로 네 가지 말하기 과제를 풀어요.',
      subtopicSlug: 'toefl-speaking',
      launchMode: 'full_test',
      milestone: true,
    },
    {
      id: 'toefl-writing',
      kind: 'section_test',
      labelEn: 'Writing Section',
      labelKo: '쓰기 섹션',
      detailEn: 'Academic Discussion + Email tasks.',
      detailKo: '학술 토론과 이메일 과제.',
      subtopicSlug: 'toefl-writing',
      launchMode: 'full_test',
      milestone: true,
    },
  ],
}

const TEMPLATES: Record<string, StudyPathTemplate> = {
  SAT: SAT_PATH,
  TOEFL: TOEFL_PATH,
}

/**
 * Resolve the path template for a student's target test. Case-insensitive
 * on the input so we accept 'sat' / 'SAT' / 'Sat' interchangeably.
 * Returns null if no template exists yet — the caller renders an
 * onboarding-style "pick a target test to build your path" empty state.
 */
export function getPathTemplate(targetTest: string | null | undefined): StudyPathTemplate | null {
  if (!targetTest) return null
  return TEMPLATES[targetTest.toUpperCase()] ?? null
}

/** Node id → bilingual label, across every template. Used by surfaces
 *  that only have a session's config.pathNode (e.g. history rows) to
 *  show "Info & Ideas I" instead of a generic topic name. */
export function getPathNodeLabel(nodeId: string | null | undefined, ko: boolean): string | null {
  if (!nodeId) return null
  for (const tpl of Object.values(TEMPLATES)) {
    const node = tpl.nodes.find(n => n.id === nodeId)
    if (node) return ko ? node.labelKo : node.labelEn
  }
  return null
}

/** Per-node progress folded from the student's path-tagged sessions
 *  (config.pathNode === node.id). */
export interface PathNodeProgress {
  /** Any session exists for this node. */
  touched: boolean
  /** A session for this node reached status='completed'. */
  completed: boolean
  /** Best score (0-100) across the node's completed sessions. */
  bestScore: number | null
  /** Most recent NON-completed session — tapping the node resumes it
   *  instead of creating a duplicate. */
  resumeSessionId: string | null
  /** Most recent COMPLETED session — completed nodes link to its
   *  results (summary page) instead of restarting. */
  completedSessionId: string | null
}

export interface PathNodeState {
  status: 'locked' | 'active' | 'completed'
  bestScore: number | null
  resumeSessionId: string | null
  completedSessionId: string | null
}

export interface PathNodeWithState extends StudyPathNode {
  state: PathNodeState
}

/**
 * Fold per-node session progress over a template into a
 * status-annotated node list ready for rendering. Strictly linear:
 * the first non-completed node is active, everything after is locked.
 */
export function annotatePath(
  template: StudyPathTemplate,
  progressByNode: Record<string, PathNodeProgress>,
): PathNodeWithState[] {
  const out: PathNodeWithState[] = []
  let activeAssigned = false

  for (const node of template.nodes) {
    const p = progressByNode[node.id]
    const isCompleted = p?.completed ?? false

    let status: PathNodeState['status']
    if (isCompleted) {
      status = 'completed'
    } else if (!activeAssigned) {
      status = 'active'
      activeAssigned = true
    } else {
      status = 'locked'
    }

    out.push({
      ...node,
      state: {
        status,
        bestScore: p?.bestScore ?? null,
        resumeSessionId: p?.resumeSessionId ?? null,
        completedSessionId: p?.completedSessionId ?? null,
      },
    })
  }

  // When every node is completed we deliberately leave them ALL
  // 'completed' (checked + inert) — single stops can never be
  // replayed. The path page renders a "repeat the whole path" CTA
  // (2 credits) instead of relabeling the last node active.
  return out
}
