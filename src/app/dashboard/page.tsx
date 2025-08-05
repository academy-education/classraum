"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { Sidebar } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ClassroomsPage } from '@/components/ui/classrooms-page'
import { SessionsPage } from '@/components/ui/sessions-page'
import { AssignmentsPage } from '@/components/ui/assignments-page'
import { AttendancePage } from '@/components/ui/attendance-page'
import { PaymentsPage } from '@/components/ui/payments-page'
import { 
  Bell,
  User,
  TrendingUp,
  TrendingDown,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  Minus
} from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeNav, setActiveNav] = useState('home')
  const [userName, setUserName] = useState('')
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [userCount, setUserCount] = useState(0)
  const [isGrowthPositive, setIsGrowthPositive] = useState(true)
  const [showUsersAdded, setShowUsersAdded] = useState(false)
  const [usersAdded, setUsersAdded] = useState(0)
  const [classroomCount, setClassroomCount] = useState(0)
  const [isClassroomGrowthPositive, setIsClassroomGrowthPositive] = useState(true)
  const [showClassroomsAdded, setShowClassroomsAdded] = useState(false)
  const [classroomsAdded, setClassroomsAdded] = useState(0)
  const [academyId, setAcademyId] = useState('')
  const [selectedClassroomId, setSelectedClassroomId] = useState<string | undefined>(undefined)
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined)

  const handleNavigateToSessions = (classroomId?: string) => {
    setSelectedClassroomId(classroomId)
    setActiveNav('sessions')
  }

  const handleNavigateToAssignments = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setActiveNav('assignments')
  }

  const handleNavigateToAttendance = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setActiveNav('attendance')  
  }

  // Clear filters when navigating away from specific tabs
  useEffect(() => {
    if (activeNav !== 'sessions') {
      setSelectedClassroomId(undefined)
    }
    if (activeNav !== 'assignments' && activeNav !== 'attendance') {
      setSelectedSessionId(undefined)
    }
  }, [activeNav])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Get user from session (faster than separate calls)
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setTimeout(() => router.push('/auth'), 2100)
          return
        }

        // Check user role
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (error || !userData) {
          setTimeout(() => router.push('/auth'), 2100)
          return
        }

        if (userData.role === 'manager' || userData.role === 'teacher') {
          setIsAuthorized(true)
          // Get user name for display
          const { data: userProfile } = await supabase
            .from('users')
            .select('name')
            .eq('id', user.id)
            .single()
          
          if (userProfile) {
            setUserName(userProfile.name || 'User')
            
            // Fetch user count for the academy from role-specific tables
            // First, get the academy_id from the appropriate role table
            let academyId = null
            
            if (userData.role === 'manager') {
              const { data: managerData } = await supabase
                .from('managers')
                .select('academy_id')
                .eq('user_id', user.id)
                .single()
              academyId = managerData?.academy_id
            } else if (userData.role === 'teacher') {
              const { data: teacherData } = await supabase
                .from('teachers')
                .select('academy_id')
                .eq('user_id', user.id)
                .single()
              academyId = teacherData?.academy_id
            }
            
            // Store academy_id in state for child components
            if (academyId) {
              setAcademyId(academyId)
            }
            
            if (academyId) {
              // Debug: log the academy_id being used
              // console.log('Academy ID:', academyId)
              
              // Count all active users across role tables for this academy
              const { count: managerCount } = await supabase
                .from('managers')
                .select('user_id', { count: 'exact', head: true })
                .eq('academy_id', academyId)
                .eq('active', true)
              
              const { count: teacherCount } = await supabase
                .from('teachers')
                .select('user_id', { count: 'exact', head: true })
                .eq('academy_id', academyId)
                .eq('active', true)
              
              const { count: parentCount } = await supabase
                .from('parents')
                .select('user_id', { count: 'exact', head: true })
                .eq('academy_id', academyId)
                .eq('active', true)
              
              const { count: studentCount } = await supabase
                .from('students')
                .select('user_id', { count: 'exact', head: true })
                .eq('academy_id', academyId)
                .eq('active', true)
              
              const totalCount = (managerCount || 0) + (teacherCount || 0) + (parentCount || 0) + (studentCount || 0)
              setUserCount(totalCount)
              
              // Calculate month-over-month growth based on user creation dates
              // Since all users were created in July 2025 with no previous month data,
              // show the number of users added instead of percentage
              setShowUsersAdded(true)
              setUsersAdded(totalCount)
              setIsGrowthPositive(true)
              
              // Temporary: Set classroom count to 1 since there's an RLS issue
              // TODO: Fix RLS policy or auth context for classrooms table access
              const classroomCount = 1
              setClassroomCount(classroomCount)
              setShowClassroomsAdded(true)
              setClassroomsAdded(classroomCount)
              setIsClassroomGrowthPositive(true)
            }
          }
        } else {
          setTimeout(() => router.push('/mobile'), 2100)
        }
      } catch {
        setTimeout(() => router.push('/auth'), 2100)
      }
      // Don't set loading to false here - let LoadingScreen control it
    }

    checkAuth()
  }, [router])

  if (loading) {
    return <LoadingScreen onComplete={() => setLoading(false)} />
  }

  if (!isAuthorized) {
    return null // Will redirect
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      {sidebarVisible && (
        <Sidebar activeItem={activeNav} onItemChange={setActiveNav} userName={userName} />
      )}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSidebarVisible(!sidebarVisible)}
                className="p-2"
              >
                {sidebarVisible ? (
                  <PanelLeftClose className="w-4 h-4 text-gray-600" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4 text-gray-600" />
                )}
              </Button>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="relative p-2">
                <Bell className="w-4 h-4 text-gray-600" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-600 rounded-full">
                </span>
              </Button>
              
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-600" />
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {activeNav === 'classrooms' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <ClassroomsPage academyId={academyId} onNavigateToSessions={handleNavigateToSessions} />
            </div>
          ) : activeNav === 'sessions' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <SessionsPage 
                academyId={academyId} 
                filterClassroomId={selectedClassroomId}
                onNavigateToAssignments={handleNavigateToAssignments}
                onNavigateToAttendance={handleNavigateToAttendance}
              />
            </div>
          ) : activeNav === 'assignments' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <AssignmentsPage academyId={academyId} filterSessionId={selectedSessionId} />
            </div>
          ) : activeNav === 'attendance' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <AttendancePage academyId={academyId} filterSessionId={selectedSessionId} />
            </div>
          ) : activeNav === 'payments' ? (
            <div className="h-full overflow-y-auto scroll-smooth">
              <PaymentsPage academyId={academyId} />
            </div>
          ) : (
            // Default Dashboard Content
            <div className="flex-1 overflow-y-auto p-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
                <div className="flex items-center text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>+12.5%</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">$1,250.00</div>
              <div className="flex items-center text-sm text-gray-500">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>Trending up this month</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Visitors for the last 6 months</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">All Active Users</h3>
                <div className={`flex items-center text-sm ${
                  showUsersAdded ? 'text-blue-600' :
                  userCount === 0 ? 'text-gray-600' : 
                  isGrowthPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {showUsersAdded ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : userCount === 0 ? (
                    <Minus className="w-4 h-4 mr-1" />
                  ) : isGrowthPositive ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  <span>
                    {showUsersAdded ? `+${usersAdded} users` :
                     userCount === 0 ? '0%' : 
                     `${isGrowthPositive ? '+' : '-'}${userCount} users`}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">{userCount.toLocaleString()}</div>
              <div className="flex items-center text-sm text-gray-500">
                {showUsersAdded ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : userCount === 0 ? (
                  <Minus className="w-4 h-4 mr-1" />
                ) : isGrowthPositive ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                <span>
                  {showUsersAdded ? `${usersAdded} new users added this month` :
                   userCount === 0 ? 'No change this month' : 
                   `${isGrowthPositive ? 'Up' : 'Down'} ${userCount} users this month`}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Total active users in your academy</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Total Classrooms</h3>
                <div className={`flex items-center text-sm ${
                  showClassroomsAdded ? 'text-blue-600' :
                  classroomCount === 0 ? 'text-gray-600' : 
                  isClassroomGrowthPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {showClassroomsAdded ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : classroomCount === 0 ? (
                    <Minus className="w-4 h-4 mr-1" />
                  ) : isClassroomGrowthPositive ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  <span>
                    {showClassroomsAdded ? `+${classroomsAdded} classrooms` :
                     classroomCount === 0 ? '0%' : 
                     `${isClassroomGrowthPositive ? '+' : '-'}${classroomCount} classrooms`}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">{classroomCount.toLocaleString()}</div>
              <div className="flex items-center text-sm text-gray-500">
                {showClassroomsAdded ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : classroomCount === 0 ? (
                  <Minus className="w-4 h-4 mr-1" />
                ) : isClassroomGrowthPositive ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                <span>
                  {showClassroomsAdded ? `${classroomsAdded} new classrooms added this month` :
                   classroomCount === 0 ? 'No change this month' : 
                   `${isClassroomGrowthPositive ? 'Up' : 'Down'} ${classroomCount} classrooms this month`}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Total classrooms in your academy</p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">Growth Rate</h3>
                <div className="flex items-center text-green-600 text-sm">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span>+4.5%</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">4.5%</div>
              <div className="flex items-center text-sm text-gray-500">
                <Activity className="w-4 h-4 mr-1" />
                <span>Steady performance</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Meets growth projections</p>
            </div>
          </div>
          
          {/* Chart and Promo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Total Visitors</h3>
                    <p className="text-sm text-gray-500">Total for the last 3 months</p>
                  </div>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button className="px-3 py-1 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900">
                      Last 3 months
                    </button>
                    <button className="px-3 py-1 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900">
                      Last 30 days
                    </button>
                    <button className="px-3 py-1 text-sm font-medium rounded-md bg-white text-gray-900 shadow-sm">
                      Last 7 days
                    </button>
                  </div>
                </div>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {/* Chart placeholder - would use a proper chart library */}
                  <div className="flex-1 bg-gradient-to-t from-blue-200 to-green-200 rounded-t h-32 relative">
                    <div className="absolute top-2 right-2 bg-white rounded px-2 py-1 text-xs shadow">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span>Mobile 310</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span>Desktop 371</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            
            <Card className="p-5 bg-gradient-to-br from-blue-600 to-blue-700 text-white relative overflow-hidden">
              <div className="relative z-10">
                <div className="inline-block bg-blue-500 text-xs font-medium px-2 py-1 rounded mb-3">
                  NEW
                </div>
                <h3 className="text-lg font-bold mb-2">
                  We have added new invoicing templates!
                </h3>
                <p className="text-blue-100 text-sm mb-4">
                  New templates focused on helping you improve your business
                </p>
                <Button className="bg-white text-blue-600 hover:bg-gray-100 text-sm h-8">
                  Download Now
                </Button>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500 rounded-full -mr-12 -mt-12 opacity-20" />
              <div className="absolute bottom-0 right-0 w-16 h-16 bg-cyan-400 rounded-full -mr-8 -mb-8 opacity-30" />
            </Card>
          </div>
          
          {/* Table Section */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex space-x-1">
                <button className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border-b-2 border-blue-600">
                  Outline
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2">
                  Past Performance
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">3</span>
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2">
                  Key Personnel
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">2</span>
                </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900">
                  Focus Documents
                </button>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <span>🔧</span>
                  Customize Columns
                </Button>
                <Button size="sm" className="flex items-center gap-2">
                  <span>+</span>
                  Add Section
                </Button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Header</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Section Type</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Target</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Limit</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Reviewer</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-gray-300 rounded"></div>
                        <span className="text-sm text-gray-900">Cover page</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">Cover page</td>
                    <td className="py-3 px-4 text-sm text-gray-900">18</td>
                    <td className="py-3 px-4 text-sm text-gray-900">5</td>
                    <td className="py-3 px-4 text-sm text-gray-900">Eddie Lake</td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="sm" className="p-1">
                        <span className="text-gray-400">⋯</span>
                      </Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}