"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "@/hooks/useTranslation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { Search, RotateCcw, Trash2, Calendar, ClipboardList, School, DollarSign, Undo2, X, CheckCircle, AlertCircle, FileText } from "lucide-react"

// Cache invalidation function for archive
export const invalidateArchiveCache = (academyId: string) => {
  const keys = Object.keys(sessionStorage)
  let clearedCount = 0

  keys.forEach(key => {
    if (key.startsWith(`archive-${academyId}-page`) ||
        key.includes(`archive-${academyId}-page`)) {
      sessionStorage.removeItem(key)
      clearedCount++
    }
  })

  console.log(`[Performance] Cleared ${clearedCount} archive cache entries`)
}

interface ArchivePageProps {
  academyId?: string
}

interface DeletedItem {
  id: string
  name: string
  type: 'classroom' | 'session' | 'assignment' | 'payment_plan' | 'invoice'
  deletedAt: string
  grade?: string | null
  subject?: string | null
  date?: string
  startTime?: string
  endTime?: string
  classroomName?: string
  assignmentType?: string
  dueDate?: string | null
  amount?: number
  recurrenceType?: string
  status?: string
  finalAmount?: number
}

export function ArchivePage({ academyId }: ArchivePageProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<'all' | 'classrooms' | 'sessions' | 'assignments' | 'payment_plans' | 'invoices'>('all')
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([])
  const [loading, setLoading] = useState(true)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const [initialized, setInitialized] = useState(false)

  // Modal states
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false)
  const [showBulkResultModal, setShowBulkResultModal] = useState(false)
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false)
  const [bulkAction, setBulkAction] = useState<'recover' | 'delete' | null>(null)
  const [bulkActionResult, setBulkActionResult] = useState<{ success: boolean; count: number; message: string } | null>(null)
  const [itemToDelete, setItemToDelete] = useState<DeletedItem | null>(null)

  const fetchDeletedItems = useCallback(async () => {
    if (!academyId) return

    // PERFORMANCE: Check cache first (5-minute TTL for archive - rarely changes)
    const cacheKey = `archive-${academyId}-page${currentPage}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cachedTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cachedTimestamp) {
      const cacheValidFor = 5 * 60 * 1000 // 5 minutes TTL (archive data rarely changes)
      const timeDiff = Date.now() - parseInt(cachedTimestamp)

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        console.log('✅ Cache hit:', {
          items: parsed.items?.length || 0,
          page: currentPage
        })
        setDeletedItems(parsed.items)
        setInitialized(true)
        setLoading(false)
        return parsed.items
      } else {
        console.log('⏰ Cache expired, fetching fresh data')
      }
    } else {
      console.log('❌ Cache miss, fetching from database')
    }

    setInitialized(true)
    setLoading(true)
    try {
      // Fetch deleted classrooms
      const { data: deletedClassrooms, error: classroomsError } = await supabase
        .from('classrooms')
        .select(`
          id,
          name,
          deleted_at,
          grade,
          subject
        `)
        .eq('academy_id', academyId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      type ClassroomData = {
        id: string
        name: string
        deleted_at: string
        grade: string | null
        subject: string | null
      }

      const typedClassrooms = deletedClassrooms as ClassroomData[] | null

      // Fetch deleted sessions
      const { data: deletedSessions, error: sessionsError } = await supabase
        .from('classroom_sessions')
        .select(`
          id,
          date,
          start_time,
          end_time,
          deleted_at,
          classroom:classrooms(
            name,
            academy_id
          )
        `)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      type SessionData = {
        id: string
        date: string
        start_time: string
        end_time: string
        deleted_at: string
        classroom: {
          name: string
          academy_id: string
        } | null
      }

      const typedSessions = deletedSessions as SessionData[] | null

      // Fetch deleted assignments
      const { data: deletedAssignments, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          id,
          title,
          assignment_type,
          due_date,
          deleted_at,
          classroom_session:classroom_sessions(
            classroom:classrooms(
              name,
              academy_id
            )
          )
        `)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      type AssignmentData = {
        id: string
        title: string
        assignment_type: string
        due_date: string | null
        deleted_at: string
        classroom_session: {
          classroom: {
            name: string
            academy_id: string
          } | null
        } | null
      }

      const typedAssignments = deletedAssignments as AssignmentData[] | null

      // Fetch deleted payment plans
      const { data: deletedPaymentPlans, error: paymentPlansError } = await supabase
        .from('recurring_payment_templates')
        .select(`
          id,
          name,
          amount,
          recurrence_type,
          deleted_at,
          academy_id
        `)
        .eq('academy_id', academyId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      type PaymentPlanData = {
        id: string
        name: string
        amount: number
        recurrence_type: string
        deleted_at: string
        academy_id: string
      }

      const typedPaymentPlans = deletedPaymentPlans as PaymentPlanData[] | null

      // Fetch deleted invoices
      const { data: deletedInvoices, error: invoicesError } = await supabase
        .from('invoices')
        .select(`
          id,
          amount,
          final_amount,
          due_date,
          status,
          deleted_at,
          academy_id,
          student:students!invoices_student_id_fkey(
            user:users!students_user_id_fkey(name)
          )
        `)
        .eq('academy_id', academyId)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })

      type InvoiceData = {
        id: string
        amount: number
        final_amount: number
        due_date: string
        status: string
        deleted_at: string
        academy_id: string
        student: {
          user: { name: string } | null
        } | null
      }

      const typedInvoices = deletedInvoices as InvoiceData[] | null

      if (classroomsError) console.error('Error fetching deleted classrooms:', classroomsError)
      if (sessionsError) console.error('Error fetching deleted sessions:', sessionsError)
      if (assignmentsError) console.error('Error fetching deleted assignments:', assignmentsError)
      if (paymentPlansError) console.error('Error fetching deleted payment plans:', paymentPlansError)
      if (invoicesError) console.error('Error fetching deleted invoices:', invoicesError)

      const allDeletedItems: DeletedItem[] = []

      // Process classrooms
      if (typedClassrooms) {
        typedClassrooms.forEach(item => {
          allDeletedItems.push({
            id: item.id,
            name: item.name,
            type: 'classroom',
            deletedAt: item.deleted_at,
            grade: item.grade,
            subject: item.subject
          })
        })
      }

      // Process sessions
      if (typedSessions) {
        typedSessions
          .filter(item => item.classroom?.academy_id === academyId)
          .forEach(item => {
            const sessionName = `${item.classroom?.name || 'Unknown'} - ${new Date(item.date).toLocaleDateString()} ${item.start_time}-${item.end_time}`
            allDeletedItems.push({
              id: item.id,
              name: sessionName,
              type: 'session',
              deletedAt: item.deleted_at,
              date: item.date,
              startTime: item.start_time,
              endTime: item.end_time,
              classroomName: item.classroom?.name
            })
          })
      }

      // Process assignments
      if (typedAssignments) {
        typedAssignments
          .filter(item => item.classroom_session?.classroom?.academy_id === academyId)
          .forEach(item => {
            allDeletedItems.push({
              id: item.id,
              name: item.title,
              type: 'assignment',
              deletedAt: item.deleted_at,
              assignmentType: item.assignment_type,
              dueDate: item.due_date,
              classroomName: item.classroom_session?.classroom?.name
            })
          })
      }

      // Process payment plans
      if (typedPaymentPlans) {
        typedPaymentPlans.forEach(item => {
          allDeletedItems.push({
            id: item.id,
            name: item.name,
            type: 'payment_plan',
            deletedAt: item.deleted_at,
            amount: item.amount,
            recurrenceType: item.recurrence_type
          })
        })
      }

      // Process invoices
      if (typedInvoices) {
        typedInvoices.forEach(item => {
          allDeletedItems.push({
            id: item.id,
            name: `Invoice - ${item.student?.user?.name || 'Unknown Student'}`,
            type: 'invoice',
            deletedAt: item.deleted_at,
            amount: item.amount,
            finalAmount: item.final_amount,
            dueDate: item.due_date,
            status: item.status
          })
        })
      }

      // Sort all items by deleted_at descending
      allDeletedItems.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())

      setDeletedItems(allDeletedItems)

      // PERFORMANCE: Cache the results
      try {
        const dataToCache = {
          items: allDeletedItems
        }
        sessionStorage.setItem(cacheKey, JSON.stringify(dataToCache))
        sessionStorage.setItem(`${cacheKey}-timestamp`, Date.now().toString())
        console.log('[Performance] Archive cached for faster future loads')
      } catch (cacheError) {
        console.warn('[Performance] Failed to cache archive:', cacheError)
      }
    } catch (error) {
      console.error('Error fetching deleted items:', error)
    } finally {
      setLoading(false)
    }
  }, [academyId])

  useEffect(() => {
    if (!academyId) return

    // Check cache SYNCHRONOUSLY before setting loading state
    const cacheKey = `archive-${academyId}-page${currentPage}`
    const cachedData = sessionStorage.getItem(cacheKey)
    const cacheTimestamp = sessionStorage.getItem(`${cacheKey}-timestamp`)

    if (cachedData && cacheTimestamp) {
      const timeDiff = Date.now() - parseInt(cacheTimestamp)
      const cacheValidFor = 5 * 60 * 1000 // 5 minutes

      if (timeDiff < cacheValidFor) {
        const parsed = JSON.parse(cachedData)
        console.log('✅ [Archive useEffect] Using cached data - NO skeleton')
        setDeletedItems(parsed.items)
        setLoading(false)
        return // Skip fetchDeletedItems - we have cached data
      }
    }

    // Cache miss - show loading and fetch data
    console.log('❌ [Archive useEffect] Cache miss - showing skeleton')
    fetchDeletedItems()
  }, [academyId, currentPage, fetchDeletedItems])

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'classroom':
        return <School className="w-4 h-4 text-blue-500" />
      case 'session':
        return <Calendar className="w-4 h-4 text-green-500" />
      case 'assignment':
        return <ClipboardList className="w-4 h-4 text-purple-500" />
      case 'payment_plan':
        return <DollarSign className="w-4 h-4 text-orange-500" />
      case 'invoice':
        return <FileText className="w-4 h-4 text-teal-500" />
      default:
        return null
    }
  }

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'classroom':
        return t("navigation.classrooms")
      case 'session':
        return t("navigation.sessions")
      case 'assignment':
        return t("navigation.assignments")
      case 'payment_plan':
        return t("navigation.payments")
      case 'invoice':
        return t("payments.invoices")
      case 'classrooms':
        return t("navigation.classrooms")
      case 'sessions':
        return t("navigation.sessions")
      case 'assignments':
        return t("navigation.assignments")
      case 'payment_plans':
        return t("navigation.payments")
      case 'invoices':
        return t("payments.invoices")
      default:
        return type
    }
  }

  const filteredItems = deletedItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    let matchesType = false

    if (typeFilter === 'all') {
      matchesType = true
    } else if (typeFilter === 'classrooms' && item.type === 'classroom') {
      matchesType = true
    } else if (typeFilter === 'sessions' && item.type === 'session') {
      matchesType = true
    } else if (typeFilter === 'assignments' && item.type === 'assignment') {
      matchesType = true
    } else if (typeFilter === 'payment_plans' && item.type === 'payment_plan') {
      matchesType = true
    } else if (typeFilter === 'invoices' && item.type === 'invoice') {
      matchesType = true
    }

    return matchesSearch && matchesType
  })

  // Calculate pagination
  const totalCount = filteredItems.length
  const totalPages = Math.ceil(totalCount / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedItems = filteredItems.slice(startIndex, endIndex)

  const getFilterCount = (filter: string) => {
    if (filter === 'all') return deletedItems.length
    if (filter === 'classrooms') return deletedItems.filter(item => item.type === 'classroom').length
    if (filter === 'sessions') return deletedItems.filter(item => item.type === 'session').length
    if (filter === 'assignments') return deletedItems.filter(item => item.type === 'assignment').length
    if (filter === 'payment_plans') return deletedItems.filter(item => item.type === 'payment_plan').length
    if (filter === 'invoices') return deletedItems.filter(item => item.type === 'invoice').length
    return 0
  }

  const handleRestore = async (item: DeletedItem) => {
    try {
      let tableName = ''
      switch (item.type) {
        case 'classroom':
          tableName = 'classrooms'
          break
        case 'session':
          tableName = 'classroom_sessions'
          break
        case 'assignment':
          tableName = 'assignments'
          break
        case 'payment_plan':
          tableName = 'recurring_payment_templates'
          break
        case 'invoice':
          tableName = 'invoices'
          break
      }

      const { error } = await supabase
        .from(tableName)
        .update({ deleted_at: null })
        .eq('id', item.id)

      if (error) {
        console.error('Error restoring item:', error)
        return
      }

      // Invalidate archive cache
      if (academyId) {
        invalidateArchiveCache(academyId)
      }

      // Refresh the list
      await fetchDeletedItems()
    } catch (error) {
      console.error('Error restoring item:', error)
    }
  }

  const handlePermanentDelete = (item: DeletedItem) => {
    setItemToDelete(item)
    setShowPermanentDeleteModal(true)
  }

  const confirmPermanentDelete = async () => {
    if (!itemToDelete) return

    try {
      let tableName = ''
      switch (itemToDelete.type) {
        case 'classroom':
          tableName = 'classrooms'
          break
        case 'session':
          tableName = 'classroom_sessions'
          break
        case 'assignment':
          tableName = 'assignments'
          break
        case 'payment_plan':
          tableName = 'recurring_payment_templates'
          break
        case 'invoice':
          tableName = 'invoices'
          break
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', itemToDelete.id)

      if (error) {
        console.error('Error permanently deleting item:', error)
        return
      }

      // Close modal and refresh the list
      setShowPermanentDeleteModal(false)
      setItemToDelete(null)
      await fetchDeletedItems()
    } catch (error) {
      console.error('Error permanently deleting item:', error)
    }
  }

  const handleRecoverAll = () => {
    const itemsToRecover = filteredItems

    if (itemsToRecover.length === 0) {
      return
    }

    setBulkAction('recover')
    setShowBulkConfirmModal(true)
  }

  const confirmBulkAction = async () => {
    if (!bulkAction) return

    const itemsToProcess = filteredItems
    setShowBulkConfirmModal(false)

    if (bulkAction === 'recover') {
      await executeBulkRecover(itemsToProcess)
    } else if (bulkAction === 'delete') {
      await executeBulkDelete(itemsToProcess)
    }
  }

  const executeBulkRecover = async (itemsToRecover: DeletedItem[]) => {

    try {
      // Group items by table for batch operations
      const itemsByTable: { [key: string]: DeletedItem[] } = {}

      itemsToRecover.forEach(item => {
        let tableName = ''
        switch (item.type) {
          case 'classroom':
            tableName = 'classrooms'
            break
          case 'session':
            tableName = 'classroom_sessions'
            break
          case 'assignment':
            tableName = 'assignments'
            break
          case 'payment_plan':
            tableName = 'recurring_payment_templates'
            break
          case 'invoice':
            tableName = 'invoices'
            break
        }

        if (!itemsByTable[tableName]) {
          itemsByTable[tableName] = []
        }
        itemsByTable[tableName].push(item)
      })

      // Execute batch updates for each table
      const updatePromises = Object.entries(itemsByTable).map(async ([tableName, items]) => {
        const ids = items.map(item => item.id)
        return supabase
          .from(tableName)
          .update({ deleted_at: null })
          .in('id', ids)
      })

      const results = await Promise.all(updatePromises)

      // Check for errors
      const errors = results.filter(result => result.error)
      if (errors.length > 0) {
        console.error('Errors recovering items:', errors)
        setBulkActionResult({
          success: false,
          count: itemsToRecover.length,
          message: t("archive.errorRecoveringItems") as string
        })
        setShowBulkResultModal(true)
        return
      }

      // Refresh the list
      await fetchDeletedItems()
      setBulkActionResult({
        success: true,
        count: itemsToRecover.length,
        message: t("archive.itemsRecoveredSuccessfully", { count: Number(itemsToRecover.length) }) as string
      })
      setShowBulkResultModal(true)
    } catch (error) {
      console.error('Error recovering items:', error)
      setBulkActionResult({
        success: false,
        count: itemsToRecover.length,
        message: t("archive.errorRecoveringItems") as string
      })
      setShowBulkResultModal(true)
    }
  }

  const handleDeleteAll = () => {
    const itemsToDelete = filteredItems

    if (itemsToDelete.length === 0) {
      return
    }

    setBulkAction('delete')
    setShowBulkConfirmModal(true)
  }

  const executeBulkDelete = async (itemsToDelete: DeletedItem[]) => {

    try {
      // Group items by table for batch operations
      const itemsByTable: { [key: string]: DeletedItem[] } = {}

      itemsToDelete.forEach(item => {
        let tableName = ''
        switch (item.type) {
          case 'classroom':
            tableName = 'classrooms'
            break
          case 'session':
            tableName = 'classroom_sessions'
            break
          case 'assignment':
            tableName = 'assignments'
            break
          case 'payment_plan':
            tableName = 'recurring_payment_templates'
            break
          case 'invoice':
            tableName = 'invoices'
            break
        }

        if (!itemsByTable[tableName]) {
          itemsByTable[tableName] = []
        }
        itemsByTable[tableName].push(item)
      })

      // Execute batch deletes for each table
      const deletePromises = Object.entries(itemsByTable).map(async ([tableName, items]) => {
        const ids = items.map(item => item.id)
        return supabase
          .from(tableName)
          .delete()
          .in('id', ids)
      })

      const results = await Promise.all(deletePromises)

      // Check for errors
      const errors = results.filter(result => result.error)
      if (errors.length > 0) {
        console.error('Errors deleting items:', errors)
        setBulkActionResult({
          success: false,
          count: itemsToDelete.length,
          message: t("archive.errorDeletingItems") as string
        })
        setShowBulkResultModal(true)
        return
      }

      // Refresh the list
      await fetchDeletedItems()
      setBulkActionResult({
        success: true,
        count: itemsToDelete.length,
        message: t("archive.itemsDeletedSuccessfully", { count: Number(itemsToDelete.length) }) as string
      })
      setShowBulkResultModal(true)
    } catch (error) {
      console.error('Error deleting items:', error)
      setBulkActionResult({
        success: false,
        count: itemsToDelete.length,
        message: t("archive.errorDeletingItems") as string
      })
      setShowBulkResultModal(true)
    }
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("archive.title")}</h1>
          <p className="text-gray-500">{t("archive.description")}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <Input
          type="text"
          placeholder={String(t("archive.searchPlaceholder"))}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 pl-12 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm shadow-sm"
        />
      </div>

      {/* Type Filter Tabs */}
      <div className="inline-flex items-center bg-white rounded-lg border border-gray-200 mb-4 p-1">
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            typeFilter === 'all'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t("common.all")} ({getFilterCount('all')})
        </button>
        <button
          onClick={() => setTypeFilter('classrooms')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            typeFilter === 'classrooms'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t("navigation.classrooms")} ({getFilterCount('classrooms')})
        </button>
        <button
          onClick={() => setTypeFilter('sessions')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            typeFilter === 'sessions'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t("navigation.sessions")} ({getFilterCount('sessions')})
        </button>
        <button
          onClick={() => setTypeFilter('assignments')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            typeFilter === 'assignments'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t("navigation.assignments")} ({getFilterCount('assignments')})
        </button>
        <button
          onClick={() => setTypeFilter('payment_plans')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            typeFilter === 'payment_plans'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t("navigation.payments")} ({getFilterCount('payment_plans')})
        </button>
        <button
          onClick={() => setTypeFilter('invoices')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            typeFilter === 'invoices'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
        >
          {t("payments.invoices")} ({getFilterCount('invoices')})
        </button>
      </div>

      {/* Bulk Actions */}
      {filteredItems.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecoverAll}
            className="text-green-600 hover:text-green-700 border-green-200 hover:border-green-300"
          >
            <Undo2 className="w-4 h-4 mr-2" />
            {typeFilter === 'all'
              ? t("archive.recoverAll", { count: Number(filteredItems.length) })
              : t("archive.recoverAllType", {
                  count: Number(filteredItems.length),
                  type: String(getItemTypeLabel(typeFilter)).toLowerCase()
                })
            }
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteAll}
            className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
          >
            <X className="w-4 h-4 mr-2" />
            {typeFilter === 'all'
              ? t("archive.deleteAll", { count: Number(filteredItems.length) })
              : t("archive.deleteAllType", {
                  count: Number(filteredItems.length),
                  type: String(getItemTypeLabel(typeFilter)).toLowerCase()
                })
            }
          </Button>
        </div>
      )}

      {/* Archive Items */}
      <Card className="overflow-hidden">
        <div className="p-6">
          {loading ? (
            <div className="space-y-3">
              {/* Skeleton loaders */}
              {[1, 2, 3, 4, 5].map((index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                  <div className="flex items-center gap-3">
                    {/* Icon skeleton */}
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <div>
                      {/* Title skeleton */}
                      <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
                      {/* Subtitle skeleton */}
                      <div className="h-3 bg-gray-200 rounded w-64"></div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Button skeletons */}
                    <div className="h-8 bg-gray-200 rounded w-24"></div>
                    <div className="h-8 bg-gray-200 rounded w-32"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : initialized && filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t("archive.noItemsTitle")}</h3>
              <p className="text-gray-600">
                {typeFilter === 'all'
                  ? String(t("archive.noItemsDescription"))
                  : String(t("archive.noFilteredItemsDescription", { type: String(getItemTypeLabel(typeFilter)) }))
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getItemIcon(item.type)}
                    <div>
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      <p className="text-sm text-gray-500">
                        {getItemTypeLabel(item.type)} • {t("archive.deletedOn", {
                          date: new Date(item.deletedAt).toLocaleDateString()
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(item)}
                      className="text-green-600 hover:text-green-700"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      {t("archive.restore")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePermanentDelete(item)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t("archive.deleteForever")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {totalCount > 0 && (
            <div className="mt-4 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                >
                  {t("archive.pagination.previous")}
                </Button>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  variant="outline"
                >
                  {t("archive.pagination.next")}
                </Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    {t("archive.pagination.showing")}
                    <span className="font-medium"> {startIndex + 1} </span>
                    {t("archive.pagination.to")}
                    <span className="font-medium"> {Math.min(endIndex, totalCount)} </span>
                    {t("archive.pagination.of")}
                    <span className="font-medium"> {totalCount} </span>
                    {t("archive.pagination.items")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    variant="outline"
                  >
                    {t("archive.pagination.previous")}
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                    variant="outline"
                  >
                    {t("archive.pagination.next")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Bulk Action Confirmation Modal */}
      {showBulkConfirmModal && bulkAction && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {bulkAction === 'recover' ? t('archive.confirmBulkRecover') : t('archive.confirmBulkDelete')}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBulkConfirmModal(false)}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                {bulkAction === 'recover' ? (
                  typeFilter === 'all'
                    ? t("archive.confirmRecoverAll", { count: Number(filteredItems.length) })
                    : t("archive.confirmRecoverAllType", {
                        count: Number(filteredItems.length),
                        type: String(getItemTypeLabel(typeFilter)).toLowerCase()
                      })
                ) : (
                  typeFilter === 'all'
                    ? t("archive.confirmDeleteAll", { count: Number(filteredItems.length) })
                    : t("archive.confirmDeleteAllType", {
                        count: Number(filteredItems.length),
                        type: String(getItemTypeLabel(typeFilter)).toLowerCase()
                      })
                )}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowBulkConfirmModal(false)}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant={bulkAction === 'recover' ? "default" : "destructive"}
                  onClick={confirmBulkAction}
                  className="flex-1"
                >
                  {bulkAction === 'recover'
                    ? t('archive.recoverAll', { count: Number(filteredItems.length) })
                    : t('archive.deleteAll', { count: Number(filteredItems.length) })}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Action Result Modal */}
      {showBulkResultModal && bulkActionResult && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                {bulkActionResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                {bulkActionResult.success ? t('common.success') : t('common.error')}
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBulkResultModal(false)}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                {bulkActionResult.message}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="default"
                  onClick={() => setShowBulkResultModal(false)}
                  className="flex-1"
                >
                  {t('common.ok')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {showPermanentDeleteModal && itemToDelete && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">{t('archive.confirmPermanentDelete')}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPermanentDeleteModal(false)}
                className="p-1"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-6">
                {t('archive.permanentDeleteWarning', { name: itemToDelete.name })}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPermanentDeleteModal(false)}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmPermanentDelete}
                  className="flex-1"
                >
                  {t('archive.deleteForever')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}