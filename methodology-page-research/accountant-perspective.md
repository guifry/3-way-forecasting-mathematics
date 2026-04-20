# What I Want to See on the Methodology Page

*Perspective: UK chartered accountant, partner-level, 28 years post-qualification. I sign off on forecasts that go to lenders, PE houses, audit committees and HMRC-adjacent restructuring discussions. My PII insurer asks me how I arrived at my numbers. So does the FRC if a client goes pop. If I put your tool's output in front of a credit committee at NatWest or a partner at a mid-market PE fund, I need to be able to defend every line. The methodology page is where you either earn that trust or lose it in the first ten minutes.*

*What follows is what I want to see. It is not a wishlist. It is the threshold for me even agreeing to a paid trial.*

---

## 1. The Questions I Would Ask Before Trusting This Tool

I'll group these because there are a lot.

### 1.1 Data ingestion and provenance

- Which accounting systems do you connect to, and via which APIs (Xero, QuickBooks Online, Sage 50, Sage Intacct, NetSuite, FreeAgent, Dynamics 365 BC, Oracle Fusion)? Direct API or a middleware (Codat, Railz, Validis)? If middleware, what's the latency and what data is transformed in transit?
- At what granularity is data pulled — trial balance, general ledger, sub-ledger, transaction-level? If only TB, you're already constrained on cohort and customer-level analysis, so say so.
- How do you handle multi-entity consolidation? Intercompany eliminations? FX translation method (closing rate, average rate, historical rate per IAS 21)?
- How do you handle a chart of accounts that doesn't follow a standard taxonomy? Do you map to a canonical CoA? Show me the mapping logic. Who validates the mapping — the user, the model, or a human in your team?
- What happens with prior-period adjustments, restatements, journals posted to closed periods, or reclassifications between management and statutory accounts?
- Do you reconcile to the filed statutory accounts at Companies House, or only to whatever the bookkeeper has in the cloud ledger today? These are not the same number.
- What's your treatment of accruals and prepayments at the period boundary? Are you forecasting from a clean accruals-basis position or a cash-basis snapshot dressed up as accruals?

### 1.2 Where assumptions come from

- For each forecast driver (revenue, COGS, payroll, opex, capex, working capital, tax, financing), what is the *default* assumption source? Trailing average, last actual, statistical extrapolation, user input, industry benchmark?
- If industry benchmarks: which dataset, which SIC code mapping, what vintage, what sample size, and is it UK-specific or global? A US benchmark for a UK SME's payroll is worse than no benchmark.
- Can the user override every single assumption? Is there a clear audit trail of overrides versus model defaults?
- If the model proposes an assumption (e.g. "we suggest revenue grows at 8%"), how is the suggestion generated and what is the confidence around it?
- How are non-recurring items (one-off legal fees, COVID grants, R&D tax credits, insurance settlements, founder loans) detected and excluded from baselines? Is this manual, rules-based, or model-based? If model-based, what's the false positive rate?

### 1.3 Time series and seasonality

- What is the underlying forecasting method? Naive, moving average, exponential smoothing (which flavour — simple, Holt, Holt-Winters), ARIMA/SARIMA, state-space, Prophet, gradient-boosted, neural? Different methods, different assumptions, different failure modes.
- How is seasonality detected and modelled? Additive or multiplicative? How many cycles of history do you require before seasonality is even attempted? I would not trust a seasonal decomposition on fewer than two full cycles, ideally three.
- What do you do for businesses with strong intra-month patterns (week-of-month, day-of-month, payday effects)? Most SME forecasting tools collapse to monthly and lose this.
- How do you handle calendar effects: working days per month, Easter, bank holidays, fiscal year-end shifts, leap years?
- How are structural breaks detected (post-acquisition, product launch, market exit, COVID)? Do you use changepoint detection, and if so, which algorithm?
- For new businesses with <12 months of history, what do you fall back to? "We can't forecast" is a perfectly acceptable answer; "we extrapolate from three data points" is not.

### 1.4 Working capital and timing

This is where most forecasting tools fall over. I want to see this in detail.

- How is debtor days (DSO) computed and projected? Simple ratio, weighted by customer cohort, by invoice ageing buckets? Do you use the count-back method or a simple AR/revenue ratio?
- Same questions for creditor days (DPO) and inventory days (DIO).
- Do you respect contractual payment terms per customer, or assume historical behaviour persists? In practice both matter.
- How do you handle bad debts and the expected credit loss model under IFRS 9 / FRS 102 s.11?
- For inventory: FIFO, weighted average, standard cost? How is obsolescence provisioning forecast?
- How do you model deferred revenue and contract liabilities (IFRS 15 / FRS 102 s.23)? Is the unwind mechanically driven by contract metadata, or assumed?
- How do you handle prepayments (insurance, software subs, rent in advance) — straight-line amortisation, or are you tracking the actual contract period?

### 1.5 Tax modelling

This is the area where amateur tools are exposed fastest.

- **VAT**: Standard scheme, cash accounting, flat rate, annual accounting, MOSS/OSS for digital services? Are partial exemption calculations supported? How do you handle reverse charge, zero-rated and exempt supplies? When does the VAT liability hit cash — quarterly stagger group, monthly?
- **PAYE/NIC**: Real-time information (RTI) cadence, employer NIC, employee NIC, apprenticeship levy, employment allowance, student loan deductions, pension auto-enrolment contributions. When is the cash outflow modelled — 19th/22nd of following month?
- **Corporation tax**: Small profits rate, marginal relief, associated companies, augmented profits, R&D tax credits (RDEC vs SME scheme post-April 2024 merged scheme), patent box, capital allowances (AIA, FYA, full expensing, structures and buildings allowance, special rate pool, main rate pool, balancing charges/allowances). Quarterly instalment payments for large/very large companies?
- **Deferred tax**: Are you computing it under FRS 102 s.29 / IAS 12? Recognition criteria for deferred tax assets?
- How does the tool handle group relief, consortium relief, loss carry-back/carry-forward, and the £5m streamed losses restriction?
- Diverted profits tax, digital services tax, plastic packaging tax — do you even surface these for clients in scope?

If the answer to most of the above is "the user inputs an effective tax rate," that tells me everything.

### 1.6 Three-way articulation

- How do you guarantee the three statements articulate? P&L profit must reconcile to BS retained earnings movement; CF must reconcile opening to closing cash on the BS.
- What are the internal balancing checks at each forecast period? Do you run an automated check that A = L + E to the penny, every period, every scenario?
- When the model is forced to balance (and at some point it always is), where is the plug? Suspense account, retained earnings, cash? A plug is acceptable provided it's explicit and visible. A hidden plug is a deal-breaker.
- Direct or indirect cash flow method (IAS 7)? Both?
- How is the financing cash flow constructed — from movements in debt accounts, or independently modelled? If independently, how is reconciliation enforced?

### 1.7 Sparse, anomalous or dirty data

- What's the minimum viable history? 3 months? 12? 24?
- How do you detect outliers (z-score, IQR, isolation forest, manual review)? What threshold? Once detected, do you winsorise, exclude, or flag?
- If a journal is posted in month 13 to correct months 1–12, how does that show in your trended history?
- What happens with negative revenue (returns/credits exceeding sales in a period), negative inventory, negative cash positions in history?

### 1.8 Uncertainty quantification

- Do you produce point forecasts only, or prediction intervals? At what confidence levels?
- Are prediction intervals model-based (residual variance under the assumed process) or empirical (bootstrap, conformal)?
- Do you offer scenario analysis (base/upside/downside) and is that mechanical (parameter shifts) or modelled (different assumption sets)?
- Monte Carlo support? If yes, what's sampled, what's held fixed, how many runs, what's the random seed policy for reproducibility?
- Sensitivity analysis: tornado charts on which drivers? Are sensitivities one-at-a-time or joint?

### 1.9 The AI/ML piece

- Where exactly does an LLM sit in the pipeline? Data ingestion, mapping, assumption generation, narrative, all of the above?
- What are the bounds on its output? Can it ever produce a number that flows directly into the financial statements without a deterministic intermediate step?
- Which model, which version, which provider, what's your data processing agreement, where is data processed (UK, EU, US)?
- What's your stance on training: do you use client data to train or fine-tune anything? If yes, is there opt-out, and is it default-on or default-off?
- How do you handle prompt injection from data fields (a chart of accounts line literally named "ignore previous instructions")?
- Hallucination controls: what's the validation layer between LLM output and what reaches the model?

### 1.10 Governance, audit, reproducibility

- Can I export the full model, formula by formula, to Excel? Not a static PDF — a working model.
- Is every forecast run versioned with a hash, timestamp, input snapshot, model version and parameter set, such that I can reproduce the same forecast in two years' time when a lender comes back with questions?
- Do you keep an immutable log of changes to assumptions per user per timestamp?
- Who is liable if the forecast is wrong? Your T&Cs, please.
- Penetration testing, SOC 2, ISO 27001, Cyber Essentials Plus, ICO registration? Where is data stored — UK region?

---

## 2. Standards and Frameworks I'd Expect to See Cited

If the methodology page does not name-check most of these in the appropriate places, the authors haven't done their reading.

### Accounting standards
- **FRS 102** (UK GAAP) — the bread and butter for UK SMEs. Specifically s.11 (basic financial instruments), s.12 (other financial instruments), s.18 (intangibles), s.21 (provisions), s.23 (revenue), s.29 (income tax).
- **FRS 105** for micro-entities — many of your prospective users will be on this.
- **IFRS** for groups with overseas exposure or PE-backed clients running IFRS — particularly **IAS 1, IAS 7 (cash flow statements), IAS 12 (income taxes), IFRS 9 (financial instruments and ECL), IFRS 15 (revenue), IFRS 16 (leases)**.
- **IAS 21** for FX translation if multi-currency.

### Forecasting and assurance frameworks
- **ISAE 3400** *The Examination of Prospective Financial Information* — the international standard on forecasts. This should be cited explicitly. It distinguishes forecasts (best-estimate assumptions) from projections (hypothetical assumptions). The methodology should make clear which it produces.
- **IAASB ISA 540 (Revised)** on accounting estimates — relevant because forecast assumptions feed estimates that auditors will challenge.
- **PS22/9 / FCA Listing Rules and Prospectus Regulation** for any forecast going into a regulated communication (IPO, AIM admission documents, Class 1 circulars). The reporting accountant rules under SIR 2000.
- **AICPA Guide for Prospective Financial Information** — even if US-centric, the discipline is well established.

### Treasury / FP&A bodies
- **AFP (Association for Financial Professionals)** FP&A guide and the FPAC body of knowledge.
- **CIMA** *Global Management Accounting Principles* and the CGMA cash flow forecasting guidance.
- **ICAEW** *Business Plans and Forecasts* technical release; ICAEW Tech Faculty guidance on management information.
- **ACCA** technical articles on three-statement modelling.

### Statistical/forecasting methodology
- Hyndman & Athanasopoulos, *Forecasting: Principles and Practice* (the standard reference) — if you're using ETS or ARIMA, cite the canonical treatment.
- Box-Jenkins methodology if ARIMA is used.
- **M-competitions** (M3, M4, M5) results — anyone serious in forecasting knows simple methods often beat complex ones, and you should be honest about where you sit.
- Conformal prediction literature if you're doing distribution-free intervals.

### Modelling discipline
- **FAST Standard** or **SSRB Best Practice Spreadsheet Modelling Standards** — even if your tool isn't a spreadsheet, the principles (one input one place, consistent signs, no hard-coded numbers in formulae, separation of inputs/calcs/outputs) translate directly. Cite them.
- **ICAEW Financial Modelling Code**.

### Data, security, privacy
- **UK GDPR / Data Protection Act 2018**.
- **SOC 2 Type II**, **ISO 27001**, **Cyber Essentials Plus**.
- If you handle financial data on behalf of regulated firms, **FCA SYSC** outsourcing requirements may apply to your customers.

### Tax
- **HMRC Business Income Manual**, **Corporation Tax Manual**, **VAT Notice 700 series**.
- **Making Tax Digital** for VAT (and ITSA from April 2026) — your tool's outputs may feed into MTD-compliant returns.

If your methodology page references "best practice" without naming any of these, I'm going to assume it's marketing copy.

---

## 3. Deal-Breakers

Things that make me close the tab.

### 3.1 Methodology red flags
- A single forecasting method applied uniformly to every line item. Revenue and rent expense do not behave the same way. A tool that treats them identically is a toy.
- "We use AI" with no further specification. That's a tell.
- "Proprietary algorithm" used as a shield against transparency. I don't need source code; I need the maths described in standard terminology.
- No mention of how the three statements articulate. If you can't tell me how P&L, BS and CF are kept consistent, the answer is "they aren't."
- No mention of working capital mechanics beyond DSO/DPO ratios.
- Tax presented as "apply effective rate" with no acknowledgement of timing differences, instalments, or VAT cadence.
- No prediction intervals, no scenarios, no sensitivity. A point forecast presented as truth is professionally negligent.
- Forecasts "rolled forward" with no mechanism for structural change (price rises, headcount plans, product launches).

### 3.2 "GPT pretending to be a model" tells
- Narrative that flows beautifully but contains numbers that don't tie to anywhere.
- Plausible-sounding ratios that, on inspection, are just LLM-generated guesses (e.g. "gross margin will improve to 42%" with no driver-level justification).
- Inability to answer "where did this number come from" with a deterministic chain back to inputs.
- Different numbers on re-run with identical inputs (non-determinism is fine in stochastic simulation, fatal in deterministic forecasting).
- Output that reads like a McKinsey deck but doesn't reconcile.
- Vague references to "machine learning" without specifying the model class, training data, validation approach.
- LLM in the critical path of arithmetic. LLMs cannot be trusted with arithmetic at the precision a financial statement requires. Full stop.

### 3.3 Accounting illiteracy tells
- Confusing accruals with cash anywhere in the documentation.
- "Profit equals cash" or any language suggesting the author doesn't understand the difference.
- Treating depreciation as a cash outflow.
- Modelling corporation tax as a P&L charge that immediately hits cash.
- Missing the distinction between trading and non-trading items.
- Showing dividends as a P&L expense.
- Calling retained earnings an asset.
- Not knowing the difference between FRS 102 and IFRS, or between a small company and a micro-entity.
- Any mention of "EBITDA cash flow" as if it were a real thing.

### 3.4 Transparency red flags
- No version history of the methodology page itself.
- No named author or technical reviewer.
- No changelog when methods are updated.
- No way to see, for a specific forecast, *which* method and *which* parameters were used.
- "Trade secret" used to refuse to explain a step.

### 3.5 Vendor signals
- Founders all from a marketing or design background, none with audit, FP&A or quantitative finance experience.
- No advisory board with practising accountants or treasurers.
- Customer logos but no case studies with actual variance analysis (forecast vs actual).
- A demo that only ever shows the same toy dataset.

---

## 4. Credibility Signals

What would make me lean in.

### 4.1 Terminology used precisely
- "Trailing twelve months" used correctly, distinguishing from "last fiscal year" and "annualised year-to-date."
- Correct distinction between budget, forecast, plan, projection.
- "Direct" vs "indirect" cash flow used appropriately.
- "Working capital" correctly defined and decomposed (operating WC vs total WC).
- "Free cash flow" defined explicitly — there are at least four common definitions, and the page should say which.
- "Burn rate" defined in cash terms, not accounting profit.

### 4.2 Acknowledgement of edge cases and limitations
- Explicit list of "this tool does not work well when..." cases. Honesty about not handling, say, businesses with strong project-based revenue lumpiness, or pre-revenue startups, or businesses going through a TUPE transfer.
- Explicit minimum data requirements.
- Explicit forecast horizon limits and degradation of confidence over horizon.

### 4.3 Method citations
- "We use Holt-Winters multiplicative for series with detected seasonality and exponential smoothing (ETS) per Hyndman et al. for non-seasonal series."
- "Outlier detection follows the seasonal-trend decomposition approach (STL) of Cleveland et al."
- "Prediction intervals are derived via the analytical formulae for the assumed state-space model, with a fallback to bootstrap residual resampling for non-Gaussian residuals."
- Honest comparison to baselines: "In our internal backtests against the M4 monthly subset, our ensemble achieved a sMAPE of X versus naive seasonal Y."

### 4.4 Internal consistency
- Explicit statement that A = L + E is enforced every period and the balancing mechanism (and where the plug, if any, lives).
- Explicit reconciliation between P&L, BS movement and CF.
- Cash on BS = closing cash on CF, every period.
- Tax expense on P&L reconciles to the deferred tax movement plus current tax cash and provision movements.

### 4.5 Honesty about scope
- "This tool does not replace a qualified accountant. It accelerates the construction of a defensible base model. The user remains responsible for the assumptions."
- Clear separation between what the tool does deterministically, what it suggests, and what the user must approve.
- A statement on intended use: management forecasting, lender packs, internal planning — and explicit non-uses (e.g. not for prospectuses without independent reporting accountant review).

---

## 5. The Structure I'd Want

A methodology page should read like the technical appendix of a Bank of England working paper, not like a product brochure. My ideal structure:

1. **Document control**
   - Version, date, authors (named, with credentials), reviewers, changelog.
2. **Scope and intended use**
   - What forecasts the tool produces, for what types of business, over what horizon, for what purposes. Explicit out-of-scope statements.
3. **Standards and references**
   - All applicable accounting, assurance, modelling and statistical standards, with the specific clauses relied upon.
4. **Data inputs**
   - Source systems, data model, granularity, refresh cadence, transformation rules, data quality checks, handling of missing data.
5. **Chart of accounts mapping**
   - The canonical taxonomy, the mapping logic, who validates.
6. **Baseline construction**
   - How history is cleansed, normalised for non-recurring items, restated for changes in scope.
7. **Forecasting methodology, line by line**
   - Revenue: methods, seasonality, drivers, defaults.
   - COGS and gross margin.
   - Payroll: headcount-driven vs ratio-driven, employer on-costs, pension, bonus accruals.
   - Operating expenses: by category, with method per category.
   - Capex, depreciation and amortisation policy.
   - Working capital: each component (AR, AP, inventory, accruals, prepayments, deferred revenue).
   - Tax: VAT, PAYE/NIC, corporation tax, deferred tax. Cadence of cash settlement.
   - Financing: debt schedules, interest, covenants, dividends, equity events.
8. **Three-statement articulation**
   - The exact mechanics by which P&L, BS and CF are kept consistent. The plug, if any. The order of computation.
9. **Uncertainty quantification**
   - Point forecast method, interval method, scenario framework, sensitivity, Monte Carlo if applicable.
10. **AI/ML components**
    - Where used, what for, bounds, validation, model providers, data handling.
11. **Backtesting and validation**
    - Methodology, datasets, metrics (MAPE, sMAPE, MASE, RMSE), comparison to baselines, results disclosed.
12. **Limitations and known failure modes**
    - Honest list.
13. **Reproducibility and audit trail**
    - Versioning, snapshots, export to Excel, change log per forecast.
14. **Governance**
    - Methodology change control, who signs off changes, frequency of review, advisory board.
15. **References and bibliography**
    - Full citations.

If section 8 is missing or thin, I assume the tool doesn't actually balance.

---

## 6. The Level of Detail

Enough that I, sitting in a meeting room with a sceptical relationship director from Lloyds Commercial Banking, can answer:

- "How did you arrive at the revenue line for next quarter?" — I can name the method, the inputs, the seasonality treatment, and point at the historical data window used.
- "Why does cash dip in March?" — I can decompose it into VAT quarter, corporation tax instalment, payroll cycle, working capital movement.
- "What's the confidence around the year-end cash position?" — I can quote a prediction interval and explain how it was derived.
- "What if your biggest customer pays 30 days late?" — I can run the sensitivity and explain the mechanics.
- "What's the AI doing here?" — I can describe its role, its bounds, and confirm that no number on this page came directly from a language model.

I do not need source code. I do not need parameter values to four decimal places for every method. I do need:
- Named methods with citations.
- The order of computation for the three statements.
- The list of every assumption with its source (model default, benchmark, user input).
- The validation evidence (backtests with numbers, not adjectives).
- The articulation logic.
- The audit trail.

Pseudocode for the articulation step would not be excessive. It would be welcome.

---

## 7. The Tone I'd Respect

**Trust-builders:**
- Plain English, precise terms. "We use Holt-Winters multiplicative seasonality" rather than "our AI detects patterns."
- Comfortable with admitting limitations. "This method degrades when the series has fewer than 24 monthly observations" reads as honest.
- Willing to show its working. Worked examples. Reconciliations.
- Uses the active voice and names things. "The model computes X using method Y" not "X is computed."
- Cites sources. Footnotes are good.
- Treats the reader as a peer. Doesn't oversimplify. Doesn't condescend.
- Acknowledges trade-offs. "We chose method X over Y because, in our backtests, it produced more stable forecasts at the cost of slightly higher peak error."

**Suspicion-raisers:**
- Marketing superlatives: "best-in-class," "state-of-the-art," "industry-leading," "powered by AI."
- Vague verbs: "leverages," "harnesses," "intelligently determines."
- Confidence without evidence: "highly accurate" without a number.
- Excess capitalisation: "Our Proprietary Forecasting Engine."
- Avoidance of plain accounting language in favour of bespoke product terminology.
- Anthropomorphising the model: "the AI understands your business."
- Defensive language: "trade secret," "proprietary," "we cannot disclose for competitive reasons" — used as a substitute for explanation.
- A glossary that defines terms in product-specific ways that conflict with standard usage.

If the page reads like it was written by a marketer with one engineer fact-checking, I'll know. If it reads like it was written by a quant and edited for clarity by a technical writer, I'll lean in.

---

## 8. The LLM/AI Piece Specifically

You've told me "the LLM only translates user intent into model parameters — the model itself is procedural."

Good answer in principle. Now prove it.

### 8.1 What I want to see
- An **architecture diagram** showing every component, with the LLM boundary clearly marked. Inputs into the LLM, outputs from the LLM, and the validation gate on the output side.
- A list of every LLM call type made by the system, with: purpose, input schema, output schema, model used, fallback if the LLM is unavailable.
- The **output schema enforcement**: structured output, JSON schema validation, what happens on validation failure (retry, fallback, error to user).
- An explicit statement that **no number flowing into the financial statements is generated by the LLM**. The LLM may select a method, propose a parameter, or produce narrative — but the number itself comes from a deterministic procedural step.
- The **bounds on parameter selection**: if the LLM proposes a growth rate, what's the allowed range? Is there a sanity check (e.g. proposed revenue growth >50% is flagged)?
- The **determinism story**: temperature settings, seed if applicable, and an explicit statement on whether two runs with identical inputs produce identical forecasts. (For the procedural model, they must. For LLM-generated narrative, the variance must be bounded and disclosed.)
- The **prompt injection defences**: how user-supplied data (account names, transaction descriptions, free-text notes) is sanitised before reaching the LLM.
- The **hallucination defences**: validation layer, fact-checking against the procedural outputs, refusal patterns.
- The **data residency and privacy story**: which provider, which region, DPA in place, opt-out from training, retention policy on prompts and completions.
- The **failure mode catalogue**: what happens when the LLM produces an out-of-bounds parameter, an invalid JSON, a refusal, a timeout.

### 8.2 Reproducibility test I'd run
- Run a forecast on a fixed dataset.
- Re-run it five times.
- I expect the financial statement numbers to be **identical** (or, if there's a documented stochastic component, identical given a fixed seed). If they drift, the LLM is in the critical path and the claim is false.
- Change one assumption, re-run. The change in outputs should be explainable mechanically, not "ah, the model decided differently this time."

### 8.3 What I want documented as off-limits for the LLM
- Arithmetic.
- Articulation of the three statements.
- Tax computations.
- Any direct edit to the cash flow.
- Reconciliations and balancing checks.
- Final published numbers.

The LLM is welcome to do: assumption suggestion (with user approval), narrative commentary (clearly labelled as such), method selection (from a closed list), data mapping (with confidence scores and human review for low-confidence mappings), variance commentary.

### 8.4 The honest version of the AI section

What I want to read is something like:

> *We use a large language model from [provider, version] for three purposes: (a) suggesting account-to-canonical-taxonomy mappings during onboarding, with mappings >X% confidence auto-applied and the rest queued for user review; (b) proposing default assumption values, which are presented to the user as suggestions and never auto-applied to the live forecast; (c) generating narrative commentary for the management report, which is clearly labelled as AI-generated and is not used in computation. All numbers in the financial statements are produced by deterministic procedural code. The LLM is run with temperature 0 and structured output validation; outputs failing validation are rejected and either retried with a corrective prompt or surfaced as errors. We do not send client data for training. Data is processed in [region] under our DPA. See section X for the full failure-mode catalogue.*

If the page reads like that, I'll trust the team.

---

## 9. Closing Note

I am not asking for the impossible. I am asking for the standard of disclosure that any quant fund's risk model documentation, any actuarial pricing model, any Bank of England staff working paper would meet. The fact that this is being sold to accountants — people whose entire profession is built on transparency, audit trail and reconciliation — makes it doubly important.

A polished UI tells me you can hire designers. A rigorous methodology page tells me I can put my name to your output.

If I cannot defend a number to a sceptical lender by reference to your methodology page, I will not use the tool. It is that simple.

---

## Unresolved Questions

- Acceptable to assume FRS 102 default for UK SME context, or do I need separate IFRS variant?
- Is the tool aimed at accountants (me as user) or end-clients with accountant oversight? Changes the disclosure threshold.
- Forecast horizon assumed — 13-week cash, 12-month, 3-year, 5-year? Each has different methodological priorities.
- Is multi-entity consolidation in scope for v1, or single-entity only?
- Does vendor expect this brief to inform their methodology page draft, or to benchmark an existing draft?
