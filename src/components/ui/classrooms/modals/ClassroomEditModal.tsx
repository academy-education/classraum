"use client"

import { useState } from 'react'
import {
  Plus,
  Trash2,
  Users,
  X,
  Search,
  Clock,
  Loader2,
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TimePickerComponent } from '@/components/ui/classrooms-page'
import type { Classroom, Teacher, Student, Schedule } from '@/components/ui/classrooms/hooks/useClassroomsData'
import type { Subject } from '@/hooks/useSubjectData'

interface FormData {
  name: string
  grade: string
  subject_id: string
  teacher_id: string
  teacher_name: string
  color: string
  notes: string
}

interface ClassroomEditModalProps {
  isOpen: boolean
  onClose: () => void
  editingClassroom: Classroom | null
  formData: FormData
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
  schedules: Schedule[]
  selectedStudents: string[]
  setSelectedStudents: React.Dispatch<React.SetStateAction<string[]>>
  teachers: Teacher[]
  filteredTeachers: Teacher[]
  students: Student[]
  filteredStudents: Student[]
  subjects: Subject[]
  customColors: string[]
  presetColors: string[]
  customColorInput: string
  setCustomColorInput: (v: string) => void
  editModalLoading: boolean
  isSaving: boolean
  isManager: boolean
  userRole: 'manager' | 'teacher' | null
  showInlineSubjectCreate: boolean
  setShowInlineSubjectCreate: (v: boolean) => void
  newSubjectName: string
  setNewSubjectName: (v: string) => void
  isCreatingSubject: boolean
  studentSearchQuery: string
  setStudentSearchQuery: (v: string) => void
  teacherSearchQuery: string
  setTeacherSearchQuery: (v: string) => void
  activeTimePicker: string | null
  setActiveTimePicker: (v: string | null) => void
  daysOfWeek: string[]
  getTranslatedDay: (day: string) => string
  formatTime: (time: string) => string
  isValidHexColor: (color: string) => boolean
  handleCustomColorChange: (color: string) => void
  handleEditSubmit: (e: React.FormEvent) => void | Promise<void>
  handleCreateSubject: () => void | Promise<void>
  addSchedule: () => void
  removeSchedule: (id: string) => void
  updateSchedule: (id: string, field: keyof Schedule, value: string) => void
  removeCustomColor: (color: string) => void | Promise<void>
  openColorPicker: () => void
}

export function ClassroomEditModal({
  isOpen,
  onClose,
  editingClassroom,
  formData,
  setFormData,
  schedules,
  selectedStudents,
  setSelectedStudents,
  teachers,
  filteredTeachers,
  students,
  filteredStudents,
  subjects,
  customColors,
  presetColors,
  customColorInput,
  setCustomColorInput,
  editModalLoading,
  isSaving,
  isManager,
  userRole,
  showInlineSubjectCreate,
  setShowInlineSubjectCreate,
  newSubjectName,
  setNewSubjectName,
  isCreatingSubject,
  studentSearchQuery,
  setStudentSearchQuery,
  teacherSearchQuery,
  setTeacherSearchQuery,
  activeTimePicker,
  setActiveTimePicker,
  daysOfWeek,
  getTranslatedDay,
  formatTime,
  isValidHexColor,
  handleCustomColorChange,
  handleEditSubmit,
  handleCreateSubject,
  addSchedule,
  removeSchedule,
  updateSchedule,
  removeCustomColor,
  openColorPicker,
}: ClassroomEditModalProps) {
  const { t } = useTranslation()
  const [hoveredStudent, setHoveredStudent] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

  if (!editingClassroom) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{t("classrooms.editClassroom")}</h2>
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
          <form id="edit-classroom-form" onSubmit={handleEditSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {t("classrooms.classroomName")} <span className="text-red-500">*</span>
              </Label>
              <Input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={String(t("classrooms.enterClassroomName"))}
                className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {t("classrooms.grade")}
                </Label>
                <Input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  placeholder={String(t("classrooms.enterGrade"))}
                  className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {t("classrooms.subject")}
                </Label>
                <Select
                  value={formData.subject_id}
                  onValueChange={(value) => {
                    if (value === 'add-new' && isManager) {
                      setShowInlineSubjectCreate(true)
                    } else {
                      setFormData({ ...formData, subject_id: value })
                    }
                  }}
                >
                  <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                    <SelectValue placeholder={String(t("classrooms.selectSubject"))} />
                  </SelectTrigger>
                  <SelectContent className="z-[210]">
                    {subjects.map(subject => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                    {isManager && (
                      <SelectItem value="add-new">
                        <Plus className="w-4 h-4 inline mr-2" />
                        {t("subjects.addSubject")}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                {showInlineSubjectCreate && (
                  <div className="space-y-2 mt-2">
                    <Input
                      type="text"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder={String(t("subjects.enterSubjectName"))}
                      className="h-10 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                      disabled={isCreatingSubject}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleCreateSubject()
                        } else if (e.key === 'Escape') {
                          setShowInlineSubjectCreate(false)
                          setNewSubjectName('')
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleCreateSubject}
                        disabled={!newSubjectName.trim() || isCreatingSubject}
                        size="sm"
                      >
                        {isCreatingSubject ? t('common.saving') : t('common.create')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowInlineSubjectCreate(false)
                          setNewSubjectName('')
                        }}
                        size="sm"
                        disabled={isCreatingSubject}
                      >
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Hide teacher dropdown for teachers - they can only edit their own classrooms */}
            {userRole !== 'teacher' && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {t("classrooms.teacher")} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.teacher_id}
                  onValueChange={(value) => {
                    const selectedTeacher = teachers.find(t => t.user_id === value)
                    setFormData({
                      ...formData,
                      teacher_id: value,
                      teacher_name: selectedTeacher?.name || ''
                    })
                  }}
                  required
                  onOpenChange={(open) => {
                    if (!open) setTeacherSearchQuery('')
                  }}
                >
                  <SelectTrigger className="!h-10 w-full rounded-lg border border-border bg-transparent focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary py-2 px-3">
                    <SelectValue placeholder={String(t("classrooms.selectTeacher"))} />
                  </SelectTrigger>
                  <SelectContent className="z-[210]">
                    <div className="px-2 py-1.5 sticky top-0 bg-white border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder={String(t("common.search"))}
                          value={teacherSearchQuery}
                          onChange={(e) => setTeacherSearchQuery(e.target.value)}
                          className="pl-8 h-8"
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {filteredTeachers.map((teacher) => (
                        <SelectItem key={teacher.user_id} value={teacher.user_id}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                      {filteredTeachers.length === 0 && (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          {t("common.noResults")}
                        </div>
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>
            )}


            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {t("classrooms.color")}
              </Label>
              <div className="p-4 bg-gray-50 rounded-lg border border-border">
                {/* Current Color Display */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-white shadow-sm"
                    style={{ backgroundColor: formData.color }}
                  />
                  <div>
                    <Label className="text-sm font-medium text-foreground">{t("classrooms.selectedColor")}</Label>
                    <p className="text-xs text-foreground/60">{formData.color}</p>
                  </div>
                </div>

                {/* Preset Colors Grid */}
                <div>
                  <Label className="text-xs font-medium text-foreground/70 mb-2 block">{t("classrooms.presetColors")}</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {presetColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormData({ ...formData, color })}
                        className="w-8 h-8 rounded-lg border-2 border-white shadow-sm transition-all duration-150 ease-out hover:scale-[1.02] hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                {/* Custom Colors */}
                {customColors.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-xs font-medium text-foreground/70 mb-2 block">{t("classrooms.customColors")}</Label>
                    <div className="flex flex-wrap gap-2">
                      {customColors.map((color) => (
                        <div key={color} className="relative group">
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, color })}
                            className="w-8 h-8 rounded-lg border-2 border-white shadow-sm transition-all duration-150 ease-out hover:scale-[1.02] hover:shadow-md hover:-translate-y-0.5 hover:border-gray-300"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                          <button
                            type="button"
                            onClick={() => removeCustomColor(color)}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center text-xs hover:bg-red-600"
                            title={String(t("classrooms.removeColor"))}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Color Picker */}
                <div className="mt-4">
                  <Label className="text-xs font-medium text-foreground/70 mb-2 block">{t("classrooms.customColor")}</Label>
                  <div className="flex gap-2">
                    {/* Custom color picker button */}
                    <button
                      type="button"
                      onClick={openColorPicker}
                      className="w-10 h-10 rounded-lg shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-lg transform border-2 border-white ring-0 focus:ring-0 focus:outline-none"
                      style={{ backgroundColor: formData.color }}
                      title={String(t("classrooms.customColor"))}
                    />
                    {/* Hex input field */}
                    <Input
                      type="text"
                      value={customColorInput}
                      onChange={(e) => handleCustomColorChange(e.target.value)}
                      onBlur={() => {
                        // Reset to current color if invalid
                        if (!isValidHexColor(customColorInput)) {
                          setCustomColorInput(formData.color)
                        }
                      }}
                      placeholder={String(t("classrooms.enterHexCode"))}
                      className="h-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 font-mono uppercase flex-1"
                      maxLength={7}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground/80">
                  {t("classrooms.classSchedule")}
                </Label>
                {!editModalLoading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addSchedule}
                    className="h-8 px-2 text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {t("classrooms.addSchedule")}
                  </Button>
                )}
              </div>

              {editModalLoading ? (
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg border border-border space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <div className="flex gap-3">
                        <Skeleton className="h-9 flex-1 rounded" />
                        <Skeleton className="h-9 flex-1 rounded" />
                        <Skeleton className="h-9 flex-1 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">{t("classrooms.noSchedulesAdded")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {schedules.map((schedule, index) => (
                    <div key={schedule.id} className="p-3 bg-gray-50 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium text-foreground/80">
                          {t("classrooms.schedule")} {index + 1}
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSchedule(schedule.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3 text-gray-500" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <Label className="text-xs text-foreground/60 mb-1 block">{t("classrooms.day")}</Label>
                          <Select
                            value={schedule.day}
                            onValueChange={(value) => updateSchedule(schedule.id, 'day', value)}
                          >
                            <SelectTrigger className="h-9 text-sm bg-white focus:border-primary data-[state=open]:border-primary">
                              <SelectValue>
                                {schedule.day ? getTranslatedDay(schedule.day) : ''}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="z-[210]">
                              {daysOfWeek.map((day) => {
                                const translatedDay = getTranslatedDay(day)
                                return (
                                  <SelectItem key={day} value={day}>
                                    <span>{translatedDay}</span>
                                  </SelectItem>
                                )
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-foreground/60 mb-1 block">{t("classrooms.startTime")}</Label>
                            <TimePickerComponent
                              value={schedule.start_time}
                              onChange={(value) => updateSchedule(schedule.id, 'start_time', value)}
                              scheduleId={schedule.id}
                              field="start_time"
                              activeTimePicker={activeTimePicker}
                              setActiveTimePicker={setActiveTimePicker}
                              formatTime={formatTime}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-foreground/60 mb-1 block">{t("classrooms.endTime")}</Label>
                            <TimePickerComponent
                              value={schedule.end_time}
                              onChange={(value) => updateSchedule(schedule.id, 'end_time', value)}
                              scheduleId={schedule.id}
                              field="end_time"
                              activeTimePicker={activeTimePicker}
                              setActiveTimePicker={setActiveTimePicker}
                              formatTime={formatTime}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {t("classrooms.notes")}
              </Label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full min-h-[2.5rem] px-3 py-2 rounded-lg border border-border bg-transparent focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none resize-none text-sm"
                placeholder={String(t("classrooms.additionalNotes"))}
              />
            </div>

            {/* Student Enrollment Section */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">
                {t("classrooms.studentEnrollment")}
              </Label>
              <div className="border border-border rounded-lg bg-gray-50 p-4">
                {students.length === 0 ? (
                  <div className="text-center py-4">
                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">{t("classrooms.noStudentsAvailable")}</p>
                  </div>
                ) : (
                  <>
                    {/* Search Bar */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
                      <Input
                        type="text"
                        placeholder={String(t("classrooms.searchStudents"))}
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="h-9 pl-10 rounded-lg border border-border bg-white focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                      />
                    </div>

                    <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
                      {filteredStudents.length === 0 ? (
                        <div className="text-center py-4">
                          <Users className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">{t("classrooms.noStudentsFound")}</p>
                        </div>
                      ) : (
                        filteredStudents.map((student) => (
                          <label
                            key={student.id}
                            className="flex items-center gap-3 p-2 hover:bg-white/50 rounded-md cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedStudents.includes(student.user_id)}
                              onChange={() => {
                                if (selectedStudents.includes(student.user_id)) {
                                  setSelectedStudents(selectedStudents.filter(id => id !== student.user_id))
                                } else {
                                  setSelectedStudents([...selectedStudents, student.user_id])
                                }
                              }}
                              className="w-4 h-4 text-primary border-border rounded focus:ring-0 focus:outline-none hover:border-border focus:border-border"
                            />
                            <div className="flex-1 min-w-0 relative">
                              <div className="flex items-center justify-between">
                                <span
                                  className="text-sm font-medium text-gray-900 truncate cursor-default"
                                  onMouseEnter={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect()
                                    setTooltipPosition({
                                      x: rect.right + 10,
                                      y: rect.top
                                    })
                                    setHoveredStudent(student.id)
                                  }}
                                  onMouseLeave={() => setHoveredStudent(null)}
                                >
                                  {student.name}
                                </span>
                                {student.school_name && (
                                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                    {student.school_name}
                                  </span>
                                )}
                              </div>
                              {/* Student Tooltip */}
                              {hoveredStudent === student.id && (
                                <div
                                  className="fixed z-[90] bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[240px] animate-in fade-in duration-150"
                                  style={{
                                    left: `${tooltipPosition.x}px`,
                                    top: `${tooltipPosition.y}px`
                                  }}
                                >
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <span className="font-semibold text-gray-700">{student.name}</span>
                                    </div>
                                    {student.phone && (
                                      <div className="flex items-start gap-2">
                                        <span className="text-gray-500 min-w-[60px]">{t("classrooms.phone")}:</span>
                                        <span className="text-gray-900">{student.phone}</span>
                                      </div>
                                    )}
                                    {student.email && (
                                      <div className="flex items-start gap-2">
                                        <span className="text-gray-500 min-w-[60px]">{t("classrooms.email")}:</span>
                                        <span className="text-gray-900 break-all">{student.email}</span>
                                      </div>
                                    )}
                                    {student.family_name && (
                                      <div className="flex items-start gap-2">
                                        <span className="text-gray-500 min-w-[60px]">{t("classrooms.family")}:</span>
                                        <span className="text-gray-900">{student.family_name}</span>
                                      </div>
                                    )}
                                    {student.parent_names && student.parent_names.length > 0 && (
                                      <div className="flex items-start gap-2">
                                        <span className="text-gray-500 min-w-[60px]">{t("classrooms.parents")}:</span>
                                        <span className="text-gray-900">{student.parent_names.join(', ')}</span>
                                      </div>
                                    )}
                                    {!student.phone && !student.email && !student.family_name && (
                                      <div className="text-gray-400 italic text-xs">
                                        {t("classrooms.noAdditionalInfo")}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  </>
                )}

                {selectedStudents.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      {selectedStudents.length} {selectedStudents.length === 1 ? t("classrooms.studentSelected") : t("classrooms.studentsSelected")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>

        <div className="flex items-center gap-3 p-6 pt-4 border-t border-gray-200 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="submit"
            form="edit-classroom-form"
            className="flex-1"
            disabled={!formData.name || !formData.teacher_id || isSaving}
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isSaving ? t("common.saving") : t("classrooms.saveChanges")}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
