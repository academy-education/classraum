"use client"

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/supabase'
import type { Json } from '@/lib/database.types'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { languageNames, type SupportedLanguage } from '@/locales'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { NameFields, validateNameFields } from '@/components/ui/name-fields'
import { splitName, buildNameUpdate, hasSplitName } from '@/lib/name'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  User,
  Bell,
  Palette,
  Globe,
  Shield,
  Smartphone,
  Mail,
  Key,
  Download,
  AlertTriangle,
  X,
  Building2,
  Upload,
  Trash2,
  Loader2
} from 'lucide-react'
import Image from 'next/image'
// All cache helpers come from one tiny module — previously these imports
// pulled the entire bundle for each page (~10 page modules), which alone
// pushed /settings First Load JS to ~666 kB. See src/lib/cache.ts.
import {
  invalidateSessionsCache,
  invalidateAssignmentsCache,
  invalidateAttendanceCache,
  invalidateTeachersCache,
  invalidateStudentsCache,
  invalidateParentsCache,
  invalidateFamiliesCache,
  invalidatePaymentsCache,
  invalidateReportsCache,
  invalidateClassroomsCache,
  invalidateArchiveCache,
} from '@/lib/cache'
import { useToast } from '@/hooks/use-toast'
import { resetWelcomeSeen } from '@/components/ui/welcome-modal'
import { startSetupTour } from '@/components/ui/onboarding/SetupTour'

// Mirrors public.user_preferences: every column except user_id is nullable,
// and the three settings blobs are jsonb (Json), not narrower shapes.
interface UserPreferences {
  user_id: string
  push_notifications: boolean | null
  language: string | null
  theme: string | null
  email_notifications: Json
  timezone: string | null
  date_format: string | null
  login_notifications: boolean | null
  two_factor_enabled: boolean | null
  display_density: string | null
  auto_logout_minutes: number | null
  dashboard_widgets: Json
  dashboard_layout: Json
  default_view: string | null
  created_at: string | null
  updated_at: string | null
}

interface UserData {
  id: string
  /**
   * The authoritative single-string name. Still NOT NULL in the database and
   * still written on every save — it is the fallback for the 191 rows whose
   * split columns are NULL and what all 8 PortOne sites pass to the issuer.
   */
  name: string
  /** 성. NULL until the user (or the backfill) supplies it. */
  family_name?: string | null
  /** 이름. NULL until the user (or the backfill) supplies it. */
  given_name?: string | null
  name_confirmed_at?: string | null
  email: string
  role: string
  academy_id?: string
  academyId?: string  // In case the column is camelCase
  // users.phone / created_at / updated_at and the role tables' phone are all
  // nullable columns, so these are `| null`, not merely optional.
  phone?: string | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: unknown  // Allow any other fields from the database
}

interface SettingsPageProps {
  userId: string
}

export function SettingsPage({ userId }: SettingsPageProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { language: currentLanguage, setLanguage: setCurrentLanguage } = useLanguage()
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('account')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [originalUserData, setOriginalUserData] = useState<UserData | null>(null)
  // 성/이름 are REAL state, not a derived split of `name`. The old form
  // rendered `name.split(' ')[0]` / `.slice(1).join(' ')` and re-joined on
  // every keystroke, which cannot work for a Korean name (no space -> the
  // 이름 box was permanently empty and typing into it corrupted the name).
  const [familyName, setFamilyName] = useState('')
  const [givenName, setGivenName] = useState('')
  // What the database currently holds, for change detection. '' when NULL.
  const [savedNamePair, setSavedNamePair] = useState({ family: '', given: '' })
  // True when the values on screen came from splitName() rather than from the
  // columns — a guess the user is asked to eyeball before saving.
  const [nameNeedsConfirmation, setNameNeedsConfirmation] = useState(false)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [pendingSection, setPendingSection] = useState<string | null>(null)
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')
  // Phase 3: if the user is the sole manager of any academy, an extra
  // confirmation toggle is required before they can submit.
  const [deletionEligibility, setDeletionEligibility] = useState<{
    requiresCascadeConfirmation: boolean
    soleManagedAcademies: Array<{
      academyId: string
      academyName: string
      otherMemberCount: number
    }>
  } | null>(null)
  const [confirmCascadeAcademy, setConfirmCascadeAcademy] = useState(false)

  // Logo upload state
  const [academyLogo, setAcademyLogo] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [removingLogo, setRemovingLogo] = useState(false)

  // Validation functions
  const validateEmail = (email: string): string | null => {
    if (!email) return String(t('validation.emailRequired'))
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return String(t('validation.emailInvalid'))
    return null
  }

  const validatePhone = async (phone: string, userId: string): Promise<string | null> => {
    if (!phone) return null // Phone is optional

    // First check format (allow numbers starting with 0 for Korean phones like 010-xxxx-xxxx)
    const phoneRegex = /^[\+]?[\d]{7,15}$/
    if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      return String(t('validation.phoneInvalid'))
    }

    // Then check uniqueness
    const isUnique = await checkPhoneUniqueness(phone, userId)
    if (!isUnique) {
      return String(t('validation.phoneAlreadyExists'))
    }

    return null
  }

  // Check if phone number already exists in the database (system-wide across all roles)
  const checkPhoneUniqueness = async (phone: string, currentUserId: string): Promise<boolean> => {
    if (!phone || phone.trim() === '') return true // Empty phone is allowed

    try {
      // Check all 4 role tables in parallel
      const [managersResult, teachersResult, parentsResult, studentsResult] = await Promise.all([
        db.from('managers').select('user_id, phone').eq('phone', phone).neq('user_id', currentUserId).single(),
        db.from('teachers').select('user_id, phone').eq('phone', phone).neq('user_id', currentUserId).single(),
        db.from('parents').select('user_id, phone').eq('phone', phone).neq('user_id', currentUserId).single(),
        db.from('students').select('user_id, phone').eq('phone', phone).neq('user_id', currentUserId).single()
      ])

      // If any query returned data (not PGRST116 "not found" error), phone exists
      if (managersResult.data || teachersResult.data || parentsResult.data || studentsResult.data) {
        return false // Phone already exists
      }

      return true // Phone is available
    } catch (error) {
      console.error('Error checking phone uniqueness:', error)
      return true // On error, allow to proceed (don't block user)
    }
  }

  const validateUserData = async (): Promise<boolean> => {
    if (!userData || !userId) return false

    const errors: Record<string, string> = {}

    // Per field, and NOT through the old single-field rule: its
    // `validation.nameTooShort` (minimum 2 characters) would reject a
    // 1-character 성, which is the normal Korean case (111 of 444 accounts
    // are 김). validateNameFields returns translation keys.
    const nameErrors = validateNameFields(familyName, givenName)
    if (nameErrors.familyName) errors.familyName = String(t(nameErrors.familyName))
    if (nameErrors.givenName) errors.givenName = String(t(nameErrors.givenName))

    // Validate phone number (format and uniqueness)
    const phoneError = await validatePhone(userData.phone || '', userId)
    if (phoneError) errors.phone = phoneError

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Clear validation error when user starts typing
  const clearError = (field: string) => {
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Check if user data has changed
  // The two name fields live outside userData, so they are passed in
  // explicitly: a setState from the same event handler is not visible here yet.
  const checkForUnsavedChanges = (
    newUserData: UserData | null,
    nextFamilyName: string = familyName,
    nextGivenName: string = givenName
  ) => {
    if (!originalUserData || !newUserData) {
      setHasUnsavedChanges(false)
      return
    }

    // Check if name or phone has changed (email is still disabled)
    const hasChanged = originalUserData.name !== newUserData.name ||
                      originalUserData.phone !== newUserData.phone ||
                      nextFamilyName.trim() !== savedNamePair.family ||
                      nextGivenName.trim() !== savedNamePair.given

    setHasUnsavedChanges(hasChanged)
  }

  // Handle section change with unsaved changes warning
  const handleSectionChange = (sectionId: string) => {
    if (hasUnsavedChanges && activeSection === 'account') {
      setPendingSection(sectionId)
      setShowUnsavedModal(true)
      return
    }
    setActiveSection(sectionId)
    setHasUnsavedChanges(false)
    setValidationErrors({})
  }

  // Handle confirmation of section change
  const handleConfirmSectionChange = () => {
    if (pendingSection) {
      setActiveSection(pendingSection)
      setHasUnsavedChanges(false)
      setValidationErrors({})
      // Reset user data to original
      if (originalUserData) {
        setUserData(originalUserData)
        seedNameFields(originalUserData)
      }
    }
    setShowUnsavedModal(false)
    setPendingSection(null)
  }

  // Handle cancellation of section change
  const handleCancelSectionChange = () => {
    setShowUnsavedModal(false)
    setPendingSection(null)
  }

  // Fetch deletion eligibility when the modal opens so we can show the
  // right warnings (and the extra cascade-confirmation toggle for sole
  // managers).
  useEffect(() => {
    if (!showDeleteAccountModal) {
      setDeletionEligibility(null)
      setConfirmCascadeAcademy(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const { data: { session } } = await db.auth.getSession()
        if (!session?.access_token) return
        const res = await fetch('/api/account/check-deletion-eligibility', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (res.ok && data?.canDelete) {
          setDeletionEligibility({
            requiresCascadeConfirmation:
              data.requiresCascadeConfirmation === true,
            soleManagedAcademies: data.soleManagedAcademies ?? [],
          })
        }
      } catch (err) {
        console.warn('[settings] eligibility check failed:', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [showDeleteAccountModal])

  // Handle account deletion. Schedules a 30-day soft-delete:
  // 1. POST /api/account/delete (requires email confirmation matching the
  //    signed-in user's email) — server sets users.deletion_scheduled_at +
  //    bans the auth identity + writes an audit log row.
  // 2. Sign the user out (their existing session is still live until they
  //    sign out, but the ban prevents future sign-ins).
  // 3. Redirect to /account/goodbye, which explains the 30-day window and
  //    offers a reactivation path.
  const handleDeleteAccount = async () => {
    if (!deleteConfirmEmail || deleteConfirmEmail.trim().toLowerCase() !== (userData?.email || '').toLowerCase()) {
      toast({
        title: String(t('settings.dataStorage.deleteAccountEmailMismatch')),
        variant: 'destructive',
      })
      return
    }

    setDeletingAccount(true)
    try {
      const { data: { session } } = await db.auth.getSession()
      if (!session?.access_token) {
        toast({ title: String(t('settings.dataStorage.deleteAccountError')), variant: 'destructive' })
        setDeletingAccount(false)
        return
      }

      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          confirmEmail: deleteConfirmEmail.trim(),
          // Only send the academy cascade flag when both the eligibility
          // check said it's required AND the user explicitly toggled it.
          // The server re-validates regardless.
          confirmCascadeAcademy:
            deletionEligibility?.requiresCascadeConfirmation === true &&
            confirmCascadeAcademy,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        console.error('[settings] account delete failed:', data)
        toast({
          title: String(t('settings.dataStorage.deleteAccountError')),
          description: (data as { error?: string })?.error,
          variant: 'destructive',
        })
        setDeletingAccount(false)
        return
      }

      // Clear local caches before signing out so a leftover cache entry
      // doesn't leak data into the next session on the same device.
      // Clear both localStorage and sessionStorage — aligns with the
      // mobile profile flow (security review I4).
      if (typeof window !== 'undefined') {
        try { localStorage.clear() } catch {}
        try { sessionStorage.clear() } catch {}
      }

      await db.auth.signOut()
      window.location.href = '/account/goodbye'
    } catch (error) {
      console.error('Error deleting account:', error)
      toast({ title: String(t('settings.dataStorage.deleteAccountError')), variant: 'destructive' })
      setDeletingAccount(false)
    }
  }

  /**
   * Seed the two name inputs from a freshly-loaded users row.
   *
   * Precedence: the columns when BOTH are present; otherwise the owner's
   * split rule applied to `users.name`; otherwise nothing. splitName()
   * returns null for every shape it cannot do confidently (relationship
   * labels, one-token Latin, 3+ token Latin, a bare 1-syllable 성, 다니엘),
   * and that null is the signal to ask — so the boxes are left EMPTY rather
   * than pre-filled with a guess the user might accept without reading.
   */
  const seedNameFields = useCallback((data: UserData) => {
    const family = typeof data.family_name === 'string' ? data.family_name.trim() : ''
    const given = typeof data.given_name === 'string' ? data.given_name.trim() : ''
    setSavedNamePair({ family, given })

    if (family && given) {
      setFamilyName(family)
      setGivenName(given)
      setNameNeedsConfirmation(false)
      return
    }

    const guess = splitName(data.name)
    setFamilyName(guess?.family_name ?? '')
    setGivenName(guess?.given_name ?? '')
    setNameNeedsConfirmation(!!guess?.needsConfirmation)
  }, [])

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    if (!userId || userId === '') {
      return
    }
    
    try {
      const { data, error } = await db
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user data:', error)
        throw error
      }

      if (!data) {
        console.error('No user data returned for userId:', userId)
        return
      }

      setUserData(data)
      setOriginalUserData(data) // Store original data for comparison
      seedNameFields(data)

      // Also fetch additional role-specific data (like phone)
      if (data.role === 'teacher') {
        const { data: teacherData, error: teacherError } = await db
          .from('teachers')
          .select('phone')
          .eq('user_id', userId)
          .single()
        
        if (teacherData && !teacherError) {
          const updatedData = { ...data, phone: teacherData.phone }
          setUserData(updatedData)
          setOriginalUserData(updatedData)
        }
      } else if (data.role === 'parent') {
        const { data: parentData, error: parentError } = await db
          .from('parents')
          .select('phone')
          .eq('user_id', userId)
          .single()
        
        if (parentData && !parentError) {
          const updatedData = { ...data, phone: parentData.phone }
          setUserData(updatedData)
          setOriginalUserData(updatedData)
        }
      } else if (data.role === 'student') {
        const { data: studentData, error: studentError } = await db
          .from('students')
          .select('phone')
          .eq('user_id', userId)
          .single()
        
        if (studentData && !studentError) {
          const updatedData = { ...data, phone: studentData.phone }
          setUserData(updatedData)
          setOriginalUserData(updatedData)
        }
      } else if (data.role === 'manager') {
        const { data: managerData, error: managerError } = await db
          .from('managers')
          .select('phone, academy_id')
          .eq('user_id', userId)
          .single()
        
        if (managerData && !managerError) {
          const updatedData = { ...data, phone: managerData.phone, academy_id: managerData.academy_id }
          setUserData(updatedData)
          setOriginalUserData(updatedData)
        }
      }

    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }, [userId, seedNameFields])

  // Fetch user preferences
  const fetchPreferences = useCallback(async () => {
    if (!userId || userId === '') {
      return
    }
    try {
      const { data, error } = await db
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setPreferences(data)
      } else {
        // Create default preferences if none exist
        const { data: newPrefs, error: createError } = await db
          .from('user_preferences')
          .insert({
            user_id: userId,
            push_notifications: true,
            language: 'english',
            theme: 'system',
            email_notifications: {
              session_updates: true,
              attendance_alerts: true,
              family_activities: true,
              billing_updates: true
            },
            timezone: 'America/New_York',
            date_format: 'MM/DD/YYYY',
            login_notifications: true,
            two_factor_enabled: false,
            display_density: 'comfortable',
            auto_logout_minutes: 480,
            dashboard_widgets: ['stats', 'chart', 'recent_activity'],
            default_view: 'dashboard'
          })
          .select()
          .single()

        if (createError) throw createError
        setPreferences(newPrefs)
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
      toast({ title: t('settings.errorLoadingSettings'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [userId, t])

  useEffect(() => {
    const loadData = async () => {
      // Don't try to load data if userId is not available yet
      if (!userId || userId === '') {
        return
      }

      // Only show loading on initial load and navigation, not on true tab return
      if (!simpleTabDetection.isTrueTabReturn()) {
        setLoading(true)
      }

      await Promise.all([
        fetchUserData(),
        fetchPreferences()
      ])
    }
    loadData()
  }, [userId, fetchUserData, fetchPreferences])

  // Update user data
  const saveUserData = async () => {
    if (!userData || !userId) return

    // Validate before saving
    const isValid = await validateUserData()
    if (!isValid) {
      // Show toast error if phone validation failed
      if (validationErrors.phone) {
        toast({ title: String(t('validation.phoneAlreadyExistsToast')), variant: 'destructive' })
      }
      return
    }

    setSaving(true)
    try {
      // 성, 이름 AND the joined `name` in the SAME statement. `users.name`
      // never stops being written: it is NOT NULL, it is the fallback for
      // every row whose split columns are NULL, and it is the string all 8
      // PortOne call sites hand to the card issuer.
      const nameUpdate = buildNameUpdate(familyName, givenName)
      const updateData: Record<string, unknown> = { ...nameUpdate }

      // Only add updated_at if it exists in the original data
      if ('updated_at' in userData) {
        updateData.updated_at = new Date().toISOString()
      }

      // Update main users table
      const { error: userError } = await db
        .from('users')
        .update(updateData)
        .eq('id', userId)

      if (userError) throw userError

      // Update phone number in the appropriate role table
      // Only these four per-role tables exist. The old
      // `${userData.role.toLowerCase()}s` template also produced 'admins' /
      // 'super_admins' for admin roles, which are not tables — that write
      // silently 404'd instead of saving the phone number.
      const role = userData.role.toLowerCase()
      const roleTable =
        role === 'manager' ? 'managers' as const :
        role === 'teacher' ? 'teachers' as const :
        role === 'parent' ? 'parents' as const :
        role === 'student' ? 'students' as const :
        null

      if (roleTable) {
        const { error: phoneError } = await db
          .from(roleTable)
          .update({
            phone: userData.phone || null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (phoneError) {
          console.error('Error updating phone in role table:', phoneError)
          throw phoneError
        }
      }

      // Invalidate all caches that might display user names
      // This ensures names update everywhere immediately
      const academyId = userData.academy_id || userData.academyId
      if (academyId) {
        invalidateSessionsCache(academyId)
        invalidateAssignmentsCache(academyId)
        invalidateAttendanceCache(academyId)
        invalidateTeachersCache(academyId)
        invalidateStudentsCache(academyId)
        invalidateParentsCache(academyId)
        invalidateFamiliesCache(academyId)
        invalidatePaymentsCache(academyId)
        invalidateReportsCache(academyId)
        invalidateClassroomsCache(academyId)
        invalidateArchiveCache(academyId)
      }

      // Reset unsaved changes tracking against what was actually written.
      const savedUserData: UserData = {
        ...userData,
        name: nameUpdate.name,
        family_name: nameUpdate.family_name,
        given_name: nameUpdate.given_name,
        name_confirmed_at: nameUpdate.name_confirmed_at,
      }
      setUserData(savedUserData)
      setOriginalUserData(savedUserData)
      setFamilyName(nameUpdate.family_name)
      setGivenName(nameUpdate.given_name)
      setSavedNamePair({ family: nameUpdate.family_name, given: nameUpdate.given_name })
      setNameNeedsConfirmation(false)
      setHasUnsavedChanges(false)
      setValidationErrors({})

      // Show success message
      toast({ title: String(t('success.saved')), variant: 'success' })

    } catch (error) {
      console.error('Error saving user data:', error)
      toast({ title: t('common.error'), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Update preferences
  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!preferences || !userId) return

    setSaving(true)
    try {
      const { data, error } = await db
        .from('user_preferences')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single()

      if (error) throw error
      
      setPreferences(data)
      
      // Show success message briefly
      toast({ title: String(t('settings.settingsSaved')), variant: 'success' })

    } catch (error) {
      console.error('Error updating preferences:', error)
      toast({ title: t('settings.errorSavingSettings'), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Fetch academy logo
  const fetchAcademyLogo = useCallback(async () => {
    const academyId = userData?.academy_id || userData?.academyId
    if (!academyId) return

    try {
      const { data, error } = await db
        .from('academies')
        .select('logo_url')
        .eq('id', academyId)
        .single()

      if (error) throw error
      setAcademyLogo(data?.logo_url || null)
    } catch (error) {
      console.error('Error fetching academy logo:', error)
    }
  }, [userData?.academy_id, userData?.academyId])

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const academyId = userData?.academy_id || userData?.academyId
    if (!academyId) {
      toast({ title: t('settings.branding.noAcademyError'), variant: 'warning' })
      return
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast({ title: t('settings.branding.invalidFileType'), variant: 'warning' })
      return
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      toast({ title: t('settings.branding.fileTooLarge'), variant: 'warning' })
      return
    }

    setUploadingLogo(true)
    try {
      // Generate file path
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
      const filePath = `${academyId}/logo.${fileExt}`

      // Delete old logo if exists
      if (academyLogo) {
        const oldPath = academyLogo.split('/academy-logos/')[1]
        if (oldPath) {
          await db.storage.from('academy-logos').remove([oldPath])
        }
      }

      // Upload new logo
      const { error: uploadError } = await db.storage
        .from('academy-logos')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = db.storage
        .from('academy-logos')
        .getPublicUrl(filePath)

      // Update academy record
      const { error: updateError } = await db
        .from('academies')
        .update({ logo_url: publicUrl })
        .eq('id', academyId)

      if (updateError) throw updateError

      setAcademyLogo(publicUrl)

      // Dispatch event to notify layout to update sidebar logo
      window.dispatchEvent(new CustomEvent('academyLogoUpdated', { detail: { logoUrl: publicUrl } }))

      // Show success message
      toast({ title: String(t('settings.branding.logoUploaded')), variant: 'success' })

    } catch (error) {
      console.error('Error uploading logo:', error)
      toast({ title: t('settings.branding.uploadError'), variant: 'destructive' })
    } finally {
      setUploadingLogo(false)
      // Reset file input
      event.target.value = ''
    }
  }

  // Handle logo removal
  const handleRemoveLogo = async () => {
    const academyId = userData?.academy_id || userData?.academyId
    if (!academyId || !academyLogo) return

    setRemovingLogo(true)
    try {
      // Extract file path from URL
      const pathMatch = academyLogo.split('/academy-logos/')[1]
      if (pathMatch) {
        await db.storage.from('academy-logos').remove([pathMatch])
      }

      // Clear logo_url in database
      const { error: updateError } = await db
        .from('academies')
        .update({ logo_url: null })
        .eq('id', academyId)

      if (updateError) throw updateError

      setAcademyLogo(null)

      // Dispatch event to notify layout to update sidebar logo
      window.dispatchEvent(new CustomEvent('academyLogoUpdated', { detail: { logoUrl: null } }))

      // Show success message
      toast({ title: String(t('settings.branding.logoRemoved')), variant: 'success' })

    } catch (error) {
      console.error('Error removing logo:', error)
      toast({ title: t('settings.branding.removeError'), variant: 'destructive' })
    } finally {
      setRemovingLogo(false)
    }
  }

  // Fetch academy logo when userData changes
  useEffect(() => {
    if (userData?.role === 'manager') {
      fetchAcademyLogo()
    }
  }, [userData?.role, fetchAcademyLogo])

  // The split columns are still NULL for this account, but both boxes now
  // hold something: Save must be enabled even though nothing was "changed",
  // otherwise a pre-filled guess could never be confirmed.
  const nameColumnsMissing = !hasSplitName(userData)
  const canConfirmName =
    nameColumnsMissing && familyName.trim().length > 0 && givenName.trim().length > 0

  const sections = [
    { id: 'account', label: t('settings.sections.account'), icon: User },
    // Show branding section only for managers
    ...(userData?.role === 'manager' ? [{ id: 'branding', label: t('settings.sections.branding'), icon: Building2 }] : []),
    { id: 'notifications', label: t('settings.sections.notifications'), icon: Bell },
    { id: 'appearance', label: t('settings.sections.appearance'), icon: Palette },
    { id: 'language', label: t('settings.sections.language'), icon: Globe },
    // { id: 'privacy', label: t('settings.sections.privacy'), icon: Shield }, // Hidden for now
    // { id: 'devices', label: t('settings.sections.devices'), icon: Smartphone }, // Hidden for now
    { id: 'data', label: t('settings.sections.data'), icon: Download },
  ]

  // Show loading if we're fetching data OR if userId is not available yet
  if (loading || !userId || userId === '') {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="hidden sm:block text-2xs font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{t('eyebrows.settings')}</p>
            <h1 className="text-xl sm:text-3xl font-semibold tracking-tight text-gray-900">{t('settings.title')}</h1>
            <p className="hidden sm:block text-gray-500">{t('settings.description')}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Mobile: Horizontal scrollable tabs */}
          <div className="lg:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse flex-shrink-0"></div>
              ))}
            </div>
          </div>
          {/* Desktop: Sidebar */}
          <div className="hidden lg:block lg:col-span-3">
            <Card className="p-4">
              <div className="space-y-2">
                {[1,2,3,4,5,6,7].map(i => (
                  <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </Card>
          </div>
          <div className="lg:col-span-9">
            <Card className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="hidden sm:block text-2xs font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">{t('eyebrows.settings')}</p>
          <h1 className="text-xl sm:text-3xl font-semibold tracking-tight text-gray-900">{t('settings.title')}</h1>
          <p className="hidden sm:block text-gray-500">{t('settings.description')}</p>
        </div>
      </div>

      {/* Settings Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Mobile: Horizontal scrollable tabs */}
        <div className="lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => handleSectionChange(section.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex-shrink-0 ${
                  activeSection === section.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Desktop: Sidebar Navigation */}
        <div className="hidden lg:block lg:col-span-3">
          <Card className="p-2">
            <nav className="space-y-0.5">
              {sections.map((section) => {
                const isActive = activeSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id)}
                    className={`group relative w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-gray-700 hover:bg-gray-50 font-medium'
                    }`}
                  >
                    {/* Active accent bar */}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r bg-primary" />
                    )}
                    <section.icon
                      className={`w-4 h-4 transition-colors ${
                        isActive ? 'text-primary' : 'text-gray-500 group-hover:text-primary'
                      }`}
                      strokeWidth={isActive ? 2 : 1.75}
                    />
                    {section.label}
                  </button>
                )
              })}
            </nav>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9">
          <Card className="p-4 sm:p-6">
            {activeSection === 'account' && userData && (
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-5 pb-3 border-b border-gray-100">{t('settings.account.title')}</h2>
                <div className="space-y-6">
                  <NameFields
                    korean={currentLanguage === 'korean'}
                    t={t}
                    required
                    idPrefix="settings-name"
                    familyName={familyName}
                    givenName={givenName}
                    familyNameError={validationErrors.familyName}
                    givenNameError={validationErrors.givenName}
                    onFamilyNameChange={(value) => {
                      setFamilyName(value)
                      checkForUnsavedChanges(userData, value, givenName)
                      clearError('familyName')
                    }}
                    onGivenNameChange={(value) => {
                      setGivenName(value)
                      checkForUnsavedChanges(userData, familyName, value)
                      clearError('givenName')
                    }}
                    hint={
                      nameNeedsConfirmation ? (
                        <p className="text-xs text-amber-600">{t('names.confirmHint')}</p>
                      ) : undefined
                    }
                  />

                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      {t('settings.account.emailAddress')}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={userData.email || ''}
                      disabled
                      className="mt-1 bg-gray-50"
                      placeholder={String(t('settings.account.enterEmailAddress'))}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('settings.account.emailCannotBeChanged')}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      {t('settings.account.phoneNumberOptional')}
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={userData.phone || ''}
                      onChange={(e) => {
                        const newUserData = userData ? { ...userData, phone: e.target.value } : null
                        setUserData(newUserData)
                        checkForUnsavedChanges(newUserData)
                        clearError('phone')
                      }}
                      className={`mt-1 ${validationErrors.phone ? 'border-rose-500 focus:border-rose-500' : ''}`}
                      placeholder={String(t('settings.account.enterPhoneNumber'))}
                    />
                    {validationErrors.phone && (
                      <p className="text-sm text-rose-600 mt-1">{validationErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      {t('common.role')}
                    </Label>
                    <Input
                      type="text"
                      value={userData.role ? t(`common.roles.${userData.role.toLowerCase()}`) : ''}
                      disabled
                      className="mt-1 bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('common.roleCannotBeChanged')}
                    </p>
                  </div>

                  <div className="pt-4 flex items-center gap-3">
                    <Button 
                      onClick={saveUserData} 
                      disabled={saving || (!hasUnsavedChanges && !canConfirmName)}
                      className={hasUnsavedChanges ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                      {saving ? t('settings.account.saving') : t('settings.account.saveChanges')}
                    </Button>
                    {hasUnsavedChanges && (
                      <span className="text-sm text-amber-600 font-medium">
                        • {t('settings.unsavedChanges')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'branding' && userData?.role === 'manager' && (
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-5 pb-3 border-b border-gray-100">{t('settings.branding.title')}</h2>
                <div className="space-y-6">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {academyLogo ? (
                          <div className="relative w-40 h-16 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                            <Image
                              src={academyLogo}
                              alt="Academy Logo"
                              fill
                              className="object-contain p-2"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-40 h-16 bg-gray-100 rounded-lg border border-dashed border-gray-300 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{t('settings.branding.academyLogo')}</h3>
                        <p className="text-sm text-gray-500 mt-1">{t('settings.branding.logoDescription')}</p>
                        <p className="text-xs text-gray-400 mt-1">{t('settings.branding.logoHint')}</p>
                        <div className="flex items-center gap-2 mt-3">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                              onChange={handleLogoUpload}
                              className="hidden"
                              disabled={uploadingLogo}
                            />
                            <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                              uploadingLogo
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-primary text-white hover:bg-primary/90 cursor-pointer'
                            }`}>
                              {uploadingLogo ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  {t('settings.branding.uploading')}
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  {academyLogo ? t('settings.branding.changeLogo') : t('settings.branding.uploadLogo')}
                                </>
                              )}
                            </span>
                          </label>
                          {academyLogo && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleRemoveLogo}
                              disabled={removingLogo}
                              className="text-rose-600 border-red-200 hover:bg-rose-50 hover:text-rose-700"
                            >
                              {removingLogo ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  {t('settings.branding.removeLogo')}
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      {t('settings.branding.sidebarNote')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && preferences && (
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-5 pb-3 border-b border-gray-100">{t('settings.notificationPreferences.title')}</h2>
                <div className="space-y-6">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-900">{t('settings.notificationPreferences.pushNotifications')}</h3>
                    <p className="text-sm text-gray-500 mt-1">{t('settings.notificationPreferences.pushNotificationsDeviceDesc')}</p>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h3 className="font-medium text-gray-900">{t('settings.notificationPreferences.inAppNotifications')}</h3>
                    <p className="text-sm text-gray-500 mt-1">{t('settings.notificationPreferences.inAppNotificationsDesc')}</p>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'appearance' && preferences && (
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-5 pb-3 border-b border-gray-100">{t('settings.appearance.title')}</h2>
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">{t('settings.appearance.theme')}</Label>
                    <Select 
                      value={preferences?.theme || 'light'} 
                      onValueChange={(value) => updatePreferences({ theme: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">{t('settings.appearance.systemDefault')}</SelectItem>
                        <SelectItem value="light">{t('settings.appearance.lightMode')}</SelectItem>
                        <SelectItem value="dark">{t('settings.appearance.darkMode')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">{t('settings.appearance.themeDesc')}</p>
                  </div>

                  {/* Display Density - Hidden for now */}
                  {false && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">{t('settings.appearance.displayDensity')}</Label>
                    <Select
                      value={preferences?.display_density || 'comfortable'}
                      onValueChange={(value) => updatePreferences({ display_density: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">{t('settings.appearance.compact')}</SelectItem>
                        <SelectItem value="comfortable">{t('settings.appearance.comfortable')}</SelectItem>
                        <SelectItem value="spacious">{t('settings.appearance.spacious')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'language' && preferences && (
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-5 pb-3 border-b border-gray-100">{t('settings.languageRegion.title')}</h2>
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">{t('settings.languageRegion.language')}</Label>
                    <Select
                      value={preferences.language || currentLanguage}
                      onValueChange={async (value: SupportedLanguage) => {
                        // Update the UI language immediately
                        await setCurrentLanguage(value)
                        // Save to database via updatePreferences
                        await updatePreferences({ language: value })
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">🇺🇸 {languageNames.english}</SelectItem>
                        <SelectItem value="korean">🇰🇷 {languageNames.korean}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('settings.languageRegion.languageDescription')}
                    </p>
                  </div>

                  {/* Time Zone - Hidden for now */}
                  {false && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">{t('settings.languageRegion.timeZone')}</Label>
                    <Select
                      value={preferences?.timezone || 'UTC'}
                      onValueChange={(value) => updatePreferences({ timezone: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">{t('settings.languageRegion.timezones.et')}</SelectItem>
                        <SelectItem value="America/Chicago">{t('settings.languageRegion.timezones.ct')}</SelectItem>
                        <SelectItem value="America/Denver">{t('settings.languageRegion.timezones.mt')}</SelectItem>
                        <SelectItem value="America/Los_Angeles">{t('settings.languageRegion.timezones.pt')}</SelectItem>
                        <SelectItem value="Europe/London">{t('settings.languageRegion.timezones.gmt')}</SelectItem>
                        <SelectItem value="Europe/Paris">{t('settings.languageRegion.timezones.cet')}</SelectItem>
                        <SelectItem value="Asia/Seoul">{t('settings.languageRegion.timezones.kst')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  )}

                  {/* Date Format - Hidden for now */}
                  {false && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">{t('settings.languageRegion.dateFormat')}</Label>
                    <Select
                      value={preferences?.date_format || 'MM/DD/YYYY'}
                      onValueChange={(value) => updatePreferences({ date_format: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  )}

                  {/* Show welcome screen again — clears the localStorage
                      flag so the first-login welcome modal pops on next
                      mount. Useful when a user wants the orientation
                      again after dismissing it. */}
                  <div className="pt-4 border-t border-gray-100">
                    <Label className="text-sm font-medium text-gray-700">
                      {t('settings.languageRegion.welcomeReplay')}
                    </Label>
                    <p className="text-xs text-gray-500 mt-1 mb-3">
                      {t('settings.languageRegion.welcomeReplayDescription')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (userId) {
                          resetWelcomeSeen(userId)
                          // Reload so the WelcomeModal in AppLayout
                          // picks up the cleared flag and re-opens.
                          window.location.reload()
                        }
                      }}
                    >
                      {t('settings.languageRegion.welcomeReplayButton')}
                    </Button>

                  </div>

                  {/* Run the guided setup walkthrough again. Same shape
                      as the welcome replay above, but no reload is
                      needed: startSetupTour writes the flag and fires
                      the event the SetupTour in AppLayout listens on. */}
                  <div className="pt-4 border-t border-gray-100">
                    <Label className="text-sm font-medium text-gray-700">
                      {t('settings.languageRegion.setupTourReplay')}
                    </Label>
                    <p className="text-xs text-gray-500 mt-1 mb-3">
                      {t('settings.languageRegion.setupTourReplayDescription')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { if (userId) startSetupTour(userId) }}
                    >
                      {t('settings.languageRegion.setupTourReplayButton')}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'privacy' && (
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-5 pb-3 border-b border-gray-100">{t('settings.privacySecurity.title')}</h2>
                <div className="space-y-6">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{t('settings.privacySecurity.password')}</h3>
                        <p className="text-sm text-gray-500">{t('settings.privacySecurity.passwordDesc')}</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          {t('settings.privacySecurity.changePassword')}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-emerald-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{t('settings.privacySecurity.twoFactorAuth')}</h3>
                        <p className="text-sm text-gray-500">{t('settings.privacySecurity.twoFactorAuthDesc')}</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          {t('settings.privacySecurity.enable2FA')}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{t('settings.privacySecurity.loginNotifications')}</h3>
                        <p className="text-sm text-gray-500">{t('settings.privacySecurity.loginNotificationsDesc')}</p>
                        <div className="flex items-center mt-2">
                          <input 
                            type="checkbox" 
                            checked={preferences?.login_notifications ?? true}
                            onChange={(e) => updatePreferences({ login_notifications: e.target.checked })}
                            className="h-4 w-4 accent-primary border-gray-300 rounded focus:ring-primary" 
                            disabled={saving}
                          />
                          <label className="ml-2 text-sm text-gray-700">{t('settings.privacySecurity.emailNewSignins')}</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'devices' && (
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-5 pb-3 border-b border-gray-100">{t('settings.connectedDevices.title')}</h2>
                <div className="space-y-4">
                  {[
                    { name: t('settings.connectedDevices.devices.macbook'), location: t('settings.connectedDevices.locations.sanFrancisco'), lastActive: t('settings.connectedDevices.lastActive.activeNow'), current: true },
                    { name: t('settings.connectedDevices.devices.iphone'), location: t('settings.connectedDevices.locations.sanFrancisco'), lastActive: `2 ${t('settings.connectedDevices.lastActive.hoursAgo')}`, current: false },
                    { name: t('settings.connectedDevices.devices.chrome'), location: t('settings.connectedDevices.locations.newYork'), lastActive: `1 ${t('settings.connectedDevices.lastActive.dayAgo')}`, current: false }
                  ].map((device, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-gray-400" />
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {device.name} {device.current && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded ml-2">{t('settings.connectedDevices.current')}</span>}
                          </h3>
                          <p className="text-sm text-gray-500">{device.location} • {device.lastActive}</p>
                        </div>
                      </div>
                      {!device.current && (
                        <Button variant="outline" size="sm">
                          {t('settings.connectedDevices.signOut')}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'data' && (
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-gray-900 mb-5 pb-3 border-b border-gray-100">{t('settings.dataStorage.title')}</h2>
                <div className="space-y-6">
                  {/* Download Data - Hidden for now */}
                  {false && (
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Download className="w-5 h-5 text-primary mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{t('settings.dataStorage.downloadData')}</h3>
                        <p className="text-sm text-gray-500">{t('settings.dataStorage.downloadDataDesc')}</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          {t('settings.dataStorage.requestDownload')}
                        </Button>
                      </div>
                    </div>
                  </div>
                  )}

                  <div className="p-4 border border-red-200 rounded-lg bg-rose-50">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-red-900">{t('settings.dataStorage.deleteAccount')}</h3>
                        <p className="text-sm text-rose-700">{t('settings.dataStorage.deleteAccountDesc')}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 border-red-300 text-rose-700 hover:bg-red-100 hover:text-rose-700"
                          onClick={() => setShowDeleteAccountModal(true)}
                        >
                          {t('settings.dataStorage.deleteAccountButton')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Unsaved Changes Modal */}
      <ModalShell
        isOpen={showUnsavedModal}
        onClose={handleCancelSectionChange}
        size="md"
        headerSlot={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {t('settings.unsavedChangesTitle')}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {t('settings.unsavedChangesWarning')}
              </p>
            </div>
          </div>
        }
        footer={
          <ModalShell.Footer split>
            <Button variant="outline" onClick={handleCancelSectionChange}>
              {t('settings.stayOnPage')}
            </Button>
            <Button
              variant="outline"
              className="text-amber-700 ring-amber-200 hover:bg-amber-50 hover:ring-amber-300"
              onClick={handleConfirmSectionChange}
            >
              {t('settings.discardChanges')}
            </Button>
          </ModalShell.Footer>
        }
      >
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-sm text-amber-800">
            {t('settings.unsavedChangesDetail')}
          </p>
        </div>
      </ModalShell>

      {/* Delete Account Modal */}
      <ModalShell
        isOpen={showDeleteAccountModal}
        onClose={() => {
          if (!deletingAccount) {
            setShowDeleteAccountModal(false)
            setDeleteConfirmEmail('')
          }
        }}
        size="md"
        closeDisabled={deletingAccount}
        bodyClassName="space-y-3"
        headerSlot={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {t('settings.dataStorage.deleteAccountConfirmTitle')}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">
                {t('settings.dataStorage.deleteAccountConfirmSubtitle')}
              </p>
            </div>
          </div>
        }
        footer={
          <ModalShell.Footer split>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteAccountModal(false)
                setDeleteConfirmEmail('')
              }}
              disabled={deletingAccount}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="outline"
              className="text-rose-600 ring-rose-200 hover:bg-rose-50 hover:ring-rose-300"
              onClick={handleDeleteAccount}
              disabled={
                deletingAccount ||
                !deleteConfirmEmail ||
                deleteConfirmEmail.trim().toLowerCase() !== (userData?.email || '').toLowerCase() ||
                // Sole-manager: extra cascade toggle must also be checked.
                (deletionEligibility?.requiresCascadeConfirmation === true && !confirmCascadeAcademy)
              }
            >
              {deletingAccount ? (
                <span className="flex items-center">
                  <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  {t('settings.dataStorage.deletingAccount')}
                </span>
              ) : (
                t('settings.dataStorage.confirmDelete')
              )}
            </Button>
          </ModalShell.Footer>
        }
      >
        <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
          <p className="text-sm text-rose-800 font-medium mb-2">
            {t('settings.dataStorage.deleteAccountWarning')}
          </p>
          <ul className="text-xs text-rose-700 space-y-1 list-disc list-inside">
            <li>{t('settings.dataStorage.deleteAccountPoint1')}</li>
            <li>{t('settings.dataStorage.deleteAccountPoint2')}</li>
            <li>{t('settings.dataStorage.deleteAccountPoint3')}</li>
          </ul>
        </div>
        <p className="text-sm text-gray-600">
          {t('settings.dataStorage.deleteAccountFinal')}
        </p>

        {/* 30-day grace period notice */}
        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-xs text-amber-800">
            {String(t('settings.dataStorage.deleteAccountGracePeriod'))}
          </p>
        </div>

        {/* Sole-manager: academy cascade warning + extra confirmation toggle */}
        {deletionEligibility?.requiresCascadeConfirmation && (
          <div className="p-3 bg-rose-100 rounded-lg border-2 border-rose-300 space-y-2">
            <p className="text-sm font-semibold text-rose-900">
              {String(t('settings.dataStorage.deleteAccountSoleManagerTitle'))}
            </p>
            <p className="text-xs text-rose-800">
              {String(t('settings.dataStorage.deleteAccountSoleManagerDescription'))}
            </p>
            <ul className="text-xs text-rose-700 space-y-1 list-disc list-inside">
              {deletionEligibility.soleManagedAcademies.map((a) => (
                <li key={a.academyId}>
                  <strong>{a.academyName}</strong>
                  {a.otherMemberCount > 0 && (
                    <>
                      {' '}
                      —{' '}
                      {String(
                        t('settings.dataStorage.deleteAccountSoleManagerMemberCount', {
                          count: a.otherMemberCount,
                        })
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
            <label className="flex items-start gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmCascadeAcademy}
                onChange={(e) => setConfirmCascadeAcademy(e.target.checked)}
                disabled={deletingAccount}
                className="mt-0.5 w-4 h-4 text-rose-600 border-rose-400 rounded focus:ring-rose-500"
              />
              <span className="text-xs text-rose-900 font-medium">
                {String(t('settings.dataStorage.deleteAccountSoleManagerConfirmToggle'))}
              </span>
            </label>
          </div>
        )}

        {/* Email confirmation gate — prevents accidental clicks. */}
        <div className="space-y-2 pt-1">
          <label className="text-sm font-medium text-gray-700">
            {String(t('settings.dataStorage.deleteAccountTypeEmail', {
              email: userData?.email || '',
            }))}
          </label>
          <input
            type="email"
            value={deleteConfirmEmail}
            onChange={(e) => setDeleteConfirmEmail(e.target.value)}
            disabled={deletingAccount}
            placeholder={userData?.email || ''}
            autoComplete="off"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent disabled:bg-gray-100"
          />
        </div>
      </ModalShell>
    </div>
  )
}