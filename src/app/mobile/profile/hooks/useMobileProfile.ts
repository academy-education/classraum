"use client"

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react'
import {
  subscribeProfileRefresh,
  getProfileRefreshSnapshot,
  getProfileRefreshServerSnapshot,
} from '@/lib/ui/profile-refresh'
import { db } from '@/lib/supabase'
import type { Json } from '@/lib/database.types'
import { useStableCallback } from '@/hooks/useStableCallback'
import { buildNameUpdate, validateFamilyName, validateGivenName } from '@/lib/name'

export interface UserProfile {
  id: string
  /** Authoritative single-string name. NOT NULL in the DB, never dropped,
   *  and the fallback for the 191 accounts whose split columns are NULL. */
  name: string
  /** 성. NULL until the user confirms — do not assume it is present. */
  family_name?: string | null
  /** 이름. NULL alongside family_name. */
  given_name?: string | null
  name_confirmed_at?: string | null
  email: string
  phone?: string
  role: string
  /** Comma-separated academy names (kept for backwards compat with non-mobile callers). */
  academy_name?: string
  /** Full list of academy names — preferred for rendering since the page can decide how to summarize. */
  academy_names?: string[]
  student_grade?: string
  student_school?: string
  created_at?: string
}

export interface UserPreferences {
  push_notifications: boolean
  /**
   * Per-category email opt-outs, stored in the `user_preferences`
   * jsonb column of the same name.
   *
   * The first four are ACADEMY concerns (they gate the assignment- and
   * session-reminder crons). `study_recap` is the study weekly-recap
   * email and is the only study-mode member — it is read by
   * /api/cron/study-weekly-recap, which until this key existed had no
   * opt-out at all and mailed every onboarded student regardless of
   * what they had switched off here.
   *
   * EVERY flag is opt-OUT: an absent key means "on". See the `!== false`
   * reads below, and `defaultPreferences`. The column is genuinely `{}`
   * for accounts created through LanguageContext, and carries a
   * completely different key set for accounts created through the
   * dashboard settings page, so "absent" is the common case and must
   * never be read as "off".
   */
  email_notifications: {
    assignments: boolean
    grades: boolean
    announcements: boolean
    reminders: boolean
    study_recap: boolean
  }
  /**
   * Per-category PUSH opt-outs, stored in `user_preferences.push_categories`
   * (jsonb, migration 080). Gated by `push_notifications` above it: master
   * off means nothing sends, whatever these say.
   *
   *   reminders  streak at risk/saved/milestone, daily challenge
   *   progress   response graded, weekly recap
   *   social     league promoted/demoted, duel won/lost
   *
   * There is a fourth conceptual group — `account` (payment failed,
   * subscription expired) — which is deliberately NOT here and has no
   * key in the column: those are service messages a paying customer
   * needs, and the migration's CHECK constraint rejects the key outright.
   *
   * Opt-OUT, exactly like email_notifications: an absent key means ON.
   * The column defaults to `{}` for all 420 existing rows, so "absent"
   * is the common case — reading it as "off" would mute everybody on
   * deploy, and nobody reports a notification they did not receive.
   */
  push_categories: {
    reminders: boolean
    progress: boolean
    social: boolean
  }
  language: string
}

/** The switchable push categories, in the order the profile page shows them. */
export const PUSH_CATEGORY_KEYS = ['reminders', 'progress', 'social'] as const
export type PushCategoryKey = (typeof PUSH_CATEGORY_KEYS)[number]

interface CachedProfileData {
  profile: UserProfile
  preferences: UserPreferences
}

interface UseMobileProfileReturn {
  profile: UserProfile | null
  preferences: UserPreferences
  loading: boolean
  preferencesLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>
  /** Save a new phone number. Writes users.phone (the home for
   *  academy-less study accounts) and the role table when a row exists.
   *  Returns false if every write failed. */
  updatePhone: (phone: string) => Promise<boolean>
  /** Save a new 성/이름. Writes family_name, given_name AND name in the
   *  SAME statement — users.name stays authoritative and is what all 8
   *  PortOne call sites pass to the card issuer. Returns false on failure. */
  updateName: (familyName: string, givenName: string) => Promise<boolean>
}

const defaultPreferences: UserPreferences = {
  push_notifications: false,
  email_notifications: {
    assignments: true,
    grades: true,
    announcements: true,
    reminders: true,
    study_recap: true
  },
  push_categories: {
    reminders: true,
    progress: true,
    social: true
  },
  language: 'english'
}

/**
 * Fill in any email flag the stored shape does not have.
 *
 * Needed because the sessionStorage cache is a snapshot of an OLDER
 * BUILD's UserPreferences: a student who loaded this page before
 * `study_recap` existed has a five-minute-fresh cache with four flags in
 * it, and `preferences.email_notifications.study_recap` reads
 * `undefined`. A toggle bound to `undefined` renders OFF and
 * `aria-checked` becomes absent — so the screen would say the student
 * had opted out of an email they are in fact still receiving, until the
 * cache expired.
 *
 * Same `!== false` rule as the database read, for the same reason:
 * absent is ON.
 */
function withPreferenceDefaults(cached: CachedProfileData | null): CachedProfileData | null {
  if (!cached) return null
  const stored = (cached.preferences?.email_notifications ?? {}) as Partial<
    UserPreferences['email_notifications']
  >
  // Same problem, same rule, for push: a cache written before
  // push_categories existed has no such key, and `undefined` bound to a
  // switch renders OFF — telling the student they had opted out of
  // notifications they are in fact still receiving.
  const storedPush = (cached.preferences?.push_categories ?? {}) as Partial<
    UserPreferences['push_categories']
  >
  return {
    ...cached,
    preferences: {
      ...defaultPreferences,
      ...cached.preferences,
      email_notifications: {
        assignments: stored.assignments !== false,
        grades: stored.grades !== false,
        announcements: stored.announcements !== false,
        reminders: stored.reminders !== false,
        study_recap: stored.study_recap !== false,
      },
      push_categories: {
        reminders: storedPush.reminders !== false,
        progress: storedPush.progress !== false,
        social: storedPush.social !== false,
      },
    },
  }
}

export const useMobileProfile = (
  userId: string | null,
  userName: string | null,
  academyIds: string[]
): UseMobileProfileReturn => {
  // Initialize with sessionStorage data synchronously
  const [data, setData] = useState<CachedProfileData | null>(() => {
    if (typeof window === 'undefined' || !userId) return null

    try {
      const sessionCacheKey = `mobile-profile-${userId}`
      const sessionCachedData = sessionStorage.getItem(sessionCacheKey)
      const sessionCacheTimestamp = sessionStorage.getItem(`${sessionCacheKey}-timestamp`)

      if (sessionCachedData && sessionCacheTimestamp) {
        const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
        const cacheValidFor = 5 * 60 * 1000 // 5 minutes

        if (timeDiff < cacheValidFor) {
          return withPreferenceDefaults(JSON.parse(sessionCachedData))
        }
      }
    } catch (error) {
      console.warn('[useMobileProfile] Cache read error:', error)
    }

    return null
  })

  const [loading, setLoading] = useState(() => data === null)
  const [preferencesLoading, setPreferencesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfileData = useStableCallback(async () => {
    if (!userId) {
      return
    }

    // Check cache first
    const sessionCacheKey = `mobile-profile-${userId}`
    const sessionCachedData = sessionStorage.getItem(sessionCacheKey)
    const sessionCacheTimestamp = sessionStorage.getItem(`${sessionCacheKey}-timestamp`)

    if (sessionCachedData && sessionCacheTimestamp) {
      const timeDiff = Date.now() - parseInt(sessionCacheTimestamp)
      const cacheValidFor = 5 * 60 * 1000 // 5 minutes

      if (timeDiff < cacheValidFor) {
        try {
          setData(withPreferenceDefaults(JSON.parse(sessionCachedData)))
          return
        } catch (error) {
          console.warn('[useMobileProfile] Cache parse error:', error)
        }
      }
    }

    setLoading(true)
    setError(null)

    try {

      // Fetch profile and preferences in parallel
      const [userDataResult, preferencesResult] = await Promise.all([
        // `users` stays `.single()`: no row here means the caller handed
        // us an id that does not exist, which IS an error.
        db.from('users').select('*').eq('id', userId).single(),
        // `user_preferences` does not: 6 of 415 accounts have no row (the
        // column is only written when something is changed), and the
        // reader below already falls through to `defaultPreferences`.
        // Behaviourally identical — the guard is `data && !error` either
        // way — but it stops a PostgrestError sitting in the result for a
        // normal state, waiting for someone to log it.
        db.from('user_preferences').select('*').eq('user_id', userId).maybeSingle()
      ])

      // Build profile data
      let profileData: UserProfile = {
        id: userId,
        name: userName || 'User',
        email: '',
        role: 'student'
      }

      if (userDataResult.data && !userDataResult.error) {
        const userData = userDataResult.data
        profileData = {
          id: userData.id,
          name: userData.name || userName || 'User',
          family_name: userData.family_name ?? null,
          given_name: userData.given_name ?? null,
          name_confirmed_at: userData.name_confirmed_at ?? null,
          email: userData.email || '',
          role: userData.role,
          // users.phone is the base — study-only accounts have no role
          // table row, so this is their only phone home. Role tables
          // override below when they carry one.
          phone: userData.phone || undefined
        }

        /*
         * Fetch role-specific data.
         *
         * EVERY ONE OF THESE IS `maybeSingle`, NOT `single`, AND THAT IS
         * LOAD-BEARING. `users.role` is a pointer at the DEFAULT SURFACE,
         * not a claim that the matching role row exists — a study-only
         * account is `role: 'student'` with no `students` row at all,
         * which is exactly what the `users.phone` comment above is about.
         *
         * `.single()` treats zero rows as an ERROR, so those accounts
         * logged "Error fetching students row" on every profile load for
         * a completely normal state. Measured against the live database
         * on 2026-08-03, users whose role row does not exist:
         *
         *     student  12 / 204      teacher  1 / 22
         *     manager   2 / 13       parent   1 / 175
         *
         * — so this was not a one-account edge case, and it was noise on
         * a console that a real failure has to be spotted in.
         *
         * `.maybeSingle()` returns {data: null, error: null} for zero
         * rows and still errors on the things worth hearing about: more
         * than one row (a duplicate role row IS a bug), RLS refusal, a
         * dead connection. The logs below therefore keep their meaning
         * instead of being trained away.
         */
        try {
          if (userData.role === 'student') {
            const { data: studentData, error: studentError } = await db
              .from('students')
              .select('phone, school_name')
              .eq('user_id', userId)
              .maybeSingle()

            if (studentError) console.error('[useMobileProfile] Error fetching students row:', studentError)
            if (studentData) {
              if (studentData.phone) profileData.phone = studentData.phone
              profileData.student_school = studentData.school_name ?? undefined
            }
          } else if (userData.role === 'teacher') {
            const { data: teacherData, error: teacherError } = await db
              .from('teachers')
              .select('phone')
              .eq('user_id', userId)
              .maybeSingle()

            if (teacherError) console.error('[useMobileProfile] Error fetching teachers row:', teacherError)
            if (teacherData?.phone) {
              profileData.phone = teacherData.phone
            }
          } else if (userData.role === 'parent') {
            const { data: parentData, error: parentError } = await db
              .from('parents')
              .select('phone')
              .eq('user_id', userId)
              .maybeSingle()

            if (parentError) console.error('[useMobileProfile] Error fetching parents row:', parentError)
            if (parentData?.phone) {
              profileData.phone = parentData.phone
            }
          } else if (userData.role === 'manager') {
            // Academy owners are 'manager' in users.role; there is no
            // 'academy_owner' role and no academy_owners table.
            const { data: managerData, error: managerError } = await db
              .from('managers')
              .select('phone')
              .eq('user_id', userId)
              .maybeSingle()

            if (managerError) console.error('[useMobileProfile] Error fetching managers row:', managerError)
            if (managerData?.phone) {
              profileData.phone = managerData.phone
            }
          }
        } catch (roleError) {
          console.error('[useMobileProfile] Error fetching role-specific data:', roleError)
        }

        // Get academy names
        try {
          if (academyIds && academyIds.length > 0) {
            const { data: academyData, error: academyError } = await db
              .from('academies')
              .select('name')
              .in('id', academyIds)

            if (academyError) console.error('[useMobileProfile] Error fetching academies:', academyError)
            if (academyData && academyData.length > 0) {
              const names = academyData.map(a => a.name)
              profileData.academy_names = names
              profileData.academy_name = names.join(', ')
            }
          }
        } catch (academyError) {
          console.warn('[useMobileProfile] Error fetching academy data:', academyError)
        }
      }

      // Build preferences data
      let preferencesData = { ...defaultPreferences }

      if (preferencesResult.data && !preferencesResult.error) {
        // user_preferences.email_notifications is jsonb, so it arrives as
        // `Json`. Narrow it to a plain object before reading the flags —
        // an absent flag still defaults to opted-in (!== false).
        const rawEmailNotifs = preferencesResult.data.email_notifications
        const emailNotifs: Record<string, Json | undefined> =
          rawEmailNotifs && typeof rawEmailNotifs === 'object' && !Array.isArray(rawEmailNotifs)
            ? rawEmailNotifs
            : {}
        // Same narrowing for push_categories (migration 080). The cast is
        // because database.types.ts has not been regenerated since that
        // migration; the column is `jsonb NOT NULL DEFAULT '{}'`, and a
        // row written before it existed still reads as `{}`.
        const rawPushCats = (preferencesResult.data as { push_categories?: Json | null }).push_categories
        const pushCats: Record<string, Json | undefined> =
          rawPushCats && typeof rawPushCats === 'object' && !Array.isArray(rawPushCats)
            ? rawPushCats
            : {}
        preferencesData = {
          push_notifications: preferencesResult.data.push_notifications || false,
          email_notifications: {
            assignments: emailNotifs.assignments !== false,
            grades: emailNotifs.grades !== false,
            announcements: emailNotifs.announcements !== false,
            reminders: emailNotifs.reminders !== false,
            // Same `!== false` rule as the four above, and for the same
            // reason: a student who has never touched this screen has no
            // study_recap key at all, and must keep receiving the recap
            // they already receive today.
            study_recap: emailNotifs.study_recap !== false
          },
          // FAIL OPEN. `!== false` and not `=== true`: `{}` — which is
          // what every one of the 420 existing rows holds — must read as
          // all three ENABLED. Flipping this comparison mutes the whole
          // user base on deploy, silently.
          push_categories: {
            reminders: pushCats.reminders !== false,
            progress: pushCats.progress !== false,
            social: pushCats.social !== false
          },
          language: preferencesResult.data.language || 'english'
        }
      }

      const cachedData: CachedProfileData = {
        profile: profileData,
        preferences: preferencesData
      }

      // Cache the combined data
      try {
        sessionStorage.setItem(sessionCacheKey, JSON.stringify(cachedData))
        sessionStorage.setItem(`${sessionCacheKey}-timestamp`, Date.now().toString())
      } catch (cacheError) {
        console.warn('[useMobileProfile] Failed to cache data:', cacheError)
      }

      setData(cachedData)
    } catch (err) {
      console.error('[useMobileProfile] Error fetching profile:', err)
      setError('Failed to load profile')

      // Set fallback data
      setData({
        profile: {
          id: userId,
          name: userName || 'User',
          email: '',
          role: 'student'
        },
        preferences: defaultPreferences
      })
    } finally {
      setLoading(false)
    }
  })

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!userId || !data) return

    const newPreferences = {
      ...data.preferences,
      ...updates,
      email_notifications: {
        ...data.preferences.email_notifications,
        ...(updates.email_notifications || {})
      },
      // Merged, not replaced: callers send one flipped category.
      push_categories: {
        ...data.preferences.push_categories,
        ...(updates.push_categories || {})
      }
    }

    // Optimistically update state
    setData({
      ...data,
      preferences: newPreferences
    })

    setPreferencesLoading(true)

    try {
      // Built as a variable rather than inline so the extra
      // `push_categories` key survives: database.types.ts predates
      // migration 080, and an object LITERAL would be excess-property
      // checked against the stale Insert type.
      //
      // The key must be in this payload. A category that renders,
      // toggles and optimistically updates state but never reaches the
      // upsert is the exact bug this feature exists to fix — the setting
      // appears to save and does nothing.
      const upsertPayload = {
        user_id: userId,
        push_notifications: newPreferences.push_notifications,
        email_notifications: newPreferences.email_notifications,
        push_categories: newPreferences.push_categories,
        language: newPreferences.language
      }
      const { error } = await db
        .from('user_preferences')
        .upsert(upsertPayload)

      if (error) {
        console.error('[useMobileProfile] Error updating preferences:', error)
        // Revert on error
        setData(data)
      } else {
        // Update cache with new preferences
        const sessionCacheKey = `mobile-profile-${userId}`
        const cachedData: CachedProfileData = {
          profile: data.profile,
          preferences: newPreferences
        }
        sessionStorage.setItem(sessionCacheKey, JSON.stringify(cachedData))
        sessionStorage.setItem(`${sessionCacheKey}-timestamp`, Date.now().toString())
      }
    } catch (error) {
      console.error('[useMobileProfile] Error updating preferences:', error)
      setData(data)
    } finally {
      setPreferencesLoading(false)
    }
  }, [userId, data])

  const updatePhone = useCallback(async (rawPhone: string): Promise<boolean> => {
    if (!userId || !data) return false
    const phone = rawPhone.trim() || null

    // users.phone always (the only home for academy-less study accounts).
    const { error: usersError } = await db
      .from('users')
      .update({ phone })
      .eq('id', userId)
    if (usersError) {
      console.error('[useMobileProfile] Error updating users.phone:', usersError)
      return false
    }

    // Role table too, when a row exists — keeps academy surfaces (which
    // read the role tables) in sync. A 0-row update is a silent no-op.
    const roleTable = data.profile.role === 'student' ? 'students' :
                      data.profile.role === 'teacher' ? 'teachers' :
                      data.profile.role === 'parent' ? 'parents' :
                      data.profile.role === 'manager' ? 'managers' : null
    if (roleTable) {
      const { error: roleError } = await db
        .from(roleTable)
        .update({ phone })
        .eq('user_id', userId)
      if (roleError) console.warn(`[useMobileProfile] Error updating ${roleTable}.phone:`, roleError)
    }

    const cachedData: CachedProfileData = {
      profile: { ...data.profile, phone: phone || undefined },
      preferences: data.preferences
    }
    setData(cachedData)
    try {
      const sessionCacheKey = `mobile-profile-${userId}`
      sessionStorage.setItem(sessionCacheKey, JSON.stringify(cachedData))
      sessionStorage.setItem(`${sessionCacheKey}-timestamp`, Date.now().toString())
    } catch { /* cache best-effort */ }
    return true
  }, [userId, data])

  /**
   * Self-service name change for students and parents.
   *
   * Before this, mobile users had NO way to change their own name — the only
   * writer of users.name was the manager-facing dashboard settings page,
   * which students and parents never see. That matters more than it sounds:
   * this population IS the re-prompt cohort (150 parents whose name is a
   * relationship label like "강하준 아버지", plus the junk/one-token rows), so
   * this editor is also their only fix path.
   *
   * buildNameUpdate() writes family_name, given_name and name together and
   * stamps name_confirmed_at, which is what stops the re-prompt returning.
   */
  const updateName = useCallback(async (familyName: string, givenName: string): Promise<boolean> => {
    if (!userId || !data) return false
    if (validateFamilyName(familyName) || validateGivenName(givenName)) return false

    const payload = buildNameUpdate(familyName, givenName)
    const { error } = await db.from('users').update(payload).eq('id', userId)
    if (error) {
      console.error('[useMobileProfile] Error updating name:', error)
      return false
    }

    const cachedData: CachedProfileData = {
      profile: {
        ...data.profile,
        name: payload.name,
        family_name: payload.family_name,
        given_name: payload.given_name,
        name_confirmed_at: payload.name_confirmed_at
      },
      preferences: data.preferences
    }
    setData(cachedData)
    try {
      const sessionCacheKey = `mobile-profile-${userId}`
      sessionStorage.setItem(sessionCacheKey, JSON.stringify(cachedData))
      sessionStorage.setItem(`${sessionCacheKey}-timestamp`, Date.now().toString())
    } catch { /* cache best-effort */ }
    return true
  }, [userId, data])

  /* Re-read when someone else writes this user's profile row.
     The social-onboarding step is mounted by AuthWrapper, a different
     tree entirely, so without this a user finishes onboarding and lands
     here still seeing the provider's nickname and a blank phone until a
     hard reload. The store publishes a counter, not the values — what
     renders is what the server actually stored. */
  const profileVersion = useSyncExternalStore(
    subscribeProfileRefresh,
    getProfileRefreshSnapshot,
    getProfileRefreshServerSnapshot,
  )

  // Fetch on mount, when userId changes, and when the profile is written
  useEffect(() => {
    if (userId) {
      fetchProfileData()
    }
  }, [userId, profileVersion])

  // Clear cache when userId changes (for parent switching students)
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && userId) {
        const prevCacheKey = `mobile-profile-${userId}`
        // We don't clear here because the cleanup would run on every render
        // Instead we clear in PersistentMobileAuth when user logs out
      }
    }
  }, [userId])

  return {
    profile: data?.profile || null,
    preferences: data?.preferences || defaultPreferences,
    loading,
    preferencesLoading,
    error,
    refetch: fetchProfileData,
    updatePreferences,
    updatePhone,
    updateName
  }
}
