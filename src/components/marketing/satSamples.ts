/**
 * Real SAT Math figures, lifted verbatim from study_item_bank.
 *
 * Andy asked for "actual graphics from SAT math" on /camp, and the
 * honest way to do that is to ship items students actually get rather
 * than draw something that looks like one. These three are live bank
 * rows, copied with their ids so any claim on the page can be traced
 * back to the item it came from:
 *
 *   1032e3e7-c60c-4d8d-9505-d2b0173b76cb   Geometry and Trigonometry  (tangent-secant, raw SVG)
 *   ee8efc5f-95ba-4869-9535-50d196bb2c64   Problem-Solving and Data Analysis  (scatter + line of best fit)
 *   db74a131-64d4-4d08-83e6-2a2b11a70637   Problem-Solving and Data Analysis  (dot plot)
 *
 * Inlined rather than fetched: /camp is a static marketing page and
 * should not open a database connection to show three pictures.
 *
 * They render through QuestionGraphicView — the SAME component the test
 * session uses — so what a school sees here is what a student sees.
 */
import type { QuestionGraphic } from "@/app/mobile/study/session/[id]/test/types"

export type SatSample = {
  id: string
  domain: string
  prompt: string
  choices: string[]
  correct: string
  graphic: QuestionGraphic
}

export const SAT_SAMPLES: SatSample[] = [
  {
    id: "1032e3e7-c60c-4d8d-9505-d2b0173b76cb",
    domain: "Geometry and Trigonometry",
    prompt: "In the figure, PT is tangent to the circle at T, and the secant from P passes through the circle at A and then B (so PA < PB). If PT = 6 and PA = 4, what is the length of AB?",
    choices: ["3", "5", "9", "13"],
    correct: "5",
    graphic: {"svg": "<svg viewBox=\"0 0 350 250\" width=\"320\" role=\"img\" aria-label=\"A circle with center O. From external point P a tangent line touches the circle at T, and a secant line from P crosses the circle at A then B. PT is labeled 6, PA is labeled 4, and segment AB is unknown. Figure not drawn to scale.\">\n  <circle cx=\"212\" cy=\"142\" r=\"70\" fill=\"#fff\" stroke=\"#2B3A8C\" stroke-width=\"2\"/>\n  <line x1=\"42.0\" y1=\"178.0\" x2=\"171.1\" y2=\"85.2\" stroke=\"#2B3A8C\" stroke-width=\"1.8\"/>\n  <line x1=\"42.0\" y1=\"178.0\" x2=\"282.0\" y2=\"143.3\" stroke=\"#0E7A5F\" stroke-width=\"1.8\"/>\n  <path d=\"M171.1,85.2 L163.8,90.4 L169.1,97.7 L176.4,92.5\" fill=\"none\" stroke=\"#0E7A5F\" stroke-width=\"1.3\"/>\n  <circle cx=\"42.0\" cy=\"178.0\" r=\"3.2\" fill=\"#2B3A8C\" stroke=\"#fff\" stroke-width=\"1.1\"/><circle cx=\"171.1\" cy=\"85.2\" r=\"3.4\" fill=\"#2B3A8C\" stroke=\"#fff\" stroke-width=\"1.1\"/><circle cx=\"145.2\" cy=\"163.1\" r=\"3.4\" fill=\"#0E7A5F\" stroke=\"#fff\" stroke-width=\"1.1\"/><circle cx=\"282.0\" cy=\"143.3\" r=\"3.4\" fill=\"#0E7A5F\" stroke=\"#fff\" stroke-width=\"1.1\"/><circle cx=\"212.0\" cy=\"142.0\" r=\"2.2\" fill=\"#5A6474\" stroke=\"#fff\" stroke-width=\"1.1\"/>\n  <text x=\"34.0\" y=\"183.0\" text-anchor=\"end\" font-size=\"14\" font-weight=\"600\" fill=\"#12151C\" font-family=\"system-ui,sans-serif\">P</text>\n  <text x=\"168.1\" y=\"76.2\" text-anchor=\"end\" font-size=\"14\" font-weight=\"600\" fill=\"#12151C\" font-family=\"system-ui,sans-serif\">T</text>\n  <text x=\"143.2\" y=\"181.1\" text-anchor=\"middle\" font-size=\"13\" font-weight=\"600\" fill=\"#0A5C48\" font-family=\"system-ui,sans-serif\">A</text>\n  <text x=\"291.0\" y=\"141.3\" text-anchor=\"start\" font-size=\"13\" font-weight=\"600\" fill=\"#0A5C48\" font-family=\"system-ui,sans-serif\">B</text>\n  <text x=\"218.0\" y=\"157.0\" text-anchor=\"start\" font-size=\"12\" font-weight=\"600\" fill=\"#5A6474\" font-family=\"system-ui,sans-serif\">O</text>\n  <text x=\"100.6\" y=\"125.6\" text-anchor=\"end\" font-size=\"14\" font-weight=\"600\" fill=\"#2B3A8C\" font-family=\"system-ui,sans-serif\">6</text>\n  <text x=\"91.6\" y=\"186.5\" text-anchor=\"middle\" font-size=\"14\" font-weight=\"600\" fill=\"#0E7A5F\" font-family=\"system-ui,sans-serif\">4</text>\n  <text x=\"217.6\" y=\"145.2\" text-anchor=\"start\" font-size=\"15\" font-weight=\"600\" fill=\"#0E7A5F\" font-family=\"system-ui,sans-serif\" font-style=\"italic\">?</text>\n </svg>", "type": "rawsvg", "caption": "Figure not drawn to scale."},
  },
  {
    id: "ee8efc5f-95ba-4869-9535-50d196bb2c64",
    domain: "Problem-Solving and Data Analysis",
    prompt: "Based on the line of best fit, which value best predicts y when x = 7?",
    choices: ["33", "26", "29", "23"],
    correct: "29",
    graphic: {"type": "scatter", "points": [[1, 12], [2, 15], [3, 17], [4, 21], [5, 23]], "xLabel": "x", "yLabel": "y", "bestFit": {"b": 9.5, "m": 2.8}, "caption": "Scatterplot with line of best fit"},
  },
  {
    id: "db74a131-64d4-4d08-83e6-2a2b11a70637",
    domain: "Problem-Solving and Data Analysis",
    prompt: "What is the range of the data shown in the dot plot?",
    choices: ["13.5", "14.33", "6", "18"],
    correct: "6",
    graphic: {"type": "dotplot", "values": [12, 13, 13, 14, 16, 18], "xLabel": "Age", "caption": "Dot plot"},
  },
]
