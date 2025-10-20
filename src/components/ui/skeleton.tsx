import { cn } from "@/lib/utils"

// Base skeleton component with shimmer animation
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-gray-200", className)}
      {...props}
    />
  )
}

// Card skeleton for card-based layouts
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white rounded-lg border p-4 space-y-3", className)}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-full" />
    </div>
  )
}

// List item skeleton
export function ListItemSkeleton() {
  return (
    <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}

// Stats card skeleton
export function StatSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-4">
      <Skeleton className="h-3 w-1/2 mb-3" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-8 w-12" />
      </div>
    </div>
  )
}

// Assignment card skeleton
export function AssignmentCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      {/* Teacher Info Header */}
      <div className="flex items-center mb-2">
        <Skeleton className="w-8 h-8 rounded-full mr-3" />
        <div className="flex-1">
          <Skeleton className="h-4 w-1/3 mb-1" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      
      {/* Assignment Type and Title Group */}
      <div className="mb-2">
        <div className="mb-1">
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-3 w-full" />
      </div>
      
      {/* Points */}
      <Skeleton className="h-3 w-20" />
      
      {/* Action Buttons */}
      <div className="flex items-center pt-3 border-t border-gray-100">
        <div className="flex items-center">
          <Skeleton className="w-4 h-4 mr-1" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-16 ml-1" />
        </div>
      </div>
    </div>
  )
}

// Grade card skeleton
export function GradeCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-3 w-1/3" />
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="space-y-2 text-xs">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  )
}

// Schedule session skeleton
export function SessionCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex gap-4">
        <div className="flex flex-col items-center justify-center text-center min-w-[60px]">
          <Skeleton className="h-4 w-12 mb-1" />
          <Skeleton className="w-px h-4 my-1" />
          <Skeleton className="h-4 w-12" />
        </div>
        <div className="flex-1 border-l-2 border-blue-200 pl-4 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Notification skeleton
export function NotificationSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-2 h-2 rounded-full mt-1.5" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-2 w-20" />
        </div>
      </div>
    </div>
  )
}

// Profile skeleton
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="w-16 h-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  )
}

// Session details skeleton
export function SessionDetailSkeleton() {
  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-6 h-6 rounded" />
        <div className="space-y-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>

      {/* Session Info Card */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="w-16 h-16 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={`left-${i}`} className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={`right-${i}`} className="flex items-center gap-2">
                <Skeleton className="w-4 h-4 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Classroom Details Section */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        
        <div className="grid grid-cols-1 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={`classroom-${i}`} className="bg-white rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-5 h-5 rounded" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-lg border p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={`student-${i}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Enhanced home page upcoming session card skeleton with improved animation
export function HomeSessionCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-3 relative">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Skeleton className="w-3 h-3 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <div className="flex items-center gap-1">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="w-1 h-1 rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
        <Skeleton className="w-4 h-4 rounded" />
      </div>
    </div>
  )
}

// Enhanced invoice card skeleton for home page
export function HomeInvoiceCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="w-1 h-1 rounded-full" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
        </div>
        <div className="text-right space-y-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      </div>
    </div>
  )
}

// Progressive loading skeleton - shows content gradually loading
export function ProgressiveLoadingSkeleton({ stages = 3 }: { stages?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: stages }, (_, i) => (
        <div 
          key={i}
          className={`transition-opacity duration-300 ${i === 0 ? 'opacity-100' : i === 1 ? 'opacity-70' : 'opacity-40'}`}
        >
          <div className="bg-white rounded-lg border p-4 space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded" />
              <Skeleton className="h-8 w-16 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Quick stats skeleton with animated counter effect
export function AnimatedStatSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="w-4 h-4 rounded" />
      </div>
      <div className="flex items-end gap-2">
        <div className="relative">
          <Skeleton className="h-8 w-16" />
          {/* Simulated counting animation */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-100/0 via-blue-100/50 to-blue-100/0 animate-pulse" />
        </div>
        <Skeleton className="h-4 w-8 mb-1" />
      </div>
    </div>
  )
}

// Loading state for lists with staggered animation
export function StaggeredListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }, (_, i) => (
        <div 
          key={i}
          className="animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <AssignmentCardSkeleton />
        </div>
      ))}
    </div>
  )
}

// Subtle loading indicator for refreshing content
export function RefreshLoadingIndicator({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null
  
  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-full shadow-lg border px-4 py-2 flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-600 font-medium">Refreshing...</span>
      </div>
    </div>
  )
}

// Smart loading container that shows different states
export function SmartLoadingContainer({ 
  isLoading, 
  isEmpty, 
  error, 
  children,
  skeletonComponent,
  emptyComponent,
  errorComponent 
}: {
  isLoading: boolean
  isEmpty: boolean
  error?: Error | null
  children: React.ReactNode
  skeletonComponent: React.ReactNode
  emptyComponent: React.ReactNode
  errorComponent?: React.ReactNode
}) {
  if (isLoading) return <>{skeletonComponent}</>
  if (error && errorComponent) return <>{errorComponent}</>
  if (isEmpty) return <>{emptyComponent}</>
  return <>{children}</>
}

// Calendar skeleton
export function CalendarSkeleton() {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-6 rounded" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-6 rounded" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {[...Array(7)].map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-6 w-full rounded" />
        ))}
        {/* Calendar days */}
        {[...Array(35)].map((_, i) => (
          <Skeleton key={`day-${i}`} className="aspect-square rounded" />
        ))}
      </div>
    </div>
  )
}

// Invoice details skeleton
export function InvoiceDetailSkeleton() {
  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="w-6 h-6 rounded" />
        <div className="space-y-1">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      {/* Invoice Status Card */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="text-right">
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      </div>

      {/* Invoice Details Section */}
      <div className="space-y-4">
        <Skeleton className="h-5 w-40" />
        
        <div className="space-y-3">
          {/* Student Card */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-5 h-5 rounded" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </div>

          {/* Due Date Card */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-5 h-5 rounded" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>

          {/* Payment Method Card */}
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-5 h-5 rounded" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Card */}
      <div className="bg-white rounded-lg border p-4">
        <Skeleton className="h-3 w-12 mb-2" />
        <div className="p-3 bg-gray-50 rounded-lg">
          <Skeleton className="h-3 w-full mb-1" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>

      {/* Make Payment Section */}
      <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center">
            <Skeleton className="w-6 h-6 rounded mr-2" />
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-3 w-2/3 mx-auto" />
          <Skeleton className="h-10 w-full rounded" />
        </div>
      </div>
    </div>
  )
}