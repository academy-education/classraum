import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { hapticTap } from "@/lib/nativeHaptics"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_-2px_rgba(40,133,232,0.4)] hover:-translate-y-px hover:bg-primary",
        destructive:
          "bg-destructive text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_4px_12px_-2px_rgba(244,63,94,0.4)] hover:-translate-y-px focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "bg-white text-gray-700 ring-1 ring-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:ring-gray-300 hover:shadow-[0_2px_6px_-1px_rgba(0,0,0,0.08)] hover:-translate-y-px hover:bg-white dark:bg-input/30 dark:ring-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-11 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /**
     * Opt OUT of the press haptic. Default is on.
     *
     * Off is right for a control that fires many times in quick
     * succession (a stepper held down, a repeat/seek control): a buzz per
     * repeat stops reading as feedback and starts reading as a fault.
     */
    haptic?: boolean
  }

/**
 * HAPTICS LIVE HERE, NOT IN EVERY onClick.
 *
 * The app had haptics in seventeen files. StudyButton had them; this —
 * the base button behind auth, the dashboard, every dialog and every
 * form — did not, so whether a press felt like anything depended on
 * which component the author happened to reach for.
 *
 * Wrapping onClick once covers all of them and cannot be forgotten by
 * the next person adding a button. The alternative, dropping hapticTap()
 * into hundreds of handlers, is the same decision made hundreds of times
 * and drifts on the first one somebody misses.
 *
 * Fires only on a real press: `disabled` is checked because Slot
 * (asChild) renders whatever child it is given and will happily forward
 * a click that the styling merely LOOKS inert for. hapticTap itself is
 * fire-and-forget and a silent no-op off-native, so this costs the web
 * nothing.
 */
function Button({
  className,
  variant,
  size,
  asChild = false,
  haptic = true,
  onClick,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"

  const handleClick = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (haptic && !props.disabled) hapticTap()
      onClick?.(e)
    },
    [haptic, onClick, props.disabled],
  )

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      onClick={handleClick}
      {...props}
    />
  )
}

export { Button, buttonVariants }
