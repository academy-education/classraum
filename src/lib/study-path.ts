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
 * Progression rules:
 *   - Node 0 always starts unlocked.
 *   - Node N unlocks once every prior node has been *touched* (any
 *     session created for its subtopicSlug + mode combination).
 *   - Node N is "completed" once the mastery for its subtopicSlug is
 *     >= completeMastery (default 65) OR a session of matching mode
 *     has been submitted with score >= completeScore (default 70).
 *
 * This is an MVP: templates live in code so we can iterate on shape
 * before committing to a DB schema. Once we've validated the pattern,
 * migrate to a `study_path_definitions` table.
 */

export type PathNodeKind = 'diagnostic' | 'practice' | 'section_test' | 'full_test' | 'lesson'

export interface StudyPathNode {
  /** Stable id for progression lookups. */
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
  /** Mastery threshold (0-100) to consider the node completed.
   *  Defaults to 65 if omitted. */
  completeMastery?: number
  /** Milestone nodes get a bigger visual + gold ring. */
  milestone?: boolean
}

export interface StudyPathTemplate {
  testSlug: string
  titleEn: string
  titleKo: string
  nodes: StudyPathNode[]
}

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
      detailEn: 'Quick 10-question warmup to gauge where you are.',
      detailKo: '10문항으로 현재 수준을 빠르게 확인해요.',
      subtopicSlug: 'sat-reading-writing',
      launchMode: 'practice',
      completeMastery: 0,  // completes on any attempt
    },
    {
      id: 'sat-rw-practice-1',
      kind: 'practice',
      labelEn: 'R&W · Warmup',
      labelKo: '읽기·쓰기 · 워밍업',
      detailEn: 'Build accuracy on short-passage questions.',
      detailKo: '짧은 지문 문제로 정확도를 높여요.',
      subtopicSlug: 'sat-reading-writing',
      launchMode: 'practice',
    },
    {
      id: 'sat-rw-practice-2',
      kind: 'practice',
      labelEn: 'R&W · Multi-paragraph',
      labelKo: '읽기·쓰기 · 장문',
      detailEn: 'Longer paragraphs, inference-heavy items.',
      detailKo: '더 긴 지문, 추론 중심 문제를 풀어요.',
      subtopicSlug: 'sat-reading-writing',
      launchMode: 'practice',
    },
    {
      id: 'sat-rw-section',
      kind: 'section_test',
      labelEn: 'R&W Section Test',
      labelKo: '읽기·쓰기 섹션 테스트',
      detailEn: 'Timed R&W section — 32 minutes, 27 items.',
      detailKo: '읽기·쓰기 섹션을 실전 시간으로 풀어요. 32분, 27문항.',
      subtopicSlug: 'sat-reading-writing',
      launchMode: 'full_test',
      milestone: true,
    },
    {
      id: 'sat-math-practice-1',
      kind: 'practice',
      labelEn: 'Math · Algebra',
      labelKo: '수학 · 대수',
      detailEn: 'Linear equations, inequalities, systems.',
      detailKo: '일차방정식, 부등식, 연립방정식을 다뤄요.',
      subtopicSlug: 'sat-math',
      launchMode: 'practice',
    },
    {
      id: 'sat-math-practice-2',
      kind: 'practice',
      labelEn: 'Math · Advanced',
      labelKo: '수학 · 심화',
      detailEn: 'Quadratics, functions, geometry.',
      detailKo: '이차식, 함수, 기하 문제를 풀어요.',
      subtopicSlug: 'sat-math',
      launchMode: 'practice',
    },
    {
      id: 'sat-math-section',
      kind: 'section_test',
      labelEn: 'Math Section Test',
      labelKo: '수학 섹션 테스트',
      detailEn: 'Timed Math section — 35 minutes, 22 items.',
      detailKo: '수학 섹션을 실전 시간으로 풀어요. 35분, 22문항.',
      subtopicSlug: 'sat-math',
      launchMode: 'full_test',
      milestone: true,
    },
    {
      id: 'sat-full-test',
      kind: 'full_test',
      labelEn: 'Full Practice Test',
      labelKo: '실전 모의고사',
      detailEn: 'Complete SAT — both sections, back-to-back.',
      detailKo: '두 섹션을 연속해서 푸는 실전 모의고사.',
      subtopicSlug: 'test-sat',
      launchMode: 'full_test',
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

export interface PathNodeState {
  status: 'locked' | 'active' | 'completed'
  masteryPct: number | null
  completedAt: string | null
}

export interface PathNodeWithState extends StudyPathNode {
  state: PathNodeState
}

/**
 * Fold student mastery + session history over a template into a
 * status-annotated node list ready for rendering. The active node is
 * the first non-completed node whose prior nodes are all completed.
 *
 * masteryBySlug: catalog-slug → mastery percentage (0-100). Nulls
 *                allowed for topics the student hasn't touched.
 * completedSlugs: set of subtopicSlugs that have at least one
 *                 completed session — cheap "have you engaged" signal
 *                 independent of mastery.
 */
export function annotatePath(
  template: StudyPathTemplate,
  masteryBySlug: Record<string, number>,
  completedSlugs: Set<string>,
): PathNodeWithState[] {
  const out: PathNodeWithState[] = []
  let activeAssigned = false

  for (const node of template.nodes) {
    const mastery = masteryBySlug[node.subtopicSlug] ?? null
    const threshold = node.completeMastery ?? 65
    const isCompleted =
      (threshold === 0 && completedSlugs.has(node.subtopicSlug)) ||
      (mastery !== null && mastery >= threshold)

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
        masteryPct: mastery,
        completedAt: null,  // future: pull from most-recent completed session
      },
    })
  }

  // Edge case: every node is completed → mark the last one as
  // 'active' so the student can still tap to review it. Prevents the
  // path looking abandoned once the student finishes.
  if (!activeAssigned && out.length > 0) {
    out[out.length - 1] = { ...out[out.length - 1], state: { ...out[out.length - 1].state, status: 'active' } }
  }

  return out
}
