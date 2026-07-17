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
        className="fixed inset-0 backdrop-blur-sm bg-black/40"
        style={{ zIndex: 9998 }}
        onClick={handleBackdropClick}
      />

      {/* Bottom Sheet */}
      <div
        ref={bottomSheetRef}
        className="bg-white rounded-t-3xl w-full flex flex-col overflow-hidden shadow-[0_-24px_48px_-12px_rgba(0,0,0,0.18)]"
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
        {/* Handle Bar — refined */}
        <div
          className="flex justify-center pt-3 pb-2"
          onTouchStart={handleHeaderTouchStart}
        >
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header — eyebrow + count chip */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b border-gray-100"
          onTouchStart={handleHeaderTouchStart}
        >
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400">
              {t('mobile.assignments.comments.commentCount', { count: comments.length })}
            </div>
            <h2 className="text-base font-semibold text-gray-900 truncate flex items-center gap-2">
              {assignmentTitle}
              {comments.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-semibold bg-primary/10 text-primary rounded-full">
                  {comments.length}
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 hover:bg-gray-50 rounded-full transition-colors flex items-center justify-center flex-shrink-0"
            aria-label={String(t('mobile.assignments.comments.closeComments'))}
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-white">
                    {comment.user_initials}
                  </span>
                </div>
                <div className="flex-1 min-w-0 bg-gray-50 rounded-2xl px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {comment.user_name}
                    </span>
                    <span className="text-[10px] text-gray-400 tabular-nums flex-shrink-0">
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
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Send className="w-5 h-5 text-primary" strokeWidth={1.75} />
              </div>
              <p className="text-sm font-semibold text-gray-900">{t('mobile.assignments.comments.noComments')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('mobile.assignments.comments.beFirstToComment')}</p>
            </div>
          )}
        </div>

        {/* Comment Input — softer chrome with rounded chat input */}
        <div className="border-t border-gray-100 p-3 flex-shrink-0 bg-gray-50/50">
          <div className="flex items-end gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-white">
                {user?.userName?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-end gap-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={String(t('mobile.assignments.comments.addComment'))}
                  className="flex-1 py-2 px-3 bg-white rounded-2xl resize-none ring-1 ring-gray-200 focus:ring-primary focus:outline-none text-sm transition-shadow"
                  rows={1}
                  maxLength={500}
                  disabled={isSubmitting}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || isSubmitting}
                  className="w-9 h-9 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-[0_4px_12px_-4px_rgba(40,133,232,0.5)] flex-shrink-0"
                  aria-label={isSubmitting ? String(t('mobile.assignments.comments.posting')) : String(t('mobile.assignments.comments.post'))}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              {newComment.length > 0 && (
                <div className="mt-1 px-1">
                  <span className="text-[10px] text-gray-400 tabular-nums">
                    {newComment.length}/500
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}