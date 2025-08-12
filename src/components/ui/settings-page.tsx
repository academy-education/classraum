"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Settings,
  User,
  Bell,
  Palette,
  Globe,
  Shield,
  Smartphone,
  Mail,
  Key,
  Download,
  Trash2,
  AlertTriangle,
  Check
} from 'lucide-react'

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

interface SettingsPageProps {
  userId: string
}

export function SettingsPage({ userId }: SettingsPageProps) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeSection, setActiveSection] = useState('account')

  // Fetch user preferences
  const fetchPreferences = useCallback(async () => {
    if (!userId) return
    
    setLoading(true)
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
      alert('Error loading settings')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

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
      successMsg.innerHTML = '<div class="flex items-center gap-2"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>Settings saved</div>'
      document.body.appendChild(successMsg)
      setTimeout(() => successMsg.remove(), 3000)
      
    } catch (error) {
      console.error('Error updating preferences:', error)
      alert('Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  const sections = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'language', label: 'Language & Region', icon: Globe },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'devices', label: 'Connected Devices', icon: Smartphone },
    { id: 'data', label: 'Data & Storage', icon: Download },
  ]

  if (loading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500">Manage your account preferences and settings.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <Card className="p-4">
              <div className="space-y-2">
                {[1,2,3,4,5,6,7].map(i => (
                  <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </Card>
          </div>
          <div className="col-span-9">
            <Card className="p-6">
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
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500">Manage your account preferences and settings.</p>
        </div>
      </div>

      {/* Settings Layout */}
      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar Navigation */}
        <div className="col-span-3">
          <Card className="p-4">
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
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
        <div className="col-span-9">
          <Card className="p-6">
            {activeSection === 'account' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h2>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        type="text"
                        defaultValue="John"
                        className="mt-1"
                        placeholder="Enter your first name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        type="text"
                        defaultValue="Doe"
                        className="mt-1"
                        placeholder="Enter your last name"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      defaultValue="john.doe@example.com"
                      className="mt-1"
                      placeholder="Enter your email address"
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      defaultValue="+1 (555) 123-4567"
                      className="mt-1"
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div className="pt-4">
                    <Button disabled={saving}>
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'notifications' && preferences && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h2>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">Push Notifications</h3>
                      <p className="text-sm text-gray-500">Receive notifications on your device</p>
                    </div>
                    <button
                      onClick={() => updatePreferences({ push_notifications: !preferences.push_notifications })}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        preferences.push_notifications ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                      disabled={saving}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                          preferences.push_notifications ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Email Notifications</h3>
                    {[
                      { id: 'session-updates', label: 'Session Updates', desc: 'Get notified about class sessions and schedules' },
                      { id: 'attendance-alerts', label: 'Attendance Alerts', desc: 'Notifications about attendance changes' },
                      { id: 'family-activities', label: 'Family Activities', desc: 'Updates about family member activities' },
                      { id: 'billing-updates', label: 'Billing & Payments', desc: 'Payment confirmations and billing updates' }
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
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded"
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
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h2>
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Theme</Label>
                    <Select 
                      value={preferences.theme} 
                      onValueChange={(value) => updatePreferences({ theme: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">System Default</SelectItem>
                        <SelectItem value="light">Light Mode</SelectItem>
                        <SelectItem value="dark">Dark Mode</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Choose how the interface appears</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Display Density</Label>
                    <Select 
                      value={preferences.display_density} 
                      onValueChange={(value) => updatePreferences({ display_density: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="compact">Compact</SelectItem>
                        <SelectItem value="comfortable">Comfortable</SelectItem>
                        <SelectItem value="spacious">Spacious</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'language' && preferences && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Language & Region</h2>
                <div className="space-y-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Language</Label>
                    <Select 
                      value={preferences.language} 
                      onValueChange={(value) => updatePreferences({ language: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="spanish">Español</SelectItem>
                        <SelectItem value="french">Français</SelectItem>
                        <SelectItem value="german">Deutsch</SelectItem>
                        <SelectItem value="italian">Italiano</SelectItem>
                        <SelectItem value="portuguese">Português</SelectItem>
                        <SelectItem value="korean">한국어</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Time Zone</Label>
                    <Select 
                      value={preferences.timezone} 
                      onValueChange={(value) => updatePreferences({ timezone: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                        <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                        <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                        <SelectItem value="Europe/London">London (GMT)</SelectItem>
                        <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                        <SelectItem value="Asia/Seoul">Korea Standard Time (KST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Date Format</Label>
                    <Select 
                      value={preferences.date_format} 
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
                </div>
              </div>
            )}

            {activeSection === 'privacy' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Privacy & Security</h2>
                <div className="space-y-6">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Key className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">Password</h3>
                        <p className="text-sm text-gray-500">Last changed 30 days ago</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Change Password
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-500">Add an extra layer of security</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Enable 2FA
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">Login Notifications</h3>
                        <p className="text-sm text-gray-500">Get notified of new sign-ins</p>
                        <div className="flex items-center mt-2">
                          <input 
                            type="checkbox" 
                            checked={preferences?.login_notifications ?? true}
                            onChange={(e) => updatePreferences({ login_notifications: e.target.checked })}
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded" 
                            disabled={saving}
                          />
                          <label className="ml-2 text-sm text-gray-700">Email me about new sign-ins</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'devices' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Connected Devices</h2>
                <div className="space-y-4">
                  {[
                    { name: 'MacBook Pro', location: 'San Francisco, CA', lastActive: 'Active now', current: true },
                    { name: 'iPhone 14', location: 'San Francisco, CA', lastActive: '2 hours ago', current: false },
                    { name: 'Chrome Browser', location: 'New York, NY', lastActive: '1 day ago', current: false }
                  ].map((device, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Smartphone className="w-5 h-5 text-gray-400" />
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {device.name} {device.current && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded ml-2">Current</span>}
                          </h3>
                          <p className="text-sm text-gray-500">{device.location} • {device.lastActive}</p>
                        </div>
                      </div>
                      {!device.current && (
                        <Button variant="outline" size="sm">
                          Sign Out
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'data' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Data & Storage</h2>
                <div className="space-y-6">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Download className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">Download Your Data</h3>
                        <p className="text-sm text-gray-500">Get a copy of all your data</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          Request Download
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-red-200 rounded-lg bg-red-50">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-red-900">Delete Account</h3>
                        <p className="text-sm text-red-700">Permanently delete your account and all data</p>
                        <Button variant="outline" size="sm" className="mt-2 border-red-300 text-red-700 hover:bg-red-100">
                          Delete Account
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
    </div>
  )
}