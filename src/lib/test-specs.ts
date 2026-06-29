/**
 * Hand-curated specifications for the standardized tests Classraum
 * covers. Each entry pins down what the AI generator must produce —
 * section name, question count, time, choice count, scoring, and the
 * concrete question patterns that show up.
 *
 * Why hand-curated? The model's memory of test format drifts (the
 * Digital SAT switched format in 2024 — gpt-4o-mini in particular
 * gets it wrong). Injecting a fact sheet at generation time turns
 * the model's job from "remember what SAT looks like" into "follow
 * this spec exactly," which is what we want.
 *
 * Keep this file as ground truth. Source-check entries against the
 * test maker's official site (College Board / ETS / ACT / Pearson /
 * 한국교육과정평가원) before changing.
 */

import type { TestFamily } from '@/lib/study-prompt-context'

export interface SectionSpec {
  /** Section label as it appears in the catalog (must match study_topics.name_en). */
  name_en: string
  /** Korean catalog label. */
  name_ko: string
  /** How many questions live in this section/module on the real test. */
  questionsPerSection: number
  /** Minutes allotted on the real test. */
  minutesPerSection: number
  /** How many choices each multiple-choice question carries. */
  choiceCount: 4 | 5
  /** One paragraph describing the section's distinct question patterns. */
  patterns_en: string
  patterns_ko: string
  /** Common student mistakes for distractor design. */
  distractorPatterns_en: string
  distractorPatterns_ko: string
  /** Real-test difficulty distribution. Fractions sum to ~1.0. Drives
   *  how many hard vs medium vs easy items the generator targets.
   *  Stored per-section because tests vary wildly — KSAT Math has
   *  killer items (high hard%); TOEIC Reading is mostly easy/medium.
   *  When absent the generator falls back to 30/50/20. */
  difficultyMix?: { easy: number; medium: number; hard: number }
  /** Prose describing what a HARD item looks like for THIS section
   *  specifically. Used as the focused-pass framing so the hard-only
   *  generation pass has a tight spec rather than the generic
   *  "multi-step reasoning" hint. Optional — falls back to a generic
   *  hard-item description when missing. */
  hardItemFraming_en?: string
  hardItemFraming_ko?: string
  /** Worked HARD examples — concrete items the model can pattern-match
   *  against. Framing alone isn't enough; the model labels easy items
   *  as "hard" without an exemplar. Each entry should be a full
   *  problem statement with answer + why-it's-hard reasoning. */
  hardItemExamples_en?: string[]
  hardItemExamples_ko?: string[]
}

export interface TestSpec {
  /** Short display name used in prompts. */
  display: string
  /** One-line framing. */
  framing_en: string
  framing_ko: string
  sections: SectionSpec[]
}

/**
 * The test specs. Numbers verified against official documentation as
 * of mid-2026; revisit when a test redesigns (digital SAT mostly
 * stable since 2024, KSAT format unchanged since 2022, TOEFL iBT
 * stable since 2023 trimmings).
 */
export const TEST_SPECS: Partial<Record<TestFamily, TestSpec>> = {
  sat: {
    display: 'Digital SAT',
    framing_en: 'The College Board\'s Digital SAT (post-March 2024). Each section is delivered as TWO adaptive modules (difficulty of module 2 depends on module 1 performance). Full test = 98 questions across 134 minutes: R&W (54 Q / 64 min, two 27-Q / 32-min modules) + Math (44 Q / 70 min, two 22-Q / 35-min modules). For a full-section practice test, generate ALL 54 (R&W) or 44 (Math) questions — that\'s what a real student sees.',
    framing_ko: 'College Board의 디지털 SAT (2024년 3월 이후). 각 영역은 2개의 적응형 모듈로 구성(모듈 2의 난이도는 모듈 1 성적에 따라 결정). 전체 시험 = 98문항 / 134분: 읽기·쓰기(54문항 / 64분, 27문항·32분짜리 모듈 2개) + 수학(44문항 / 70분, 22문항·35분짜리 모듈 2개). 한 영역 모의고사는 전체 54문항(읽기·쓰기) 또는 44문항(수학) 생성 — 실제 학생이 보는 분량.',
    sections: [
      {
        name_en: 'Reading & Writing',
        name_ko: '읽기와 쓰기',
        questionsPerSection: 54,
        minutesPerSection: 64,
        choiceCount: 4,
        patterns_en: 'Full section = 54 questions across 64 min (two 27-Q / 32-min adaptive modules). Each question pairs a SHORT passage (25-150 words) with a single question — no multi-question passages. Categories: Information & Ideas (~26%) — main idea, supporting details, inference, command of evidence. Craft & Structure (~28%) — words in context, text structure, cross-text connections, purpose. Expression of Ideas (~20%) — rhetorical synthesis (use bullet notes to fulfill a goal), transitions. Standard English Conventions (~26%) — sentence boundaries, agreement, punctuation, modifier placement. Difficulty rises within each module — module 2 hard items pair dense academic prose with subtle distinctions.',
        patterns_ko: '전체 영역 = 54문항 / 64분 (27문항·32분 적응형 모듈 2개). 각 문제는 짧은 지문(25-150단어)과 단일 문제로 구성 — 한 지문에 여러 문항 없음. 분류: Information & Ideas (~26%) — 주제, 세부사항, 추론, 근거 명령. Craft & Structure (~28%) — 문맥 어휘, 글의 구조, 글 간 연결, 목적. Expression of Ideas (~20%) — 수사적 종합(불릿 노트로 목표 달성), 전환어. Standard English Conventions (~26%) — 문장 경계, 일치, 구두점, 수식어 위치. 각 모듈 안에서 난이도 상승 — 모듈 2 어려운 문항은 학술적 산문에 미묘한 차이.',
        distractorPatterns_en: 'Wrong answers should be: (1) extreme/absolute restatements of a moderate claim, (2) facts true in the world but unsupported by the passage, (3) plausible but uses a word the passage explicitly rejects, (4) the "trap" choice that summarizes only the first sentence of a passage that pivots later.',
        distractorPatterns_ko: '오답은 다음과 같아야 합니다: (1) 중간 정도의 주장을 극단적·절대적으로 바꾼 표현, (2) 현실에서는 맞지만 지문에는 근거 없음, (3) 그럴듯하지만 지문이 명시적으로 거부한 단어 사용, (4) 지문이 중간에 전환되는데 첫 문장만 요약한 함정 선택지.',
        difficultyMix: { easy: 0.30, medium: 0.50, hard: 0.20 },
        hardItemFraming_en: 'A HARD SAT R&W item pairs dense academic prose (often 1850s-1920s literary or historical primary sources, or a recent humanities/science excerpt with technical vocabulary) with a question that turns on a SUBTLE distinction. The trap is usually the choice that matches the passage\'s surface vocabulary but inverts the author\'s actual stance, or that\'s true of one paragraph but contradicted by a later pivot. Hard "words in context" items pick a common word used in an unfamiliar register (e.g. "wanting" = lacking, not desiring). Hard inference items require connecting two distant claims, not just paraphrasing one. AVOID: bare main-idea, simple grammar, vocab a student could solve from a dictionary.',
        hardItemFraming_ko: '어려운 SAT R&W 문항은 밀도 높은 학술 산문(1850-1920년대 문학·역사 1차 사료, 또는 전문 어휘를 포함한 최근 인문·과학 발췌문)과 미묘한 구분에 답이 갈리는 문제를 짝짓습니다. 함정은 보통 지문의 표면 어휘는 일치하지만 저자의 실제 입장을 뒤집는 선택지, 또는 한 문단은 지지하지만 뒤 문단의 전환이 반박하는 선택지입니다. 어려운 "문맥 어휘" 문항은 흔한 단어를 낯선 의미로(예: "wanting" = 부족함, 욕망 아님) 사용. 어려운 추론 문항은 두 개의 떨어진 진술을 연결해야 함 — 한 문장 패러프레이즈 아님. 피할 것: 단순 주제, 단순 문법, 사전만 봐도 풀 수 있는 어휘.',
        hardItemExamples_en: [
          `EXAMPLE 1 (verified hard, "logically completes the text"):
Passage: "The following text is adapted from Octavia Butler's 1979 novel Kindred. The narrator, a Black woman from 1976, has been pulled back in time. 'I had no idea where I was, no idea at all of what year it might be. There was nothing to indicate—'"
Prompt: "Which choice most logically completes the text?"
Choices: ["a sudden shift in the texture of the dirt road under her feet", "any landmark that would tell her she had returned to her own century", "the presence of unfamiliar people just over the rise", "a clear plan for how she might find help"]
Correct: "any landmark that would tell her she had returned to her own century"
Why hard: the trap "presence of unfamiliar people" matches the surface theme of being lost, but only "landmark... own century" completes the LOGIC of "nothing to indicate WHAT YEAR".`,

          `EXAMPLE 2 (verified hard, "words in context"):
Passage: "Charlotte Brontë's Villette (1853) presents Lucy Snowe, a heroine wanting in the social advantages that lubricate Victorian life. Without family, wealth, or beauty, she observes the brilliant Polly Home from a distance, knowing that doors open easily for Polly that remain closed to her."
Prompt: "As used in the text, what does the word \"wanting\" most nearly mean?"
Choices: ["desiring", "expecting", "lacking", "requesting"]
Correct: "lacking"
Why hard: "wanting" most commonly means "desiring" — students reflexively pick that. The construction "wanting in [advantages]" reverses to "without advantages" = lacking. The trap is the dominant modern sense.`,
        ],
        hardItemExamples_ko: [
          `예시 1 (검증된 어려움, "글을 가장 논리적으로 완성"):
지문: "다음은 옥타비아 버틀러의 1979년 소설 Kindred에서 발췌. 화자는 1976년의 흑인 여성으로, 과거로 끌려갔다. '내가 어디에 있는지 전혀 몰랐고, 지금이 몇 년인지도 전혀 몰랐다. 아무것도 알려주지 않았다—'"
문제: "글을 가장 논리적으로 완성하는 선택지는?"
보기: ["발 아래 흙길의 질감의 갑작스러운 변화", "그녀가 자신의 세기로 돌아왔음을 알려줄 어떤 지표", "언덕 너머의 낯선 사람들의 존재", "도움을 받는 방법에 대한 명확한 계획"]
정답: "그녀가 자신의 세기로 돌아왔음을 알려줄 어떤 지표"
어려운 이유: 함정 "낯선 사람들의 존재"는 길을 잃은 표면적 주제와 일치하지만, "지표... 자신의 세기"만이 "몇 년인지 알려주는 게 없었다"의 논리를 완성.`,

          `예시 2 (검증된 어려움, "문맥 어휘"):
지문: "샬럿 브론테의 Villette(1853)은 빅토리아 시대 삶을 윤활하는 사회적 이점이 wanting한 주인공 루시 스노우를 그린다. 가족도, 부도, 미모도 없는 그녀는 멀리서 빛나는 폴리 홈을 지켜보며, 폴리에게는 쉽게 열리는 문들이 자신에게는 닫혀 있음을 안다."
문제: "글에서 사용된 "wanting"의 의미와 가장 가까운 것은?"
보기: ["desiring (원하는)", "expecting (기대하는)", "lacking (결여된)", "requesting (요청하는)"]
정답: "lacking (결여된)"
어려운 이유: "wanting"의 가장 흔한 의미는 "원하다" — 학생들은 반사적으로 그것을 고름. "wanting in [이점]" 구문은 "이점이 없는" = 결여된으로 뒤집힘. 함정은 지배적인 현대 의미.`,
        ],
      },
      {
        name_en: 'Math',
        name_ko: '수학',
        questionsPerSection: 44,
        minutesPerSection: 70,
        choiceCount: 4,
        patterns_en: 'Full section = 44 questions across 70 min (two 22-Q / 35-min adaptive modules). Mix of multiple choice and student-produced response (SPR ~25%). For multiple-choice generation, stick to MC. Categories: Algebra (~35%) — linear equations, inequalities, systems, absolute value. Advanced Math (~35%) — quadratics, exponentials, polynomials, rational expressions. Problem Solving & Data Analysis (~15%) — ratios, percentages, probability, scatterplots, two-way tables. Geometry & Trigonometry (~15%) — lines/angles, triangles, circles, area/volume, right-triangle trig. Calculator (built-in Desmos) on every question. Most questions are CONTEXTUALIZED word problems with real-world setups (revenue/cost models, science data, mixture problems), not bare-symbol arithmetic. Difficulty rises within each module — module 2 hard items genuinely require multi-step reasoning + non-obvious setup.',
        patterns_ko: '객관식 + 학생 단답형(SPR) 혼합. 객관식 생성에서는 MC만. 분류: 대수 (~35%) — 1차방정식·부등식·연립·절댓값. 고급 수학 (~35%) — 이차·지수·다항식·유리식. 문제 해결·자료 분석 (~15%) — 비율·백분율·확률·산점도·이원 분할표. 기하·삼각법 (~15%) — 직선·각·삼각형·원·넓이·부피·직각삼각형 삼각비. 모든 문제에서 데스모스 계산기 사용 가능.',
        distractorPatterns_en: 'Wrong answers should encode specific arithmetic / sign / order-of-operations mistakes: (1) sign-flip (got x = -3 instead of 3), (2) off-by-one or off-by-coefficient, (3) used the wrong variable from the system, (4) the value of one intermediate step instead of the final answer.',
        distractorPatterns_ko: '오답은 구체적인 산술/부호/연산 순서 실수를 반영: (1) 부호 반전(x = 3 대신 x = -3), (2) 1 또는 계수 차이, (3) 연립에서 다른 변수의 값, (4) 최종 답이 아니라 중간 단계의 값.',
        difficultyMix: { easy: 0.30, medium: 0.50, hard: 0.20 },
        hardItemFraming_en: 'A HARD SAT Math item is a CONTEXTUALIZED multi-step problem — almost always a word problem with a real-world setup (linear or nonlinear modeling of revenue/cost/biology/chemistry/motion, geometry with a hidden similar-triangles or unit-circle relationship, data interpretation from a table or scatterplot the student must translate into an equation first). It requires THREE or more reasoning steps: (1) translate the prose into a mathematical statement, (2) recognize WHICH technique applies (factoring? completing the square? system substitution? Pythagoras?), (3) execute the technique, and often (4) sanity-check by plugging back in. Distractors must encode specific common errors at each step. AVOID: "solve 2x+3=11", "what is the area of a circle with radius 5", "evaluate f(2)" — these are easy or medium at best.',
        hardItemFraming_ko: '어려운 SAT 수학 문항은 맥락화된 다단계 문제 — 거의 항상 실세계 설정의 서술형(수익·비용·생물·화학·운동의 일·이차 모델링, 닮음 삼각형 또는 단위원 관계가 숨겨진 기하, 학생이 먼저 수식으로 번역해야 하는 표·산점도 자료 해석). 세 단계 이상의 추론 필요: (1) 산문을 수학적 진술로 번역, (2) 어떤 기법이 적용되는지 인식(인수분해? 완전제곱? 연립 대입? 피타고라스?), (3) 기법 실행, 종종 (4) 대입해 검산. 함정은 각 단계의 흔한 실수를 정확히 반영. 피할 것: "2x+3=11 풀기", "반지름 5인 원 넓이", "f(2) 계산" — 이건 잘해야 쉬움/보통.',
        hardItemExamples_en: [
          `EXAMPLE 1 (verified hard):
Prompt: "A biologist models a bacterial population with the function P(t) = 50 · 2^(t/3), where t is time in hours and P is the number of bacteria. A second model, used for a different strain, satisfies P(t) = 50 · 2^(t/4). After how many whole hours will the second strain's population first equal half the first strain's population at the same time?"
Choices: ["6", "12", "18", "24"]
Correct: "12"
Why hard: requires setting up 50·2^(t/4) = (1/2)(50·2^(t/3)) → 2^(t/4) = 2^(t/3 - 1) → t/4 = t/3 - 1 → solve to t = 12. Three steps + exponent manipulation + must recognize "first whole hour" constrains answer.`,

          `EXAMPLE 2 (verified hard):
Prompt: "A circle in the xy-plane has equation x² + y² - 6x + 8y = 0. A line passes through the center of the circle and through the point (5, 1). What is the slope of the line?"
Choices: ["-5/2", "-2/5", "2/5", "5/2"]
Correct: "5/2"
Why hard: requires completing the square to find center is (3, -4) — students often skip this and use the equation's leading terms as the center. Then slope = (1 - (-4))/(5 - 3) = 5/2. Distractors encode (a) sign-flip on -4, (b) using y-coord first, (c) using uncompleted form.`,
        ],
        hardItemExamples_ko: [
          `예시 1 (검증된 어려움):
문제: "한 생물학자가 박테리아 개체군을 P(t) = 50 · 2^(t/3) 함수로 모델링했다(t는 시간, P는 박테리아 수). 다른 균주의 모델은 P(t) = 50 · 2^(t/4)이다. 같은 시점에서 두 번째 균주 개체군이 첫 번째의 절반과 처음으로 같아지는 시간은 몇 시간 후인가?"
보기: ["6", "12", "18", "24"]
정답: "12"
어려운 이유: 50·2^(t/4) = (1/2)(50·2^(t/3)) → 2^(t/4) = 2^(t/3 - 1) → t/4 = t/3 - 1 → t = 12. 3단계 + 지수 조작 + "처음 정수 시간" 제약 인식.`,

          `예시 2 (검증된 어려움):
문제: "xy평면 위의 원이 x² + y² - 6x + 8y = 0의 방정식을 가진다. 이 원의 중심과 점 (5, 1)을 지나는 직선의 기울기는?"
보기: ["-5/2", "-2/5", "2/5", "5/2"]
정답: "5/2"
어려운 이유: 완전제곱으로 중심이 (3, -4)임을 찾아야 함 — 학생들은 이 단계를 건너뛰고 방정식의 일차항을 중심으로 착각. 그 다음 기울기 = (1 - (-4))/(5 - 3) = 5/2. 함정은 (a) -4 부호 반전, (b) y좌표 먼저 사용, (c) 완전제곱 전 방정식 사용.`,
        ],
      },
    ],
  },

  ksat: {
    display: 'KSAT (대학수학능력시험 / 수능)',
    framing_en: 'Korea\'s national university entrance exam. Korean high-school seniors take it once in November. 5-choice multiple choice across all sections, varying weights toward different majors.',
    framing_ko: '대학수학능력시험(수능). 매년 11월 셋째 주 목요일 시행. 모든 영역 5지선다, 응시 계열별로 가중치 다름.',
    sections: [
      {
        name_en: 'Korean (국어)',
        name_ko: '국어',
        questionsPerSection: 45,
        minutesPerSection: 80,
        choiceCount: 5,
        patterns_en: 'Mixed passage-based comprehension. 화법과 작문 OR 언어와 매체 (선택 과목) opening section. Then 독서 (3-4 nonfiction passages, ~17 questions): 인문/사회/과학/기술/예술. Then 문학 (3-4 literary passages, ~17 questions): 현대시, 현대소설, 고전시가, 고전소설. Passages run 1000-1500자 with 4-5 questions each. Questions test 주제 파악, 세부 정보, 추론, 어휘 in context, and 글의 구조.',
        patterns_ko: '지문 기반 독해. 첫 영역은 화법과 작문 또는 언어와 매체(선택). 이후 독서(인문/사회/과학/기술/예술 비문학 지문 3-4개, 약 17문항), 그리고 문학(현대시·현대소설·고전시가·고전소설 지문 3-4개, 약 17문항). 지문 길이 1000-1500자, 각 4-5문항. 주제 파악, 세부 정보, 추론, 문맥 어휘, 글의 구조를 평가.',
        distractorPatterns_en: 'KSAT distractors are notoriously close — designed to differentiate top performers. Patterns: (1) correct in scope but wrong in degree (지문은 "일부"라고 했는데 보기는 "모두"), (2) supported by one paragraph but contradicted by another, (3) plausible if the reader misses a connective like "그러나" or "다만", (4) lexically near the passage but semantically inverted, (5) keyword-copy traps (uses passage word verbatim but the proposition is different).',
        distractorPatterns_ko: '수능 오답은 상위권 변별을 위해 매우 정교합니다: (1) 범위는 맞지만 정도가 틀림 ("일부" → "모두"), (2) 한 문단은 지지하지만 다른 문단이 반박, (3) "그러나"·"다만" 등 접속어를 놓치면 그럴듯하게 보임, (4) 어휘는 지문과 가깝지만 의미가 반대, (5) 키워드 베끼기 — 지문 단어 그대로 쓰지만 명제가 다름.',
        hardItemExamples_en: [
          `EXAMPLE 1 (변별 비문학 — Hegel dialectic-style item, representative pattern from 2022 KSAT 국어):
Passage: ~2000자 인문 지문 — 헤겔의 변증법(정-반-합, 즉자/대자/즉자대자)을 미술사 양식 변화에 적용. 추상 개념 정의 후 미술 사례로 전개.
<보기>: 추가 자료 — 19세기 후반 한 화가의 비평. 지문의 변증법 틀로 분석해야 함.
Prompt: "<보기>를 바탕으로 윗글을 이해한 내용으로 가장 적절하지 않은 것은?"
Choices: 5개, 모두 변증법 개념(즉자/대자/지양/모순)을 사용하지만 1개만 <보기>의 화가 사례와 지문의 헤겔 입장을 모두 정확히 매핑.
Why hard: 헤겔 철학의 핵심 개념 정확 이해 + <보기> 미술사 사례에 역방향 매핑. 정답률 ~33%. 함정 보기는 (a) 변증법 단계 순서 오류, (b) 즉자/대자 혼동, (c) <보기>의 화가가 지문의 어떤 단계에 해당하는지 잘못 식별.`,

          `EXAMPLE 2 (변별 문학 — <보기> 외재적 비평 형식):
Passage: 정지용 「유리창 1」 (현대시) — "유리에 차고 슬픈 것이 어른거린다 / 열없이 붙어 서서 입김을 흐리우니 / 길들은 양 언 날개를 파다거린다…"
<보기>: "정지용의 「유리창 1」은 어린 자식을 잃은 아버지의 슬픔을 절제된 어조로 형상화한 작품이다. 화자는 유리창 너머의 풍경에서 죽은 자식의 환영을 본다."
Prompt: "<보기>를 참고하여 윗글을 감상한 내용으로 가장 적절하지 않은 것은?"
Choices: 5개, "차고 슬픈 것" / "언 날개" / "유리" / "입김" 등 시어를 <보기>의 슬픔·자식·환영 코드로 해석. 1개만 시어를 잘못 매핑.
Why hard: <보기>의 비평 관점을 시 전체에 일관되게 적용해야 함. 함정은 (a) 화자와 시적 자아 혼동, (b) "유리" 상징을 단절 vs 매개로 잘못 해석, (c) 절제된 어조를 강한 감정 분출로 잘못 봄.`,
        ],
        hardItemExamples_ko: [
          `예시 1 (변별 비문학 — 헤겔 변증법 형식, 2022학년도 수능 패턴):
지문: ~2000자 인문 지문 — 헤겔의 변증법(정-반-합, 즉자/대자/즉자대자)을 미술사 양식 변화에 적용. 추상 개념 정의 후 미술 사례로 전개.
<보기>: 추가 자료 — 19세기 후반 한 화가의 비평. 지문의 변증법 틀로 분석해야 함.
문제: "<보기>를 바탕으로 윗글을 이해한 내용으로 가장 적절하지 않은 것은?"
보기: 5개, 모두 변증법 개념(즉자/대자/지양/모순)을 사용하지만 1개만 <보기>의 화가 사례와 지문의 헤겔 입장을 모두 정확히 매핑.
어려운 이유: 헤겔 철학의 핵심 개념 정확 이해 + <보기> 미술사 사례에 역방향 매핑. 정답률 ~33%. 함정 보기는 (a) 변증법 단계 순서 오류, (b) 즉자/대자 혼동, (c) <보기>의 화가가 지문의 어떤 단계에 해당하는지 잘못 식별.`,

          `예시 2 (변별 문학 — <보기> 외재적 비평 형식):
지문: 정지용 「유리창 1」 (현대시) — "유리에 차고 슬픈 것이 어른거린다 / 열없이 붙어 서서 입김을 흐리우니 / 길들은 양 언 날개를 파다거린다…"
<보기>: "정지용의 「유리창 1」은 어린 자식을 잃은 아버지의 슬픔을 절제된 어조로 형상화한 작품이다. 화자는 유리창 너머의 풍경에서 죽은 자식의 환영을 본다."
문제: "<보기>를 참고하여 윗글을 감상한 내용으로 가장 적절하지 않은 것은?"
보기: 5개, "차고 슬픈 것" / "언 날개" / "유리" / "입김" 등 시어를 <보기>의 슬픔·자식·환영 코드로 해석. 1개만 시어를 잘못 매핑.
어려운 이유: <보기>의 비평 관점을 시 전체에 일관되게 적용해야 함. 함정은 (a) 화자와 시적 자아 혼동, (b) "유리" 상징을 단절 vs 매개로 잘못 해석, (c) 절제된 어조를 강한 감정 분출로 잘못 봄.`,
        ],
        difficultyMix: { easy: 0.20, medium: 0.55, hard: 0.25 },
        hardItemFraming_en: 'A HARD KSAT Korean item is one of the 변별 문항 — typically a dense 1500-자 nonfiction passage (humanities, philosophy, science) followed by a question that requires synthesizing claims across multiple paragraphs OR mapping the passage to an unfamiliar 보기 (additional context box). The trap distractors are typically (1) supported by a single paragraph but contradicted by the passage as a whole, (2) inverted by a 그러나/다만/오히려 connective the student missed, (3) lexically near a paragraph but semantically opposite. The hardest items pair the passage with a 보기 box and ask the student to apply the passage\'s framework to a NEW situation — pure paraphrase doesn\'t work.',
        hardItemFraming_ko: '어려운 수능 국어 문항은 변별 문항 — 보통 1500자 비문학 지문(인문·철학·과학) 뒤에 여러 문단의 주장을 종합하거나, 낯선 보기에 지문을 매핑하는 문제. 함정 오답은 (1) 한 문단은 지지하지만 전체와 모순, (2) 학생이 놓친 그러나/다만/오히려 접속어로 뒤집힘, (3) 어휘는 한 문단과 가깝지만 의미는 반대. 최고난도 문항은 지문 + 보기 박스를 짝지어 지문의 틀을 새로운 상황에 적용하게 함 — 단순 패러프레이즈로는 풀리지 않음.',
      },
      {
        name_en: 'Mathematics (수학)',
        name_ko: '수학',
        questionsPerSection: 30,
        minutesPerSection: 100,
        choiceCount: 5,
        patterns_en: 'Common section (22 questions) + selection subject (8 questions from 미적분 OR 확률과 통계 OR 기하). First 21 are multiple choice; questions 22-30 are 단답형 (numeric answers 1-999). Difficulty climbs sharply — questions 28-30 (특히 21, 29, 30) are the famous killer items meant to separate 1등급 from 2등급. Topics: functions, sequences, exponentials/logarithms, trigonometry, differentiation, integration, probability, vectors, conic sections.',
        patterns_ko: '공통 22문항 + 선택과목 8문항(미적분 / 확률과 통계 / 기하). 1-21번은 객관식, 22-30번은 단답형(1-999 정수). 난이도가 가파르게 상승 — 28-30번(특히 21·29·30번)은 1등급/2등급 변별용 킬러 문항. 영역: 함수, 수열, 지수·로그, 삼각함수, 미분, 적분, 확률, 벡터, 이차곡선.',
        distractorPatterns_en: 'Wrong answers reflect: (1) sign / domain errors in trig and log questions, (2) confusing 정의역 (domain) with 치역 (range), (3) forgetting to check 등호 (equality) in inequality systems, (4) using a special-case value (e.g. 0 or 1) for what should be general, (5) for killer items: an answer that\'s correct for a similar problem in the past 6 months\' 모의고사 but not THIS problem.',
        distractorPatterns_ko: '오답 패턴: (1) 삼각·로그 문제의 부호/정의역 오류, (2) 정의역과 치역 혼동, (3) 부등식에서 등호 확인 누락, (4) 일반화해야 하는데 특수값(0 또는 1) 대입, (5) 킬러 문항: 최근 6개월 모의고사에서 비슷한 문제의 정답이지만 이 문제의 정답은 아님.',
        hardItemFraming_en: 'A HARD KSAT 수학 item is one of the killer items: 22번 (common-section 단답형 finale), 29-30번 (selected-subject 단답형 finale), or 14/15/20/21번 (객관식 high-difficulty). Typical structure: multi-piecewise function with unknown coefficients determined by multiple simultaneous conditions (continuity + differentiability + extrema + intersections). Solving requires drawing the graph shape, case-splitting on absolute values into 4-8 cases, then verifying each case against all conditions. Solution time: 15-25 min per item. Pass rate: 5-15%.',
        hardItemFraming_ko: '어려운 KSAT 수학 = 킬러 문항: 22번(공통 단답형 마지막), 29-30번(선택 단답형 마지막), 14/15/20/21번(객관식 고난도). 전형 구조: 다항·삼각함수의 미정계수를 여러 동시 조건(연속·미분가능·극값·교점)으로 결정. 풀이: 그래프 개형 그리기 + 절댓값 케이스 분할 4-8개 + 각 케이스 모든 조건 검증. 풀이 시간 15-25분. 정답률 5-15%.',
        hardItemExamples_en: [
          `EXAMPLE 1 (단답형 KILLER style, 2024 KSAT 수학 22번 pattern):
Prompt: "삼차함수 f(x)와 실수 t에 대하여 함수 g(t) = ∫₀ᵗ f(x)|f(x) − k|dx 가 t = α에서 극값을 가지고, f(α) = 0을 만족시킨다. f(x) = x³ + ax² + bx (a, b는 상수)일 때, 조건을 만족시키는 모든 k의 값의 합을 구하시오."
Format: 단답형 (numeric answer 1-999), no multiple choice.
Correct: (varies by specific f and conditions; example answer would be a specific integer like 36)
Why hard: |f(x) − k| absolute value splits k-cases into 4-6 sub-cases for g(t) shape. Each sub-case requires: (a) finding where f(x) − k = 0 inside [0,t], (b) splitting the integral accordingly, (c) computing g'(t) for the extremum condition, (d) verifying f(α) = 0 constraint. Differentiability + extremum + integration combined.`,
        ],
        hardItemExamples_ko: [
          `예시 1 (단답형 킬러 형식, 2024학년도 수능 수학 22번 패턴):
문제: "삼차함수 f(x)와 실수 t에 대하여 함수 g(t) = ∫₀ᵗ f(x)|f(x) − k|dx 가 t = α에서 극값을 가지고, f(α) = 0을 만족시킨다. f(x) = x³ + ax² + bx (a, b는 상수)일 때, 조건을 만족시키는 모든 k의 값의 합을 구하시오."
형식: 단답형 (자연수 1-999), 객관식 없음.
정답: (특정 f와 조건에 따라 다름; 예시 답은 36 같은 특정 정수)
어려운 이유: |f(x) − k| 절댓값으로 k 값에 따라 g(t) 개형이 4-6 케이스. 각 케이스마다 (a) [0,t]에서 f(x) − k = 0인 점 찾기, (b) 적분 분할, (c) 극값 조건으로 g'(t) 계산, (d) f(α) = 0 검증. 미분가능성+극값+적분 결합.`,
        ],
      },
      {
        name_en: 'English (영어)',
        name_ko: '영어',
        questionsPerSection: 45,
        minutesPerSection: 70,
        choiceCount: 5,
        patterns_en: 'Listening (17 questions, ~25 min audio) + Reading (28 questions, ~45 min). Reading is absolute-evaluation (절대평가): 90+ raw = 1등급. Question types include 목적, 심경, 주제, 제목, 어법, 어휘, 빈칸 추론 (most difficult), 흐름과 관계없는 문장, 글의 순서, 문장 삽입, 요약문 완성, 장문 독해 (1지문 3문항).',
        patterns_ko: '듣기(17문항, 약 25분) + 읽기(28문항, 약 45분). 읽기는 절대평가 — raw score 90+ = 1등급. 문항 유형: 목적, 심경, 주제, 제목, 어법, 어휘, 빈칸 추론(최고난도), 흐름과 관계없는 문장, 글의 순서, 문장 삽입, 요약문 완성, 장문 독해(1지문 3문항).',
        distractorPatterns_en: 'For 빈칸 추론 specifically (the section\'s hardest item type): wrong answers should be (1) lexically related but logically opposed to the passage\'s argument, (2) restate a counter-argument the passage rejects, (3) match the topic word but miss the passage\'s specific stance, (4) match the immediately-preceding sentence but contradict the passage as a whole.',
        distractorPatterns_ko: '특히 빈칸 추론(영어 영역 최고난도): 오답은 (1) 어휘는 관련 있으나 논지에 반대, (2) 지문이 반박하는 반대 논거의 재진술, (3) 주제어는 일치하나 지문의 특정 입장과 다름, (4) 직전 문장과는 일치하나 전체 글과 모순.',
        hardItemFraming_en: 'A HARD KSAT 영어 item is a 빈칸 추론 (blank-inference) question, items 31-34. Format: ~150-180 word academic passage (cognitive psychology, sociology, philosophy of science) with the blank in the position of the passage\'s core thesis. All 5 choices are plausible abstract noun phrases that cannot be eliminated by keyword matching. The correct answer is a PARAPHRASE of the passage\'s overall argument; wrong answers reuse passage keywords verbatim but invert or narrow the claim.',
        hardItemFraming_ko: '어려운 KSAT 영어 문항 = 빈칸 추론 31-34번. 형식: ~150-180단어 학술 지문(인지심리·사회학·과학철학) + 글의 핵심 명제 자리에 빈칸. 5개 보기 모두 그럴듯한 추상 명사구로 키워드 매칭 불가. 정답은 지문 전체 논지의 패러프레이즈; 오답은 지문 키워드를 그대로 쓰지만 주장을 뒤집거나 좁힘.',
        hardItemExamples_en: [
          `EXAMPLE 1 (빈칸 추론 style):
Passage: "Behavioral economists have long observed that people facing complex decisions rarely engage in the exhaustive cost-benefit analysis that classical theory predicts. Instead, individuals ____. This tendency, far from being irrational, reflects a sophisticated adaptation to limited cognitive resources and time pressure that characterizes most real-world choices."
Prompt: "다음 빈칸에 들어갈 말로 가장 적절한 것은?"
Choices: ["become aware of the cognitive biases inherent in their judgments", "rely on mental shortcuts rather than exhaustive analysis", "seek consensus from a diverse range of experts", "replace intuition with statistical reasoning", "memorize patterns from past experiences"]
Correct: "rely on mental shortcuts rather than exhaustive analysis"
Why hard: All 5 choices are plausible cognitive-psychology phrases. Choice 1 uses "cognitive biases" — a passage-adjacent term — as a trap. The correct answer "mental shortcuts" never appears verbatim in the passage but is the precise paraphrase of "sophisticated adaptation to limited cognitive resources." Tests whole-passage synthesis vs. keyword matching.`,
        ],
        hardItemExamples_ko: [
          `예시 1 (빈칸 추론 형식):
지문: "행동경제학자들은 오랫동안 복잡한 결정에 직면한 사람들이 고전 이론이 예측하는 철저한 비용-편익 분석에 거의 참여하지 않음을 관찰해왔다. 대신 개인들은 ____. 이러한 경향은 비합리적이라기보다는 대부분의 실제 선택을 특징짓는 제한된 인지 자원과 시간 압박에 대한 정교한 적응을 반영한다."
문제: "다음 빈칸에 들어갈 말로 가장 적절한 것은?"
보기: ["판단에 내재한 인지 편향을 인식한다", "철저한 분석보다 정신적 지름길에 의존한다", "다양한 전문가들의 합의를 구한다", "직관을 통계적 추론으로 대체한다", "과거 경험의 패턴을 기억한다"]
정답: "철저한 분석보다 정신적 지름길에 의존한다"
어려운 이유: 5개 보기 모두 그럴듯한 인지심리 표현. 보기 1은 "인지 편향" — 지문 인접 용어 — 함정. 정답 "정신적 지름길"은 지문에 그대로 나오지 않지만 "제한된 인지 자원에 대한 정교한 적응"의 정확한 패러프레이즈. 전체 지문 종합 능력 평가 (키워드 매칭 아님).`,
        ],
      },
      {
        name_en: 'Korean History (한국사)',
        name_ko: '한국사',
        questionsPerSection: 20,
        minutesPerSection: 30,
        choiceCount: 5,
        patterns_en: 'MANDATORY for all KSAT takers. Missing it invalidates the entire KSAT score. 5-choice MC. Absolute grading (9등급, 50점 만점): 40+ raw = 1등급, then 5-point intervals (35→2, 30→3, 25→4, 20→5, 15→6, 10→7, 5→8, <5→9). Distribution: ~10 questions 전근대사 (선사 to 조선후기), ~10 questions 근현대사 (개항기 to 현대). Designed for basic literacy — most students 1등급 with prep.',
        patterns_ko: '필수 응시 영역. 미응시 시 수능 전체 무효. 5지선다. 절대평가 9등급(50점 만점): 40점 이상 1등급, 이후 5점 간격(35→2, 30→3, 25→4, 20→5, 15→6, 10→7, 5→8, 5점 미만→9). 분포: 전근대사 10문항(선사~조선후기) + 근현대사 10문항(개항기~현대). 기본 소양 확인 목적 — 대부분 학습으로 1등급.',
        distractorPatterns_en: 'Wrong answers: (1) confuse adjacent kings/eras (태종 vs 세종 vs 세조 achievements), (2) misorder closely-spaced events (1920s independence movements), (3) attribute a policy to the wrong government era (이승만/박정희/전두환), (4) artifact-era misidentification (빗살무늬토기 vs 민무늬토기).',
        distractorPatterns_ko: '오답: (1) 인접 왕대(태종/세종/세조) 업적 혼동, (2) 가까운 시기 사건 순서 오류(1920년대 독립운동), (3) 정책을 잘못된 정부 시기에 귀속(이승만/박정희/전두환), (4) 유물 시대 식별 오류(빗살무늬토기 vs 민무늬토기).',
        hardItemFraming_en: 'Hardest items present an unfamiliar primary-source 사료 quote and require identifying the era, ruler, or related event. Most are stem + 5-choice. Some use 연표 활용 (timeline placement) or 순서 배열 (chronological ordering) of 4 events.',
        hardItemFraming_ko: '최고난도 문항은 낯선 1차 사료 인용을 제시하고 시대·왕·관련 사건을 식별하게 함. 대부분 발문+5지. 일부는 연표 위치 또는 4개 사건 순서 배열.',
        hardItemExamples_en: [
          `EXAMPLE 1 (representative pattern, 사건 순서 배열):
Prompt: "다음 (가)~(라)를 일어난 순서대로 옳게 나열한 것은?  (가) 6·10 만세운동  (나) 광주학생항일운동  (다) 신간회 창립  (라) 물산장려운동"
Choices: ["① (가)-(나)-(다)-(라)", "② (라)-(가)-(다)-(나)", "③ (다)-(라)-(가)-(나)", "④ (라)-(다)-(가)-(나)", "⑤ (가)-(다)-(라)-(나)"]
Correct: "② (라)-(가)-(다)-(나)"
Why hard: 4 events all in 1920s within 2-3 years of each other. 물산장려운동(1920) → 6·10 만세(1926) → 신간회(1927) → 광주학생(1929). Order of 6·10 and 신간회 commonly confused.`,
        ],
        hardItemExamples_ko: [
          `예시 1 (사건 순서 배열):
문제: "다음 (가)~(라)를 일어난 순서대로 옳게 나열한 것은?  (가) 6·10 만세운동  (나) 광주학생항일운동  (다) 신간회 창립  (라) 물산장려운동"
보기: ["① (가)-(나)-(다)-(라)", "② (라)-(가)-(다)-(나)", "③ (다)-(라)-(가)-(나)", "④ (라)-(다)-(가)-(나)", "⑤ (가)-(다)-(라)-(나)"]
정답: "② (라)-(가)-(다)-(나)"
어려운 이유: 1920년대 4개 사건이 2-3년 간격. 물산장려운동(1920) → 6·10 만세(1926) → 신간회(1927) → 광주학생(1929). 6·10과 신간회 순서 자주 혼동.`,
        ],
      },
      {
        name_en: 'Social Studies (사회탐구)',
        name_ko: '사회탐구',
        questionsPerSection: 20,
        minutesPerSection: 30,
        choiceCount: 5,
        patterns_en: 'One subject per session from 9 social-studies subjects (생활과 윤리, 윤리와 사상, 한국지리, 세계지리, 동아시아사, 세계사, 경제, 정치와 법, 사회·문화). Most popular: 생활과 윤리, 사회·문화. 20q / 30min / 5-choice. Relative grading 9등급, 50점 만점. <보기> 박스 ㄱㄴㄷ 합답형 빈출. Question types: 사상가 입장 비교(갑·을·병), 표·그래프 분석, 지도(지리), 법조문 사례 적용.',
        patterns_ko: '9개 사회탐구 과목(생활과 윤리, 윤리와 사상, 한국지리, 세계지리, 동아시아사, 세계사, 경제, 정치와 법, 사회·문화) 중 한 과목. 응시자 최다: 생활과 윤리, 사회·문화. 20문항/30분/5지. 상대평가 9등급, 50점 만점. <보기> 박스 ㄱㄴㄷ 합답형 빈출. 문항 유형: 사상가 입장 비교(갑·을·병), 표·그래프 분석, 지도(지리), 법조문 사례 적용.',
        distractorPatterns_en: 'For 사상가 비교: 3 philosophers presented; distractors mix up which view belongs to which (Kant vs. utilitarianism vs. virtue ethics; Singer vs. Regan vs. Taylor vs. Leopold for environmental ethics). For 사회·문화 표: distractors confuse relative vs. absolute frequency, intra- vs. inter-generational mobility, vertical vs. horizontal.',
        distractorPatterns_ko: '사상가 비교: 3명의 사상가 제시; 함정은 어느 입장이 누구의 것인지 혼동(칸트 vs 공리주의 vs 덕윤리; 환경윤리 — 싱어 vs 레건 vs 테일러 vs 레오폴드). 사회·문화 표: 함정은 상대/절대 빈도 혼동, 세대 간/내 이동성, 수직/수평 혼동.',
      },
      {
        name_en: 'Science Subjects (과학탐구)',
        name_ko: '과학탐구',
        questionsPerSection: 20,
        minutesPerSection: 30,
        choiceCount: 5,
        patterns_en: 'One subject per session from 8 science subjects (물리학I, 화학I, 생명과학I, 지구과학I + the II-level versions). Most popular: 생명과학I, 지구과학I. 20q / 30min / 5-choice. Relative grading 9등급, 50점 만점. ㄱㄴㄷ 합답형 standard format. Distinctive killer items: 생명과학I 가계도 (genetics pedigree), 화학I 양적관계 (stoichiometric mass tracking), 물리학I 역학 (mechanics with friction/pulleys), 지구과학I 천체 자료.',
        patterns_ko: '8개 과학탐구 과목(물리학I, 화학I, 생명과학I, 지구과학I + II 수준) 중 한 과목. 응시자 최다: 생명과학I, 지구과학I. 20문항/30분/5지. 상대평가 9등급, 50점 만점. ㄱㄴㄷ 합답형 표준. 변별 킬러: 생명과학I 가계도, 화학I 양적관계, 물리학I 역학(마찰·도르래), 지구과학I 천체 자료.',
        distractorPatterns_en: 'For 생명과학I 유전: incomplete pedigree → infer unstated genotype → calculate offspring probability. Each step error invalidates ㄱㄴㄷ判定. For 화학I 양적관계: changing limiting reagent across multi-step reaction. For 물리학I 역학: sign of velocity/acceleration in graph analysis.',
        distractorPatterns_ko: '생명과학I 유전: 불완전 가계도 → 미지 유전자형 추론 → 자손 확률 계산. 각 단계 오류 시 ㄱㄴㄷ 판정 동시 흔들림. 화학I 양적관계: 다단계 반응의 한계반응물 변경. 물리학I 역학: 그래프에서 속도/가속도 부호.',
      },
    ],
  },

  toefl: {
    display: 'TOEFL iBT',
    framing_en: 'ETS\'s Test of English as a Foreign Language, Internet-Based Test. Used for US/Canada/UK university admission. 2023 reduction: ~2 hours total. Score scale 0-120 (0-30 per section).',
    framing_ko: 'ETS의 TOEFL iBT. 미국·캐나다·영국 대학 입학에 사용. 2023년 단축 — 총 약 2시간. 점수 0-120(섹션당 0-30).',
    sections: [
      {
        name_en: 'Reading',
        name_ko: '리딩',
        questionsPerSection: 20,
        minutesPerSection: 35,
        choiceCount: 4,
        patterns_en: 'Two academic passages (~700 words each), 10 questions each. Question types: factual information, negative factual (NOT/EXCEPT), vocabulary in context, reference (what does "this" refer to), sentence simplification (a longer sentence in [] — pick the shortest equivalent), inference, rhetorical purpose, insert sentence (where does this sentence best fit, marked by [A] [B] [C] [D]), and a final 2-point summary question.',
        patterns_ko: '학술 지문 2개(각 약 700단어), 각 10문항. 문항 유형: 사실 정보, 부정 사실(NOT/EXCEPT), 문맥 어휘, 지시어(this가 가리키는 것), 문장 단순화([] 안 긴 문장의 최단 동의문 선택), 추론, 수사적 목적, 문장 삽입([A][B][C][D] 표시 위치), 마지막 2점 요약 문항.',
        distractorPatterns_en: 'Wrong answers: (1) information from a different paragraph, (2) restated using a synonym but with a key qualifier omitted, (3) plausibly true but never stated in the passage, (4) for sentence simplification: leaves out an essential clause or changes the relationship between ideas, (5) for prose summary: minor details from a single paragraph instead of major themes.',
        distractorPatterns_ko: '오답: (1) 다른 문단의 정보, (2) 동의어로 바꿨지만 핵심 한정사가 빠짐, (3) 그럴듯하지만 지문에 명시되지 않음, (4) 문장 단순화의 경우: 핵심 절을 빠뜨리거나 아이디어 간 관계를 바꿈, (5) 산문 요약의 경우: 주제가 아니라 한 문단의 부수 정보.',
        hardItemFraming_en: 'A HARD TOEFL Reading item is: (a) an INFERENCE question where the correct answer requires connecting two distant sentences AND none of the choices is a direct restatement; (b) a NEGATIVE FACTUAL (NOT/EXCEPT) item where 3 choices are paraphrases of separate passage statements and the wrong choice is the never-mentioned one; (c) a SENTENCE SIMPLIFICATION where a wrong choice drops a critical qualifier ("some," "in part," "in certain conditions"); (d) a PROSE SUMMARY where two of the six choices are tempting true-but-minor details. AVOID: bare factual questions that can be solved by keyword matching.',
        hardItemFraming_ko: '어려운 TOEFL Reading 문항: (a) 추론 — 정답이 두 개의 떨어진 문장을 연결해야 하고, 보기 중 어느 것도 직접 재진술이 아님; (b) 부정 사실(NOT/EXCEPT) — 3개 보기는 별개 문장의 패러프레이즈, 오답이 언급되지 않은 것; (c) 문장 단순화 — 오답이 핵심 한정사("일부", "부분적으로")를 빠뜨림; (d) 산문 요약 — 6개 보기 중 2개가 그럴듯한 부수 정보. 피할 것: 키워드 매칭으로 풀리는 단순 사실 문항.',
        hardItemExamples_en: [
          `EXAMPLE 1 (verified hard, ETS official meteorite passage):
Passage: "By 1990 geologists had located the impact site of a meteorite that struck Earth approximately 65 million years ago — a 200-km crater in Mexico's Yucatán region. The first evidence had come a decade earlier from a worldwide sediment layer enriched in iridium and other rare elements, deposited when dust from the impact settled globally."
Prompt: "According to the paragraph, how did scientists determine that a large meteorite had impacted Earth?"
Choices: ["They discovered a large crater in the Yucatán region of Mexico.", "They found a unique layer of sediment worldwide.", "They were alerted by archaeologists who had been excavating in the Yucatán region.", "They located a meteorite with a mass of over a trillion tons."]
Correct: "They found a unique layer of sediment worldwide."
Why hard: Choice 1 is the textbook trap — the crater discovery did happen, but later (1990). The question asks how scientists INITIALLY determined an impact — that was the 1980 iridium-sediment layer. Tests reading-for-sequence, not keyword matching.`,
        ],
        hardItemExamples_ko: [
          `예시 1 (검증된 어려움, ETS 공식 운석 지문):
지문: "1990년까지 지질학자들은 약 6500만 년 전 지구에 충돌한 운석의 충돌 지점을 찾아냈다 — 멕시코 유카탄 반도의 200km 크레이터. 첫 증거는 10년 전 전 세계 퇴적층에서 이리듐과 기타 희유 원소가 풍부한 것으로 나타났는데, 이는 충돌의 먼지가 전 지구에 침전된 결과였다."
문제: "단락에 따르면, 과학자들은 어떻게 큰 운석이 지구에 충돌했음을 판단했는가?"
보기: ["유카탄 반도의 큰 크레이터를 발견했다.", "전 세계적으로 독특한 퇴적층을 발견했다.", "유카탄에서 발굴 중이던 고고학자들의 알림을 받았다.", "1조 톤 이상의 운석을 찾았다."]
정답: "전 세계적으로 독특한 퇴적층을 발견했다."
어려운 이유: 보기 1은 교과서적 함정 — 크레이터 발견은 실제로 있었지만 더 나중(1990). 문제는 과학자들이 처음에 어떻게 충돌을 판단했는지 — 1980년대 이리듐 퇴적층. 키워드 매칭이 아니라 시간 순서 독해를 평가.`,
        ],
      },
      {
        name_en: 'Listening',
        name_ko: '리스닝',
        questionsPerSection: 28,
        minutesPerSection: 36,
        choiceCount: 4,
        patterns_en: 'Two conversations (~3 min each, 5 questions) + three lectures (~5 min each, 6 questions). Without audio, render the transcript first then ask questions. Conversations are office-hours or campus services. Lectures are university intro-level (biology, art history, business, geology, psychology, linguistics). Questions: main idea, detail, function (why does the professor say X), attitude, organization, connecting content.',
        patterns_ko: '대화 2개(각 약 3분, 5문항) + 강의 3개(각 약 5분, 6문항). 오디오 없이 전사를 먼저 제시하고 그것에 대한 문항 생성. 대화는 교수 상담 또는 학사 서비스. 강의는 대학 입문 수준(생물·미술사·경영·지질·심리·언어학). 문항: 주제, 세부, 기능(왜 그렇게 말했는가), 태도, 구조, 내용 연결.',
        distractorPatterns_en: 'Wrong answers: (1) restates a detail the speaker mentions but it wasn\'t the main point, (2) is true in general academic knowledge but contradicts the lecture\'s specific claim, (3) confuses what one speaker said with the other.',
        distractorPatterns_ko: '오답: (1) 화자가 언급한 세부사항이지만 주제가 아님, (2) 일반 학문 상식에는 맞지만 강의의 특정 주장과 모순, (3) 한 화자가 말한 내용을 다른 화자가 말한 것으로 혼동.',
      },
      {
        name_en: 'Speaking',
        name_ko: '스피킹',
        questionsPerSection: 4,
        minutesPerSection: 16,
        choiceCount: 4, // not really MC, but generator should keep "type": "multiple_choice" with 4 prepared response options
        patterns_en: 'Task 1: Independent — opinion on a familiar topic (15s prep, 45s response). Tasks 2-4: Integrated — read short text + listen to related conversation/lecture + summarize (20-30s prep, 60s response). For written practice, present the prompt and the source material, then ask the student to write the response they would speak. Score on a 0-4 holistic rubric per task.',
        patterns_ko: 'Task 1: Independent — 친숙한 주제에 대한 의견(준비 15초, 답변 45초). Task 2-4: Integrated — 짧은 글 + 관련 대화/강의 듣기 + 요약(준비 20-30초, 답변 60초). 글로 연습할 때는 문제와 자료를 제시하고 학생이 말할 답을 쓰도록. 각 과제 0-4 점 holistic 평가.',
        distractorPatterns_en: 'Not applicable — speaking is open-ended. If forced into MC format, treat each "choice" as a model response of varying quality and have the student pick the strongest.',
        distractorPatterns_ko: '해당 없음 — 말하기는 개방형. MC 형식으로 변환할 때는 각 보기를 다양한 품질의 모범 답안으로 보고 가장 강한 것을 학생이 선택하도록.',
      },
      {
        name_en: 'Writing',
        name_ko: '라이팅',
        questionsPerSection: 2,
        minutesPerSection: 29,
        choiceCount: 4,
        patterns_en: 'Task 1: Integrated — read 230-300 word passage (3 min), listen to a 2-min lecture, then write 150-225 words summarizing how the lecture casts doubt on / supports the reading (20 min). Task 2: Academic Discussion — professor poses a question, two students give brief replies, you write 100+ words contributing to the discussion with your own opinion + reasoning (10 min). Score 0-5 per task.',
        patterns_ko: 'Task 1: Integrated — 230-300단어 지문 읽기(3분) + 2분 강의 듣기 + 강의가 글에 의문을 제기/지지하는지 150-225단어로 요약(20분). Task 2: Academic Discussion — 교수가 질문, 학생 2명이 짧은 답변, 100+단어로 본인의 의견·근거로 토론에 기여(10분). 각 과제 0-5점.',
        distractorPatterns_en: 'Not applicable — writing is open-ended. If forced into MC, present sample responses of varying quality.',
        distractorPatterns_ko: '해당 없음 — 쓰기는 개방형. MC로 변환할 때는 다양한 품질의 답안 예시 제시.',
      },
    ],
  },

  ielts: {
    display: 'IELTS Academic',
    framing_en: 'British Council / IDP / Cambridge English\'s academic English test. Used for UK/Australia/Canada/NZ admission and immigration. Score: 1.0-9.0 band per section + overall.',
    framing_ko: 'British Council/IDP/Cambridge English의 학술 영어 시험. 영국·호주·캐나다·뉴질랜드 입학 및 이민에 사용. 점수 1.0-9.0 밴드(섹션별 + 종합).',
    sections: [
      {
        name_en: 'Reading',
        name_ko: '리딩',
        questionsPerSection: 40,
        minutesPerSection: 60,
        choiceCount: 4,
        patterns_en: 'Three academic passages (~700-900 words each; ielts.org confirms total = 2150-2750 words across all 3), 13-14 questions each (40 total). 11 official question types: MC, True/False/Not Given, Yes/No/Not Given, matching headings to paragraphs, matching information, matching features, matching sentence endings, sentence completion, summary/note/table/flow-chart completion, diagram label completion, short-answer (NO MORE THAN TWO/THREE WORDS from the passage). Difficulty escalates passage 1 → 3. Typical (not official) distribution: Passage 1 = T/F/NG + sentence completion + short answer; Passage 2 = matching info/features + summary completion + MC; Passage 3 = matching headings + Y/N/NG + MC.',
        patterns_ko: '학술 지문 3개(각 약 700-900단어; ielts.org 공식 총합 2150-2750단어), 각 13-14문항(총 40). 공식 11개 문항 유형: 객관식, True/False/Not Given, Yes/No/Not Given, 단락에 제목 매칭, 정보 매칭, 특징 매칭, 문장 끝 매칭, 문장 완성, 요약/노트/표/순서도 완성, 도해 라벨, 단답(지문에서 2/3단어 이하). 지문 1→3 난이도 상승. 통상적(공식 아님) 분포: 지문 1 = T/F/NG + 문장 완성 + 단답; 지문 2 = 정보·특징 매칭 + 요약 완성 + 객관식; 지문 3 = 제목 매칭 + Y/N/NG + 객관식.',
        distractorPatterns_en: 'For T/F/NG specifically: "Not Given" is the most-missed — Not Given = passage simply DOESN\'T ADDRESS the claim (may use overlapping vocabulary, may discuss the topic). False = passage EXPLICITLY CONTRADICTS the statement. Most common trap: test-taker sees related vocabulary and assumes True, or assumes Not Given when passage actually contradicts via paraphrase. For Y/N/NG: tests opinion vs. fact — passage may cite an opposing view the writer disagrees with (statement about that view = NO, not YES). For matching headings: distractor headings overlap with one of the paragraph\'s sub-ideas but miss the main point.',
        distractorPatterns_ko: 'T/F/NG에서 "Not Given" = 지문이 해당 주장을 다루지 않음(겹치는 어휘를 쓰거나 주제는 다룰 수 있음). False = 지문이 명시적으로 모순. 가장 흔한 함정: 관련 어휘를 보고 True로 착각, 또는 지문이 패러프레이즈로 모순하는데 Not Given으로 착각. Y/N/NG: 의견과 사실 구분 — 지문이 작가가 반대하는 입장을 인용할 때 그 입장에 대한 진술 = NO(YES 아님). 제목 매칭: 함정 제목은 부수 아이디어와 겹치지만 주제는 놓침.',
        hardItemFraming_en: 'A HARD IELTS Reading item is: (a) a Y/N/NG item where the writer cites another viewpoint and the test-taker must distinguish the writer\'s view from the quoted view; (b) a Matching Headings item where two headings closely paraphrase the same paragraph but only one captures the full scope; (c) a T/F/NG item where the passage discusses the topic at length with overlapping vocabulary but never states the specific claim (answer: Not Given); (d) Summary completion where the required word is a paraphrase of a passage idea but the answer must come from passage VERBATIM (word-limit violations score zero).',
        hardItemFraming_ko: '어려운 IELTS Reading 문항: (a) Y/N/NG — 작가가 다른 입장을 인용한 경우 작가의 견해와 인용된 견해 구분; (b) 제목 매칭 — 두 제목이 같은 단락을 비슷하게 패러프레이즈하지만 한 개만 전체 범위 포착; (c) T/F/NG — 지문이 주제를 길게 다루고 겹치는 어휘 사용하지만 특정 주장을 명시 안 함(답: Not Given); (d) 요약 완성 — 답이 지문 아이디어의 패러프레이즈여야 하지만 지문 단어 그대로 사용(단어 제한 위반 시 0점).',
        hardItemExamples_en: [
          `EXAMPLE 1 (verified hard, Cambridge IELTS 16, Reading Test 2, "The White Horse of Uffington"):
Passage excerpt: "The figures include giants, horses, crosses and regimental badges. The Uffington White Horse, the oldest of these chalk figures, has been recut several times over the centuries to maintain its outline."
Statement (Q2): "There are more geoglyphs in the shape of a horse than any other shape."
Choices: ["TRUE", "FALSE", "NOT GIVEN"]
Correct: "NOT GIVEN"
Why hard: The passage lists horses AS ONE OF the geoglyph shapes but never states whether horses are the most common shape. Tempting to mark FALSE (because other shapes are listed) or TRUE (because horses are mentioned and discussed in detail later). Correct: passage simply doesn't address relative frequency.`,

          `EXAMPLE 2 (verified hard, Cambridge IELTS 16, Reading, Wolbachia passage):
Passage excerpt: "Researchers in Australia have released mosquitoes infected with the Wolbachia bacterium in an attempt to halt the spread of dengue fever. The bacterium shortens the mosquitoes' lifespan and blocks viral replication..."
Statement (Q25): "The release of mosquitoes infected with Wolbachia has successfully stopped the spread of dengue fever."
Choices: ["TRUE", "FALSE", "NOT GIVEN"]
Correct: "NOT GIVEN"
Why hard: The passage describes the attempt and the mechanism but never states the OUTCOME. Test-takers see Wolbachia + dengue + lifespan-shortening and infer success. Classic "passage discusses the topic at length but doesn't state the specific claim" trap.`,
        ],
        hardItemExamples_ko: [
          `예시 1 (검증된 어려움, Cambridge IELTS 16 Reading Test 2, 우핑턴 백마):
지문 발췌: "이 도형들에는 거인, 말, 십자가, 연대 휘장이 포함된다. 가장 오래된 분필 도형인 우핑턴 백마는 윤곽을 유지하기 위해 수세기에 걸쳐 여러 번 다시 새겨졌다."
진술(Q2): "말 모양의 지오글리프가 다른 모양보다 더 많다."
보기: ["TRUE", "FALSE", "NOT GIVEN"]
정답: "NOT GIVEN"
어려운 이유: 지문은 말을 지오글리프 모양 중 하나로 나열하지만, 말이 가장 흔한지 명시하지 않음. FALSE(다른 모양도 나열되어서) 또는 TRUE(말이 언급되고 상세히 다뤄져서)로 착각. 실제로는 상대 빈도를 다루지 않음.`,

          `예시 2 (검증된 어려움, Cambridge IELTS 16 Reading, 볼바키아 지문):
지문 발췌: "호주 연구자들은 뎅기열 확산을 막기 위해 볼바키아 박테리아에 감염된 모기를 방류했다. 이 박테리아는 모기의 수명을 단축시키고 바이러스 복제를 차단한다..."
진술(Q25): "볼바키아 감염 모기 방류가 뎅기열 확산을 성공적으로 막았다."
보기: ["TRUE", "FALSE", "NOT GIVEN"]
정답: "NOT GIVEN"
어려운 이유: 지문은 시도와 메커니즘을 설명하지만 결과는 명시 안 함. 볼바키아 + 뎅기 + 수명 단축을 보고 성공으로 추론. "지문이 주제를 길게 다루지만 특정 주장을 명시 안 함" 전형 함정.`,
        ],
      },
      {
        name_en: 'Listening',
        name_ko: '리스닝',
        questionsPerSection: 40,
        minutesPerSection: 30,
        choiceCount: 4,
        patterns_en: 'Four sections: (1) two speakers in everyday context (e.g. accommodation form), (2) monologue everyday (e.g. tour guide), (3) up-to-four speakers in academic context (e.g. tutorial), (4) academic monologue (lecture). Each has 10 questions. Without audio, render the transcript first. Question types: multiple choice, matching, form/note/table completion, sentence completion, short answer.',
        patterns_ko: '4개 섹션: (1) 일상 대화 2인(예: 숙소 양식), (2) 일상 독백(예: 관광 안내), (3) 학술 대화 최대 4인(예: 튜토리얼), (4) 학술 독백(강의). 각 10문항. 오디오 없이 전사 먼저. 문항 유형: 객관식, 매칭, 양식/노트/표 완성, 문장 완성, 단답.',
        distractorPatterns_en: 'For form/note completion: wrong answers should be (1) the value the speaker initially says but then corrects, (2) the value associated with the wrong category, (3) a homophone of the correct answer (IELTS uses these to test listening precision).',
        distractorPatterns_ko: '양식/노트 완성: 오답은 (1) 화자가 처음 말했다가 정정한 값, (2) 다른 항목과 연결된 값, (3) 정답과 동음이의어(IELTS가 청해 정밀성을 시험하기 위해 사용).',
      },
    ],
  },

  toeic: {
    display: 'TOEIC Listening & Reading',
    framing_en: 'ETS\'s workplace English proficiency test, extremely common in Korea/Japan. Score 5-995 in 5-point increments. 2 hours total, 200 questions, all multiple choice.',
    framing_ko: 'ETS의 직장 영어 능력 시험. 한국·일본에서 매우 보편적. 점수 5-995(5점 단위). 총 2시간, 200문항, 전체 객관식.',
    sections: [
      {
        name_en: 'Listening',
        name_ko: '리스닝',
        questionsPerSection: 100,
        minutesPerSection: 45,
        choiceCount: 4,
        patterns_en: 'Part 1: photos (6 questions — pick the description that matches). Part 2: question-response (25 — only 3 choices, but expand to 4 with a clearly-irrelevant distractor for our MC schema). Part 3: short conversations (39, 3 questions per convo). Part 4: short talks/announcements (30, 3 questions per talk). All workplace context.',
        patterns_ko: 'Part 1: 사진(6문항 — 일치하는 설명 선택). Part 2: 질문-응답(25 — 보기 3개지만 우리 MC 스키마에 맞춰 명백한 무관 함정 보기 추가해 4개로). Part 3: 짧은 대화(39, 대화당 3문항). Part 4: 짧은 담화/안내(30, 담화당 3문항). 모두 직장 맥락.',
        distractorPatterns_en: 'Wrong answers: (1) uses a word that sounds similar to a word in the audio but means something else, (2) refers to the wrong speaker\'s perspective, (3) confuses the time/date/location with a plausible alternative.',
        distractorPatterns_ko: '오답: (1) 음성의 단어와 비슷하게 들리지만 의미가 다른 단어, (2) 다른 화자의 관점을 가리킴, (3) 시간·날짜·장소를 그럴듯한 대안과 혼동.',
      },
      {
        name_en: 'Reading',
        name_ko: '리딩',
        questionsPerSection: 100,
        minutesPerSection: 75,
        choiceCount: 4,
        patterns_en: 'Part 5: single-sentence grammar/vocab gap fill (30). Part 6: short passage cloze (16, 4 passages × 4 questions). Part 7: single-passage reading (29) + multi-passage reading (25, 2-3 passages linked). Business contexts: emails, memos, ads, notices, articles, schedules, forms.',
        patterns_ko: 'Part 5: 단문 문법/어휘 빈칸(30). Part 6: 짧은 지문 빈칸(16, 지문 4개 × 4문항). Part 7: 단일 지문 독해(29) + 복합 지문 독해(25, 연결된 2-3개 지문). 비즈니스 맥락: 이메일·메모·광고·공지·기사·일정·양식.',
        distractorPatterns_en: 'For Part 5 grammar: distractors are other parts of speech from the same root (e.g. "decide / decision / decisive / decisively") with only one fitting the slot. For Part 7: wrong answers reference the wrong document in a multi-passage set, or use details that are TRUE for one document but the question asks about another.',
        distractorPatterns_ko: 'Part 5 문법: 함정은 같은 어근의 다른 품사("decide / decision / decisive / decisively") — 슬롯에 맞는 것은 하나뿐. Part 7: 복합 지문에서 다른 문서를 참조하거나, 한 문서에서는 사실이지만 질문은 다른 문서에 대한 것.',
      },
    ],
  },

  act: {
    display: 'Enhanced ACT',
    framing_en: 'ACT, Inc.\'s alternative to the SAT. The "Enhanced ACT" (rolled out nationally Sept 2025, all forms by spring 2026) replaces the legacy ACT: shorter sections, Math drops to 4 choices (was 5), Science is now OPTIONAL and excluded from the 1-36 composite (composite = average of English + Math + Reading only).',
    framing_ko: 'ACT, Inc.의 미국 대학입학시험 — SAT의 대안. "Enhanced ACT" (2025년 9월 전국 도입, 2026년 봄 모든 시험지 적용)가 기존 ACT를 대체: 더 짧은 영역, 수학은 5지에서 4지로 변경, 과학은 선택 영역이 되고 종합 점수(1-36)에서 제외(종합 = 영어 + 수학 + 읽기 평균).',
    sections: [
      {
        name_en: 'English',
        name_ko: '영어',
        questionsPerSection: 50,
        minutesPerSection: 35,
        choiceCount: 4,
        patterns_en: 'Enhanced ACT: 50 questions / 35 min (legacy was 75/45). Five passages with underlined portions; pick the best revision or "NO CHANGE" (first option, A or F). Reporting categories: Conventions of Standard English ~52-55% (~27 of 50), Production of Writing ~29-32% (~16), Knowledge of Language ~15-17% (~7). Stem convention: edit-in-place items have implicit "[underlined portion]" — choices are alternative wordings. Some numbered rhetorical items use explicit stems ("Which choice provides the most effective transition?", "The writer wants to add the following sentence... Should the writer make this addition?").',
        patterns_ko: 'Enhanced ACT: 50문항 / 35분 (기존 75/45). 5개 지문에 밑줄 친 부분 — 가장 나은 수정 또는 "NO CHANGE"(첫 보기 A 또는 F). 보고 분류: Conventions of Standard English ~52-55%(약 27/50), Production of Writing ~29-32%(약 16), Knowledge of Language ~15-17%(약 7). 출제 형식: 밑줄형 — 보기는 대안 표현. 수사적 문항은 명시적 발문("어떤 선택지가 가장 효과적인 전환인가?", "작가가 다음 문장을 추가하려 한다. 추가해야 하는가?").',
        distractorPatterns_en: 'Three wrong revisions per question — typically (1) over-corrects with formality/length that doesn\'t fit context, (2) introduces a new error while fixing the original one, (3) "NO CHANGE" when something is actually wrong, (4) ACT consistently prefers the most concise grammatically-correct option — verbose-but-fine choices are usually wrong.',
        distractorPatterns_ko: '문항당 3개 함정 수정 — 보통 (1) 맥락에 맞지 않게 과도하게 격식화/길게 수정, (2) 원 오류를 고치며 새 오류 도입, (3) 실제로는 오류가 있는데 "NO CHANGE", (4) ACT는 문법적으로 옳은 가장 간결한 선택지를 선호 — 장황한 표현은 보통 오답.',
        hardItemFraming_en: 'Hard ACT English items: (a) "Which is LEAST acceptable" / "NOT acceptable" — student must verify 3 correct options instead of 1. (b) Comma placement where multiple options are grammatical but only one matches the intended meaning (restrictive vs. non-restrictive clause). (c) Whole-essay goal questions at the end of each passage — require remembering passage purpose, not just the last paragraph.',
        hardItemFraming_ko: '어려운 ACT 영어: (a) "LEAST acceptable"/"NOT acceptable" — 1개 오답 대신 3개 정답 확인 필요. (b) 쉼표 위치 — 여러 보기가 문법적이지만 의도된 의미에 맞는 것은 하나(제한적 vs 비제한적 절). (c) 전체 글 목표 문항 — 마지막 단락이 아닌 글 전체 목적 기억 필요.',
        hardItemExamples_en: [
          `EXAMPLE 1 (verified hard, subject-verb agreement with long prepositional phrase):
Passage: "The committee, after considering proposals from three architectural firms over the course of six months, [were unable] to reach a consensus."
Prompt: "Best alternative to the underlined portion:"
Choices: ["NO CHANGE", "have been unable", "was unable", "are unable"]
Correct: "was unable"
Why hard: Long intervening prepositional phrase obscures that "committee" is singular collective. Three of four options use plural verbs. Students default to NO CHANGE when sentence sounds fine.`,
        ],
        hardItemExamples_ko: [
          `예시 1 (검증된 어려움, 긴 전치사구로 가려진 주어-동사 일치):
지문: "The committee, after considering proposals from three architectural firms over the course of six months, [were unable] to reach a consensus."
문제: "밑줄 친 부분에 가장 적절한 대안은?"
보기: ["NO CHANGE", "have been unable", "was unable", "are unable"]
정답: "was unable"
어려운 이유: 긴 전치사구가 "committee"가 단수 집합명사임을 가림. 4개 중 3개가 복수 동사. 문장이 자연스러우면 NO CHANGE를 선택하는 경향.`,
        ],
      },
      {
        name_en: 'Math',
        name_ko: '수학',
        questionsPerSection: 45,
        minutesPerSection: 50,
        choiceCount: 4,
        patterns_en: 'Enhanced ACT: 45 questions / 50 min / 4-choice (legacy was 60/60/5-choice). Math now aligned with SAT/general MC convention. Calculator allowed throughout (approved scientific or graphing). No reference sheet — students must know formulas. Coverage groupings: Preparing for Higher Math (~57-60%) split into Number & Quantity (10-12%), Algebra (17-20%), Functions (17-20%), Geometry (17-20%), Statistics & Probability (12-15%); plus Integrating Essential Skills (~40-43%, overlapping items measuring grade 8+ applied reasoning); plus Modeling reporting overlay (27-34%).',
        patterns_ko: 'Enhanced ACT: 45문항 / 50분 / 4지선다 (기존 60/60/5지). 수학도 이제 SAT/일반 MC 규약과 일치. 계산기 사용 가능. 공식 시트 없음 — 학생이 모두 외워야 함. 출제 영역: Preparing for Higher Math(~57-60%) = 수와 양(10-12%) + 대수(17-20%) + 함수(17-20%) + 기하(17-20%) + 통계·확률(12-15%); Integrating Essential Skills(~40-43%, 응용 추론); Modeling 보고용 중첩 분류(27-34%).',
        distractorPatterns_en: 'Distractors encode: (1) sign-flip, (2) wrong formula from same topic, (3) computed an intermediate step instead of the final answer, (4) off-by-one. With 4 choices (not 5), trap-density is higher per slot — each distractor must be deliberate.',
        distractorPatterns_ko: '함정 패턴: (1) 부호 반전, (2) 같은 주제의 잘못된 공식 사용, (3) 중간 단계 값 계산, (4) 1 차이. 4지(5지 아님)이므로 함정 밀도가 높음 — 각 보기 모두 의도적이어야 함.',
        hardItemFraming_en: 'Hard ACT Math items concentrate in the back of the section. Patterns: (a) Multi-concept items chaining 2-3 topics (trig + similar triangles, logs + exponential growth). (b) Coordinate-geometry items requiring distance formula + slope condition. (c) Items testing logarithms or matrices that most students never review. (d) Word problems with extraneous information that must be ignored.',
        hardItemFraming_ko: '어려운 ACT 수학은 영역 후반에 집중. 패턴: (a) 다개념 결합(삼각+닮음, 로그+지수 성장), (b) 좌표기하 — 거리 공식+기울기 조건, (c) 로그·행렬 등 학생들이 잘 복습 안 하는 주제, (d) 무관 정보 포함된 서술형.',
        hardItemExamples_en: [
          `EXAMPLE 1 (verified hard, circle equation with tangent line — 2-step):
Prompt: "A circle in the standard (x,y) coordinate plane has center (−3, 4) and is tangent to the x-axis. What is the equation of the circle?"
Choices: ["(x − 3)² + (y + 4)² = 16", "(x + 3)² + (y − 4)² = 9", "(x + 3)² + (y − 4)² = 16", "(x − 3)² + (y + 4)² = 9"]
Correct: "(x + 3)² + (y − 4)² = 16"
Why hard: Two conceptual steps: (1) tangent to x-axis means radius = |y-coordinate of center| = 4, so r² = 16 (students often pick r = 3, the |x|). (2) Sign flip in (x − h)² with h = −3 gives (x + 3)². 4 choices test BOTH errors.`,
        ],
        hardItemExamples_ko: [
          `예시 1 (검증된 어려움, 원의 방정식 + 접선):
문제: "표준 (x,y) 좌표평면에서 중심이 (−3, 4)이고 x축에 접하는 원의 방정식은?"
보기: ["(x − 3)² + (y + 4)² = 16", "(x + 3)² + (y − 4)² = 9", "(x + 3)² + (y − 4)² = 16", "(x − 3)² + (y + 4)² = 9"]
정답: "(x + 3)² + (y − 4)² = 16"
어려운 이유: 2단계 개념: (1) x축에 접 = 반지름 = |y좌표| = 4, 즉 r² = 16 (학생은 r = 3 (|x|) 선택). (2) (x − h)²에서 h = −3은 (x + 3)². 4지가 두 오류 모두 시험.`,
        ],
      },
      {
        name_en: 'Reading',
        name_ko: '읽기',
        questionsPerSection: 36,
        minutesPerSection: 40,
        choiceCount: 4,
        patterns_en: 'Enhanced ACT: 36 questions / 40 min (legacy was 40/35). Four passages, fixed genre rotation: (1) Literary Narrative/Prose Fiction, (2) Social Science, (3) Humanities, (4) Natural Science. One of the four is a PAIRED set (Passage A + Passage B with cross-passage questions). Reporting categories: Key Ideas & Details ~52-60%, Craft & Structure ~25-30%, Integration of Knowledge & Ideas ~13-18%.',
        patterns_ko: 'Enhanced ACT: 36문항 / 40분 (기존 40/35). 4개 지문, 고정 장르 순환: (1) 문학·소설, (2) 사회과학, (3) 인문, (4) 자연과학. 4개 중 1개는 짝지문(Passage A + B 교차 문항). 분류: Key Ideas & Details ~52-60%, Craft & Structure ~25-30%, Integration of Knowledge & Ideas ~13-18%.',
        distractorPatterns_en: 'ACT Reading distractors: (1) factually correct in the world but unsupported by the passage, (2) supported by an earlier paragraph but contradicted by a later pivot, (3) restates a character\'s opinion as the author\'s, (4) for paired-passage cross-text: flips which author holds which view, (5) inference distractors use absolute language ("always," "never") that overstates a hedged claim.',
        distractorPatterns_ko: 'ACT 읽기 함정: (1) 현실에서는 맞지만 지문 근거 없음, (2) 앞 단락은 지지하나 뒷 단락이 반박, (3) 등장인물의 의견을 작가의 의견으로 진술, (4) 짝지문 교차: 두 작가의 입장을 뒤집음, (5) 추론 함정: "항상", "절대" 같은 절대 표현으로 약한 주장을 과장.',
        hardItemFraming_en: 'Hard ACT Reading items: (a) Prose fiction passage with subtle INDIRECT characterization — narrator never states feelings, students must infer from action choices. (b) Natural Science paired passage where two scientists agree on facts but disagree on interpretation. (c) "Main purpose of paragraph X" where the paragraph contains the literal answer to multiple choices, but only one captures the paragraph\'s function within the larger argument. (d) Vocabulary items where the word\'s common meaning works but the passage uses a domain-specific sense.',
        hardItemFraming_ko: '어려운 ACT 읽기: (a) 소설 — 화자가 감정을 명시하지 않고 행동 선택으로 간접 인물 묘사, (b) 자연과학 짝지문에서 두 과학자가 사실에는 동의하나 해석은 다름, (c) "단락 X의 주요 목적" — 단락에 여러 보기의 직접 근거가 있지만 더 큰 논지 내 단락의 기능을 포착하는 것은 하나, (d) 어휘 — 흔한 의미도 통하지만 지문은 분야 특화 의미 사용.',
        hardItemExamples_en: [
          `EXAMPLE 1 (verified hard, Social Science excerpt — historian-vs-contemporary distinction):
Passage: "Critics of urban renewal in the 1960s often argued that the policy displaced more low-income families than it housed, but proponents countered that displacement was a transitional cost. More recent historians, working with municipal records the original analysts lacked, have shown the transitional period in many cities lasted not five years, as projected, but closer to two decades."
Prompt: "The passage indicates that recent historians' assessment of 1960s urban renewal differs from contemporaneous proponents' assessment primarily in:"
Choices: ["whether displacement occurred at all.", "the duration of the transitional period.", "the number of families housed by the policy.", "the moral justification for the policy."]
Correct: "the duration of the transitional period."
Why hard: (A) wrong — both sides agree displacement occurred. (C) is the CRITICS' claim, not the historians'. (D) plausible but not addressed. Only (B) is the precise difference the text identifies ("not five years…but closer to two decades").`,
        ],
        hardItemExamples_ko: [
          `예시 1 (검증된 어려움, 사회과학 발췌 — 역사가와 동시대 입장 구분):
지문: "1960년대 도시 재개발 비평가들은 정책이 수용한 저소득 가구보다 더 많이 이주시켰다고 주장했지만, 지지자들은 이주가 과도기적 비용이라고 반박했다. 최근 역사가들은 원래 분석가들이 갖지 못했던 시 기록을 사용해, 많은 도시의 과도기가 예상된 5년이 아니라 거의 20년에 가까웠음을 보였다."
문제: "글에 따르면, 1960년대 도시 재개발에 대한 최근 역사가들의 평가가 동시대 지지자들과 주로 다른 점은?"
보기: ["이주가 일어났는지 여부", "과도기의 기간", "정책으로 수용된 가구 수", "정책의 도덕적 정당성"]
정답: "과도기의 기간"
어려운 이유: (A) 양쪽 모두 이주 발생에 동의. (C)는 비평가의 주장이지 역사가의 주장 아님. (D) 그럴듯하지만 미언급. (B)만 텍스트가 명시한 정확한 차이("5년이 아니라 20년").`,
        ],
      },
      {
        name_en: 'Science',
        name_ko: '과학',
        questionsPerSection: 40,
        minutesPerSection: 40,
        choiceCount: 4,
        patterns_en: 'Enhanced ACT: 40 questions / 40 min (legacy was 40/35). NOTE: Science is now OPTIONAL and EXCLUDED FROM THE COMPOSITE (1-36 = English + Math + Reading only). No calculator. Passage formats: Data Representation (~25-35% — charts/graphs/tables only), Research Summaries (~45-60% — experiment descriptions), Conflicting Viewpoints (~15-20% — 2-3 scientists with competing hypotheses). Tests reasoning, not memorized science.',
        patterns_ko: 'Enhanced ACT: 40문항 / 40분 (기존 40/35). 참고: 과학은 이제 선택이고 종합 점수(1-36 = 영어+수학+읽기)에서 제외. 계산기 불가. 지문 형식: Data Representation(~25-35% — 차트·그래프·표), Research Summaries(~45-60% — 실험 설명), Conflicting Viewpoints(~15-20% — 2-3명 과학자의 가설 대립). 추론 평가지 과학 지식 아님.',
        distractorPatterns_en: 'Wrong answers: (1) axis-flip distractors (says "increased" when data shows decrease), (2) extrapolation distractors pick a value INSIDE the data range when the question asks for extrapolation beyond it, (3) attributes a finding to the wrong experiment in a multi-experiment passage, (4) for Conflicting Viewpoints: states a position that no scientist in the passage actually holds, (5) confuses correlation with causation, (6) for Research Summaries: control-variable vs. independent-variable confusion.',
        distractorPatterns_ko: '오답: (1) 축 반전 함정("증가"라고 했는데 데이터는 감소), (2) 외삽 함정: 데이터 범위 안의 값으로 외삽, (3) 다중 실험 지문에서 발견을 잘못된 실험에 귀속, (4) Conflicting Viewpoints: 지문의 어떤 과학자도 가지지 않은 입장, (5) 상관과 인과 혼동, (6) Research Summaries: 통제 변인과 독립 변인 혼동.',
      },
    ],
  },

  ap: {
    display: 'AP Exams',
    framing_en: 'College Board\'s Advanced Placement exams. College-introductory level. Score 1-5. Most subjects use MCQ + Free Response Question (FRQ). For generation, stick to MCQ.',
    framing_ko: 'College Board의 Advanced Placement 시험. 대학 입문 수준. 점수 1-5. 대부분 과목 MCQ + Free Response Question(FRQ). 생성은 MCQ로.',
    sections: [
      {
        name_en: 'Generic AP MCQ',
        name_ko: 'AP 객관식',
        questionsPerSection: 30,
        minutesPerSection: 45,
        choiceCount: 4,
        patterns_en: 'Most APs: 4 choices, ~50-60 MCQ in 60-90 min on the real exam. Reference the relevant Course and Exam Description (CED) skill or unit in the explanation. Topic should be pinned by the subject (which the prompt provides separately).',
        patterns_ko: '대부분 AP: 4지선다, 실제 시험에서 60-90분에 50-60문항. 해설에 관련 Course and Exam Description(CED) 기술 또는 단원 언급. 주제는 과목(프롬프트가 별도 제공)이 정합니다.',
        distractorPatterns_en: 'AP distractors are tuned to common college-intro misconceptions for that subject — e.g. AP Bio: surface-level "more is better" answers when the correct answer requires understanding of regulation; AP US History: dates that bracket the actual event by a decade; AP Calc: forgetting the chain rule or product rule.',
        distractorPatterns_ko: 'AP 함정은 해당 과목의 대학 입문 흔한 오개념에 맞춤 — 예: AP 생물: 조절을 이해해야 하는데 "많을수록 좋다" 식 표면적 답; AP 미국사: 실제 사건을 10년 정도 벗어난 날짜; AP 미적분: 연쇄법칙·곱 법칙 잊음.',
      },
    ],
  },

  gre: {
    display: 'GRE General Test (post-Sept 2023)',
    framing_en: 'ETS\'s Graduate Record Examination General Test, shortened format active since September 22, 2023 (~1h 58min total). Structure: 1 Analytical Writing essay (Analyze an Issue, 30 min) + 2 Verbal Reasoning sections (Section 1: 12 Q / 18 min; Section 2: 15 Q / 23 min; TOTAL 27 Q / 41 min) + 2 Quantitative Reasoning sections (Section 1: 12 Q / 21 min; Section 2: 15 Q / 26 min; TOTAL 27 Q / 47 min). Section-level adaptive: Section 2 difficulty depends on Section 1 performance. The questionsPerSection/minutesPerSection below are the TOTALS across both Verbal or both Quant sections — what a "full Verbal practice" mock should produce. Score: Verbal 130-170, Quant 130-170 (1-pt increments), Analytical Writing 0-6 (half-pt).',
    framing_ko: 'ETS의 GRE General Test, 2023년 9월 22일 단축 형식(총 ~1시간 58분). 구성: 분석적 작문 1개(Analyze an Issue, 30분) + 언어 추론 2개 영역(1: 12문항/18분; 2: 15문항/23분; 총 27/41분) + 수리 추론 2개 영역(1: 12문항/21분; 2: 15문항/26분; 총 27/47분). 영역별 적응형: 영역 2 난이도는 영역 1 성적에 따라 결정. 아래 questionsPerSection/minutesPerSection는 언어/수리 각각 두 영역의 합계 — "Verbal 전체 모의" 한 회분이 생성해야 할 분량. 점수: Verbal 130-170, Quant 130-170(1점 단위), Analytical Writing 0-6(0.5점 단위).',
    sections: [
      {
        name_en: 'Verbal Reasoning',
        name_ko: '언어 추론',
        questionsPerSection: 27,
        minutesPerSection: 41,
        choiceCount: 5,
        patterns_en: 'Three formats: (1) Reading Comprehension — 1-4 paragraph passages with 1-6 questions; choose-one MC, choose-multiple ("select all that apply"), select-in-passage (highlight a sentence). (2) Text Completion — 1-3 blanks in a short passage; 3 choices per blank (5-choice when 1 blank). (3) Sentence Equivalence — single-sentence with one blank; pick TWO of six choices that produce equivalent sentences. Vocabulary is high-register academic.',
        patterns_ko: '3가지 형식: (1) 독해 — 1-4문단 지문에 1-6문항; 단일 MC, 다중 선택("해당하는 것 모두"), 지문 내 문장 선택. (2) Text Completion — 짧은 지문에 1-3개 빈칸; 빈칸당 3개 보기(빈칸 1개일 때 5지). (3) Sentence Equivalence — 한 문장에 빈칸 하나; 보기 6개 중 동등한 문장을 만드는 2개 선택. 어휘는 학술 고급 수준.',
        distractorPatterns_en: 'For Text Completion: distractors are correct register but wrong tone (e.g. positive when context demands negative), or correct meaning but mismatched register. For Sentence Equivalence: the trap pair is two synonyms that DON\'T fit the sentence, mixed with one near-synonym pair that does — students who match synonyms without reading the sentence pick the trap.',
        distractorPatterns_ko: 'Text Completion: 함정은 격식은 맞지만 톤이 틀림(문맥은 부정인데 긍정), 또는 의미는 맞지만 격식 불일치. Sentence Equivalence: 함정 쌍은 문장에 맞지 않는 두 동의어 + 맞는 한 쌍의 근사 동의어 혼합 — 문장을 읽지 않고 동의어만 짝지으면 함정에 빠짐.',
        hardItemFraming_en: 'Hard GRE Verbal items: high-level vocabulary (perfunctory, sanguine, mendacious, limpidity, recondite); logically dense RC passages on humanities/science with paragraph-function questions; multi-blank TC where blanks are causally linked.',
        hardItemFraming_ko: '어려운 GRE Verbal: 학술 고급 어휘(perfunctory, sanguine, mendacious, limpidity, recondite); 인문·과학의 논리적으로 밀도 높은 RC 단락-기능 문항; 빈칸들이 인과적으로 연결된 다중 빈칸 TC.',
        hardItemExamples_en: [
          `EXAMPLE 1 (Sentence Equivalence — pick exactly 2 of 6):
Prompt: "Although her colleagues had expected her acceptance speech to be ______, she delivered remarks that were unexpectedly substantive and probing."
Choices: ["(A) perfunctory", "(B) magnanimous", "(C) cursory", "(D) trenchant", "(E) eloquent", "(F) incisive"]
Correct: ["A", "C"]
Why hard: Must pick EXACTLY 2. "Unexpectedly substantive" signals contrast — expected speech was shallow. "Perfunctory" and "cursory" both mean superficial. (D) "trenchant" and (F) "incisive" are synonyms but mean OPPOSITE of what fits — trap for synonym-matchers. (B) and (E) are positive but unrelated.`,

          `EXAMPLE 2 (Text Completion — 2-blank):
Prompt: "Despite the apparent ______ of his prose, the author's arguments are in fact ______, relying on careful distinctions that reward close reading."
Choices: [
  "Blank (i): (A) limpidity   (B) opacity     (C) prolixity",
  "Blank (ii): (D) facile     (E) recondite   (F) jejune"
]
Correct: "(A) limpidity; (E) recondite"
Why hard: "Despite" signals contrast — surface clarity vs. underlying complexity. "Limpidity" (clarity) contrasts with "recondite" (obscure/deep). All distractors are GRE-level vocabulary; "opacity" + "facile" also forms a sentence but contradicts the "reward close reading" clue.`,
        ],
        hardItemExamples_ko: [
          `예시 1 (Sentence Equivalence — 6개 중 정확히 2개 선택):
문제: "동료들은 그녀의 수락 연설이 ______일 것으로 예상했지만, 그녀는 의외로 실질적이고 깊이 있는 발언을 했다."
보기: ["(A) perfunctory", "(B) magnanimous", "(C) cursory", "(D) trenchant", "(E) eloquent", "(F) incisive"]
정답: ["A", "C"]
어려운 이유: 정확히 2개 선택 필수. "의외로 실질적" = 예상 연설은 피상적이었음. "Perfunctory"와 "cursory" 모두 피상적 의미. (D), (F)는 동의어지만 반대 의미 — 동의어 매칭자 함정. (B), (E)는 긍정이지만 무관.`,

          `예시 2 (Text Completion — 2-빈칸):
문제: "그의 산문이 표면적으로는 ______로 보이지만, 작가의 주장은 실제로 ______여서, 정밀한 구분이 면밀한 독서를 보상한다."
보기: [
  "빈칸 (i): (A) limpidity   (B) opacity     (C) prolixity",
  "빈칸 (ii): (D) facile     (E) recondite   (F) jejune"
]
정답: "(A) limpidity; (E) recondite"
어려운 이유: "Despite"가 대조 신호 — 표면 명료 vs 내면 복잡. "Limpidity"(명료)와 "recondite"(난해) 대조. 모든 함정이 GRE 수준 어휘.`,
        ],
      },
      {
        name_en: 'Quantitative Reasoning',
        name_ko: '수리 추론',
        questionsPerSection: 27,
        minutesPerSection: 47,
        choiceCount: 5,
        patterns_en: 'Three formats: (1) Quantitative Comparison — given two quantities, pick A > B / A < B / A = B / cannot be determined. (2) standard 5-choice MC. (3) Numeric Entry — type a number. (4) data interpretation (2-3 questions on the same chart). Topics: arithmetic, algebra, geometry, data analysis. Math is high-school level but trickier than SAT — emphasis on logical edges (negative roots, undefined values, n = 0).',
        patterns_ko: '4가지 형식: (1) Quantitative Comparison — 두 수량 주어지고 A > B / A < B / A = B / 결정 불가 선택. (2) 5지선다. (3) Numeric Entry — 숫자 입력. (4) 자료 해석(같은 차트에 2-3문항). 주제: 산술·대수·기하·자료 분석. 수학은 고교 수준이지만 SAT보다 까다로움 — 논리적 가장자리(음의 근, 정의되지 않은 값, n = 0) 강조.',
        distractorPatterns_en: 'For Quantitative Comparison especially: "cannot be determined" is often the answer when students assume positivity/integrality of unknowns. Distractors play on (1) assuming x > 0, (2) assuming integer values, (3) forgetting that a square root has two solutions.',
        distractorPatterns_ko: '특히 Quantitative Comparison: 학생들이 미지수를 양수·정수로 가정할 때 "결정 불가"가 정답인 경우가 많음. 함정은 (1) x > 0 가정, (2) 정수 가정, (3) 제곱근에 두 해가 있음을 잊음.',
      },
    ],
  },
}

/**
 * Tolerant section matcher. Topic slugs produce short labels ("English",
 * "Verbal", "Math") that don't always equal the canonical spec name
 * ("English (영어)", "Verbal Reasoning", "Mathematics (수학)"). This
 * helper accepts label vs spec mismatch in any direction (label
 * contains name, name contains label) and first-word match (ignoring
 * punctuation / parenthetical suffixes). Returns the matched section
 * or sections[0] as a fallback so renderTestSpec never returns empty.
 */
function matchSection(spec: TestSpec, sectionLabel: string | null): SectionSpec | undefined {
  if (!sectionLabel || !spec.sections.length) return spec.sections[0]
  const norm = (s: string) => s.toLowerCase().trim()
  const firstWord = (s: string) => norm(s).split(/[\s&()/]+/).filter(Boolean)[0] ?? ''
  const label = norm(sectionLabel)
  const labelFirst = firstWord(sectionLabel)
  return spec.sections.find(s => {
    const en = norm(s.name_en)
    const ko = norm(s.name_ko)
    if (en === label || ko === label) return true
    if (label.includes(en) || label.includes(ko)) return true
    if (en.includes(label) || ko.includes(label)) return true
    const enFirst = firstWord(s.name_en)
    const koFirst = firstWord(s.name_ko)
    if (labelFirst && (labelFirst === enFirst || labelFirst === koFirst)) return true
    return false
  }) ?? spec.sections[0]
}

/**
 * Render the full spec block for one section as the prompt expects.
 * Returns empty string when we don't have a spec — falls back to the
 * generic test-prep guidance from study-prompt-context.ts.
 */
export function renderTestSpec(
  family: TestFamily | null,
  sectionLabel: string | null,
  language: 'en' | 'ko'
): string {
  if (!family) return ''
  const spec = TEST_SPECS[family]
  if (!spec) return ''

  const section = matchSection(spec, sectionLabel)
  if (!section) return ''

  if (language === 'ko') {
    return [
      `시험: ${spec.display}.`,
      spec.framing_ko,
      `영역: ${section.name_ko}. 총 ${section.questionsPerSection}문항, ${section.minutesPerSection}분, ${section.choiceCount}지선다.`,
      `출제 패턴: ${section.patterns_ko}`,
      `오답 설계: ${section.distractorPatterns_ko}`,
    ].join('\n\n')
  }
  return [
    `Test: ${spec.display}.`,
    spec.framing_en,
    `Section: ${section.name_en}. ${section.questionsPerSection} questions, ${section.minutesPerSection} minutes, ${section.choiceCount}-choice multiple choice.`,
    `Question patterns: ${section.patterns_en}`,
    `Distractor design: ${section.distractorPatterns_en}`,
  ].join('\n\n')
}

/**
 * Look up the default question count + minutes for a given test family
 * + section. Used by the test generator so timer pacing matches the
 * real section. Falls back to the test's first section, then to a
 * generic 20Q/30min for non-test or unknown families.
 */
export function defaultsForTestSection(
  family: TestFamily | null,
  sectionLabel: string | null
): { count: number; minutes: number; choiceCount: 4 | 5 } {
  if (!family) return { count: 20, minutes: 30, choiceCount: 4 }
  const spec = TEST_SPECS[family]
  if (!spec) return { count: 20, minutes: 30, choiceCount: 4 }

  const section = matchSection(spec, sectionLabel)
  if (!section) return { count: 20, minutes: 30, choiceCount: 4 }
  // Return the researched values verbatim — a mock test exists to
  // mimic the real test. The generator may still chunk very long
  // sections internally for token-limit reasons, but the customization
  // sheet always shows the student the official format.
  return {
    count: section.questionsPerSection,
    minutes: section.minutesPerSection,
    choiceCount: section.choiceCount,
  }
}
