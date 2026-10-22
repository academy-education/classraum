import { readFileSync } from 'node:fs'
const live = JSON.parse(readFileSync('/private/tmp/claude-501/-Users-andylee-Downloads-saas-classraum/93d95221-6d94-4948-9914-9bd6bbc5b2a4/scratchpad/s18-m1/live.json', 'utf8'))
const probes = JSON.parse(process.argv[2])
for (const [name, ...terms] of probes) {
  const hits = live.filter(l => terms.every(t => new RegExp(t, 'i').test(l.prompt)))
  console.log(`${name.padEnd(22)} ${String(hits.length).padStart(3)}  ${hits.slice(0, 2).map(h => h.prompt.slice(0, 110).replace(/\n/g, ' ')).join('  ||  ')}`)
}
