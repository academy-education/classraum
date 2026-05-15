"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Loader2, User, MessageSquare, Users, Check, X } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { showErrorToast } from '@/stores'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Contact, GroupedContacts } from './MessagesPage'

interface NewConversationModalProps {
  isOpen: boolean
  onClose: () => void
  onConversationCreated: (conversationId: string) => void
}

export function NewConversationModal({
  isOpen,
  onClose,
  onConversationCreated
}: NewConversationModalProps) {
  const { t } = useTranslation()
  const [contacts, setContacts] = useState<GroupedContacts>({
    teachers: [],
    students: [],
    parents: [],
    family: []
  })
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Multi-select: selected contact ids backed by a Set so we get O(1) toggles.
  // Also keep a Map of id → Contact for the chip row at the top.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedById, setSelectedById] = useState<Map<string, Contact>>(new Map())
  const [groupName, setGroupName] = useState('')

  const isGroup = selectedIds.size >= 2

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/messages/contacts', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch contacts')
      }

      const data = await response.json()
      setContacts(data.contacts || { teachers: [], students: [], parents: [], family: [] })
    } catch (error) {
      console.error('Error fetching contacts:', error)
      showErrorToast(String(t('messages.fetchError') || 'Failed to load contacts'))
    } finally {
      setLoading(false)
    }
  }, [t])

  // Reset selection + search whenever the modal opens.
  useEffect(() => {
    if (isOpen) {
      fetchContacts()
      setSearchQuery('')
      setSelectedIds(new Set())
      setSelectedById(new Map())
      setGroupName('')
    }
  }, [isOpen, fetchContacts])

  const toggleContact = (contact: Contact) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(contact.id)) {
        next.delete(contact.id)
      } else {
        next.add(contact.id)
      }
      return next
    })
    setSelectedById(prev => {
      const next = new Map(prev)
      if (next.has(contact.id)) {
        next.delete(contact.id)
      } else {
        next.set(contact.id, contact)
      }
      return next
    })
  }

  const removeSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    setSelectedById(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }

  const handleCreateConversation = async () => {
    if (selectedIds.size === 0 || creating) return

    setCreating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return

      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          participantIds: Array.from(selectedIds),
          // Only send a group name when it's actually a group AND the user
          // entered something. The API will fall back to a comma-separated
          // member list for groups without a custom name.
          name: isGroup && groupName.trim().length > 0 ? groupName.trim() : undefined,
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create conversation')
      }

      const data = await response.json()
      onConversationCreated(data.conversation.id)
      onClose()
    } catch (error) {
      console.error('Error creating conversation:', error)
      showErrorToast(String(t('messages.createError') || 'Failed to create conversation'))
    } finally {
      setCreating(false)
    }
  }

  const filterContacts = (contactList: Contact[]) => {
    if (!searchQuery) return contactList
    return contactList.filter(
      contact =>
        contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  const filteredTeachers = filterContacts(contacts.teachers)
  const filteredStudents = filterContacts(contacts.students)
  const filteredParents = filterContacts(contacts.parents)
  const filteredFamily = filterContacts(contacts.family)

  const totalContacts =
    contacts.teachers.length +
    contacts.students.length +
    contacts.parents.length +
    contacts.family.length

  const totalFilteredContacts =
    filteredTeachers.length +
    filteredStudents.length +
    filteredParents.length +
    filteredFamily.length

  const selectedContacts = useMemo(() => Array.from(selectedById.values()), [selectedById])

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager':
        return 'bg-purple-100 text-purple-700'
      case 'teacher':
        return 'bg-sky-50 text-sky-700'
      case 'student':
        return 'bg-emerald-50 text-emerald-700'
      case 'parent':
        return 'bg-amber-50 text-amber-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getCategoryLabel = (category: string) => {
    const key = `messages.${category}`
    return String(t(key) || category)
  }

  const renderContactGroup = (title: string, contactList: Contact[]) => {
    if (contactList.length === 0) return null

    return (
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
          {title} ({contactList.length})
        </h4>
        <div className="space-y-1">
          {contactList.map((contact) => {
            const isSelected = selectedIds.has(contact.id)
            return (
              <button
                key={contact.id}
                onClick={() => toggleContact(contact)}
                className={cn(
                  "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                  isSelected
                    ? "bg-primary/5 ring-1 ring-primary/20"
                    : "hover:bg-gray-50"
                )}
              >
                {/* Avatar with selected-state checkmark overlay so selection is
                    visible at a glance even after the user scrolls past the chip row. */}
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
                  <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                  <p className="text-sm text-gray-500 truncate">{contact.email}</p>
                </div>
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full flex-shrink-0",
                  getRoleColor(contact.role)
                )}>
                  {String(t(`common.roles.${contact.role}`) || contact.role)}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Primary button label adapts to selection size:
  //   - 0 selected  → "Start Conversation" (disabled)
  //   - 1 selected  → "Start Conversation"
  //   - 2+ selected → "Create Group (N)"
  const primaryLabel = isGroup
    ? `${String(t('messages.createGroup'))} (${selectedIds.size})`
    : String(t('messages.startConversationButton'))

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      closeDisabled={creating}
      headerSlot={
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          {isGroup ? (
            <Users className="h-5 w-5" />
          ) : (
            <MessageSquare className="h-5 w-5" />
          )}
          {isGroup
            ? String(t('messages.newGroupChat'))
            : String(t('messages.newConversation'))}
        </h2>
      }
      bodyPadding={false}
      footer={
        <ModalShell.Footer>
          <Button variant="outline" onClick={onClose} disabled={creating}>
            {String(t('messages.cancel'))}
          </Button>
          <Button onClick={handleCreateConversation} disabled={selectedIds.size === 0 || creating}>
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {String(t('messages.creating'))}
              </>
            ) : (
              primaryLabel
            )}
          </Button>
        </ModalShell.Footer>
      }
    >
        {/* Selected-contacts chip row + (when group) name input.
            Lives at the very top so users can see their selection without scrolling. */}
        {selectedContacts.length > 0 && (
          <div className="flex-shrink-0 px-4 pt-4 space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {selectedContacts.map(contact => (
                <span
                  key={contact.id}
                  className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                >
                  {contact.name}
                  <button
                    type="button"
                    onClick={() => removeSelected(contact.id)}
                    aria-label={String(t('common.remove') || 'Remove')}
                    className="ml-0.5 p-0.5 rounded-full hover:bg-primary/20 transition-colors"
                  >
                    <X className="h-3 w-3" strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>
            {isGroup && (
              <div className="space-y-1.5">
                <Label htmlFor="group-name" className="text-xs font-medium text-gray-700">
                  {String(t('messages.groupNameOptional'))}
                </Label>
                <Input
                  id="group-name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value.slice(0, 120))}
                  placeholder={String(t('messages.groupNamePlaceholder'))}
                  maxLength={120}
                />
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className="flex-shrink-0 p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              placeholder={String(t('messages.searchContacts'))}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="p-4">
          {loading ? (
            // Skeleton rows that mirror the contact-row layout (avatar + 2-line text + role pill).
            // Matches the AssignmentDetailsModal / SessionDetailsModal skeleton pattern so the
            // load state feels consistent across the dashboard.
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
          ) : totalContacts === 0 ? (
            <EmptyState
              icon={Users}
              title={String(t('messages.noContacts'))}
              description={String(t('messages.noContactsDescription'))}
              size="sm"
              variant="subtle"
            />
          ) : totalFilteredContacts === 0 ? (
            <EmptyState
              icon={Search}
              title={String(t('messages.noContactsMatchSearch'))}
              size="sm"
              variant="subtle"
            />
          ) : (
            <>
              {renderContactGroup(getCategoryLabel('teachers'), filteredTeachers)}
              {renderContactGroup(getCategoryLabel('students'), filteredStudents)}
              {renderContactGroup(getCategoryLabel('parents'), filteredParents)}
              {renderContactGroup(getCategoryLabel('family'), filteredFamily)}
            </>
          )}
        </div>
    </ModalShell>
  )
}
