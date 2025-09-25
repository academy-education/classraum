"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useEffectiveUserId } from '@/hooks/useEffectiveUserId'
import { MobilePageErrorBoundary } from '@/components/error-boundaries/MobilePageErrorBoundary'
import { simpleTabDetection } from '@/utils/simpleTabDetection'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProfileSkeleton } from '@/components/ui/skeleton'
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
  UserCheck
} from 'lucide-react'
import { useSelectedStudentStore } from '@/stores/selectedStudentStore'
import { StudentSelectorModal } from '@/components/ui/student-selector-modal'

interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  role: string
  academy_name?: string
  student_grade?: string
  student_school?: string
  created_at?: string
}

interface UserPreferences {
  push_notifications: boolean
  email_notifications: {
    assignments: boolean
    grades: boolean
    announcements: boolean
    reminders: boolean
  }
  language: string
}

function MobileProfilePageContent() {
  const router = useRouter()
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguage()
  const { user } = usePersistentMobileAuth()
  const { effectiveUserId, isReady, isLoading: authLoading } = useEffectiveUserId()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(() => {
    // Check if we should suppress loading for tab returns
    const shouldSuppress = simpleTabDetection.isReturningToTab()
    if (shouldSuppress) {
      console.log('🚫 [MobileProfile] Suppressing initial loading - navigation detected')
      return false
    }
    return true
  })
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showStudentSelector, setShowStudentSelector] = useState(false)
  const { selectedStudent, availableStudents, setSelectedStudent } = useSelectedStudentStore()

  // Handle body scroll prevention when modal is open
  useEffect(() => {
    if (showLogoutConfirm) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [showLogoutConfirm])
  const [preferences, setPreferences] = useState<UserPreferences>({
    push_notifications: false,
    email_notifications: {
      assignments: true,
      grades: true,
      announcements: true,
      reminders: true
    },
    language: 'english'
  })
  const [preferencesLoading, setPreferencesLoading] = useState(() => {
    // Check if we should suppress loading for tab returns
    const shouldSuppress = simpleTabDetection.isReturningToTab()
    if (shouldSuppress) {
      console.log('🚫 [MobileProfile] Suppressing preferences loading - navigation detected')
      return false
    }
    return true
  })

  // Pull-to-refresh states
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchUserProfile = useCallback(async () => {
    // For profile page, always use the actual user's ID, not effective ID
    const profileUserId = user?.userId

    if (!profileUserId) {
      console.log('[Profile] No user ID available')
      return
    }

    try {
      // Only show loading if this isn't a tab return
      if (!simpleTabDetection.isReturningToTab()) {
        setLoading(true)
      }
      console.log('[Profile] Fetching profile for user:', profileUserId)

      // First fetch basic user data from users table
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', profileUserId)
        .single()

      if (error) {
        console.warn('[Profile] User data query failed:', error)
        // Try to continue with fallback profile
        setProfile({
          id: profileUserId,
          name: user?.userName || 'User',
          email: '',
          role: 'student' // Default role
        })
        return
      }

      if (!userData) {
        console.warn('[Profile] No user data returned for userId:', profileUserId)
        // Set basic profile from auth data
        setProfile({
          id: profileUserId,
          name: user?.userName || 'User',
          email: '',
          role: 'student' // Default role
        })
        return
      }

      // Initialize profile with basic data
      let profileData: UserProfile = {
        id: userData.id,
        name: userData.name || user?.userName || 'User',
        email: userData.email || '',
        role: userData.role
      }

      // Fetch additional role-specific data with graceful error handling
      try {
        if (userData.role === 'student') {
          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select(`
              phone,
              school_name
            `)
            .eq('user_id', profileUserId)
            .single()

          if (studentData && !studentError) {
            profileData = {
              ...profileData,
              phone: studentData.phone,
              student_school: studentData.school_name
            }
          } else if (studentError) {
            console.warn('[Profile] Student data query failed:', studentError)
          }
        } else if (userData.role === 'teacher') {
          const { data: teacherData, error: teacherError } = await supabase
            .from('teachers')
            .select(`
              phone,
              academy_id
            `)
            .eq('user_id', profileUserId)
            .single()

          if (teacherData && !teacherError) {
            profileData = {
              ...profileData,
              phone: teacherData.phone
            }
          } else if (teacherError) {
            console.warn('[Profile] Teacher data query failed:', teacherError)
          }
        } else if (userData.role === 'parent') {
          const { data: parentData, error: parentError } = await supabase
            .from('parents')
            .select('phone')
            .eq('user_id', profileUserId)
            .single()

          if (parentData && !parentError) {
            profileData = {
              ...profileData,
              phone: parentData.phone
            }
          } else if (parentError) {
            console.warn('[Profile] Parent data query failed:', parentError)
          }
        } else if (userData.role === 'academy_owner') {
          const { data: ownerData, error: ownerError } = await supabase
            .from('academy_owners')
            .select(`
              phone,
              academy_id
            `)
            .eq('user_id', profileUserId)
            .single()

          if (ownerData && !ownerError) {
            profileData = {
              ...profileData,
              phone: ownerData.phone
            }
          } else if (ownerError) {
            console.warn('[Profile] Owner data query failed:', ownerError)
          }
        }
      } catch (roleError) {
        console.warn('[Profile] Error fetching role-specific data:', roleError)
        // Continue with basic profile data
      }

      // Get academy names for all academies the user belongs to
      try {
        if (user?.academyIds && user.academyIds.length > 0) {
          const { data: academyData, error: academyError } = await supabase
            .from('academies')
            .select('name')
            .in('id', user.academyIds)

          if (academyData && !academyError && academyData.length > 0) {
            const academyNames = academyData.map(academy => academy.name).join(', ')
            profileData = {
              ...profileData,
              academy_name: academyNames
            }
          } else if (academyError) {
            console.warn('[Profile] Academy data query failed:', academyError)
          }
        }
      } catch (academyError) {
        console.warn('[Profile] Error fetching academy data:', academyError)
      }

      console.log('[Profile] Successfully fetched profile:', profileData)
      setProfile(profileData)
    } catch (error) {
      console.error('[Profile] Error fetching profile:', error)
      // Set basic profile from auth data if database fetch fails
      setProfile({
        id: profileUserId,
        name: user?.userName || 'User',
        email: '',
        role: 'student' // Default role
      })
    } finally {
      setLoading(false)
      simpleTabDetection.markAppLoaded()
    }
  }, [user])

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
      }

      // Force clear localStorage to ensure complete logout
      if (typeof window !== 'undefined') {
        // Clear all Supabase auth keys
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('supabase.auth.token') || key.startsWith('sb-')) {
            localStorage.removeItem(key)
          }
        })
      }

      // Wait a moment for auth state to propagate
      setTimeout(() => {
        router.push('/auth')
      }, 100)
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const fetchUserPreferences = useCallback(async () => {
    const preferencesUserId = user?.userId

    if (!preferencesUserId) {
      console.log('[Profile] No user ID for preferences')
      return
    }

    try {
      // Only show loading if this isn't a tab return
      if (!simpleTabDetection.isReturningToTab()) {
        setPreferencesLoading(true)
      }
      console.log('[Profile] Fetching preferences for user:', preferencesUserId)

      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', preferencesUserId)
        .single()

      if (data && !error) {
        const emailNotifs = data.email_notifications || {}
        setPreferences({
          push_notifications: data.push_notifications || false,
          email_notifications: {
            assignments: emailNotifs.assignments !== false,
            grades: emailNotifs.grades !== false,
            announcements: emailNotifs.announcements !== false,
            reminders: emailNotifs.reminders !== false
          },
          language: data.language || 'english'
        })
        console.log('[Profile] Successfully fetched preferences')
      } else if (error) {
        console.warn('[Profile] Preferences query failed (using defaults):', error)
        // Use default preferences if none exist
        setPreferences({
          push_notifications: false,
          email_notifications: {
            assignments: true,
            grades: true,
            announcements: true,
            reminders: true
          },
          language: 'english'
        })
      }
    } catch (error) {
      console.error('[Profile] Error fetching preferences:', error)
      // Set default preferences on error
      setPreferences({
        push_notifications: false,
        email_notifications: {
          assignments: true,
          grades: true,
          announcements: true,
          reminders: true
        },
        language: 'english'
      })
    } finally {
      setPreferencesLoading(false)
      simpleTabDetection.markAppLoaded()
    }
  }, [user])

  useEffect(() => {
    if (user?.userId) {
      fetchUserProfile()
      fetchUserPreferences()
    }
  }, [user?.userId, fetchUserProfile, fetchUserPreferences])

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    if (!user?.userId) return
    
    try {
      const newPreferences = {
        ...preferences,
        ...updates,
        email_notifications: {
          ...preferences.email_notifications,
          ...(updates.email_notifications || {})
        }
      }
      setPreferences(newPreferences)
      
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.userId,
          push_notifications: newPreferences.push_notifications,
          email_notifications: newPreferences.email_notifications,
          language: newPreferences.language
        })
      
      if (error) {
        console.error('Error updating preferences:', error)
        // Revert on error
        setPreferences(preferences)
      }
    } catch (error) {
      console.error('Error updating preferences:', error)
      setPreferences(preferences)
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
      await Promise.all([
        fetchUserProfile(),
        fetchUserPreferences()
      ])
    } catch (error) {
      console.error('Error refreshing data:', error)
    } finally {
      setIsRefreshing(false)
      simpleTabDetection.markAppLoaded()
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
      style={{ touchAction: pullDistance > 0 ? 'none' : 'auto' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
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
      
      <div style={{ transform: `translateY(${pullDistance}px)` }} className="transition-transform">
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
        
        {/* Help & Support */}
        <Card className="p-4">
          <button className="w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HelpCircle className="w-5 h-5 text-gray-400" />
              <span className="text-gray-900">{t('mobile.profile.help')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </Card>
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