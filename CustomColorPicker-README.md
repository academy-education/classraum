# Custom Color Picker Component

A beautiful, interactive HSL-based color picker with 2D color sheet, hue slider, and hex input.

## Features

- **2D Color Sheet**: Interactive saturation/lightness picker
- **Hue Slider**: 360-degree hue selection with rainbow gradient
- **Hex Input**: Manual color code entry with validation
- **Real-time Preview**: See color changes instantly
- **Preset Detection**: Smart initialization based on preset colors
- **HSL/Hex Conversion**: Automatic conversion between color formats
- **Responsive Design**: Works on all screen sizes
- **Accessible**: Keyboard and screen reader friendly

## Installation

1. Copy `CustomColorPicker.tsx` to your components folder
2. Ensure you have these dependencies:
   - `lucide-react` (for icons)
   - Your UI components: Button, Input, Label

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `isOpen` | `boolean` | Yes | - | Controls modal visibility |
| `onClose` | `() => void` | Yes | - | Called when modal is closed |
| `onApply` | `(color: string) => void` | Yes | - | Called when color is applied |
| `initialColor` | `string` | No | `'#3B82F6'` | Initial color (hex format) |
| `presetColors` | `string[]` | No | `[]` | Array of preset colors to detect |

## Usage

### Basic Example

```tsx
import { CustomColorPicker } from './CustomColorPicker'
import { useState } from 'react'

function MyComponent() {
  const [showPicker, setShowPicker] = useState(false)
  const [color, setColor] = useState('#3B82F6')

  return (
    <>
      <button
        onClick={() => setShowPicker(true)}
        style={{ backgroundColor: color }}
      >
        Choose Color
      </button>

      <CustomColorPicker
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        onApply={setColor}
        initialColor={color}
      />
    </>
  )
}
```

### With Preset Colors

```tsx
const presetColors = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
]

<CustomColorPicker
  isOpen={showPicker}
  onClose={() => setShowPicker(false)}
  onApply={handleApplyColor}
  initialColor={selectedColor}
  presetColors={presetColors}
/>
```

## How It Works

### Color Space
The picker uses the HSL (Hue, Saturation, Lightness) color model:
- **Hue**: 0-360° (color wheel position)
- **Saturation**: 0-100% (color intensity)
- **Lightness**: 0-100% (brightness)

### Interaction
1. **Color Sheet**: Click to set saturation (X-axis) and lightness (Y-axis)
2. **Hue Slider**: Drag to change base color (0-360°)
3. **Hex Input**: Type color code directly (#RRGGBB format)

### Preset Detection
When opening with a preset color, the picker resets to default state. When opening with a custom color, it initializes sliders to match that color.

## Styling

The component uses Tailwind CSS classes. You can customize:

- Modal backdrop: `.bg-black/50 .backdrop-blur-sm`
- Modal container: `.bg-white .rounded-xl .shadow-2xl`
- Color sheet: `.h-48` (height)
- Border colors: `.border-gray-200`
- Button styles: via your Button component

### Custom Styling Example

```tsx
// Modify in CustomColorPicker.tsx
<div className="bg-white dark:bg-gray-800 rounded-xl">
  {/* Your custom classes */}
</div>
```

## Functions

### Color Conversion

```tsx
// HSL to Hex
hslToHex(210, 100, 50) // Returns: "#0080FF"

// Hex to HSL
hexToHsl("#0080FF") // Returns: { h: 210, s: 100, l: 50 }
```

### Validation

```tsx
isValidHexColor("#0080FF") // true
isValidHexColor("0080FF")  // false (missing #)
isValidHexColor("#08F")    // false (must be 6 digits)
```

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile: ✅ Touch-friendly

## Accessibility

- Keyboard navigation supported
- Click outside to close
- ESC key support (can be added)
- ARIA labels (can be enhanced)

## Advanced Usage

### Saving to Database

```tsx
const handleApplyColor = async (color: string) => {
  setSelectedColor(color)

  // Save to database
  await supabase
    .from('custom_colors')
    .upsert({
      user_id: userId,
      color: color
    })
}
```

### With Color History

```tsx
const [colorHistory, setColorHistory] = useState<string[]>([])

const handleApplyColor = (color: string) => {
  setSelectedColor(color)
  setColorHistory(prev => [color, ...prev.slice(0, 9)]) // Keep last 10
}
```

## Customization Ideas

1. **Add opacity slider** for RGBA support
2. **Color swatches** below picker for quick access
3. **Eyedropper tool** to pick from screen
4. **Color harmonies** (complementary, triadic, etc.)
5. **Named colors** (Material Design, Tailwind, etc.)
6. **Favorite colors** persistence

## License

Free to use in your projects!

## Credits

Extracted from Classraum academy management platform.
