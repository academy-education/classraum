"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "@/hooks/useTranslation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { supabase } from "@/lib/supabase"
import { Search, RotateCcw, Trash2, Calendar, ClipboardList, School } from "lucide-react"

interface ArchivePageProps {
  academyId?: string
}

interface DeletedItem {
  id: string
  name: string
  type: 'classroom' | 'session' | 'assignment'
  deletedAt: string
  deletedBy: string
  grade?: string | null
  subject?: string | null
  date?: string
  startTime?: string
  endTime?: string
  classroomName?: string
  assignmentType?: string
  dueDate?: string | null
}

export function ArchivePage({ academyId }: ArchivePageProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<'all' | 'classrooms' | 'sessions' | 'assignments'>('all')
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDeletedItems = useCallback(async () => {
    if (!academyId) return

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
          subject,
          teacher:users!classrooms_teacher_id_fkey(name)
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
        teacher: { name: string } | null
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
            teacher:users!classrooms_teacher_id_fkey(name),
            academy_id
          ),
          substitute:users!classroom_sessions_substitute_teacher_fkey(name)
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
          teacher: { name: string } | null
          academy_id: string
        } | null
        substitute: { name: string } | null
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
              teacher:users!classrooms_teacher_id_fkey(name),
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
            teacher: { name: string } | null
            academy_id: string
          } | null
        } | null
      }

      const typedAssignments = deletedAssignments as AssignmentData[] | null

      if (classroomsError) console.error('Error fetching deleted classrooms:', classroomsError)
      if (sessionsError) console.error('Error fetching deleted sessions:', sessionsError)
      if (assignmentsError) console.error('Error fetching deleted assignments:', assignmentsError)

      const allDeletedItems: DeletedItem[] = []

      // Process classrooms
      if (typedClassrooms) {
        typedClassrooms.forEach(item => {
          allDeletedItems.push({
            id: item.id,
            name: item.name,
            type: 'classroom',
            deletedAt: item.deleted_at,
            deletedBy: item.teacher?.name || 'Unknown',
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
              deletedBy: item.substitute?.name || item.classroom?.teacher?.name || 'Unknown',
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
              deletedBy: item.classroom_session?.classroom?.teacher?.name || 'Unknown',
              assignmentType: item.assignment_type,
              dueDate: item.due_date,
              classroomName: item.classroom_session?.classroom?.name
            })
          })
      }

      // Sort all items by deleted_at descending
      allDeletedItems.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())

      setDeletedItems(allDeletedItems)
    } catch (error) {
      console.error('Error fetching deleted items:', error)
    } finally {
      setLoading(false)
    }
  }, [academyId])

  useEffect(() => {
    fetchDeletedItems()
  }, [fetchDeletedItems])

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'classroom':
        return <School className="w-4 h-4 text-blue-500" />
      case 'session':
        return <Calendar className="w-4 h-4 text-green-500" />
      case 'assignment':
        return <ClipboardList className="w-4 h-4 text-purple-500" />
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
      case 'classrooms':
        return t("navigation.classrooms")
      case 'sessions':
        return t("navigation.sessions")  
      case 'assignments':
        return t("navigation.assignments")
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
    }
    
    return matchesSearch && matchesType
  })

  const getFilterCount = (filter: string) => {
    if (filter === 'all') return deletedItems.length
    if (filter === 'classrooms') return deletedItems.filter(item => item.type === 'classroom').length
    if (filter === 'sessions') return deletedItems.filter(item => item.type === 'session').length  
    if (filter === 'assignments') return deletedItems.filter(item => item.type === 'assignment').length
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
      }

      const { error } = await supabase
        .from(tableName)
        .update({ deleted_at: null })
        .eq('id', item.id)

      if (error) {
        console.error('Error restoring item:', error)
        return
      }

      // Refresh the list
      await fetchDeletedItems()
    } catch (error) {
      console.error('Error restoring item:', error)
    }
  }

  const handlePermanentDelete = async (item: DeletedItem) => {
    if (!window.confirm(String(t("archive.confirmPermanentDelete")))) {
      return
    }

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
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', item.id)

      if (error) {
        console.error('Error permanently deleting item:', error)
        return
      }

      // Refresh the list
      await fetchDeletedItems()
    } catch (error) {
      console.error('Error permanently deleting item:', error)
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
      </div>

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
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t("archive.noItemsTitle")}</h3>
              <p className="text-gray-600">
                {typeFilter === 'all' 
                  ? t("archive.noItemsDescription")
                  : t("archive.noFilteredItemsDescription", { type: getItemTypeLabel(typeFilter) })
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
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
                          date: new Date(item.deletedAt).toLocaleDateString(), 
                          user: item.deletedBy 
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
        </div>
      </Card>
    </div>
  )
}