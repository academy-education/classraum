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
        distractorPatterns_en: 'KSAT distractors are notoriously close — designed to differentiate top performers. Patterns: (1) correct in scope but wrong in degree (지문은 "일부"라고 했는데 보기는 "모두"), (2) supported by one paragraph but contradicted by another, (3) plausible if the reader misses a connective like "그러나" or "다만", (4) lexically near the passage but semantically inverted.',
        distractorPatterns_ko: '수능 오답은 상위권 변별을 위해 매우 정교합니다: (1) 범위는 맞지만 정도가 틀림 ("일부" → "모두"), (2) 한 문단은 지지하지만 다른 문단이 반박, (3) "그러나"·"다만" 등 접속어를 놓치면 그럴듯하게 보임, (4) 어휘는 지문과 가깝지만 의미가 반대.',
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
        distractorPatterns_en: 'Wrong answers: (1) information from a different paragraph, (2) restated using a synonym but with a key qualifier omitted, (3) plausibly true but never stated in the passage, (4) for sentence simplification: leaves out an essential clause or changes the relationship between ideas.',
        distractorPatterns_ko: '오답: (1) 다른 문단의 정보, (2) 동의어로 바꿨지만 핵심 한정사가 빠짐, (3) 그럴듯하지만 지문에 명시되지 않음, (4) 문장 단순화의 경우: 핵심 절을 빠뜨리거나 아이디어 간 관계를 바꿈.',
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
        patterns_en: 'Three long academic passages (700-1000 words), 13-14 questions each. Question types: multiple choice, True/False/Not Given, Yes/No/Not Given, matching headings to paragraphs, matching information, sentence completion, summary completion, short answer (no more than three words). Difficulty escalates passage 1 → 3.',
        patterns_ko: '학술 지문 3개(700-1000단어), 각 13-14문항. 문항 유형: 객관식, True/False/Not Given, Yes/No/Not Given, 단락에 제목 매칭, 정보 매칭, 문장 완성, 요약 완성, 단답(3단어 이하). 지문 1→3으로 난이도 상승.',
        distractorPatterns_en: 'For T/F/NG specifically: "Not Given" is the most-missed — students confuse "the passage doesn\'t mention this" with "the passage implies the opposite." Wrong answers should test this confusion. For matching headings: distractor headings should overlap with one of the paragraph\'s sub-ideas but miss the main point.',
        distractorPatterns_ko: 'T/F/NG에서 특히 "Not Given"이 가장 많이 틀림 — 학생들은 "지문에 언급 없음"과 "지문이 반대를 암시"를 혼동. 오답은 이 혼동을 시험해야 함. 제목 매칭의 경우: 함정 제목은 단락의 부분 아이디어와 겹치지만 주제는 놓침.',
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
    display: 'ACT',
    framing_en: 'ACT, Inc.\'s alternative to the SAT for US college admissions. Four required sections + optional Writing essay. Score 1-36 (composite is average of four section scores).',
    framing_ko: 'ACT, Inc.의 미국 대학입학시험 — SAT의 대안. 필수 4영역 + 선택 작문. 점수 1-36(종합은 4개 영역 평균).',
    sections: [
      {
        name_en: 'English',
        name_ko: '영어',
        questionsPerSection: 75,
        minutesPerSection: 45,
        choiceCount: 4,
        patterns_en: 'Five passages with underlined portions; pick the best revision or "NO CHANGE." Tests usage/mechanics (punctuation, grammar, sentence structure — ~52%) and rhetorical skills (strategy, organization, style — ~48%).',
        patterns_ko: '5개 지문에 밑줄 친 부분 — 가장 나은 수정 또는 "NO CHANGE" 선택. 어법·구조(구두점·문법·문장 구조 — ~52%)와 수사 기술(전략·구성·문체 — ~48%) 평가.',
        distractorPatterns_en: 'Three wrong revisions per question — typically (1) over-corrects with formality/length that doesn\'t fit context, (2) introduces a new error while fixing the original one, (3) "NO CHANGE" when something is actually wrong.',
        distractorPatterns_ko: '문항당 3개 함정 수정 — 보통 (1) 맥락에 맞지 않게 과도하게 격식화/길게 수정, (2) 원 오류를 고치며 새 오류 도입, (3) 실제로는 오류가 있는데 "NO CHANGE".',
      },
      {
        name_en: 'Math',
        name_ko: '수학',
        questionsPerSection: 60,
        minutesPerSection: 60,
        choiceCount: 5,
        patterns_en: '5-choice MC (the only ACT section with 5 choices). Coverage: pre-algebra (~23%), elementary algebra (~17%), intermediate algebra (~15%), coordinate geometry (~15%), plane geometry (~23%), trigonometry (~7%). Calculator permitted but most are doable without one.',
        patterns_ko: '5지선다(ACT에서 유일하게 5지). 범위: pre-algebra (~23%), elementary algebra (~17%), intermediate algebra (~15%), 좌표기하 (~15%), 평면기하 (~23%), 삼각법 (~7%). 계산기 허용이지만 대부분 없이도 풀 수 있음.',
        distractorPatterns_en: 'Like SAT Math distractors but with one extra slot — make the 5th choice an "I forgot the formula entirely" value to catch the bottom half. Otherwise (1) sign-flip, (2) used wrong formula from same topic, (3) computed an intermediate step, (4) off-by-one.',
        distractorPatterns_ko: 'SAT 수학 함정과 비슷하지만 한 슬롯 추가 — 5번째 보기는 하위권을 잡기 위한 "공식 완전히 잊음" 값. 나머지 (1) 부호 반전, (2) 같은 주제의 잘못된 공식 사용, (3) 중간 단계 값 계산, (4) 1 차이.',
      },
      {
        name_en: 'Reading',
        name_ko: '읽기',
        questionsPerSection: 40,
        minutesPerSection: 35,
        choiceCount: 4,
        patterns_en: 'Four passages (one per genre: prose fiction/literary narrative, social studies, humanities, natural sciences), 10 questions each. Fast pace — 8 min/passage. Questions test main idea, detail, inference, vocabulary in context, comparative reading (for paired passages).',
        patterns_ko: '4개 지문(장르당 1개: 소설/문학 서사, 사회, 인문, 자연과학), 각 10문항. 빠른 속도 — 지문당 8분. 주제, 세부, 추론, 문맥 어휘, 비교 독해(짝지문) 평가.',
        distractorPatterns_en: 'ACT Reading distractors: (1) factually correct in the world but unsupported by the passage, (2) supported by an earlier paragraph but contradicted by a later one, (3) restates a character\'s opinion as the author\'s, (4) uses the right detail but to answer the wrong part of a two-part question.',
        distractorPatterns_ko: 'ACT 읽기 함정: (1) 현실에서는 맞지만 지문 근거 없음, (2) 앞 단락은 지지하나 뒷 단락이 반박, (3) 등장인물의 의견을 작가의 의견으로 진술, (4) 옳은 세부지만 2부 문제의 잘못된 부분에 답.',
      },
      {
        name_en: 'Science',
        name_ko: '과학',
        questionsPerSection: 40,
        minutesPerSection: 35,
        choiceCount: 4,
        patterns_en: 'Seven passages, ~5-7 questions each. Formats: Data Representation (charts, graphs, tables — interpret), Research Summaries (description of experiments — analyze design + results), Conflicting Viewpoints (2-3 hypotheses on the same phenomenon — compare). Tests reasoning, not science knowledge — outside content rarely required.',
        patterns_ko: '7개 지문, 각 약 5-7문항. 형식: Data Representation(차트·그래프·표 해석), Research Summaries(실험 설명 — 설계·결과 분석), Conflicting Viewpoints(같은 현상에 대한 2-3개 가설 비교). 추론을 평가하지 과학 지식이 아님 — 외부 지식 거의 불필요.',
        distractorPatterns_en: 'Wrong answers: (1) misreads the chart axis (units, scale), (2) confuses correlation with causation, (3) attributes a finding to the wrong experiment in a multi-experiment passage, (4) for Conflicting Viewpoints: states a position that no scientist in the passage holds.',
        distractorPatterns_ko: '오답: (1) 차트 축 잘못 읽음(단위·척도), (2) 상관과 인과 혼동, (3) 다중 실험 지문에서 발견을 잘못된 실험에 귀속, (4) Conflicting Viewpoints: 지문의 어떤 과학자도 가지지 않은 입장 진술.',
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
    display: 'GRE General Test',
    framing_en: 'ETS\'s Graduate Record Examination General Test. Required for many US grad school programs. Score: Verbal 130-170, Quant 130-170 (1-pt increments), Analytical Writing 0-6 (half-pt).',
    framing_ko: 'ETS의 GRE General Test. 미국 대학원 입학에 사용. 점수: Verbal 130-170, Quant 130-170(1점 단위), Analytical Writing 0-6(0.5점 단위).',
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

  // Match by name. For tests like AP where each subject is a separate
  // catalog entry but they all share one spec, the section lookup
  // falls back to the first spec section.
  const section = sectionLabel
    ? spec.sections.find(s =>
        s.name_en === sectionLabel ||
        s.name_ko === sectionLabel ||
        sectionLabel.includes(s.name_en) ||
        sectionLabel.includes(s.name_ko)
      ) ?? spec.sections[0]
    : spec.sections[0]
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

  const section = sectionLabel
    ? spec.sections.find(s =>
        s.name_en === sectionLabel ||
        s.name_ko === sectionLabel ||
        sectionLabel.includes(s.name_en) ||
        sectionLabel.includes(s.name_ko)
      ) ?? spec.sections[0]
    : spec.sections[0]
  // Cap really long sections (KSAT Korean = 45 Q / 80 min, TOEIC =
  // 100 Q / section, IELTS Reading = 40 Q / 60 min) at 40 questions
  // so generation stays under the model's output limits and the
  // student stays under an hour. SAT sections (44 R&W / 54 Math)
  // stay full because that's the real test length.
  const HARD_CAP = 60
  const count = Math.min(section.questionsPerSection, HARD_CAP)
  const ratio = count / section.questionsPerSection
  const minutes = Math.round(section.minutesPerSection * ratio)
  return { count, minutes, choiceCount: section.choiceCount }
}
