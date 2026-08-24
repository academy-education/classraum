"use client"

/**
 * The 성/이름 re-prompt.
 *
 * 191 of 444 accounts (43%) have NULL `family_name`/`given_name` — the split
 * rule could not do them, so the only way those columns ever get filled is by
 * asking. This is that ask.
 *
 * TWO SHAPES, ONE COMPONENT:
 *   - everywhere except /settings: a dismissible banner that links to /settings
 *   - on /settings itself: a modal with the form inline, because that is where
 *     a name change already belongs
 *
 * NOTHING HERE IS A WALL. Dismissal is always available and always harmless:
 * no write is blocked, no read fails, the columns simply stay NULL and every
 * read site keeps falling back to `users.name` (which is NOT NULL and stays
 * authoritative). 43% of accounts are in this cohort on deploy day — a hard
 * block would lock nearly half the user base out of the app.
 *
 * THE 150 RELATIONSHIP-LABEL PARENTS ARE HANDLED SEPARATELY. Their
 * `users.name` is not their name at all: it is `<child> 아버지`, stored masked
 * as `최**`, and their real name exists NOWHERE in the database. Asking them
 * to "correct" it would be asking about a string that was never theirs, and
 * showing the masked label back to them would be worse. Instead the child is
 * shown as read-only context, built from the STRUCTURED `family_members.relation`
 * field via guardianDisplayName() — never by re-parsing the frozen label.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserPen, X } from 'lucide-react'
import { db } from '@/lib/supabase'
import { authHeaders } from '@/lib/auth-headers'
import { useTranslation } from '@/hooks/useTranslation'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { NameFields, validateNameFields } from '@/components/ui/name-fields'
import {
  getWelcomeModalServerSnapshot,
  isWelcomeModalOpen,
  subscribeWelcomeModal,
} from '@/lib/ui/first-run-overlays'
import {
  buildNameUpdate,
  guardianDisplayName,
  needsNamePrompt,
  splitName,
  type Relation,
} from '@/lib/name'

const RELATIONS: readonly Relation[] = ['father', 'mother', 'guardian', 'grandparent', 'other']

function asRelation(value: string | null | undefined): Relation | null {
  return RELATIONS.includes(value as Relation) ? (value as Relation) : null
}

/** Seven days, the back-off from the plan (§4). */
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

export interface NamePromptUser {
  id: string
  name: string
  family_name?: string | null
  given_name?: string | null
  name_confirmed_at?: string | null
  name_prompt_snoozed_until?: string | null
}

interface GuardianContext {
  relation: Relation | null
  childName: string
}

export function NamePrompt({ user }: { user: NamePromptUser | null }) {
  const pathname = usePathname()
  // Only the account settings page, not /settings/subscription and friends.
  const onSettings = pathname === '/settings'
  // AuthWrapper also wraps the /mobile tree, where /settings does not exist —
  // students and parents (which is where the 150 relationship-label accounts
  // live) edit their name on /mobile/profile. Sending them to /settings would
  // be a dead link for the exact cohort this prompt is for.
  const onMobile = !!pathname && pathname.startsWith('/mobile')
  const nameFormHref = onMobile ? '/mobile/profile' : '/settings'
  const { t, language } = useTranslation()
  const { toast } = useToast()

  const [dismissed, setDismissed] = useState(false)
  const [saved, setSaved] = useState(false)
  const [modalOpen, setModalOpen] = useState(true)
  const [familyName, setFamilyName] = useState('')
  const [givenName, setGivenName] = useState('')
  const [errors, setErrors] = useState<{ familyName?: string; givenName?: string }>({})
  const [saving, setSaving] = useState(false)
  const [guardian, setGuardian] = useState<GuardianContext | null>(null)

  // A snooze that has not expired hides the prompt entirely. One column, one
  // value, no counter to drift.
  const snoozedUntil = user?.name_prompt_snoozed_until
  const snoozed = !!snoozedUntil && new Date(snoozedUntil).getTime() > Date.now()
  /* Two first-run overlays used to open on top of each other on a new
     account: the WelcomeModal's centred dialog and this banner. The
     welcome wins (it is modal and short-lived); this banner waits it out
     and appears the moment it closes — live state, not a stored flag, so
     nothing is deferred to a later session. See lib/ui/first-run-overlays. */
  const welcomeOpen = useSyncExternalStore(
    subscribeWelcomeModal,
    isWelcomeModalOpen,
    getWelcomeModalServerSnapshot,
  )
  const shouldShow = !!user && needsNamePrompt(user) && !snoozed && !dismissed && !saved && !welcomeOpen

  // Pre-fill from the split rule where it is safe. splitName() returns null
  // for every shape it cannot do — relationship labels, masked strings like
  // `최**`, one-token Latin — and that null must not be replaced by a guess.
  const userId = user?.id
  const userName = user?.name
  useEffect(() => {
    if (!userId) return
    const guess = splitName(userName)
    setFamilyName(guess?.family_name ?? '')
    setGivenName(guess?.given_name ?? '')
  }, [userId, userName])

  // Guardian context for the relationship-label cohort.
  //
  // THIS MUST GO THROUGH THE SERVER. The obvious client-side version — read
  // my own family_members row, then the sibling role='student' row, then that
  // user's name — returns NOTHING for a parent, silently, because RLS policy
  // `family_members_parents_access` is USING (user_id = auth.uid()). A parent
  // can see only their own row. The first cut of this component did exactly
  // that and rendered a bare "father" with no child name; the queries did not
  // error, they just came back empty, which is the failure mode RLS always
  // has. /api/account/guardian-context does the lookup under the service-role
  // client, scoped to the caller's own verified session.
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!shouldShow || !userId) return
      try {
        const res = await fetch('/api/account/guardian-context', {
          headers: await authHeaders(),
        })
        if (!res.ok) return
        const json = (await res.json()) as { relation?: string | null; childName?: string }
        if (!cancelled && (json.relation || json.childName)) {
          setGuardian({
            relation: asRelation(json.relation),
            childName: typeof json.childName === 'string' ? json.childName : '',
          })
        }
      } catch (error) {
        // Context is a nicety; without it the generic prompt still works.
        console.warn('[NamePrompt] Could not load guardian context:', error)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [shouldShow, userId])

  const handleDismiss = useCallback(async () => {
    setDismissed(true)
    setModalOpen(false)
    if (!userId) return
    // Best effort. If this write fails the prompt simply returns on the next
    // load — which is strictly better than blocking the dismissal on it.
    const { error } = await db
      .from('users')
      .update({ name_prompt_snoozed_until: new Date(Date.now() + SNOOZE_MS).toISOString() })
      .eq('id', userId)
    if (error) console.warn('[NamePrompt] Could not record snooze:', error)
  }, [userId])

  const handleSave = useCallback(async () => {
    if (!userId) return
    const result = validateNameFields(familyName, givenName)
    if (!result.valid) {
      setErrors({
        familyName: result.familyName ? String(t(result.familyName)) : undefined,
        givenName: result.givenName ? String(t(result.givenName)) : undefined,
      })
      return
    }

    setSaving(true)
    try {
      // family_name, given_name AND name in one statement — users.name never
      // stops being written.
      const { error } = await db
        .from('users')
        .update(buildNameUpdate(familyName, givenName))
        .eq('id', userId)
      if (error) throw error

      toast({ title: String(t('names.nameSaved')), variant: 'success' })
      setSaved(true)
      setModalOpen(false)
      // On /settings the account form below this modal was seeded from the
      // OLD row and its Save button would happily write that stale pair back.
      // Reload so both are reading the same record.
      if (onSettings) window.location.reload()
    } catch (error) {
      console.error('[NamePrompt] Save failed:', error)
      toast({ title: String(t('names.nameSaveFailed')), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }, [userId, familyName, givenName, t, toast, onSettings])

  if (!shouldShow) return null

  const korean = language === 'korean'
  const isGuardian = !!guardian
  const guardianLine = guardian
    ? guardianDisplayName(guardian.childName, guardian.relation, language)
    : ''

  const form = (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {isGuardian ? t('names.prompt.guardianBody') : t('names.prompt.body')}
      </p>

      {isGuardian && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {t('names.relationLabel')}
          </p>
          <p className="text-sm font-medium text-gray-900 mt-1">
            {guardianLine || t(`names.relation.${guardian.relation ?? 'guardian'}`)}
          </p>
          {guardian.childName && (
            <p className="text-xs text-gray-500 mt-1">
              {t('names.guardianOf', { child: guardian.childName })}
            </p>
          )}
        </div>
      )}

      <NameFields
        korean={korean}
        t={t}
        required
        autoFocusFirst
        idPrefix="name-prompt"
        familyName={familyName}
        givenName={givenName}
        familyNameError={errors.familyName}
        givenNameError={errors.givenName}
        disabled={saving}
        onFamilyNameChange={(value) => {
          setFamilyName(value)
          setErrors((prev) => ({ ...prev, familyName: undefined }))
        }}
        onGivenNameChange={(value) => {
          setGivenName(value)
          setErrors((prev) => ({ ...prev, givenName: undefined }))
        }}
      />
    </div>
  )

  if (onSettings) {
    return (
      <ModalShell
        isOpen={modalOpen}
        onClose={handleDismiss}
        size="md"
        title={t('names.prompt.title')}
        closeDisabled={saving}
        footer={
          <ModalShell.Footer>
            <Button variant="ghost" onClick={handleDismiss} disabled={saving}>
              {t('names.prompt.dismiss')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {t('names.prompt.save')}
            </Button>
          </ModalShell.Footer>
        }
      >
        {form}
      </ModalShell>
    )
  }

  /* min-h-11 rather than relying on the below-md rule in globals.css: this
     banner is a direct child of <body>, so it is outside
     [data-surface="dashboard"] and that rule cannot reach it. It also floats
     over the student surface, where the rule is deliberately not applied —
     but a primary CTA and a dismiss control need a 44px target on every
     surface. */
  const action = (
    <Link href={nameFormHref}>
      <Button size="sm" className="min-h-11">{t('names.prompt.bannerAction')}</Button>
    </Link>
  )

  /* SLIM BAR EVERYWHERE A PHONE IS INVOLVED.
   *
   * This used to be a ~196px fixed card, and a previous pass collapsed it
   * to one row only under `[@media(max-height:700px)]`. That fixed 375x667
   * and left 375x812 exactly as it was: the full card still landed on the
   * study page's "Start here" CTA and on the /mobile calendar, and
   * document.elementFromPoint over those elements returned the banner.
   * Screen HEIGHT was never the right axis — an 812px phone has the same
   * 375px of width and the same content sitting under the same fixed
   * overlay; it just has more of it to cover.
   *
   * So the single row is now the DEFAULT and the roomy card is the
   * exception, restored only at `lg` (>=1024px), where the surface is a
   * desktop dashboard with room to spare and nothing to occlude. Nothing
   * is lost on a phone: the explanation lives on the page the action
   * links to, which is where the name is actually edited.
   *
   * The action markup is rendered twice (inline and stacked) rather than
   * repositioned, so the swap stays a pure media query — no height
   * measurement, no layout effect.
   */
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 p-2 lg:p-4 pointer-events-none ${
        // Clear the mobile bottom navigation bar.
        onMobile ? 'pb-[72px] lg:pb-24' : ''
      }`}
    >
      <div className="mx-auto max-w-xl rounded-xl border border-gray-200 bg-white shadow-lg p-2 lg:p-4 flex items-center lg:items-start gap-2 lg:gap-3 pointer-events-auto">
        {/* The icon chip is decorative; dropping it on a phone buys back
            36px of width so the title fits beside the inline action. */}
        <div className="hidden lg:block flex-shrink-0 rounded-lg bg-primary/10 p-2">
          <UserPen className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          {/* The slim bar uses the SHORTER existing title ("Confirm your
              name"), because the long one truncates to "Please confirm y…"
              once the action sits beside it. */}
          <p className="lg:hidden text-sm font-medium text-gray-900 truncate">{t('names.prompt.title')}</p>
          <p className="hidden lg:block text-sm font-medium text-gray-900">{t('names.prompt.bannerTitle')}</p>
          <p className="hidden lg:block text-sm text-gray-600 mt-0.5">
            {isGuardian && guardianLine
              ? guardianLine
              : isGuardian
                ? t('names.prompt.guardianBody')
                : t('names.prompt.body')}
          </p>
          <div className="mt-2 hidden lg:block">
            {action}
          </div>
        </div>
        <div className="lg:hidden flex-shrink-0">
          {action}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="p-1 flex-shrink-0 min-h-11 min-w-11"
          onClick={handleDismiss}
          aria-label={String(t('names.prompt.dismiss'))}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
