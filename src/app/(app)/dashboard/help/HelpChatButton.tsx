"use client"

import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/hooks/useTranslation'
import { MessageSquare } from 'lucide-react'

/**
 * "Still need help? Open chat" button for the bottom of every help page.
 *
 * Triggers the chat widget owned by AppLayout via a `?chat=open` URL
 * search param. AppLayout watches for it and toggles the widget; the
 * param is cleared after open so refreshing the page doesn't keep
 * popping the chat back up.
 */
export function HelpChatButton() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()

  const openChat = () => {
    const sp = new URLSearchParams(searchParams.toString())
    sp.set('chat', 'open')
    router.push(`?${sp.toString()}`)
  }

  return (
    <div className="border-t border-gray-200 mt-12 pt-8">
      <p className="text-sm text-gray-600 mb-3">
        {t('help.couldnt')}
      </p>
      <Button onClick={openChat} className="gap-2">
        <MessageSquare className="w-4 h-4" />
        {t('help.openChat')}
      </Button>
    </div>
  )
}
