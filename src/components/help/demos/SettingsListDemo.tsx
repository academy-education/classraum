"use client"

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Bell, Palette, Globe, Download, Building2 } from 'lucide-react'
import { NonFunctional } from './NonFunctional'

const SECTIONS = [
  { id: 'account', label: 'Account', icon: User, active: true },
  { id: 'branding', label: 'Branding', icon: Building2 },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'language', label: 'Language & region', icon: Globe },
  { id: 'data', label: 'Data', icon: Download },
]

export function SettingsListDemo() {
  return (
    <NonFunctional>
      <div className="my-6 p-4 bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary mb-1.5">Settings</p>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Settings</h1>
            <p className="text-gray-500 text-sm">Profile, branding, notifications, language, and subscription.</p>
          </div>
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="hidden lg:block lg:col-span-3">
            <Card className="p-3">
              <div className="space-y-1">
                {SECTIONS.map(s => {
                  const Icon = s.icon
                  return (
                    <button
                      key={s.id}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                        s.active ? 'bg-primary/10 text-primary font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4" strokeWidth={1.75} />
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-9">
            <Card className="p-4 sm:p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Account</h2>
                <p className="text-sm text-gray-500">Personal information that other staff see.</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input readOnly defaultValue="Andy Lee" className="h-10 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Email</Label>
                    <Input readOnly defaultValue="andy@classraum.com" className="h-10 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Phone</Label>
                    <Input readOnly defaultValue="+82 10-0000-0000" className="h-10 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Academy</Label>
                    <Input readOnly defaultValue="Classraum Academy" className="h-10 text-sm" />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Password</h3>
                  <p className="text-xs text-gray-500 mb-3">Last changed 2 months ago.</p>
                  <Button variant="outline" size="sm">Change password</Button>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-rose-700 mb-2">Delete account</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Account information is kept for 1 year for compliance — email support@classraum.com to delete sooner.
                  </p>
                  <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700">
                    Delete my account
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </NonFunctional>
  )
}
