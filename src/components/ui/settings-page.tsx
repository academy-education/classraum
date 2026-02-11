"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { languageNames, type SupportedLanguage } from '@/locales'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
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
import { invalidateSessionsCache } from '@/components/ui/sessions-page'
import { invalidateAssignmentsCache } from '@/components/ui/assignments-page'
import { invalidateAttendanceCache } from '@/components/ui/attendance-page'
import { invalidateTeachersCache } from '@/components/ui/teachers-page'
import { invalidateStudentsCache } from '@/hooks/useStudentData'
import { invalidateParentsCache } from '@/components/ui/parents-page'
import { invalidateFamiliesCache } from '@/components/ui/families-page'
import { invalidatePaymentsCache } from '@/components/ui/payments-page'
import { invalidateReportsCache } from '@/components/ui/reports-page'
import { invalidateClassroomsCache } from '@/components/ui/classrooms-page'
import { invalidateArchiveCache } from '@/components/ui/archive-page'

interface UserPreferences {
  user_id: string
  push_notifications: boolean
  language: string
  theme: string
  email_notifications: {
    session_updates: boolean
    attendance_alerts: boolean
    family_activities: boolean
    billing_updates: boolean
  }
  timezone: string
  date_format: string
  login_notifications: boolean
  two_factor_enabled: boolean
  display_density: string
  auto_logout_minutes: number
  dashboard_widgets: string[]
  default_view: string
  created_at: string
  updated_at: string
}

interface UserData {
  id: string
  name: string
  email: string
  role: string
  academy_id?: string
  academyId?: string  // In case the column is camelCase
  phone?: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown  // Allow any other fields from the database
}

interface SettingsPageProps {
  userId: string
}

export function SettingsPage({ userId }: SettingsPageProps) {
  const { t } = useTranslation()
  const { language: currentLanguage, setLanguage: setCurrentLanguage } = useLanguage()
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('account')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [originalUserData, setOriginalUserData] = useState<UserData | null>(null)
  const [showUnsavedModal, setShowUnsavedModal] = useState(false)
  const [pendingSection, setPendingSection] = useState<string | null>(null)
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

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

  const validateName = (name: string): string | null => {
    if (!name?.trim()) return String(t('validation.nameRequired'))
    if (name.trim().length < 2) return String(t('validation.nameTooShort'))
    return null
  }

  // Check if phone number already exists in the database (system-wide across all roles)
  const checkPhoneUniqueness = async (phone: string, currentUserId: string): Promise<boolean> => {
    if (!phone || phone.trim() === '') return true // Empty phone is allowed

    try {
      // Check all 4 role tables in parallel
      const [managersResult, teachersResult, parentsResult, studentsResult] = await Promise.all([
        supabase.from('managers').select('user_id, phone').eq('phone', phone).neq('user_id', currentUserId).single(),
        supabase.from('teachers').select('user_id, phone').eq('phone', phone).neq('user_id', currentUserId).single(),
        supabase.from('parents').select('user_id, phone').eq('phone', phone).neq('user_id', currentUserId).single(),
        supabase.from('students').select('user_id, phone').eq('phone', phone).neq('user_id', currentUserId).single()
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

    const nameError = validateName(userData.name)
    if (nameError) errors.name = nameError

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
  const checkForUnsavedChanges = (newUserData: UserData | null) => {
    if (!originalUserData || !newUserData) {
      setHasUnsavedChanges(false)
      return
    }

    // Check if name or phone has changed (email is still disabled)
    const hasChanged = originalUserData.name !== newUserData.name ||
                      originalUserData.phone !== newUserData.phone

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

  // Handle account deletion
  const handleDeleteAccount = async () => {
    setDeletingAccount(true)
    try {
      // TODO: Implement actual account deletion logic here
      // This would typically involve:
      // 1. Calling a backend API to delete the account
      // 2. Signing out the user
      // 3. Redirecting to a goodbye page or login page

      // For now, just simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Sign out and redirect
      const { error } = await supabase.auth.signOut()
      if (!error) {
        window.location.href = '/auth'
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      alert(t('settings.dataStorage.deleteAccountError'))
    } finally {
      setDeletingAccount(false)
      setShowDeleteAccountModal(false)
    }
  }

  // Fetch user data
  const fetchUserData = useCallback(async () => {
    if (!userId || userId === '') {
      return
    }
    
    try {
      const { data, error } = await supabase
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

      // Also fetch additional role-specific data (like phone)
      if (data.role === 'teacher') {
        const { data: teacherData, error: teacherError } = await supabase
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
        const { data: parentData, error: parentError } = await supabase
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
        const { data: studentData, error: studentError } = await supabase
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
        const { data: managerData, error: managerError } = await supabase
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
  }, [userId])

  // Fetch user preferences
  const fetchPreferences = useCallback(async () => {
    if (!userId || userId === '') {
      return
    }
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST116') throw error

      if (data) {
        setPreferences(data)
      } else {
        // Create default preferences if none exist
        const { data: newPrefs, error: createError } = await supabase
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
      alert(t('settings.errorLoadingSettings'))
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
        const errorToast = document.createElement('div')
        errorToast.className = 'fixed top-4 right-4 bg-red-100 border border-red-300 text-red-800 px-4 py-2 rounded-lg shadow-lg z-50'
        errorToast.innerHTML = `<div class="flex items-center gap-2"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>${t('validation.phoneAlreadyExistsToast')}</div>`
        document.body.appendChild(errorToast)
        setTimeout(() => errorToast.remove(), 3000)
      }
      return
    }

    setSaving(true)
    try {
      // Prepare update object with name field
      const updateData: Record<string, unknown> = {
        name: userData.name
      }

      // Only add updated_at if it exists in the original data
      if ('updated_at' in userData) {
        updateData.updated_at = new Date().toISOString()
      }

      // Update main users table
      const { error: userError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)

      if (userError) throw userError

      // Update phone number in the appropriate role table
      if (userData.role) {
        const roleTable = `${userData.role.toLowerCase()}s` // managers, teachers, parents, students
        const { error: phoneError } = await supabase
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
        console.log('[Cache Invalidation] Clearing all caches after name update for academy:', academyId)
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
        console.log('[Cache Invalidation] All caches cleared - names will update on next page visit')
      }

      // Reset unsaved changes tracking
      setOriginalUserData(userData)
      setHasUnsavedChanges(false)
      setValidationErrors({})

      // Show success message
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-4 right-4 bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded-lg shadow-lg z-50'
      successMsg.innerHTML = `<div class="flex items-center gap-2"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>${t('success.saved')}</div>`
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 3000)

    } catch (error) {
      console.error('Error saving user data:', error)
      alert(t('common.error'))
    } finally {
      setSaving(false)
    }
  }

  // Update preferences
  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!preferences || !userId) return

    setSaving(true)
    try {
      const { data, error } = await supabase
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
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-4 right-4 bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded-lg shadow-lg z-50'
      successMsg.innerHTML = `<div class="flex items-center gap-2"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>${t('settings.settingsSaved')}</div>`
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 3000)
      
    } catch (error) {
      console.error('Error updating preferences:', error)
      alert(t('settings.errorSavingSettings'))
    } finally {
      setSaving(false)
    }
  }

  // Fetch academy logo
  const fetchAcademyLogo = useCallback(async () => {
    if (!userData?.academy_id && !userData?.academyId) return

    const academyId = userData.academy_id || userData.academyId
    try {
      const { data, error } = await supabase
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
      alert(t('settings.branding.noAcademyError'))
      return
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert(t('settings.branding.invalidFileType'))
      return
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      alert(t('settings.branding.fileTooLarge'))
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
          await supabase.storage.from('academy-logos').remove([oldPath])
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('academy-logos')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('academy-logos')
        .getPublicUrl(filePath)

      // Update academy record
      const { error: updateError } = await supabase
        .from('academies')
        .update({ logo_url: publicUrl })
        .eq('id', academyId)

      if (updateError) throw updateError

      setAcademyLogo(publicUrl)

      // Dispatch event to notify layout to update sidebar logo
      window.dispatchEvent(new CustomEvent('academyLogoUpdated', { detail: { logoUrl: publicUrl } }))

      // Show success message
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-4 right-4 bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded-lg shadow-lg z-50'
      successMsg.innerHTML = `<div class="flex items-center gap-2"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>${t('settings.branding.logoUploaded')}</div>`
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 3000)

    } catch (error) {
      console.error('Error uploading logo:', error)
      alert(t('settings.branding.uploadError'))
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
        await supabase.storage.from('academy-logos').remove([pathMatch])
      }

      // Clear logo_url in database
      const { error: updateError } = await supabase
        .from('academies')
        .update({ logo_url: null })
        .eq('id', academyId)

      if (updateError) throw updateError

      setAcademyLogo(null)

      // Dispatch event to notify layout to update sidebar logo
      window.dispatchEvent(new CustomEvent('academyLogoUpdated', { detail: { logoUrl: null } }))

      // Show success message
      const successMsg = document.createElement('div')
      successMsg.className = 'fixed top-4 right-4 bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded-lg shadow-lg z-50'
      successMsg.innerHTML = `<div class="flex items-center gap-2"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>${t('settings.branding.logoRemoved')}</div>`
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 3000)

    } catch (error) {
      console.error('Error removing logo:', error)
      alert(t('settings.branding.removeError'))
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
            <p className="text-gray-500">{t('settings.description')}</p>
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
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
          <p className="text-gray-500">{t('settings.description')}</p>
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
          <Card className="p-4">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  {section.label}
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-9">
          <Card className="p-4 sm:p-6">
            {activeSection === 'account' && userData && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.account.title')}</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                        {t('settings.account.firstName')}
                      </Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={userData.name?.split(' ')[0] || ''}
                        onChange={(e) => {
                          const lastName = userData.name?.split(' ').slice(1).join(' ') || ''
                          const newName = lastName ? `${e.target.value} ${lastName}` : e.target.value
                          const newUserData = userData ? { ...userData, name: newName } : null
                          setUserData(newUserData)
                          checkForUnsavedChanges(newUserData)
                          clearError('name')
                        }}
                        className={`mt-1 ${validationErrors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                        placeholder={String(t('settings.account.enterFirstName'))}
                      />
                      {validationErrors.name && (
                        <p className="text-sm text-red-600 mt-1">{validationErrors.name}</p>
                      )}
                    </div>
                    
                    <div>
                      <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                        {t('settings.account.lastName')}
                      </Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={userData.name?.split(' ').slice(1).join(' ') || ''}
                        onChange={(e) => {
                          const firstName = userData.name?.split(' ')[0] || ''
                          const newName = firstName ? `${firstName} ${e.target.value}` : e.target.value
                          const newUserData = userData ? { ...userData, name: newName } : null
                          setUserData(newUserData)
                          checkForUnsavedChanges(newUserData)
                          clearError('name')
                        }}
                        className={`mt-1 ${validationErrors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                        placeholder={String(t('settings.account.enterLastName'))}
                      />
                    </div>
                  </div>
                  
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
                      className={`mt-1 ${validationErrors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
                      placeholder={String(t('settings.account.enterPhoneNumber'))}
                    />
                    {validationErrors.phone && (
                      <p className="text-sm text-red-600 mt-1">{validationErrors.phone}</p>
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
                      disabled={saving || !hasUnsavedChanges}
                      className={hasUnsavedChanges ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    >
                      {saving ? t('settings.account.saving') : t('settings.account.saveChanges')}
                    </Button>
                    {hasUnsavedChanges && (
                      <span className="text-sm text-orange-600 font-medium">
                        • {t('settings.unsavedChanges')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'branding' && userData?.role === 'manager' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.branding.title')}</h2>
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
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.notificationPreferences.title')}</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{t('settings.notificationPreferences.pushNotifications')}</h3>
                      <p className="text-sm text-gray-500">{t('settings.notificationPreferences.pushNotificationsDesc')}</p>
                    </div>
                    <button
                      onClick={() => updatePreferences({ push_notifications: !preferences?.push_notifications })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        preferences?.push_notifications ? 'bg-primary' : 'bg-gray-200'
                      }`}
                      disabled={saving}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                          preferences?.push_notifications ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">{t('settings.notificationPreferences.emailNotifications')}</h3>
                    {[
                      { id: 'session-updates', label: t('settings.notificationPreferences.sessionUpdates'), desc: t('settings.notificationPreferences.sessionUpdatesDesc') },
                      { id: 'attendance-alerts', label: t('settings.notificationPreferences.attendanceAlerts'), desc: t('settings.notificationPreferences.attendanceAlertsDesc') },
                      { id: 'family-activities', label: t('settings.notificationPreferences.familyActivities'), desc: t('settings.notificationPreferences.familyActivitiesDesc') },
                      { id: 'billing-updates', label: t('settings.notificationPreferences.billingUpdates'), desc: t('settings.notificationPreferences.billingUpdatesDesc') }
                    ].map((notification) => (
                      <div key={notification.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{notification.label}</h4>
                          <p className="text-xs text-gray-500">{notification.desc}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={preferences.email_notifications?.[notification.id.replace('-', '_') as keyof typeof preferences.email_notifications] ?? true}
                          onChange={(e) => {
                            const key = notification.id.replace('-', '_') as keyof typeof preferences.email_notifications
                            const newEmailNotifications = {
                              ...preferences.email_notifications,
                              [key]: e.target.checked
                            }
                            updatePreferences({ email_notifications: newEmailNotifications })
                          }}
                          className="h-4 w-4 accent-primary border-gray-300 rounded focus:ring-primary"
                          disabled={saving}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'appearance' && preferences && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.appearance.title')}</h2>
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.languageRegion.title')}</h2>
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
                </div>
              </div>
            )}

            {activeSection === 'privacy' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.privacySecurity.title')}</h2>
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
                      <Shield className="w-5 h-5 text-green-600 mt-0.5" />
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.connectedDevices.title')}</h2>
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
                            {device.name} {device.current && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded ml-2">{t('settings.connectedDevices.current')}</span>}
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.dataStorage.title')}</h2>
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

                  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-red-900">{t('settings.dataStorage.deleteAccount')}</h3>
                        <p className="text-sm text-red-700">{t('settings.dataStorage.deleteAccountDesc')}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 border-red-300 text-red-700 hover:bg-red-100 hover:text-red-700"
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
      <Modal isOpen={showUnsavedModal} onClose={handleCancelSectionChange} size="md">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
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
              <button
                onClick={handleCancelSectionChange}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-800">
                {t('settings.unsavedChangesDetail')}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 p-6 border-t border-gray-200 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleCancelSectionChange}
            >
              {t('settings.stayOnPage')}
            </Button>
            <Button
              className="flex-1 bg-orange-600 hover:bg-orange-700"
              onClick={handleConfirmSectionChange}
            >
              {t('settings.discardChanges')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal isOpen={showDeleteAccountModal} onClose={() => !deletingAccount && setShowDeleteAccountModal(false)} size="md">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex-shrink-0 p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
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
              {!deletingAccount && (
                <button
                  onClick={() => setShowDeleteAccountModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3">
            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm text-red-800 font-medium mb-2">
                {t('settings.dataStorage.deleteAccountWarning')}
              </p>
              <ul className="text-xs text-red-700 space-y-1 list-disc list-inside">
                <li>{t('settings.dataStorage.deleteAccountPoint1')}</li>
                <li>{t('settings.dataStorage.deleteAccountPoint2')}</li>
                <li>{t('settings.dataStorage.deleteAccountPoint3')}</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600">
              {t('settings.dataStorage.deleteAccountFinal')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 p-6 border-t border-gray-200 flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowDeleteAccountModal(false)}
              disabled={deletingAccount}
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={handleDeleteAccount}
              disabled={deletingAccount}
            >
              {deletingAccount ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('settings.dataStorage.deletingAccount')}
                </span>
              ) : (
                t('settings.dataStorage.confirmDelete')
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}