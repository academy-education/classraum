#!/usr/bin/env python3
"""
check-answer-computability.py — does the stated answer actually follow
from the stem?

    venv/bin/python check-answer-computability.py --self-test
    venv/bin/python check-answer-computability.py math-items.json

WHAT THIS IS FOR
----------------
SAT Math defects are ARITHMETIC, which makes them decidable: a wrong
Math item is provably wrong. MATH-HUB-RESULT.md established that
checking the whole population beats sampling it, so this reads all 820
live items rather than a sample.

WHAT IT DOES NOT DO
-------------------
It does not "understand" word problems. It extracts equations that are
written symbolically in the stem, solves them, and compares. Anything it
cannot parse is reported as UNPARSEABLE and is NOT a verdict — an item
this script skips has not been checked, and must never be counted as
clean. Coverage is printed as prominently as the findings for exactly
that reason.

The valuable output is the VERIFIED-WRONG list: items where the algebra
contradicts the stored key. Those are certain, not suspected.

SELF-TEST FIRST
---------------
CLAUDE.md: "A detector that cannot reproduce a known number on known
data has no business being pointed at unknown data." --self-test runs
fixtures whose answers are known, including items that MUST come back
unparseable. The bank run refuses to start unless it passes.
"""
import json
import re
import signal
import sys
from fractions import Fraction

from sympy import Eq, S, Function, nsimplify, pi, simplify, solve, symbols
from sympy.parsing.sympy_parser import (
    convert_xor,
    implicit_multiplication_application,
    parse_expr,
    standard_transformations,
)

TRANSFORMS = standard_transformations + (
    implicit_multiplication_application,
    convert_xor,
)

# SAT variables are SINGLE letters. Any run of two or more consecutive
# letters is a word, and parsing it produces confident nonsense: sympy's
# implicit-multiplication turns `If 3x + 7` into I*f*3*x + 7 and then
# "solves" it to an expression in I and f. The self-test caught exactly
# that — every positive fixture came back UNPARSEABLE with "solution not
# a number", because `If` had become two variables.
WORD_RUN = re.compile(r"[A-Za-z]{2,}")
BARE_WORD = re.compile(r"^[A-Za-z]{2,}$")

# ...with the exception of real function names. `sqrt(3x + 4) = x` was
# rejected as prose because "sqrt" is a four-letter run, which silently
# cost every radical item in the bank.
FUNCS = ("sqrt", "log", "ln", "sin", "cos", "tan", "abs", "pi", "exp")
FUNC_RE = re.compile(r"\b(?:" + "|".join(FUNCS) + r")\b", re.I)

# A symbolic equation: both sides made only of numbers, single-letter
# variables, operators and brackets. Deliberately strict — a false
# UNPARSEABLE costs coverage, a false parse costs correctness.
EQUATION = re.compile(
    r"(?<![\w])"
    r"([0-9a-zA-Z\s\^\+\-\*/\(\)\.]{1,40}?)"
    r"\s*=\s*"
    r"([0-9a-zA-Z\s\^\+\-\*/\(\)\.]{1,40}?)"
    r"(?=[,.;?]|\s+(?:and|where|what|find|for)\b|$)",
    re.I,
)

# The target is an EXPRESSION, not a variable.
#
# This is the bug that made the first bank run worthless. The original
# pattern captured the first single letter after "value of", so a stem
# asking for `x - y` was solved for `x` and compared against the key for
# `x - y`. Nine items were reported VERIFIED WRONG. All nine were sound;
# every one is now a regression fixture. The failure mode is the one
# CLAUDE.md names: a confident, plausible, entirely wrong number that
# reads like a finding.
#
# Capturing to the end of the question and EVALUATING the expression
# against the solved system fixes the correctness bug and raises coverage
# at the same time, since expression targets are common in Algebra.
TARGET_PATTERNS = (
    re.compile(r"(?:the |a )?value of\s+(.+?)\s*[?.]", re.I | re.S),
    re.compile(r"solve for\s+(.+?)\s*[?.]", re.I | re.S),
)


def find_target(text):
    for pat in TARGET_PATTERNS:
        m = pat.search(text)
        if m:
            expr = m.group(1).strip()
            # strip a trailing "when ..." clause; the substitution case
            # ("what is y when x = 3") is not handled and must abstain
            # rather than answer the wrong question.
            if re.search(r"\bwhen\b", expr, re.I):
                return None
            return expr if looks_symbolic(expr) else None
    return None


def clean(text: str) -> str:
    t = (
        text.replace("−", "-")  # unicode minus
        .replace("×", "*")
        .replace("÷", "/")
        .replace("$", "")
        .replace("–", "-")
        .replace("·", "*")
    )
    # √(3x+4) -> sqrt(3x+4). Left unconverted, the radical vanished from
    # the regex character class and the stem parsed as a different
    # equation entirely.
    t = re.sub(r"√\s*\(", "sqrt(", t)
    t = re.sub(r"√\s*([0-9a-zA-Z]+)", r"sqrt(\1)", t)
    return t


CONSTRAINT = re.compile(r"\b([a-zA-Z])\s*(>=|<=|>|<)\s*(-?\d+)\b")


def constraints(text):
    """Stems say things like "and x > 0". Ignoring them turns a sound
    item into a false accusation — the checker rejected the intended
    root and reported the extraneous one as the truth."""
    out = []
    for var, op, num in CONSTRAINT.findall(text):
        out.append((symbols(var), op, int(num)))
    return out


def satisfies(sol, cons):
    for var, op, num in cons:
        if var not in sol:
            continue
        v = sol[var]
        if not getattr(v, "is_real", False):
            return False
        v = float(v)
        if op == ">" and not v > num:
            return False
        if op == "<" and not v < num:
            return False
        if op == ">=" and not v >= num:
            return False
        if op == "<=" and not v <= num:
            return False
    return True


def trim_prose(side: str) -> str:
    """Strip the English that brackets an equation inside a sentence.

    "If 3x + 7"  -> "3x + 7"       "and x - y" -> "x - y"
    Only whole leading/trailing word tokens are removed; a word in the
    MIDDLE means this is prose, and looks_symbolic then rejects it.
    """
    toks = side.strip().split()
    while toks and BARE_WORD.match(toks[0]) and not FUNC_RE.match(toks[0]):
        toks.pop(0)
    while toks and BARE_WORD.match(toks[-1]) and not FUNC_RE.match(toks[-1]):
        toks.pop()
    return " ".join(toks)


def looks_symbolic(side: str) -> bool:
    """Reject sides that are really English."""
    side = side.strip()
    if not side:
        return False
    if WORD_RUN.search(FUNC_RE.sub("", side)):
        return False
    return any(ch.isdigit() or ch.isalpha() for ch in side)


def extract_equations(text: str):
    out = []
    for lhs, rhs in EQUATION.findall(text):
        lhs, rhs = trim_prose(lhs), trim_prose(rhs)
        if not (looks_symbolic(lhs) and looks_symbolic(rhs)):
            continue
        out.append((lhs, rhs))
    return out


def to_number(raw):
    """Parse a stored answer into an exact rational where possible."""
    if raw is None:
        return None
    s = str(raw).strip().replace("$", "").replace(",", "").replace(" ", "")
    if not s:
        return None
    m = re.fullmatch(r"(-?\d+)/(\d+)", s)
    if m:
        return S(Fraction(int(m.group(1)), int(m.group(2))))
    try:
        v = nsimplify(S(s), rational=True)
    except Exception:
        return None
    # S("five") does NOT raise — sympy happily returns Symbol('five').
    # Without this guard a non-numeric key compared unequal to the real
    # solution and was reported WRONG, which is the worst possible
    # failure: a confident false accusation against a sound item. The
    # self-test caught it.
    return v if getattr(v, "is_number", False) else None


def key_text(item):
    """The stored key as TEXT — never by index or letter position.

    Option order is not stable across items in this bank (see
    CALIBRATION-SOLVER-RESULT.md), so a positional read would compare
    two different orderings and produce confident nonsense.
    """
    raw = item.get("correct_answer")
    choices = item.get("choices") or []
    if raw is None:
        return None
    if isinstance(raw, int) and 0 <= raw < len(choices):
        return choices[raw]
    s = str(raw).strip()
    if re.fullmatch(r"[A-Da-d]", s) and len(choices) >= 4:
        return choices["ABCD".index(s.upper())]
    return s


# ---------------------------------------------------------------------
# Things the checker MUST refuse. Each was found by hand-working items
# it had confidently reported as wrong.
# ---------------------------------------------------------------------

# FUNCTION NOTATION. `f(3) = 11` is function application, but sympy's
# implicit-multiplication reads it as f*3. The second bank run reported
# four linear-function items as broken on exactly this: "f is linear,
# f(3)=11 and f(7)=27, find f(12)" has answer 47, and the checker said
# 324/7. Refuse the family rather than half-support it.
# `\b(?!sin|cos|...)([a-zA-Z])\s*\(` does NOT exclude sin( — the engine
# simply retries at the next letter, matches "n(" and calls it a
# function call named n. Anchor on "no letter immediately before" so a
# single-letter name is the only thing that can match.
# No space before the paren, either: "acute angle x (in degrees)" is a
# variable followed by a parenthetical, not a call, and \s* let it match
# — which sent the whole trigonometry family down the linear-function
# path and out as UNPARSEABLE. Real stems write f(3), never f (3).
FUNC_CALL = re.compile(r"(?<![A-Za-z])([a-zA-Z])\(")

# DEGREES. sympy's trig is in radians. "For an acute angle x in degrees,
# sin(x) = cos(x + 20)" has answer 35 by the cofunction identity; solved
# in radians it returns a nest of atan() that matches nothing.
TRIG = re.compile(r"\b(?:sin|cos|tan|sec|csc|cot)\b", re.I)


# ── The two families the checker used to refuse ──────────────────────
#
# Both are handled NARROWLY and on the stem's own terms, because both
# produced false positives when handled generally. Anything outside the
# narrow form still abstains.

LINEAR_DECL = re.compile(r"\b(?:function\s+([a-zA-Z])\s+is\s+linear|linear function\s+([a-zA-Z])\b)", re.I)
FN_POINT = re.compile(r"\b([a-zA-Z])\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)\s*=\s*(-?\d+(?:\.\d+)?)")
FN_TARGET = re.compile(r"value of\s+(.+?)\s*[?.]", re.I | re.S)
FN_CALL_IN_TARGET = re.compile(r"\b([a-zA-Z])\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)")


def linear_function(prompt):
    """Handle ONLY "f is linear, f(a)=p, f(b)=q, what is <expr in f(.)>".

    The stem must SAY the function is linear. Two points do not
    determine a function otherwise, and assuming linearity where the
    stem does not state it is how a checker invents a finding.
    """
    m = LINEAR_DECL.search(prompt)
    if not m:
        return None
    fname = (m.group(1) or m.group(2)).lower()
    pts = [(float(a), float(v)) for f, a, v in FN_POINT.findall(prompt) if f.lower() == fname]
    # dedupe, keep order
    seen, uniq = set(), []
    for a, v in pts:
        if a not in seen:
            seen.add(a)
            uniq.append((a, v))
    if len(uniq) != 2:
        return None
    (x1, y1), (x2, y2) = uniq
    if x1 == x2:
        return None
    slope = S(nsimplify(y2 - y1, rational=True)) / S(nsimplify(x2 - x1, rational=True))
    intercept = S(nsimplify(y1, rational=True)) - slope * S(nsimplify(x1, rational=True))

    tm = FN_TARGET.search(prompt)
    if not tm:
        return None
    expr = tm.group(1)
    calls = FN_CALL_IN_TARGET.findall(expr)
    if not calls or any(f.lower() != fname for f, _ in calls):
        return None
    # substitute each f(k) with its value, then evaluate what remains
    for f, arg in calls:
        val = slope * S(nsimplify(float(arg), rational=True)) + intercept
        expr = expr.replace(f"{f}({arg})", f"({val})")
    if re.search(r"[a-zA-Z]", expr):
        return None  # something other than the f(.) calls survived
    try:
        return nsimplify(parse_expr(expr, transformations=TRANSFORMS), rational=True)
    except Exception:
        return None


COFUNCTION = re.compile(
    r"(sin|cos)\s*\(?\s*([a-zA-Z])\s*\)?\s*=\s*(sin|cos)\s*\(?\s*"
    r"([a-zA-Z])\s*([+-])\s*(\d+)\s*\)?", re.I)


def degree_trig(prompt):
    """Handle ONLY the cofunction stem: sin(x) = cos(x + k) in DEGREES.

    sympy works in radians, and solving this numerically returned a nest
    of atan() that matched nothing — a sound item reported wrong. The
    identity is exact and needs no solver: sin(A) = cos(B) iff A + B =
    90 for acute angles, so x + (x + k) = 90.
    """
    if not re.search(r"\bdegree", prompt, re.I):
        return None
    m = COFUNCTION.search(prompt)
    if not m:
        return None
    f1, v1, f2, v2, sign, k = m.groups()
    if f1.lower() == f2.lower() or v1.lower() != v2.lower():
        return None  # same function, or two different variables
    off = int(k) * (1 if sign == "+" else -1)
    x = symbols(v1.lower())
    sol = solve(Eq(x + (x + off), 90), x)
    return nsimplify(sol[0], rational=True) if sol else None


def compare(value, stated, label):
    if value == stated:
        return "OK", f"{label} = {stated}"
    try:
        if simplify(value - stated) == 0:
            return "OK", f"{label} = {stated}"
    except Exception:
        pass
    return "WRONG", f"stem gives {value}; key says {stated}"


class Timeout(Exception):
    pass


def _alarm(_sig, _frm):
    raise Timeout()


signal.signal(signal.SIGALRM, _alarm)

# sympy's solve() has no time bound. On the first bank run the script
# produced no output for ten minutes and there was no way to tell slow
# from stuck — a single pathological nonlinear system can spin forever.
# A wall-clock cap per item turns "the run hangs" into "that item is
# UNPARSEABLE", which is the honest verdict anyway: an item we could not
# decide has not been checked.
SOLVE_BUDGET_S = 5


def check(item):
    """-> (verdict, detail). Verdicts: OK, WRONG, UNPARSEABLE."""
    prompt = clean(item.get("prompt") or "")
    kt = key_text(item)
    stated = to_number(kt)
    if stated is None:
        return "UNPARSEABLE", "key is not numeric"

    if FUNC_CALL.search(prompt):
        got = linear_function(prompt)
        if got is None:
            return "UNPARSEABLE", "function notation, not a stated-linear f"
        return compare(got, stated, "f")
    if TRIG.search(prompt):
        got = degree_trig(prompt)
        if got is None:
            return "UNPARSEABLE", "trigonometry — not a cofunction stem"
        return compare(got, stated, "angle")

    target_src = find_target(prompt)
    if not target_src:
        return "UNPARSEABLE", "no parseable 'value of ...' target"

    eqs_raw = extract_equations(prompt)
    if not eqs_raw:
        return "UNPARSEABLE", "no symbolic equation found"

    try:
        signal.alarm(SOLVE_BUDGET_S)
        target = parse_expr(target_src, transformations=TRANSFORMS, evaluate=True)
        eqs = []
        for lhs, rhs in eqs_raw:
            L = parse_expr(lhs, transformations=TRANSFORMS, evaluate=True)
            R = parse_expr(rhs, transformations=TRANSFORMS, evaluate=True)
            eqs.append(Eq(L, R))
        eq_syms = set().union(*(e.free_symbols for e in eqs))
        if not target.free_symbols or not (target.free_symbols & eq_syms):
            return "UNPARSEABLE", "target shares no unknown with the equations"
        # Solve for EVERY unknown, not just the target. `x + y = 10 and
        # x - y = 2` has one solution, but solve(eqs, x) on a two-unknown
        # system returns [] — which the first version reported as "no
        # solution" and skipped. Systems are common enough in Algebra
        # that losing them would have gutted coverage silently.
        unknowns = sorted(eq_syms, key=str)
        sol = solve(eqs, unknowns, dict=True)
        cons = constraints(prompt)
    except Timeout:
        return "UNPARSEABLE", f"solve exceeded {SOLVE_BUDGET_S}s"
    except Exception as exc:  # parsing/solving failure is NOT a verdict
        return "UNPARSEABLE", f"solve failed: {type(exc).__name__}"
    finally:
        signal.alarm(0)

    if not sol:
        return "UNPARSEABLE", "no solution"

    values = []
    for candidate in sol:
        if cons and not satisfies(candidate, cons):
            continue  # the stem excluded this root
        try:
            v = target.subs(candidate)
            v = nsimplify(v, rational=True)
        except Exception:
            return "UNPARSEABLE", "target did not evaluate"
        if v.free_symbols:
            return "UNPARSEABLE", "target underdetermined"
        values.append(v)
    if not values:
        return "UNPARSEABLE", "no root satisfies the stated constraints"

    # Structural equality is NOT mathematical equality. The self-test
    # caught this: (2-sqrt(3))**2 + (2-sqrt(3))**(-2) IS 14, and
    # log(45)/log(3) - log(5)/log(3) IS 2, but `==` on the unsimplified
    # expression says otherwise. Comparing with `==` would have reported
    # both sound items as WRONG. Simplify the DIFFERENCE — the most
    # reliable zero test sympy offers.
    def equals(v):
        if v == stated:
            return True
        try:
            return simplify(v - stated) == 0
        except Exception:
            return False

    # Several roots is fine as long as the key is one of them — "what is
    # A value of x" is a legitimate SAT stem.
    if any(equals(v) for v in values):
        return "OK", f"{target_src} = {stated}"
    return "WRONG", f"stem gives {target_src} = {', '.join(map(str, values))}; key says {stated}"


# ---------------------------------------------------------------------
# Self-test. Every fixture's verdict is known in advance.
# ---------------------------------------------------------------------
FIXTURES = [
    # (label, item, expected verdict)
    ("linear, key correct",
     {"prompt": "If 3x + 7 = 22, what is the value of x?",
      "choices": ["3", "5", "7", "15"], "correct_answer": "5"}, "OK"),
    ("linear, key CORRUPTED",
     {"prompt": "If 3x + 7 = 22, what is the value of x?",
      "choices": ["3", "5", "7", "15"], "correct_answer": "7"}, "WRONG"),
    ("key given as letter, correct",
     {"prompt": "If 2y - 4 = 10, what is the value of y?",
      "choices": ["3", "5", "7", "9"], "correct_answer": "C"}, "OK"),
    ("key given as letter, CORRUPTED",
     {"prompt": "If 2y - 4 = 10, what is the value of y?",
      "choices": ["3", "5", "7", "9"], "correct_answer": "A"}, "WRONG"),
    ("fractional key, correct",
     {"prompt": "If 4x = 3, what is the value of x?",
      "choices": ["3/4", "4/3", "1", "12"], "correct_answer": "3/4"}, "OK"),
    ("system of two equations, correct",
     {"prompt": "If x + y = 10 and x - y = 2, what is the value of x?",
      "choices": ["4", "6", "8", "10"], "correct_answer": "6"}, "OK"),
    ("system, key CORRUPTED",
     {"prompt": "If x + y = 10 and x - y = 2, what is the value of x?",
      "choices": ["4", "6", "8", "10"], "correct_answer": "4"}, "WRONG"),
    ("quadratic with two roots, key is one of them",
     {"prompt": "If x^2 = 9, what is a value of x?",
      "choices": ["-3", "0", "6", "9"], "correct_answer": "-3"}, "OK"),
    # ---- negative controls: MUST NOT produce a verdict ----------------
    ("word problem, no symbolic equation",
     {"prompt": "A store sold 40 shirts on Monday and twice as many on "
                "Tuesday. What is the value of the total?",
      "choices": ["80", "120"], "correct_answer": "120"}, "UNPARSEABLE"),
    ("prose containing an equals sign",
     {"prompt": "The table shows that revenue = cost plus margin. What is "
                "the value of margin?",
      "choices": ["4"], "correct_answer": "4"}, "UNPARSEABLE"),
    ("geometry, no equation in the stem",
     {"prompt": "In right triangle ABC, the right angle is at B, AB = 9, "
                "BC = 12. What is the value of cos(C)?",
      "choices": ["0.6", "0.8"], "correct_answer": "0.8"}, "UNPARSEABLE"),
    ("non-numeric key",
     {"prompt": "If 3x + 7 = 22, what is the value of x?",
      "choices": ["five"], "correct_answer": "five"}, "UNPARSEABLE"),

    # ---- REGRESSION: the nine the first bank run "proved" wrong -------
    # Every one of these is SOUND. The first version captured the first
    # single letter after "value of", so a stem asking for `x - y` was
    # solved for `x` and compared against the key for `x - y`. It
    # reported 9 verified-wrong items out of 32 checked — a 28% defect
    # rate that was entirely an artefact of the checker.
    #
    # Each key below was worked by hand before being pinned here. They
    # are the reason the run is trustworthy now; delete one and the
    # corresponding bug can come back unnoticed.
    ("expr target: x - y from a 2x2 system",
     {"prompt": "If 3x + 5y = 1 and 5x + 3y = 15, what is the value of x - y?",
      "choices": ["7"], "correct_answer": "7"}, "OK"),
    ("expr target: a + b",
     {"prompt": "If 2a - b = 8 and a + 3b = 11, what is the value of a + b ?",
      "choices": ["7"], "correct_answer": "7"}, "OK"),
    ("expr target: x - y again",
     {"prompt": "If 5x + 3y = 29 and 3x + 5y = 27, what is the value of x - y?",
      "choices": ["1"], "correct_answer": "1"}, "OK"),
    ("expr target: nonlinear difference of squares",
     {"prompt": "If x + y = 10 and x^2 - y^2 = 40, what is the value of x - y?",
      "choices": ["4"], "correct_answer": "4"}, "OK"),
    ("expr target: reciprocal identity",
     {"prompt": "If x + 1/x = 4, what is the value of x^2 + 1/x^2?",
      "choices": ["14"], "correct_answer": "14"}, "OK"),
    ("constraint x > 0 excludes the extraneous root",
     {"prompt": "If sqrt(3x + 4) = x and x > 0, what is the value of x?",
      "choices": ["4"], "correct_answer": "4"}, "OK"),
    ("radical written with the unicode sign",
     {"prompt": "If \u221a(3x + 4) = x and x > 0, what is the value of x?",
      "choices": ["4"], "correct_answer": "4"}, "OK"),
    # These two the checker still cannot decide, and MUST abstain on
    # rather than guess: exponent-form equations and a word problem
    # about inverse variation.
    # Decidable once the comparison simplifies: log(45)/log(3) -
    # log(5)/log(3) really is 2. Pinned as OK, which is the item's TRUE
    # verdict; "abstain" was my guess at the checker's ceiling, not a
    # fact about the item.
    ("exponential system, key correct",
     {"prompt": "If 3^a = 5 and 3^b = 45, what is the value of b - a?",
      "choices": ["2"], "correct_answer": "2"}, "OK"),
    # ---- REGRESSION: the five the SECOND bank run "proved" wrong ------
    # Sound, every one, and hand-worked before being pinned. The checker
    # must ABSTAIN on these families, not guess at them.
    # Now DECIDABLE. Pinned as OK — the item's true verdict. They stayed
    # as abstentions only while the checker could not read f(x).
    ("linear function notation (real answer 47)",
     {"prompt": "The function f is linear. If f(3) = 11 and f(7) = 27, "
                "what is the value of f(12)?",
      "choices": ["47"], "correct_answer": "47"}, "OK"),
    ("linear function, expression target (real answer 34)",
     {"prompt": "The function f is linear. If f(3) = 11 and f(7) = 23, "
                "what is the value of f(0) + f(10)?",
      "choices": ["34"], "correct_answer": "34"}, "OK"),
    ("linear function, rate wording (real answer 37)",
     {"prompt": "A linear function f satisfies f(2) = 5 and f(6) = 21. "
                "Assuming f continues at the same constant rate of change, "
                "what is the value of f(10)?",
      "choices": ["37"], "correct_answer": "37"}, "OK"),
    ("trig in DEGREES, cofunction (real answer 35)",
     {"prompt": "For an acute angle x (in degrees), sin(x) = cos(x + 20). "
                "What is the value of x?",
      "choices": ["35"], "correct_answer": "35"}, "OK"),

    # ---- guards on the two NEW families -----------------------------
    ("function NOT stated linear — must abstain",
     {"prompt": "If g(2) = 4 and g(4) = 16, what is the value of g(3)?",
      "choices": ["9"], "correct_answer": "9"}, "UNPARSEABLE"),
    ("linear f but three points — must abstain",
     {"prompt": "The function f is linear. If f(1) = 2, f(2) = 4 and "
                "f(3) = 7, what is the value of f(4)?",
      "choices": ["9"], "correct_answer": "9"}, "UNPARSEABLE"),
    ("trig WITHOUT degrees stated — must abstain",
     {"prompt": "If sin(x) = cos(x + 20), what is the value of x?",
      "choices": ["35"], "correct_answer": "35"}, "UNPARSEABLE"),
    ("trig, same function both sides — must abstain",
     {"prompt": "For an acute angle x (in degrees), sin(x) = sin(x + 20). "
                "What is the value of x?",
      "choices": ["35"], "correct_answer": "35"}, "UNPARSEABLE"),
    ("linear f, CORRUPTED key",
     {"prompt": "The function f is linear. If f(3) = 11 and f(7) = 27, "
                "what is the value of f(12)?",
      "choices": ["48"], "correct_answer": "48"}, "WRONG"),
    ("degree cofunction, CORRUPTED key",
     {"prompt": "For an acute angle x (in degrees), sin(x) = cos(x + 20). "
                "What is the value of x?",
      "choices": ["40"], "correct_answer": "40"}, "WRONG"),

    ("inverse variation word problem — abstain",
     {"prompt": "The quantity y varies inversely as the square of x. "
                "When x = 2, y = 9. What is the value of y when x = 3?",
      "choices": ["4"], "correct_answer": "4"}, "UNPARSEABLE"),
]


def self_test():
    print("SELF-TEST — fixtures with known verdicts\n")
    bad = 0
    for label, item, expected in FIXTURES:
        got, detail = check(item)
        ok = got == expected
        bad += not ok
        print(f"  {'PASS' if ok else 'FAIL'}  {label:44s} expected {expected:12s} got {got:12s} {detail}")
    print()
    if bad:
        print(f"SELF-TEST FAILED — {bad} of {len(FIXTURES)} wrong.")
        print("Do NOT run this against the bank until it passes.")
        return 1
    print(f"SELF-TEST PASSED — {len(FIXTURES)}/{len(FIXTURES)}.")
    print("Note the four negative controls: the checker must ABSTAIN on")
    print("word problems and prose, not guess. Those matter more than the")
    print("positives — a false OK silently certifies a broken item.")
    return 0


def main():
    if "--self-test" in sys.argv:
        sys.exit(self_test())

    if self_test():
        sys.exit(1)
    print("\n" + "=" * 68 + "\n")

    path = [a for a in sys.argv[1:] if not a.startswith("-")]
    if not path:
        print("usage: check-answer-computability.py <math-items.json>")
        sys.exit(2)
    items = json.load(open(path[0]))
    if not items:
        raise SystemExit("empty dump — refusing to report on nothing")

    tally = {"OK": 0, "WRONG": 0, "UNPARSEABLE": 0}
    wrong, reasons, by_domain = [], {}, {}
    for it in items:
        v, detail = check(it)
        tally[v] += 1
        d = by_domain.setdefault(it.get("domain", "?"), {"OK": 0, "WRONG": 0, "UNPARSEABLE": 0})
        d[v] += 1
        if v == "WRONG":
            wrong.append((it, detail))
        elif v == "UNPARSEABLE":
            reasons[detail] = reasons.get(detail, 0) + 1

    n = len(items)
    checked = tally["OK"] + tally["WRONG"]
    print(f"SAT MATH — ANSWER COMPUTABILITY, whole population\n")
    print(f"  items                {n}")
    print(f"  CHECKED              {checked}   ({100*checked/n:.1f}% coverage)")
    print(f"    verified correct   {tally['OK']}")
    print(f"    VERIFIED WRONG     {tally['WRONG']}")
    print(f"  not checkable        {tally['UNPARSEABLE']}   <- NOT a clean bill of health\n")
    if checked:
        print(f"  defect rate among CHECKED items: {100*tally['WRONG']/checked:.2f}%\n")

    print("  per cohort (checked / total):")
    for dom, d in sorted(by_domain.items(), key=lambda kv: -sum(kv[1].values())):
        tot = sum(d.values())
        ch = d["OK"] + d["WRONG"]
        print(f"    {dom:36s} {ch:4d}/{tot:4d}   wrong {d['WRONG']}")

    print("\n  why items were skipped:")
    for r, c in sorted(reasons.items(), key=lambda kv: -kv[1]):
        print(f"    {c:5d}  {r}")

    if wrong:
        print(f"\n  VERIFIED-WRONG ITEMS ({len(wrong)}) — the algebra contradicts the key:\n")
        for it, detail in wrong[:40]:
            print(f"    {it['id']}  [{it['domain']}]")
            print(f"      {' '.join(str(it['prompt']).split())[:150]}")
            print(f"      {detail}\n")
        if len(wrong) > 40:
            print(f"    ... and {len(wrong)-40} more")
        out = "verified-wrong-math.json"
        json.dump([{"id": i["id"], "domain": i["domain"], "prompt": i["prompt"],
                    "choices": i["choices"], "correct_answer": i["correct_answer"],
                    "finding": d} for i, d in wrong], open(out, "w"), indent=1)
        print(f"\n  full list -> {out}")
    else:
        print("\n  No item was proved wrong among those that could be checked.")


if __name__ == "__main__":
    main()
