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
  /** Display title — also used as <h1> headline if the .md doesn't have one. */
  title: string
  /** One-line summary shown in the sidebar + on the TOC landing. */
  blurb: string
  /** Sidebar order (ascending). Leave gaps so you can insert between later. */
  order: number
  /** Which roles see this article. Use ['all'] for universal articles. */
  roles: HelpRole[]
  /** Filename under content/help/<lang>/ — e.g. "02-classrooms.md". */
  file: string
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
    blurb: 'What each tab does + where most people start',
    order: 10,
    roles: ['all'],
    file: '01-getting-started.md',
  },
  {
    slug: 'classrooms',
    title: 'Classrooms',
    blurb: 'Creating, editing, and organizing your classes',
    order: 20,
    roles: ['owner', 'manager', 'teacher'],
    file: '02-classrooms.md',
  },
  {
    slug: 'sessions',
    title: 'Sessions',
    blurb: 'Individual class meetings, templates, and make-up sessions',
    order: 30,
    roles: ['owner', 'manager', 'teacher'],
    file: '03-sessions.md',
  },
  {
    slug: 'assignments',
    title: 'Assignments',
    blurb: 'Creating assignments + grading submissions',
    order: 40,
    roles: ['owner', 'manager', 'teacher'],
    file: '04-assignments.md',
  },
  {
    slug: 'attendance',
    title: 'Attendance',
    blurb: 'Recording daily attendance, status options, and notes',
    order: 50,
    roles: ['owner', 'manager', 'teacher'],
    file: '05-attendance.md',
  },
  {
    slug: 'announcements',
    title: 'Announcements',
    blurb: 'Academy-wide notices to parents and students',
    order: 60,
    roles: ['owner', 'manager', 'teacher'],
    file: '06-announcements.md',
  },
  {
    slug: 'reports',
    title: 'Report cards',
    blurb: 'Generating monthly reports with AI feedback',
    order: 70,
    roles: ['owner', 'manager', 'teacher'],
    file: '07-reports.md',
  },
  {
    slug: 'exams',
    title: 'Exams & scores',
    blurb: 'AI-generated tests for quizzes, midterms, and placements',
    order: 80,
    roles: ['owner', 'manager', 'teacher'],
    file: '08-exams.md',
  },
  {
    slug: 'messages-notifications',
    title: 'Messages & notifications',
    blurb: 'In-app messaging + customizing your alerts',
    order: 90,
    roles: ['all'],
    file: '09-messages-notifications.md',
  },
  {
    slug: 'payments',
    title: 'Payments',
    blurb: 'Tuition collection — recurring and one-time invoices',
    order: 100,
    // Payments tab is owner/manager only — so is this article.
    roles: ['owner', 'manager'],
    file: '10-payments.md',
  },
  {
    slug: 'contacts-families',
    title: 'Contacts & families',
    blurb: 'Linking parents and students into family groups',
    order: 110,
    roles: ['owner', 'manager', 'teacher'],
    file: '11-contacts-families.md',
  },
  {
    slug: 'archive',
    title: 'Archive',
    blurb: 'Restoring deleted items + permanent deletion',
    order: 120,
    roles: ['owner', 'manager', 'teacher'],
    file: '12-archive.md',
  },
  {
    slug: 'settings',
    title: 'Settings',
    blurb: 'Profile, branding, and subscription management',
    order: 130,
    roles: ['all'],
    file: '13-settings.md',
  },
  {
    slug: 'privacy-and-feedback',
    title: 'Privacy & feedback',
    blurb: 'Data retention, role permissions, and sending feedback',
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
