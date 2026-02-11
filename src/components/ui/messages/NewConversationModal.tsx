"use client"

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Loader2, User, MessageSquare, Users, X } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { showErrorToast } from '@/stores'
import { cn } from '@/lib/utils'
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
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  // Fetch contacts
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

  useEffect(() => {
    if (isOpen) {
      fetchContacts()
      setSearchQuery('')
      setSelectedContact(null)
    }
  }, [isOpen, fetchContacts])

  // Create conversation
  const handleCreateConversation = async () => {
    if (!selectedContact || creating) return

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
        body: JSON.stringify({ participantId: selectedContact.id })
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

  // Filter contacts by search
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

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'manager':
        return 'bg-purple-100 text-purple-700'
      case 'teacher':
        return 'bg-blue-100 text-blue-700'
      case 'student':
        return 'bg-green-100 text-green-700'
      case 'parent':
        return 'bg-orange-100 text-orange-700'
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
          {contactList.map((contact) => (
            <button
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={cn(
                "w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left",
                selectedContact?.id === contact.id
                  ? "bg-blue-50 ring-1 ring-blue-200"
                  : "hover:bg-gray-50"
              )}
            >
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-5 w-5 text-gray-500" />
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
          ))}
        </div>
      </div>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 relative p-6 pb-4 border-b">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 absolute top-4 right-4"
            disabled={creating}
          >
            <X className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {String(t('messages.newConversation'))}
          </h2>
        </div>

        {/* Search */}
        <div className="flex-shrink-0 p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={String(t('messages.searchContacts'))}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : totalContacts === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <Users className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">{String(t('messages.noContacts'))}</p>
              <p className="text-gray-400 text-sm mt-1">{String(t('messages.noContactsDescription'))}</p>
            </div>
          ) : totalFilteredContacts === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center px-4">
              <Search className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-gray-500">No contacts match your search</p>
            </div>
          ) : (
            <>
              {renderContactGroup(getCategoryLabel('teachers'), filteredTeachers)}
              {renderContactGroup(getCategoryLabel('students'), filteredStudents)}
              {renderContactGroup(getCategoryLabel('parents'), filteredParents)}
              {renderContactGroup(getCategoryLabel('family'), filteredFamily)}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex justify-end gap-2 p-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={creating}>
            {String(t('messages.cancel'))}
          </Button>
          <Button
            onClick={handleCreateConversation}
            disabled={!selectedContact || creating}
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {String(t('messages.creating'))}
              </>
            ) : (
              String(t('messages.startConversation'))
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
