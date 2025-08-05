"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Image from "next/image"
import { 
  Home, 
  Settings, 
  HelpCircle,
  LogOut,
  Plus,
  School,
  Calendar,
  ClipboardList,
  UserCheck,
  BarChart,
  GraduationCap,
  Home as FamilyIcon,
  UserPlus,
  BookOpen,
  CreditCard
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  activeItem?: string
  onItemChange?: (item: string) => void
  userName?: string
}

const navigationItems = [
  { id: "quick-create", label: "Quick Create", icon: Plus, highlight: true },
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "classrooms", label: "Classrooms", icon: School },
  { id: "sessions", label: "Sessions", icon: Calendar },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "attendance", label: "Attendance", icon: UserCheck },
  { id: "reports", label: "Reports", icon: BarChart },
  { id: "payments", label: "Payments", icon: CreditCard }
]

const contactsItems = [
  { id: "teachers", label: "Teachers", icon: GraduationCap },
  { id: "families", label: "Families", icon: FamilyIcon },
  { id: "parents", label: "Parents", icon: UserPlus },
  { id: "students", label: "Students", icon: BookOpen }
]

const bottomItems = [
  { id: "settings", label: "Settings", icon: Settings },
  { id: "help", label: "Get Help", icon: HelpCircle }
]

export function Sidebar({ activeItem = "home", onItemChange, userName }: SidebarProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Company Header */}
      <div className="p-5">
        <div className="flex items-center gap-3">
          <Image src="/logo2.png" alt="Logo" width={40} height={40} className="w-10 h-10 rounded-lg" />
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-2">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = activeItem === item.id
            const isQuickCreate = item.highlight
            
            return (
              <button
                key={item.id}
                onClick={() => onItemChange?.(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm font-medium ${
                  isQuickCreate
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : isActive 
                    ? "bg-gray-100 text-gray-900" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Contacts Section */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">Contacts</h3>
          <div className="space-y-1">
            {contactsItems.map((item) => {
              const Icon = item.icon
              const isActive = activeItem === item.id
              
              return (
                <button
                  key={item.id}
                  onClick={() => onItemChange?.(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm font-medium ${
                    isActive 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

      </nav>

      {/* Bottom Items */}
      <div className="px-4 pb-4">
        <div className="space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon
            const isActive = activeItem === item.id
            
            return (
              <button
                key={item.id}
                onClick={() => onItemChange?.(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all text-sm font-medium ${
                  isActive 
                    ? "bg-gray-100 text-gray-900" 
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
            CN
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{userName || 'User'}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleLogout}
            disabled={loading}
            className="p-1 h-auto text-gray-400 hover:text-gray-600"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}