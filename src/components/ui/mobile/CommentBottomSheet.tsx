"use client"

import React, { useEffect, useRef } from 'react'
import { X, Send } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { usePersistentMobileAuth } from '@/contexts/PersistentMobileAuth'
import { useLanguage } from '@/contexts/LanguageContext'

interface Comment {
  id: string
  assignment_id: string
  user_id: string
  user_name: string
  user_initials: string
  content: string
  created_at: string
  updated_at?: string
}

interface CommentBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  assignmentTitle: string
  assignmentId: string
  comments: Comment[]
  onAddComment: (content: string) => void
}

export function CommentBottomSheet({
  isOpen,
  onClose,
  assignmentTitle,
  comments,
  onAddComment
}: CommentBottomSheetProps) {
  const { t } = useTranslation()
  const { user } = usePersistentMobileAuth()
  const { language } = useLanguage()
  const bottomSheetRef = useRef<HTMLDivElement>(null)
  const [newComment, setNewComment] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Handle body scroll prevention when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Handle swipe down gesture only on header area
  const handleHeaderTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    const startY = touch.clientY
    const startTime = Date.now()
    
    const handleTouchMove = (moveEvent: TouchEvent) => {
      const currentTouch = moveEvent.touches[0]
      const deltaY = currentTouch.clientY - startY
      const deltaTime = Date.now() - startTime
      
      // Only close if it's a quick downward swipe (not slow scrolling)
      if (deltaY > 50 && deltaTime < 300) {
        onClose()
      }
    }
    
    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
    
    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return
    
    setIsSubmitting(true)
    try {
      await onAddComment(newComment.trim())
      setNewComment('')
    } catch (error) {
      console.error('Error submitting comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatCommentDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    const locale = language === 'korean' ? 'ko-KR' : 'en-US'
    
    if (diffInMinutes < 1) return t('mobile.assignments.comments.justNow')
    if (diffInMinutes < 60) return t('mobile.assignments.comments.minutesAgo', { count: diffInMinutes })
    if (diffInMinutes < 1440) return t('mobile.assignments.comments.hoursAgo', { count: Math.floor(diffInMinutes / 60) })
    if (diffInMinutes < 10080) return t('mobile.assignments.comments.daysAgo', { count: Math.floor(diffInMinutes / 1440) })
    
    return date.toLocaleDateString(locale)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 backdrop-blur-sm bg-black/20"
        style={{ zIndex: 9998 }}
        onClick={handleBackdropClick}
      />
      
      {/* Bottom Sheet */}
      <div
        ref={bottomSheetRef}
        className="bg-white rounded-t-2xl w-full flex flex-col overflow-hidden shadow-2xl"
        style={{ 
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '70vh',
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 300ms ease-out',
          zIndex: 9999
        }}
      >
        {/* Handle Bar */}
        <div 
          className="flex justify-center py-3"
          onTouchStart={handleHeaderTouchStart}
        >
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        <div 
          className="flex items-center justify-between px-4 pb-3 border-b border-gray-200"
          onTouchStart={handleHeaderTouchStart}
        >
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 truncate">
              {assignmentTitle}
            </h2>
            <p className="text-sm text-gray-500">
              {t('mobile.assignments.comments.commentCount', { count: comments.length })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={String(t('mobile.assignments.comments.closeComments'))}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-white">
                    {comment.user_initials}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {comment.user_name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatCommentDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('mobile.assignments.comments.noComments')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('mobile.assignments.comments.beFirstToComment')}</p>
            </div>
          )}
        </div>

        {/* Comment Input */}
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
          <div className="flex space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-white">
                {user?.userName?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1">
              <div className="flex items-end space-x-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={String(t('mobile.assignments.comments.addComment'))}
                  className="flex-1 py-2 px-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  rows={2}
                  maxLength={500}
                  disabled={isSubmitting}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  aria-label={isSubmitting ? String(t('mobile.assignments.comments.posting')) : String(t('mobile.assignments.comments.post'))}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-1">
                <span className="text-xs text-gray-400">
                  {t('mobile.assignments.comments.characterLimit', { current: newComment.length, max: 500 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}