import { cn } from "@/lib/utils"

// Base skeleton with a true shimmer sweep instead of basic pulse.
// The animation keyframes live in globals.css under @keyframes shimmer.
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md bg-[linear-gradient(90deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.10)_50%,rgba(0,0,0,0.06)_100%)] bg-[length:200%_100%] animate-[shimmer_1.5s_infinite_linear]",
        className
      )}
      {...props}
    />
  )
}

// Shared chrome that matches the new mobile Card design (rounded-2xl,
// ring-1 ring-gray-100, soft layered shadow). Use for skeleton placeholders
// so the loading state visually matches the loaded state.
const cardChrome =
  "bg-white rounded-2xl ring-1 ring-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]"

// Card skeleton for card-based layouts
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(cardChrome, "p-4 space-y-3", className)}>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-full" />
    </div>
  )
}

// List item skeleton — matches the icon-chip + title/subtitle list row pattern
export function ListItemSkeleton() {
  return (
    <div className={cn(cardChrome, "flex items-center gap-3 p-4")}>
      <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
    </div>
  )
}

// Stats card skeleton — matches the eyebrow + icon-chip + large number stat tile
export function StatSkeleton() {
  return (
    <div className={cn(cardChrome, "p-4")}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-12" />
    </div>
  )
}

// Assignment card skeleton — matches AssignmentCard's icon-chip + status pill layout
export function AssignmentCardSkeleton() {
  return (
    <div className={cn(cardChrome, "p-4")}>
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Grade card skeleton — matches the new grade summary card pattern
export function GradeCardSkeleton() {
  return (
    <div className={cn(cardChrome, "p-4 space-y-3")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      <div className="flex items-end justify-between pt-1">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  )
}

// Schedule session card skeleton — matches the new timeline-rail session card
export function SessionCardSkeleton() {
  return (
    <div className={cn(cardChrome, "p-4")}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center pt-1">
          <Skeleton className="w-2.5 h-2.5 rounded-full" />
          <div className="w-px flex-1 bg-gray-100 mt-1.5" style={{ minHeight: 24 }} />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
      </div>
    </div>
  )
}

// Notification skeleton — matches the soft-palette notification card
export function NotificationSkeleton() {
  return (
    <div className={cn(cardChrome, "p-4")}>
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2 min-w-0">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
    </div>
  )
}

// Profile skeleton — matches the new hero avatar + sectioned divide-y layout
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Hero avatar block */}
      <div className={cn(cardChrome, "p-6")}>
        <div className="flex flex-col items-center text-center space-y-3">
          <Skeleton className="w-20 h-20 rounded-full" />
          <div className="w-full flex flex-col items-center space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Section: settings list */}
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-24 ml-1" />
        <div className={cn(cardChrome, "divide-y divide-gray-100 overflow-hidden")}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5 min-w-0">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Session details skeleton — matches the preview §10 layout:
// back button → hero strip (eyebrow + title + meta + pills) → divide-y panel
export function SessionDetailSkeleton() {
  return (
    <div className="p-4">
      {/* Back button */}
      <div className="px-1 py-1 mb-4">
        <Skeleton className="w-9 h-9 rounded-full" />
      </div>

      {/* Hero strip */}
      <div className="mb-6 px-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-2.5 h-2.5 rounded-full" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>

      {/* Class details panel */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-2.5 w-24 ml-1" />
        <div className={cn(cardChrome, "divide-y divide-gray-100 overflow-hidden")}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>

      {/* Notes panel */}
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-16 ml-1" />
        <div className={cn(cardChrome, "p-4 space-y-2")}>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      </div>
    </div>
  )
}

// Home page upcoming session card skeleton — matches the timeline-rail layout
export function HomeSessionCardSkeleton() {
  return (
    <div className={cn(cardChrome, "p-4")}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center pt-1">
          <Skeleton className="w-2.5 h-2.5 rounded-full" />
          <div className="w-px flex-1 bg-gray-100 mt-1.5" style={{ minHeight: 20 }} />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
      </div>
    </div>
  )
}

// Home page invoice card skeleton — matches the icon-chip + status pill layout
export function HomeInvoiceCardSkeleton() {
  return (
    <div className={cn(cardChrome, "p-4")}>
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20" />
          </div>
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
          <div className={cn(cardChrome, "p-4 space-y-3")}>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Quick stats skeleton with animated counter effect — matches StatSkeleton chrome
export function AnimatedStatSkeleton() {
  return (
    <div className={cn(cardChrome, "p-4")}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
      <div className="relative">
        <Skeleton className="h-8 w-16" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/0 via-blue-100/50 to-blue-100/0 animate-pulse rounded-md" />
      </div>
    </div>
  )
}

// Loading state for lists with staggered animation
export function StaggeredListSkeleton({
  items = 5,
  variant = 'assignment'
}: {
  items?: number
  variant?: 'assignment' | 'notification' | 'message' | 'session'
}) {
  const Item =
    variant === 'notification' ? NotificationSkeleton :
    variant === 'message' ? ListItemSkeleton :
    variant === 'session' ? SessionCardSkeleton :
    AssignmentCardSkeleton

  return (
    <div className="space-y-3">
      {Array.from({ length: items }, (_, i) => (
        <div
          key={i}
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <Item />
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

// Invoice details skeleton — matches the new status hero card + divide-y panel layout
// Invoice detail skeleton — mirrors the session-style layout:
// back button → hero strip (dot + eyebrow + title + meta + status pill) →
// amount card → divide-y details panel → action button.
export function InvoiceDetailSkeleton() {
  return (
    <div className="p-4">
      {/* Back button */}
      <div className="px-1 py-1 mb-4">
        <Skeleton className="w-9 h-9 rounded-full" />
      </div>

      {/* Hero strip */}
      <div className="mb-6 px-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-2.5 h-2.5 rounded-full" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>

      {/* Amount card — invoice-unique focal element */}
      <div className={cn(cardChrome, "p-5 mb-6 space-y-2")}>
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-9 w-40" />
      </div>

      {/* Details panel */}
      <div className="mb-6 space-y-2">
        <Skeleton className="h-2.5 w-24 ml-1" />
        <div className={cn(cardChrome, "divide-y divide-gray-100 overflow-hidden")}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      </div>

      {/* Pay button */}
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  )
}