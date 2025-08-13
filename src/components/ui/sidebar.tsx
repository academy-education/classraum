"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useTranslation } from "@/hooks/useTranslation"
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
  CreditCard,
  Zap
} from "lucide-react"

interface SidebarProps {
  activeItem?: string
  onItemChange?: (item: string) => void
  userName?: string
  onHelpClick?: () => void
}

const getNavigationItems = (t: (key: string) => string) => [
  { id: "dashboard", label: t("navigation.dashboard"), icon: Home },
  { id: "classrooms", label: t("navigation.classrooms"), icon: School },
  { id: "sessions", label: t("navigation.sessions"), icon: Calendar },
  { id: "assignments", label: t("navigation.assignments"), icon: ClipboardList },
  { id: "attendance", label: t("navigation.attendance"), icon: UserCheck },
  { id: "reports", label: t("navigation.reports"), icon: BarChart },
  { id: "payments", label: t("navigation.payments"), icon: CreditCard }
]

const getContactsItems = (t: (key: string) => string) => [
  { id: "teachers", label: t("navigation.teachers"), icon: GraduationCap },
  { id: "families", label: t("navigation.families"), icon: FamilyIcon },
  { id: "parents", label: t("navigation.parents"), icon: UserPlus },
  { id: "students", label: t("navigation.students"), icon: BookOpen }
]

const getBottomItems = (t: (key: string) => string) => [
  { id: "settings", label: t("navigation.settings"), icon: Settings },
  { id: "help", label: t("navigation.getHelp"), icon: HelpCircle },
  { id: "upgrade", label: t("navigation.upgradeNow"), icon: Zap, highlight: true }
]

export function Sidebar({ activeItem = "home", onItemChange, userName, onHelpClick }: SidebarProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()
  
  const navigationItems = getNavigationItems(t)
  const contactsItems = getContactsItems(t)
  const bottomItems = getBottomItems(t)

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
          <Image 
            src="/text_logo.png" 
            alt="Classraum Logo" 
            width={300} 
            height={100} 
            className="h-16 w-auto" 
            priority
            quality={100}
            style={{
              maxWidth: '100%',
              height: 'auto',
            }}
          />
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-4 py-2">
        <div className="space-y-1">
          {navigationItems.map((item) => {
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

        {/* Contacts Section */}
        <div className="mt-8">
          <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {t("navigation.contacts")}
          </h3>
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

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-100">
        <div className="space-y-1">
          {bottomItems.map((item) => {
            const Icon = item.icon
            const isActive = activeItem === item.id
            const isHighlight = item.highlight
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'help') {
                    onHelpClick?.()
                  } else {
                    onItemChange?.(item.id)
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-all duration-300 text-sm font-medium ${
                  isHighlight
                    ? "bg-gradient-to-r from-[#317cfb] via-[#19c2d6] to-[#5ed7be] text-white hover:shadow-lg hover:scale-105 hover:shadow-cyan-500/25 transform"
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

        {/* User Section */}
        {userName && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
              </div>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                title={loading ? t("common.loading") : t("common.signOut")}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
        </div>
        )}
      </div>
    </div>
  )
}