"use client"

import { cn } from "@/lib/utils"
import { AlertCircle, AlertTriangle } from "lucide-react"

interface UsageProgressBarProps {
  label: string
  current: number
  limit: number
  unit?: string
  className?: string
  formatValue?: (value: number) => string
}

export function UsageProgressBar({
  label,
  current,
  limit,
  unit = "",
  className,
  formatValue
}: UsageProgressBarProps) {
  const isUnlimited = limit === -1
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100)
  const isWarning = percentage >= 80 && percentage < 95
  const isDanger = percentage >= 95

  const formatDisplayValue = formatValue || ((value: number) => value.toLocaleString())

  const getBarColor = () => {
    if (isUnlimited) return "bg-gray-200"
    if (isDanger) return "bg-red-500"
    if (isWarning) return "bg-yellow-500"
    return "bg-blue-500"
  }

  const getTextColor = () => {
    if (isDanger) return "text-red-700"
    if (isWarning) return "text-yellow-700"
    return "text-gray-700"
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label and Values */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          {isDanger && (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          {isWarning && !isDanger && (
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          )}
        </div>
        <span className={cn("text-sm font-medium", getTextColor())}>
          {formatDisplayValue(current)} {unit}
          {!isUnlimited && (
            <>
              {" / "}
              {formatDisplayValue(limit)} {unit}
            </>
          )}
          {isUnlimited && (
            <span className="text-gray-500"> / 무제한</span>
          )}
        </span>
      </div>

      {/* Progress Bar */}
      {!isUnlimited && (
        <>
          <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={cn(
                "h-2.5 rounded-full transition-all duration-300",
                getBarColor()
              )}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Percentage Display */}
          <div className="flex justify-end">
            <span className={cn("text-xs font-medium", getTextColor())}>
              {percentage.toFixed(1)}%
            </span>
          </div>
        </>
      )}

      {/* Warning Message */}
      {isDanger && (
        <p className="text-xs text-red-600 font-medium">
          ⚠️ 사용량이 한도를 초과했습니다. 플랜 업그레이드를 고려해주세요.
        </p>
      )}
      {isWarning && !isDanger && (
        <p className="text-xs text-yellow-600 font-medium">
          ⚠️ 사용량이 한도에 근접했습니다.
        </p>
      )}
    </div>
  )
}
