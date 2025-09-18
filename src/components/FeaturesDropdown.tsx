"use client"

import Link from "next/link"
import { FileText, BarChart3, Calendar, Users, Bell, Link2, Shield } from "lucide-react"
import { useTranslation } from "@/hooks/useTranslation"

interface FeaturesDropdownProps {
  showFeatures: boolean
  setShowFeatures: (show: boolean) => void
  hoveredFeature: string | null
  setHoveredFeature: (feature: string | null) => void
  featuresRef: React.RefObject<HTMLDivElement | null>
}

export default function FeaturesDropdown({
  showFeatures,
  setShowFeatures,
  hoveredFeature,
  setHoveredFeature,
  featuresRef
}: FeaturesDropdownProps) {
  const { t } = useTranslation()
  
  return (
    <div className="relative" ref={featuresRef}>
      <button 
        className="flex items-center space-x-1 text-base font-medium hover:text-primary transition-colors"
        onClick={() => setShowFeatures(!showFeatures)}
      >
        <span>{String(t('landing.header.features'))}</span>
        <svg className={`h-4 w-4 transition-transform ${showFeatures ? '-rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {showFeatures && (
        <div 
          className="absolute top-full left-0 mt-1 w-80 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-xl p-2 z-50 animate-in slide-in-from-top-2 duration-200"
        >
          <div className="space-y-1">
            <Link href="/features/ai-report-cards">
              <div 
                className={`flex items-start space-x-3 p-3 rounded-md transition-colors cursor-pointer ${
                  hoveredFeature === 'reports' ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/50'
                }`}
                onMouseEnter={() => setHoveredFeature('reports')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">{String(t('landing.header.featuresDropdown.aiReportCards.title'))}</h3>
                  <p className="text-xs text-muted-foreground">{String(t('landing.header.featuresDropdown.aiReportCards.description'))}</p>
                </div>
              </div>
            </Link>
            
            <Link href="/features/customized-dashboard">
              <div 
                className={`flex items-start space-x-3 p-3 rounded-md transition-colors cursor-pointer ${
                  hoveredFeature === 'dashboard' ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/50'
                }`}
                onMouseEnter={() => setHoveredFeature('dashboard')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <BarChart3 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">{String(t('landing.header.featuresDropdown.customizedDashboard.title'))}</h3>
                  <p className="text-xs text-muted-foreground">{String(t('landing.header.featuresDropdown.customizedDashboard.description'))}</p>
                </div>
              </div>
            </Link>
            
            <Link href="/features/lesson-assignment-planner">
              <div 
                className={`flex items-start space-x-3 p-3 rounded-md transition-colors cursor-pointer ${
                  hoveredFeature === 'planning' ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/50'
                }`}
                onMouseEnter={() => setHoveredFeature('planning')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <Calendar className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">{String(t('landing.header.featuresDropdown.lessonAssignmentPlanner.title'))}</h3>
                  <p className="text-xs text-muted-foreground">{String(t('landing.header.featuresDropdown.lessonAssignmentPlanner.description'))}</p>
                </div>
              </div>
            </Link>
            
            <Link href="/features/attendance-recording">
              <div 
                className={`flex items-start space-x-3 p-3 rounded-md transition-colors cursor-pointer ${
                  hoveredFeature === 'attendance' ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/50'
                }`}
                onMouseEnter={() => setHoveredFeature('attendance')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <Users className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">{String(t('landing.header.featuresDropdown.attendanceRecording.title'))}</h3>
                  <p className="text-xs text-muted-foreground">{String(t('landing.header.featuresDropdown.attendanceRecording.description'))}</p>
                </div>
              </div>
            </Link>
            
            <Link href="/features/real-time-notifications">
              <div 
                className={`flex items-start space-x-3 p-3 rounded-md transition-colors cursor-pointer ${
                  hoveredFeature === 'notifications' ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/50'
                }`}
                onMouseEnter={() => setHoveredFeature('notifications')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <Bell className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">{String(t('landing.header.featuresDropdown.realTimeNotifications.title'))}</h3>
                  <p className="text-xs text-muted-foreground">{String(t('landing.header.featuresDropdown.realTimeNotifications.description'))}</p>
                </div>
              </div>
            </Link>
            
            <Link href="/features/smart-linking-system">
              <div 
                className={`flex items-start space-x-3 p-3 rounded-md transition-colors cursor-pointer ${
                  hoveredFeature === 'linking' ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/50'
                }`}
                onMouseEnter={() => setHoveredFeature('linking')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <Link2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">{String(t('landing.header.featuresDropdown.smartLinkingSystem.title'))}</h3>
                  <p className="text-xs text-muted-foreground">{String(t('landing.header.featuresDropdown.smartLinkingSystem.description'))}</p>
                </div>
              </div>
            </Link>
            
            <Link href="/features/privacy-by-design">
              <div 
                className={`flex items-start space-x-3 p-3 rounded-md transition-colors cursor-pointer ${
                  hoveredFeature === 'privacy' ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/50'
                }`}
                onMouseEnter={() => setHoveredFeature('privacy')}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">{String(t('landing.header.featuresDropdown.privacyByDesign.title'))}</h3>
                  <p className="text-xs text-muted-foreground">{String(t('landing.header.featuresDropdown.privacyByDesign.description'))}</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}