'use client'

import { Toaster } from 'sonner'
import { useTheme } from '@/providers/theme-provider'

export function ThemedToaster() {
  const { theme } = useTheme()

  return <Toaster position="bottom-right" richColors theme={theme} />
}
