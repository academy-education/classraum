'use client'

import { useState, useCallback, useRef } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  X,
  Upload,
  FileText,
  Download,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  Users,
  UserCheck,
  UserX
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { showSuccessToast, showErrorToast } from '@/stores'
import {
  parseCSV,
  validateFamilyCSV,
  downloadCSVTemplate,
  type GroupedFamily,
  type FamilyMember
} from '@/lib/csv-parser'
import { supabase } from '@/lib/supabase'

interface FamilyImportModalProps {
  isOpen: boolean
  onClose: () => void
  academyId: string
  onSuccess: () => void
}

type Screen = 'upload' | 'preview'

export function FamilyImportModal({ isOpen, onClose, academyId, onSuccess }: FamilyImportModalProps) {
  const { t, language } = useTranslation()
  const [screen, setScreen] = useState<Screen>('upload')
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Preview state
  const [groupedFamilies, setGroupedFamilies] = useState<GroupedFamily[]>([])
  const [validCount, setValidCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)

  // Reset modal
  const resetModal = useCallback(() => {
    setScreen('upload')
    setGroupedFamilies([])
    setValidCount(0)
    setErrorCount(0)
    setUploading(false)
    setImporting(false)
  }, [])

  // Handle file upload
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      showErrorToast(t('families.invalidFileType') as string)
      return
    }

    setUploading(true)

    try {
      // Parse CSV
      const rows = await parseCSV(file)

      // Validate and group with current language
      const result = validateFamilyCSV(rows, language)

      setGroupedFamilies(result.groupedFamilies)
      setValidCount(result.validCount)
      setErrorCount(result.errorCount)

      // Move to preview screen
      setScreen('preview')
    } catch (error) {
      console.error('Error parsing CSV:', error)
      showErrorToast(
        error instanceof Error ? error.message : (t('families.csvParseError') as string)
      )
    } finally {
      setUploading(false)
    }
  }, [language, t])

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  // Edit family name
  const handleEditFamilyName = useCallback((index: number, newName: string) => {
    setGroupedFamilies(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], name: newName }
      return updated
    })
  }, [])

  // Remove family
  const handleRemoveFamily = useCallback((index: number) => {
    setGroupedFamilies(prev => {
      const updated = prev.filter((_, i) => i !== index)
      const validFamilies = updated.filter(f => f.errors.length === 0)
      setValidCount(validFamilies.length)
      return updated
    })
  }, [])

  // Edit member details
  const handleEditMember = useCallback((familyIndex: number, memberIndex: number, field: keyof FamilyMember, value: string) => {
    setGroupedFamilies(prev => {
      const updated = [...prev]
      const family = { ...updated[familyIndex] }
      const members = [...family.members]
      members[memberIndex] = { ...members[memberIndex], [field]: value }
      family.members = members
      updated[familyIndex] = family
      return updated
    })
  }, [])

  // Import families
  const handleImport = useCallback(async () => {
    setImporting(true)

    try {
      // Filter out families with errors
      const validFamilies = groupedFamilies.filter(f => f.errors.length === 0)

      let successCount = 0
      let errorFamilies = 0

      for (const family of validFamilies) {
        try {
          console.log('[Import] Creating family:', {
            academy_id: academyId,
            name: family.name,
            memberCount: family.members.length
          })

          // Create family record
          const { data: familyData, error: familyError } = await supabase
            .from('families')
            .insert({
              academy_id: academyId,
              name: family.name
            })
            .select()
            .single()

          if (familyError) {
            console.error('[Import] Family creation error:', {
              message: familyError.message,
              details: familyError.details,
              hint: familyError.hint,
              code: familyError.code
            })
            throw familyError
          }

          console.log('[Import] Family created:', familyData.id)

          // Create family member records
          const memberRecords = family.members.map(member => ({
            family_id: familyData.id,
            user_id: null, // Will be filled when user signs up
            role: member.role,
            user_name: member.user_name,
            phone: member.phone || null,
            email: member.email || null
          }))

          console.log('[Import] Creating members:', memberRecords)

          const { error: membersError } = await supabase
            .from('family_members')
            .insert(memberRecords)

          if (membersError) {
            console.error('[Import] Members creation error:', {
              message: membersError.message,
              details: membersError.details,
              hint: membersError.hint,
              code: membersError.code
            })
            throw membersError
          }

          console.log('[Import] Members created successfully')
          successCount++
        } catch (error) {
          console.error('[Import] Error creating family:', {
            error,
            familyName: family.name,
            memberCount: family.members.length
          })
          errorFamilies++
        }
      }

      const skippedCount = groupedFamilies.length - validFamilies.length + errorFamilies

      // Show success message
      if (successCount > 0) {
        if (skippedCount > 0) {
          showSuccessToast(
            t('families.importPartialSuccess', {
              success: successCount.toString(),
              skipped: skippedCount.toString()
            }) as string
          )
        } else {
          showSuccessToast(
            t('families.importSuccess', { count: successCount.toString() }) as string
          )
        }

        onSuccess()
        resetModal()
        onClose()
      } else {
        showErrorToast(t('families.importFailed') as string)
      }
    } catch (error) {
      console.error('Import error:', error)
      showErrorToast(t('families.importFailed') as string)
    } finally {
      setImporting(false)
    }
  }, [groupedFamilies, academyId, t, onSuccess, resetModal, onClose])

  return (
    <Modal isOpen={isOpen} onClose={() => { resetModal(); onClose(); }} size="4xl">
      <div className="flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {t('families.importTitle')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('families.importDescription')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-1"
            onClick={() => {
              resetModal()
              onClose()
            }}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {screen === 'upload' && (
            <div className="space-y-6">
              {/* Upload Area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`
                  border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer
                  ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                  ${uploading ? 'pointer-events-none opacity-50' : ''}
                `}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">
                  {t('families.dragDropCSV')}
                </p>
                <p className="text-sm text-gray-500">
                  {t('families.csvFormatHint') || 'Supports .csv files only'}
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
              </div>

              {/* CSV Format Guide */}
              <Card className="p-6 bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900 mb-2">
                      {t('families.csvFormat')}
                    </h3>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>family_id / 가족번호:</strong> {t('families.familyIdColumn')}</p>
                      <p><strong>role / 역할:</strong> {t('families.roleColumn')}</p>
                      <p><strong>user_name / 이름:</strong> {t('families.userNameColumn')}</p>
                      <p><strong>phone / 전화번호:</strong> {t('families.phoneColumn')}</p>
                      <p><strong>email / 이메일:</strong> {t('families.emailColumn')}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4 bg-white"
                      onClick={(e) => {
                        e.stopPropagation()
                        downloadCSVTemplate(language)
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('families.downloadTemplate')}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {screen === 'preview' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="flex gap-4">
                <Card className="flex-1 p-4 border-l-4 border-green-500">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{validCount}</p>
                      <p className="text-sm text-gray-600">{t('families.validFamilies')}</p>
                    </div>
                  </div>
                </Card>
                <Card className="flex-1 p-4 border-l-4 border-red-500">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{errorCount}</p>
                      <p className="text-sm text-gray-600">{t('families.errorsFound')}</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Families List */}
              <div className="space-y-6">
                <h3 className="font-medium text-gray-900">{t('families.previewFamilies')}</h3>
                {groupedFamilies.map((family, familyIndex) => (
                  <Card
                    key={familyIndex}
                    className={`p-6 hover:shadow-lg transition-shadow border-l-4 ${
                      family.errors.length > 0
                        ? 'border-l-red-500'
                        : 'border-l-primary'
                    }`}
                  >
                    {/* Family Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg flex-shrink-0 ${
                            family.errors.length > 0 ? 'bg-red-500' : 'bg-primary'
                          }`}
                        >
                          {familyIndex + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Users className="w-5 h-5 text-gray-600 flex-shrink-0" />
                            <Input
                              value={family.name}
                              onChange={(e) => handleEditFamilyName(familyIndex, e.target.value)}
                              className="text-lg font-semibold border-0 border-b-2 border-transparent hover:border-gray-300 focus:border-primary rounded-none px-2 py-1 bg-transparent"
                            />
                          </div>
                          <p className="text-sm text-gray-600 pl-2">
                            {family.members.length} {t('families.members')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFamily(familyIndex)}
                          className="text-gray-600 hover:text-red-600 flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Members Section Header */}
                    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                      {t('families.members')}
                    </h4>

                    {/* Members */}
                    <div className="space-y-3">
                      {family.members.map((member, memberIndex) => (
                        <div
                          key={memberIndex}
                          className="p-4 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`member-${familyIndex}-${memberIndex}-role`} className="text-sm font-medium text-gray-700">
                                {t('families.role')} <span className="text-red-500">*</span>
                              </Label>
                              <Select
                                value={member.role}
                                onValueChange={(value) => handleEditMember(familyIndex, memberIndex, 'role', value as 'student' | 'parent')}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="student">{t('families.student')}</SelectItem>
                                  <SelectItem value="parent">{t('families.parent')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor={`member-${familyIndex}-${memberIndex}-name`} className="text-sm font-medium text-gray-700">
                                {t('families.name')} <span className="text-red-500">*</span>
                              </Label>
                              <Input
                                id={`member-${familyIndex}-${memberIndex}-name`}
                                type="text"
                                value={member.user_name}
                                onChange={(e) => handleEditMember(familyIndex, memberIndex, 'user_name', e.target.value)}
                                className="mt-1"
                                placeholder={t('families.enterName') as string}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`member-${familyIndex}-${memberIndex}-phone`} className="text-sm font-medium text-gray-700">
                                {t('families.phone')}
                              </Label>
                              <Input
                                id={`member-${familyIndex}-${memberIndex}-phone`}
                                type="tel"
                                value={member.phone || ''}
                                onChange={(e) => handleEditMember(familyIndex, memberIndex, 'phone', e.target.value)}
                                className="mt-1"
                                placeholder={t('families.enterPhone') as string}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`member-${familyIndex}-${memberIndex}-email`} className="text-sm font-medium text-gray-700">
                                {t('families.email')}
                              </Label>
                              <Input
                                id={`member-${familyIndex}-${memberIndex}-email`}
                                type="email"
                                value={member.email || ''}
                                onChange={(e) => handleEditMember(familyIndex, memberIndex, 'email', e.target.value)}
                                className="mt-1"
                                placeholder={t('families.enterEmail') as string}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Errors */}
                    {family.errors.length > 0 && (
                      <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                        <p className="text-sm font-medium text-red-900 mb-1">
                          {t('families.validationErrors')}:
                        </p>
                        <ul className="text-sm text-red-800 space-y-1">
                          {family.errors.map((error, i) => (
                            <li key={i}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
          {screen === 'preview' && (
            <>
              <Button
                variant="outline"
                onClick={() => setScreen('upload')}
                disabled={importing}
              >
                {t('common.back')}
              </Button>
              <Button
                onClick={handleImport}
                disabled={validCount === 0 || importing}
              >
                {importing ? t('families.importing') : t('families.importFamilies')}
                {validCount > 0 && ` (${validCount})`}
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
