"use client"

import { useState } from 'react'
import { ChatButton } from './chat-button'
import { ChatWindow } from './chat-window'

interface ChatWidgetProps {
  userId?: string
  userName?: string
  userEmail?: string
  onClose?: () => void
}

export function ChatWidget({ userId, userName, userEmail, onClose }: ChatWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
    if (isExpanded && hasUnread) {
      setHasUnread(false)
    }
  }

  const handleClose = () => {
    setIsExpanded(false)
    onClose?.()
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {isExpanded ? (
        <ChatWindow
          userId={userId}
          userName={userName}
          userEmail={userEmail}
          onClose={handleClose}
          onMinimize={() => setIsExpanded(false)}
        />
      ) : (
        <ChatButton
          onClick={handleToggle}
          hasUnread={hasUnread}
        />
      )}
    </div>
  )
}