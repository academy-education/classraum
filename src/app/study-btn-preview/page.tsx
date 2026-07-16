"use client"

// TEMPORARY review surface for the StudyButton system — delete before merge.
import { StudyButton } from '../mobile/study/_shared/StudyButton'
import { ArrowRight, Lock, Sparkles } from '../mobile/study/_shared/icons'

export default function Preview() {
  return (
    <div className="min-h-screen bg-[#F7F6F3] px-6 py-10 text-gray-900">
      <div className="max-w-md mx-auto space-y-8">
        <h1 className="text-lg font-bold">One study button — variants · sizes · states</h1>

        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">Variants (md)</h2>
          <div className="flex flex-wrap gap-3">
            <StudyButton>Primary</StudyButton>
            <StudyButton variant="secondary">Secondary</StudyButton>
            <StudyButton variant="ghost">Ghost</StudyButton>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">Sizes</h2>
          <div className="flex flex-wrap items-center gap-3">
            <StudyButton size="sm">Small</StudyButton>
            <StudyButton size="md">Medium</StudyButton>
            <StudyButton size="lg">Large</StudyButton>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">Icons · full width · states</h2>
          <StudyButton fullWidth leftIcon={<Sparkles className="w-4 h-4" />}>Start diagnostic</StudyButton>
          <StudyButton fullWidth variant="secondary" rightIcon={<ArrowRight className="w-4 h-4" />}>Continue</StudyButton>
          <StudyButton fullWidth loading>Saving…</StudyButton>
          <StudyButton fullWidth disabled leftIcon={<Lock className="w-4 h-4" />}>Disabled</StudyButton>
          <StudyButton fullWidth square>Square corners (in-field)</StudyButton>
        </section>

        <section className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">Inverse (on gradient hero card)</h2>
          <div className="rounded-2xl bg-gradient-to-br from-[#2885E8] to-indigo-600 p-5">
            <StudyButton fullWidth variant="inverse" leftIcon={<ArrowRight className="w-4 h-4" />}>Start diagnostic</StudyButton>
          </div>
        </section>
      </div>
    </div>
  )
}
