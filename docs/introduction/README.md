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

## The split documents (2026-10-07)

The owner split the introduction into two documents, each in Korean and
English. The two `classraum-introduction*.src.html` files above are kept
unchanged as the previous edition; the four new sources are:

    classraum-academy-ko.src.html   학원 운영 소개서            11 pages (print 12)
    classraum-academy-en.src.html   Classraum for Academies     11 pages (print 12)
    classraum-study-ko.src.html     Classraum Study 소개서       8 pages (print 8)
    classraum-study-en.src.html     Classraum Study              8 pages (print 8)

The academy edition reuses the 2026-10-06 pages verbatim (owner-edited
Korean); the Classraum Study section shrank to half a page under 4.3. The
print booklet adds the FAQ page ahead of the back cover (11 + 1 = 12). The
Study edition is 8 pages on screen and in print.

Build (same image directory; `result2` is a 2026-10-07 re-shoot of the result
screen, because the English `result` image is a 1-of-54 attempt):

```bash
SRC=~/Downloads/"Introduction PDFs"/sources; OUT=~/Downloads/"Introduction PDFs"/split
cp docs/introduction/classraum-{academy,study}-*.src.html "$SRC/"
for d in academy-ko academy-en study-ko study-en; do
  for v in "X=0" "SIZE=b5" "PRINT=1 BLEED=1" "SIZE=b5 PRINT=1 BLEED=1"; do
    bash -c "env $v PNG=1 node scripts/shots/_render-split.mjs \"$SRC\" $d \"$OUT\""
  done
done
```

(Run the loop under bash or pass the variables explicitly: zsh does not
word-split `$v`, and `env "PRINT=1 BLEED=1"` silently sets PRINT to
"1 BLEED=1" and no bleed.) `_render-split.mjs` computes folios and contents
page numbers from page position (`.tp[data-ref]` -> section id), fails if the
DOM and `pdfinfo` disagree on the page count or a print build is not a
multiple of 4, and with `PNG=1` rasterises every PDF page into
`$SRC/_png/<pdf name>/` so each variant can be looked at.
