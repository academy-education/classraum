"use client"

import React from 'react'
import { Settings2, Check, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

interface DashboardEditToggleProps {
  isEditMode: boolean
  saving: boolean
  onToggleEditMode: () => void
  onSave: () => void
  onReset: () => void
}

export const DashboardEditToggle = React.memo(function DashboardEditToggle({
  isEditMode,
  saving,
  onToggleEditMode,
  onSave,
  onReset
}: DashboardEditToggleProps) {
  const { t } = useTranslation()

  if (isEditMode) {
    return (
      <div className="flex items-center gap-2">
        {/* Reset Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="text-gray-500 hover:text-gray-700"
          disabled={saving}
        >
          <RotateCcw className="w-4 h-4 mr-1.5" />
          {t('dashboard.editMode.resetToDefault')}
        </Button>

        {/* Done/Save Button */}
        <Button
          size="sm"
          onClick={() => {
            onSave()
            onToggleEditMode()
          }}
          disabled={saving}
          className={cn(
            "min-w-[100px]",
            saving && "opacity-70"
          )}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              {t('dashboard.editMode.saving')}
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-1.5" />
              {t('dashboard.editMode.done')}
            </>
          )}
        </Button>
      </div>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggleEditMode}
      className="text-gray-600 hover:text-gray-900"
    >
      <Settings2 className="w-4 h-4 mr-1.5" />
      {t('dashboard.editMode.customize')}
    </Button>
  )
})

DashboardEditToggle.displayName = 'DashboardEditToggle'
