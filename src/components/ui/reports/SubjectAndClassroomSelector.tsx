"use client"

import React, { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Check } from 'lucide-react'
import { useTranslation } from '@/hooks/useTranslation'

interface Subject {
  id: string
  name: string
}

interface AssignmentCategory {
  id: string
  name: string
  subject_id: string | null
}

interface Classroom {
  id: string
  name: string
  subject: string | null
  grade: string | null
  subject_id: string | null
  teacher?: {
    name: string
  }
}

interface SubjectAndClassroomSelectorProps {
  subjects: Subject[]
  assignmentCategories: AssignmentCategory[]
  classrooms: Classroom[]
  selectedSubject: string
  selectedCategories: string[]
  selectedClassrooms: string[]
  onSubjectChange: (subject: string) => void
  onCategoriesChange: (categories: string[]) => void
  onClassroomsChange: (classrooms: string[]) => void
  loading?: boolean
  error?: string
}


export const SubjectAndClassroomSelector = React.memo<SubjectAndClassroomSelectorProps>(({
  subjects,
  assignmentCategories,
  classrooms,
  selectedSubject,
  selectedCategories,
  selectedClassrooms,
  onSubjectChange,
  onCategoriesChange,
  onClassroomsChange,
  loading = false,
  error
}) => {
  const { t, language } = useTranslation()

  // Filter categories based on selected subject (like in assignments page)
  const filteredCategories = useMemo(() => {
    if (!selectedSubject) {
      return []
    }
    return assignmentCategories.filter(category => 
      category.subject_id === selectedSubject
    )
  }, [assignmentCategories, selectedSubject])

  // Filter classrooms based on selected subject
  const filteredClassrooms = useMemo(() => {
    if (!selectedSubject) {
      return classrooms
    }
    return classrooms.filter(classroom => 
      classroom.subject_id === selectedSubject
    )
  }, [classrooms, selectedSubject])

  // Clear selected categories when subject changes and they're no longer valid
  React.useEffect(() => {
    const validCategories = selectedCategories.filter(categoryId =>
      filteredCategories.some(category => category.id === categoryId)
    )
    if (validCategories.length !== selectedCategories.length) {
      onCategoriesChange(validCategories)
    }
  }, [selectedSubject, selectedCategories, filteredCategories, onCategoriesChange])

  // Clear selected classrooms when subject changes and they're no longer valid
  React.useEffect(() => {
    const validClassrooms = selectedClassrooms.filter(classroomId =>
      filteredClassrooms.some(classroom => classroom.id === classroomId)
    )
    if (validClassrooms.length !== selectedClassrooms.length) {
      onClassroomsChange(validClassrooms)
    }
  }, [selectedSubject, selectedClassrooms, filteredClassrooms, onClassroomsChange])

  // Handle single subject selection
  const handleSubjectChange = (value: string) => {
    onSubjectChange(value)
  }

  const handleCategoryChange = (value: string) => {
    if (value === "multiple-selection") return
    const newSelection = selectedCategories.includes(value)
      ? selectedCategories.filter(id => id !== value)
      : [...selectedCategories, value]
    onCategoriesChange(newSelection)
  }

  const handleClassroomChange = (value: string) => {
    if (value === "multiple-selection") return
    const newSelection = selectedClassrooms.includes(value)
      ? selectedClassrooms.filter(id => id !== value)
      : [...selectedClassrooms, value]
    onClassroomsChange(newSelection)
  }

  const getSelectedCategoriesText = () => {
    if (!selectedSubject) return t('reports.selectSubjectsFirst')
    if (selectedCategories.length === 0) return t('reports.selectCategories')
    if (selectedCategories.length === 1) {
      const category = filteredCategories.find(c => c.id === selectedCategories[0])
      return category?.name || ''
    }
    // Handle Korean word order: "카테고리 x개" vs "x categories"
    if (language === 'korean') {
      return `${t('reports.categories')} ${selectedCategories.length}개`
    } else {
      return `${selectedCategories.length} ${t('reports.categories').toLowerCase()}`
    }
  }

  const getSelectedClassroomsText = () => {
    if (selectedClassrooms.length === 0) {
      return t('reports.selectClassrooms')
    }
    if (selectedClassrooms.length === 1) {
      const classroom = classrooms.find(c => c.id === selectedClassrooms[0])
      return classroom?.name || ''
    }
    // Handle Korean word order for classrooms count
    if (language === 'korean') {
      return `${t('reports.classrooms')} ${selectedClassrooms.length}개`
    } else {
      return `${selectedClassrooms.length} ${t('reports.classrooms').toLowerCase()}`
    }
  }

  return (
    <div className="space-y-4">
      {/* Subjects and Categories on same row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Subjects */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            {t('reports.subjects')}
          </Label>
          <Select 
            value={selectedSubject || ""}
            onValueChange={handleSubjectChange}
            disabled={loading}
          >
            <SelectTrigger className="h-10 bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
              <SelectValue placeholder={t('reports.selectSubjects')} />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem 
                  key={subject.id} 
                  value={subject.id}
                >
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Categories */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            {t('reports.categories')}
          </Label>
          <Select 
            value="multiple-selection"
            onValueChange={handleCategoryChange}
            disabled={loading || !selectedSubject}
          >
            <SelectTrigger className="h-10 bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
              <SelectValue>
                {getSelectedCategoriesText()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {filteredCategories.map((category) => (
                <SelectItem 
                  key={category.id} 
                  value={category.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center justify-between w-full">
                    {category.name}
                    {selectedCategories.includes(category.id) && (
                      <Check className="w-4 h-4 text-green-600 ml-auto" />
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Classrooms */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          {t('reports.classrooms')}
        </Label>
        <Select 
          value="multiple-selection"
          onValueChange={handleClassroomChange}
          disabled={loading}
        >
          <SelectTrigger className="h-10 bg-white border border-border focus:border-primary focus-visible:border-primary focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-primary">
            <SelectValue>
              {getSelectedClassroomsText()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {filteredClassrooms.map((classroom) => (
              <SelectItem 
                key={classroom.id} 
                value={classroom.id}
                className="flex items-center justify-between"
              >
                <div className="flex items-center justify-between w-full">
                  <div>
                    <div>{classroom.name}</div>
                    <div className="text-xs text-gray-500">
                      {[
                        classroom.teacher?.name && `${t('reports.teacher')}: ${classroom.teacher.name}`,
                        classroom.subject,
                        classroom.grade
                      ].filter(Boolean).join(' • ')}
                    </div>
                  </div>
                  {selectedClassrooms.includes(classroom.id) && (
                    <Check className="w-4 h-4 text-green-600 ml-auto" />
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
})

SubjectAndClassroomSelector.displayName = 'SubjectAndClassroomSelector'