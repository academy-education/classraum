"use client"

import { cn } from "@/lib/utils"
import { AlertCircle, AlertTriangle } from "lucide-react"
import { useTranslation } from "@/hooks/useTranslation"

interface UsageProgressBarProps {
  label: string
  current: number
  limit: number
  newLimit?: number // Optional pending new limit
  unit?: string
  className?: string
  formatValue?: (value: number) => string
}

export function UsageProgressBar({
  label,
  current,
  limit,
  newLimit,
  unit = "",
  className,
  formatValue
}: UsageProgressBarProps) {
  const { t } = useTranslation()
  const isUnlimited = limit === -1
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100)
  const isWarning = percentage >= 80 && percentage < 95
  const isDanger = percentage >= 95

  const formatDisplayValue = formatValue || ((value: number) => value.toLocaleString())

  const getBarColor = () => {
    if (isUnlimited) return "bg-gray-200"
    if (isDanger) return "bg-red-500"
    if (isWarning) return "bg-yellow-500"
    return "bg-primary"
  }

  const getTextColor = () => {
    if (isDanger) return "text-rose-700"
    if (isWarning) return "text-amber-700"
    return "text-gray-700"
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label and Values */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{label}</span>
          {isDanger && (
            <AlertCircle className="w-4 h-4 text-rose-500" />
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
              {newLimit && newLimit !== limit && (
                <span className="text-blue-600">
                  {" → "}
                  {formatDisplayValue(newLimit)} {unit}
                </span>
              )}
            </>
          )}
          {isUnlimited && (
            <span className="text-gray-500">{t('subscription.unlimitedSuffix')}</span>
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

      {/* Warning Message — translation keys live under subscription.* in
          en.json / ko.json. Previously these strings were hardcoded
          Korean, which broke the English UI. */}
      {isDanger && (
        <p className="text-xs text-rose-600 font-medium">
          {t('subscription.usageBarExceeded')}
        </p>
      )}
      {isWarning && !isDanger && (
        <p className="text-xs text-yellow-600 font-medium">
          {t('subscription.usageBarNearLimit')}
        </p>
      )}
    </div>
  )
}
