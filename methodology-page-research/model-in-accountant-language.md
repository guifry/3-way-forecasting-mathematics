# The Forecast Model in Accountant Language

A defensible methodology inventory for the three-way forecasting model, organised by accounting concept. Each item describes what the model does in operational terms, what professional standard or framework it draws on, what the user can override, and the limitations that remain.

This document is research material for a public methodology page. It is not a marketing document and does not gloss over weak spots.

---

## A. Revenue Forecasting

### A.1 Revenue baseline

**What the model does.** Sets the starting point for projected sales by averaging the most recent twelve months of paid invoices. Where less than twelve months of history exists, it uses what is available. Where less than six months exists, it cannot derive a baseline at all and the forecast falls back to the user's stated assumptions.

**Standards / framework.** Standard practice in management accounting and FP&A. Aligns with the AFP (Association for Financial Professionals) cash forecasting guidance on the use of trailing-twelve-month averages where transaction-level data is reliable. Consistent with CFA Institute corporate finance curriculum on revenue baselining for projection models.

**User override.** The base monthly revenue itself is computed automatically and is not a direct slider. The user can, however, adjust downstream growth and apply scenario events (new customer, lost customer, price change) that effectively reshape the implied baseline going forward.

**Limitations.** The baseline is only as honest as the paid-invoice ledger. Cash-basis bookkeeping irregularities (large prepayments, batched invoicing) will distort it. The twelve-month window deliberately ignores anything older to keep the baseline current; this means a business that has just emerged from a downturn will project from the depressed period rather than a long-run norm.

### A.2 Revenue growth rate

**What the model does.** Computes a year-on-year growth rate by comparing the average monthly revenue of the most recent twelve months against the prior twelve. Caps the result between minus twenty per cent and plus twenty-five per cent, on the philosophy that more extreme rates are usually noise rather than a sustainable trajectory.

**Standards / framework.** Simplified compound annual growth rate (CAGR) — standard in the CFA Institute Level I curriculum and ubiquitous in corporate finance textbooks (Brealey, Myers & Allen). The clamping is a conservatism choice consistent with prudence under IFRS and FRS 102 frameworks.

**User override.** Yes, fully overridable through both the slider interface and natural-language scenarios. The user can also override growth for a specific window of weeks (for example, "ten per cent for year one, then five per cent thereafter").

**Limitations.** The growth rate is a single annualised number applied uniformly to the projection horizon (subject to seasonality). It does not capture S-curves, market-saturation effects, or industry-specific growth-decay patterns. With less than twelve months of data the growth rate is treated as zero rather than estimated.

### A.3 Seasonality

**What the model does.** Extracts the monthly seasonal pattern of the business from at least twelve months of paid-invoice history using classical multiplicative decomposition (ratio-to-moving-average method). The result is twelve seasonal indices, one per calendar month, normalised so their sum equals twelve (no net annual inflation or deflation from seasonality alone).

A floor of 0.20 is applied to every index — even the quietest month is assumed to retain at least twenty per cent of average revenue — with iterative redistribution to preserve the sum-to-twelve invariant. This prevents pathological zero-revenue months from projecting zero revenue forever.

**Standards / framework.** The same mathematical core as the X-12-ARIMA / X-13ARIMA-SEATS family used by the US Census Bureau, the UK Office for National Statistics, and Eurostat — but the simpler non-parametric variant. The full ARIMA approach is deliberately not used (see limitation below). Documented in Makridakis, Wheelwright & Hyndman, *Forecasting: Methods and Applications*.

**User override.** The seasonal indices themselves are not directly slider-controlled. Where the user disagrees with the implied pattern, they can layer revenue events onto specific weeks to override the effect.

**Limitations.** Twelve to twenty-four months of history is too short for full ARIMA model identification — the ONS recommends seven years for X-13ARIMA. The simpler ratio-to-moving-average method extracts less signal but does not hallucinate patterns from noise. With less than twelve months of data, the model uses a flat seasonality of one. The 0.20 floor is a design choice, not a derived value.

### A.4 Customer concentration

**What the model does.** Reports the proportion of trailing-twelve-month revenue attributable to the top one, top three, and top five customers, plus the count of active customers.

**Standards / framework.** Standard credit-risk and equity-research disclosure metric. CFA Institute credit analysis curriculum treats customer concentration as a primary qualitative risk factor.

**User override.** Disclosure-only metric; not used as a forecast driver.

**Limitations.** Concentration is a snapshot, not a forecast input. The model does not currently propagate "what if we lose customer X" into the projection automatically — the user must convert that into a LOSE_CUSTOMER event manually.

### A.5 Revenue timing (DSO)

**What the model does.** Translates earned revenue into cash receipts by reference to the days-sales-outstanding metric (see C.1). Revenue earned in week W creates a trade receivable of `revenue × DSO / 7`, which clears as cash receipts on the timeline implied by the DSO.

**Standards / framework.** Standard working-capital convention. Aligns with CFA Institute and AFP treatments of receivables as a lag between income recognition and cash collection.

**User override.** DSO itself is overridable; the application of DSO to revenue is automatic.

**Limitations.** DSO is treated as a single median figure; the model does not preserve the full distribution of payment lags. Bulk payment terms (net-30, net-60) are flattened into the median.

---

## B. Cost Forecasting

### B.1 Cost-of-sales and gross margin

**What the model does.** Derives the gross margin from the trial balance — total cost-of-sales accounts divided by total revenue accounts, subtracted from one. Projects future cost-of-sales as `revenue × (1 − gross_margin)`, so cost-of-sales scales directly with sales.

**Standards / framework.** IFRS / FRS 102 presentation of gross profit. CIMA and CFA cost-accounting fundamentals (Horngren, *Cost Accounting*).

**User override.** Yes — gross margin is one of the nine sliders, and can be overridden in scenarios.

**Limitations.** Treats gross margin as constant across the forecast horizon. Real businesses see margin compression from input costs, customer mix, or volume discounts; the model does not auto-detect any of these.

### B.2 Cost classification (fixed vs variable)

**What the model does.** Classifies each detected recurring cost stream as either fixed (rent, insurance, fixed salaries, software subscriptions) or variable (commissions, transaction fees, materials). Classification is rule-based, drawing on FreeAgent category groups and account-name keywords.

**Standards / framework.** Cost-volume-profit (CVP) analysis — the foundational framework of CIMA P2 management accounting and Horngren's *Cost Accounting: A Managerial Emphasis*. Semi-variable costs are handled via the residual cost dampening (B.5).

**User override.** Not directly. The user influences classification by editing supplier categories in the source ledger.

**Limitations.** The fixed/variable label is binary. Genuinely semi-variable costs (electricity, with a fixed standing charge plus usage) are forced into one bucket. Classification confidence varies with how well-categorised the source ledger is.

### B.3 Recurring expense detection

**What the model does.** Detects recurring expense streams from the supplier-bill ledger. Groups bills by supplier and category, requires at least three occurrences, and accepts a stream only if both the interval between payments and the amount paid show a coefficient of variation below 0.35 (i.e. are sufficiently regular). Frequency is inferred from the median interval (weekly, fortnightly, monthly, quarterly, semi-annual, annual). Confidence is graded high or low based on tighter CV thresholds.

**Standards / framework.** Pattern-detection methodology aligned with that used by Plaid and other transaction-classification providers. No formal accounting standard governs this — it is a data-engineering layer that feeds the CVP framework downstream.

**User override.** Detection runs automatically on each sync. The user cannot directly edit detected streams, but can inject NEW_RECURRING_COST or CANCEL_RECURRING_COST events.

**Limitations.** Requires a minimum of three occurrences. Newly-onboarded recurring costs (started in the last quarter) will not be detected. Streams marked recurring directly in FreeAgent are accepted with high confidence regardless of detection.

### B.4 Residual costs

**What the model does.** Calculates a residual cost bucket equal to total cash operating expenses (P&L expenses minus depreciation) less cost-of-sales and less the named cost lines (staff, premises, marketing, insurance, professional fees). This captures everything that the trial-balance classification could not place into a named category. The residual is projected at a blended growth rate — the simple average of the inflation rate and the revenue growth rate — on the basis that an unclassified bucket inherently mixes fixed and variable costs.

**Standards / framework.** Honest treatment of unclassified costs. The blended-rate convention has no formal standard but is consistent with CIMA's treatment of mixed-cost behaviour where formal classification is unavailable.

**User override.** Not directly.

**Limitations.** This is the most opaque line in the cost projection. A large residual indicates the source ledger lacks granularity; in that case the projection's accuracy depends on the blended rate being a reasonable proxy for what the residual actually contains. Disclosed in the assumptions tab.

### B.5 Dampened seasonality on residual costs

**What the model does.** Applies seasonality to the residual cost bucket but reduces its amplitude by the fixed-cost ratio of the business. A business that is ninety per cent fixed sees almost no seasonal variation in residual costs; a business that is ninety per cent variable sees almost the full amplitude. The formula linearly interpolates between the two extremes.

**Standards / framework.** CIMA semi-variable cost modelling. Horngren's treatment of mixed costs.

**User override.** Not directly. The fixed-cost ratio is derived from the recurring-stream classification.

**Limitations.** The dampening assumes the residual has the same fixed/variable split as the named cost lines, which need not be the case.

### B.6 Depreciation

**What the model does.** Holds depreciation as a separate, non-cash line in the P&L. For the baseline, the figure is taken from the trial balance and held flat across the projection. For asset-purchase events, depreciation is computed straight-line over the asset's stated useful life.

**Standards / framework.** IAS 16 (Property, Plant and Equipment) and FRS 102 Section 17 — straight-line depreciation is the method used for the event-driven additions. The non-cash treatment in the cash-flow derivation aligns with IAS 7.

**User override.** The capex rate (which drives future PPE additions) is a slider. Useful life is set per asset-purchase event by the user.

**Limitations.** Reducing-balance and units-of-production methods are not supported. Existing PPE depreciation is held flat rather than amortised down to zero on its actual schedule.

### B.7 Salary costs

**What the model does.** Treats staff costs as a fixed cost that grows with inflation. For hire and fire events, the model computes the true employer cost as gross salary plus employer National Insurance (above the secondary threshold) plus employer pension contribution (default three per cent auto-enrolment minimum).

**Standards / framework.** UK HMRC payroll rules — the secondary NI threshold and rate, and the Pensions Act 2008 auto-enrolment minimum. CIMA staff-cost classification (typically fixed in the short run).

**User override.** Salary, NI threshold, NI rate and pension percentage can all be overridden per hire event. The general inflation slider also affects the trajectory.

**Limitations.** Pay rises are modelled only as inflation; bonuses, equity, share-based payments and salary-band progression are not modelled.

---

## C. Working Capital

### C.1 Days Sales Outstanding (DSO)

**What the model does.** Computes DSO as the median number of days between invoice issuance and payment, taken across all paid invoices in the trailing window. The median is preferred over the mean because a single late invoice should not dominate the metric.

**Standards / framework.** Standard working-capital metric documented across the AFP, ACT (Association of Corporate Treasurers), GFOA (Government Finance Officers Association) and CFA Institute credit-analysis curricula. Median is the conventional choice in modern treasury practice.

**User override.** Yes — DSO is one of the nine sliders.

**Limitations.** Requires at least ten paid invoices. A business with very few customers or a long sales cycle may not have enough data points to produce a stable DSO; in that case the model falls back to a default of thirty days.

### C.2 Days Payable Outstanding (DPO)

**What the model does.** Same construction as DSO but for paid bills against suppliers — the median days between bill issuance and payment.

**Standards / framework.** As C.1.

**User override.** Yes — DPO is one of the nine sliders.

**Limitations.** As C.1. Default of thirty days when fewer than ten paid bills are available.

### C.3 Cash conversion cycle

**What the model does.** Reports `CCC = DSO − DPO`. Inventory days are not separately tracked (most users are services or low-inventory businesses), so the CCC reduces to receivables-minus-payables timing.

**Standards / framework.** Standard CFA Institute and AFP measure. Note that the formal CFA definition is `DSO + DIO − DPO`; the model omits DIO (days inventory outstanding) as inventory data is not reliably available from FreeAgent.

**User override.** Derived from DSO and DPO sliders.

**Limitations.** Inventory-heavy businesses (manufacturers, retailers with stock) will see an understated CCC.

### C.4 DSO and DPO trends

**What the model does.** Detects whether collection or payment timing is worsening or improving over the recent quarters by fitting an ordinary-least-squares slope to quarterly median DSO/DPO values. Reports the trend in days-per-quarter.

**Standards / framework.** Trend analysis is standard in working-capital reviews. The method (OLS slope) is the simplest defensible approach for short series.

**User override.** Trends are not directly exposed as sliders but feed the effective DSO/DPO at each forecast week.

**Limitations.** Requires at least three quarters of paid-invoice data. Linear extrapolation has no theoretical reason to be correct beyond the immediate horizon; the model clamps effective DSO/DPO between seven and one hundred and twenty days as a sanity bound.

### C.5 DSO drag on cash receipts

**What the model does.** Where DSO is worsening by more than one day per quarter, the model applies a downward adjustment to projected cash receipts in the longer-horizon (five-year) forecast. The adjustment is bounded — it cannot reduce receipts below seventy per cent of the underlying revenue projection.

**Standards / framework.** No specific external standard. A prudence adjustment in line with IFRS / FRS 102 conservatism principles when there is observable deterioration in collection efficiency.

**User override.** Indirectly via the DSO slider and trend assumptions.

**Limitations.** Only applied to the rate-based five-year projection, not to the transaction-driven thirteen-week direct method.

---

## D. Tax Modelling

### D.1 Value Added Tax

**What the model does.** Calculates output VAT as `revenue × VAT rate` and input VAT as `(cost-of-sales + cash operating expenses) × VAT rate`. The net (`output − input`) accumulates as a current liability week by week, and drains to zero on the first week of each VAT quarter, modelling the actual cash payment to HMRC.

**Standards / framework.** UK HMRC VAT rules. The default rate is the standard twenty per cent. The quarterly drain pattern follows HMRC's standard VAT return cycle.

**User override.** The VAT rate is currently held at the standard rate by default. The quarter calendar (months in which returns are due) is configurable but defaults to January / April / July / October.

**Limitations.** Flat-rate scheme, partial exemption, reverse charge, and the cash-accounting scheme are not modelled. The model assumes the user is on standard accrual VAT. Mid-quarter registration changes are not supported.

### D.2 PAYE and Employer NI

**What the model does.** Accumulates a payroll-tax liability of twenty-five per cent of staff costs each week and drains it to zero every fourth week, modelling the monthly PAYE / NI payment to HMRC.

**Standards / framework.** UK HMRC PAYE and NI rules. The twenty-five per cent figure is a blended approximation of employee PAYE, employee NI, employer NI and apprenticeship levy as a share of gross salary cost — defensible as an aggregate but not exact for any specific employee.

**User override.** Not directly slider-controlled. Hire events expose a more precise calculation (salary, NI threshold, NI rate, pension percentage).

**Limitations.** The flat twenty-five per cent rate is an aggregate, not an employee-by-employee calculation. High earners, salary-sacrifice arrangements, and tax-coded variations are not captured.

### D.3 Corporation Tax

**What the model does.** Calculates corporation tax each week as `max(0, profit before tax × rate)`. The accrued liability accumulates and drains annually, nine months after the financial-year end (HMRC's standard payment deadline for non-large companies).

**Standards / framework.** HMRC corporation-tax rules. Default rate is the prevailing main rate (currently twenty-five per cent). The nine-month payment lag is the standard rule for companies below the £1.5m profit threshold; larger companies pay quarterly, which the model does not currently model.

**User override.** Yes — the corporation tax rate is one of the nine sliders. The financial-year-end month is configurable.

**Limitations.** The small-profits rate, marginal relief, group relief, capital allowances, R&D tax credits, and the quarterly-instalment regime for large companies are not modelled. Tax is computed on accounting profit, not adjusted taxable profit.

---

## E. Three-statement Integration

### E.1 P&L → BS → CF linkage

**What the model does.** Builds the three financial statements in sequence and ensures they are internally consistent. The P&L is projected first. The balance sheet is then rolled forward week by week, drawing on the P&L outputs (net profit, depreciation, working-capital implications). The cash flow statement is finally derived from the changes in balance-sheet positions, using the indirect method.

**Standards / framework.** Standard corporate financial-modelling methodology as taught by the Corporate Finance Institute (CFI), Wall Street Prep, Macabacus and the AFP cash-forecasting curriculum. The three-statement linkage is the foundational structure of every defensible operating model.

**User override.** Not relevant — this is the structural backbone of the model.

**Limitations.** None at this level; the integration is the model's entire purpose.

### E.2 Accounting identity enforcement

**What the model does.** Enforces `Assets = Liabilities + Equity` at every weekly close throughout the projection. Any deviation is reported as a balance-check error.

**Standards / framework.** Luca Pacioli's double-entry framework (1494). Embedded in IFRS, FRS 102 and every accounting framework derived from them.

**User override.** Not overridable — this is a hard invariant.

**Limitations.** The model can only enforce the identity if all non-cash items are correctly computed; it does not detect economic errors that happen to balance arithmetically.

### E.3 Cash as plug

**What the model does.** Computes all non-cash balance-sheet items first — receivables, payables, tax liabilities, fixed assets, equity, retained earnings, debt — and then sets cash as the residual that forces total assets to equal total equity and liabilities. This means cash is an output of the balance sheet, not an input.

**Standards / framework.** Standard practice in three-way financial modelling (CFI, Wall Street Prep, Macabacus). The technique is sometimes called "cash plug", "cash sweep" or "balance-sheet plug".

**User override.** Not overridable — cash is structurally derived.

**Limitations.** A negative cash plug indicates the business needs funding that is not yet in the model. The model surfaces this but does not automatically inject borrowing.

### E.4 Indirect cash flow derivation

**What the model does.** Derives the cash flow statement using the indirect method — starting from net profit, adding back non-cash charges (principally depreciation), then adjusting for changes in working-capital balances (receivables, payables, VAT, corporation tax, PAYE) and overlaying investing and financing flows (capex, new borrowing, repayments, dividends, equity).

**Standards / framework.** IAS 7 *Statement of Cash Flows* (indirect method); FRS 102 Section 7. The structure is exactly that prescribed by these standards.

**User override.** Not directly — the cash flow statement is a derived output.

**Limitations.** The direct method is used in the thirteen-week near-term forecast (see I.1). The indirect method is correct for longer horizons where transaction-level data does not exist.

### E.5 Internal verification

**What the model does.** At every week, checks two invariants: total assets equals total equity and liabilities (the accounting identity), and cash flow closing cash equals balance-sheet cash. Both are reported on the output.

**Standards / framework.** Standard financial-model integrity checks. Required by every reputable financial-modelling style guide (FAST, ICAEW Financial Modelling Code).

**User override.** Not overridable — these are diagnostics.

**Limitations.** Tolerance is set tight (effectively zero for properly-rounded figures). Any breach is an engine bug, not a user input issue.

---

## F. Capital and Financing

### F.1 Loan amortisation

**What the model does.** When a new loan event is injected, the model computes a fixed periodic payment using the present-value-of-annuity formula, then splits each payment into interest (on the remaining balance) and principal (the rest). The remaining balance amortises down over the loan's term.

**Standards / framework.** The standard amortising-loan formula, derived from the geometric series. Underpins the ACT and CFA debt-instrument curricula and every commercial loan calculator.

**User override.** Loan principal, term, rate, and start week are all user-supplied per loan event.

**Limitations.** Interest-only loans, balloon loans, and revolving facilities are not first-class concepts; they would have to be modelled via custom events.

### F.2 Interest expense

**What the model does.** Computes weekly interest expense on the outstanding loan balance as `balance × (BoE base rate + loan spread) / 52`. The Bank of England base rate is fed from a regularly-updated external feed; the spread defaults to three per cent.

**Standards / framework.** Standard variable-rate interest computation. The use of the BoE base rate as the reference is the UK convention; an equivalent reference (SOFR, ESTR) would be used in other jurisdictions.

**User override.** BoE base rate is one of the nine sliders. Loan spread is set per loan.

**Limitations.** Assumes all debt is variable-rate against the BoE base rate. Fixed-rate debt is not separately modelled (the user can pin the rate via the slider for the relevant period).

### F.3 Capital expenditure

**What the model does.** Projects ongoing capex as a percentage of revenue, with the percentage derived from historical depreciation as a proxy for replacement spending (capped at fifteen per cent of revenue). One-off capex is handled via the asset-purchase event, which adds to PPE on the balance sheet and creates a depreciation stream in the P&L.

**Standards / framework.** Depreciation-as-proxy is a standard heuristic in CFI and Wall Street Prep modelling guides for businesses without explicit capex plans. The asset-purchase event treatment aligns with IAS 16.

**User override.** Capex percentage is one of the nine sliders. Asset purchases are user-supplied events.

**Limitations.** The depreciation-as-proxy assumption is rough; it implicitly assumes the business is in steady-state replacement, which growth-stage businesses are not.

### F.4 Dividends

**What the model does.** Projects ongoing dividends as a percentage of net profit, with the percentage derived from the trailing P&L (dividends paid / total distributable profit, capped at one hundred per cent). One-off dividends are handled via the dividend-payment event.

**Standards / framework.** Standard payout-ratio approach in CFA equity valuation curricula.

**User override.** Dividend payout percentage is one of the nine sliders. Specific dividend payments are user-supplied events.

**Limitations.** Treats dividend policy as mechanical. Most owner-managed UK businesses set dividends through tax-driven optimisation, which the model does not perform.

### F.5 Equity injection

**What the model does.** Handled solely through the equity-injection event — the user specifies an amount and a week. The amount adds to share capital on the balance sheet and to financing inflows on the cash flow statement.

**Standards / framework.** Aligned with IFRS / FRS 102 treatment of share issuance.

**User override.** Equity injection is event-driven only.

**Limitations.** Share premium, multiple share classes, and dilution mechanics are not modelled.

---

## G. Uncertainty Quantification

### G.1 Forecast uncertainty model

**What the model does.** Produces a confidence band around the cash forecast that widens with the forecast horizon. The width grows as the square root of time — uncertainty at week one hundred is ten times the uncertainty at week one, not one hundred times. The base uncertainty rate at week one is between three and eight per cent depending on how volatile the business's invoice sizes are; the rate is capped at forty per cent at the longest horizon.

**Standards / framework.** The square-root-of-time rule derives from the Wiener process and is the standard treatment of cumulative-error uncertainty in financial forecasting. The Bank of England's *Inflation Report* fan charts (Britton, Fisher & Whitley, 1998) are the canonical reference for representing forecast uncertainty as a widening band. The same square-root-of-time rule underpins the Black-Scholes option-pricing model.

**User override.** Not directly user-controlled.

**Limitations.** The model uses a simplified, symmetric fan — the full Bank of England methodology uses asymmetric bands calibrated to historical forecast errors, which would require longer error histories than are available for SMB-level forecasting. The bands assume errors are independent week to week; serially-correlated shocks (a recession, a price war) will produce real-world deviations larger than the bands suggest.

### G.2 What the bands mean

**What the model does.** Translates the uncertainty rate at each forecast week into confidence bounds using standard normal-distribution z-scores: 1.645 for ninety per cent, 1.96 for ninety-five per cent, 2.576 for ninety-nine per cent. The bands are applied symmetrically above and below the point forecast.

**Standards / framework.** Standard inferential-statistics convention; in every introductory statistics textbook and in the CFA quantitative-methods curriculum.

**User override.** The user selects which confidence level (typically ninety or ninety-five per cent) to display.

**Limitations.** Symmetry is an approximation. Cash flow distributions are typically right-skewed (large upside transactions, bounded downside) — the symmetric band overstates downside probability and understates upside.

### G.3 Combining uncertainties

**What the model does.** Where multiple independent uncertainty sources contribute (the base forecast plus a what-if scenario), the model combines them in quadrature — sum of squares, then square root. This is the correct treatment for independent variances.

**Standards / framework.** Error-propagation formula from physics and the CFA risk-management curriculum. Same logic as portfolio-variance addition.

**User override.** Automatic.

**Limitations.** Assumes uncertainty sources are independent; correlated sources (a recession affecting both revenue and bad debt) would produce a larger combined uncertainty than quadrature suggests.

---

## H. Scenario Analysis

### H.1 Driver overrides

**What the model does.** The model exposes nine assumption "drivers" that the user can override either through sliders or via natural-language scenarios: revenue growth, gross margin, inflation, DSO, DPO, corporation tax rate, capex percentage, dividend payout, and BoE base rate. Each override applies from a specified start week onward, optionally for a specified duration. Where multiple overrides for the same driver overlap, the latest start week wins.

**Standards / framework.** Standard sensitivity-analysis pattern in three-way modelling (FAST modelling standards, ICAEW Financial Modelling Code).

**User override.** This is the user-override mechanism.

**Limitations.** Only nine drivers are exposed. Any other parameter (VAT rate, financial year end, employer NI rate) requires either a custom event or a code-level change.

### H.2 Adjustment composition (multipliers, deltas, overrides)

**What the model does.** In the thirteen-week and five-year forecasts, three types of adjustments compose: percentage multipliers (scale), absolute deltas (add or subtract), and overrides (replace). They apply in a fixed order — multipliers first, then deltas, then overrides. Multiple multipliers multiply together; multiple deltas sum; only the latest override survives.

**Standards / framework.** No formal external standard. The compositional algebra is a pragmatic choice that gives stakeholders a clear answer when their adjustments collide.

**User override.** This is the override surface.

**Limitations.** Order-dependence is real and documented — a delta of plus £5,000 followed by a multiplier of 1.1 yields a different result from the reverse order. The chosen order (multipliers first) prevents the delta from being scaled.

### H.3 Macro propagation (rates, FX, inflation)

**What the model does.** Macro factors (BoE base rate, employer NI, employer pension, CPI, FX rates, commodity prices) flow into the forecast through several channels. The base rate flows into interest expense and into the smart-causal forecast as an "interest rate fragment" affecting debt service. CPI flows into the inflation assumption used for fixed-cost growth. FX flows into a currency fragment that adjusts the GBP-equivalent of foreign-currency exposed revenue or costs. Employer NI changes flow into a payroll-cost fragment.

Each macro fragment computes a relative change against a baseline factor value and applies that change times the business's exposure (e.g., debt balance for the rate fragment, foreign-currency revenue for the FX fragment).

**Standards / framework.** Standard sensitivity analysis. The Bank of England macroeconomic framework provides the BoE base rate; the Frankfurter API and the Federal Reserve FRED database provide FX and commodity prices; HMRC publishes the corporation tax, NI, and living wage parameters.

**User override.** The macro factors update automatically from external sources but the user can override the inflation rate (slider), corporation tax rate (slider) and BoE base rate (slider). FX exposure and commodity exposure are derived from the business profile.

**Limitations.** Exposure estimates (e.g. "seventy per cent of debt service is interest", "sixty per cent of payroll is subject to NI") are aggregate approximations. Pass-through assumptions are simplified — a base-rate change does not, for instance, model the timing lag of fixed-rate debt rollovers.

---

## I. Event Modelling

The model supports seventeen event types. Each is translated into a stream of weekly P&L and balance-sheet effects that overlay the baseline projection.

### I.1 Hire / fire employee

**P&L effect.** Weekly staff cost equal to (annual salary + employer NI + employer pension) divided by fifty-two, applied from the start week. Fire reverses the addition.

**BS effect.** Indirect — through PAYE/NI accruals on the balance sheet.

**Standard.** UK HMRC employer payroll rules; Pensions Act 2008 auto-enrolment.

### I.2 Hire / lose contractor

**P&L effect.** Adds to other operating expenses at the stated monthly cost (no NI or pension applied, consistent with contractor treatment).

**BS effect.** None directly.

**Standard.** Contractors are treated as bought-in services, not payroll.

### I.3 New / lost customer, price change

**P&L effect.** Adds or removes monthly revenue from the start week. Price changes apply a multiplier to the affected revenue.

**BS effect.** Indirect — through trade receivables and VAT.

**Standard.** Standard treatment.

### I.4 Asset purchase (cash and financed)

**P&L effect.** Adds straight-line depreciation over the stated useful life (cost / life / 52 per week).

**BS effect.** Adds to PPE on the balance sheet (week one only). Financed variant adds to bank loans and creates a corresponding amortisation schedule.

**Standard.** IAS 16; FRS 102 Section 17.

### I.5 New loan, loan repayment

**P&L effect.** Interest expense per the amortisation schedule (see F.1).

**BS effect.** Adds to bank loans on drawdown; reduces them on each scheduled principal payment or one-off repayment.

**Standard.** IFRS 9 / FRS 102 amortised-cost loan treatment.

### I.6 New / cancel recurring cost

**P&L effect.** Adds or removes a recurring cost line at the stated monthly cost. Cost is allocated to the user-specified P&L line (premises, professional fees, etc.).

**BS effect.** Indirect through trade payables.

**Standard.** CIMA expense recognition.

### I.7 Dividend payment, equity injection

**P&L effect.** None (dividends are not a P&L item under IFRS / FRS 102).

**BS effect.** Dividend reduces retained earnings on the payment week; equity injection adds to share capital on the receipt week. Cash flow shows the corresponding financing-flow movement.

**Standard.** IFRS / FRS 102 equity treatment.

### I.8 Investment property

**P&L effect.** Adds rental revenue, depreciation, and ongoing maintenance.

**BS effect.** Adds the property to PPE on week one.

**Standard.** IAS 40 *Investment Property* — note that the model treats it as PPE rather than at fair value; this is a simplification.

### I.9 Issue invoice (one-off)

**P&L effect.** Adds the full invoice amount to revenue in a single week.

**BS effect.** Creates a trade receivable on the issue week, clearing as cash on a timeline based on DSO. A mini-ledger inside the engine tracks each one-off receivable independently from the steady-state DSO calculation, to avoid double-counting.

**Standard.** Revenue recognition under IFRS 15 / FRS 102 Section 23 — recognised on issue, collected when received.

### I.10 Custom event

**P&L effect.** User-specified recurring effects per P&L line.

**BS effect.** User-specified initial and recurring effects per BS line.

**Standard.** Escape hatch for events not fitting the prebuilt categories.

---

## J. Verification and Internal Consistency

### J.1 Accounting identity check

**What the model does.** At every weekly close of the balance sheet, the model verifies that total assets equals total equity plus total liabilities. Any breach is reported as a non-zero balance-check field on the output.

**Standards / framework.** The fundamental accounting equation. Required by every modelling standard.

**Limitations.** Tolerance is effectively zero. A non-zero balance check is always an engine-level bug, not a user data problem.

### J.2 Cash flow / balance sheet tie

**What the model does.** At every week, the closing cash on the cash flow statement must equal the cash and bank line on the balance sheet. Any breach is reported as a non-zero `bs_cash_check` field.

**Standards / framework.** Standard three-statement integrity check (FAST, ICAEW Financial Modelling Code).

**Limitations.** As J.1.

### J.3 Cumulative-balance invariant

**What the model does.** Throughout the engine, the rule `closing(w) = opening(w) + net(w)` and `opening(w+1) = closing(w)` is preserved. Where any week's cash flows are modified by an adjustment or event, all subsequent opening and closing balances are recalculated.

**Standards / framework.** Standard cash-flow modelling discipline.

**Limitations.** The recalculation is automatic; user error in scenarios cannot break this invariant.

### J.4 Seasonality sum-to-twelve invariant

**What the model does.** The sum of the twelve seasonal indices is held at exactly twelve, before and after the floor / redistribution step. This guarantees that seasonality redistributes revenue across months rather than inflating or deflating annual totals.

**Standards / framework.** Standard property of multiplicative seasonal decomposition.

---

## K. Data Handling and Edge Cases

### K.1 Minimum data requirements

**Revenue baseline.** At least six months of paid invoices (otherwise no baseline).

**Growth rate.** At least twelve months (otherwise zero growth).

**Seasonality.** At least twelve months (otherwise flat seasonality of one).

**DSO / DPO.** At least ten paid invoices / bills (otherwise default of thirty days).

**DSO / DPO trend.** At least three quarters of paid data (otherwise no trend).

**Customer concentration.** At least ten paid invoices with contact data.

**Recurring-stream detection.** At least three occurrences per supplier-category pair, with both interval CV and amount CV below 0.35.

**Standards / framework.** These thresholds are pragmatic minimums for statistical reliability, not standards-prescribed values. They are documented in the assumptions output.

### K.2 Fallbacks for missing data

Every derived assumption has a documented default that the model uses when source data is insufficient. The default values are:

- Revenue growth rate: five per cent
- Gross margin: one hundred per cent (i.e., no cost of sales — only used as a placeholder when no COGS accounts exist)
- Inflation: three per cent
- DSO and DPO: thirty days
- Corporation tax: twenty-five per cent
- VAT: twenty per cent
- BoE base rate: five per cent
- Loan spread: three per cent
- Capex percentage: zero
- Dividend payout: zero
- Fixed ratio: zero (treated as fully variable when there are no recurring streams)
- Financial year end month: March

Each assumption carries a "source" tag (derived or default) so the user can see at a glance which assumptions are evidence-based and which are placeholders.

### K.3 Outlier treatment

**What the model does.** Uses the median rather than the mean for payment-timing metrics (DSO, DPO, recurring intervals and amounts), which limits the influence of any single outlier. For invoice-size distribution, reports percentiles (P25, P50, P75, P90) rather than a single mean. For growth rate, clamps the result to a band of minus twenty per cent to plus twenty-five per cent.

**Standards / framework.** Standard robust-statistics practice.

**Limitations.** No formal outlier-detection (Tukey fences, z-score filters). The model relies on robust statistics rather than removing outliers explicitly.

### K.4 Currency and FX

**What the model does.** All forecasts are produced in the home currency (GBP for FreeAgent UK users). Foreign-currency invoices and bills are translated at the prevailing rate from the Frankfurter API. The macro engine generates an FX impact fragment for businesses with material foreign-currency exposure.

**Standards / framework.** IAS 21 / FRS 102 Section 30 *Foreign Currency Transactions*.

**Limitations.** No hedge accounting. Multi-currency forecasting is not supported as a primary mode.

---

## L. The Role of AI / Large Language Models

The forecast engine itself is entirely procedural. Every formula, every projection, every balance-sheet line is computed by deterministic code following the methodology described above. No part of the financial calculation is delegated to a language model.

The only role of the LLM is at the user interface: translating natural-language scenarios ("what if I hire two engineers in June and lose my biggest customer in September") into the structured driver overrides and event injections that the procedural engine then consumes. The LLM produces, in effect, a structured request object — it does not produce numbers, balances, or projections.

Specifically, the LLM:

- Parses free-text scenario descriptions into a list of typed driver overrides (driver, value, start week, duration) and accounting events (event type, parameters)
- Disambiguates timing references ("next quarter", "from June") into specific forecast weeks
- Maps colloquial cost categories ("our marketing spend", "office rent") to the model's structured P&L lines

The LLM does not:

- Compute any P&L line, balance-sheet position, or cash-flow figure
- Choose any growth rate, margin, or assumption value
- Override any modelling rule
- Affect the verification or accounting-identity checks

This separation is deliberate. It means the model's output is fully reproducible from a given set of inputs (assumptions, overrides, events) regardless of which LLM produced those inputs, and that the auditability of the engine is entirely independent of the LLM's reasoning.

The smart-causal forecast layer, which propagates macro-economic factor changes into the thirteen-week forecast, is also entirely procedural — it uses the macro factor feeds and the business-profile data to compute each impact fragment without invoking the LLM.

---

## Closing notes on defensibility

The model rests on a small number of well-established methodological pillars:

- **CVP cost classification** (Horngren, CIMA P2) for the cost projection
- **Classical multiplicative seasonal decomposition** (Makridakis, Wheelwright & Hyndman; the simpler cousin of US Census Bureau X-13ARIMA-SEATS) for revenue seasonality
- **Working-capital metrics** (CFA Institute, AFP, ACT, GFOA) for DSO, DPO, CCC and their use in receivables and payables projection
- **The accounting identity** (Pacioli; IFRS / FRS 102) enforced as a hard constraint via cash-as-plug
- **IAS 7 indirect cash flow method** for the derivation of operating, investing and financing cash flows
- **HMRC tax rules** for VAT, PAYE, NI and corporation tax timing
- **Standard amortising-loan mathematics** for debt service
- **The Wiener-process square-root-of-time rule** (Britton, Fisher & Whitley, 1998; Black-Scholes) for forecast uncertainty

What the model does not claim:

- It is not a parametric time-series model. ARIMA, exponential smoothing, state-space models and Bayesian structural models are deliberately not used because the typical user has twelve to twenty-four months of data — too short for reliable parametric identification.
- It does not perform Monte Carlo simulation. Uncertainty is communicated through analytic confidence bands, not by sampling.
- It does not perform inventory accounting beyond what the source ledger provides.
- It does not optimise for tax efficiency or working-capital efficiency — it projects what is, not what could be.
- It is not, and does not claim to be, a substitute for the work of an accountant. It is a tool that gives accountants and finance leaders a defensible projection to start from.
