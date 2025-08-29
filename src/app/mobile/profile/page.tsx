"use client"

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useTranslation } from '@/hooks/useTranslation'
import { useLanguage } from '@/contexts/LanguageContext'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
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
  Users
} from 'lucide-react'

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

export default function MobileProfilePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguage()
  const { user } = usePersistentMobileAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
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
  const [preferencesLoading, setPreferencesLoading] = useState(true)

  const fetchUserProfile = useCallback(async () => {
    if (!user?.userId) return
    
    try {
      setLoading(true)
      
      // First fetch basic user data from users table
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.userId)
        .single()

      if (error) {
        console.error('Error fetching user data:', error)
        throw error
      }

      if (!userData) {
        console.error('No user data returned for userId:', user.userId)
        return
      }

      // Initialize profile with basic data
      let profileData: UserProfile = {
        id: userData.id,
        name: userData.name || user.userName || 'User',
        email: userData.email || '',
        role: userData.role
      }

      // Fetch additional role-specific data
      if (userData.role === 'student') {
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select(`
            phone,
            school_name
          `)
          .eq('user_id', user.userId)
          .single()
        
        if (studentData && !studentError) {
          profileData = {
            ...profileData,
            phone: studentData.phone,
            student_school: studentData.school_name
          }
        }
      } else if (userData.role === 'teacher') {
        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .select(`
            phone,
            academy_id
          `)
          .eq('user_id', user.userId)
          .single()
        
        if (teacherData && !teacherError) {
          profileData = {
            ...profileData,
            phone: teacherData.phone
          }
        }
      } else if (userData.role === 'parent') {
        const { data: parentData, error: parentError } = await supabase
          .from('parents')
          .select('phone')
          .eq('user_id', user.userId)
          .single()
        
        if (parentData && !parentError) {
          profileData = {
            ...profileData,
            phone: parentData.phone
          }
        }
      } else if (userData.role === 'academy_owner') {
        const { data: ownerData, error: ownerError } = await supabase
          .from('academy_owners')
          .select(`
            phone,
            academy_id
          `)
          .eq('user_id', user.userId)
          .single()
        
        if (ownerData && !ownerError) {
          profileData = {
            ...profileData,
            phone: ownerData.phone
          }
        }
      }

      // Get academy name separately if user has academy_id
      if (user.academyId) {
        const { data: academyData, error: academyError } = await supabase
          .from('academies')
          .select('name')
          .eq('id', user.academyId)
          .single()
        
        if (academyData && !academyError) {
          profileData = {
            ...profileData,
            academy_name: academyData.name
          }
        }
      }

      setProfile(profileData)
    } catch (error) {
      console.error('Error fetching profile:', error)
      // Set basic profile from auth data if database fetch fails
      setProfile({
        id: user.userId,
        name: user.userName || 'User',
        email: user.email || '',
        role: 'student' // Default role
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const fetchUserPreferences = useCallback(async () => {
    if (!user?.userId) return
    
    try {
      setPreferencesLoading(true)
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.userId)
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
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    } finally {
      setPreferencesLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchUserProfile()
      fetchUserPreferences()
    }
  }, [user, fetchUserProfile, fetchUserPreferences])

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

  if (loading) {
    return (
      <div className="p-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t('mobile.profile.title')}
          </h1>
        </div>
        <ProfileSkeleton />
      </div>
    )
  }

  return (
    <div className="p-4">
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
                preferences.push_notifications ? 'bg-blue-600' : 'bg-gray-200'
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
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
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
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
          </div>
        </Card>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
      )}
    </div>
  )
}