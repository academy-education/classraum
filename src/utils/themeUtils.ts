// Utility functions for theme management

export type ThemeName = 'light' | 'dark' | 'system' | 'high-contrast'

export interface ThemeConfig {
  name: ThemeName
  displayName: string
  description: string
  icon: string
  cssClass: string
}

export const THEMES: Record<ThemeName, ThemeConfig> = {
  light: {
    name: 'light',
    displayName: 'Light',
    description: 'Light theme with bright backgrounds',
    icon: '☀️',
    cssClass: 'theme-light'
  },
  dark: {
    name: 'dark',
    displayName: 'Dark',
    description: 'Dark theme with dark backgrounds',
    icon: '🌙',
    cssClass: 'theme-dark'
  },
  system: {
    name: 'system',
    displayName: 'System',
    description: 'Follows your system preference',
    icon: '💻',
    cssClass: 'theme-system'
  },
  'high-contrast': {
    name: 'high-contrast',
    displayName: 'High Contrast',
    description: 'High contrast theme for better accessibility',
    icon: '🔲',
    cssClass: 'theme-high-contrast'
  }
}

// Get CSS variable value
export function getCSSVariable(variable: string, element?: HTMLElement): string {
  if (typeof window === 'undefined') return ''
  
  const targetElement = element || document.documentElement
  const computedStyle = getComputedStyle(targetElement)
  return computedStyle.getPropertyValue(variable).trim()
}

// Set CSS variable value
export function setCSSVariable(variable: string, value: string, element?: HTMLElement): void {
  if (typeof window === 'undefined') return
  
  const targetElement = element || document.documentElement
  targetElement.style.setProperty(variable, value)
}

// Get current system theme preference
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

// Check if user prefers reduced motion
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Check if user prefers high contrast
export function prefersHighContrast(): boolean {
  if (typeof window === 'undefined') return false
  
  return window.matchMedia('(prefers-contrast: high)').matches
}

// Resolve theme to actual theme (converts 'system' to 'light' or 'dark')
export function resolveTheme(theme: ThemeName): 'light' | 'dark' | 'high-contrast' {
  if (theme === 'system') {
    return getSystemTheme()
  }
  return theme as 'light' | 'dark' | 'high-contrast'
}

// Generate theme-aware color palette
export function generateColorPalette(baseColor: string, theme: ThemeName): Record<string, string> {
  const resolved = resolveTheme(theme)
  const isDark = resolved === 'dark'
  
  // This is a simplified color generation - in a real app you might use a library like chroma-js
  const colors: Record<string, string> = {}
  
  if (resolved === 'high-contrast') {
    return {
      '50': '#ffffff',
      '100': '#ffffff',
      '200': '#ffffff',
      '300': '#ffffff',
      '400': '#000000',
      '500': '#000000',
      '600': '#000000',
      '700': '#000000',
      '800': '#000000',
      '900': '#000000'
    }
  }
  
  // Generate shades based on base color and theme
  const shades = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900']
  
  shades.forEach((shade, index) => {
    const intensity = isDark ? 1 - (index / 9) : index / 9
    colors[shade] = adjustColorBrightness(baseColor, intensity)
  })
  
  return colors
}

// Adjust color brightness (simplified implementation)
function adjustColorBrightness(color: string, factor: number): string {
  // This is a basic implementation - in production you'd want a more sophisticated color manipulation library
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  const newR = Math.round(r * factor)
  const newG = Math.round(g * factor)
  const newB = Math.round(b * factor)
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

// Create custom theme CSS
export function createCustomTheme(
  name: string,
  colors: Record<string, string>,
  baseTheme: 'light' | 'dark' = 'light'
): string {
  const themeVars = Object.entries(colors)
    .map(([key, value]) => `  --color-custom-${key}: ${value};`)
    .join('\n')
  
  return `
[data-theme="${name}"] {
${themeVars}
  /* Inherit base theme variables */
  ${baseTheme === 'dark' ? '@extend [data-theme="dark"];' : '@extend [data-theme="light"];'}
  
  /* Override with custom colors */
  --interactive-primary: var(--color-custom-500);
  --interactive-primary-hover: var(--color-custom-600);
  --interactive-primary-active: var(--color-custom-700);
  --text-accent: var(--color-custom-600);
  --border-accent: var(--color-custom-300);
  --bg-accent: var(--color-custom-50);
}
  `.trim()
}

// Theme validation
export function isValidTheme(theme: string): theme is ThemeName {
  return Object.keys(THEMES).includes(theme)
}

// Get contrasting text color for a background
export function getContrastingTextColor(backgroundColor: string, theme: ThemeName): string {
  const resolved = resolveTheme(theme)
  
  if (resolved === 'high-contrast') {
    return backgroundColor === '#ffffff' ? '#000000' : '#ffffff'
  }
  
  // Simplified contrast calculation
  const hex = backgroundColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  
  if (resolved === 'dark') {
    return brightness > 128 ? 'var(--text-primary)' : 'var(--text-inverse)'
  } else {
    return brightness > 128 ? 'var(--text-primary)' : 'var(--text-inverse)'
  }
}