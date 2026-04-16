# Style Guide — CPGE Mathematics Course

Extracted from the CPGE-mathematics repository. This guide captures every structural, syntactic, and pedagogical pattern needed to write new course content indistinguishable from the original.

---

## 1. Repository Structure

```
index.html                     # Table of contents (root level, uses style.css directly)
style.css                      # Shared CSS for all pages (dark theme, box styles)
nav.js                         # Sidebar navigation — auto-injected via <script src="../nav.js">
tutor.js / tutor.css           # Interactive tutoring layer (loaded on every page)
fast-track.html                # Alternate curriculum view

refresher/                     # Pre-CPGE algebra/trig/calculus cheat sheets + exercises
  index.html                   # Refresher table of contents
  quiz.js                      # Quiz toggle logic for flashcard tables
  00-factoring.html            # Cheat-sheet style pages
  00-factoring-exercises.html  # Paired exercise pages
  01-equation-solving.html
  ...

phase0/                        # Phase 0: Geometry and Measurement
  01-similar-triangles.html
  02-pythagorean-theorem.html
  ...
phase1/                        # Phase 1: Number Theory and Arithmetic
phase2/                        # Phase 2: Limits and Basic Convergence
phase3/                        # Phase 3: Calculus
phase4/                        # Phase 4: Power Series
phase5/                        # Phase 5: Convergence
phase6/                        # Phase 6: Linear Algebra
phase7/ ... phase15/           # Subsequent phases

proofs/                        # Standalone proof index (not heavily used)
mathematicians/                # Biographical pages for referenced mathematicians
  images/                      # Portraits
  euclid.html
  gauss.html
  ...
```

### Key rules

- **One folder per phase**, named `phaseN/`.
- **One folder for refreshers**, named `refresher/`.
- **File naming**: `NN-kebab-case-name.html` — zero-padded two-digit number, lowercase with hyphens.
- Exercise pages mirror content pages: `00-factoring.html` has companion `00-factoring-exercises.html`.
- All pages sit one level deep from root; CSS/JS referenced as `../style.css`, `../nav.js`, `../tutor.js`.
- The root `index.html` links to every page with descriptions.
- Mathematician pages live under `mathematicians/` and are linked from history boxes.

---

## 2. Chapter/Topic Template — Section Ordering

Every phase page follows this exact structure, in this exact order:

### Standard phase page (theorem/concept pages)

```
1. <h1> Title
2. <p class="subtitle"> — "Phase N — Topic Area, Page M"
3. <div class="problem-box"> — The motivating historical problem. ALWAYS FIRST.
4. Numbered <h2> sections — build from problem to theorem, step by step
   - Ground-up definitions
   - Intuition and exploration
   - Formal definition(s) in theorem-box
   - Statement of main theorem in theorem-box
   - Proof in proof-box
   - Unpacking / "why it works" section
   - Worked examples / applications
   - Harder problem (optional, using problem-box again)
5. <div class="history-box"> — who, when, what problem they solved
6. <div class="break-box"> (one or more) — "what breaks if you weaken each hypothesis"
7. <hr>
8. <div class="oneliner"> — one-sentence takeaway
9. <div class="nav"> — prev/next links
10. <script> tags — nav.js and tutor.js
```

### Refresher page (cheat-sheet style)

```
1. <h1> Title
2. <p class="subtitle"> — "Refresher — Description"
3. Brief intro paragraph
4. <hr> separators between major sections
5. Numbered <h2> sections — reference material, not discovery-style
6. Tables with class="quiz-table" for flashcard-style content
7. Worked examples inline
8. Link to paired exercise page at end
9. <div class="nav"> — prev/next links
10. <script> tags — nav.js, tutor.js, quiz.js (refresher only)
```

### Exercise page

```
1. <h1> Title (e.g. "Factoring Exercises")
2. <p class="subtitle"> — "Refresher — 10 exercises, easy to hard"
3. Brief intro with link back to theory page
4. <hr>
5. Sequence of <div class="exercise"> blocks (typically 10)
   Each contains:
   - <div class="exercise-label">Exercise N — Topic</div>
   - Problem statement with math
   - <details><summary>Show solution</summary>
       <div class="solution">step-by-step solution</div>
     </details>
6. <div class="nav"> — prev/next links
```

---

## 3. Formatting Conventions

### Box types

| CSS Class | Border Colour | Label Text | Purpose |
|-----------|--------------|------------|---------|
| `problem-box` | Orange (`#e9a045`) | "The problem" or "Problem" | Historical motivating problem. **Always opens the page.** |
| `theorem-box` | Red (`var(--accent)` = `#e94560`) | "Theorem", "Definition", "Proposition", "Lemma", "Theorem — Name" | Formal statements |
| `proof-box` | Green (`#4a9`) | "Proof" or "Proof (detail)" | Step-by-step proofs |
| `history-box` | Teal (`#6a9`) | "Historical note" | Who, when, why context |
| `break-box` | Grey (`#888`) | "What breaks" or "What breaks if you ..." | Hypothesis removal analysis |
| `oneliner` | None (surface bg) | (no label) | One-sentence summary, centred, italic |
| `exercise` | Teal (`#6a9`) | (uses `exercise-label` div) | Exercise with collapsible solution |
| `refresher-box` | Green (`#4a9`) | (label div) | Used in refresher context |

### Box anatomy

Every box (except `oneliner`) has a label as its first child:

```html
<div class="theorem-box">
  <div class="label">Theorem — Squeeze Theorem</div>
  <p>Statement here...</p>
</div>
```

Label text patterns:
- **Definitions**: `Definition — Name` (e.g. "Definition — Vector space")
- **Theorems**: `Theorem — Name` or `Theorem (Name)` (e.g. "Theorem (Bezout's identity)")
- **Lemmas**: `Lemma`
- **Propositions**: `Proposition` or `Proposition (Linearity of divisibility)`
- **Proofs**: `Proof` or `Proof (detail about scope)`
- **Problems**: `The problem` (opening) or `Problem` (mid-page harder problem)
- **History**: `Historical note`
- **What breaks**: `What breaks` or `What breaks if you remove one side?`

### Proof ending

Every proof ends with a QED symbol:
```html
<div class="qed">∎</div>
```
or equivalently `<div class="qed">&#8718;</div>`. Both forms appear in the codebase.

### Proof box IDs

Proof boxes have `id` attributes for deep linking:
```html
<div class="proof-box" id="proof-theorem-squeeze-theorem">
```
Pattern: `proof-` followed by a kebab-case description.

### Display math

Always wrapped in a div:
```html
<div class="display-math">$$f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}$$</div>
```

Inline math uses bare `$...$` in paragraph text.

### Tables

Standard HTML `<table>` with `<th>` headers. For flashcard/quiz tables in refreshers, use `class="quiz-table"` and `class="qa"` on cells that should be hideable.

### Exercise blocks

```html
<div class="exercise">
<div class="exercise-label">Exercise 1 — Topic</div>
<p>Problem statement with $math$</p>
<details>
<summary>Show solution</summary>
<div class="solution">
<p>Step-by-step solution...</p>
<div class="display-math">$$answer$$</div>
</div>
</details>
</div>
```

### Figures (SVG diagrams)

```html
<figure>
  <svg>...</svg>
  <figcaption>Description</figcaption>
</figure>
```

---

## 4. AIM Syntax Reference (HTML + KaTeX)

This project does **not** use a custom AIM markup language. It is pure HTML with KaTeX for maths rendering. There is no build step, no preprocessor, no markdown-to-HTML conversion. Pages are hand-written HTML.

### HTML boilerplate (every page)

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PAGE TITLE — Phase N</title>
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
  onload="renderMathInElement(document.body, {
    delimiters: [
      {left: '$$', right: '$$', display: true},
      {left: '$', right: '$', display: false}
    ]
  });"></script>
</head>
<body>
```

### Footer scripts (every page)

```html
<script src="../nav.js"></script>
<script src="../tutor.js"></script>
</body>
</html>
```

Refresher pages additionally load:
```html
<script src="quiz.js"></script>
```

### KaTeX math delimiters

- **Display**: `$$...$$` — always inside `<div class="display-math">`
- **Inline**: `$...$` — directly in paragraph text

### LaTeX conventions observed

- Standard LaTeX commands: `\frac`, `\lim`, `\sum`, `\int`, `\sqrt`, `\leq`, `\geq`, `\neq`, `\cdot`, `\cdots`, `\ldots`, `\to`, `\infty`, `\varepsilon`
- Blackboard bold: `\mathbb{R}`, `\mathbb{Q}`, `\mathbb{N}`, `\mathbb{Z}`, `\mathbb{C}`, `\mathbb{K}`
- Operators: `\gcd`, `\operatorname{lcm}`, `\ker`, `\sup`, `\sin`, `\cos`
- Formatting: `\text{...}` for words inside math, `\quad` for spacing, `\qquad` for double spacing
- Display fractions: `\dfrac` for large fractions in display blocks
- Bold in text: `\mathbf` or `\boldsymbol` (rare — bold is mostly done via HTML `<b>`)
- Aligned equations: not used. Each equation gets its own `<div class="display-math">` block.

### HTML entities used

- `&mdash;` (em dash)
- `&ndash;` (en dash, e.g. "Bolzano–Weierstrass")
- `&rarr;` / `&larr;` (arrows in nav links)
- `&eacute;` (é in "lycée")
- `&#8718;` or literal `∎` (QED symbol)
- `&#8477;` (ℝ, used in nav links but KaTeX preferred in body text)

### Navigation links

```html
<div class="nav">
  <a href="PREV_FILE.html">&larr; Previous: Prev Title</a>
  <a href="NEXT_FILE.html">Next: Next Title &rarr;</a>
</div>
```

- First page of a phase: prev links to `../index.html` (labelled "← Index")
- Last page of a phase: next links to next phase's first page
- Arrow direction: `←` on prev, `→` on next

### Cross-references

Inline text references to other pages:
```html
<a href="../phase2/04-bolzano-weierstrass.html">Phase 2, page 4</a>
```
or:
```html
<a href="../phase2/06-ivt.html">Phase 2, page 6</a>
```

References to mathematician pages:
```html
<a href="../mathematicians/gauss.html">Gauss</a>
```

### Section numbering

Main sections use manual numbered `<h2>` headings:
```html
<h2>1. The division algorithm</h2>
<h2>2. Divisibility</h2>
<h2>3. Greatest common divisor</h2>
```

Some pages use descriptive `<h2>` without numbers (especially early sections before the main theorem):
```html
<h2>The crisis</h2>
<h2>Try to find it</h2>
```

Subsections use `<h3>`:
```html
<h3>Single bracket</h3>
<h3>Two brackets (FOIL)</h3>
```

### HTML comments (section separators)

Used as visual separators in source code (not rendered):
```html
<!-- ─── 1. THE PROBLEM ─────────────────────────────── -->
```
Pattern: `<!-- ─── N. SECTION NAME ──────...── -->`

These use Unicode box-drawing characters (`─`) and are purely for source readability. They are optional but present in most pages.

---

## 5. Pedagogical Patterns

### Core methodology: "Bourbaki rigour + historical order"

Every concept is taught following historical discovery order but with full formal rigour at each step.

### The pedagogical arc of a page

1. **Problem first**: Open with the historical problem that created the concept. The reader must feel WHY this theorem exists before seeing its statement. Never open with a definition.
   - Good: "The Pythagoreans built their worldview on ratios — then someone drew a diagonal..."
   - Bad: "Definition: A number is irrational if..."

2. **Exploration**: Let the reader try to solve the problem with existing tools. Show why existing tools fail or are insufficient.

3. **Ground-up definitions**: Define everything from scratch using only previously established concepts. Prefer the most fundamental definition available.

4. **Formal statement**: State the theorem precisely in a `theorem-box`.

5. **Unpacking**: After the formal statement, explain every piece:
   - What does each symbol represent?
   - Why is each hypothesis necessary?
   - What is the intuition?

6. **Full proof**: Step-by-step, every algebraic manipulation shown. No "it can be shown that..." or "by a similar argument..." (unless the identical argument was already given). Proof steps are bold-labelled: **Step 1.**, **Step 2.**, etc.

7. **Why it works**: Meta-commentary on the proof strategy — not just THAT it works but WHY the proof technique was chosen.

8. **Applications / harder problems**: Apply the theorem to solve the opening problem and optionally pose a harder one.

9. **Historical context**: Who discovered it, when, what they were trying to solve, how it connects to the broader narrative.

10. **What breaks analysis**: Systematically remove each hypothesis and show a counterexample for each. This cements understanding of WHY each condition is necessary.

11. **One-liner**: One sentence to carry in your head. The takeaway.

### No black boxes

Every tool must be proved or defined from first principles before use.

- **Earlier phase reference**: "We proved in Phase 0, page 5 that $|\sin\theta| \leq 1$"
- **Later phase IOU**: "(IOU: this will be proved in Phase 4 from the power series definition)"
- Never silently assume something unproved.

### Writing voice

- Conversational but precise. "Like a knowledgeable friend at a whiteboard, not a textbook."
- Use "you" and "we" freely.
- Short paragraphs. One idea per paragraph.
- **Bold** key terms on first use.
- *Italics* for emphasis and meta-commentary ("this is the key step").
- No emojis. No bullet-point walls where prose works better.
- British English only.
- Page length target: 280–450 lines of HTML.

### Proof style

- Steps labelled in bold: **Step 1.**, **Step 2.**, etc., or **Existence.**, **Uniqueness.**
- Key steps called out: "here is the **key step**"
- Each algebraic manipulation gets its own `display-math` block
- Brief prose bridges between display equations explaining what was done and why
- Verification after proofs: "Let's verify: $252 \cdot (-2) + 105 \cdot 5 = -504 + 525 = 21$. It works."

### Cross-referencing conventions

- Explicit back-references: "we proved on page 03 that..."
- Format: "Phase N, page M" or hyperlinked version
- Forward references use IOU markers: "(IOU: this uses Euclid's lemma, which we prove on the next page)"
- Mathematician names link to their biography page: `<a href="../mathematicians/gauss.html">Gauss</a>`

### Difficulty progression

- Within a page: easy examples → formal theorem → harder applications
- Within a phase: foundational tools → main theorems → advanced consequences
- Across phases: historical chronology as a proxy for conceptual dependency
  - Phase 0: Geometry (ancient)
  - Phase 1: Number theory (Euclid)
  - Phase 2: Limits (Archimedes → Cauchy)
  - Phase 3: Calculus (Newton/Leibniz)
  - Phase 4: Power series
  - Phase 5: Convergence theory
  - Phase 6: Linear algebra
  - Phase 7+: Advanced topics

---

## 6. Cross-Referencing Patterns

### Back-references (to established results)

```html
We proved (Phase 0, page 5) that $-1 \leq \sin(\theta) \leq 1$ for all $\theta$.
```

```html
its proof uses the Bolzano–Weierstrass theorem from
<a href="../phase2/04-bolzano-weierstrass.html">Phase 2, page 4</a>.
```

```html
(the interval is closed, so the limit stays inside). By continuity,
$f(x_{n_k}) \to f(c)$, a finite number.
```

### Forward references (IOUs)

```html
(IOU: this will be proved in Phase 4 from the power series definition)
```

```html
(IOU: this uses Euclid's lemma, which we prove on the next page from Bezout's identity)
```

```html
(IOU: we will study the full structure of ODE solution spaces in Phase 8.)
```

### Mathematician links

```html
<a href="../mathematicians/euclid.html">Euclid</a>
<a href="../mathematicians/cauchy.html">Cauchy</a>
<a href="../mathematicians/grassmann.html">Grassmann</a>
```

### Inter-phase links in the "looking ahead" pattern

```html
<strong>Looking ahead.</strong> In Phase 2, we'll study the <em>completeness</em> of
$\mathbb{R}$ — the precise property that guarantees $\mathbb{R}$ has no holes.
```

---

## 7. Skeleton Template

### Phase content page

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TOPIC TITLE — Phase N</title>
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
  onload="renderMathInElement(document.body, {
    delimiters: [
      {left: '$$', right: '$$', display: true},
      {left: '$', right: '$', display: false}
    ]
  });"></script>
</head>
<body>

<h1>TOPIC TITLE</h1>
<p class="subtitle">Phase N &mdash; Subject Area, Page M</p>

<!-- ─── 1. THE PROBLEM ─────────────────────────────── -->

<div class="problem-box">
  <div class="label">The problem</div>
  <p>
    [Historical problem that motivated this concept. Name the person, the date,
    the concrete situation. Make the reader feel WHY this matters before any
    formal mathematics.]
  </p>
</div>

<!-- ─── 2. EXPLORATION ─────────────────────────────── -->

<h2>1. [Exploration / attempt with existing tools]</h2>

<p>
  [Show the reader trying to solve the problem with what they already have.
  Show why existing tools are insufficient. Build intuition.]
</p>

<!-- ─── 3. DEFINITIONS ─────────────────────────────── -->

<h2>2. [Key definition(s)]</h2>

<div class="theorem-box">
  <div class="label">Definition &mdash; CONCEPT NAME</div>
  <p>
    [Precise, ground-up definition. Only use previously established concepts.]
  </p>
</div>

<p>
  [Unpack every piece. What does each symbol mean? Why each condition?
  Concrete examples.]
</p>

<!-- ─── 4. MAIN THEOREM ────────────────────────────── -->

<h2>3. [Main theorem]</h2>

<div class="theorem-box">
  <div class="label">Theorem &mdash; THEOREM NAME</div>
  <p>
    [Precise statement with all hypotheses.]
  </p>
</div>

<!-- ─── 5. UNPACKING ───────────────────────────────── -->

<h2>4. Unpacking</h2>

<p>
  [Explain each hypothesis. Why is it there? What does it mean intuitively?]
</p>

<!-- ─── 6. PROOF ───────────────────────────────────── -->

<h2>5. The proof</h2>

<div class="proof-box" id="proof-theorem-name">
  <div class="label">Proof</div>

  <p>
    <strong>Step 1.</strong> [First step with full algebraic detail.]
  </p>
  <div class="display-math">$$[equation]$$</div>

  <p>
    <strong>Step 2.</strong> [Next step.]
  </p>
  <div class="display-math">$$[equation]$$</div>

  <p>
    [Continue until complete. Every manipulation shown.]
  </p>

  <div class="qed">∎</div>
</div>

<!-- ─── 7. WHY IT WORKS ────────────────────────────── -->

<h2>6. Why the proof works</h2>

<p>
  [Meta-commentary on the proof strategy. What is the engine?
  Why was this approach chosen?]
</p>

<!-- ─── 8. APPLICATION ─────────────────────────────── -->

<h2>7. [Solving the original problem / applications]</h2>

<p>
  [Apply the theorem to resolve the opening problem. Optionally pose
  and solve a harder variant.]
</p>

<!-- ─── 9. HISTORY ─────────────────────────────────── -->

<div class="history-box">
  <div class="label">Historical note</div>
  <p>
    [Who discovered/proved it. When. What problem they were solving.
    How it connects to the broader narrative. Link mathematician names
    to their biography pages.]
  </p>
</div>

<!-- ─── 10. WHAT BREAKS ────────────────────────────── -->

<div class="break-box">
  <div class="label">What breaks</div>
  <p>
    <strong>[Remove hypothesis A.]</strong> [Counterexample showing failure.]
  </p>
  <p>
    <strong>[Remove hypothesis B.]</strong> [Counterexample showing failure.]
  </p>
  <p>
    <strong>[Weaken hypothesis C.]</strong> [What changes and why.]
  </p>
</div>

<!-- ─── 11. ONE-LINER ──────────────────────────────── -->

<hr>

<div class="oneliner">
  [One sentence. The essence of the whole page. What the reader carries
  in their head.]
</div>

<!-- ─── NAV ────────────────────────────────────────── -->

<div class="nav">
  <a href="PREV.html">&larr; Previous: Prev Title</a>
  <a href="NEXT.html">Next: Next Title &rarr;</a>
</div>

<script src="../nav.js"></script>
<script src="../tutor.js"></script>
</body>
</html>
```

### Exercise page skeleton

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TOPIC Exercises — Phase N</title>
<link rel="stylesheet" href="../style.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"
  onload="renderMathInElement(document.body, {
    delimiters: [
      {left: '$$', right: '$$', display: true},
      {left: '$', right: '$', display: false}
    ]
  });"></script>
</head>
<body>

<h1>TOPIC Exercises</h1>
<p class="subtitle">Phase N &mdash; 10 exercises, easy to hard</p>

<p>Work each problem on paper before opening the solution. Reference: <a href="THEORY_PAGE.html">Theory Page</a>.</p>

<hr>

<div class="exercise">
<div class="exercise-label">Exercise 1 &mdash; Subtopic</div>
<p>[Problem statement with $math$]</p>
<details>
<summary>Show solution</summary>
<div class="solution">
<p>[Step-by-step solution]</p>
<div class="display-math">$$[key equation]$$</div>
<p>Check: [verification]. Correct.</p>
</div>
</details>
</div>

<!-- Repeat for exercises 2-10, increasing difficulty -->

<div class="nav">
  <a href="PREV.html">&larr; Previous: Prev Title</a>
  <a href="NEXT.html">Next: Next Title &rarr;</a>
</div>

<script src="../nav.js"></script>
<script src="../tutor.js"></script>
</body>
</html>
```

---

## 8. Checklist for Writing a New Page

- [ ] Opens with `problem-box` containing a historical motivation — never a definition
- [ ] Subtitle follows pattern: `Phase N — Topic Area, Page M`
- [ ] All definitions use `theorem-box` with `Definition — Name` label
- [ ] All theorem statements use `theorem-box` with `Theorem — Name` label
- [ ] All proofs use `proof-box` with `id` attribute, end with `<div class="qed">∎</div>`
- [ ] Proof steps labelled **Step 1.**, **Step 2.**, etc.
- [ ] Every display equation wrapped in `<div class="display-math">$$...$$</div>`
- [ ] At least one `history-box` with who/when/why
- [ ] At least one `break-box` systematically removing hypotheses
- [ ] `<hr>` before the `oneliner`
- [ ] `oneliner` div with one-sentence summary
- [ ] `nav` div with prev/next links using `←` / `→`
- [ ] Footer scripts: `nav.js` and `tutor.js`
- [ ] No HTML comments (except section separator comments using `─`)
- [ ] British English throughout
- [ ] No emojis
- [ ] Bold key terms on first use
- [ ] Explicit cross-references to earlier results with phase/page numbers
- [ ] IOUs flagged explicitly for forward references
- [ ] Mathematician names linked to biography pages
- [ ] Page length: 280–450 lines of HTML
- [ ] Every algebraic step shown — no "it can be shown that..."
- [ ] Conversational tone with "you" and "we"
