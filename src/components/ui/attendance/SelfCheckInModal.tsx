"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, UserCheck, Loader2, CheckCircle, AlertCircle, ArrowLeft, Delete, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import {
  findStudentsByPhoneSuffix,
  findTodaySessionsForStudent,
  performCheckIn,
  MatchedStudent,
  SessionForCheckIn,
  CheckInResult
} from '@/lib/self-check-in'

type Step = 'phone' | 'select-student' | 'processing' | 'result'

interface SelfCheckInModalProps {
  isOpen: boolean
  onClose: () => void
  academyId: string
  onCheckInComplete: () => void
}

export function SelfCheckInModal({
  isOpen,
  onClose,
  academyId,
  onCheckInComplete
}: SelfCheckInModalProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('phone')
  const [phoneDigits, setPhoneDigits] = useState('')
  const [matchedStudents, setMatchedStudents] = useState<MatchedStudent[]>([])
  const [selectedStudent, setSelectedStudent] = useState<MatchedStudent | null>(null)
  const [sessions, setSessions] = useState<SessionForCheckIn[]>([])
  const [results, setResults] = useState<CheckInResult[]>([])
  const [error, setError] = useState<string | null>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('phone')
      setPhoneDigits('')
      setMatchedStudents([])
      setSelectedStudent(null)
      setSessions([])
      setResults([])
      setError(null)
    }
  }, [isOpen])

  const handlePhoneSubmit = useCallback(async () => {
    if (phoneDigits.length !== 4) {
      setError(String(t('attendance.selfCheckIn.enterPhone')))
      return
    }

    setError(null)
    setStep('processing')

    const { data: students, error: searchError } = await findStudentsByPhoneSuffix(
      academyId,
      phoneDigits
    )

    if (searchError) {
      setError(searchError)
      setStep('phone')
      return
    }

    if (!students || students.length === 0) {
      setError(String(t('attendance.selfCheckIn.noMatch')))
      setStep('phone')
      return
    }

    if (students.length === 1) {
      // Single match - proceed directly
      await handleStudentSelected(students[0])
    } else {
      // Multiple matches - show selection
      setMatchedStudents(students)
      setStep('select-student')
    }
  }, [phoneDigits, academyId, t])

  const handleStudentSelected = useCallback(async (student: MatchedStudent) => {
    setSelectedStudent(student)
    setStep('processing')

    // Find today's sessions for this student
    const { data: todaySessions, error: sessionError } = await findTodaySessionsForStudent(
      student.id,
      academyId
    )

    if (sessionError) {
      setError(sessionError)
      setStep('result')
      return
    }

    if (!todaySessions || todaySessions.length === 0) {
      setError(String(t('attendance.selfCheckIn.noSession')))
      setStep('result')
      return
    }

    setSessions(todaySessions)

    // Perform check-in for all sessions
    const { results: checkInResults, error: checkInError } = await performCheckIn(
      student.id,
      student.name,
      todaySessions,
      String(t('attendance.selfCheckIn.note'))
    )

    if (checkInError) {
      setError(checkInError)
    }

    setResults(checkInResults)
    setStep('result')

    // Notify parent to refresh attendance data
    if (checkInResults.some(r => !r.error && !r.alreadyCheckedIn)) {
      onCheckInComplete()
    }
  }, [academyId, t, onCheckInComplete])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleTryAgain = useCallback(() => {
    setStep('phone')
    setPhoneDigits('')
    setError(null)
    setMatchedStudents([])
    setSelectedStudent(null)
    setSessions([])
    setResults([])
  }, [])

  const handleBack = useCallback(() => {
    setStep('phone')
    setMatchedStudents([])
  }, [])

  const handleNumberPress = useCallback((num: string) => {
    if (phoneDigits.length < 4) {
      setPhoneDigits(prev => prev + num)
      setError(null)
    }
  }, [phoneDigits.length])

  const handleBackspace = useCallback(() => {
    setPhoneDigits(prev => prev.slice(0, -1))
    setError(null)
  }, [])

  const handleClear = useCallback(() => {
    setPhoneDigits('')
    setError(null)
  }, [])

  // Keyboard input handling
  useEffect(() => {
    if (!isOpen || step !== 'phone') return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle number keys (both regular and numpad)
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        if (phoneDigits.length < 4) {
          setPhoneDigits(prev => prev + e.key)
          setError(null)
        }
      }
      // Handle backspace
      else if (e.key === 'Backspace') {
        e.preventDefault()
        setPhoneDigits(prev => prev.slice(0, -1))
        setError(null)
      }
      // Handle Enter to submit
      else if (e.key === 'Enter' && phoneDigits.length === 4) {
        e.preventDefault()
        handlePhoneSubmit()
      }
      // Handle Escape to close
      else if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, step, phoneDigits, handlePhoneSubmit, handleClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white z-[60] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <UserCheck className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
          <h2 className="text-xl sm:text-2xl font-semibold">{t('attendance.selfCheckIn.title')}</h2>
        </div>
        <button
          onClick={handleClose}
          className="p-2 sm:p-3 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-6 h-6 sm:w-7 sm:h-7 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto">
          {/* Phone Input Step */}
          {step === 'phone' && (
            <div className="space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-[340px] sm:max-w-md md:max-w-lg lg:max-w-xl">
              <p className="text-gray-600 text-center text-lg sm:text-xl md:text-2xl">
                {t('attendance.selfCheckIn.enterPhone')}
              </p>

              {/* Digit Display */}
              <div className="flex justify-center gap-4 sm:gap-5 md:gap-6">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={cn(
                      "w-16 h-20 sm:w-20 sm:h-24 md:w-24 md:h-28 lg:w-28 lg:h-32 rounded-xl border-2 flex items-center justify-center text-4xl sm:text-5xl md:text-6xl font-mono font-bold transition-all",
                      phoneDigits[index]
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-200 bg-gray-50 text-gray-300"
                    )}
                  >
                    {phoneDigits[index] || '•'}
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 justify-center text-base sm:text-lg">
                  <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>{error}</span>
                </div>
              )}

              {/* Number Pad */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-5 w-full">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleNumberPress(num)}
                    className="h-16 sm:h-20 md:h-24 lg:h-28 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-800 transition-colors"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={handleClear}
                  className="h-16 sm:h-20 md:h-24 lg:h-28 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-base sm:text-lg md:text-xl font-medium text-gray-500 transition-colors"
                >
                  {t('common.clear')}
                </button>
                <button
                  onClick={() => handleNumberPress('0')}
                  className="h-16 sm:h-20 md:h-24 lg:h-28 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-800 transition-colors"
                >
                  0
                </button>
                <button
                  onClick={handleBackspace}
                  className="h-16 sm:h-20 md:h-24 lg:h-28 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 flex items-center justify-center transition-colors"
                >
                  <Delete className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-gray-600" />
                </button>
              </div>

              <Button
                onClick={handlePhoneSubmit}
                disabled={phoneDigits.length !== 4}
                className="w-full h-14 sm:h-16 md:h-18 lg:h-20 text-lg sm:text-xl md:text-2xl"
              >
                {t('attendance.selfCheckIn.checkIn')}
              </Button>
            </div>
          )}

          {/* Student Selection Step */}
          {step === 'select-student' && (
            <div className="space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-[340px] sm:max-w-md md:max-w-lg lg:max-w-xl">
              <p className="text-gray-600 text-center text-lg sm:text-xl md:text-2xl">
                {t('attendance.selfCheckIn.selectStudent')}
              </p>

              {/* Display the entered digits */}
              <div className="flex justify-center gap-4 sm:gap-5 md:gap-6">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="w-16 h-20 sm:w-20 sm:h-24 md:w-24 md:h-28 lg:w-28 lg:h-32 rounded-xl border-2 border-primary bg-primary/5 flex items-center justify-center text-4xl sm:text-5xl md:text-6xl font-mono font-bold text-primary"
                  >
                    {phoneDigits[index] || '•'}
                  </div>
                ))}
              </div>

              <p className="text-gray-500 text-center text-base sm:text-lg">
                {t('attendance.selfCheckIn.multipleMatches')}
              </p>

              {/* Student list styled like number pad buttons */}
              <div className="space-y-3 sm:space-y-4 md:space-y-5 max-h-[45vh] overflow-y-auto">
                {matchedStudents.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => handleStudentSelected(student)}
                    className="w-full h-20 sm:h-24 md:h-28 lg:h-32 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-primary/10 active:ring-2 active:ring-primary flex items-center justify-between px-5 sm:px-6 md:px-8 transition-colors"
                  >
                    <div className="text-left">
                      <p className="font-semibold text-gray-800 text-xl sm:text-2xl md:text-3xl">{student.name}</p>
                      <p className="text-gray-500 text-base sm:text-lg md:text-xl">
                        {student.phone.slice(0, -4)}****
                      </p>
                    </div>
                    <ChevronRight className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-gray-400" />
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={handleBack}
                className="w-full h-14 sm:h-16 md:h-18 lg:h-20 text-lg sm:text-xl md:text-2xl"
              >
                <ArrowLeft className="w-6 h-6 mr-2" />
                {t('common.back')}
              </Button>
            </div>
          )}

          {/* Processing Step */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center space-y-8 sm:space-y-10">
              <Loader2 className="w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 text-primary animate-spin" />
              <p className="text-gray-600 text-xl sm:text-2xl md:text-3xl">{t('attendance.selfCheckIn.processing')}</p>
            </div>
          )}

          {/* Result Step */}
          {step === 'result' && (
            <div className="space-y-6 sm:space-y-8 md:space-y-10 w-full max-w-[340px] sm:max-w-md md:max-w-lg lg:max-w-xl">
              {error && results.length === 0 ? (
                // Error state
                <div className="flex flex-col items-center space-y-6 sm:space-y-8">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-red-600" />
                  </div>
                  <p className="text-red-600 text-center text-xl sm:text-2xl md:text-3xl">{error}</p>
                </div>
              ) : (
                // Success state
                <div className="space-y-6 sm:space-y-8">
                  <div className="flex flex-col items-center space-y-4 sm:space-y-5">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 text-green-600" />
                    </div>
                    <p className="text-3xl sm:text-4xl md:text-5xl font-semibold text-gray-900">
                      {t('attendance.selfCheckIn.success')}
                    </p>
                    {selectedStudent && (
                      <p className="text-gray-600 text-xl sm:text-2xl md:text-3xl">{selectedStudent.name}</p>
                    )}
                  </div>

                  {/* Results list */}
                  <div className="space-y-4 sm:space-y-5 max-h-[45vh] overflow-y-auto">
                    {results.map((result) => (
                      <div
                        key={result.sessionId}
                        className={cn(
                          "p-5 sm:p-6 md:p-8 rounded-xl border-2",
                          result.error
                            ? "border-red-200 bg-red-50"
                            : result.alreadyCheckedIn
                            ? "border-gray-200 bg-gray-50"
                            : "border-green-200 bg-green-50"
                        )}
                      >
                        <p className="font-semibold text-gray-900 text-xl sm:text-2xl md:text-3xl">
                          {result.classroomName}
                        </p>
                        <p className={cn(
                          "text-lg sm:text-xl md:text-2xl mt-1",
                          result.error
                            ? "text-red-600"
                            : result.alreadyCheckedIn
                            ? "text-gray-500"
                            : result.status === 'late'
                            ? "text-orange-600"
                            : "text-green-600"
                        )}>
                          {result.error
                            ? result.error
                            : result.alreadyCheckedIn
                            ? t('attendance.selfCheckIn.alreadyCheckedIn')
                            : result.status === 'late'
                            ? t('attendance.selfCheckIn.markedLate')
                            : t('attendance.selfCheckIn.markedPresent')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4 sm:gap-5">
                {error && results.length === 0 && (
                  <Button
                    variant="outline"
                    onClick={handleTryAgain}
                    className="flex-1 h-14 sm:h-16 md:h-18 lg:h-20 text-lg sm:text-xl md:text-2xl"
                  >
                    {t('attendance.selfCheckIn.tryAgain')}
                  </Button>
                )}
                <Button
                  onClick={handleClose}
                  className={cn(
                    "h-14 sm:h-16 md:h-18 lg:h-20 text-lg sm:text-xl md:text-2xl",
                    error && results.length === 0 ? "flex-1" : "w-full"
                  )}
                >
                  {t('attendance.selfCheckIn.done')}
                </Button>
              </div>
            </div>
          )}
      </div>
    </div>
  )
}
