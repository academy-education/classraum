'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react'
import { AlertTriangle, Trash2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ModalShell } from './ModalShell'

/**
 * useConfirm — Promise-based confirm dialog for the admin section.
 *
 * Replaces `window.confirm(...)`, which can't be styled, breaks focus on
 * close, and looks like 1998. The dialog itself is a single ModalShell
 * mounted by `<ConfirmProvider>` in AdminLayout, so callers don't have to
 * wire any modal state.
 *
 *   const confirm = useConfirm()
 *   const ok = await confirm({
 *     title: 'Suspend 3 users?',
 *     description: 'They will lose access immediately.',
 *     variant: 'danger',
 *     confirmText: 'Suspend',
 *   })
 *   if (!ok) return
 *
 * The promise resolves true on confirm, false on cancel / Escape / backdrop
 * click — same semantics as `window.confirm` so existing call sites just
 * become awaited.
 */

export type ConfirmVariant = 'danger' | 'warning' | 'info'

export interface ConfirmOptions {
  title: React.ReactNode
  description?: React.ReactNode
  /** Visual treatment + default icon. Default: 'warning'. */
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

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state.open && (
        <ConfirmDialog
          options={state}
          onCancel={() => close(false)}
          onConfirm={() => close(true)}
        />
      )}
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

// Visual treatment per variant. Danger uses rose, warning uses amber, info
// uses brand blue. All three render the same shape — only the icon + the
// confirm-button variant change.
const VARIANT_STYLES: Record<ConfirmVariant, {
  icon: typeof AlertTriangle
  iconBg: string
  iconColor: string
  confirmVariant: 'destructive' | 'default'
}> = {
  danger:  { icon: Trash2,         iconBg: 'bg-rose-50',  iconColor: 'text-rose-600',  confirmVariant: 'destructive' },
  warning: { icon: AlertTriangle,  iconBg: 'bg-amber-50', iconColor: 'text-amber-600', confirmVariant: 'destructive' },
  info:    { icon: Info,           iconBg: 'bg-blue-50',  iconColor: 'text-[#2885e8]', confirmVariant: 'default' },
}

function ConfirmDialog({
  options,
  onCancel,
  onConfirm,
}: {
  options: ConfirmOptions
  onCancel: () => void
  onConfirm: () => void
}) {
  const variant = options.variant ?? 'warning'
  const style = VARIANT_STYLES[variant]
  const Icon = style.icon

  return (
    <ModalShell
      onClose={onCancel}
      size="sm"
      hideClose
      footer={
        <>
          <Button onClick={onCancel} variant="outline">
            {options.cancelText ?? 'Cancel'}
          </Button>
          <Button onClick={onConfirm} variant={style.confirmVariant}>
            {options.confirmText ?? 'Confirm'}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-full ${style.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${style.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900">{options.title}</h3>
          {options.description !== undefined && (
            <p className="text-sm text-gray-600 mt-1">{options.description}</p>
          )}
        </div>
      </div>
    </ModalShell>
  )
}
