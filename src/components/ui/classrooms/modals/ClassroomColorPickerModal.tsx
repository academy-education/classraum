"use client"

import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ModalShell } from '@/components/ui/common/ModalShell'

interface ClassroomColorPickerModalProps {
  isOpen: boolean
  onClose: () => void
  pickerHue: number
  setPickerHue: (h: number) => void
  pickerSaturation: number
  setPickerSaturation: (s: number) => void
  pickerLightness: number
  setPickerLightness: (l: number) => void
  pickerStartedFromPreset: boolean
  setPickerStartedFromPreset: (v: boolean) => void
  customColorInput: string
  setCustomColorInput: (v: string) => void
  hslToHex: (h: number, s: number, l: number) => string
  hexToHsl: (hex: string) => { h: number; s: number; l: number }
  isValidHexColor: (color: string) => boolean
  applyPickerColor: () => void
}

export function ClassroomColorPickerModal({
  isOpen,
  onClose,
  pickerHue,
  setPickerHue,
  pickerSaturation,
  setPickerSaturation,
  pickerLightness,
  setPickerLightness,
  pickerStartedFromPreset,
  setPickerStartedFromPreset,
  customColorInput,
  setCustomColorInput,
  hslToHex,
  hexToHsl,
  isValidHexColor,
  applyPickerColor,
}: ClassroomColorPickerModalProps) {
  const { t } = useTranslation()

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={String(t("classrooms.customColor"))}
      bodyClassName="space-y-6"
      footer={
        <ModalShell.Footer split>
          <Button type="button" variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={applyPickerColor}
            className="bg-gradient-to-r from-[#317cfb] via-[#19c2d6] to-[#5ed7be] text-white hover:shadow-lg transition-all"
          >
            {t("classrooms.applyColor")}
          </Button>
        </ModalShell.Footer>
      }
    >
        {/* Color Picker Content */}
        <>
          {/* Current Color Preview */}
          {!pickerStartedFromPreset && (
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-xl border-4 border-white shadow-lg"
                style={{ backgroundColor: hslToHex(pickerHue, pickerSaturation, pickerLightness) }}
              />
              <div>
                <Label className="text-sm font-medium text-gray-900">{t("classrooms.selectedColorLabel")}</Label>
                <p className="text-xl sm:text-2xl font-mono font-bold text-gray-700">{hslToHex(pickerHue, pickerSaturation, pickerLightness)}</p>
              </div>
            </div>
          )}

          {/* Color Sheet - 2D Saturation/Lightness Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">{t("classrooms.colorSheet")}</Label>
            <div
              className="relative w-full h-48 rounded-lg overflow-hidden cursor-crosshair border-2 border-gray-200"
              style={{
                background: `linear-gradient(to bottom, transparent, black), linear-gradient(to right, white, hsl(${pickerHue}, 100%, 50%))`
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = e.clientX - rect.left
                const y = e.clientY - rect.top
                const saturation = Math.round((x / rect.width) * 100)
                const lightness = Math.round(100 - (y / rect.height) * 100)
                setPickerSaturation(saturation)
                setPickerLightness(lightness)
                setPickerStartedFromPreset(false)
              }}
            >
              {/* Cursor indicator */}
              <div
                className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg pointer-events-none"
                style={{
                  left: `calc(${pickerSaturation}% - 8px)`,
                  top: `calc(${100 - pickerLightness}% - 8px)`
                }}
              />
            </div>
          </div>

          {/* Hue Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-gray-700">{t("classrooms.hue")}</Label>
              <span className="text-sm text-gray-500">{pickerHue}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={pickerHue}
              onChange={(e) => {
                setPickerHue(Number(e.target.value))
                setPickerStartedFromPreset(false)
              }}
              className="w-full h-3 rounded-lg appearance-none cursor-pointer"
              style={{
                background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
              }}
            />
          </div>

          {/* Hex Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">{t("classrooms.hexCode")}</Label>
            <Input
              type="text"
              value={customColorInput}
              onChange={(e) => {
                const value = e.target.value.trim()
                setCustomColorInput(value)
                if (isValidHexColor(value)) {
                  const hsl = hexToHsl(value)
                  setPickerHue(hsl.h)
                  setPickerSaturation(hsl.s)
                  setPickerLightness(hsl.l)
                  setPickerStartedFromPreset(false)
                }
              }}
              placeholder="#000000"
              className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-sm uppercase"
              maxLength={7}
            />
          </div>
        </>
    </ModalShell>
  )
}
