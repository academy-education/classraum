/**
 * @jest-environment node
 *
 * Migration 120 revokes SELECT on users.email / users.phone from
 * `authenticated` and `anon`. After it, any query a browser or user-session
 * client makes that names those columns — `select('*')`, `select('…, email')`,
 * an embed `users(name, email)`, a bare `.select()` after insert, or a filter
 * `.eq('email', …)` — fails with "permission denied for table users".
 *
 * This scans src/ for exactly those shapes and fails on any that is not made
 * through the service role. Contacts must come from
 * `fetchUserContacts` (src/lib/users/contacts.ts) instead.
 */
import fs from 'fs'
import path from 'path'
import os from 'os'

const ROOT = path.join(process.cwd(), 'src')

/** Service-role client identifiers: unaffected by the column revoke. */
const ADMIN_IDENTS = new Set(['dbAdmin', 'supabaseAdmin', 'adminDb', 'admin'])

/**
 * Files allowed to name the columns, each with the reason.
 */
const ALLOW: Record<string, string> = {
  // the PGRST202 fallback, used only while the function is not deployed
  'src/lib/users/contacts.ts': 'pre-migration fallback',
  // server route using the ANON browser client with no session: it has read
  // zero users rows since users_read_all_authenticated was added, ignores the
  // error, and returns '' either way. Pre-existing; not a contact path.
  'src/app/api/payments/recurring/control/route.ts': 'anon client, no session, error ignored',
}

function walk(dir: string, out: string[] = []): string[] {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    const st = fs.statSync(p)
    if (st.isDirectory()) { if (f !== '__tests__' && f !== 'node_modules') walk(p, out) }
    else if (/\.(ts|tsx|js|jsx|mjs)$/.test(f) && !/\.test(-d)?\.tsx?$/.test(f)) out.push(p)
  }
  return out
}

/** Identifier the query chain hangs off, e.g. `db`, `dbAdmin`, `supabase`. */
function clientIdent(src: string, fromIdx: number): string {
  const before = src.slice(Math.max(0, fromIdx - 120), fromIdx)
  const m = before.match(/([A-Za-z_$][\w$]*)\s*(?:\(\s*\))?\s*\.?\s*$/)
  return m ? m[1] : '?'
}

/** Does this file build `ident` from the service-role key? */
function isServiceRoleClient(src: string, ident: string): boolean {
  const re = new RegExp(`(?:const|let)\\s+${ident}\\b[^=]*=\\s*(?:await\\s+)?create\\w*(?:<[^>]*>)?\\(([\\s\\S]{0,200}?)\\)`, 'g')
  let m: RegExpExecArray | null
  let sawService = false
  let sawOther = false
  // identifiers holding the service key, e.g. `const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!`
  const keyVars = Array.from(src.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY/g)).map(k => k[1])
  while ((m = re.exec(src))) {
    const args = m[1]
    if (/SERVICE_ROLE/.test(args) || keyVars.some(v => new RegExp(`\\b${v}\\b`).test(args))) sawService = true
    else sawOther = true
  }
  return sawService && !sawOther
}

/** Every client this file constructs is service-role, and it imports no browser client. */
function onlyServiceClients(src: string): boolean {
  if (/from ['"]@\/lib\/supabase['"]|from ['"]@\/lib\/supabase\/server['"]/.test(src)) return false
  const idents = Array.from(src.matchAll(/(?:const|let)\s+([A-Za-z_$][\w$]*)\b[^=\n]*=\s*(?:await\s+)?create\w*(?:<[^>]*>)?\(/g)).map(x => x[1])
  return idents.length > 0 && idents.every(id => isServiceRoleClient(src, id))
}

const PII = /\b(email|phone)\b/

export function findViolations(files: string[]): string[] {
  const out: string[] = []
  for (const file of files) {
    const rel = path.relative(process.cwd(), file).split(path.sep).join('/')
    if (ALLOW[rel]) continue
    const src = fs.readFileSync(file, 'utf8')
    const line = (i: number) => src.slice(0, i).split('\n').length

    // 1. from('users') chains
    const fromRe = /\.from\(\s*['"]users['"]\s*\)/g
    let m: RegExpExecArray | null
    while ((m = fromRe.exec(src))) {
      const ident = clientIdent(src, m.index)
      if (ADMIN_IDENTS.has(ident) || isServiceRoleClient(src, ident)) continue
      // the chain: up to the next statement boundary
      const rest = src.slice(m.index, m.index + 1200)
      const stop = rest.search(/\n\s*\n|;\s*\n|\bawait\b(?![^\n]*\.from\(\s*['"]users)/)
      const chain = stop > 0 ? rest.slice(0, stop) : rest
      const sel = chain.match(/\.select\(\s*(`[^`]*`|'[^']*'|"[^"]*"|[A-Z_][A-Z0-9_]*)?\s*[,)]/)
      const isWrite = /\.(insert|update|upsert|delete)\(/.test(chain)
      if (sel) {
        const arg = sel[1]
        if (arg === undefined) {
          if (isWrite) out.push(`${rel}:${line(m.index)} bare .select() after a write returns email/phone`)
          else out.push(`${rel}:${line(m.index)} bare .select() reads every column`)
        } else if (/^['"`]/.test(arg) && (PII.test(arg) || /^['"`]\s*\*/.test(arg) || /,\s*\*/.test(arg))) {
          out.push(`${rel}:${line(m.index)} selects ${arg.replace(/\s+/g, ' ')}`)
        }
      }
      const filt = chain.match(/\.(eq|neq|ilike|like|in|is|match|or)\(\s*['"`][^'"`]*\b(email|phone)\b/)
      if (filt) out.push(`${rel}:${line(m.index)} filters on ${filt[2]}`)
    }

    // 2. embedded users(...) with email/phone/*
    const embRe = /(?<![\w.'"])users(?:![\w]+)?\s*\(/g
    while ((m = embRe.exec(src))) {
      let i = embRe.lastIndex
      let depth = 1
      while (i < src.length && depth > 0) { if (src[i] === '(') depth++; else if (src[i] === ')') depth--; i++ }
      const inner = src.slice(embRe.lastIndex, i - 1)
      // strip line comments (commented-out queries)
      const live = inner.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n')
      if (!(PII.test(live) || /(^|[\s,])\*([\s,]|$)/.test(live))) continue
      // which client? the nearest .from( before the embed; for a select
      // string hoisted into a constant (no .from( before it), the file must
      // use ONLY service-role clients.
      const fromIdx = src.lastIndexOf('.from(', m.index)
      if (fromIdx >= 0) {
        const ident = clientIdent(src, fromIdx)
        if (ADMIN_IDENTS.has(ident) || isServiceRoleClient(src, ident)) continue
      } else if (onlyServiceClients(src)) {
        continue
      }
      // prose in comments ("users (used when …)") is not a query
      const lineStart = src.lastIndexOf('\n', m.index) + 1
      if (/^\s*(\*|\/\/)/.test(src.slice(lineStart, m.index))) continue
      out.push(`${rel}:${line(m.index)} embeds users(${live.replace(/\s+/g, ' ').trim()})`)
    }
  }
  return out
}

describe('no user-session read of users.email / users.phone (migration 120)', () => {
  const files = walk(ROOT)

  it('scans a real tree (guards against a scanner that reads nothing)', () => {
    expect(files.length).toBeGreaterThan(500)
    const withUsers = files.filter(f => /\.from\(\s*['"]users['"]\s*\)/.test(fs.readFileSync(f, 'utf8')))
    expect(withUsers.length).toBeGreaterThan(40)
  })

  it('finds no violations', () => {
    expect(findViolations(files)).toEqual([])
  })

  it('catches each shape it claims to (self-test on fixtures)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pii-scan-'))
    const fx = (name: string, body: string) => { const p = path.join(dir, name); fs.writeFileSync(p, body); return p }
    const bad = [
      fx('star.ts', `const { data } = await db.from('users').select('*').eq('id', x)\n`),
      fx('col.ts', `const { data } = await db\n  .from('users')\n  .select('id, name, email')\n  .in('id', ids)\n`),
      fx('phone.ts', `const r = await db.from('users').select('phone').eq('id', x)\n`),
      fx('bare.ts', `const r = await db.from('users').insert({ name }).select().single()\n`),
      fx('filter.ts', `const r = await db.from('users').select('id').eq('email', e)\n`),
      fx('jwt.ts', `const supabaseServer = createClient<Database>(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: t } } })\nconst r = await supabaseServer.from('chat_messages').select(\`id, users!sender_id ( name, email )\`)\n`),
      fx('embed.ts', `const r = await db.from('students').select(\`user_id, users!inner(\n id,\n name,\n email\n )\`)\n`),
    ]
    const good = [
      fx('admin.ts', `const r = await dbAdmin.from('users').select('id, email').eq('id', x)\n`),
      fx('svc.ts', `const supabase = createClient<Database>(\n  process.env.NEXT_PUBLIC_SUPABASE_URL!,\n  process.env.SUPABASE_SERVICE_ROLE_KEY!\n)\nconst r = await supabase.from('users').select('id, email')\n`),
      fx('names.ts', `const r = await db.from('users').select('id, name').in('id', ids)\nconst s = await db.from('students').select('user_id, users(name)')\n`),
      fx('narrow.ts', `const r = await db.from('users').insert({ name, email }).select('id').single()\n`),
      fx('svcvar.ts', `const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!\nconst supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);\nconst r = await supabase.from('users').select('id, email')\n`),
      fx('commented.ts', `//   users!inner(\n  //     name,\n  //     email\n  //   )\n`),
    ]
    const hits = findViolations([...bad, ...good]).map(h => path.basename(h.split(':')[0]))
    expect(new Set(hits)).toEqual(new Set(['star.ts', 'col.ts', 'phone.ts', 'bare.ts', 'filter.ts', 'embed.ts', 'jwt.ts']))
  })
})
