"use client"

import { useState } from 'react'
import { ClassroomCreateModal } from '@/components/ui/classrooms/modals/ClassroomCreateModal'
import type { Teacher, Student, Schedule } from '@/components/ui/classrooms/hooks/useClassroomsData'
import type { Subject } from '@/hooks/useSubjectData'
import { NonFunctional } from './NonFunctional'

/**
 * Renders the real ClassroomCreateModal inline (no portal, no backdrop)
 * with sample data, for use inside help articles.
 *
 * Every prop matches the live modal's shape — data fields hold static
 * sample values, state setters update local useState, and handlers are
 * no-ops. Because the modal is rendered with `inline`, it appears in
 * document flow rather than overlaying the page.
 *
 * Maintenance: when ClassroomCreateModal grows a new required prop,
 * TypeScript will flag this file. Add a sample value here and move on.
 */

const SAMPLE_TEACHERS: Teacher[] = [
  { id: 't1', name: 'Ms. Kim', user_id: 'u1' },
  { id: 't2', name: 'Mr. Park', user_id: 'u2' },
  { id: 't3', name: 'Ms. Lee', user_id: 'u3' },
]

const SAMPLE_STUDENTS: Student[] = [
  { id: 's1', name: 'Alice Park', user_id: 'su1', school_name: 'Daewon Elementary' },
  { id: 's2', name: 'Brian Cho', user_id: 'su2', school_name: 'Seoul Foreign' },
  { id: 's3', name: 'Chloe Lim', user_id: 'su3', school_name: 'Daewon Elementary' },
  { id: 's4', name: 'Daniel Han', user_id: 'su4', school_name: 'KIS Jeju' },
]

const SAMPLE_SCHEDULES: Schedule[] = [
  { id: 'sc1', day: 'monday', start_time: '16:00', end_time: '17:30' },
]

const SAMPLE_SUBJECTS: Subject[] = [
  { id: 'sub1', name: 'Mathematics', academy_id: 'aca1', created_at: null, updated_at: null },
  { id: 'sub2', name: 'English', academy_id: 'aca1', created_at: null, updated_at: null },
  { id: 'sub3', name: 'Science', academy_id: 'aca1', created_at: null, updated_at: null },
]

const PRESET_COLORS = [
  '#3b82f6', '#38bdf8', '#10b981', '#f59e0b',
  '#f43f5e', '#a855f7', '#6366f1', '#ec4899',
  '#14b8a6', '#f97316', '#84cc16', '#d946ef',
]

const COLOR_NAMES: Record<string, string> = {
  '#3b82f6': 'Blue',
  '#38bdf8': 'Sky',
  '#10b981': 'Emerald',
  '#f59e0b': 'Amber',
  '#f43f5e': 'Rose',
  '#a855f7': 'Purple',
  '#6366f1': 'Indigo',
  '#ec4899': 'Pink',
  '#14b8a6': 'Teal',
  '#f97316': 'Orange',
  '#84cc16': 'Lime',
  '#d946ef': 'Fuchsia',
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DAY_LABELS_EN: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

function formatTimeDemo(t: string): string {
  // "16:00" → "4:00 PM"
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return `${hour12}:${m.toString().padStart(2, '0')} ${period}`
}

function isValidHexDemo(c: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(c)
}

const noop = () => undefined

export function ClassroomCreateDemo() {
  // Pre-populate so the demo looks like a partially-filled form rather
  // than empty placeholders. Users still see the labels, controls, and
  // brand styling exactly as they will in the live modal.
  const [formData, setFormData] = useState({
    name: 'Grade 4 Math',
    grade: 'Grade 4',
    subject_id: 'sub1',
    teacher_id: 't1',
    teacher_name: 'Ms. Kim',
    color: '#3b82f6',
    notes: '',
  })
  const [selectedStudents, setSelectedStudents] = useState<string[]>(['s1', 's2'])
  const [previewColor, setPreviewColor] = useState<string | null>(null)
  const [customColorInput, setCustomColorInput] = useState('')
  const [showInlineSubjectCreate, setShowInlineSubjectCreate] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('')
  const [activeTimePicker, setActiveTimePicker] = useState<string | null>(null)

  return (
    <NonFunctional>
      <div className="my-6 [&_[data-slot=modal]]:!my-0">
      <ClassroomCreateModal
        isOpen
        inline
        onClose={noop}
        formData={formData}
        setFormData={setFormData}
        schedules={SAMPLE_SCHEDULES}
        selectedStudents={selectedStudents}
        setSelectedStudents={setSelectedStudents}
        teachers={SAMPLE_TEACHERS}
        filteredTeachers={SAMPLE_TEACHERS}
        students={SAMPLE_STUDENTS}
        filteredStudents={SAMPLE_STUDENTS}
        subjects={SAMPLE_SUBJECTS}
        customColors={[]}
        presetColors={PRESET_COLORS}
        colorNames={COLOR_NAMES}
        previewColor={previewColor}
        setPreviewColor={setPreviewColor}
        customColorInput={customColorInput}
        setCustomColorInput={setCustomColorInput}
        isCreating={false}
        isManager
        userRole="manager"
        showInlineSubjectCreate={showInlineSubjectCreate}
        setShowInlineSubjectCreate={setShowInlineSubjectCreate}
        newSubjectName={newSubjectName}
        setNewSubjectName={setNewSubjectName}
        isCreatingSubject={false}
        studentSearchQuery={studentSearchQuery}
        setStudentSearchQuery={setStudentSearchQuery}
        teacherSearchQuery={teacherSearchQuery}
        setTeacherSearchQuery={setTeacherSearchQuery}
        activeTimePicker={activeTimePicker}
        setActiveTimePicker={setActiveTimePicker}
        daysOfWeek={DAYS_OF_WEEK}
        getTranslatedDay={d => DAY_LABELS_EN[d] || d}
        formatTime={formatTimeDemo}
        isValidHexColor={isValidHexDemo}
        handleInputChange={(field, value) => setFormData(f => ({ ...f, [field]: value }))}
        handleTeacherChange={tid => {
          const t = SAMPLE_TEACHERS.find(x => x.id === tid)
          setFormData(f => ({ ...f, teacher_id: tid, teacher_name: t?.name || '' }))
        }}
        handleSubmit={e => e.preventDefault()}
        handleCreateSubject={noop}
        toggleStudentSelection={sid =>
          setSelectedStudents(s => (s.includes(sid) ? s.filter(x => x !== sid) : [...s, sid]))
        }
        addSchedule={noop}
        removeSchedule={noop}
        updateSchedule={noop}
        removeCustomColor={noop}
        openColorPicker={noop}
      />
      </div>
    </NonFunctional>
  )
}
