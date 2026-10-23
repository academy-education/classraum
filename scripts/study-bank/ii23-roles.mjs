/**
 * ii23-roles.mjs — the option-role catalogue for sat-ii-hard-v23 (PREREG-II23-2026-10-23.md). Imported by
 * ii23-tellsim.mjs (the cross-item tell check) and ii23-merge.mjs (which checks each declared role against the
 * option's declared group profiles), so the two can never disagree about what a role means.
 *
 * Textual: f = [wt, wr, wc] for the comparison an option states, "winner" = the group the finding says shows MORE
 * of the effect the hypothesis attributes to its factor T (whatever the wording: "more", "fewer", "earlier"):
 *   wt  y if the winner has T and the loser does not, n if the reverse, tie if both or neither have it
 *   wr  the same for the rival account's factor R
 *   wc  diff if a passage-named background condition C differs between the two groups, else tie
 * key: the stem the role answers; d: the stems under which it may be a distractor.
 */
export const T = {
  'K-ISO':     { f: ['y', 'tie', 'tie'], key: 'support', say: 'two groups that differ ONLY in T; the T group wins' },
  'K-CROSS':   { f: ['y', 'n', 'tie'], key: 'support', say: 'a T-only group against an R-only group, C equal; the T-only group wins' },
  'K-ISO-W':   { f: ['n', 'tie', 'tie'], key: 'weaken', say: 'two groups that differ ONLY in T; the T group does NOT win (the other group shows more)' },
  'K-CROSS-W': { f: ['n', 'y', 'tie'], key: 'weaken', say: 'a T-only group against an R-only group, C equal; the R-only group wins' },
  'CONF-R':    { f: ['y', 'y', 'tie'], d: ['support', 'weaken'], say: 'both-T-and-R against neither; the both group wins (fits both accounts)' },
  'CONF-C':    { f: ['y', 'tie', 'diff'], d: ['support', 'weaken'], say: 'differ in T AND in C, R equal; the T group wins (C could explain it)' },
  'CONF-CW':   { f: ['n', 'tie', 'diff'], d: ['support', 'weaken'], say: 'differ in T AND in C, R equal; the T group does NOT win (C could explain it)' },
  'CONF-CX':   { f: ['y', 'n', 'diff'], d: ['support', 'weaken'], say: 'T-only against R-only, but C differs; the T-only group wins' },
  'CONF-CXW':  { f: ['n', 'y', 'diff'], d: ['support', 'weaken'], say: 'T-only against R-only, but C differs; the R-only group wins' },
  'RIV':       { f: ['tie', 'y', 'tie'], d: ['support', 'weaken'], say: 'differ ONLY in R; the R group wins (supports the rival, says nothing about T)' },
  'NEUT-C':    { f: ['tie', 'tie', 'diff'], d: ['support', 'weaken'], say: 'differ ONLY in C; the group C favours wins (both accounts expect it)' },
  'WKR':       { f: ['tie', 'n', 'tie'], d: ['weaken'], say: 'differ ONLY in R; the R group does NOT win (weakens the rival: the wrong person)' },
  'SUP':       { f: ['y', 'tie', 'tie'], d: ['weaken'], say: 'differ ONLY in T; the T group wins (supports T: the wrong direction for a weaken stem)' },
  'SUPX':      { f: ['y', 'n', 'tie'], d: ['weaken'], say: 'T-only against R-only, C equal; the T-only group wins (wrong direction for weaken)' },
  'WKN':       { f: ['n', 'tie', 'tie'], d: ['support'], say: 'differ ONLY in T; the T group does NOT win (wrong direction for support)' },
  'WKNX':      { f: ['n', 'y', 'tie'], d: ['support'], say: 'T-only against R-only, C equal; the R-only group wins (wrong direction for support)' },
}
export const Q = {
  'QK':       { f: ['pass', 'pass'], key: true, say: 'meets the derived criterion AND the grouping / second condition' },
  'Q-C1':     { f: ['pass', 'fail'], say: 'meets the derived criterion, fails the grouping / second condition' },
  'Q-WITHIN': { f: ['pass', 'fail'], say: 'right direction, but both rows on one side of the passage-stated boundary' },
  'Q-C2':     { f: ['fail', 'pass'], say: 'meets the grouping / second condition, fails the derived criterion' },
  'Q-RAW':    { f: ['fail', 'pass'], raw: true, say: 'the largest raw number of the four, but fails the derived criterion' },
  'Q-NEAR':   { f: ['fail', 'pass'], say: 'the derived value just misses (only arithmetic shows it)' },
  'Q-REV':    { f: ['fail', 'pass'], say: 'crosses the boundary / compares the right rows, in the wrong direction' },
  'Q-NONE':   { f: ['fail', 'fail'], say: 'an accurate reading that fails both (never visibly, on sight)' },
}
/** features of a declared comparison: win/lose = [T, R, C] with 0/1 entries */
export const profileFeatures = (win, lose) => {
  const d = (a, b) => (a > b ? 'y' : a < b ? 'n' : 'tie')
  return [d(win[0], lose[0]), d(win[1], lose[1]), win[2] === lose[2] ? 'tie' : 'diff']
}
