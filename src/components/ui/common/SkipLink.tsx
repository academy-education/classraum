"use client"

import React from 'react'
import { useSkipLink } from '@/hooks/useAccessibility'

interface SkipLinkProps {
  href: string
  children: React.ReactNode
  className?: string
}

export function SkipLink({ href, children, className = '' }: SkipLinkProps) {
  const skipLinkRef = useSkipLink()

  return (
    <a
      ref={skipLinkRef}
      href={href}
      className={`
        absolute top-0 left-0 z-50 px-4 py-2 bg-blue-600 text-white font-medium
        transform -translate-y-full opacity-0 transition-all duration-200
        focus:translate-y-0 focus:opacity-100
        ${className}
      `}
    >
      {children}
    </a>
  )
}

export function SkipLinks() {
  return (
    <div className="sr-only focus-within:not-sr-only">
      <SkipLink href="#main-content">
        Skip to main content
      </SkipLink>
      <SkipLink href="#navigation">
        Skip to navigation
      </SkipLink>
    </div>
  )
}