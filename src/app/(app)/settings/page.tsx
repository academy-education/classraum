"use client"

import React from 'react'
import { SettingsPage } from '@/components/ui/settings-page'
import { usePageWithAuth } from '@/hooks/auth/usePageWithAuth'
import { withErrorBoundary } from '@/components/hoc/withErrorBoundary'

const SettingPageComponent = React.memo(() => {
  const { userId } = usePageWithAuth('userId')
  
  return <SettingsPage userId={userId} />
})

SettingPageComponent.displayName = 'SettingPage'

export default withErrorBoundary(SettingPageComponent)
