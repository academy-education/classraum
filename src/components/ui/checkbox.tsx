"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { hapticTap } from "@/lib/nativeHaptics"

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // On change, not on click: a checkbox can also be toggled by
      // keyboard or by a click on its label, and both should feel the
      // same as tapping the box.
      if (!props.disabled) hapticTap()
      onChange?.(e)
      onCheckedChange?.(e.target.checked)
    }

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 bg-white",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "checked:bg-primary checked:border-primary",
            className
          )}
          ref={ref}
          checked={checked}
          onChange={handleChange}
          {...props}
        />
        <Check
          className={cn(
            "pointer-events-none absolute h-3 w-3 text-white",
            "opacity-0 peer-checked:opacity-100",
            "left-0.5 top-0.5"
          )}
        />
      </div>
    )
  }
)
Checkbox.displayName = "Checkbox"

export { Checkbox }