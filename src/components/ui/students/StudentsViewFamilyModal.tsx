"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { ModalShell } from '@/components/ui/common/ModalShell'
import { EmptyState } from '@/components/ui/common/EmptyState'
import { Users } from 'lucide-react'
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
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      title={`${t("students.familyMembers")} - ${familyData.name || `${t("students.family")} ${familyData.id.slice(0, 8)}`}`}
      footer={
        <ModalShell.Footer>
          <Button variant="outline" onClick={onClose}>
            {t("common.close")}
          </Button>
        </ModalShell.Footer>
      }
    >
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
                                  : 'bg-emerald-50 text-emerald-700'
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
          <EmptyState
            icon={Users}
            title={t("students.noFamilyMembers")}
            description={t("students.familyNoMembersYet")}
          />
        )}
    </ModalShell>
  )
}
