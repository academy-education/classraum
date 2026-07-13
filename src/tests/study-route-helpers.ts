/**
 * Shared mock helpers for study API route tests
 * (src/app/api/study/__tests__/*).
 *
 * chain()       — a chainable, thenable Supabase query-builder mock:
 *                 every builder method returns the same object, and
 *                 awaiting it resolves to { data, error } (or rejects
 *                 when opts.reject is set, simulating a thrown
 *                 network/client error).
 * tableRouter() — wires a per-table FIFO queue into a mocked
 *                 supabaseAdmin.from so each successive from('x') call
 *                 gets the next enqueued chain for that table.
 * makeRequest() — builds a NextRequest with a JSON (or raw string)
 *                 body for exercising route handlers directly.
 *
 * NOTE: this file lives outside __tests__/ on purpose — the jest
 * testMatch glob picks up every file under __tests__/.
 */

import { NextRequest } from 'next/server'

export interface QueryResult {
  data?: unknown
  error?: unknown
}

const CHAIN_METHODS = [
  'select', 'insert', 'update', 'upsert', 'delete',
  'eq', 'neq', 'like', 'ilike', 'in', 'is', 'gt', 'gte', 'lt', 'lte',
  'not', 'contains', 'or', 'order', 'limit', 'range',
  'maybeSingle', 'single',
] as const

export type ChainMock = { [K in (typeof CHAIN_METHODS)[number]]: jest.Mock } &
  PromiseLike<{ data: unknown; error: unknown }>

/** Chainable + thenable query-builder mock resolving to {data, error}. */
export function chain(result: QueryResult = {}, opts: { reject?: unknown } = {}): ChainMock {
  const resolved = { data: null, error: null, ...result }
  const target: Record<string, unknown> = {}
  for (const m of CHAIN_METHODS) target[m] = jest.fn(() => target)
  target.then = (
    onFulfilled?: (v: { data: unknown; error: unknown }) => unknown,
    onRejected?: (e: unknown) => unknown,
  ) => {
    const p = 'reject' in opts
      ? Promise.reject(opts.reject)
      : Promise.resolve(resolved)
    return p.then(onFulfilled, onRejected)
  }
  return target as unknown as ChainMock
}

/**
 * Route from(table) calls to per-table queues of chains. Returns an
 * enqueue function: enqueue('study_sessions', { data: {...} }).
 * Un-enqueued tables get a default chain resolving to { data: null }.
 */
export function tableRouter(fromMock: jest.Mock) {
  const queues = new Map<string, ChainMock[]>()
  fromMock.mockImplementation((table: string) => {
    const q = queues.get(table)
    if (q && q.length > 0) return q.shift()
    return chain()
  })
  return function enqueue(
    table: string,
    result: QueryResult = {},
    opts: { reject?: unknown } = {},
  ): ChainMock {
    const c = chain(result, opts)
    const q = queues.get(table) ?? []
    q.push(c)
    queues.set(table, q)
    return c
  }
}

/** Build a NextRequest with a JSON body (objects) or raw string body. */
export function makeRequest(
  body: unknown,
  init: { headers?: Record<string, string>; method?: string; url?: string } = {},
): NextRequest {
  const {
    headers = {},
    method = 'POST',
    url = 'http://localhost:3000/api/study/test-route',
  } = init
  return new NextRequest(url, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: 'Bearer test-token',
      ...headers,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}
