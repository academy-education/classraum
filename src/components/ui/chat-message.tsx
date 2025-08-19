"use client"

import Image from 'next/image'

interface Message {
  id: string
  sender: 'user' | 'support'
  message: string
  timestamp: Date
  senderName?: string
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.sender === 'user'
  const timeString = message.timestamp.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0 ${
        isUser 
          ? 'bg-gradient-to-r from-[#317cfb] via-[#19c2d6] to-[#5ed7be]' 
          : 'bg-white border border-gray-200'
      }`}>
        {isUser ? (
          message.senderName?.charAt(0).toUpperCase() || 'U'
        ) : (
          <Image
            src="/inverse-logo.png"
            alt="Support"
            width={24}
            height={24}
            className="w-6 h-6"
          />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-[75%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`px-3 py-2 rounded-lg text-sm ${
          isUser
            ? 'bg-gradient-to-r from-[#317cfb] via-[#19c2d6] to-[#5ed7be] text-white rounded-br-none'
            : 'bg-white border border-gray-200 text-gray-900 rounded-bl-none'
        }`}>
          <p className="break-words whitespace-pre-wrap">{message.message}</p>
        </div>
        
        {/* Timestamp */}
        <span className={`text-xs text-gray-500 mt-1 px-1 ${
          isUser ? 'text-right' : 'text-left'
        }`}>
          {timeString}
        </span>
      </div>
    </div>
  )
}