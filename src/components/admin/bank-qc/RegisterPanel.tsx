"use client"

import React from 'react'
import { WORK, SETTLED, FOUND_WHILE_FIXING, registerSummary, type WorkItem } from '@/lib/study/bank-register'
import { useQcT } from './i18n'

/**
 * The register, on the page that people actually look at.
 *
 * The cohort table above this is MEASURED — read from the database on
 * every load. This panel is DECLARED: what we have decided to do, who
 * is blocked, and what is already closed. Keeping the two visually
 * distinct matters, because the failure this dashboard exists to
 * prevent is a stated intention being read as an established fact.
 *
 * Source is src/lib/study/bank-register.ts, which also generates
 * scripts/study-bank/REGISTER.md. There is deliberately no second copy
 * of this list to fall out of date.
 */

const CARD = 'bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_-4px_rgba(0,0,0,0.06)]'

const OWNER: Record<WorkItem['owner'], { label: string; chip: string }> = {
  claude: { label: 'Claude', chip: 'bg-sky-50 text-sky-700 ring-sky-200' },
  you:    { label: 'Needs you', chip: 'bg-amber-50 text-amber-800 ring-amber-200' },  // label overridden by t('admin.bankQc.register.needsYou') at render
}

export function RegisterPanel() {
  const { t } = useQcT()
  const [tab, setTab] = React.useState<'open' | 'settled' | 'found'>('open')
  const s = registerSummary()
  const open = WORK.filter(w => w.state !== 'done')

  return (
    <section className={`${CARD} p-5 mb-8`}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[15px] font-semibold text-gray-900">{t('admin.bankQc.register.title')}</h2>
          <p className="text-[12px] text-gray-500 mt-0.5">
            The table above is measured from the database. This is the plan —
            decided, not observed.
          </p>
        </div>
        <span className="text-[13px] tabular-nums text-gray-500">
          <strong className="text-[19px] text-gray-900 mr-1">{s.open}</strong> open
          {' · '}{s.mine} mine{' · '}{s.yours} need you
        </span>
      </div>

      <div className="mt-4 flex gap-1.5">
        {([['open', `Open (${s.open})`], ['settled', `Settled (${SETTLED.length})`],
           ['found', `Found while fixing (${FOUND_WHILE_FIXING.length})`]] as const).map(([k, label]) => (
          <button
            key={k} type="button" onClick={() => setTab(k)}
            className={`rounded-full px-3 py-1 text-[12px] font-medium ring-1 transition-colors ${
              tab === k ? 'bg-gray-900 text-white ring-gray-900'
                        : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'open' && (
        <div className="mt-4 grid gap-2">
          {open.map(w => (
            <div key={w.id} className="rounded-xl ring-1 ring-gray-100 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-gray-400 tabular-nums">{w.id}</span>
                <span className="text-[13px] font-medium text-gray-900">{w.title}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${OWNER[w.owner].chip}`}>
                  {OWNER[w.owner].label}
                </span>
                <span className="text-[12px] text-gray-500 tabular-nums">{w.size}</span>
                {/* A blocker has to read as a STATE, not as a sentence in
                    the last paragraph — "blocked on B1" sat in A3's note
                    for the life of this file and still got missed. */}
                {w.dependsOn?.length ? (
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 bg-amber-50 text-amber-800 ring-amber-200">
                    blocked by {w.dependsOn.join(', ')}
                  </span>
                ) : null}
              </div>
              <p className="text-[12px] text-gray-600 mt-1 leading-relaxed">{w.why}</p>
              {w.account && (
                <p className="text-[12px] mt-1.5">
                  <span className="rounded-md bg-gray-900 text-white px-2 py-0.5 font-mono text-[11px]">
                    {w.account}
                  </span>
                </p>
              )}
              {w.whoSpecifically && (
                <p className="text-[12px] text-gray-700 mt-1.5 leading-relaxed rounded-lg bg-gray-50 px-2.5 py-1.5">
                  <span className="font-semibold">Who: </span>{w.whoSpecifically}
                </p>
              )}
              {w.note && (
                <p className="text-[12px] text-gray-500 mt-1 leading-relaxed italic">{w.note}</p>
              )}
              {w.doc && <p className="text-[11px] text-gray-400 mt-1 font-mono">{w.doc}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 'settled' && (
        <div className="mt-4 grid gap-2">
          <p className="text-[12px] text-gray-500">
            Closed questions. Listed so they are not re-opened — several cost a
            full measurement cycle to answer, and two are negatives that look
            like obvious ideas from the outside.
          </p>
          {SETTLED.map(x => (
            <div key={x.title} className="rounded-xl ring-1 ring-gray-100 px-4 py-3">
              <p className="text-[13px] font-medium text-gray-900">{x.title}</p>
              <p className="text-[12px] text-gray-600 mt-1 leading-relaxed">{x.finding}</p>
              {x.doc && <p className="text-[11px] text-gray-400 mt-1 font-mono">{x.doc}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 'found' && (
        <div className="mt-4 grid gap-2">
          <p className="text-[12px] text-gray-500">
            Discovered while fixing something else, and recorded here rather
            than in a commit message. This is where &ldquo;three small data
            defects&rdquo; turned out to be one 36-item problem.
          </p>
          {FOUND_WHILE_FIXING.map((f, i) => (
            <div key={i} className="rounded-xl ring-1 ring-gray-100 px-4 py-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-[11px] text-gray-400 tabular-nums">{f.date}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${
                  f.landedAs === 'fixed'
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                    : 'bg-gray-50 text-gray-600 ring-gray-200'}`}>
                  {f.landedAs === 'fixed' ? 'fixed on the spot' : `→ ${f.landedAs}`}
                </span>
              </div>
              <p className="text-[12px] text-gray-600 mt-1 leading-relaxed">{f.what}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
