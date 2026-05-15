'use client'

import React from 'react'
import Link from 'next/link'
import { MessageSquare, Megaphone, Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminPageHeader } from '../AdminPageHeader'

/**
 * Communications dashboard — placeholder.
 *
 * The original implementation was a fully-mocked 4-tab UI (announcements,
 * templates, campaigns, analytics) with hardcoded data and a `setTimeout`
 * standing in for an API call. Nothing was wired up to a real backend, and
 * the sidebar nav for this page is currently commented out, so it isn't
 * reachable from the app anyway.
 *
 * Until we have a real announcements / campaigns API, this page renders an
 * honest "coming soon" state instead of pretending to work. Replace with
 * the real dashboard when the backend lands.
 */
export function CommunicationsDashboard() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        kicker="Outreach"
        title="Communications"
        description="Platform-wide announcements, notification templates and campaign analytics."
      />

      <div className="bg-white rounded-xl ring-1 ring-gray-200/70 p-12 text-center">
        <div className="relative inline-block mb-5">
          <div className="absolute inset-0 rounded-full bg-[#2885e8]/15 blur-2xl" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2885e8]/15 to-[#5ba3ff]/8 ring-1 ring-[#2885e8]/20 flex items-center justify-center text-[#2885e8]">
            <Megaphone className="w-7 h-7" />
          </div>
        </div>

        <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
          Communications is coming soon
        </h2>
        <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
          We&apos;re building a way to send platform-wide announcements, manage notification
          templates and run customer campaigns. It isn&apos;t live yet.
        </p>

        {/* Feature preview cards — communicate what's planned without faking it */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 max-w-2xl mx-auto text-left">
          {[
            { icon: Megaphone, title: 'Announcements', body: 'Broadcast banners and in-app messages to selected academies.' },
            { icon: Mail, title: 'Templates', body: 'Reusable email and SMS templates for transactional sends.' },
            { icon: MessageSquare, title: 'Campaigns', body: 'Targeted outreach with delivery and engagement metrics.' },
          ].map(item => (
            <div key={item.title} className="rounded-lg ring-1 ring-gray-200/70 bg-gray-50/40 p-4">
              <div className="w-8 h-8 rounded-lg bg-white ring-1 ring-gray-200/70 flex items-center justify-center text-gray-500 mb-2.5">
                <item.icon className="w-4 h-4" />
              </div>
              <p className="text-sm font-semibold text-gray-900">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
