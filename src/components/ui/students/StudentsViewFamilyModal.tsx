"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { X, Users } from 'lucide-react'
import { Student } from '@/hooks/useStudentData'

interface FamilyData {
  id: string
  name?: string
  members?: Array<{
    user_id: string
    phone?: string
    users: {
      name: string
      email: string
      role: string
    }
  }>
}

interface StudentsViewFamilyModalProps {
  isOpen: boolean
  student: Student | null
  familyData: FamilyData | null
  t: (key: string) => string
  onClose: () => void
}

export function StudentsViewFamilyModal({
  isOpen,
  student,
  familyData,
  t,
  onClose
}: StudentsViewFamilyModalProps) {
  if (!student || !familyData) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-900">
            {t("students.familyMembers")} - {familyData.name || `${t("students.family")} ${familyData.id.slice(0, 8)}`}
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

        <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {/* Family members display - updated to match families page design */}
        {familyData.members && familyData.members.length > 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              {familyData.members.length}{t("students.membersInFamily")}
            </p>
            <div className="grid gap-4">
              {familyData.members.map((member) => (
                <div key={member.user_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg mb-2">{member.users.name}</h3>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">{t("common.email")}:</span>
                              <span> {member.users.email}</span>
                            </div>
                            {member.phone && (
                              <div>
                                <span className="font-medium">{t("common.phone")}:</span>
                                <span> {member.phone}</span>
                              </div>
                            )}
                            <div>
                              <span className="font-medium">{t("common.role")}:</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ml-1 ${
                                member.users.role === 'parent'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-green-100 text-green-800'
                              }`}>
                                {t(`common.roles.${member.users.role}`)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t("students.noFamilyMembers")}</h3>
            <p className="text-gray-600">{t("students.familyNoMembersYet")}</p>
          </div>
        )}
        </div>
      </div>
    </Modal>
  )
}
