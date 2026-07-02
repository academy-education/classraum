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

          `EXAMPLE 3 (verified hard, "overall structure of the text" — recent view revises earlier view):
Passage: "Readers of Virginia Woolf's 1927 novel To the Lighthouse often pause over the brief middle section titled 'Time Passes', which jumps from one summer on the Isle of Skye to the next with little direct mention of the Ramsay family. Early reviewers in journals such as the Times Literary Supplement complained that these pages felt like an atmospheric interlude, a stretch of description that merely delays the return to the main story. Recent critics of modernist narrative, however, treat 'Time Passes' as a hinge on which the entire novel turns. They note how wartime deaths and personal losses are tucked into parenthetical asides while full sentences linger on an empty house, shifting attention from individual consciousness to impersonal time. On this reading, the section does not interrupt the novel's structure; it quietly rearranges it."
Prompt: "Which choice best describes the overall structure of the text?"
Choices: ["It identifies a section of To the Lighthouse that has puzzled readers, presents an earlier critical view dismissing it as a mere interlude, and then offers a contemporary interpretation that sees the section as structurally central.", "It recounts Virginia Woolf's biography, then summarizes early and recent reviews of To the Lighthouse to show how critical opinion about the novel has shifted over time.", "It describes an underappreciated section of To the Lighthouse, reviews in detail the language of its descriptions, and then compares that language with passages from other modernist novels.", "It introduces a section of To the Lighthouse that readers have found unfitting, outlines an earlier view of it as a mere pause, and then argues that the section is peripheral to the novel's overall design."]
Correct: "It identifies a section of To the Lighthouse that has puzzled readers, presents an earlier critical view dismissing it as a mere interlude, and then offers a contemporary interpretation that sees the section as structurally central."
Why hard: two of the four choices contain accurate individual elements — the dismissive-early-view piece — but only one gets the CLOSING move right (contemporary reinterpretation as structurally central, NOT peripheral). Choice D inverts the final stance; C invents "language comparison with other modernists" that isn't in the passage. Common template — clone this shape often: popular/early view → scholarly reinterpretation → why the new view is structurally central.`,

          `EXAMPLE 4 (verified hard, "overall structure of the text" — dismissive label reinterpreted):
Passage: "In the popular imagination, the term 'Luddite' serves as a pejorative for anyone irrationally opposed to technological progress. However, in his landmark study The Making of the English Working Class (1963), historian E.P. Thompson challenged this caricature by recovering the political rationality of the 19th-century textile breakers. Thompson demonstrated that the Luddites attacked machinery not out of technophobia, but as a strategic means of collective bargaining against what they termed 'fraudulent' labor practices, such as wage cuts and the production of shoddy goods. By situating their violence within the context of unregulated capitalism, Thompson reclassified the movement as an early, highly organized manifestation of industrial trade unionism."
Prompt: "Which choice best describes the overall structure of the text?"
Choices: ["It notes a common derogatory label, introduces a study that challenges the label's accuracy, and concludes that the group's actions ultimately confirmed the validity of the label.", "It identifies a dismissive label, presents a historian's reinterpretation of the group behind that label, and explains his argument that their actions were strategically motivated.", "It describes the working conditions of nineteenth-century textile laborers, lists the grievances they held against factory owners, and calls for modern legislation to prevent similar abuses.", "It praises a historian for his literary style, summarizes his most famous work, and critiques his methodology for relying too heavily on anecdotal evidence."]
Correct: "It identifies a dismissive label, presents a historian's reinterpretation of the group behind that label, and explains his argument that their actions were strategically motivated."
Why hard: choice A shares the "dismissive label + challenging study" opening but inverts the closing move to "confirmed the label" — the exact opposite of Thompson's argument. Distractors C and D each pick one detail from the passage (working conditions; the historian's style) and inflate it into the passage's main structure. The trap pattern: correct-shape opening + inverted closing.`,

          `EXAMPLE 5 (verified hard, "cross-text connections" — Text 2 undermines Text 1's premise):
Passage: "Text 1: Scholars have long interpreted Upper Paleolithic cave paintings of bison and horses as tools of sympathetic magic. By capturing the image of the animal on the rock face, early humans are thought to have believed they could overpower the beast in reality. Proponents argue that the overwhelming focus on large game species — animals crucial for survival — confirms that the art was a utilitarian attempt to ensure a successful hunt.

Text 2: A cognitive archaeologist finds a functional explanation unconvincing. She points out that the species dominating the cave walls often do not correspond to the animal bones found in the artists' campfires; reindeer, a primary food source, are rarely depicted. To her, the art's placement in deep, resonant chambers suggests it served as a backdrop for acoustic rituals or social ceremonies, not as a menu for subsistence."
Prompt: "Based on the texts, how would the author of Text 2 most likely respond to the claim in Text 1 that the focus on large game confirms the art's purpose as hunting magic?"
Choices: ["She would agree that the art depicts game animals but argue that it was intended to celebrate past hunting successes rather than to influence future ones.", "She would acknowledge the focus on large game but argue that the absence of primary dietary staples like reindeer in the art undermines the theory that the paintings were meant to secure food.", "She would accept that the art had a utilitarian purpose but contend that the deep cave locations suggest it was used for food storage rather than for magical rituals.", "She would reject the focus on animals, insisting that the acoustic resonance of the chambers was the only significant factor in the site's use."]
Correct: "She would acknowledge the focus on large game but argue that the absence of primary dietary staples like reindeer in the art undermines the theory that the paintings were meant to secure food."
Why hard: this is the DSAT cross-text signature move. Wrong answers each contain one true detail from Text 2 (celebrates past hunts; utilitarian; acoustic resonance) but attach it to a stance Text 2 doesn't hold. Only B captures the actual logical move — accepting Text 1's observation (large game focus) while turning it into COUNTER-evidence (reindeer absence). Correct answers to cross-text items almost always take this "acknowledge X, but argue Y undermines/complicates the conclusion" shape.`,

          `EXAMPLE 6 (verified hard, "inference/main idea" — subtle "public norms vs private feelings" distinction):
Passage: "Social psychologist Betsy Levy Paluck has used radio dramas in post-genocide Rwanda to test how mass media can reshape intergroup relations. In one widely cited experiment, some villages received a serialized program whose storylines modeled cooperation between formerly hostile groups, while others received a health-themed program with no reconciliation content. Surveys and behavioral games suggested that the reconciliation drama did little to alter listeners' private feelings toward other groups, but it substantially shifted what they believed their neighbors considered acceptable, making public expressions of intolerance seem less normal. Paluck argues that policymakers who judge such interventions solely by whether they 'change hearts' risk missing their most immediate effect: the quiet redefinition of social rules that govern what people dare to say and do in public."
Prompt: "Based on the text, Paluck would most likely agree with which statement?"
Choices: ["Because her Rwandan radio experiment showed little movement in private attitudes, Paluck believes that policymakers should devote their resources to non-media strategies rather than relying on dramas to influence behavior.", "Unless a media program uproots listeners' long-standing prejudices, it cannot claim to have improved intergroup relations, no matter how much it shifts public expectations about what remarks are appropriate.", "A reconciliation campaign that leaves people's inner feelings unchanged may still matter if it quietly alters what they think their neighbors will tolerate saying or doing toward other groups in public.", "Lasting reconciliation, in Paluck's view, begins with transforming individuals' deepest convictions; changes in what people think counts as socially acceptable will follow naturally after those inner attitudes have been revised."]
Correct: "A reconciliation campaign that leaves people's inner feelings unchanged may still matter if it quietly alters what they think their neighbors will tolerate saying or doing toward other groups in public."
Why hard: the trap distractors A, B, and D each state a plausible-sounding position on media + reconciliation that a casual reader might attribute to Paluck. But the passage's explicit pivot ("Paluck argues that policymakers who judge... risk missing...") is that "changing hearts" is NOT the only measure — public norm shifts count independently. A and B condition value on private-attitude change; D reverses the causal direction. Only C matches the passage's "hearts unchanged, but public norms shifted, and that STILL matters" claim.`,
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

          `예시 3 (검증된 어려움, "글의 구조" — 최근 관점이 과거 관점을 재해석):
지문: "버지니아 울프의 1927년 소설 '등대로'를 읽는 독자들은 종종 짧은 중간 장 '시간이 흐르다'에서 멈춘다. 이 장은 스카이 섬에서의 한 여름을 다음 여름으로 뛰어넘으면서 램지 가족을 거의 언급하지 않는다. Times Literary Supplement 같은 초기 평론가들은 이 페이지들이 분위기적 삽입, 본래 이야기로의 복귀를 지연시키는 서술의 연장에 불과하다고 불평했다. 그러나 모더니즘 서사의 최근 비평가들은 '시간이 흐르다'를 소설 전체가 회전하는 경첩으로 다룬다. 그들은 전시의 죽음과 개인적 상실이 삽입절의 곁말로 처리되는 반면, 완전한 문장들은 빈 집에 머무르며 개인의 의식에서 비인격적 시간으로 초점을 이동시킨다고 지적한다. 이 해석에서 그 장은 소설의 구조를 방해하지 않는다 — 오히려 조용히 재배열한다."
문제: "글의 전체 구조를 가장 잘 설명하는 선택지는?"
보기: ["독자를 당혹시킨 등대로의 한 장을 지목하고, 이를 단순 삽입이라 일축한 초기 비평 관점을 제시한 뒤, 그 장을 구조적으로 중심에 두는 현대적 해석을 제시한다.", "버지니아 울프의 생애를 서술하고 등대로의 초기 및 최근 서평을 요약하여 소설에 대한 비평 의견이 시간에 따라 어떻게 변했는지 보여준다.", "등대로의 저평가된 한 장을 설명하고 그 서술의 언어를 자세히 검토한 뒤, 그 언어를 다른 모더니즘 소설의 구절과 비교한다.", "독자들이 부적절하다고 느낀 등대로의 한 장을 소개하고, 이를 단순 휴지로 본 초기 관점을 개괄한 뒤, 그 장이 소설 전체 설계에서 주변적이라고 주장한다."]
정답: "독자를 당혹시킨 등대로의 한 장을 지목하고, 이를 단순 삽입이라 일축한 초기 비평 관점을 제시한 뒤, 그 장을 구조적으로 중심에 두는 현대적 해석을 제시한다."
어려운 이유: 네 개 중 두 개가 초기 관점 부분은 맞지만, 마지막 이동(현대 재해석 = 구조적 핵심)까지 맞춘 것은 하나뿐. D는 마지막 입장을 정반대로 뒤집음. 흔한 템플릿 — 이 형태를 자주 복제: 대중적/초기 관점 → 학술적 재해석 → 새 관점이 왜 구조적으로 중심인가.`,

          `예시 4 (검증된 어려움, "글의 구조" — 경멸적 라벨 재해석):
지문: "대중의 상상 속에서 '러다이트'라는 용어는 기술 진보에 비합리적으로 반대하는 누구에게든 붙는 경멸어로 쓰인다. 그러나 역사학자 E.P. Thompson은 그의 획기적 저작 The Making of the English Working Class(1963)에서 19세기 직물 파괴자들의 정치적 합리성을 복원함으로써 이 캐리커처에 도전했다. Thompson은 러다이트들이 기술 공포증 때문이 아니라, 그들이 '사기적'이라 부른 노동 관행 — 임금 삭감이나 조악한 제품 생산 — 에 맞선 집단 교섭의 전략적 수단으로 기계를 공격했음을 입증했다. 그들의 폭력을 규제되지 않은 자본주의라는 맥락 안에 위치시킴으로써 Thompson은 이 운동을 초기의, 고도로 조직된 산업 노조주의의 표현으로 재분류했다."
문제: "글의 전체 구조를 가장 잘 설명하는 선택지는?"
보기: ["흔한 경멸적 라벨을 지적하고 그 라벨의 정확성에 도전하는 연구를 소개한 뒤, 그 집단의 행위가 결국 라벨의 타당성을 확인했다고 결론짓는다.", "일축적 라벨을 지목하고 그 라벨의 대상 집단에 대한 역사학자의 재해석을 제시한 뒤, 그들의 행위가 전략적으로 동기부여되었다는 그의 주장을 설명한다.", "19세기 직물 노동자의 노동 조건을 서술하고 그들이 공장주들에 대해 품었던 불만들을 열거한 뒤, 유사한 학대를 방지하기 위한 현대 입법을 촉구한다.", "역사학자의 문체를 칭찬하고 그의 가장 유명한 저작을 요약한 뒤, 일화적 증거에 지나치게 의존하는 그의 방법론을 비판한다."]
정답: "일축적 라벨을 지목하고 그 라벨의 대상 집단에 대한 역사학자의 재해석을 제시한 뒤, 그들의 행위가 전략적으로 동기부여되었다는 그의 주장을 설명한다."
어려운 이유: A는 "일축적 라벨 + 도전 연구"의 도입부는 같지만, 마지막 이동을 "라벨을 확인했다"로 뒤집음 — Thompson의 주장과 정반대. C와 D는 지문의 세부 하나(노동 조건; 역사학자의 문체)를 부풀려 전체 구조라고 주장. 함정 패턴: 올바른 형태의 도입 + 뒤집힌 결말.`,

          `예시 5 (검증된 어려움, "글 간 연결" — Text 2가 Text 1의 전제를 약화):
지문: "Text 1: 학자들은 오랫동안 후기 구석기 시대 들소와 말의 동굴 벽화를 공감 주술의 도구로 해석해 왔다. 바위 면에 동물의 이미지를 포착함으로써 초기 인류는 실제로 그 짐승을 제압할 수 있다고 믿었을 것으로 여겨진다. 지지자들은 대형 사냥감 종 — 생존에 필수적인 동물 — 에 압도적인 초점이 집중되어 있다는 사실이 이 예술이 성공적 사냥을 확보하려는 실용적 시도였음을 확인한다고 주장한다.

Text 2: 한 인지 고고학자는 이 기능적 설명이 설득력 없다고 본다. 그녀는 동굴 벽을 지배하는 종들이 화가들의 캠프파이어에서 발견된 동물 뼈와 대응하지 않는다고 지적한다 — 주요 식량원인 순록은 거의 그려지지 않는다. 그녀에게 예술의 위치가 깊고 공명이 강한 방들에 있다는 사실은 그것이 음향 의식이나 사회 의례의 배경으로 사용되었음을, 생계의 메뉴가 아님을 시사한다."
문제: "두 글에 근거할 때, Text 2의 저자는 Text 1의 '대형 사냥감에 대한 초점이 사냥 주술로서의 예술의 목적을 확인한다'는 주장에 어떻게 반응할 가능성이 가장 큰가?"
보기: ["예술이 사냥감 동물을 그린다는 데는 동의하겠지만, 그것이 미래 사냥에 영향을 주기 위해서가 아니라 과거 사냥 성공을 기념하기 위해서였다고 주장할 것이다.", "대형 사냥감에 대한 초점은 인정하겠지만, 순록 같은 주요 식량원이 예술에서 부재하다는 사실이 그림이 식량 확보를 위한 것이었다는 이론을 약화시킨다고 주장할 것이다.", "예술이 실용적 목적을 지녔음은 받아들이겠지만, 깊은 동굴 위치는 그것이 마법 의식이 아닌 식량 저장에 사용되었음을 시사한다고 주장할 것이다.", "동물에 대한 초점을 거부하며, 방들의 음향 공명이 그 장소 사용의 유일한 중요 요소였다고 주장할 것이다."]
정답: "대형 사냥감에 대한 초점은 인정하겠지만, 순록 같은 주요 식량원이 예술에서 부재하다는 사실이 그림이 식량 확보를 위한 것이었다는 이론을 약화시킨다고 주장할 것이다."
어려운 이유: DSAT 글 간 연결의 시그니처 이동. 오답들은 각각 Text 2의 사실 하나(과거 사냥 기념; 실용적; 음향 공명)를 담지만 Text 2가 지지하지 않는 입장에 연결. B만 실제 논리 이동을 포착: Text 1의 관찰(대형 사냥감 초점)을 인정하되 이를 반증(순록 부재)으로 전환. 글 간 연결의 정답은 거의 항상 "X는 인정하되, Y가 결론을 약화/복잡화한다"는 형태.`,

          `예시 6 (검증된 어려움, "추론/주장" — "공적 규범 vs 사적 감정"의 미묘한 구분):
지문: "사회심리학자 Betsy Levy Paluck는 대량 학살 이후 르완다에서 라디오 드라마를 사용해 대중 매체가 집단 간 관계를 어떻게 재편할 수 있는지 실험해 왔다. 널리 인용되는 한 실험에서, 일부 마을은 과거 적대적이었던 집단 간 협력을 모델링한 스토리라인의 연속 프로그램을 받았고, 다른 마을은 화해 내용 없는 건강 주제 프로그램을 받았다. 설문과 행동 게임은 화해 드라마가 청취자의 다른 집단에 대한 사적 감정을 거의 바꾸지 못했음을 시사했다 — 그러나 이웃들이 무엇을 용인한다고 믿는지는 실질적으로 이동시켰고, 공적으로 편협을 표현하는 것을 덜 정상적으로 보이게 만들었다. Paluck는 그러한 개입이 '마음을 바꾸는지'만으로 판단하는 정책 입안자들은 가장 즉각적인 효과를 놓칠 위험이 있다고 주장한다: 사람들이 공적으로 감히 말하고 행동하는 것을 지배하는 사회 규칙의 조용한 재정의."
문제: "글에 근거할 때, Paluck는 어느 진술에 가장 동의할 가능성이 큰가?"
보기: ["르완다 라디오 실험이 사적 태도에서 거의 이동을 보이지 않았기 때문에, Paluck는 정책 입안자들이 행동에 영향을 주기 위해 드라마에 의존하기보다 비-매체 전략에 자원을 투입해야 한다고 믿는다.", "매체 프로그램이 청취자의 오랜 편견을 뿌리 뽑지 않는 한, 공적 기대의 이동이 아무리 커도 집단 간 관계를 개선했다고 주장할 수 없다.", "사람들의 내면 감정을 바꾸지 못하는 화해 캠페인이라 하더라도, 이웃들이 다른 집단에 대해 공적으로 말하거나 행동하는 것을 어떻게 용인할지에 조용한 변화를 준다면 여전히 중요할 수 있다.", "Paluck의 관점에서 지속적 화해는 개인의 가장 깊은 신념을 변형시키는 것에서 시작한다 — 사회적으로 용인되는 것에 대한 사람들의 생각의 변화는 그러한 내면 태도가 수정된 후에 자연스럽게 따라올 것이다."]
정답: "사람들의 내면 감정을 바꾸지 못하는 화해 캠페인이라 하더라도, 이웃들이 다른 집단에 대해 공적으로 말하거나 행동하는 것을 어떻게 용인할지에 조용한 변화를 준다면 여전히 중요할 수 있다."
어려운 이유: 함정 오답 A, B, D는 각각 매체+화해에 대한 그럴듯한 입장을 진술하며 부주의한 독자가 Paluck에게 귀속시킬 수 있음. 그러나 지문의 명시적 전환("Paluck는 그러한 개입이... 판단하는 정책 입안자들은... 놓칠 위험")은 "마음 바꾸기"가 유일한 척도가 아니라는 점 — 공적 규범 이동은 독립적으로 중요. A와 B는 사적 태도 변화에 가치를 종속시킴; D는 인과 방향을 뒤집음. C만 "내면은 그대로지만 공적 규범은 이동, 그리고 그것이 여전히 중요"라는 지문의 주장과 일치.`,
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

          `EXAMPLE 3 (verified hard — quadratic discriminant condition, SPR):
Prompt: "In the equation 9x² + 8 = nx, n is a constant. The equation has exactly one solution. What is the value of n²/8?"
Answer: 36 (student-produced response — no choices)
Why hard: three abstractions required. (1) recognize "exactly one solution" means discriminant = 0. (2) rearrange 9x² + 8 = nx into standard form 9x² - nx + 8 = 0 (students frequently drop the sign flip on n). (3) apply discriminant: n² - 4(9)(8) = 0 → n² = 288 → n²/8 = 36. The final trap is returning n or n² instead of n²/8. SPR format eliminates guess-and-check via choices.`,

          `EXAMPLE 4 (verified hard — percentage chain, SPR):
Prompt: "The mass of object A is 444% of the mass of object B, and the mass of object A is 0.740% of the mass of object C. If the mass of object C is p% of the mass of object B, what is the value of p?"
Answer: 60000 (SPR)
Why hard: chained percentage translation with a decimal-percent detail. A = 4.44B and A = 0.00740C, so C = A/0.00740 = 4.44B/0.00740 = 600B. C is 600 TIMES B, therefore C is 60000% of B, so p = 60000. Common traps: (a) answering 600 (confusing "600 times" with "600 percent"), (b) answering 60 (dropping a factor of 10 in the decimal), (c) inverting B and C. Testing the p% = p/100 conversion is the whole point of the item.`,

          `EXAMPLE 5 (verified hard — polynomial factoring with substitution):
Prompt: "Which expression is a factor of y²(x - 3) - 25(x - 3)³?"
Choices: ["y(x - 3)", "(x - 5)(x - 3)", "y + x - 3", "y + 5x - 15"]
Correct: "y + 5x - 15"
Why hard: two-step factoring. (1) pull out common (x - 3) → (x - 3)[y² - 25(x - 3)²]. (2) recognize [y² - 25(x - 3)²] as a difference of squares with 5(x - 3) as the second term → (y - 5(x - 3))(y + 5(x - 3)) = (y - 5x + 15)(y + 5x - 15). Trap B "(x - 5)(x - 3)" is designed to catch students who see "25 = 5²" and force a false difference-of-squares on x. C and A are structural half-factorings that never distributed correctly. Distractors must encode step-1 or step-2 stopping errors, not random algebra.`,

          `EXAMPLE 6 (verified hard — circle + line system with sign constraint):
Prompt: "In the given system of equations, m and b are negative constants. In the xy-plane, the graphs of the equations intersect at the point (-5, y), where y < 0. Which expression represents the value of b?
   x² + y² = 36
   y = mx + b/4"
Choices: ["-5m/4 + √11/4", "5m/4 - √11/4", "-20m + 4√11", "20m - 4√11"]
Correct: "20m - 4√11"
Why hard: four steps + one sign-choice trap. (1) sub x = -5 into circle: 25 + y² = 36 → y² = 11 → y = ±√11. (2) the constraint y < 0 forces y = -√11 — students who default to the positive root fail here. (3) sub into line: -√11 = -5m + b/4. (4) solve for b (NOT m): b = 4(-√11 + 5m) = 20m - 4√11. Distractor A solves for m instead of b. Distractor C sign-flips step 4. Distractor B uses y = +√11. The item tests parameter-in-a-conic-system + sign-branch-selection simultaneously — the exact Module 2 hard-shape for Advanced Math.`,

          `EXAMPLE 7 (verified hard — similar figures, area/perimeter ratio):
Prompt: "The table gives the areas and perimeters of two similar rectangles, where n is a constant.
   Rectangle A: Area = 630 sq in, Perimeter = 210 in
   Rectangle B: Area = 2520 sq in, Perimeter = n in
What is the value of n?"
Choices: ["2100", "1680", "840", "420"]
Correct: "420"
Why hard: the signature similar-figures trap. Area ratio B:A = 2520/630 = 4, so linear scale factor = √4 = 2 (NOT 4). Perimeter scales with the linear factor, so n = 2 × 210 = 420. Distractor C "840" is EXACTLY the trap answer for students who apply the area ratio (4) directly to the perimeter (4 × 210 = 840). Distractor A "2100" = perimeter × area-ratio-times-fudge. Only one distractor pair separates correct from careless — that's the diagnostic power. Every DSAT similar-figures hard item pivots on this "linear factor = √(area ratio)" step.`,
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

          `예시 3 (검증된 어려움 — 이차방정식 판별식 조건, SPR):
문제: "방정식 9x² + 8 = nx에서 n은 상수이다. 이 방정식이 해를 정확히 하나 가진다면, n²/8의 값은?"
정답: 36 (학생 단답형)
어려운 이유: 세 단계의 추상화 필요. (1) "해가 정확히 하나"는 판별식 = 0. (2) 9x² + 8 = nx를 표준형 9x² - nx + 8 = 0으로 정리(학생들은 n의 부호 반전을 자주 놓침). (3) 판별식: n² - 4(9)(8) = 0 → n² = 288 → n²/8 = 36. 최종 함정은 n 또는 n²을 답하는 것 — 문제는 n²/8을 물음. SPR 형식이라 선택지로 역산하는 것도 불가.`,

          `예시 4 (검증된 어려움 — 백분율 연쇄, SPR):
문제: "물체 A의 질량은 물체 B 질량의 444%이고, 물체 A의 질량은 물체 C 질량의 0.740%이다. 물체 C의 질량이 물체 B 질량의 p%라면, p의 값은?"
정답: 60000 (SPR)
어려운 이유: 소수 백분율 세부까지 포함된 백분율 번역 연쇄. A = 4.44B, A = 0.00740C → C = A/0.00740 = 4.44B/0.00740 = 600B. C는 B의 600배이므로 60000%. 따라서 p = 60000. 흔한 함정: (a) 600으로 답(600배 = 600%로 착각), (b) 60으로 답(소수 자리에서 10 누락), (c) B와 C를 뒤바꿈. p%의 p/100 변환을 시험하는 것이 문항의 핵심.`,

          `예시 5 (검증된 어려움 — 치환을 이용한 다항식 인수분해):
문제: "y²(x - 3) - 25(x - 3)³의 인수는?"
보기: ["y(x - 3)", "(x - 5)(x - 3)", "y + x - 3", "y + 5x - 15"]
정답: "y + 5x - 15"
어려운 이유: 2단계 인수분해. (1) 공통 인수 (x - 3)을 뽑아내 (x - 3)[y² - 25(x - 3)²]. (2) [y² - 25(x - 3)²]을 5(x - 3)을 둘째 항으로 하는 제곱의 차로 인식 → (y - 5(x - 3))(y + 5(x - 3)) = (y - 5x + 15)(y + 5x - 15). 함정 B "(x - 5)(x - 3)"은 "25 = 5²"을 보고 x에 대한 가짜 제곱의 차를 강행하는 학생을 잡음. C와 A는 분배가 잘못된 중간 단계 형태. 함정은 1단계나 2단계에서 멈추는 오류를 반영해야 함.`,

          `예시 6 (검증된 어려움 — 원 + 직선 연립, 부호 제약):
문제: "주어진 연립방정식에서 m과 b는 음수 상수. xy평면에서 두 방정식의 그래프가 (-5, y)에서 만나며 y < 0. b의 값을 나타내는 식은?
   x² + y² = 36
   y = mx + b/4"
보기: ["-5m/4 + √11/4", "5m/4 - √11/4", "-20m + 4√11", "20m - 4√11"]
정답: "20m - 4√11"
어려운 이유: 4단계 + 부호 선택 함정. (1) 원에 x = -5 대입: 25 + y² = 36 → y² = 11 → y = ±√11. (2) 제약 y < 0이 y = -√11로 강제 — 양의 근을 반사적으로 택하는 학생이 여기서 실패. (3) 직선에 대입: -√11 = -5m + b/4. (4) b(m이 아님)에 대해 풀기: b = 4(-√11 + 5m) = 20m - 4√11. 함정 A는 b가 아닌 m에 대해 풀이. C는 4단계 부호 반전. B는 y = +√11 사용. 이차곡선 연립의 매개변수 + 부호 분기 선택을 동시에 시험 — Advanced Math 모듈 2 어려운 문항의 정확한 형태.`,

          `예시 7 (검증된 어려움 — 닮은 도형, 넓이/둘레 비):
문제: "표는 두 닮은 직사각형의 넓이와 둘레를 나타내며, n은 상수.
   직사각형 A: 넓이 = 630 제곱인치, 둘레 = 210인치
   직사각형 B: 넓이 = 2520 제곱인치, 둘레 = n인치
n의 값은?"
보기: ["2100", "1680", "840", "420"]
정답: "420"
어려운 이유: 닮은 도형의 시그니처 함정. 넓이 비 B:A = 2520/630 = 4이므로 길이 비 = √4 = 2 (4가 아님). 둘레는 길이 비로 스케일되므로 n = 2 × 210 = 420. 함정 C "840"은 넓이 비(4)를 둘레에 그대로 적용한 부주의한 학생의 정확한 답(4 × 210 = 840). A "2100"은 둘레 × 넓이 비 계열의 착각. 오답이 정답과 한 걸음 차이라 판별력이 큼. 모든 DSAT 닮은 도형 어려운 문항은 "길이 비 = √(넓이 비)" 단계에서 갈림.`,
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
    display: 'TOEFL iBT (January 2026 format)',
    framing_en: 'ETS\'s TOEFL iBT, January 2026 redesign. Used for US/Canada/UK university admission. ~2 hours total. Reading and Listening sections now mix 3 distinct task types each; Writing has 3 task types; Speaking has 2. Score scale 0-120 (0-30 per section).',
    framing_ko: 'ETS의 TOEFL iBT — 2026년 1월 개편. 미국·캐나다·영국 대학 입학에 사용. 총 약 2시간. 리딩·리스닝 각각 3가지 과제 유형 혼합, 라이팅 3유형, 스피킹 2유형. 점수 0-120(섹션당 0-30).',
    sections: [
      {
        name_en: 'Reading',
        name_ko: '리딩',
        // ETS Jan 21, 2026 spec: up to 50 questions in ~30 minutes,
        // spread across 2 adaptive modules. We don't run the adaptive
        // router yet (#189) so the practice generates the full 50-Q
        // module worth in one shot.
        questionsPerSection: 50,
        minutesPerSection: 30,
        choiceCount: 4,
        patterns_en: 'JANUARY 2026 FORMAT — a Reading module mixes TWO multiple-choice task types (we DO NOT generate the third type, Complete-the-Words fill-in-letters, in this MC pipeline). Generate items in this mix per 20-question module:\n  • TASK A — "Read in Daily Life" (40% of items): 4-7 short, non-academic visual texts (a campus notice, a club flyer, a social-media post, an email, a job ad, a course-registration page). Each text is 40-90 words, written in plain everyday register. Render the text plainly inside the prompt (no images). 2-3 MC comprehension questions per text: literal detail ("What time does the event start?"), purpose ("Why was this notice posted?"), inference about the writer\'s situation, or what a recipient should do next.\n  • TASK B — "Read an Academic Passage" (60% of items): SHORT academic passages, 150-180 words each (NOT 700 like the legacy iBT). One passage feeds 5 questions: (1) main idea, (2) vocabulary in context, (3) factual detail, (4) negative factual (EXCEPT/NOT), (5) rhetorical purpose OR inference. Topics: intro-level biology, art history, psychology, geology, business, linguistics — accessible to a first-year undergraduate.\nMark each item with a brief tag in the prompt so the student knows the task type (e.g., "[Daily Life — Campus notice]" or "[Academic — Biology]"). Do NOT generate "insert sentence" or "prose summary" items — those are legacy iBT formats removed in the redesign.',
        patterns_ko: '2026년 1월 형식 — 리딩 모듈은 두 가지 객관식 과제를 혼합합니다 (세 번째 유형인 "단어 완성" 빈칸 채우기는 이 MC 파이프라인에서 생성하지 않음). 20문항 모듈 기준 비율:\n  • 과제 A — "일상 속 읽기" (40%): 학술이 아닌 짧은 시각 텍스트(캠퍼스 공지, 동아리 전단, SNS 게시물, 이메일, 구인 광고, 수강신청 페이지) 4-7개. 각 텍스트 40-90단어, 일상 어투. 텍스트는 프롬프트에 평문으로 렌더링(이미지 없음). 텍스트당 2-3 MC 문항: 사실 세부("행사 몇 시 시작?"), 목적("왜 이 공지가 올라왔는가?"), 작성자 상황 추론, 수신자가 다음에 할 행동.\n  • 과제 B — "학술 지문" (60%): 짧은 학술 지문, 각 150-180단어 (옛 iBT의 700단어가 아님). 지문 1개당 5문항: (1) 주제, (2) 문맥 어휘, (3) 사실 세부, (4) 부정 사실(EXCEPT/NOT), (5) 수사 목적 또는 추론. 주제: 입문 생물·미술사·심리·지질·경영·언어학 — 학부 1학년 수준.\n프롬프트 첫머리에 과제 유형 태그 부여(예: "[일상 — 캠퍼스 공지]" 또는 "[학술 — 생물학]"). "문장 삽입"·"산문 요약"은 개편으로 폐지된 옛 형식이므로 생성 금지.',
        distractorPatterns_en: 'For Daily Life items: (1) right time/place from a different line in the same notice, (2) action the writer rejected, (3) plausible but never stated. For Academic items: (1) information from a different sentence in the passage, (2) restated using a synonym but with a key qualifier omitted, (3) plausibly true in general knowledge but contradicts the passage\'s specific claim, (4) for negative-factual: 3 choices paraphrase real passage statements, the wrong one is the never-mentioned option.',
        distractorPatterns_ko: '일상 문항: (1) 같은 공지의 다른 줄에서 가져온 시간/장소, (2) 작성자가 거부한 행동, (3) 그럴듯하지만 명시 없음. 학술 문항: (1) 지문 다른 문장의 정보, (2) 동의어로 바꿨지만 핵심 한정사가 빠짐, (3) 일반 상식으로는 맞지만 지문의 특정 주장과 모순, (4) 부정 사실의 경우: 3개 보기는 실제 지문 진술의 패러프레이즈, 오답이 언급되지 않은 선택지.',
        hardItemFraming_en: 'A HARD Jan-2026 TOEFL Reading item is: (a) a Daily Life inference where the answer depends on a SUBTLE register cue (irony, polite refusal, hedge) rather than the literal words; (b) an Academic INFERENCE where the correct answer requires connecting two distant sentences AND none of the choices is a direct restatement; (c) an Academic NEGATIVE FACTUAL where 3 choices are paraphrases of separate passage statements and the wrong choice is the never-mentioned one; (d) an Academic VOCABULARY item where the tested word has a common everyday meaning that is WRONG in this academic context. AVOID: bare factual questions solvable by keyword matching.',
        hardItemFraming_ko: '어려운 2026 TOEFL Reading 문항: (a) 일상 추론 — 정답이 문자 그대로가 아니라 미묘한 어조 단서(아이러니·완곡 거절·헤지)에 달림; (b) 학술 추론 — 정답이 두 개의 떨어진 문장을 연결해야 하고 보기 중 어느 것도 직접 재진술이 아님; (c) 학술 부정 사실 — 3개 보기는 별개 문장의 패러프레이즈, 오답이 언급되지 않은 것; (d) 학술 어휘 — 평범한 일상 의미가 이 학술 맥락에서는 오답인 단어. 피할 것: 키워드 매칭으로 풀리는 단순 사실 문항.',
        hardItemExamples_en: [
          `EXAMPLE 1 (HARD — Daily Life register/inference trap, Jan 2026 style):
Prompt: "[Daily Life — Email]
From: Prof. Reyes
To: Jamie Park
Subject: Re: Extension request

Jamie — I appreciate you letting me know about the family situation. I'm willing to consider an extension, but only if you can show me a draft of the introduction and at least one body paragraph by Friday. That gives me confidence the rest will follow. Let me know.
— J. Reyes

What does Prof. Reyes mean by 'I'm willing to consider an extension'?"
Choices: ["She has already approved the extension.", "She will grant the extension only after seeing partial work.", "She is refusing the extension but politely.", "She is asking Jamie to find another professor."]
Correct: "She will grant the extension only after seeing partial work."
Why hard: Choice 1 misreads 'willing to consider' as 'has approved' — a common L2 register trap. Choice 3 is wrong because the email lists explicit conditions, not a polite refusal. Choice 4 invents a request never made. The student must read the conditional ('only if you can show me…') to see it's a conditional yes.`,
          `EXAMPLE 2 (HARD — Academic negative-factual, Jan 2026 short-passage style):
Passage (160 words): "Coral reefs are among the most biodiverse marine ecosystems, supporting roughly a quarter of all ocean species despite covering less than one percent of the seafloor. Their architecture is built by tiny animals called polyps, which secrete calcium carbonate skeletons over thousands of years. The polyps themselves get most of their energy from photosynthetic algae called zooxanthellae that live inside their tissues — a partnership called symbiosis. When ocean temperatures rise even slightly above the polyps' tolerance, the algae are expelled. The coral turns white, a phenomenon called bleaching, and although the polyps can survive briefly without their algal partners, prolonged bleaching usually leads to colony death. Recovery is possible if temperatures fall quickly enough, but the recovery window narrows as bleaching events occur more frequently. Recent decades have seen mass bleaching events on a scale never previously documented, raising urgent questions about whether reef ecosystems can persist under projected warming."
Prompt: "[Academic — Biology] According to the passage, all of the following are true of coral reefs EXCEPT:"
Choices: ["They contain about 25% of marine species.", "Their structure is built by polyps over long timescales.", "Polyps obtain energy mainly through hunting small fish.", "Recovery from bleaching depends on rapid cooling."]
Correct: "Polyps obtain energy mainly through hunting small fish."
Why hard: Choices 1, 2, 4 are direct paraphrases of three different sentences. The wrong choice contradicts the passage (polyps get energy from algal symbionts, not hunting). The trap is that 'hunting' sounds biologically plausible but is never stated.`,
          `EXAMPLE 3 (HARD — Academic vocabulary in context, Jan 2026 style):
Passage excerpt: "...The early Impressionists were initially DISMISSED by the official Paris Salon, whose juries favored polished historical scenes over loose brushwork and outdoor light. Within two decades, however, the same critics who had ridiculed Monet and Pissarro were praising them as masters."
Prompt: "[Academic — Art History] As used in the passage, the word 'dismissed' is closest in meaning to:"
Choices: ["fired from a position", "rejected as unimportant", "sent away politely", "translated to another setting"]
Correct: "rejected as unimportant"
Why hard: 'Dismissed' has a common everyday meaning (Choice 1: 'fired') that is WRONG here. The academic context — official Salon juries, ridicule, later reversal — requires the 'rejected as unworthy of serious attention' sense. Tests register-sensitive vocabulary, not dictionary-first matching.`,
        ],
        hardItemExamples_ko: [
          `예시 1 (어려움 — 일상 어조/추론 함정, 2026년 1월 스타일):
프롬프트: "[일상 — 이메일]
보낸 사람: Reyes 교수
받는 사람: Jamie Park
제목: Re: 마감 연장 요청

Jamie — 가족 상황을 알려줘서 고마워요. 연장을 고려할 의향은 있지만, 금요일까지 서론과 본문 한 단락의 초안을 보여줘야만 합니다. 그래야 나머지도 따라올 거라는 확신이 들거든요. 의견 알려주세요.
— J. Reyes

Reyes 교수가 '연장을 고려할 의향이 있다'고 한 것은 무슨 뜻인가?"
보기: ["이미 연장을 승인했다.", "부분 작업을 본 후에만 연장을 승인할 것이다.", "정중하게 연장을 거절하고 있다.", "Jamie에게 다른 교수를 찾으라고 요청하고 있다."]
정답: "부분 작업을 본 후에만 연장을 승인할 것이다."
어려운 이유: 보기 1은 'willing to consider'를 'has approved'로 오독 — 흔한 L2 어조 함정. 보기 3은 정중한 거절이 아니라 명시적 조건을 제시했으므로 오답. 보기 4는 존재하지 않는 요청. 학생은 조건절('금요일까지 보여주면')을 읽어 '조건부 승낙'임을 파악해야 함.`,
          `예시 2 (어려움 — 학술 부정 사실, 2026년 1월 짧은 지문 스타일):
지문 (160단어): "산호초는 해저 면적의 1% 미만을 차지하지만 해양 종의 약 4분의 1을 부양하는 가장 생물다양성이 풍부한 해양 생태계 중 하나다. 그 구조는 폴립이라 불리는 작은 동물들이 수천 년에 걸쳐 분비한 탄산칼슘 골격으로 만들어진다. 폴립 자체는 조직 내부에 사는 황록공생조류라는 광합성 조류로부터 에너지의 대부분을 얻는데, 이를 공생이라 한다. 해수 온도가 폴립의 내성을 조금만 초과해도 조류가 방출된다. 산호는 하얗게 변하며 이를 백화 현상이라 하고, 폴립은 조류 동반자 없이 잠시 생존할 수 있으나 장기 백화는 보통 군체 사멸로 이어진다. 온도가 충분히 빨리 떨어지면 회복이 가능하지만, 백화 사건이 빈번해질수록 회복 창은 좁아진다. 최근 수십 년간 전례 없는 규모의 대규모 백화가 나타나, 예상되는 온난화 하에서 산호초 생태계가 존속할 수 있는지에 대한 시급한 의문을 제기하고 있다."
프롬프트: "[학술 — 생물학] 지문에 따르면, 산호초에 대해 다음 모두가 사실이나 그 예외는?"
보기: ["해양 종의 약 25%를 포함한다.", "구조는 폴립이 오랜 기간에 걸쳐 만든다.", "폴립은 주로 작은 물고기 사냥으로 에너지를 얻는다.", "백화로부터의 회복은 빠른 냉각에 달려 있다."]
정답: "폴립은 주로 작은 물고기 사냥으로 에너지를 얻는다."
어려운 이유: 보기 1·2·4는 세 다른 문장의 직접 패러프레이즈. 오답은 지문과 모순(폴립은 사냥이 아닌 조류 공생으로 에너지 얻음). 함정은 '사냥'이 생물학적으로 그럴듯하지만 언급된 적 없음.`,
          `예시 3 (어려움 — 학술 문맥 어휘, 2026년 1월 스타일):
지문 발췌: "...초기 인상주의자들은 처음에 공식 파리 살롱에 의해 dismissed되었는데, 그 심사위원들은 느슨한 붓터치와 야외 빛보다 다듬어진 역사적 장면을 선호했다. 그러나 20년이 채 안 되어 모네와 피사로를 조롱했던 바로 그 비평가들이 그들을 거장으로 칭송하고 있었다."
프롬프트: "[학술 — 미술사] 지문에서 쓰인 'dismissed'와 가장 가까운 의미는?"
보기: ["직위에서 해고되다", "중요하지 않다고 거부되다", "정중하게 보내지다", "다른 환경으로 옮겨지다"]
정답: "중요하지 않다고 거부되다"
어려운 이유: 'Dismissed'에는 흔한 일상 의미(보기 1: '해고')가 있으나 여기서는 오답. 학술 맥락 — 공식 살롱 심사·조롱·후일의 반전 — 은 '진지한 주목을 받을 가치 없다고 배척되다'의 의미를 요구. 사전 1번 의미가 아닌 어조 민감 어휘 평가.`,
        ],
      },
      {
        name_en: 'Listening',
        name_ko: '리스닝',
        // ETS Jan 21, 2026 spec: up to 47 questions in ~29 minutes,
        // spread across 2 adaptive modules. ETS lists 4 task types —
        // we split "announcements" and "academic talks" into separate
        // tasks (was one bundled task in the previous draft).
        questionsPerSection: 47,
        minutesPerSection: 29,
        choiceCount: 4,
        patterns_en: 'JANUARY 2026 FORMAT — a Listening module mixes FOUR task types. Without audio playback in our app, render every transcript inline in the prompt (label it "Transcript:") so the student reads what they would have heard, then ask the question. Per 47-question module, approximate distribution:\n  • TASK A — "Listen and Choose a Response" (~21 items, 45%): A single utterance (a question, statement, or short request) is read aloud. The student picks the most natural conversational reply. Transcript = ONE short line of 8-25 words from one speaker (e.g., "I can\'t believe how heavy this box is — can you give me a hand?"). 4 choices, each a plausible spoken reply; the correct one is the most natural register/function match. Topics: everyday campus, work, travel, social.\n  • TASK B — "Listen to a Conversation" (~10 items, 21%): A short 8-12 turn dialogue (~150-220 words total) between 2 speakers — student↔advisor, student↔librarian, roommates, professor↔student during office hours. 2-3 MC questions per conversation: gist, detail, function ("Why does the man say X?"), attitude.\n  • TASK C — "Listen to an Announcement" (~8 items, 17%): A short announcement (~120-180 words: campus PA, transit, museum, library, residence hall, dining hall). 2-3 MC per announcement: purpose, key detail, what a listener should do next, inference about the announcer\'s situation.\n  • TASK D — "Listen to an Academic Talk" (~8 items, 17%): A short academic mini-lecture (~180-260 words) on intro-level biology, history, psychology, business, geology, linguistics. 2-3 MC per talk: main idea, key detail, speaker purpose, inference connecting two distant points.\nMark each item\'s prompt with a tag like "[Choose a Response]", "[Conversation — Office hours]", "[Announcement — Campus PA]", or "[Academic Talk — Biology]" so the student knows the task type.',
        patterns_ko: '2026년 1월 형식 — 리스닝 모듈은 네 가지 과제 혼합. 앱에 오디오 재생이 없으므로 모든 전사를 프롬프트 내부에 "Transcript:"로 명시 후 문항 제시. 47문항 모듈 기준 분포:\n  • 과제 A — "듣고 응답 고르기" (약 21문항, 45%): 한 화자가 짧은 한 줄(질문·진술·요청, 8-25단어)을 말하면 가장 자연스러운 응답을 선택. 보기 4개 모두 그럴듯한 구어 응답, 정답은 어조·기능이 가장 잘 맞는 것. 주제: 일상 캠퍼스·직장·여행·사교.\n  • 과제 B — "대화 듣기" (약 10문항, 21%): 두 화자의 짧은 8-12턴 대화(총 150-220단어) — 학생↔조언자, 학생↔사서, 룸메이트, 교수 상담. 대화당 2-3 MC: 요지, 세부, 기능, 태도.\n  • 과제 C — "공지 듣기" (약 8문항, 17%): 짧은 공지(120-180단어: 캠퍼스 안내방송·교통·박물관·도서관·기숙사·식당). 공지당 2-3 MC: 목적, 핵심 세부, 청자의 다음 행동, 안내자 상황 추론.\n  • 과제 D — "학술 강의 듣기" (약 8문항, 17%): 짧은 학술 미니 강의(180-260단어, 입문 생물·역사·심리·경영·지질·언어학). 강의당 2-3 MC: 주제, 핵심 세부, 화자 목적, 떨어진 두 지점 연결 추론.\n프롬프트에 과제 태그 부여: "[응답 고르기]", "[대화 — 교수 상담]", "[공지 — 캠퍼스]", "[학술 강의 — 생물학]" 등.',
        distractorPatterns_en: 'Choose-a-Response distractors: (1) literal keyword echo from the prompt but wrong function (answers a different question type), (2) plausible reply but wrong register (too formal/casual for the cue), (3) reply that ignores a key qualifier in the prompt. Conversation/lecture distractors: (1) restates a detail the speaker mentions but it wasn\'t the question\'s focus, (2) true in general academic knowledge but contradicts the speaker\'s specific claim, (3) confuses what one speaker said with the other.',
        distractorPatterns_ko: '응답 고르기 오답: (1) 자극의 키워드를 그대로 받지만 기능이 틀림(다른 유형의 질문에 답함), (2) 그럴듯하지만 어조가 안 맞음(너무 격식·너무 일상), (3) 자극의 핵심 한정사를 무시한 응답. 대화·강의 오답: (1) 화자가 언급한 세부지만 문제의 초점이 아님, (2) 일반 상식에는 맞지만 화자의 특정 주장과 모순, (3) 한 화자의 말을 다른 화자의 말로 혼동.',
        hardItemFraming_en: 'A HARD Jan-2026 TOEFL Listening item is: (a) a Choose-a-Response where the cue is an INDIRECT speech act (a hedge / polite refusal / suggestion-as-question) and the correct reply requires register/pragmatic inference, not lexical matching; (b) a Conversation question on SPEAKER STANCE or FUNCTION ("Why does she say X?") where the answer depends on what one speaker is doing pragmatically with a line, not its literal content; (c) a Lecture INFERENCE item where the answer combines two non-adjacent points in the transcript AND a distractor restates something the lecturer said but that doesn\'t answer the question. AVOID: bare "what time / where / who" detail questions answerable by transcript skim.',
        hardItemFraming_ko: '어려운 2026 TOEFL Listening 문항: (a) 응답 고르기에서 자극이 간접 발화행위(완곡 거절·제안 형태 질문·헤지)이고 정답은 어휘 매칭이 아니라 어조·화용 추론으로 도출; (b) 대화에서 화자 입장 또는 기능 문항("왜 그렇게 말했는가?") — 답은 그 말의 글자 의미가 아니라 화자가 화용적으로 무엇을 하는지에 달림; (c) 강의 추론 — 답이 전사에서 인접하지 않은 두 지점을 결합하고, 오답 하나는 강사가 실제로 말했지만 질문에 답하지 않는 내용을 재진술. 피할 것: 전사를 훑어 풀리는 단순 시간·장소·인물 세부 문항.',
        hardItemExamples_en: [
          `EXAMPLE 1 (HARD — Choose-a-Response, indirect refusal):
Prompt: "[Choose a Response] Transcript: \\"I'd love to join the study group on Thursday, but I'm not sure my schedule is going to cooperate this week.\\"\\n\\nWhich is the most natural reply?"
Choices: ["Great, see you Thursday!", "No problem — we can fill you in afterward if you can't make it.", "Why don't you cancel your other plans?", "Thursday is a great day for studying."]
Correct: "No problem — we can fill you in afterward if you can't make it."
Why hard: The speaker is hedging — "I'd love to" + "schedule…not going to cooperate" is a polite no, not a yes. Choice 1 reads "I'd love to" literally; choice 3 ignores the politeness norm; choice 4 keyword-echoes "Thursday" with no function fit. Only choice 2 recognises the indirect refusal and offers a face-saving response.`,
          `EXAMPLE 2 (HARD — Conversation function question):
Passage (Transcript, ~150 words, office hours):
"PROFESSOR: So, you're thinking about switching from Biology to Environmental Science?
STUDENT: Yeah, I mean, I love bio, but the lab requirements are killing my schedule.
PROFESSOR: Hmm. You know, the environmental program has its own lab sequence. It's not exactly a walk in the park.
STUDENT: Oh, I assumed it would be lighter.
PROFESSOR: Some of the field courses meet on weekends. Have you looked at the curriculum sheet?
STUDENT: …Not in detail, no.
PROFESSOR: Why don't you take it home, read it carefully, and we can talk again next week?"
Prompt: "[Conversation — Office hours] Why does the professor say 'It's not exactly a walk in the park'?"
Choices: ["To brag about the rigor of her program", "To gently correct the student's incorrect assumption", "To discourage the student from switching majors entirely", "To recommend that the student take more difficult classes"]
Correct: "To gently correct the student's incorrect assumption"
Why hard: Tests pragmatic function, not literal meaning. The student's "I assumed it would be lighter" is the antecedent — the professor's idiom flags this assumption as wrong. Choice 1 misreads tone (professor is not bragging). Choice 3 overreads — she's correcting, not discouraging. Choice 4 confuses the function entirely. Students who only catch the literal idiom miss the inferential link.`,
          `EXAMPLE 3 (HARD — Lecture inference combining two points):
Passage (Transcript excerpt, ~200 words, intro biology):
"...Now, most people think that animals migrate to escape cold weather. And for many birds, that's true. But consider the Arctic tern. The Arctic tern flies from the Arctic to the Antarctic and back every year — roughly forty thousand kilometres. Now, both poles are cold, so escaping cold can't be the whole story. What the tern is actually chasing is daylight. By migrating between the two summers, the tern experiences more daylight per year than any other animal. And more daylight means more time to feed on the surface-feeding fish that come up to eat plankton in the lit water column. So when you see migration in the textbook framed purely as a temperature response, keep the tern in mind — for some species, the real driver is access to food, mediated by light..."
Prompt: "[Lecture — Biology] What can be inferred about animal migration patterns from the example of the Arctic tern?"
Choices: ["All long-distance migrants are chasing daylight rather than temperature.", "Migration motivations can be more complex than simple temperature avoidance.", "Arctic terns are unique in choosing daylight over warmth.", "Birds that fly long distances always feed on plankton-eating fish."]
Correct: "Migration motivations can be more complex than simple temperature avoidance."
Why hard: The correct answer requires combining two distant claims (1) "escaping cold can't be the whole story" + (2) "for some species, the real driver is access to food, mediated by light" — and generalising appropriately. Choice 1 overgeneralises to "all migrants"; choice 3 misreads "any other animal" as "unique in choosing daylight" (the lecture doesn't say no other species does this — only that the tern gets the most); choice 4 picks up plankton-fish details but inverts the implication. Tests the cap of "the lecture said X about THIS species" vs "the lecture implies X about migration broadly".`,
        ],
        hardItemExamples_ko: [
          `예시 1 (어려움 — 응답 고르기, 간접 거절):
프롬프트: "[응답 고르기] Transcript: \\"이번 주 목요일 스터디 그룹에 정말 가고 싶은데, 내 일정이 잘 맞을지 모르겠어.\\"\\n\\n가장 자연스러운 응답은?"
보기: ["좋아, 목요일에 보자!", "괜찮아 — 못 오면 나중에 정리해서 알려줄게.", "다른 일정을 취소하지 그래?", "목요일은 공부하기 정말 좋은 날이지."]
정답: "괜찮아 — 못 오면 나중에 정리해서 알려줄게."
어려운 이유: 화자가 헤지 — "정말 가고 싶은데" + "일정이 안 맞을지도" 는 정중한 거절이지 승낙이 아님. 보기 1은 "가고 싶다"를 글자 그대로 읽음; 보기 3은 정중함 규범 무시; 보기 4는 "목요일"이라는 키워드만 받고 기능이 안 맞음. 보기 2만 간접 거절을 인식하고 체면을 살려주는 응답.`,
          `예시 2 (어려움 — 대화 기능 문항):
지문 (Transcript, 약 150단어, 교수 상담):
"교수: 생물학에서 환경과학으로 바꿀까 생각 중이라고요?
학생: 네, 생물학은 좋아하는데 실험 요건이 시간을 너무 잡아먹어서요.
교수: 음. 환경과학 프로그램도 자체 실험 시퀀스가 있어요. 그게 만만한 건 아니에요.
학생: 아, 더 가벼울 거라고 가정했는데요.
교수: 일부 현장 수업은 주말에 만나요. 커리큘럼 시트 봤어요?
학생: …자세히는 아니요.
교수: 가져가서 꼼꼼히 읽어보고, 다음 주에 다시 얘기할까요?"
프롬프트: "[대화 — 교수 상담] 교수가 '그게 만만한 건 아니에요'라고 말한 이유는?"
보기: ["자신의 프로그램의 엄격함을 자랑하려고", "학생의 잘못된 가정을 부드럽게 바로잡으려고", "학생이 전공을 바꾸지 않도록 완전히 단념시키려고", "학생에게 더 어려운 수업을 들으라고 권하려고"]
정답: "학생의 잘못된 가정을 부드럽게 바로잡으려고"
어려운 이유: 글자 의미가 아닌 화용적 기능 평가. 학생의 "더 가벼울 거라 가정했는데요"가 선행 — 교수의 관용구가 이 가정을 잘못이라고 표시. 보기 1은 어조 오독(자랑 아님). 보기 3은 과독 — 바로잡지 단념시키는 것이 아님. 보기 4는 기능을 완전히 혼동. 글자 관용구만 잡으면 추론 연결을 놓침.`,
          `예시 3 (어려움 — 강의 추론, 두 지점 결합):
지문 (Transcript 발췌, 약 200단어, 입문 생물학):
"...대부분의 사람들은 동물이 추위를 피하려 이주한다고 생각합니다. 많은 새의 경우 사실이죠. 하지만 북극제비갈매기를 생각해보세요. 이 새는 매년 북극에서 남극까지 갔다가 돌아옵니다 — 약 4만 킬로미터. 두 극 모두 춥기 때문에 추위 회피만으로는 설명이 안 됩니다. 제비갈매기가 실제로 쫓는 건 햇빛입니다. 두 여름 사이를 이주함으로써, 어떤 동물보다도 더 많은 일조량을 경험합니다. 그리고 더 많은 햇빛은 빛이 든 수층에 떠올라 플랑크톤을 먹는 표층 어류를 사냥할 시간이 더 많아진다는 뜻이죠. 그래서 교과서가 이주를 순전히 온도 반응으로 그릴 때 제비갈매기를 떠올리세요 — 일부 종에게 진짜 동인은 빛이 매개하는 먹이 접근이니까요..."
프롬프트: "[강의 — 생물학] 북극제비갈매기의 예시에서 동물 이주 패턴에 대해 추론할 수 있는 것은?"
보기: ["모든 장거리 이주자는 온도가 아닌 햇빛을 쫓는다.", "이주 동기는 단순한 온도 회피보다 복잡할 수 있다.", "북극제비갈매기는 따뜻함 대신 햇빛을 선택하는 유일한 종이다.", "장거리 비행하는 새는 항상 플랑크톤을 먹는 어류를 사냥한다."]
정답: "이주 동기는 단순한 온도 회피보다 복잡할 수 있다."
어려운 이유: 정답은 두 떨어진 주장 결합 (1) "추위 회피만으로 설명 안 됨" + (2) "일부 종에게 진짜 동인은 빛 매개 먹이 접근" — 적절히 일반화. 보기 1은 "모든 이주자"로 과일반화; 보기 3은 "어떤 동물보다 더 많이"를 "유일하게 선택"으로 오독(강의는 다른 종이 그렇지 않다고 말한 적 없음 — 단지 제비갈매기가 가장 많다고만); 보기 4는 플랑크톤 세부를 잡지만 함의를 뒤집음. "강의가 이 종에 대해 X라 말함" vs "강의가 이주 전반에 대해 X를 함의함"의 한도 평가.`,
        ],
      },
      {
        name_en: 'Speaking',
        name_ko: '스피킹',
        // ETS Jan 21, 2026 spec: 11 questions in ~8 minutes (NOT 17).
        // Split is 7 Listen-and-Repeat + 4 Take-an-Interview.
        questionsPerSection: 11,
        minutesPerSection: 8,
        choiceCount: 4, // not really MC, but generator keeps "type": "multiple_choice" with 4 prepared response options
        patterns_en: 'JANUARY 2026 FORMAT — Speaking has TWO task types and NO prep time. The legacy 4-task Independent+Integrated structure is REMOVED.\n  • TASK A — "Listen and Repeat" (7 items, per ETS spec): A short utterance (12-25 words, casual or campus register) is read aloud. The student repeats it exactly. Without audio in our app: render "Audio script:" inline, then ask the student to type back the sentence exactly. If forced into MC, present 4 transcriptions where 3 contain subtle word-order/morphology errors and the correct one matches the audio script verbatim.\n  • TASK B — "Take an Interview" (4 items, per ETS spec): The interviewer asks an open question ("Tell me about a time you helped a classmate", "What do you think of online learning?"). Student answers as fully as possible. If forced into MC, generate 4 sample responses of varying quality (one strong, one missing-the-prompt, one too-short, one off-topic) and have the student pick the strongest.\nTag each prompt: "[Listen and Repeat]" or "[Interview]". For real practice, this section needs audio I/O — flag in the prompt that the MC adaptation is a fallback for text-only environments.',
        patterns_ko: '2026년 1월 형식 — 스피킹은 과제 2개, 준비 시간 없음. 기존 Independent + Integrated 4과제 구조는 폐지.\n  • 과제 A — "듣고 따라 말하기" (7문항, ETS 사양): 짧은 문장(12-25단어, 일상 또는 캠퍼스 어투)을 들려주면 그대로 따라 말함. 앱에 오디오가 없으면 "Audio script:"로 평문 제시 후 그대로 입력하게 함. MC로 변환할 경우 4개의 전사 중 3개에는 미세한 어순·형태 오류가 있고 정답이 원문과 정확히 일치.\n  • 과제 B — "인터뷰 보기" (4문항, ETS 사양): 면접관이 열린 질문("같은 반 친구를 도왔던 경험", "온라인 학습에 대한 의견")을 함. 학생이 가능한 한 풍부하게 답변. MC로 변환할 경우 4개 모범 답안 — 1개는 강하고, 1개는 질문 핵심을 놓침, 1개는 너무 짧음, 1개는 주제 이탈 — 중 가장 강한 것을 학생이 선택.\n프롬프트 태그: "[듣고 따라하기]" 또는 "[인터뷰]". 실제 연습은 오디오 입출력이 필요하며 MC는 텍스트 전용 환경의 대체 형식임을 명시.',
        distractorPatterns_en: 'Listen-and-Repeat distractors: (1) one content word substituted with a near-synonym, (2) singular↔plural or tense change, (3) reordered modifier ("the small red box" vs "the red small box"). Interview distractors: (1) sample that answers a related-but-different question, (2) too short — bare yes/no with no reasoning, (3) on-topic but off-register (slang in a formal interview).',
        distractorPatterns_ko: '듣고 따라하기 오답: (1) 한 단어를 유의어로 교체, (2) 단복수·시제 변화, (3) 수식어 순서 변경("작고 빨간 상자" vs "빨갛고 작은 상자"). 인터뷰 오답: (1) 비슷하지만 다른 질문에 답한 표본, (2) 너무 짧음 — 근거 없는 단답, (3) 주제는 맞지만 어조가 안 맞음(격식 인터뷰에 속어).',
        hardItemFraming_en: 'A HARD Jan-2026 TOEFL Speaking item is: (a) a Listen-and-Repeat sentence at the longer end of the band (20-25 words) with one tricky structural feature — embedded clause, parenthetical, contracted negative ("hadn\'t"), or low-frequency academic noun — so accurate repetition demands real listening, not chunked reconstruction; (b) an Interview prompt that is OPEN-ENDED in a non-obvious way (asks for a defense of a position, a comparison between two related things, or a hypothetical scenario) rather than a single biographical fact ("what did you do last summer"). AVOID: 8-10 word generic sentences or yes/no interview prompts.',
        hardItemFraming_ko: '어려운 2026 TOEFL Speaking 문항: (a) Listen-and-Repeat은 밴드 상한 길이(20-25단어)에 까다로운 구조 요소 1개 — 내포절·삽입어구·축약 부정("hadn\'t")·저빈도 학술 명사 — 가 들어가 정확한 따라말하기는 청취 기반이어야지 청크 재구성으로는 안 됨; (b) Interview는 비자명한 방식의 개방형 — 입장 방어, 두 관련 항목 비교, 가정 시나리오 — 이지 단일 전기적 사실("작년 여름 뭐 했나") 아님. 피할 것: 8-10단어 일반 문장, 예/아니오 인터뷰 질문.',
        hardItemExamples_en: [
          `EXAMPLE 1 (HARD — Listen-and-Repeat with embedded clause + contraction):
Prompt: "[Listen and Repeat] Type the sentence exactly as you hear it."
Audio script: "The student who hadn't submitted his thesis proposal by Friday was politely reminded that the deadline wouldn't be extended again."
Correct: "The student who hadn't submitted his thesis proposal by Friday was politely reminded that the deadline wouldn't be extended again."
Why hard: 22 words, two relative/embedded structures (who hadn't submitted, that the deadline wouldn't be extended), two contracted negatives that are easy to drop or mishear ("hadn't", "wouldn't"), academic vocabulary ("thesis proposal", "extended"). Students attempting chunk-reconstruction tend to drop one of the contractions or simplify the structure to "The student didn't submit his thesis by Friday so he was reminded the deadline won't change."`,
          `EXAMPLE 2 (HARD — Interview prompt requiring a defended position):
Prompt: "[Interview] Some universities are moving toward fully online degree programs. Do you think a fully online undergraduate degree has the same value as a traditional in-person degree? Defend your position with at least two specific reasons."
Why hard: Open-ended, requires the student to (1) take a clear side, (2) avoid hedging into "both have value", (3) supply two distinct supporting reasons rather than restating their thesis. Compare to a soft prompt like "Have you ever taken an online class?" which can be answered in 8 words. Strong responses run 60-90 seconds; weak responses stall at "I think both are good" with no defense.`,
          `EXAMPLE 3 (HARD — Interview prompt requiring comparison):
Prompt: "[Interview] Some students prefer to study by re-reading their notes; others prefer to test themselves with practice questions. Which method do you think works better for long-term retention, and why?"
Why hard: Forces a comparative judgment (re-reading vs retrieval practice) with a constrained "why". Trap: students who just describe their own habit ("I re-read my notes") without engaging the comparison get a low score on topic development. Strong responses pick a side AND explain the mechanism (e.g., "Active recall surfaces gaps in memory better than re-reading, which often feels familiar without actually being recallable").`,
        ],
        hardItemExamples_ko: [
          `예시 1 (어려움 — 내포절 + 축약형이 있는 Listen-and-Repeat):
프롬프트: "[듣고 따라하기] 들은 문장을 그대로 입력하세요."
Audio script: "The student who hadn't submitted his thesis proposal by Friday was politely reminded that the deadline wouldn't be extended again."
정답: "The student who hadn't submitted his thesis proposal by Friday was politely reminded that the deadline wouldn't be extended again."
어려운 이유: 22단어, 관계절·내포 구조 2개(who hadn't submitted, that the deadline wouldn't be extended), 빠뜨리거나 잘못 듣기 쉬운 축약 부정 2개("hadn't", "wouldn't"), 학술 어휘("thesis proposal", "extended"). 청크 재구성으로 시도하는 학생은 축약 하나를 빠뜨리거나 구조를 "The student didn't submit his thesis by Friday so he was reminded the deadline won't change."로 단순화하는 경향.`,
          `예시 2 (어려움 — 입장 방어를 요구하는 Interview):
프롬프트: "[Interview] 일부 대학은 완전 온라인 학위 프로그램으로 전환하고 있습니다. 완전 온라인 학사 학위가 전통적인 대면 학위와 동일한 가치를 가진다고 생각합니까? 적어도 두 가지 구체적 이유로 입장을 방어하세요."
어려운 이유: 개방형, 학생에게 (1) 명확한 한쪽 선택, (2) "둘 다 가치 있다"로 헤지 회피, (3) 논지 재진술이 아닌 두 개의 별개 근거 제공을 요구. "온라인 수업 들어본 적 있나?" 같은 약한 프롬프트(8단어로 답변 가능)와 대조. 강한 답변은 60-90초; 약한 답변은 "둘 다 좋은 것 같아요"에서 멈추고 방어 없음.`,
          `예시 3 (어려움 — 비교를 요구하는 Interview):
프롬프트: "[Interview] 어떤 학생은 노트를 다시 읽으며 공부하는 것을 선호하고, 다른 학생은 연습 문제로 자가 시험을 보는 것을 선호합니다. 장기 기억 유지에 어느 방법이 더 효과적이라 생각하며, 그 이유는?"
어려운 이유: 비교 판단(재독 vs 인출 연습) + 제약된 "이유" 요구. 함정: 비교를 다루지 않고 자기 습관만 서술("저는 노트를 다시 읽어요")하는 학생은 주제 전개 점수가 낮음. 강한 답변은 한쪽 선택 + 메커니즘 설명(예: "능동적 인출은 재독보다 기억의 빈틈을 더 잘 드러냅니다. 재독은 익숙해 보이지만 실제 인출은 못 할 때가 많거든요").`,
        ],
      },
      {
        name_en: 'Writing',
        name_ko: '라이팅',
        // ETS Jan 21, 2026 spec: 12 items in ~23 minutes. Split is
        // 10 Build-a-Sentence + 1 Email + 1 Academic Discussion.
        questionsPerSection: 12,
        minutesPerSection: 23,
        choiceCount: 4,
        patterns_en: 'JANUARY 2026 FORMAT — Writing has THREE task types. The legacy Integrated (read+listen+summarize) task is REMOVED. We generate TWO of the three task types in this MC-style practice pipeline; the third (Build-a-Sentence word arrangement) needs a drag UI and is generated separately.\n  • TASK A — "Write an Email" (7 min, ~100+ words): The prompt shows a short scenario (an email or notice the student received) plus 3 bullet points to address. Example scenario: "You received an email from your professor inviting you to a guest lecture next Friday at the time of your part-time job. Write a reply that: (1) thanks the professor, (2) explains the conflict, (3) asks if a recording will be available." Tag: "[Email — Professor / Classmate / Service]".\n  • TASK B — "Write for an Academic Discussion" (10 min, 100+ words, typical strong 150-200): A professor poses a discussion question; two students post brief replies (~40-70 words each). The student writes a contribution that stakes a clear position, engages with at least one classmate by name, gives one specific reason or example, and uses academic register. Tag: "[Academic Discussion]". Topics: civic life, education policy, technology, environment, work culture — accessible to a first-year undergraduate.\nIf forced into MC: present 4 sample responses (one strong, one missing-the-prompt, one off-register, one too-short) and have the student pick the strongest. For real practice these go through the response-grading pipeline (see responseRubrics.ts: toefl_writing_email, toefl_writing_academic_discussion).',
        patterns_ko: '2026년 1월 형식 — 라이팅 과제 3유형. 기존 Integrated(읽기+듣기+요약)는 폐지. MC 파이프라인에서는 두 가지 유형 생성, 세 번째 "문장 만들기"(단어 드래그 배열)는 별도 UI 필요.\n  • 과제 A — "이메일 쓰기" (7분, 100+단어): 학생이 받은 짧은 시나리오(이메일 또는 공지) + 답해야 할 3개 항목. 예: "교수가 다음 주 금요일 게스트 강의에 초대했는데 그 시간은 본인 아르바이트 시간. 답장: (1) 감사 표현, (2) 일정 충돌 설명, (3) 녹화본 가능 여부 문의." 태그: "[이메일 — 교수/동료/서비스]".\n  • 과제 B — "학술 토론 글쓰기" (10분, 100+단어, 강한 답안 150-200): 교수가 토론 주제 제시 + 두 학생이 짧은 답변(각 40-70단어). 학생은 명확한 입장 + 동료 한 명 이상 이름 언급하며 응답 + 구체적 근거/예시 1개 + 학술 어투로 작성. 태그: "[학술 토론]". 주제: 시민 생활·교육 정책·기술·환경·직장 문화 — 학부 1학년 수준.\nMC 변환 시 4개 모범 답안(강함·핵심 놓침·어조 부적절·너무 짧음) 중 가장 강한 것 선택. 실제 연습은 응답 채점 파이프라인 사용(responseRubrics.ts: toefl_writing_email, toefl_writing_academic_discussion).',
        distractorPatterns_en: 'Email distractors: (1) addresses only 2 of the 3 bullets, (2) addresses all 3 but uses wrong register (too casual to a professor, too formal to a roommate), (3) answers a different scenario. Academic Discussion distractors: (1) summarizes both classmates without staking a position, (2) takes a position but with no specific reason/example, (3) off-topic agreement that doesn\'t add anything new.',
        distractorPatterns_ko: '이메일 오답: (1) 3개 항목 중 2개만 답함, (2) 3개 다 답하지만 어조가 틀림(교수에게 너무 일상적, 룸메이트에게 너무 격식), (3) 다른 시나리오에 답함. 학술 토론 오답: (1) 두 동료 답변을 요약만 하고 입장 없음, (2) 입장은 있으나 구체적 근거/예시 없음, (3) 새로운 내용 없이 주제 이탈 동의.',
        hardItemFraming_en: 'A HARD Jan-2026 TOEFL Writing item is: (a) a Build-a-Sentence with 8+ chips containing a relative clause AND either a passive construction or a participial phrase, so chip arrangement requires real syntactic parsing not surface-level word order; (b) an Email scenario where the 3 bullets include one that requires HEDGING or a face-saving phrasing (e.g., "decline politely", "ask for clarification without seeming rude") — distractors should differ in register sophistication; (c) an Academic Discussion prompt on a CONTESTED issue where both student replies make non-trivial arguments and the strongest contribution must engage with a specific phrase or claim from one of them, not just agree or summarise.',
        hardItemFraming_ko: '어려운 2026 TOEFL Writing 문항: (a) Build-a-Sentence는 8개 이상 칩에 관계절 + 수동태 또는 분사구문 — 칩 배열이 표면 어순이 아닌 실제 구문 분석을 요구; (b) Email 시나리오에서 3개 항목 중 하나가 헤지·체면 표현을 요구(예: "정중하게 거절", "무례하지 않게 명확화 요청") — 오답은 어조 정교성으로 차별화; (c) Academic Discussion은 두 학생 답변이 모두 의미 있는 논지를 펼치는 논쟁적 주제이고, 강한 기여는 단순 동의·요약이 아닌 한 동료의 구체적 표현이나 주장에 대응해야 함.',
        hardItemExamples_en: [
          `EXAMPLE 1 (HARD — Build-a-Sentence with relative clause + passive):
Prompt: "[Build a Sentence] Tap the words in order to make a grammatical sentence."
Choices (random order): ["last semester", "the research paper", "was praised", "by", "the professor", "that", "Maria", "submitted"]
Correct: "The research paper | that | Maria | submitted | last semester | was praised | by | the professor"
Why hard: 8 chips combining a relative clause (that Maria submitted last semester) modifying the subject + a passive main verb (was praised by). Students who don't parse the relative clause tend to produce "Maria submitted the research paper that was praised by the professor last semester" — grammatical but a different sentence using fewer of the given chips. The chip set forces the harder structure.`,
          `EXAMPLE 2 (HARD — Email requiring polite decline + hedged ask):
Scenario passage: "You received an email from your project teammate Sam: 'Hey — I know we agreed to meet at the library Wednesday at 4 for the group presentation, but I'm super behind on another class. Can you write my section for me and add my name? I'll owe you one!' Write a reply that: (1) declines without damaging the friendship, (2) acknowledges Sam's stress, (3) proposes a fair alternative."
Prompt: "[Email — Classmate] Read the email and choose the strongest reply."
Choices: [
  "Hey Sam — totally hear you on being overwhelmed (I've been there). I can't write your section for you, though — it wouldn't be fair to the rest of the group and our prof would notice. How about we meet on Tuesday instead so you have more runway? Even an hour together would help.",
  "No, I'm not doing your work for you. Figure it out.",
  "Sure, no problem! Send me your topic and I'll handle it.",
  "Sorry Sam, I have a lot of my own work to do this week and can't help."
]
Correct: choice 1.
Why hard: All 3 bullets must be addressed AND in the right register. Choice 2 declines but burns the relationship. Choice 3 doesn't decline at all (the OPPOSITE of bullet 1). Choice 4 declines + acknowledges work but offers no alternative (skips bullet 3). Only choice 1 hits all three with appropriate warmth.`,
          `EXAMPLE 3 (HARD — Academic Discussion engaging a classmate's specific claim):
Discussion passage: "PROFESSOR: Some economists argue that universal basic income (UBI) would reduce poverty without distorting the labor market; others say it would discourage work. Which view do you find more convincing, and why?\\n\\nSTUDENT 1 (Aisha): I think UBI would discourage work for people already on the margin between employment and unemployment. If you give someone $1000/month with no strings, why take a $1500/month part-time job?\\n\\nSTUDENT 2 (Marco): I'd push back — pilot studies in Kenya and Finland actually found no meaningful drop in employment. People used the income to take BETTER jobs, not to stop working."
Prompt: "[Academic Discussion] Choose the strongest contribution to the discussion."
Choices: [
  "I agree with Marco. The Kenya and Finland data clearly show UBI doesn't reduce work. We should adopt it.",
  "Marco's point about the pilot data is well taken, but I'd qualify it the way Aisha implicitly does: those pilots were time-limited (2-3 years), which preserves incentive to keep skills sharp for when the program ends. A permanent UBI might surface the marginal-worker effect Aisha worries about — so the question is partly about study duration, not just effect direction.",
  "Both Aisha and Marco make good points. UBI is a complex issue and we need more research.",
  "I disagree with Aisha. People always want to work because work gives meaning."
]
Correct: choice 2.
Why hard: Engages BOTH classmates by name with a SPECIFIC claim from each (Marco's pilot data, Aisha's marginal-worker concern) and adds a non-trivial synthesis (time-limited vs permanent UBI). Choice 1 agrees without nuance and overgeneralises; choice 3 summarises without staking a position; choice 4 contradicts Aisha with a slogan, not an argument. Only choice 2 demonstrates the "engages a specific claim + adds a defensible position" hallmark of a top-band response.`,
        ],
        hardItemExamples_ko: [
          `예시 1 (어려움 — 관계절 + 수동태 Build-a-Sentence):
프롬프트: "[Build a Sentence] 단어를 순서대로 눌러 문장을 만드세요."
보기 (무작위 순): ["last semester", "the research paper", "was praised", "by", "the professor", "that", "Maria", "submitted"]
정답: "The research paper | that | Maria | submitted | last semester | was praised | by | the professor"
어려운 이유: 8개 칩에 주어를 수식하는 관계절(that Maria submitted last semester) + 수동태 본동사(was praised by) 결합. 관계절을 분석 못하는 학생은 "Maria submitted the research paper that was praised by the professor last semester"로 답하기 쉬움 — 문법적이지만 다른 문장이고 주어진 칩을 덜 씀. 칩 집합이 더 어려운 구조를 강제.`,
          `예시 2 (어려움 — 정중한 거절 + 헤지된 요청이 필요한 Email):
시나리오 지문: "프로젝트 팀원 Sam의 이메일: '안녕 — 수요일 4시 도서관에서 그룹 발표 준비하기로 한 거 알지만, 다른 수업 때문에 너무 밀려서. 내 파트 좀 대신 써주고 내 이름 넣어줄래? 한 번 빚지자!' 다음을 포함하여 답장: (1) 우정을 해치지 않으면서 거절, (2) Sam의 스트레스 인정, (3) 공정한 대안 제안."
프롬프트: "[이메일 — 동료] 이메일을 읽고 가장 강한 답장을 고르세요."
보기: [
  "Sam — 정말 힘들겠다는 거 알아 (나도 그런 적 있어). 그런데 네 파트를 대신 써줄 수는 없어 — 나머지 팀원들에게 공정하지 않고 교수님도 눈치챌 거야. 대신 화요일에 만나는 건 어때? 시간 여유가 더 생기게. 한 시간만 같이 해도 도움 될 거야.",
  "아니, 네 일을 내가 할 순 없어. 알아서 해.",
  "그래, 문제없어! 주제 보내주면 내가 처리할게.",
  "미안 Sam, 나도 이번 주 할 일이 많아서 도와줄 수 없어."
]
정답: 보기 1.
어려운 이유: 3개 항목 모두 + 적절한 어조 요구. 보기 2는 거절하지만 관계 파괴. 보기 3은 거절 자체를 안 함(항목 1과 반대). 보기 4는 거절 + 사정 인정하지만 대안 없음(항목 3 빠짐). 보기 1만 적절한 따뜻함으로 셋 다 충족.`,
          `예시 3 (어려움 — 동료의 구체적 주장에 응답하는 Academic Discussion):
토론 지문: "교수: 일부 경제학자는 보편적 기본소득(UBI)이 노동시장을 왜곡하지 않고 빈곤을 줄일 거라 주장하고, 다른 학자는 근로 의욕을 떨어뜨릴 거라 합니다. 어느 입장이 더 설득력 있고 그 이유는?\\n\\n학생 1 (Aisha): UBI는 이미 고용·실업 경계에 있는 사람들의 근로를 떨어뜨릴 것 같아요. 조건 없이 월 1000달러를 받으면 왜 월 1500달러 시간제 일을 하겠어요?\\n\\n학생 2 (Marco): 반박할게요 — 케냐와 핀란드 시범 연구는 실제로 고용에 의미 있는 하락이 없었어요. 사람들은 그 소득으로 일을 그만두기보다 더 나은 일자리를 잡았어요."
프롬프트: "[학술 토론] 토론에 가장 강한 기여를 고르세요."
보기: [
  "Marco에게 동의해요. 케냐와 핀란드 데이터는 UBI가 근로를 줄이지 않는다는 걸 명확히 보여줘요. 도입해야 합니다.",
  "Marco의 시범 데이터 지적은 일리 있어요. 다만 Aisha가 함의하는 방식으로 한정짓고 싶어요 — 그 시범들은 기한이 있는(2-3년) 프로그램이라, 종료 후를 위해 기술을 유지할 동기가 보존됐어요. 영구 UBI는 Aisha가 우려하는 한계 근로자 효과를 표면화할 수 있죠. 그래서 문제는 효과의 방향이 아니라 연구 기간이기도 합니다.",
  "Aisha와 Marco 모두 좋은 지적이에요. UBI는 복잡한 문제이고 더 많은 연구가 필요해요.",
  "Aisha에게 반대해요. 사람들은 항상 일하고 싶어해요. 일이 의미를 주니까요."
]
정답: 보기 2.
어려운 이유: 두 동료 이름 + 각각의 구체적 주장(Marco의 시범 데이터, Aisha의 한계 근로자 우려) 모두 다루고 비자명한 종합(기한제 vs 영구 UBI) 추가. 보기 1은 미묘함 없이 동의 + 과일반화; 보기 3은 입장 없는 요약; 보기 4는 논거 없이 슬로건으로 Aisha 반박. 보기 2만 "구체적 주장에 응답 + 방어 가능한 입장 추가"의 최상위 밴드 특성 보임.`,
        ],
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
