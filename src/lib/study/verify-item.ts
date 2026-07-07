/**
 * Item-bank verification + classification (the productionized harness).
 *
 * Reading & Writing has no computable key, so its gate is an ADVERSARIAL
 * single-defensible check: N independent "blind" solves (the model never
 * sees the key). An item is single-defensible only if the solvers
 * converge on the generator's key — splits or convergence on a different
 * choice mean the item is ambiguous or mis-keyed (R&W's failure mode).
 *
 * Classification assigns the official College Board domain + subskill so
 * the bank can enforce the section blueprint at assembly time.
 *
 * Self-contained (fetch to OpenAI, no SDK) so it runs both in the Next
 * app and in batch bank-fill scripts. Measured R&W single-defensible
 * yield: ~100% on generated items (vs 41% wrong-key rate for math).
 */

export interface VerifiableItem {
  passage?: string | null
  prompt: string
  choices: string[]
  correct_answer: string
  type?: string | null
}

const norm = (s: string) => String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

async function chat(apiKey: string, messages: Array<{ role: string; content: string }>, temperature = 0): Promise<Record<string, unknown>> {
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4.1', temperature, response_format: { type: 'json_object' }, messages }),
  })
  const j = await r.json() as { choices?: Array<{ message: { content: string } }> }
  if (!j.choices?.length) throw new Error('openai: ' + JSON.stringify(j).slice(0, 160))
  return JSON.parse(j.choices[0]!.message.content)
}

export interface RwVerdict { ok: boolean; keyVotes: number; votes: string[] }

/**
 * Adversarial single-defensible check for a Reading & Writing item.
 * Runs `votes` blind solves; passes when >= ceil(votes*2/3) land on the
 * key. Default 3 votes, 2-of-3 threshold.
 */
export async function verifyRwSingleDefensible(
  item: VerifiableItem, apiKey: string, votes = 3,
): Promise<RwVerdict> {
  const need = Math.ceil((votes * 2) / 3)
  const cast: string[] = []
  for (let i = 0; i < votes; i++) {
    const out = await chat(apiKey, [
      { role: 'system', content: 'You are an expert SAT Reading & Writing test-taker. Choose the single best answer. Respond as JSON.' },
      { role: 'user', content: `${item.passage ? 'Passage: ' + item.passage + '\n\n' : ''}Question: ${item.prompt}\nOptions: ${JSON.stringify(item.choices)}\nChoose the ONE best option verbatim. Respond JSON: {"answer":"<verbatim option>"}` },
    ], 0.3)
    cast.push(String(out.answer ?? ''))
  }
  const keyVotes = cast.filter(v => norm(v) === norm(item.correct_answer)).length
  return { ok: keyVotes >= need, keyVotes, votes: cast }
}

// Official College Board Reading & Writing taxonomy.
export const RW_TAXONOMY: Record<string, string[]> = {
  'Information and Ideas': ['Central Ideas and Details', 'Command of Evidence', 'Inferences'],
  'Craft and Structure': ['Words in Context', 'Text Structure and Purpose', 'Cross-Text Connections'],
  'Expression of Ideas': ['Rhetorical Synthesis', 'Transitions'],
  'Standard English Conventions': ['Boundaries', 'Form, Structure, and Sense'],
}

export interface RwClass { domain: string; subskill: string }

/**
 * Classify a batch of R&W items into official domain + subskill. Batched
 * to keep call count low. Falls back to a safe default on any parse gap.
 */
export async function classifyRwBatch(items: VerifiableItem[], apiKey: string): Promise<RwClass[]> {
  const taxonomyText = Object.entries(RW_TAXONOMY)
    .map(([d, subs]) => `- ${d}: ${subs.join(' | ')}`).join('\n')
  const listing = items.map((it, i) =>
    `#${i}: ${it.passage ? '[has passage] ' : ''}${it.prompt}`).join('\n')
  const out = await chat(apiKey, [
    { role: 'system', content: 'You classify SAT Reading & Writing questions into the official College Board taxonomy. Respond as JSON.' },
    { role: 'user', content: `Taxonomy (domain: allowed subskills):\n${taxonomyText}\n\nClassify each item. Use the exact domain and subskill strings above.\n\n${listing}\n\nRespond JSON: {"items":[{"index":0,"domain":"...","subskill":"..."}, ...]}` },
  ])
  const arr = (out.items as Array<{ index: number; domain: string; subskill: string }> | undefined) ?? []
  const byIdx = new Map(arr.map(a => [a.index, a]))
  return items.map((_, i) => {
    const c = byIdx.get(i)
    const domain = c && RW_TAXONOMY[c.domain] ? c.domain : 'Information and Ideas'
    const subs = RW_TAXONOMY[domain]!
    const subskill = c && subs.includes(c.subskill) ? c.subskill : subs[0]!
    return { domain, subskill }
  })
}
