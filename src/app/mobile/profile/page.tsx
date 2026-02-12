"use client"

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId'
import { MobilePageErrorBoundary } from '@/components/error-boundaries/MobilePageErrorBoundary'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProfileSkeleton } from '@/components/ui/skeleton'
import { useMobileProfile } from './hooks/useMobileProfile'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Mail,
  Phone,
  Globe,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  School,
  Users,
  RefreshCw,
  UserCheck,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import { useSelectedStudentStore } from '@/stores/selectedStudentStore'
import { StudentSelectorModal } from '@/components/ui/student-selector-modal'
import { MOBILE_FEATURES } from '@/config/mobileFeatures'

function MobileProfilePageContent() {
  const router = useRouter()
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguage()
  const { user } = usePersistentMobileAuth()
  const { effectiveUserId, isReady, isLoading: authLoading, academyIds } = useEffectiveUserId()
  const { selectedStudent, availableStudents, setSelectedStudent } = useSelectedStudentStore()

  // Use the new profile hook with caching
  const {
    profile,
    preferences,
    loading,
    preferencesLoading,
    refetch: refetchProfile,
    updatePreferences
  } = useMobileProfile(user?.userId || null, user?.userName || null, academyIds)

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showStudentSelector, setShowStudentSelector] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Handle body scroll prevention when modal is open
  useEffect(() => {
    if (showLogoutConfirm || showDeleteConfirm) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [showLogoutConfirm, showDeleteConfirm])

  // Pull-to-refresh states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Cache invalidation: clear cache when userId changes (parent switching students)
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.userId) {
      // Clear any stale profile caches
      const keys = Object.keys(sessionStorage)
      keys.forEach(key => {
        if (key.startsWith('mobile-profile-') && !key.includes(user.userId)) {
          sessionStorage.removeItem(key)
          sessionStorage.removeItem(`${key}-timestamp`)
        }
      })
    }
  }, [user?.userId])

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
      }

      // Force clear localStorage and sessionStorage to ensure complete logout
      if (typeof window !== 'undefined') {
        // Clear all Supabase auth keys from localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('supabase.auth.token') || key.startsWith('sb-')) {
            localStorage.removeItem(key)
          }
        })

        // Clear Zustand mobile store from localStorage (contains calendar dots, etc.)
        localStorage.removeItem('mobile-app-storage')

        // Clear selected student store to prevent cross-contamination
        localStorage.removeItem('selected-student-storage')

        // Clear all mobile caches from sessionStorage
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('mobile-')) {
            sessionStorage.removeItem(key)
          }
        })
      }

      // Navigate immediately to avoid race with role-based redirects
      router.replace('/auth')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      // Call the delete account RPC function
      const { error } = await supabase.rpc('delete_user_account', {
        user_id: user?.userId
      })

      if (error) {
        console.error('Delete account error:', error)
        alert('Failed to delete account. Please contact support.')
        return
      }

      // Sign out after successful deletion
      await supabase.auth.signOut()

      // Clear all storage
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }

      // Redirect to auth page
      router.push('/auth')
    } catch (error) {
      console.error('Delete account failed:', error)
      alert('Failed to delete account. Please contact support.')
    }
  }

  const handleLanguageChange = async (newLanguage: 'english' | 'korean') => {
    setLanguage(newLanguage)
    await updatePreferences({ language: newLanguage })
  }

  // Pull-to-refresh handlers
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setPullDistance(0)

    try {
      await refetchProfile()
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (scrollRef.current?.scrollTop === 0 && !isRefreshing) {
      const currentY = e.touches[0].clientY
      const diff = currentY - startY.current
      
      if (diff > 0) {
        setPullDistance(Math.min(diff, 100))
      }
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance > 80 && !isRefreshing) {
      handleRefresh()
    } else {
      setPullDistance(0)
    }
  }

  // Show loading skeleton while auth is loading
  if (authLoading || loading) {
    return (
      <MobilePageErrorBoundary>
        <div className="p-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {t('mobile.profile.title')}
            </h1>
          </div>
          <ProfileSkeleton />
        </div>
      </MobilePageErrorBoundary>
    )
  }

  // Show message when user is not ready
  if (!isReady) {
    return (
      <MobilePageErrorBoundary>
        <div className="p-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              {t('mobile.profile.title')}
            </h1>
          </div>
          <Card className="p-6 text-center">
            <div className="space-y-2">
              <School className="w-8 h-8 mx-auto text-gray-300" />
              <p className="text-gray-600">
                {!effectiveUserId ? t('mobile.common.selectStudent') : t('mobile.common.noAcademies')}
              </p>
            </div>
          </Card>
        </div>
      </MobilePageErrorBoundary>
    )
  }

  return (
    <>
    <div
      ref={scrollRef}
      className="p-4 relative overflow-y-auto"
      style={{ touchAction: MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && pullDistance > 0 ? 'none' : 'auto' }}
      {...(MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && {
        onTouchStart: handleTouchStart,
        onTouchMove: handleTouchMove,
        onTouchEnd: handleTouchEnd
      })}
    >
      {/* Pull-to-refresh indicator */}
      {MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH && (pullDistance > 0 || isRefreshing) && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all duration-300 z-10"
          style={{
            height: `${pullDistance}px`,
            opacity: pullDistance > 80 ? 1 : pullDistance / 80
          }}
        >
          <div className="flex items-center gap-2">
            <RefreshCw
              className={`w-5 h-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span className="text-sm text-primary font-medium">
              {isRefreshing ? t('common.refreshing') : t('common.pullToRefresh')}
            </span>
          </div>
        </div>
      )}

      <div style={{ transform: MOBILE_FEATURES.ENABLE_PULL_TO_REFRESH ? `translateY(${pullDistance}px)` : 'none' }} className="transition-transform">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t('mobile.profile.title')}
        </h1>
      </div>

      {/* Profile Card */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
            <span className="text-xl font-medium text-white">
              {profile?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900">{profile?.name}</h2>
            <p className="text-sm text-gray-500">
              {profile?.role ? t(`common.roles.${profile.role}`) : ''}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-600"
            onClick={() => setShowLogoutConfirm(true)}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">{profile?.email || t('mobile.profile.noEmail')}</span>
          </div>
          
          {profile?.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{profile.phone}</span>
            </div>
          )}
          
          {profile?.academy_name && (
            <div className="flex items-center gap-3 text-sm">
              <School className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{profile.academy_name}</span>
            </div>
          )}
          
          {profile?.student_school && (
            <div className="flex items-center gap-3 text-sm">
              <School className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{profile.student_school}</span>
            </div>
          )}
          
          {profile?.student_grade && (
            <div className="flex items-center gap-3 text-sm">
              <Users className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{t('mobile.profile.grade')} {profile.student_grade}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Student Switcher for Parents */}
      {profile?.role === 'parent' && (
        <Card className="p-4 mb-6">
          <button
            onClick={() => setShowStudentSelector(true)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-gray-400" />
              <div className="text-left">
                <span className="text-gray-900">{t('mobile.profile.selectedStudent')}</span>
                <p className="text-sm text-gray-500">
                  {selectedStudent?.name || t('mobile.profile.noStudentSelected')}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </Card>
      )}

      {/* General Settings Section */}
      <div className="space-y-2 mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {t('mobile.profile.generalSettings')}
        </h3>
        
        {/* Language Setting */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gray-400" />
              <span className="text-gray-900">{t('mobile.profile.language')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={language} onValueChange={(value) => handleLanguageChange(value as 'english' | 'korean')}>
                <SelectTrigger className="w-32 border-none shadow-none bg-transparent text-sm text-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">🇺🇸 English</SelectItem>
                  <SelectItem value="korean">🇰🇷 한국어</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
        
        {/* Help & Support - Hidden for now */}
        {false && (
        <Card className="p-4">
          <button className="w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-gray-400" />
              <span className="text-gray-900">{t('mobile.profile.help')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </Card>
        )}
      </div>

      {/* Notification Settings */}
      <div className="space-y-2 mb-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          {t('mobile.profile.notificationSettings')}
        </h3>
        
        {/* Push Notifications */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-gray-400" />
              <div>
                <span className="text-gray-900">{t('mobile.profile.pushNotifications')}</span>
                <p className="text-xs text-gray-500">{t('mobile.profile.pushNotificationsDesc')}</p>
              </div>
            </div>
            <button
              onClick={() => updatePreferences({ push_notifications: !preferences.push_notifications })}
              disabled={preferencesLoading}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                preferences.push_notifications ? 'bg-primary' : 'bg-gray-200'
              } ${preferencesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  preferences.push_notifications ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </Card>
        
        {/* Email Notifications */}
        <Card className="p-4">
          <div className="mb-3">
            <h4 className="text-gray-900 font-medium">{t('mobile.profile.emailNotifications')}</h4>
            <p className="text-xs text-gray-500">{t('mobile.profile.emailNotificationsDesc')}</p>
          </div>
          
          <div className="space-y-3">
            {/* Assignment Notifications */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{t('mobile.profile.assignmentNotifications')}</span>
              <input
                type="checkbox"
                checked={preferences.email_notifications.assignments}
                onChange={(e) => updatePreferences({
                  email_notifications: {
                    ...preferences.email_notifications,
                    assignments: e.target.checked
                  }
                })}
                disabled={preferencesLoading}
                className="h-4 w-4 border-gray-300 rounded focus:ring-primary focus:ring-2 accent-primary"
              />
            </div>
            
            {/* Grade Notifications */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{t('mobile.profile.gradeNotifications')}</span>
              <input
                type="checkbox"
                checked={preferences.email_notifications.grades}
                onChange={(e) => updatePreferences({
                  email_notifications: {
                    ...preferences.email_notifications,
                    grades: e.target.checked
                  }
                })}
                disabled={preferencesLoading}
                className="h-4 w-4 border-gray-300 rounded focus:ring-primary focus:ring-2 accent-primary"
              />
            </div>
            
            {/* Announcement Notifications */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{t('mobile.profile.announcementNotifications')}</span>
              <input
                type="checkbox"
                checked={preferences.email_notifications.announcements}
                onChange={(e) => updatePreferences({
                  email_notifications: {
                    ...preferences.email_notifications,
                    announcements: e.target.checked
                  }
                })}
                disabled={preferencesLoading}
                className="h-4 w-4 border-gray-300 rounded focus:ring-primary focus:ring-2 accent-primary"
              />
            </div>
            
            {/* Reminder Notifications */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">{t('mobile.profile.reminderNotifications')}</span>
              <input
                type="checkbox"
                checked={preferences.email_notifications.reminders}
                onChange={(e) => updatePreferences({
                  email_notifications: {
                    ...preferences.email_notifications,
                    reminders: e.target.checked
                  }
                })}
                disabled={preferencesLoading}
                className="h-4 w-4 border-gray-300 rounded focus:ring-primary focus:ring-2 accent-primary"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Danger Zone */}
      <div className="space-y-2 mb-6">
        {/* <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wider mb-3">
          {t('mobile.profile.dangerZone') || 'Danger Zone'}
        </h3> */}

        <Card className="p-4 border-red-200 bg-red-50">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-5 h-5 text-red-600" />
              <div className="text-left">
                <span className="text-red-900 font-medium">{t('mobile.profile.deleteAccount') || 'Delete Account'}</span>
                <p className="text-xs text-red-700">
                  {t('mobile.profile.deleteAccountWarning') || 'This action cannot be undone'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-red-600 group-hover:translate-x-1 transition-transform" />
          </button>
        </Card>
      </div>

      </div>
    </div>

    {/* Logout Confirmation Modal - Outside main containers */}
    {showLogoutConfirm && (
      <>
        <div 
          className="fixed inset-0 backdrop-blur-sm bg-black/20 z-[9998]"
          onClick={() => setShowLogoutConfirm(false)}
        />
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <Card className="w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-2">{t('mobile.profile.logout')}</h3>
            <p className="text-gray-600 mb-4">{t('mobile.profile.confirmLogout')}</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowLogoutConfirm(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={handleLogout}
              >
                {t('mobile.profile.logout')}
              </Button>
            </div>
          </Card>
        </div>
      </>
    )}

    {/* Delete Account Confirmation Modal */}
    {showDeleteConfirm && (
      <>
        <div
          className="fixed inset-0 backdrop-blur-sm bg-black/20 z-[9998]"
          onClick={() => setShowDeleteConfirm(false)}
        />
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <Card className="w-full max-w-sm p-6 border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-red-900">
                {t('mobile.profile.deleteAccount') || 'Delete Account'}
              </h3>
            </div>
            <div className="mb-6 space-y-2">
              <p className="text-gray-700 font-medium">
                {t('mobile.profile.deleteAccountConfirm') || 'Are you sure you want to delete your account?'}
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  {t('mobile.profile.deleteAccountConsequences') || 'This will permanently delete:'}
                </p>
                <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                  <li>{t('mobile.profile.deleteData1') || 'All your personal data'}</li>
                  <li>{t('mobile.profile.deleteData2') || 'Your assignments and grades'}</li>
                  <li>{t('mobile.profile.deleteData3') || 'Your account access'}</li>
                </ul>
              </div>
              <p className="text-sm text-gray-600 font-semibold">
                {t('mobile.profile.deleteAccountFinal') || 'This action cannot be undone.'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteConfirm(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteAccount}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t('mobile.profile.confirmDelete') || 'Delete'}
              </Button>
            </div>
          </Card>
        </div>
      </>
    )}

    {/* Student Selector Modal */}
    {showStudentSelector && (
      <StudentSelectorModal
        isOpen={showStudentSelector}
        onClose={() => setShowStudentSelector(false)}
        students={availableStudents}
        onSelectStudent={(student) => {
          setSelectedStudent(student)
          setShowStudentSelector(false)
        }}
      />
    )}
  </>
  )
}

export default function MobileProfilePage() {
  return (
    <MobilePageErrorBoundary>
      <MobileProfilePageContent />
    </MobilePageErrorBoundary>
  )
}