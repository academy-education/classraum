"use client"

import React from 'react'

interface KeyboardShortcutIndicatorProps {
  shortcut: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function KeyboardShortcutIndicator({ 
  shortcut, 
  className = '', 
  size = 'md' 
}: KeyboardShortcutIndicatorProps) {
  const sizeClasses = {
    sm: 'text-xs px-1 py-0.5',
    md: 'text-xs px-1.5 py-0.5', 
    lg: 'text-sm px-2 py-1'
  }

  const keys = shortcut.split(' + ')

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {keys.map((key, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <span className="text-gray-400 text-xs">+</span>
          )}
          <kbd className={`
            bg-gray-100 border border-gray-300 rounded font-mono shadow-sm
            ${sizeClasses[size]}
          `}>
            {key === 'Ctrl' ? '⌃' : 
             key === 'Cmd' || key === '⌘' ? '⌘' :
             key === 'Alt' ? '⌥' :
             key === 'Shift' ? '⇧' :
             key}
          </kbd>
        </React.Fragment>
      ))}
    </div>
  )
}

// Utility component for adding shortcuts to buttons
interface ButtonWithShortcutProps {
  children: React.ReactNode
  shortcut?: string
  onClick?: () => void
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

export function ButtonWithShortcut({
  children,
  shortcut,
  onClick,
  className = '',
  variant = 'default',
  size = 'md',
  disabled = false
}: ButtonWithShortcutProps) {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground'
  }
  
  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-6'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      <span className="flex items-center gap-2">
        {children}
        {shortcut && (
          <KeyboardShortcutIndicator 
            shortcut={shortcut} 
            size="sm"
            className="ml-auto opacity-60"
          />
        )}
      </span>
    </button>
  )
}