"use client"

import React, { useState } from 'react'
import { CustomColorPicker } from './CustomColorPicker'
import { Button } from '@/components/ui/button'

/**
 * Example usage of the CustomColorPicker component
 */
export function ColorPickerExample() {
  const [showPicker, setShowPicker] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#3B82F6')

  // Optional: Define preset colors to exclude from custom color saving
  const presetColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Yellow
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16'  // Lime
  ]

  const handleApplyColor = (color: string) => {
    setSelectedColor(color)
    console.log('Color applied:', color)
    // You can save to database here if needed
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Custom Color Picker Example</h1>

      {/* Color Preview */}
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-20 h-20 rounded-lg border-2 border-gray-300 shadow-md"
          style={{ backgroundColor: selectedColor }}
        />
        <div>
          <p className="text-sm text-gray-600">Current Color:</p>
          <p className="text-xl font-mono font-bold">{selectedColor}</p>
        </div>
      </div>

      {/* Trigger Button */}
      <Button onClick={() => setShowPicker(true)}>
        Open Color Picker
      </Button>

      {/* Color Picker Modal */}
      <CustomColorPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onApply={handleApplyColor}
        initialColor={selectedColor}
        presetColors={presetColors}
      />
    </div>
  )
}

/**
 * Minimal example - just the essentials
 */
export function MinimalExample() {
  const [showPicker, setShowPicker] = useState(false)
  const [color, setColor] = useState('#3B82F6')

  return (
    <>
      <button
        onClick={() => setShowPicker(true)}
        style={{ backgroundColor: color }}
        className="w-12 h-12 rounded-lg"
      />

      <CustomColorPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onApply={setColor}
        initialColor={color}
      />
    </>
  )
}
