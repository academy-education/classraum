# Organisation logos for /giving

`ENTRIES` in `src/app/giving/page.tsx` names the file for each entry.
`OrgMark` constrains HEIGHT and lets width fall out, because these two
marks are very different shapes:

    samaritans-purse.png   192 x 192   1:1 roundel
    victree.png            269 x  54   ~5:1 horizontal wordmark

Forcing both into one square box rendered the wordmark as a sliver. Add
future marks at their native aspect and let the height rule handle them.
An entry with `logo: null` falls back to its monogram.

## Samaritan's Purse — permission on file

Written permission obtained 2026-09-04. The file is their own official PNG
from the Operation Christmas Child printable-resources page
(occ-logo-1200x1200.png), downscaled proportionally to 192x192.

Their style guide constrains how it may be drawn:

  - do not customise, alter or distort the mark
  - do not change its proportions or rotate it
  - the (R) is required — it is part of this artwork, so do not crop it out

Permission covers this use: one page describing our donation. A different
use needs a fresh request to sp-permissions@samaritan.org.

## Victree — their own header wordmark

Taken from the site header at victree.or.kr (imweb CDN), used at native
size. Unlike Samaritan's Purse, Victree publishes no logo-usage or CI
page that could be found, so there are no stated terms either way — worth
a short note to them confirming they are happy with it, since the rest of
this page describes a donation made to them.
