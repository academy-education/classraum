"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  Send,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react'

interface NotificationTesterProps {
  userId: string
  onNotificationCreated?: () => void
}

const sampleTypes = [
  { value: 'payment_success', label: '결제 완료', category: 'payment', icon: CheckCircle, color: 'bg-green-500' },
  { value: 'payment_failed', label: '결제 실패', category: 'payment', icon: AlertTriangle, color: 'bg-red-500' },
  { value: 'payment_reminder', label: '결제 알림', category: 'payment', icon: Info, color: 'bg-blue-500' },
  { value: 'session_reminder', label: '수업 알림', category: 'session', icon: Bell, color: 'bg-blue-500' },
  { value: 'session_cancelled', label: '수업 취소', category: 'session', icon: AlertTriangle, color: 'bg-red-500' },
  { value: 'attendance_absent', label: '결석 알림', category: 'attendance', icon: AlertTriangle, color: 'bg-orange-500' },
  { value: 'attendance_late', label: '지각 알림', category: 'attendance', icon: Info, color: 'bg-yellow-500' },
  { value: 'assignment_new', label: '새 과제', category: 'assignment', icon: Info, color: 'bg-purple-500' },
  { value: 'assignment_submitted', label: '과제 제출', category: 'assignment', icon: CheckCircle, color: 'bg-green-500' },
  { value: 'assignment_graded', label: '과제 채점', category: 'assignment', icon: CheckCircle, color: 'bg-green-500' },
  { value: 'student_enrolled', label: '수강생 등록', category: 'student', icon: CheckCircle, color: 'bg-green-500' },
  { value: 'system_welcome', label: '환영 메시지', category: 'system', icon: Info, color: 'bg-blue-500' },
  { value: 'system_maintenance', label: '시스템 점검', category: 'system', icon: AlertTriangle, color: 'bg-gray-500' },
  { value: 'all_samples', label: '모든 샘플', category: 'all', icon: Send, color: 'bg-indigo-500' }
]

const categories = [
  { value: 'all', label: '전체' },
  { value: 'payment', label: '결제' },
  { value: 'session', label: '수업' },
  { value: 'attendance', label: '출석' },
  { value: 'assignment', label: '과제' },
  { value: 'student', label: '수강생' },
  { value: 'system', label: '시스템' }
]

export function NotificationTester({ userId, onNotificationCreated }: NotificationTesterProps) {
  const [selectedType, setSelectedType] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const filteredTypes = selectedCategory === 'all' 
    ? sampleTypes 
    : sampleTypes.filter(type => type.category === selectedCategory || type.category === 'all')

  const createSampleNotification = async () => {
    if (!selectedType) return

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/notifications/create-sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          type: selectedType
        })
      })

      const result = await response.json()

      if (result.success) {
        setMessage({ type: 'success', text: '알림이 성공적으로 생성되었습니다!' })
        setSelectedType('')
        if (onNotificationCreated) {
          onNotificationCreated()
        }
      } else {
        setMessage({ type: 'error', text: result.error || '알림 생성에 실패했습니다.' })
      }
    } catch (error) {
      console.error('Error creating notification:', error)
      setMessage({ type: 'error', text: '네트워크 오류가 발생했습니다.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">알림 테스트</h3>
          <Badge variant="outline" className="text-xs">
            다국어 지원
          </Badge>
        </div>

        <p className="text-sm text-gray-600">
          다양한 알림 유형을 테스트하여 다국어 번역이 올바르게 작동하는지 확인하세요.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              카테고리
            </label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              알림 유형
            </label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="알림 유형 선택" />
              </SelectTrigger>
              <SelectContent>
                {filteredTypes.map((type) => {
                  // Preserve icon but mark as unused
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${type.color}`} />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedType && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              {(() => {
                const selectedTypeData = sampleTypes.find(t => t.value === selectedType)
                if (selectedTypeData) {
                  // Preserve icon but mark as unused
                  return (
                    <>
                      <div className={`w-3 h-3 rounded-full ${selectedTypeData.color}`} />
                      <span className="text-sm font-medium">{selectedTypeData.label}</span>
                      <Badge variant="secondary" className="text-xs">
                        {categories.find(c => c.value === selectedTypeData.category)?.label}
                      </Badge>
                    </>
                  )
                }
                return null
              })()}
            </div>
          </div>
        )}

        <Button 
          onClick={createSampleNotification}
          disabled={!selectedType || loading}
          className="w-full"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              생성 중...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              알림 생성하기
            </div>
          )}
        </Button>

        {message && (
          <div className={`p-3 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-rose-800 border border-red-200'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>💡 <strong>팁:</strong> 언어를 변경한 후 알림을 생성하여 다국어 번역을 확인하세요.</p>
          <p>🔄 <strong>실시간:</strong> 생성된 알림은 즉시 알림 메뉴에 표시됩니다.</p>
        </div>
      </div>
    </Card>
  )
}