"use client"

import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { ClassroomCreateModal } from '@/components/ui/classrooms/modals/ClassroomCreateModal'
import type { Schedule } from '@/components/ui/classrooms/hooks/useClassroomsData'
import type { Subject } from '@/hooks/useSubjectData'
import { getTeachers, getStudents } from './sample-data'
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

const SAMPLE_SCHEDULES: Schedule[] = [
  { id: 'sc1', day: 'monday', start_time: '16:00', end_time: '17:30' },
]

function getSubjects(lang: string): Subject[] {
  const ko = lang === 'korean'
  return [
    { id: 'sub1', name: ko ? '수학' : 'Mathematics', academy_id: 'aca1', created_at: null, updated_at: null },
    { id: 'sub2', name: ko ? '영어' : 'English', academy_id: 'aca1', created_at: null, updated_at: null },
    { id: 'sub3', name: ko ? '과학' : 'Science', academy_id: 'aca1', created_at: null, updated_at: null },
  ]
}

// Palette + keys mirror src/components/ui/classrooms-page.tsx (lines
// 302-330) so the demo's color picker shows the exact same swatches +
// localized names as the live Create Classroom modal.
const PRESET_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#6366F1', '#64748B', '#DC2626',
]

const COLOR_NAME_KEYS: Record<string, string> = {
  '#3B82F6': 'classrooms.blue',
  '#EF4444': 'classrooms.red',
  '#10B981': 'classrooms.green',
  '#F59E0B': 'classrooms.yellow',
  '#8B5CF6': 'classrooms.purple',
  '#EC4899': 'classrooms.pink',
  '#06B6D4': 'classrooms.cyan',
  '#84CC16': 'classrooms.lime',
  '#F97316': 'classrooms.orange',
  '#6366F1': 'classrooms.indigo',
  '#64748B': 'classrooms.slate',
  '#DC2626': 'classrooms.crimson',
}

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

const DAY_LABELS: Record<string, { en: string; ko: string }> = {
  monday: { en: 'Monday', ko: '월요일' },
  tuesday: { en: 'Tuesday', ko: '화요일' },
  wednesday: { en: 'Wednesday', ko: '수요일' },
  thursday: { en: 'Thursday', ko: '목요일' },
  friday: { en: 'Friday', ko: '금요일' },
  saturday: { en: 'Saturday', ko: '토요일' },
  sunday: { en: 'Sunday', ko: '일요일' },
}

function makeFormatTime(lang: string) {
  return (t: string): string => {
    // "16:00" → "4:00 PM" (en) or "오후 4:00" (ko)
    const [h, m] = t.split(':').map(Number)
    const hour12 = h % 12 === 0 ? 12 : h % 12
    const minutes = m.toString().padStart(2, '0')
    if (lang === 'korean') {
      const period = h >= 12 ? '오후' : '오전'
      return `${period} ${hour12}:${minutes}`
    }
    return `${hour12}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`
  }
}

function isValidHexDemo(c: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(c)
}

const noop = () => undefined

export function ClassroomCreateDemo() {
  const { t, language } = useTranslation()
  const teachers = getTeachers(language)
  const students = getStudents(language)
  const colorNames = Object.fromEntries(
    Object.entries(COLOR_NAME_KEYS).map(([hex, key]) => [hex, String(t(key))])
  )

  // Pre-populate so the demo looks like a partially-filled form rather
  // than empty placeholders. The seed values come from the localized
  // sample data so the form reads natively in whichever language the
  // user is on.
  const [formData, setFormData] = useState({
    name: language === 'korean' ? '4학년 수학' : 'Grade 4 Math',
    grade: language === 'korean' ? '4학년' : 'Grade 4',
    subject_id: 'sub1',
    teacher_id: teachers[0].id,
    teacher_name: teachers[0].name,
    color: '#3B82F6',
    notes: '',
  })
  const [selectedStudents, setSelectedStudents] = useState<string[]>([students[0].id, students[1].id])
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
        teachers={teachers}
        filteredTeachers={teachers}
        students={students}
        filteredStudents={students}
        subjects={getSubjects(language)}
        customColors={[]}
        presetColors={PRESET_COLORS}
        colorNames={colorNames}
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
        getTranslatedDay={d => (DAY_LABELS[d.toLowerCase()]?.[language === 'korean' ? 'ko' : 'en']) || d}
        formatTime={makeFormatTime(language)}
        isValidHexColor={isValidHexDemo}
        handleInputChange={(field, value) => setFormData(f => ({ ...f, [field]: value }))}
        handleTeacherChange={tid => {
          const t = teachers.find(x => x.id === tid)
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
