"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { X } from 'lucide-react'
import { Student, Family } from '@/hooks/useStudentData'

interface StudentsEditModalProps {
  isOpen: boolean
  student: Student | null
  formData: {
    name: string
    email: string
    phone: string
    school_name: string
    family_id: string
  }
  formErrors: { [key: string]: string }
  families: Family[]
  submitting: boolean
  t: (key: string) => string
  onClose: () => void
  onFormDataChange: (data: any) => void
  onSubmit: () => void
}

export function StudentsEditModal({
  isOpen,
  student,
  formData,
  formErrors,
  families,
  submitting,
  t,
  onClose,
  onFormDataChange,
  onSubmit
}: StudentsEditModalProps) {
  if (!isOpen || !student) return null

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-border w-full max-w-md mx-4 shadow-lg">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t("students.editStudent")}</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name" className="text-sm font-medium text-gray-700">
                {t("students.fullName")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-name"
                type="text"
                value={formData.name}
                onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
                className={`mt-1 ${formErrors.name ? 'border-red-500' : ''}`}
                placeholder={t("students.enterFullName")}
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-email" className="text-sm font-medium text-gray-700">
                {t("students.emailAddress")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })}
                className={`mt-1 ${formErrors.email ? 'border-red-500' : ''}`}
                placeholder={t("students.enterEmailAddress")}
              />
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-phone" className="text-sm font-medium text-gray-700">
                {t("students.phoneNumber")}
              </Label>
              <Input
                id="edit-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => onFormDataChange({ ...formData, phone: e.target.value })}
                className="mt-1"
                placeholder={t("students.enterPhoneNumber")}
              />
            </div>

            <div>
              <Label htmlFor="edit-school_name" className="text-sm font-medium text-gray-700">
                {t("students.schoolName")}
              </Label>
              <Input
                id="edit-school_name"
                type="text"
                value={formData.school_name}
                onChange={(e) => onFormDataChange({ ...formData, school_name: e.target.value })}
                className="mt-1"
                placeholder={t("students.enterSchoolName")}
              />
            </div>

            <div>
              <Label htmlFor="edit-family" className="text-sm font-medium text-gray-700">
                {t("students.family")}
              </Label>
              <Select value={formData.family_id} onValueChange={(value) => onFormDataChange({ ...formData, family_id: value })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("students.selectFamily")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("students.noFamily")}</SelectItem>
                  {families.map((family) => (
                    <SelectItem key={family.id} value={family.id}>
                      {family.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={submitting}
          >
            {t("common.cancel")}
          </Button>
          <Button 
            onClick={onSubmit}
            disabled={submitting}
            className="bg-primary text-white"
          >
            {submitting ? t('students.updating') : t('students.updateStudent')}
          </Button>
        </div>
      </div>
    </div>
  )
}