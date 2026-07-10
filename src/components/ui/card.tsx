import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, onClick, onKeyDown, role, tabIndex, ...props }: React.ComponentProps<"div">) {
  // Card-as-button pattern: when consumers pass onClick we make the div
  // keyboard-accessible (Enter/Space activates) and announce as a button to
  // screen readers, unless the consumer has overridden role/tabIndex.
  const isClickable = typeof onClick === 'function'
  const computedRole = role ?? (isClickable ? 'button' : undefined)
  const computedTabIndex = tabIndex ?? (isClickable ? 0 : undefined)

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    onKeyDown?.(e)
    if (!isClickable || e.defaultPrevented) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>)
    }
  }

  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-3xl py-6 ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]",
        isClickable && "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className
      )}
      onClick={onClick}
      onKeyDown={isClickable ? handleKeyDown : onKeyDown}
      role={computedRole}
      tabIndex={computedTabIndex}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
