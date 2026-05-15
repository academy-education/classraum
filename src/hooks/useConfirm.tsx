'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react'
import { ModalShell } from '@/components/ui/common/ModalShell'

/**
 * useConfirm — Promise-based confirm dialog for the manager app.
 *
 * Replaces `window.confirm(...)`. Renders the canonical
 * `<ModalShell.Confirm>` so the dialog visually matches every other
 * confirm in the app (centered icon, title, message; split footer).
 *
 *   const confirm = useConfirm()
 *   const ok = await confirm({
 *     title: 'Discard unsaved changes?',
 *     description: 'Your edits will be lost.',
 *     variant: 'warning',
 *     confirmText: 'Discard',
 *   })
 *   if (!ok) return
 *
 * Resolves true on confirm, false on cancel / Escape / backdrop click.
 *
 * The Provider must be mounted near the root of the layout (see
 * `<ConfirmProvider>` in src/app/(app)/layout.tsx).
 */

// Mirrors ModalShell.Confirm's variant set so callers don't have to
// import a parallel type from elsewhere.
export type ConfirmVariant = 'danger' | 'warning' | 'info'

export interface ConfirmOptions {
  title: React.ReactNode
  description?: React.ReactNode
  /** Visual treatment. Default: 'warning'. */
  variant?: ConfirmVariant
  /** Defaults: 'Confirm'. */
  confirmText?: string
  /** Defaults: 'Cancel'. */
  cancelText?: string
}

type Resolver = (value: boolean) => void

interface ConfirmState extends ConfirmOptions {
  open: boolean
}

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>({ open: false, title: '' })
  const resolverRef = useRef<Resolver | null>(null)

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setState({ ...opts, open: true })
    })
  }, [])

  const close = useCallback((value: boolean) => {
    resolverRef.current?.(value)
    resolverRef.current = null
    setState((s) => ({ ...s, open: false }))
  }, [])

  // ModalShell.Confirm wants strings for title/message; coerce React nodes.
  const titleStr = typeof state.title === 'string' ? state.title : String(state.title ?? '')

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ModalShell.Confirm
        isOpen={state.open}
        onClose={() => close(false)}
        onConfirm={() => close(true)}
        title={titleStr}
        message={state.description ?? ''}
        variant={state.variant ?? 'warning'}
        confirmLabel={state.confirmText ?? 'Confirm'}
        cancelLabel={state.cancelText ?? 'Cancel'}
      />
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm() must be used within <ConfirmProvider>.')
  }
  return ctx
}
