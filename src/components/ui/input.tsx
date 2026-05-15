import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Border uses `border-border` (the design token) instead of
        // `border-gray-300` so the default Input matches the convention
        // every manager page overrides to. Aligns ~95% of inputs without
        // touching their call sites.
        //
        // Focus: border-only (no glow halo). Every manager search bar
        // explicitly disables the focus ring with `focus-visible:ring-0`
        // because the design language for this app is clean border-color
        // change on focus, not the soft halo. Make that the default so
        // bare inputs in form modals match — no more "this one glows,
        // that one doesn't" inside the same page. Accessibility is still
        // covered because the border color change to primary is the focus
        // indicator.
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-border flex h-10 w-full min-w-0 rounded-lg border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,background-color,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0",
        "aria-invalid:ring-0 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
