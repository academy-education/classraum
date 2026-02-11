"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { X } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { Student, Family } from '@/hooks/useStudentData'
import type { StudentFormData } from '@/hooks/useStudentActions'

interface StudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: StudentFormData) => Promise<void>
  student?: Student | null
  families: Family[]
  mode: 'create' | 'edit'
}

export function StudentModal({
  isOpen,
  onClose,
  onSubmit,
  student,
  families,
  mode
}: StudentModalProps) {
  const { t } = useTranslation()

  const [formData, setFormData] = useState<StudentFormData>({
    name: '',
    email: '',
    phone: '',
    school_name: '',
    family_id: '',
    active: true
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form data when student changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && student) {
        setFormData({
          name: student.name,
          email: student.email,
          phone: student.phone || '',
          school_name: student.school_name || '',
          family_id: student.family_id || '',
          active: student.active
        })
      } else {
        // Reset for create mode
        setFormData({
          name: '',
          email: '',
          phone: '',
          school_name: '',
          family_id: '',
          active: true
        })
      }
    }
  }, [isOpen, mode, student])

  const handleInputChange = (field: keyof StudentFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      alert(t('students.nameRequired'))
      return
    }

    if (!formData.email.trim()) {
      alert(t('students.emailRequired'))
      return
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      alert(t('students.emailInvalid'))
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData)
      onClose()
    } catch (error) {
      console.error('Error submitting student:', error)
      alert(t('students.errorSaving'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {mode === 'edit' ? t('students.editStudent') : t('students.addStudent')}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name and Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {t('students.name')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={String(t('students.namePlaceholder'))}
                  className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {t('students.email')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder={String(t('students.emailPlaceholder'))}
                  className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  required
                  disabled={mode === 'edit'} // Don't allow email changes in edit mode
                />
              </div>
            </div>

            {/* Phone and School */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('students.phone')}</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder={String(t('students.phonePlaceholder'))}
                  className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('students.school')}</Label>
                <Input
                  type="text"
                  value={formData.school_name}
                  onChange={(e) => handleInputChange('school_name', e.target.value)}
                  placeholder={String(t('students.schoolPlaceholder'))}
                  className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            {/* Family and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('students.family')}</Label>
                <Select value={formData.family_id} onValueChange={(value) => handleInputChange('family_id', value)}>
                  <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0">
                    <SelectValue placeholder={String(t('students.selectFamily'))} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('students.noFamily')}</SelectItem>
                    {families.map(family => (
                      <SelectItem key={family.id} value={family.id}>
                        {family.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('students.status')}</Label>
                <Select
                  value={formData.active ? 'active' : 'inactive'}
                  onValueChange={(value) => handleInputChange('active', value === 'active')}
                >
                  <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t('students.active')}</SelectItem>
                    <SelectItem value="inactive">{t('students.inactive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {mode === 'edit' && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>{t('common.note')}:</strong> {t('students.editNote')}
                </p>
              </div>
            )}
          </form>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-gray-200 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="min-w-20"
          >
            {isSubmitting ? t('common.saving') : (mode === 'edit' ? t('common.update') : t('common.create'))}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
