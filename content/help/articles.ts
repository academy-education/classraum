/**
 * Help-article catalog.
 *
 * Single source of truth for what articles exist, what their URLs are,
 * which roles should see them, and how to render them. The page route
 * /dashboard/help/[slug] reads from here.
 *
 * To add a new article:
 *   1. Drop the markdown into content/help/en/<NN-slug>.md (and ko/).
 *   2. Add a new entry below — set slug, title, and a non-empty `roles`
 *      array (use ['all'] to show to every role).
 *   3. The sidebar order matches `order` ascending.
 */

// NOTE: This module is imported by both client and server components, so
// it MUST NOT import 'fs' or 'path'. The filesystem-reading function
// `readArticleBody` lives in ./server.ts and is server-only.

export type HelpRole = 'owner' | 'manager' | 'teacher' | 'parent' | 'student' | 'all'

export interface HelpArticleMeta {
  /** URL slug — matches the filename minus the leading "NN-" prefix. */
  slug: string
  /** English display title — also used as <h1> headline if the .md doesn't have one. */
  title: string
  /** Korean display title. */
  titleKo: string
  /** English one-line summary shown in the sidebar + on the TOC landing. */
  blurb: string
  /** Korean one-line summary. */
  blurbKo: string
  /** Sidebar order (ascending). Leave gaps so you can insert between later. */
  order: number
  /** Which roles see this article. Use ['all'] for universal articles. */
  roles: HelpRole[]
  /** Filename under content/help/<lang>/ — e.g. "02-classrooms.md". */
  file: string
}

/**
 * Pick the right title/blurb for the current language. Defaults to
 * English when the language string is anything other than 'ko' or
 * 'korean', so an unknown locale never blanks the menu.
 */
export function localizeArticle(
  meta: HelpArticleMeta,
  lang: string | undefined | null
): { title: string; blurb: string } {
  const isKo = lang === 'ko' || lang === 'korean'
  return {
    title: isKo ? meta.titleKo : meta.title,
    blurb: isKo ? meta.blurbKo : meta.blurb,
  }
}

/**
 * All help articles, in canonical sidebar order.
 *
 * Order numbers leave space (10, 20, 30…) so future inserts don't
 * renumber every existing article.
 */
export const HELP_ARTICLES: HelpArticleMeta[] = [
  {
    slug: 'getting-started',
    title: 'Getting started',
    titleKo: '시작하기',
    blurb: 'What each tab does + where most people start',
    blurbKo: '각 탭의 역할과 처음 사용자가 시작하기 좋은 곳',
    order: 10,
    roles: ['all'],
    file: '01-getting-started.md',
  },
  {
    slug: 'classrooms',
    title: 'Classrooms',
    titleKo: '클래스',
    blurb: 'Creating, editing, and organizing your classes',
    blurbKo: '클래스 생성, 편집, 정리하기',
    order: 20,
    roles: ['owner', 'manager', 'teacher'],
    file: '02-classrooms.md',
  },
  {
    slug: 'sessions',
    title: 'Sessions',
    titleKo: '세션',
    blurb: 'Individual class meetings, templates, and make-up sessions',
    blurbKo: '개별 수업, 템플릿, 보강 세션',
    order: 30,
    roles: ['owner', 'manager', 'teacher'],
    file: '03-sessions.md',
  },
  {
    slug: 'assignments',
    title: 'Assignments',
    titleKo: '과제',
    blurb: 'Creating assignments + grading submissions',
    blurbKo: '과제 생성 및 제출물 채점',
    order: 40,
    roles: ['owner', 'manager', 'teacher'],
    file: '04-assignments.md',
  },
  {
    slug: 'attendance',
    title: 'Attendance',
    titleKo: '출결',
    blurb: 'Recording daily attendance, status options, and notes',
    blurbKo: '일일 출결, 상태 옵션, 메모 기록하기',
    order: 50,
    roles: ['owner', 'manager', 'teacher'],
    file: '05-attendance.md',
  },
  {
    slug: 'announcements',
    title: 'Announcements',
    titleKo: '공지사항',
    blurb: 'Academy-wide notices to parents and students',
    blurbKo: '학부모와 학생에게 보내는 학원 공지',
    order: 60,
    roles: ['owner', 'manager', 'teacher'],
    file: '06-announcements.md',
  },
  {
    slug: 'reports',
    title: 'Report cards',
    titleKo: '성적표',
    blurb: 'Generating monthly reports with AI feedback',
    blurbKo: 'AI 피드백을 활용한 월간 성적표 생성',
    order: 70,
    roles: ['owner', 'manager', 'teacher'],
    file: '07-reports.md',
  },
  {
    slug: 'exams',
    title: 'Exams & scores',
    titleKo: '시험 및 점수',
    blurb: 'AI-generated tests for quizzes, midterms, and placements',
    blurbKo: '퀴즈, 중간고사, 반편성을 위한 AI 시험 생성',
    order: 80,
    roles: ['owner', 'manager', 'teacher'],
    file: '08-exams.md',
  },
  {
    slug: 'messages-notifications',
    title: 'Messages & notifications',
    titleKo: '메시지 및 알림',
    blurb: 'In-app messaging + customizing your alerts',
    blurbKo: '앱 내 메시지 및 알림 설정 변경',
    order: 90,
    roles: ['all'],
    file: '09-messages-notifications.md',
  },
  {
    slug: 'payments',
    title: 'Payments',
    titleKo: '결제',
    blurb: 'Tuition collection — recurring and one-time invoices',
    blurbKo: '수강료 수금 — 정기 결제와 일회성 청구',
    order: 100,
    // Payments tab is owner/manager only — so is this article.
    roles: ['owner', 'manager'],
    file: '10-payments.md',
  },
  {
    slug: 'contacts-families',
    title: 'Contacts & families',
    titleKo: '연락처 및 가족',
    blurb: 'Linking parents and students into family groups',
    blurbKo: '학부모와 학생을 가족 그룹으로 연결하기',
    order: 110,
    roles: ['owner', 'manager', 'teacher'],
    file: '11-contacts-families.md',
  },
  {
    slug: 'archive',
    title: 'Archive',
    titleKo: '보관함',
    blurb: 'Restoring deleted items + permanent deletion',
    blurbKo: '삭제된 항목 복원 및 영구 삭제',
    order: 120,
    roles: ['owner', 'manager', 'teacher'],
    file: '12-archive.md',
  },
  {
    slug: 'settings',
    title: 'Settings',
    titleKo: '설정',
    blurb: 'Profile, branding, and subscription management',
    blurbKo: '프로필, 브랜딩, 구독 관리',
    order: 130,
    roles: ['all'],
    file: '13-settings.md',
  },
  {
    slug: 'privacy-and-feedback',
    title: 'Privacy & feedback',
    titleKo: '개인정보 및 피드백',
    blurb: 'Data retention, role permissions, and sending feedback',
    blurbKo: '데이터 보관, 역할별 권한, 피드백 보내기',
    order: 140,
    roles: ['all'],
    file: '14-privacy-and-feedback.md',
  },
]

/**
 * Lookup an article by slug. Returns undefined if not found — let the
 * caller decide what to do (404 vs fallback).
 */
export function getArticleMeta(slug: string): HelpArticleMeta | undefined {
  return HELP_ARTICLES.find(a => a.slug === slug)
}

/**
 * Filter the catalog by user role. The sidebar uses this so a student
 * doesn't see a "Payments" link they can't act on anyway. Pass 'all'
 * when role is unknown / loading.
 */
export function getArticlesForRole(role: HelpRole | string | null | undefined): HelpArticleMeta[] {
  if (!role || role === 'all') return HELP_ARTICLES
  return HELP_ARTICLES.filter(a => a.roles.includes('all') || a.roles.includes(role as HelpRole))
}

// `readArticleBody` lives in ./server.ts — it's server-only because it
// reads from the filesystem. Import it from the article page route, not
// from client components.
