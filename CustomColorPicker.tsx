"use client"

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CustomColorPickerProps {
  isOpen: boolean
  onClose: () => void
  onApply: (color: string) => void
  initialColor?: string
  presetColors?: string[]
}

export function CustomColorPicker({
  isOpen,
  onClose,
  onApply,
  initialColor = '#3B82F6',
  presetColors = []
}: CustomColorPickerProps) {
  const [pickerHue, setPickerHue] = useState(210)
  const [pickerSaturation, setPickerSaturation] = useState(100)
  const [pickerLightness, setPickerLightness] = useState(50)
  const [hexInput, setHexInput] = useState('')
  const [isFromPreset, setIsFromPreset] = useState(false)

  // Validate hex color
  const isValidHexColor = (color: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(color)
  }

  // Convert HSL to HEX
  const hslToHex = (h: number, s: number, l: number): string => {
    l /= 100
    const a = s * Math.min(l, 1 - l) / 100
    const f = (n: number) => {
      const k = (n + h / 30) % 12
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase()
  }

  // Convert HEX to HSL
  const hexToHsl = (hex: string): { h: number, s: number, l: number } => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return { h: 0, s: 0, l: 50 }

    let r = parseInt(result[1], 16) / 255
    let g = parseInt(result[2], 16) / 255
    let b = parseInt(result[3], 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0, s = 0, l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    }
  }

  // Initialize picker when opened
  React.useEffect(() => {
    if (isOpen) {
      const normalizedInitialColor = initialColor.toUpperCase()
      const normalizedPresets = presetColors.map(c => c.toUpperCase())
      const isPreset = normalizedPresets.includes(normalizedInitialColor)

      if (!isPreset && isValidHexColor(initialColor)) {
        const hsl = hexToHsl(initialColor)
        setPickerHue(hsl.h)
        setPickerSaturation(hsl.s)
        setPickerLightness(hsl.l)
        setHexInput(initialColor)
        setIsFromPreset(false)
      } else {
        setPickerHue(0)
        setPickerSaturation(0)
        setPickerLightness(50)
        setHexInput('')
        setIsFromPreset(true)
      }
    }
  }, [isOpen, initialColor, presetColors])

  const handleApply = () => {
    const hex = hslToHex(pickerHue, pickerSaturation, pickerLightness)
    onApply(hex)
    onClose()
  }

  const handleHexInputChange = (value: string) => {
    setHexInput(value)
    if (isValidHexColor(value)) {
      const hsl = hexToHsl(value)
      setPickerHue(hsl.h)
      setPickerSaturation(hsl.s)
      setPickerLightness(hsl.l)
      setIsFromPreset(false)
    }
  }

  if (!isOpen) return null

  const currentHex = hslToHex(pickerHue, pickerSaturation, pickerLightness)

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border border-gray-200 w-full max-w-md mx-4 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Custom Color</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Color Picker Content */}
        <div className="p-6 space-y-6">
          {/* Current Color Preview */}
          {!isFromPreset && (
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-xl border-4 border-white shadow-lg"
                style={{ backgroundColor: currentHex }}
              />
              <div>
                <Label className="text-sm font-medium text-gray-900">Selected Color</Label>
                <p className="text-2xl font-mono font-bold text-gray-700">{currentHex}</p>
              </div>
            </div>
          )}

          {/* Color Sheet - 2D Saturation/Lightness Picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Color Sheet</Label>
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
                setIsFromPreset(false)
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
              <Label className="text-sm font-medium text-gray-700">Hue</Label>
              <span className="text-sm text-gray-500">{pickerHue}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              value={pickerHue}
              onChange={(e) => {
                setPickerHue(Number(e.target.value))
                setIsFromPreset(false)
              }}
              className="w-full h-3 rounded-lg appearance-none cursor-pointer"
              style={{
                background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
              }}
            />
          </div>

          {/* Hex Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Hex Code</Label>
            <Input
              type="text"
              value={hexInput}
              onChange={(e) => handleHexInputChange(e.target.value.trim())}
              placeholder="#000000"
              className="h-10 rounded-lg border border-gray-300 bg-transparent focus:border-blue-500 focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-sm uppercase"
              maxLength={7}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 p-6 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleApply}
            className="flex-1"
          >
            Apply Color
          </Button>
        </div>
      </div>
    </div>
  )
}
