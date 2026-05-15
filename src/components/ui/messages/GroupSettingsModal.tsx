"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Search,
  Loader2,
  User,
  Users,
  X,
  Check,
  UserPlus,
  LogOut,
  Camera,
  Trash2,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { showErrorToast, showSuccessToast } from '@/stores'
import { cn } from '@/lib/utils'
import type { Conversation, ConversationParticipant, Contact, GroupedContacts } from './MessagesPage'

interface GroupSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  conversation: Conversation
  currentUserId: string
  // Called after any change so the parent can refetch.
  onChanged: () => void
  // Called specifically when the current user leaves — parent should
  // deselect the conversation (it's no longer in their list).
  onLeft: () => void
}

// Two views inside this modal:
//   'overview' — main settings (avatar, name, members, leave)
//   'add'      — picker for adding new members (reuses contact API)
type View = 'overview' | 'add'

// Tiny role-color helper, kept in sync with the rest of the messages UI.
const ROLE_COLORS: Record<string, string> = {
  manager: 'bg-purple-100 text-purple-700',
  teacher: 'bg-sky-50 text-sky-700',
  student: 'bg-emerald-50 text-emerald-700',
  parent: 'bg-amber-50 text-amber-700',
}

export function GroupSettingsModal({
  isOpen,
  onClose,
  conversation,
  currentUserId,
  onChanged,
  onLeft,
}: GroupSettingsModalProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---- Overview state ----
  const [view, setView] = useState<View>('overview')
  const [name, setName] = useState(conversation.name || '')
  const [savingName, setSavingName] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leaving, setLeaving] = useState(false)

  // ---- Add-members view state ----
  const [contacts, setContacts] = useState<GroupedContacts>({
    teachers: [], students: [], parents: [], family: []
  })
  const [contactsLoading, setContactsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedNewIds, setSelectedNewIds] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)

  // Reset state when modal opens (so it always starts in overview with fresh values).
  useEffect(() => {
    if (isOpen) {
      setView('overview')
      setName(conversation.name || '')
      setSearchQuery('')
      setSelectedNewIds(new Set())
      setShowLeaveConfirm(false)
    }
  }, [isOpen, conversation.id, conversation.name])

  const authedFetch = async (url: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Not authenticated')
    const headers = new Headers(init?.headers)
    headers.set('Authorization', `Bearer ${session.access_token}`)
    if (init?.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    return fetch(url, { ...init, headers })
  }

  // ---- Save group name ----
  const handleSaveName = async () => {
    const trimmed = name.trim()
    if (trimmed === (conversation.name || '')) return // no change
    setSavingName(true)
    try {
      const res = await authedFetch(`/api/messages/conversations/${conversation.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: trimmed }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || err.error || 'Rename failed')
      }
      showSuccessToast(String(t('messages.groupRenamedSuccess')))
      onChanged()
    } catch (error) {
      console.error('Rename error:', error)
      showErrorToast(error instanceof Error ? error.message : String(t('messages.renameError')))
    } finally {
      setSavingName(false)
    }
  }

  // ---- Upload avatar ----
  // Uses Supabase Storage directly from the client. The bucket
  // `conversation-avatars` must be public and exist (created via the dashboard).
  const handleAvatarPick = () => fileInputRef.current?.click()

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      showErrorToast(String(t('messages.avatarTooLarge')))
      return
    }
    setUploadingAvatar(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const path = `${conversation.id}/avatar-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('conversation-avatars')
        .upload(path, file, { cacheControl: '3600', upsert: true })
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('conversation-avatars')
        .getPublicUrl(path)

      const res = await authedFetch(`/api/messages/conversations/${conversation.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ avatarUrl: publicUrl }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || err.error || 'Avatar update failed')
      }
      showSuccessToast(String(t('messages.avatarUpdatedSuccess')))
      onChanged()
    } catch (error) {
      console.error('Avatar upload error:', error)
      showErrorToast(error instanceof Error ? error.message : String(t('messages.avatarError')))
    } finally {
      setUploadingAvatar(false)
      // Allow re-uploading the same file twice in a row by clearing the input.
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveAvatar = async () => {
    if (!conversation.avatarUrl) return
    setUploadingAvatar(true)
    try {
      const res = await authedFetch(`/api/messages/conversations/${conversation.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ avatarUrl: null }),
      })
      if (!res.ok) throw new Error('Failed to remove avatar')
      onChanged()
    } catch (error) {
      console.error('Remove avatar error:', error)
      showErrorToast(String(t('messages.avatarError')))
    } finally {
      setUploadingAvatar(false)
    }
  }

  // ---- Remove member ----
  const handleRemoveMember = async (memberId: string) => {
    setRemovingMemberId(memberId)
    try {
      const res = await authedFetch(
        `/api/messages/conversations/${conversation.id}/members/${memberId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || err.error || 'Failed to remove member')
      }
      showSuccessToast(String(t('messages.memberRemovedSuccess')))
      onChanged()
    } catch (error) {
      console.error('Remove member error:', error)
      showErrorToast(error instanceof Error ? error.message : String(t('messages.removeMemberError')))
    } finally {
      setRemovingMemberId(null)
    }
  }

  // ---- Leave group ----
  const handleLeaveGroup = async () => {
    setLeaving(true)
    try {
      const res = await authedFetch(
        `/api/messages/conversations/${conversation.id}/members/${currentUserId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || err.error || 'Failed to leave group')
      }
      showSuccessToast(String(t('messages.leftGroupSuccess')))
      onLeft()
      onClose()
    } catch (error) {
      console.error('Leave group error:', error)
      showErrorToast(error instanceof Error ? error.message : String(t('messages.leaveGroupError')))
      setLeaving(false)
    }
  }

  // ---- Add members view ----
  const fetchContacts = useCallback(async () => {
    setContactsLoading(true)
    try {
      const res = await authedFetch('/api/messages/contacts')
      if (!res.ok) throw new Error('Failed to load contacts')
      const data = await res.json()
      setContacts(data.contacts || { teachers: [], students: [], parents: [], family: [] })
    } catch (error) {
      console.error('Contacts error:', error)
      showErrorToast(String(t('messages.fetchError')))
    } finally {
      setContactsLoading(false)
    }
  }, [t])

  // Fetch contacts when entering the "add" view for the first time.
  useEffect(() => {
    if (view === 'add') fetchContacts()
  }, [view, fetchContacts])

  // Existing member ids — filter them out of the contact picker so users
  // can't try to add them twice.
  const existingMemberIds = new Set(conversation.allParticipants.map(p => p.id))

  const filterAndExclude = (list: Contact[]) =>
    list
      .filter(c => !existingMemberIds.has(c.id))
      .filter(c =>
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email.toLowerCase().includes(searchQuery.toLowerCase())
      )

  const filteredTeachers = filterAndExclude(contacts.teachers)
  const filteredStudents = filterAndExclude(contacts.students)
  const filteredParents = filterAndExclude(contacts.parents)
  const filteredFamily = filterAndExclude(contacts.family)
  const totalFiltered =
    filteredTeachers.length + filteredStudents.length + filteredParents.length + filteredFamily.length

  const toggleNewMember = (id: string) => {
    setSelectedNewIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const handleAddMembers = async () => {
    if (selectedNewIds.size === 0) return
    setAdding(true)
    try {
      const res = await authedFetch(`/api/messages/conversations/${conversation.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ userIds: Array.from(selectedNewIds) }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || err.error || 'Failed to add members')
      }
      showSuccessToast(String(t('messages.membersAddedSuccess', { count: selectedNewIds.size })))
      onChanged()
      setSelectedNewIds(new Set())
      setView('overview')
    } catch (error) {
      console.error('Add members error:', error)
      showErrorToast(error instanceof Error ? error.message : String(t('messages.addMemberError')))
    } finally {
      setAdding(false)
    }
  }

  const renderContactGroup = (title: string, list: Contact[]) => {
    if (list.length === 0) return null
    return (
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
          {title} ({list.length})
        </h4>
        <div className="space-y-1">
          {list.map(c => {
            const isSelected = selectedNewIds.has(c.id)
            return (
              <button
                key={c.id}
                onClick={() => toggleNewMember(c.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                  isSelected ? "bg-primary/5 ring-1 ring-primary/20" : "hover:bg-gray-50"
                )}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  {isSelected && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full ring-2 ring-white flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{c.name}</p>
                  <p className="text-sm text-gray-500 truncate">{c.email}</p>
                </div>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                  ROLE_COLORS[c.role] || 'bg-gray-100 text-gray-700'
                )}>
                  {String(t(`common.roles.${c.role}`) || c.role)}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ---- Render ----

  // "Add Members" sub-view
  if (view === 'add') {
    return (
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        size="md"
        closeDisabled={adding}
        headerSlot={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView('overview')}
              disabled={adding}
              aria-label={String(t('common.back') || 'Back')}
              className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-50"
            >
              <X className="h-4 w-4 rotate-45" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {String(t('messages.addMembers'))}
            </h2>
          </div>
        }
        bodyPadding={false}
        footer={
          <ModalShell.Footer>
            <Button variant="outline" onClick={() => setView('overview')} disabled={adding}>
              {String(t('common.cancel'))}
            </Button>
            <Button onClick={handleAddMembers} disabled={selectedNewIds.size === 0 || adding}>
              {adding ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{String(t('messages.adding'))}</>
              ) : (
                `${String(t('messages.addMembers'))} (${selectedNewIds.size})`
              )}
            </Button>
          </ModalShell.Footer>
        }
      >
        <div className="flex-shrink-0 p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder={String(t('messages.searchContacts'))}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="p-4">
          {contactsLoading ? (
            <div className="space-y-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          ) : totalFiltered === 0 ? (
            <EmptyState
              icon={Users}
              title={String(t('messages.noNewContactsToAdd'))}
              description={String(t('messages.everyoneAlreadyMember'))}
              size="sm"
              variant="subtle"
            />
          ) : (
            <>
              {renderContactGroup(String(t('messages.teachers')), filteredTeachers)}
              {renderContactGroup(String(t('messages.students')), filteredStudents)}
              {renderContactGroup(String(t('messages.parents')), filteredParents)}
              {renderContactGroup(String(t('messages.family')), filteredFamily)}
            </>
          )}
        </div>
      </ModalShell>
    )
  }

  // Main "overview" view
  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        size="md"
        title={String(t('messages.groupSettings'))}
        bodyClassName="space-y-6"
        footer={
          <ModalShell.Footer>
            <Button variant="outline" onClick={onClose}>
              {String(t('common.close'))}
            </Button>
          </ModalShell.Footer>
        }
      >
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden ring-1 ring-gray-200">
              {conversation.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={conversation.avatarUrl}
                  alt={conversation.name || ''}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Users className="w-10 h-10 text-gray-400" />
              )}
            </div>
            <button
              type="button"
              onClick={handleAvatarPick}
              disabled={uploadingAvatar}
              aria-label={String(t('messages.changeAvatar'))}
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          {conversation.avatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={uploadingAvatar}
              className="text-xs text-gray-500 hover:text-rose-600 transition-colors disabled:opacity-50"
            >
              {String(t('messages.removeAvatar'))}
            </button>
          )}
        </div>

        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="group-name" className="text-sm font-medium text-gray-700">
            {String(t('messages.groupName'))}
          </Label>
          <div className="flex gap-2">
            <Input
              id="group-name"
              value={name}
              onChange={e => setName(e.target.value.slice(0, 120))}
              placeholder={String(t('messages.groupNamePlaceholder'))}
              maxLength={120}
              disabled={savingName}
            />
            <Button
              onClick={handleSaveName}
              disabled={savingName || name.trim() === (conversation.name || '')}
            >
              {savingName ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                String(t('common.save'))
              )}
            </Button>
          </div>
        </div>

        {/* Members */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-700">
              {String(t('messages.membersCount', { count: conversation.allParticipants.length }))}
            </Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('add')}
              className="text-primary hover:text-primary/80"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              {String(t('messages.addMembers'))}
            </Button>
          </div>
          <div className="rounded-lg ring-1 ring-gray-100 divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {conversation.allParticipants.map((member: ConversationParticipant) => {
              const isSelf = member.id === currentUserId
              const isRemoving = removingMemberId === member.id
              return (
                <div key={member.id} className="flex items-center gap-3 p-3">
                  <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate text-sm">
                      {member.name}{isSelf && <span className="text-gray-400 font-normal"> ({String(t('messages.you'))})</span>}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{member.email}</p>
                  </div>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                    ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-700'
                  )}>
                    {String(t(`common.roles.${member.role}`) || member.role)}
                  </span>
                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={isRemoving}
                      aria-label={String(t('messages.removeMember'))}
                      className="p-1.5 rounded-md text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                    >
                      {isRemoving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Leave group */}
        <div className="pt-4 border-t border-gray-100">
          <Button
            variant="outline"
            onClick={() => setShowLeaveConfirm(true)}
            className="w-full text-rose-600 ring-rose-200 hover:bg-rose-50 hover:ring-rose-300"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {String(t('messages.leaveGroup'))}
          </Button>
        </div>
      </ModalShell>

      <ModalShell.Confirm
        isOpen={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeaveGroup}
        title={String(t('messages.leaveGroupTitle'))}
        message={String(t('messages.leaveGroupConfirm'))}
        variant="danger"
        confirmLabel={leaving ? String(t('messages.leaving')) : String(t('messages.leaveGroup'))}
        cancelLabel={String(t('common.cancel'))}
        loading={leaving}
      />
    </>
  )
}
