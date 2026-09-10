# Introduction document — authored sources

The two `.src.html` files here are the document. Everything else about it is
generated: the PDFs, the inlined-image HTML, the per-page PNGs.

**These live in git because they were nearly lost twice.** They existed only
in a session scratchpad until 2026-09-10, and on 2026-09-11 a cleanup glob
(`rm -f *.html` intending to remove *generated* HTML) deleted them from the
Downloads folder they had been rescued into. Both times the recovery was luck.
220KB in the repo removes the question.

## To edit

Edit the `.src.html` here. The `__IMG_name__` tokens are replaced at build
time by base64 image sidecars, which is why the source stays readable.

## To build

The images are ~26MB and are NOT in the repo. They live alongside a copy of
these files in:

    ~/Downloads/Introduction PDFs/sources/
        img2-en/  img2-ko/          40 files each: <name>.jpg and <name>.b64

So the build reads from that directory:

```bash
cp docs/introduction/*.src.html ~/Downloads/"Introduction PDFs"/sources/
node scripts/shots/_render-intro.mjs    ~/Downloads/"Introduction PDFs"/sources
node scripts/shots/_render-intro-ko.mjs ~/Downloads/"Introduction PDFs"/sources
```

Each writes `.html` (images inlined), `.pdf`, and one PNG per page, and prints
a per-page fill percentage plus a clipping check. Size variants:

    SIZE=b5 …      JIS B5
    BLEED=1 …      3mm bleed
    PRINT16=1 …    16-page saddle-stitch imposition

**Copy the sources over before building, and copy nothing back.** The repo is
the source of truth; the Downloads folder is a build directory that happens to
hold the images.

## A note on reproducibility

A rebuild from unchanged sources used to be byte-identical to the shipped
PDFs. It stopped being so when puppeteer went 24 → 25 on 2026-09-11, because
that brings a different Chrome and therefore a different PDF encoder. Same 13
pages, no clipping, ~3% smaller. If you are diffing file sizes to check
whether a change landed, that is why — compare page count and the clipping
report instead.

## Screenshots

The figures come from `scripts/shots/intro-shots.mjs` (student surface). The
two manager figures — dashboard and attendance — have **no script**; they were
cropped by hand and a naive re-shoot gets the framing wrong (the originals are
an offset crop of the content area, not a top-left capture, and the sidebar
must be expanded). If you re-shoot those, match the existing 2030px width and
the offset, or the document's layout shifts.
