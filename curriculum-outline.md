# Curriculum Outline — Three-Way Forecasting Mathematics

**Goal**: a reader who completes this course can rebuild the entire Taisk forecast model pen-and-paper, from memory, with no AI and no Google. They can defend every formula to an outside mathematician or accountant.

**Audience**: someone with A-level / baccalaureat maths who has forgotten most of it. Not a maths beginner, but not currently fluent.

**Approach**: every formula is *derived*, never dropped from the sky. Every design choice is *justified* against alternatives. The reader doesn't memorise — they understand deeply enough to reconstruct.

---

## Phase 0 — The Statistical Toolkit

*Before you can build a forecast, you need instruments to measure the past.*

### Page 01: Central Tendency — Mean and Median
- **Problem**: a business has 14 months of invoices. One invoice is 180 days late. What's the "typical" payment delay?
- Mean vs median. When each is appropriate. Order statistics.
- Why the forecast engine uses median for DSO/DPO and mean for baselines.
- **Exercises**: (academic) compute both by hand on small datasets, show how one outlier destroys the mean. (Applied) given 14 invoices with payment delays, decide which measure to report to a lender.

### Page 02: Dispersion — Variance, Standard Deviation, CV
- **Problem**: two businesses both average 30 days to pay. One is rock-steady, the other wildly erratic. How do you tell them apart?
- Variance from first principles (average squared deviation). Why squared? Why not absolute?
- Sample vs population variance — Bessel's correction (n-1). Derive it from degrees of freedom.
- Standard deviation as "same units as the data."
- Coefficient of variation: the dimensionless ratio. Why CV > 0.35 means "too irregular to predict."
- **Exercises**: (academic) compute stdev and CV by hand, prove CV is scale-invariant. (Applied) given two suppliers' payment histories, decide which is regular enough to forecast.

### Page 03: Percentiles and Distribution Shape
- **Problem**: an investor asks "what's the typical invoice size, and how spread out are they?"
- Order statistics. Interpolation between ranked values.
- P25, P50 (= median), P75, P90. IQR as a robust spread measure.
- Why the forecast engine characterises invoice distributions this way.
- **Exercises**: (academic) compute percentiles from a small dataset by hand, verify P50 = median. (Applied) given 50 invoice amounts, produce the distribution summary an investor would see.

### Page 04: Linear Regression — Fitting a Line
- **Problem**: quarterly DSO values are 28, 31, 33, 36. Is the business getting paid more slowly over time?
- Least squares derivation from scratch: minimise sum of squared residuals.
- Derive the slope formula: `b = Σ(xᵢ - x̄)(yᵢ - ȳ) / Σ(xᵢ - x̄)²`.
- Geometric interpretation: orthogonal projection.
- Why OLS and not robust regression? (small n, simplicity, good enough for trend detection).
- **Exercises**: (academic) compute slope by hand for 4-5 data points, interpret sign and magnitude. (Applied) given 6 quarters of DSO, compute the trend and extrapolate to week 104.

### Page 05: Detecting Recurring Patterns in Transaction Data
- **Problem**: a business has 200 bills from 40 suppliers over 18 months. Which are recurring expenses (rent, subscriptions) and which are one-offs?
- Group transactions by (supplier, category). Require ≥ 3 occurrences.
- Compute median interval between payments. Classify frequency: 5-10d = weekly, 25-35d = monthly, 80-100d = quarterly, 340-400d = annual.
- Regularity test: compute CV of intervals and CV of amounts. Reject if either CV > 0.35.
- Confidence scoring: CV < 0.20 on both = HIGH, otherwise = LOW.
- Why median interval and not mean? (One delayed payment shouldn't reclassify a monthly stream as quarterly.)
- **Exercises**: (academic) given 8 payment dates, compute median interval, interval CV, classify frequency. (Applied) given a full supplier ledger, identify which streams are recurring and assign confidence.

---

## Phase 1 — Exponential Growth and the Time Value of Money

*Every projection in the model is ultimately a growth curve. This phase builds the mathematical engine behind all of them.*

### Page 01: Compound Interest from First Principles
- **Problem**: if revenue grows 10% per year, what's revenue in 3.7 years?
- Discrete compounding: `A = P(1+r)^n`. Derive from repeated multiplication.
- Why `(1+r)^n` and not `P + P·r·n` (simple interest). Show the divergence graphically.
- Fractional exponents: `(1+r)^(t/T)` for continuous compounding. Why this produces smooth weekly growth without step discontinuities at year boundaries.
- CAGR: `g = (end/start)^(1/years) - 1`. Why the simplified `(recent/prior) - 1` is equivalent when years = 1.
- Clamping growth rates: why [-20%, +25%] and the philosophy of conservative projection.
- **Exercises**: (academic) compute growth factors for various horizons, show discrete vs continuous paths diverge intra-year but converge at year boundaries. (Applied) given 24 months of revenue, compute CAGR and project weekly revenue for 52 weeks.

### Page 02: Geometric Series and the Annuity Formula
- **Problem**: a business takes a £100k loan at 5% annual rate, repaying weekly over 5 years. What's the fixed weekly payment?
- Geometric series: `1 + r + r² + ... + r^(n-1) = (1-r^n)/(1-r)`. Derive it.
- Present value of an annuity: sum of discounted fixed payments = principal. Derive `PMT = P·r / (1-(1+r)^(-n))`.
- Amortisation schedule: each payment splits into interest on remaining balance + principal reduction. Show why early payments are mostly interest.
- Annual-to-weekly rate conversion.
- **Exercises**: (academic) derive the annuity formula from the geometric series, build a 10-period amortisation schedule by hand, verify the balance reaches zero. (Applied) a business takes a £50k loan at 6% over 3 years — compute the weekly payment and first 8 weeks of the schedule.

### Page 03: Inflation and Blended Growth
- **Problem**: rent grows with inflation (3%), supplies grow with revenue (8%). What rate do you use for the "everything else" bucket?
- Inflation as a compounding force on fixed costs.
- Revenue growth as a compounding force on variable costs.
- The blended rate `(inflation + growth) / 2` for unclassified costs — why arithmetic mean and not geometric? (honest middle ground when you can't classify).
- **Exercises**: (academic) prove that the blended rate always sits between inflation and growth. (Applied) given a business with 60% fixed ratio, project fixed, variable, and residual costs for 5 years — show the divergence.

---

## Phase 2 — Seasonal Decomposition

*Revenue isn't flat — it has a rhythm. This phase extracts that rhythm from noisy data.*

### Page 01: Moving Averages as Low-Pass Filters
- **Problem**: monthly revenue is noisy — some months high, some low. How do you see the underlying trend?
- Simple moving average: sliding window mean. Why it smooths.
- The 12-month centred moving average: `CMA(t) = (0.5·x(t-6) + x(t-5) + ... + x(t+5) + 0.5·x(t+6)) / 12`. Why half-weights at endpoints? Why 12? (Because the seasonal cycle is 12 months — the filter's frequency response has a zero at the annual frequency.)
- Intuition: CMA averages over exactly one full seasonal cycle, so the seasonal component cancels out, leaving only trend.
- What you lose: 6 months at each end. Why this matters with only 12-24 months of data.
- (IOU: Fourier analysis explains *why* this works — the convolution theorem — but is not required to use it.)
- **Exercises**: (academic) compute CMA by hand for 18 months of data, observe how it smooths away monthly variation. (Applied) given 24 months of a retailer's revenue, compute the CMA and identify the trend direction.

### Page 02: Multiplicative Decomposition
- **Problem**: you've got the trend. How do you extract the seasonal pattern?
- The multiplicative model: `x(t) = T(t) × S(t) × I(t)` (trend × seasonal × irregular).
- Why multiplicative and not additive? (Revenue seasonality scales with business size — a 20% Christmas bump is 20% whether revenue is £10k or £10M.)
- Ratio-to-moving-average: `SI(t) = x(t) / CMA(t)`. This strips the trend, leaving seasonal × irregular.
- Averaging ratios by calendar month: `raw_index(m) = mean(SI(t) for all t where month = m)`. Averaging cancels the irregular, leaving seasonal.
- Normalisation: rescale so indices sum to 12.0. Why? (No net seasonal effect over a full year — seasonality redistributes revenue across months, doesn't create or destroy it.)
- Alternative not used: X-13ARIMA-SEATS. Why non-parametric decomposition was deliberately chosen (12-24 months of data is too little for ARIMA identification).
- **Exercises**: (academic) full decomposition by hand from 24 months of data — extract CMA, compute ratios, average by month, normalise to 12. (Applied) given a SaaS company's monthly revenue, extract the seasonal pattern and explain what it tells a CFO.

### Page 03: Seasonal Index Floor and Redistribution
- **Problem**: a business has zero revenue in August (everyone's on holiday). The seasonal index for August is 0.0. This means the model projects £0 revenue in August *forever*. That's wrong.
- The floor: clamp every index to a minimum of 0.20 (quietest month is at least 20% of average).
- The invariant: indices must still sum to 12.0.
- Redistribution: floored months "borrow" from unclamped months. `free_months *= (free_total - deficit) / free_total`.
- Cascading: redistribution might push another month below the floor. Iterate up to 5 times.
- Why 0.20? (Design choice, not mathematics — but the iterative redistribution algorithm is real.)
- **Exercises**: (academic) apply flooring and redistribution by hand to a pathological set of indices where 3 months are below floor — verify sum = 12 after iteration. (Applied) a holiday rental business has zero revenue Nov-Feb — apply the floor and explain to the owner why the model still projects some revenue in winter.

### Page 04: Dampened Seasonality for Costs
- **Problem**: revenue is seasonal, so variable costs (COGS) are too. But rent isn't seasonal. The residual cost bucket contains both. How much seasonality should you apply?
- CVP classification: fixed costs have zero seasonal amplitude, variable costs have full seasonal amplitude.
- Dampening formula: `dampened_factor = 1 + (seasonal_index - 1) × (1 - fixed_ratio)`.
- Derive it: when `fixed_ratio = 1` (all fixed), dampened factor = 1 (no seasonality). When `fixed_ratio = 0` (all variable), dampened factor = full seasonal index. Linear interpolation between the two extremes.
- **Exercises**: (academic) compute dampened seasonal factors for fixed_ratio = 0, 0.5, 1 — verify the edge cases algebraically. (Applied) a restaurant (80% variable) vs a law firm (90% fixed) — compute and compare the seasonal cost swing for each.

### Page 05: Why Not X-13ARIMA?
- **Problem**: the US Census Bureau, ONS, and Eurostat all use X-13ARIMA-SEATS for seasonal adjustment. Why doesn't this model?
- What X-13ARIMA does: parametric ARIMA model identification, estimation, and diagnostic checking. Automatic model selection from a space of (p,d,q)(P,D,Q) models.
- What it needs: ideally 5+ years of monthly data (60+ observations) for reliable model identification. ONS recommends 7 years minimum.
- What we have: 12-24 months. With 12 observations, ARIMA model identification is numerically unstable — too many parameters for too few data points.
- The honest choice: ratio-to-moving-average is a non-parametric method. It makes fewer assumptions, extracts less signal, but doesn't hallucinate patterns from noise.
- The trade-off: X-13ARIMA can detect trend changes, trading-day effects, Easter effects, outliers. The simpler method cannot. But those features require data length we don't have.
- When the model *should* switch: if a business provides 5+ years of data, X-13ARIMA becomes defensible.
- **Exercises**: (academic) given 12 data points, attempt to fit an ARIMA(1,1,1) — show why the parameter estimates are unreliable. (Applied) explain to a statistician why the simpler method was chosen and under what conditions you'd upgrade.

---

## Phase 3 — The Accounting Identity

*The three-way forecast is a mathematical machine. This phase builds the constraint that holds it together.*

### Page 01: Double-Entry as a Conservation Law
- **Problem**: you project revenue, costs, assets, liabilities — 30+ line items. How do you ensure they're internally consistent?
- The fundamental accounting equation: `Assets = Liabilities + Equity`. This is a *conservation law* — value is never created or destroyed, only transferred between accounts.
- Every transaction touches at least two accounts. The equation holds after every single transaction.
- The three financial statements and how they connect:
  - P&L measures flows (revenue earned, costs incurred) over a period
  - Balance sheet measures stocks (what you own, what you owe) at a point in time
  - Cash flow statement reconciles the two: how did the stock of cash change given the flows?
- This is the mathematical *constraint* the entire model enforces. Break it and the model is wrong.

### Page 02: The P&L — Projected Flows
- **Problem**: given a revenue baseline, growth rate, and seasonal indices, project weekly P&L for 260 weeks.
- Revenue projection: `revenue(w) = base_weekly × (1+g)^((w-1)/52) × seasonality(month(w))`.
- Cost projection by CVP type:
  - COGS = revenue × (1 - gross_margin)
  - Fixed costs: each stream × `(1+inflation)^(year_fraction)`
  - Variable costs: each stream × `(1+growth)^(year_fraction)`
  - Residual: residual_monthly × `(1+blended)^(year_fraction)` × dampened_seasonal
- Depreciation: straight-line, `cost / (life × 52)` per week. Non-cash — sits in P&L but not cash flow.
- Interest expense: `loan_balance × (rate + spread) / 52`.
- Tax: `corp_tax = max(0, PBT × rate)`.
- Net profit: revenue - all costs - depreciation - interest - tax.
- **Exercises**: (academic) derive the net profit formula step by step, showing which terms are cash and which are non-cash. (Applied) given a set of assumptions, build a 12-week P&L by hand.

### Page 03: The Balance Sheet — Rolling Forward Stocks
- **Problem**: given this week's P&L and last week's balance sheet, what's this week's balance sheet?
- Roll-forward mechanics: `BS(w) = BS(w-1) + changes_from_PL(w) + changes_from_timing(w)`.
- Trade receivables: `revenue(w) × effective_DSO / 7`. Revenue earned but not yet collected.
- Trade payables: `COGS(w) × effective_DPO / 7`. Costs incurred but not yet paid.
- Tax accruals as current liabilities with periodic drainage:
  - VAT: `output_vat = revenue × vat_rate`, `input_vat = (COGS + cash_opex) × vat_rate`, `net = output - input`. Accumulates weekly, drains on the first week of each VAT quarter.
  - PAYE/NI: `paye_charge = staff_costs × 0.25`. Accumulates weekly, drains every 4th week.
  - Corporation tax: `corp_tax = max(0, PBT × rate)`. Accumulates weekly, drains annually.
  - Employer NI: `max(0, salary - threshold) × ni_rate`. Pension: `salary × pension_pct`.
  - Why timing matters: these liabilities are real cash drains at predictable intervals — missing them breaks the cash forecast.
- Fixed assets: PPE reduced by cumulative depreciation.
- Retained earnings: `prior_RE + net_profit - dividends`.
- **Cash as plug**: `cash = total_equity_and_liabilities - all_non_cash_assets`. This is the residual that forces `A = L + E` to hold every week. If cash goes negative, the business needs funding.
- **Exercises**: (academic) prove that cash-as-plug preserves A = L + E if and only if all other items are correctly computed. (Applied) roll forward a balance sheet for 4 weeks by hand including VAT and PAYE drains — verify A = L + E each week.

### Page 04: The Cash Flow Statement — Derived from Deltas
- **Problem**: you have this week's and last week's balance sheets. What were the actual cash movements?
- The indirect method (IAS 7): start from net profit, adjust for non-cash items, then adjust for working capital changes.
- Operating: `CFO = net_profit + depreciation - Δreceivables + Δpayables + ΔVAT + Δcorp_tax + ΔPAYE`
- Investing: `CFI = -capex`
- Financing: `CFF = new_borrowing + loan_repayments + dividends + equity_injections`
- Net: `ΔCash = CFO + CFI + CFF`. This MUST equal `cash(w) - cash(w-1)`. If it doesn't, there's a bug.
- Why indirect and not direct? (Direct counts actual cash receipts/payments — possible for 13 weeks where you know individual invoices, impossible for 5 years where you only have rates.)
- **Exercises**: (academic) prove that ΔCash = CFO + CFI + CFF follows algebraically from the accounting identity. (Applied) given two consecutive balance sheets, derive the full cash flow statement and verify closing cash ties.

---

## Phase 4 — Working Capital Dynamics

*The gap between earning revenue and receiving cash — and between incurring costs and paying them — is where businesses live or die.*

### Page 01: DSO, DPO, and the Cash Conversion Cycle
- **Problem**: a business earns £100k in January. When does the cash actually arrive?
- DSO: median days between invoice issuance and payment. Why median, not mean (one 180-day-late invoice shouldn't dominate).
- DPO: same concept for payables.
- CCC = DSO - DPO. Positive = cash locked up. Negative = suppliers finance you.
- The balance sheet connection: `receivables ≈ revenue × DSO/7`, `payables ≈ COGS × DPO/7`.
- **Exercises**: (academic) prove that CCC = 0 implies the business is self-financing its working capital. (Applied) given 30 invoices and 20 bills with dates, compute DSO, DPO, CCC, and the resulting receivables/payables on the balance sheet.

### Page 02: Trend Detection and Extrapolation
- **Problem**: DSO was 28, 31, 33, 36 over 4 quarters. What will it be in 2 years?
- Apply OLS from Phase 0 to quarterly DSO/DPO values.
- Trend as days-per-quarter: the slope.
- Linear extrapolation: `effective_DSO(week) = clamp(base_DSO + trend × (week/13), 7, 120)`.
- Why clamp? (DSO can't be < 7 days or > 120 days in practice.)
- DSO drag on cash receipts: `drag_factor = max(0.70, 1 - (trend × 4/365) × year)`. Only applied when trend > 1 day/quarter. The 70% floor prevents the drag from zeroing out revenue.
- **Exercises**: (academic) derive the drag factor formula and prove the 70% floor prevents receipts going negative. (Applied) given 8 quarters of DSO, compute trend, extrapolate effective DSO to week 156, compute the drag factor at each year boundary.

---

## Phase 5 — Uncertainty Quantification

*Every forecast is wrong. The question is: how wrong, and does the uncertainty grow in a principled way?*

### Page 01: Random Walks and Brownian Motion
- **Problem**: you forecast £50k cash at week 52. But each week's actual cash flow deviates from the projection. After 52 weeks of accumulated deviations, how wide is the uncertainty band?
- Independent random variables: if each week's error has variance σ², the sum of n independent errors has variance nσ².
- Standard deviation of the sum: `σ√n`. This is the *square root of time* rule.
- The Wiener process: continuous-time limit of a random walk. `W(t) ~ N(0, t)`. Standard deviation = `σ√t`.
- Why sqrt and not linear? (Deviations partially cancel — some weeks overshoot, some undershoot. Perfect cancellation would give zero growth; no cancellation would give linear growth. Sqrt is the mathematical truth for independent errors.)
- **Exercises**: (academic) simulate a 20-step random walk by hand (coin flips, +1/-1), compute cumulative deviation at each step, verify the standard deviation grows as √n not n. (Applied) explain to a CFO why the confidence band on week 52 is 7× wider than week 1, not 52× wider.

### Page 02: The Uncertainty Model
- **Problem**: design a function that maps "week number" to "uncertainty rate" for a forecast.
- The model: `σ(w) = min(BASE + k·√(w-1), MAX)` where `k = (MAX - BASE) / √(TOTAL_WEEKS - 1)`.
- BASE = 0.05 (5% uncertainty at week 1). MAX = 0.40 (40% cap).
- CV-informed base rate: businesses with erratic invoice sizes (high CV) start with higher base uncertainty. CV < 0.3 → 3%. CV > 0.6 → 8%. Otherwise → 5%.
- Fan charts: `spread = |balance| × σ(w)`. Lower bound = balance - spread. Upper bound = balance + spread.
- Reference: Bank of England fan charts (Britton, Fisher & Whitley 1998).
- **Exercises**: (academic) derive k from the boundary conditions BASE at w=1, MAX at w=TOTAL. (Applied) compute the full uncertainty schedule for 260 weeks and draw the fan chart by hand for a business with CV = 0.45.

### Page 03: Combining Independent Uncertainties
- **Problem**: the base forecast has uncertainty σ₁. A what-if scenario adds its own uncertainty σ₂. What's the total?
- Variance of a sum of independent variables: `Var(X+Y) = Var(X) + Var(Y)`.
- Therefore: `σ_total = √(σ₁² + σ₂²)`. This is *quadrature combination* — the same formula used in physics for measurement uncertainty.
- Why not just add the sigmas? (`σ₁ + σ₂` overestimates because it assumes worst cases always align.)
- Why not multiply? (Uncertainties are additive in variance, not in standard deviation.)
- Confidence intervals via z-scores: `half_width = z × σ × |estimate|`. z = 1.645 (90%), 1.96 (95%), 2.576 (99%).
- Normal distribution assumption: why it's reasonable here (sum of many small independent errors → CLT).
- **Exercises**: (academic) prove that quadrature gives a smaller total than simple addition, and explain geometrically why (Pythagoras). (Applied) a forecast has base σ = 0.12 and a scenario adds σ = 0.08 — compute the combined uncertainty and the 90%/95% confidence bands on a £200k balance.

---

## Phase 6 — Scenarios and Sensitivity

*The baseline forecast assumes nothing changes. Scenarios ask: what if something does?*

### Page 01: The Adjustment Algebra
- **Problem**: three stakeholders each want to modify the forecast. One says "revenue +10%", another says "add £5k/week", a third says "override to £80k/week." How do they compose?
- Three adjustment types: MULTIPLIER, DELTA, OVERRIDE.
- Application order: multiply first, then add deltas, then override replaces everything.
- Multiple multipliers multiply: `value × m₁ × m₂`. Multiple deltas sum: `value + d₁ + d₂`. Only one override (last wins).
- Why this order? (Multipliers are scale-invariant, deltas are not. Applying delta then multiplier would scale the delta, which is usually unintended.)
- Temporal shifts (DELAY): move cash flows `offset` weeks forward/backward. Values shifted beyond the window are lost.
- **Exercises**: (academic) prove that multiplier-then-delta is not commutative with delta-then-multiplier. (Applied) three stakeholders submit adjustments to the same forecast line — compose them and explain the final value to the CFO.

### Page 02: Fragment Application and Balance Cascade
- **Problem**: two macro signals both affect revenue: FX by -3% and inflation by +2%. If you apply -3% then +2% sequentially, you get a different result than +2% then -3%. How to avoid order dependence?
- Independent application: each fragment applies its percentage to the *original baseline*, not the running total. `delta = baseline × (pct/100) × intensity`.
- Why? Prevents compounding artifacts. The combined effect is additive in deltas, not multiplicative in factors.
- Balance cascade: after modifying any week, all subsequent opening/closing balances must be recalculated. `closing(w) = opening(w) + net(w)`, `opening(w+1) = closing(w)`. This is the cumulative sum invariant.
- Macro impacts: FX, interest rates, employer NI — each uses relative change × exposed amount.
- **Exercises**: (academic) prove that independent fragment application is commutative. (Applied) FX drops 5% and inflation rises 2% — apply both fragments to a 4-week forecast, cascade the balances, and compare against sequential application.

---

## Phase 7 — The Full Model Walkthrough

*Capstone. Rebuild the entire three-way forecast from a blank sheet, start to finish.*

### Page 01: From Ledger to Assumptions
- **Problem**: you have 18 months of accounting data. Derive every assumption the model needs.
- Compute: base monthly revenue, growth rate (clamped CAGR), seasonal indices (decompose, normalise, floor).
- Compute: DSO, DPO, trends, CCC.
- Compute: gross margin, fixed ratio, expense-to-revenue.
- Classify costs: fixed, variable, residual (after stripping depreciation).
- Detect recurring streams: group by (supplier, category), check CV < 0.35, classify frequency.
- Compute: capex rate, dividend payout, loan terms.
- Output: a single page of assumptions that drives everything downstream.
- **Exercises**: (academic) list every assumption and trace it back to the formula that produces it. (Applied) given 18 months of ledger data (invoices, bills, trial balance), derive the complete assumptions page.

### Page 02: The 260-Week Projection
- **Problem**: given the assumptions page, produce 260 weeks of three-way forecast.
- Week-by-week engine loop:
  1. Revenue: `base × growth^(w/52) × seasonal(month) × drag(year)`
  2. Costs by type: fixed × inflation, variable × growth, residual × blended × dampened_seasonal
  3. P&L: revenue - COGS - opex - depreciation - interest - tax = net profit
  4. BS roll-forward: receivables, payables, tax accruals, cash plug
  5. CF derivation: net profit + depreciation - Δreceivables + Δpayables + Δtax...
  6. Verify: CF closing cash = BS cash. A = L + E.
  7. Uncertainty: σ(w) via sqrt(t) model, fan chart bounds.
- Week-to-month aggregation: flows sum, stocks use last week.
- **Exercises**: (capstone) build a 12-week three-way forecast entirely by hand from given assumptions. Verify: P&L net profit flows into retained earnings, BS balances every week, CF closing cash = BS cash. This is the exam.

### Page 03: The 13-Week Direct Method
- **Problem**: for near-term cash forecasting, you have actual invoices and bills. How to use them?
- Direct method: match each invoice/bill to its expected payment week via due date.
- `receipts(w) = Σ(invoice amounts due in week w)`
- `disbursements(w) = Σ(bill amounts due in week w) + Σ(recurring stream amounts in week w)`
- `balance(w) = balance(w-1) + receipts(w) - disbursements(w)`
- When direct method has better accuracy and when rate-based method takes over.
- **Exercises**: (academic) prove that the direct method converges to the indirect method as the number of transactions per week grows large. (Applied) given 40 invoices and 25 bills with due dates, build a 4-week direct forecast and compare week 1-4 accuracy against the rate-based projection.

---

## Summary: What You Can Now Derive

After completing this course, you can reconstruct from memory:

| Component | Key formula | Phase |
|-----------|------------|-------|
| Seasonal indices | `SI(t) = x(t) / CMA(t)`, normalise to sum = 12 | 2 |
| Revenue projection | `base × (1+g)^(w/52) × S(month) × drag` | 1, 2 |
| Cost projection | Fixed × inflation, variable × growth, residual × blended × dampened | 1, 2, 3 |
| Trade receivables | `revenue × effective_DSO / 7` | 4 |
| Cash as plug | `cash = equity_and_liabilities - non_cash_assets` | 3 |
| Indirect CF | `CFO = NP + dep - ΔAR + ΔAP + Δtax...` | 3 |
| Uncertainty | `σ(w) = min(BASE + k√(w-1), MAX)` | 5 |
| Loan payment | `PMT = P·r / (1-(1+r)^(-n))` | 1 |
| Quadrature | `σ_total = √(σ₁² + σ₂²)` | 5 |
| Adjustment algebra | multiply → delta → override, independent fragments | 6 |

---

## Mathematician Biographies

Linked from history-boxes throughout the course. One page each:

| Mathematician | Linked from | Why included |
|---------------|-------------|--------------|
| **Carl Friedrich Gauss** | Phase 0 (regression) | Least squares method, "prince of mathematicians" |
| **Robert Brown / Norbert Wiener** | Phase 5 (uncertainty) | Brownian motion observed (Brown), formalised (Wiener) |
| **Luca Pacioli** | Phase 3 (accounting identity) | Codified double-entry bookkeeping in 1494 |
| **Britton, Fisher & Whitley** | Phase 5 (fan charts) | Bank of England fan chart methodology, 1998 |
| **Adrien-Marie Legendre** | Phase 0 (regression) | Published least squares before Gauss, priority dispute |
| **Francis Galton** | Phase 0 (regression) | Coined "regression to the mean", applied statistics to biology |

---

## Resolved Design Decisions

1. **13-week direct method**: separate page (Phase 7, Page 03).
2. **Recurring expense detection**: own page in Phase 0 (Page 05).
3. **Tax calculations**: woven into Phase 3 BS roll-forward (Page 03).
4. **Mathematician bios**: yes, six pages (see table above).
5. **Exercises**: both academic (derive/prove) and applied (accounting/forecasting context) in every page.
6. **Why not X-13ARIMA**: yes, own page in Phase 2 (Page 05).
