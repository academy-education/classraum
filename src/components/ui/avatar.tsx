"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden rounded-full",
  {
    variants: {
      size: {
        xs: "h-6 w-6",
        sm: "h-8 w-8", 
        md: "h-10 w-10",
        lg: "h-12 w-12",
        xl: "h-16 w-16",
        "2xl": "h-20 w-20",
      }
    },
    defaultVariants: {
      size: "md",
    },
  }
)

interface AvatarProps
  extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
    VariantProps<typeof avatarVariants> {
  status?: 'online' | 'offline' | 'away' | 'busy'
  showStatus?: boolean
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, status, showStatus = false, ...props }, ref) => {
  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500', 
    busy: 'bg-red-500',
  }

  const statusSizes = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
    xl: 'h-4 w-4',
    '2xl': 'h-5 w-5',
  }

  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(avatarVariants({ size }), className)}
      {...props}
    >
      {props.children}
      {showStatus && status && (
        <span 
          className={cn(
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-background",
            statusColors[status],
            statusSizes[size || 'md']
          )}
        />
      )}
    </AvatarPrimitive.Root>
  )
})
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

// Avatar Group Component
interface AvatarGroupProps {
  children: React.ReactNode
  max?: number
  className?: string
  size?: VariantProps<typeof avatarVariants>['size']
}

const AvatarGroup = React.memo<AvatarGroupProps>(({ 
  children, 
  max = 5, 
  className = "",
  size = "md"
}) => {
  const avatars = React.Children.toArray(children)
  const visibleAvatars = avatars.slice(0, max)
  const remainingCount = Math.max(0, avatars.length - max)

  return (
    <div className={cn("flex -space-x-2", className)}>
      {visibleAvatars.map((avatar, index) => (
        <div key={index} className="relative ring-2 ring-background rounded-full">
          {React.isValidElement(avatar) 
            ? React.cloneElement(avatar, { size })
            : avatar
          }
        </div>
      ))}
      {remainingCount > 0 && (
        <div className={cn(
          avatarVariants({ size }),
          "flex items-center justify-center bg-muted text-muted-foreground font-medium ring-2 ring-background"
        )}>
          +{remainingCount}
        </div>
      )}
    </div>
  )
})

AvatarGroup.displayName = "AvatarGroup"

export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, avatarVariants }