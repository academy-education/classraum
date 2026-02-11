"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { useReports, type ReportData } from '@/hooks/useReports'

// Import extracted components
import { ReportsTable } from './reports/ReportsTable'
import { StatusFilter } from './reports/StatusFilter'
import { AddReportModal } from './reports/AddReportModal'
import { EditReportModal } from './reports/EditReportModal'
import { DeleteConfirmationModal } from './reports/DeleteConfirmationModal'

interface ReportsPageProps {
  academyId: string
}

const ReportsPageRefactored = React.memo<ReportsPageProps>(({ academyId }) => {
  const { t } = useTranslation()
  
  // Use custom hook for data management
  const {
    reports,
    students,
    // assignmentCategories, // Commented out unused
    // studentClassrooms, // Commented out unused
    loading,
    studentsLoading,
    fetchStudentClassrooms,
    createReport,
    updateReport,
    deleteReport,
    bulkDeleteReports
  } = useReports(academyId)

  // UI state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'Draft' | 'Finished' | 'Approved' | 'Sent' | 'Viewed' | 'Error'>('all')
  
  // Modal state
  const [showAddReportModal, setShowAddReportModal] = useState(false)
  const [showEditReportModal, setShowEditReportModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingReport, setEditingReport] = useState<ReportData | null>(null)
  const [reportToDelete, setReportToDelete] = useState<ReportData | null>(null)

  // Memoized handlers
  const handleAddReport = React.useCallback(() => {
    setShowAddReportModal(true)
  }, [])

  const handleEditReport = React.useCallback((report: ReportData) => {
    setEditingReport(report)
    setShowEditReportModal(true)
  }, [])

  const handleDeleteReport = React.useCallback((report: ReportData) => {
    setReportToDelete(report)
    setShowDeleteModal(true)
  }, [])

  const handlePreviewReport = React.useCallback((report: ReportData) => {
    // TODO: Implement preview modal
    console.log('Preview report:', report)
  }, [])

  const handleConfirmDelete = React.useCallback(async () => {
    if (!reportToDelete) return
    
    try {
      await deleteReport(reportToDelete.id)
      setShowDeleteModal(false)
      setReportToDelete(null)
    } catch (error) {
      console.error('Error deleting report:', error)
    }
  }, [reportToDelete, deleteReport])

  const handleBulkDelete = React.useCallback(async (reportIds: string[]) => {
    try {
      await bulkDeleteReports(reportIds)
    } catch (error) {
      console.error('Error bulk deleting reports:', error)
    }
  }, [bulkDeleteReports])

  const handleBulkStatusUpdate = React.useCallback(async (reportIds: string[], status: string) => {
    try {
      // TODO: Implement bulk status update
      console.log('Bulk status update:', { reportIds, status })
    } catch (error) {
      console.error('Error bulk updating status:', error)
    }
  }, [])

  const handleCreateReport = React.useCallback(async (reportData: Partial<ReportData>) => {
    return await createReport(reportData)
  }, [createReport])

  const handleUpdateReport = React.useCallback(async (reportId: string, updates: Partial<ReportData>) => {
    const result = await updateReport(reportId, updates)
    if (result.error && !(result.error instanceof Error)) {
      return { success: result.success, error: new Error(String(result.error)) }
    }
    return result as { success: boolean; error?: Error }
  }, [updateReport])

  const handleCloseEditModal = React.useCallback(() => {
    setShowEditReportModal(false)
    setEditingReport(null)
  }, [])

  const handleCloseDeleteModal = React.useCallback(() => {
    setShowDeleteModal(false)
    setReportToDelete(null)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
          <p className="text-gray-600">{t('reports.description')}</p>
        </div>
        <Button onClick={handleAddReport}>
          <Plus className="w-4 h-4 mr-2" />
          {t('reports.addReport')}
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          <Input
            placeholder={String(t('reports.searchReports'))}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <StatusFilter
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      {/* Reports Table */}
      <ReportsTable
        reports={reports}
        loading={loading}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onEdit={handleEditReport}
        onDelete={handleDeleteReport}
        onPreview={handlePreviewReport}
        onBulkDelete={handleBulkDelete}
        onBulkStatusUpdate={handleBulkStatusUpdate}
        showBulkActions={true}
      />

      {/* Modals */}
      <AddReportModal
        isOpen={showAddReportModal}
        onClose={() => setShowAddReportModal(false)}
        onSave={handleCreateReport}
        students={students}
        fetchStudentClassrooms={fetchStudentClassrooms}
        loading={studentsLoading}
      />

      <EditReportModal
        isOpen={showEditReportModal}
        onClose={handleCloseEditModal}
        onSave={handleUpdateReport}
        report={editingReport}
      />

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        report={reportToDelete}
      />
    </div>
  )
})

ReportsPageRefactored.displayName = 'ReportsPageRefactored'

export { ReportsPageRefactored }