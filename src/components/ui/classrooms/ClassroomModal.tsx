"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  X,
  Plus,
  Trash2,
  Search,
  Clock
} from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'
import type { Classroom, Teacher, Student, Schedule } from '@/hooks/useClassroomData'
import type { ClassroomFormData } from '@/hooks/useClassroomActions'

interface ClassroomModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: ClassroomFormData, schedules: Schedule[], selectedStudents: string[]) => Promise<void>
  classroom?: Classroom | null
  teachers: Teacher[]
  students: Student[]
  mode: 'create' | 'edit'
}

export function ClassroomModal({
  isOpen,
  onClose,
  onSubmit,
  classroom,
  teachers,
  students,
  mode
}: ClassroomModalProps) {
  const { t } = useTranslation()
  
  const [formData, setFormData] = useState<ClassroomFormData>({
    name: '',
    grade: '',
    subject: '',
    teacher_id: '',
    teacher_name: '',
    color: '#3B82F6',
    notes: ''
  })
  
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [activeTimePicker, setActiveTimePicker] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize form data when classroom changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && classroom) {
        setFormData({
          name: classroom.name,
          grade: classroom.grade || '',
          subject: classroom.subject || '',
          teacher_id: classroom.teacher_id,
          teacher_name: classroom.teacher_name || '',
          color: classroom.color || '#3B82F6',
          notes: classroom.notes || ''
        })
        setSchedules(classroom.schedules || [])
        setSelectedStudents(classroom.enrolled_students?.map(s => s.name) || [])
      } else {
        // Reset for create mode
        setFormData({
          name: '',
          grade: '',
          subject: '',
          teacher_id: '',
          teacher_name: '',
          color: '#3B82F6',
          notes: ''
        })
        setSchedules([])
        setSelectedStudents([])
      }
      setStudentSearchQuery('')
      setActiveTimePicker(null)
    }
  }, [isOpen, mode, classroom])

  const handleInputChange = (field: keyof ClassroomFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTeacherChange = (teacherId: string) => {
    const selectedTeacher = teachers.find(t => t.id === teacherId)
    setFormData(prev => ({ 
      ...prev, 
      teacher_id: teacherId,
      teacher_name: selectedTeacher?.name || ''
    }))
  }

  const addSchedule = () => {
    const newSchedule: Schedule = {
      id: crypto.randomUUID(),
      day: 'Monday',
      start_time: '09:00',
      end_time: '10:00'
    }
    setSchedules(prev => [...prev, newSchedule])
  }

  const updateSchedule = (id: string, field: keyof Schedule, value: string) => {
    setSchedules(prev => prev.map(schedule => 
      schedule.id === id ? { ...schedule, [field]: value } : schedule
    ))
  }

  const removeSchedule = (id: string) => {
    setSchedules(prev => prev.filter(schedule => schedule.id !== id))
  }

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert(t('classrooms.nameRequired'))
      return
    }
    
    if (!formData.teacher_id) {
      alert(t('classrooms.teacherRequired'))
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(formData, schedules, selectedStudents)
      onClose()
    } catch (error) {
      console.error('Error submitting classroom:', error)
      alert(t('classrooms.errorSaving'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    (student.school_name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ?? false)
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg border border-border w-full max-w-4xl mx-4 max-h-[90vh] shadow-lg flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {mode === 'edit' ? t('classrooms.editClassroom') : t('classrooms.addClassroom')}
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
        
        <div className="flex-1 overflow-y-auto p-6 pt-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {t('classrooms.name')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder={t('classrooms.namePlaceholder')}
                  className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">
                  {t('classrooms.teacher')} <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.teacher_id} onValueChange={handleTeacherChange}>
                  <SelectTrigger className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0">
                    <SelectValue placeholder={t('classrooms.selectTeacher')} />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('classrooms.grade')}</Label>
                <Input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => handleInputChange('grade', e.target.value)}
                  placeholder={t('classrooms.gradePlaceholder')}
                  className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground/80">{t('classrooms.subject')}</Label>
                <Input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder={t('classrooms.subjectPlaceholder')}
                  className="h-10 text-sm bg-white border border-border focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('classrooms.color')}</Label>
              <div className="flex gap-3">
                {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'].map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${formData.color === color ? 'border-gray-400' : 'border-gray-200'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleInputChange('color', color)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">{t('classrooms.notes')}</Label>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder={t('classrooms.notesPlaceholder')}
                className="w-full h-20 px-3 py-2 text-sm bg-white border border-border rounded-md focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 resize-none"
              />
            </div>

            {/* Schedules Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium text-foreground/80">{t('classrooms.schedule')}</Label>
                <Button type="button" onClick={addSchedule} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('classrooms.addSchedule')}
                </Button>
              </div>
              
              {schedules.map(schedule => (
                <div key={schedule.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Select 
                    value={schedule.day} 
                    onValueChange={(value) => updateSchedule(schedule.id, 'day', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Monday">{t('classrooms.monday')}</SelectItem>
                      <SelectItem value="Tuesday">{t('classrooms.tuesday')}</SelectItem>
                      <SelectItem value="Wednesday">{t('classrooms.wednesday')}</SelectItem>
                      <SelectItem value="Thursday">{t('classrooms.thursday')}</SelectItem>
                      <SelectItem value="Friday">{t('classrooms.friday')}</SelectItem>
                      <SelectItem value="Saturday">{t('classrooms.saturday')}</SelectItem>
                      <SelectItem value="Sunday">{t('classrooms.sunday')}</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Input
                    type="time"
                    value={schedule.start_time}
                    onChange={(e) => updateSchedule(schedule.id, 'start_time', e.target.value)}
                    className="w-24"
                  />
                  
                  <span className="text-gray-500">-</span>
                  
                  <Input
                    type="time"
                    value={schedule.end_time}
                    onChange={(e) => updateSchedule(schedule.id, 'end_time', e.target.value)}
                    className="w-24"
                  />
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSchedule(schedule.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Students Section */}
            <div className="space-y-4">
              <Label className="text-sm font-medium text-foreground/80">{t('classrooms.students')}</Label>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder={t('classrooms.searchStudents')}
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                {filteredStudents.map(student => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(student.id)}
                      onChange={() => toggleStudentSelection(student.id)}
                      className="rounded"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{student.name}</div>
                      {student.school_name && (
                        <div className="text-xs text-gray-500">{student.school_name}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedStudents.length > 0 && (
                <div className="text-sm text-gray-600">
                  {t('classrooms.studentsSelected', { count: selectedStudents.length })}
                </div>
              )}
            </div>
          </form>
        </div>
        
        <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="min-w-24"
          >
            {isSubmitting ? t('common.saving') : (mode === 'edit' ? t('common.update') : t('common.create'))}
          </Button>
        </div>
      </div>
    </div>
  )
}