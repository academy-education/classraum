"use client"

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Search,
  MoreHorizontal,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Megaphone,
  Paperclip,
  CheckCircle
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { showSuccessToast, showErrorToast } from '@/stores'
import { FileUpload } from './file-upload'

interface Announcement {
  id: string
  title: string
  content: string | null
  created_by: string
  created_at: string
  updated_at: string
  creator_name?: string
  classrooms: { id: string; name: string }[]
  attachments: AttachmentFile[]
}

interface Classroom {
  id: string
  name: string
}

interface AttachmentFile {
  id?: string
  name: string
  url: string
  size: number
  type: string
  uploaded?: boolean
}

interface AnnouncementsPageProps {
  academyId: string
}

const ITEMS_PER_PAGE = 10

export function AnnouncementsPage({ academyId }: AnnouncementsPageProps) {
  const { t, language } = useTranslation()
  const { userId, userName } = useAuth()

  // State
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([])
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])
  const [classroomSearchQuery, setClassroomSearchQuery] = useState('')

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  // Sort and filter state
  const [sortField, setSortField] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [classroomFilter, setClassroomFilter] = useState<string>('all')
  const [showClassroomFilter, setShowClassroomFilter] = useState(false)
  const classroomFilterRef = useRef<HTMLDivElement>(null)

  // Row selection state
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)

  // Fetch classrooms
  const fetchClassrooms = useCallback(async () => {
    if (!academyId) return

    const { data, error } = await supabase
      .from('classrooms')
      .select('id, name')
      .eq('academy_id', academyId)
      .is('deleted_at', null)
      .order('name')

    if (!error && data) {
      setClassrooms(data)
    }
  }, [academyId])

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    if (!academyId) return

    setLoading(true)

    try {
      // Build base query
      let query = supabase
        .from('announcements')
        .select(`
          id,
          title,
          content,
          created_by,
          created_at,
          updated_at,
          users!announcements_created_by_fkey(name),
          announcement_classrooms(
            classroom_id,
            classrooms(id, name)
          ),
          announcement_attachments(
            id,
            file_name,
            file_url,
            file_size,
            file_type
          )
        `, { count: 'exact' })
        .eq('academy_id', academyId)
        .order('created_at', { ascending: false })

      // Apply search filter
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`)
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('Error fetching announcements:', error)
        showErrorToast(t('common.error'))
        return
      }

      // Transform data
      const transformedData: Announcement[] = (data || []).map((item: any) => ({
        id: item.id,
        title: item.title,
        content: item.content,
        created_by: item.created_by,
        created_at: item.created_at,
        updated_at: item.updated_at,
        creator_name: item.users?.name || 'Unknown',
        classrooms: (item.announcement_classrooms || [])
          .map((ac: any) => ac.classrooms)
          .filter(Boolean),
        attachments: (item.announcement_attachments || []).map((att: any) => ({
          id: att.id,
          name: att.file_name,
          url: att.file_url,
          size: att.file_size || 0,
          type: att.file_type || '',
          uploaded: true
        }))
      }))

      setAnnouncements(transformedData)
      setTotalCount(count || 0)
    } catch (error) {
      console.error('Error fetching announcements:', error)
      showErrorToast(t('common.error'))
    } finally {
      setLoading(false)
    }
  }, [academyId, searchQuery, currentPage, t])

  // Initial fetch
  useEffect(() => {
    fetchClassrooms()
  }, [fetchClassrooms])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  // Reset form (does not reset selectedAnnouncement to preserve view modal state)
  const resetForm = useCallback(() => {
    setFormTitle('')
    setFormContent('')
    setSelectedClassroomIds([])
    setAttachments([])
    setClassroomSearchQuery('')
    setIsEditing(false)
  }, [])

  // Open add modal
  const handleOpenAddModal = useCallback(() => {
    resetForm()
    setSelectedAnnouncement(null)
    setShowAddModal(true)
  }, [resetForm])

  // Open edit modal
  const handleOpenEditModal = useCallback((announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    setFormTitle(announcement.title)
    setFormContent(announcement.content || '')
    setSelectedClassroomIds(announcement.classrooms.map(c => c.id))
    setAttachments(announcement.attachments)
    setIsEditing(true)
    setShowAddModal(true)
    setOpenDropdown(null)
  }, [])

  // Open view modal
  const handleOpenViewModal = useCallback((announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    setShowViewModal(true)
    setOpenDropdown(null)
  }, [])

  // Open delete modal
  const handleOpenDeleteModal = useCallback((announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    setShowDeleteModal(true)
    setOpenDropdown(null)
  }, [])

  // Close modals
  const handleCloseModals = useCallback(() => {
    setShowAddModal(false)
    setShowViewModal(false)
    setShowDeleteModal(false)
    setSelectedAnnouncement(null)
    resetForm()
  }, [resetForm])

  // Close only Add/Edit modal
  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false)
    resetForm()
  }, [resetForm])

  // Close only View modal
  const handleCloseViewModal = useCallback(() => {
    setShowViewModal(false)
    setSelectedAnnouncement(null)
  }, [])

  // Toggle classroom selection
  const toggleClassroom = useCallback((classroomId: string) => {
    setSelectedClassroomIds(prev =>
      prev.includes(classroomId)
        ? prev.filter(id => id !== classroomId)
        : [...prev, classroomId]
    )
  }, [])

  // Toggle select all classrooms (based on filtered results)
  const toggleSelectAllClassrooms = useCallback(() => {
    const filteredClassroomIds = classrooms
      .filter(classroom => {
        const searchLower = classroomSearchQuery.toLowerCase()
        return classroom.name.toLowerCase().includes(searchLower)
      })
      .map(c => c.id)

    const allSelected = filteredClassroomIds.every(id => selectedClassroomIds.includes(id))

    if (allSelected) {
      // Deselect all filtered classrooms
      setSelectedClassroomIds(prev => prev.filter(id => !filteredClassroomIds.includes(id)))
    } else {
      // Select all filtered classrooms (add to existing)
      setSelectedClassroomIds(prev => [...new Set([...prev, ...filteredClassroomIds])])
    }
  }, [classrooms, classroomSearchQuery, selectedClassroomIds])

  // Save announcement
  const handleSave = useCallback(async () => {
    // Validation
    if (!formTitle.trim()) {
      showErrorToast(t('announcements.titleRequired'))
      return
    }

    if (selectedClassroomIds.length === 0) {
      showErrorToast(t('announcements.pleaseSelectClassroom'))
      return
    }

    setSaving(true)

    try {
      if (isEditing && selectedAnnouncement) {
        // Update existing announcement
        const { error: updateError } = await supabase
          .from('announcements')
          .update({
            title: formTitle.trim(),
            content: formContent.trim() || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedAnnouncement.id)

        if (updateError) throw updateError

        // Update classrooms - delete old and insert new
        await supabase
          .from('announcement_classrooms')
          .delete()
          .eq('announcement_id', selectedAnnouncement.id)

        if (selectedClassroomIds.length > 0) {
          const { error: classroomsError } = await supabase
            .from('announcement_classrooms')
            .insert(
              selectedClassroomIds.map(classroomId => ({
                announcement_id: selectedAnnouncement.id,
                classroom_id: classroomId
              }))
            )

          if (classroomsError) throw classroomsError
        }

        // Handle attachments - delete removed, add new
        const existingIds = selectedAnnouncement.attachments.map(a => a.id).filter(Boolean)
        const currentIds = attachments.filter(a => a.id).map(a => a.id)
        const idsToDelete = existingIds.filter(id => !currentIds.includes(id))

        if (idsToDelete.length > 0) {
          await supabase
            .from('announcement_attachments')
            .delete()
            .in('id', idsToDelete)
        }

        // Insert new attachments
        const newAttachments = attachments.filter(a => !a.id && a.uploaded)
        if (newAttachments.length > 0) {
          const { error: attachmentsError } = await supabase
            .from('announcement_attachments')
            .insert(
              newAttachments.map(att => ({
                announcement_id: selectedAnnouncement.id,
                file_name: att.name,
                file_url: att.url,
                file_size: att.size,
                file_type: att.type,
                uploaded_by: userId
              }))
            )

          if (attachmentsError) throw attachmentsError
        }

        showSuccessToast(t('announcements.announcementUpdated'))
      } else {
        // Create new announcement
        const { data: newAnnouncement, error: insertError } = await supabase
          .from('announcements')
          .insert({
            academy_id: academyId,
            title: formTitle.trim(),
            content: formContent.trim() || null,
            created_by: userId
          })
          .select('id')
          .single()

        if (insertError) throw insertError

        // Insert classroom links
        if (selectedClassroomIds.length > 0) {
          const { error: classroomsError } = await supabase
            .from('announcement_classrooms')
            .insert(
              selectedClassroomIds.map(classroomId => ({
                announcement_id: newAnnouncement.id,
                classroom_id: classroomId
              }))
            )

          if (classroomsError) throw classroomsError
        }

        // Insert attachments
        const uploadedAttachments = attachments.filter(a => a.uploaded)
        if (uploadedAttachments.length > 0) {
          const { error: attachmentsError } = await supabase
            .from('announcement_attachments')
            .insert(
              uploadedAttachments.map(att => ({
                announcement_id: newAnnouncement.id,
                file_name: att.name,
                file_url: att.url,
                file_size: att.size,
                file_type: att.type,
                uploaded_by: userId
              }))
            )

          if (attachmentsError) throw attachmentsError
        }

        showSuccessToast(t('announcements.announcementCreated'))
      }

      handleCloseAddModal()
      fetchAnnouncements()
    } catch (error) {
      console.error('Error saving announcement:', error)
      showErrorToast(t('common.error'))
    } finally {
      setSaving(false)
    }
  }, [
    formTitle,
    formContent,
    selectedClassroomIds,
    attachments,
    isEditing,
    selectedAnnouncement,
    academyId,
    userId,
    t,
    handleCloseAddModal,
    fetchAnnouncements
  ])

  // Delete announcement
  const handleDelete = useCallback(async () => {
    if (!selectedAnnouncement) return

    setDeleting(true)

    try {
      // Delete attachments from storage
      for (const attachment of selectedAnnouncement.attachments) {
        if (attachment.url) {
          const path = attachment.url.split('/announcement-attachments/')[1]
          if (path) {
            await supabase.storage
              .from('announcement-attachments')
              .remove([path])
          }
        }
      }

      // Delete announcement (cascade will handle classrooms and attachments)
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', selectedAnnouncement.id)

      if (error) throw error

      showSuccessToast(t('announcements.announcementDeleted'))
      handleCloseModals()
      fetchAnnouncements()
    } catch (error) {
      console.error('Error deleting announcement:', error)
      showErrorToast(t('common.error'))
    } finally {
      setDeleting(false)
    }
  }, [selectedAnnouncement, t, handleCloseModals, fetchAnnouncements])

  // Format date
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString)
    if (language === 'korean') {
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${year}년 ${month}월 ${day}일`
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  }, [language])

  // Pagination
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  // Sort handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Render sort icon
  const renderSortIcon = (field: string) => {
    const isActiveField = sortField === field
    const isAscending = isActiveField && sortDirection === 'asc'
    const isDescending = isActiveField && sortDirection === 'desc'

    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 9l4-4 4 4"
          stroke={isAscending ? '#2885e8' : 'currentColor'}
          className={isAscending ? '' : 'text-gray-400'}
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 15l-4 4-4-4"
          stroke={isDescending ? '#2885e8' : 'currentColor'}
          className={isDescending ? '' : 'text-gray-400'}
        />
      </svg>
    )
  }

  // Filtered and sorted announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements
      .filter(announcement => {
        // Search filter
        const matchesSearch = searchQuery === '' ||
          announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (announcement.content && announcement.content.toLowerCase().includes(searchQuery.toLowerCase()))

        // Classroom filter
        const matchesClassroom = classroomFilter === 'all' ||
          announcement.classrooms.some(c => c.id === classroomFilter)

        return matchesSearch && matchesClassroom
      })
      .sort((a, b) => {
        if (!sortField) return 0

        let aValue = ''
        let bValue = ''

        switch (sortField) {
          case 'title':
            aValue = a.title
            bValue = b.title
            break
          case 'creator':
            aValue = a.creator_name || ''
            bValue = b.creator_name || ''
            break
          case 'created_at':
            return sortDirection === 'asc'
              ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          default:
            return 0
        }

        const result = aValue.toLowerCase().localeCompare(bValue.toLowerCase())
        return sortDirection === 'asc' ? result : -result
      })
  }, [announcements, searchQuery, classroomFilter, sortField, sortDirection])

  // Handle select all
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([])
      setSelectAll(false)
    } else {
      const allRowIds = filteredAnnouncements.map(announcement => announcement.id)
      setSelectedRows(allRowIds)
      setSelectAll(true)
    }
  }

  // Handle row select
  const handleRowSelect = (announcementId: string) => {
    setSelectedRows(prev => {
      if (prev.includes(announcementId)) {
        const newSelected = prev.filter(id => id !== announcementId)
        if (newSelected.length === 0) {
          setSelectAll(false)
        }
        return newSelected
      } else {
        const newSelected = [...prev, announcementId]
        if (newSelected.length === filteredAnnouncements.length) {
          setSelectAll(true)
        }
        return newSelected
      }
    })
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown) {
        const target = event.target as Node
        // Don't close if clicking inside a dropdown
        if (target && (target as Element).closest('.dropdown-menu')) {
          return
        }
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openDropdown])

  // Close classroom filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (classroomFilterRef.current && !classroomFilterRef.current.contains(event.target as Node)) {
        setShowClassroomFilter(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showClassroomFilter])

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
            {t('announcements.title')}
          </h1>
          <p className="text-gray-500">
            {t('announcements.description')}
          </p>
        </div>
        <Button onClick={handleOpenAddModal} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-4">
          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
          {t('announcements.newAnnouncement')}
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder={String(t('announcements.searchPlaceholder'))}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="h-12 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
          />
        </div>
      </div>

      {/* Content */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="animate-pulse">
            <div className="overflow-x-auto min-h-[640px] flex flex-col">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-3 sm:p-4">
                      <div className="h-4 bg-gray-300 rounded w-4"></div>
                    </th>
                    <th className="text-left p-3 sm:p-4">
                      <div className="h-4 bg-gray-300 rounded w-24"></div>
                    </th>
                    <th className="text-left p-3 sm:p-4">
                      <div className="h-4 bg-gray-300 rounded w-20"></div>
                    </th>
                    <th className="text-left p-3 sm:p-4">
                      <div className="h-4 bg-gray-300 rounded w-20"></div>
                    </th>
                    <th className="text-left p-3 sm:p-4">
                      <div className="h-4 bg-gray-300 rounded w-20"></div>
                    </th>
                    <th className="text-left p-3 sm:p-4">
                      <div className="h-4 bg-gray-300 rounded w-16"></div>
                    </th>
                    <th className="text-left p-3 sm:p-4">
                      <div className="h-4 bg-gray-300 rounded w-8"></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(8)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="p-3 sm:p-4">
                        <div className="h-4 bg-gray-200 rounded w-4"></div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-40"></div>
                          <div className="h-3 bg-gray-200 rounded w-32"></div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex gap-1">
                          <div className="h-5 bg-gray-200 rounded w-16"></div>
                          <div className="h-5 bg-gray-200 rounded w-16"></div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="h-4 bg-gray-200 rounded w-4"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 min-h-[400px]">
            <Megaphone className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">
              {t('announcements.noAnnouncements')}
            </h3>
            <p className="text-gray-500 mb-4">
              {t('announcements.noAnnouncementsDescription')}
            </p>
            <Button onClick={handleOpenAddModal} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              {t('announcements.newAnnouncement')}
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[640px] flex flex-col">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-3 sm:p-4 w-12">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-primary border-border rounded focus:ring-0 focus:outline-none hover:border-border focus:border-border"
                    />
                  </th>
                  <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap min-w-[180px]">
                    <div className="flex items-center gap-2">
                      {t('announcements.announcementTitle')}
                      <button onClick={() => handleSort('title')} className="text-gray-400 hover:text-primary">
                        {renderSortIcon('title')}
                      </button>
                    </div>
                  </th>
                  <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap min-w-[120px]">
                    <div className="flex items-center gap-2 relative">
                      {t('announcements.classrooms')}
                      <div className="relative z-20" ref={classroomFilterRef}>
                        <button
                          onClick={() => setShowClassroomFilter(!showClassroomFilter)}
                          className={`flex items-center ${
                            classroomFilter !== 'all'
                              ? 'text-primary'
                              : 'text-gray-400 hover:text-primary'
                          }`}
                        >
                          <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                          </svg>
                        </button>
                        {showClassroomFilter && (
                          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg py-1 min-w-[160px] z-50 max-h-[300px] overflow-y-auto">
                            <button
                              onClick={() => {
                                setClassroomFilter('all')
                                setShowClassroomFilter(false)
                              }}
                              className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${classroomFilter === 'all' ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                            >
                              {t('announcements.allClassrooms')}
                            </button>
                            {classrooms.map((classroom) => (
                              <button
                                key={classroom.id}
                                onClick={() => {
                                  setClassroomFilter(classroom.id)
                                  setShowClassroomFilter(false)
                                }}
                                className={`block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${classroomFilter === classroom.id ? 'bg-primary/10 text-primary' : 'text-gray-700'}`}
                              >
                                {classroom.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                  <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap min-w-[100px]">
                    {t('announcements.attachments')}
                  </th>
                  <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap min-w-[120px]">
                    <div className="flex items-center gap-2">
                      {t('announcements.createdBy')}
                      <button onClick={() => handleSort('creator')} className="text-gray-400 hover:text-primary">
                        {renderSortIcon('creator')}
                      </button>
                    </div>
                  </th>
                  <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-medium text-gray-900 whitespace-nowrap min-w-[120px]">
                    <div className="flex items-center gap-2">
                      {t('announcements.createdAt')}
                      <button onClick={() => handleSort('created_at')} className="text-gray-400 hover:text-primary">
                        {renderSortIcon('created_at')}
                      </button>
                    </div>
                  </th>
                  <th className="text-left p-3 sm:p-4 font-medium text-gray-900 whitespace-nowrap w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filteredAnnouncements.length > 0 ? (
                  filteredAnnouncements.map((announcement) => (
                    <tr key={announcement.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 sm:p-4 w-12">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(announcement.id)}
                          onChange={() => handleRowSelect(announcement.id)}
                          className="w-4 h-4 text-primary border-border rounded focus:ring-0 focus:outline-none hover:border-border focus:border-border"
                        />
                      </td>
                      <td className="p-3 sm:p-4">
                        <div>
                          <div className="text-sm sm:text-base font-medium text-gray-900">
                            {announcement.title}
                          </div>
                          {announcement.content && (
                            <div className="text-xs sm:text-sm text-gray-500 truncate max-w-xs">
                              {announcement.content}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex flex-wrap gap-1">
                          {announcement.classrooms.slice(0, 2).map((classroom) => (
                            <span
                              key={classroom.id}
                              className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {classroom.name}
                            </span>
                          ))}
                          {announcement.classrooms.length > 2 && (
                            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              +{announcement.classrooms.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        {announcement.attachments.length > 0 ? (
                          <span className="inline-flex items-center text-xs sm:text-sm text-gray-600">
                            <Paperclip className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            {announcement.attachments.length}
                          </span>
                        ) : (
                          <span className="text-xs sm:text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-3 sm:p-4 text-xs sm:text-sm text-gray-900">
                        {announcement.creator_name}
                      </td>
                      <td className="p-3 sm:p-4 text-xs sm:text-sm text-gray-900 whitespace-nowrap">
                        {formatDate(announcement.created_at)}
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 sm:h-7 sm:w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenDropdown(openDropdown === announcement.id ? null : announcement.id)
                            }}
                          >
                            <MoreHorizontal className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                          </Button>

                          {openDropdown === announcement.id && (
                            <div
                              className="dropdown-menu absolute right-0 top-8 z-50 bg-white rounded-lg border border-gray-300 shadow-xl py-1 min-w-[160px]"
                              style={{ zIndex: 9999 }}
                              onClick={(e) => {
                                e.stopPropagation()
                              }}
                            >
                              <button
                                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleOpenViewModal(announcement)
                                }}
                              >
                                <Eye className="w-4 h-4" />
                                {t('announcements.viewAnnouncement')}
                              </button>
                              <button
                                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleOpenEditModal(announcement)
                                }}
                              >
                                <Edit className="w-4 h-4" />
                                {t('common.edit')}
                              </button>
                              <button
                                className="w-full px-4 py-2 text-sm text-left hover:bg-gray-50 flex items-center gap-2 cursor-pointer whitespace-nowrap text-red-600"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  handleOpenDeleteModal(announcement)
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                                {t('common.delete')}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center">
                      <div className="flex flex-col items-center justify-center py-8">
                        <Megaphone className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-gray-500">{t('announcements.noAnnouncementsFound')}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg border border-border w-full max-w-2xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {isEditing ? t('announcements.editAnnouncement') : t('announcements.newAnnouncement')}
                </h2>
                <p className="text-gray-500">{t('announcements.description')}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseAddModal}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">{t('announcements.announcementTitle')} <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder={String(t('announcements.announcementTitlePlaceholder'))}
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">{t('announcements.announcementContent')}</Label>
                <textarea
                  id="content"
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder={String(t('announcements.announcementContentPlaceholder'))}
                  rows={4}
                  className="w-full px-3 py-2 border border-input rounded-md bg-transparent text-base md:text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-0 focus-visible:outline-none resize-none transition-[color,box-shadow]"
                />
              </div>

              {/* Classrooms */}
              <div className="space-y-2">
                <Label>{t('announcements.selectClassrooms')} <span className="text-red-500">*</span></Label>
                <div className="border border-border rounded-lg bg-gray-50 p-4">
                  {classrooms.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      {t('announcements.noClassroomsAvailable')}
                    </div>
                  ) : (
                    <>
                      {/* Search Bar */}
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                          type="text"
                          placeholder={String(t('announcements.searchClassrooms'))}
                          value={classroomSearchQuery}
                          onChange={(e) => setClassroomSearchQuery(e.target.value)}
                          className="h-9 pl-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                        />
                      </div>

                      {/* Select All Button */}
                      <div className="mb-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={toggleSelectAllClassrooms}
                          className="h-8 px-3 text-xs text-primary border-primary/20 hover:bg-primary/5 hover:text-primary"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {(() => {
                            const filteredClassroomIds = classrooms
                              .filter(classroom => {
                                const searchLower = classroomSearchQuery.toLowerCase()
                                return classroom.name.toLowerCase().includes(searchLower)
                              })
                              .map(c => c.id)
                            const allSelected = filteredClassroomIds.length > 0 && filteredClassroomIds.every(id =>
                              selectedClassroomIds.includes(id)
                            )
                            return allSelected ? t("announcements.deselectAll") : t("announcements.selectAll")
                          })()}
                        </Button>
                      </div>

                      {/* Classroom List */}
                      <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-hide">
                        {classrooms
                          .filter(classroom => {
                            const searchLower = classroomSearchQuery.toLowerCase()
                            return classroom.name.toLowerCase().includes(searchLower)
                          })
                          .map((classroom) => {
                            const isSelected = selectedClassroomIds.includes(classroom.id)
                            return (
                              <div
                                key={classroom.id}
                                className="border border-gray-200 rounded-lg p-3 hover:border-primary hover:shadow-sm transition-all bg-white"
                              >
                                <label className="flex items-center gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleClassroom(classroom.id)}
                                    className="w-4 h-4 text-primary border-border rounded focus:ring-0 focus:outline-none hover:border-border focus:border-border"
                                  />
                                  <span className="text-sm font-medium text-gray-900">{classroom.name}</span>
                                </label>
                              </div>
                            )
                          })}
                        {classrooms.filter(classroom => classroom.name.toLowerCase().includes(classroomSearchQuery.toLowerCase())).length === 0 && (
                          <div className="text-center py-4 text-sm text-gray-500">
                            {t('announcements.noClassroomsFound')}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                {selectedClassroomIds.length > 0 && (
                  <p className="text-xs text-gray-500">
                    {selectedClassroomIds.length} {t('announcements.selectedClassrooms')}
                  </p>
                )}
              </div>

              {/* Attachments */}
              <div className="space-y-2">
                <Label>{t('announcements.attachments')}</Label>
                <FileUpload
                  files={attachments}
                  onChange={setAttachments}
                  bucket="announcement-attachments"
                  maxFiles={5}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-6 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleCloseAddModal} disabled={saving}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isEditing ? t('announcements.saving') : t('announcements.creating')}
                    </>
                  ) : (
                    isEditing ? t('common.save') : t('common.create')
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedAnnouncement && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-2xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {t('announcements.viewAnnouncement')}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseViewModal}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              {/* Title */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedAnnouncement.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedAnnouncement.creator_name} - {formatDate(selectedAnnouncement.created_at)}
                </p>
              </div>

              {/* Content */}
              {selectedAnnouncement.content && (
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {selectedAnnouncement.content}
                  </p>
                </div>
              )}

              {/* Classrooms */}
              <div className="space-y-2">
                <Label>{t('announcements.classrooms')}</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedAnnouncement.classrooms.map((classroom) => (
                    <span
                      key={classroom.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {classroom.name}
                    </span>
                  ))}
                </div>
              </div>

              {/* Attachments */}
              {selectedAnnouncement.attachments.length > 0 && (
                <div className="space-y-2">
                  <Label>{t('announcements.attachments')}</Label>
                  <div className="space-y-2">
                    {selectedAnnouncement.attachments.map((attachment, index) => (
                      <a
                        key={index}
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Paperclip className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-blue-600 hover:underline">
                          {attachment.name}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-6 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Open edit modal without closing view modal first
                    setFormTitle(selectedAnnouncement.title)
                    setFormContent(selectedAnnouncement.content || '')
                    setSelectedClassroomIds(selectedAnnouncement.classrooms.map(c => c.id))
                    setAttachments(selectedAnnouncement.attachments)
                    setIsEditing(true)
                    setShowAddModal(true)
                  }}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  {t('common.edit')}
                </Button>
                <Button onClick={handleCloseViewModal}>
                  {t('common.close')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedAnnouncement && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {t('announcements.deleteConfirmTitle')}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseModals}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-600">
                {t('announcements.deleteConfirmMessage')}
              </p>
              <p className="mt-2 font-medium text-gray-900">
                &ldquo;{selectedAnnouncement.title}&rdquo;
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end p-6 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={handleCloseModals} disabled={deleting}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('announcements.deleting')}
                    </>
                  ) : (
                    t('common.delete')
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
