"use client"

import { MessageCircle } from 'lucide-react'

interface ChatButtonProps {
  onClick: () => void
  hasUnread?: boolean
}

export function ChatButton({ onClick, hasUnread = false }: ChatButtonProps) {
  return (
    <button
      onClick={onClick}
      className="group relative w-14 h-14 bg-gradient-to-r from-[#317cfb] via-[#19c2d6] to-[#5ed7be] text-white rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 flex items-center justify-center hover:shadow-cyan-500/25"
      aria-label="Open chat support"
    >
      {/* Unread indicator */}
      {hasUnread && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full"></div>
        </div>
      )}
      
      {/* Chat icon */}
      <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
      
      {/* Pulse animation for attention */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#317cfb] via-[#19c2d6] to-[#5ed7be] animate-ping opacity-20"></div>
    </button>
  )
}