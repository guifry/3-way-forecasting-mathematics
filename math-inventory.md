# Mathematical Inventory: Taisk Forecast Engine

Complete inventory of every mathematical concept, method, algorithm, and statistical technique used in the Taisk 3-way forecasting application. Extracted from codebase at `~/projects/taisk-forecast-backend`.

---

## 1. Time Series Methods

### 1.1 Centred Moving Average (CMA)

- **What it is**: A 12-month moving average with half-weights at endpoints, used as a low-pass filter to remove annual seasonal periodicity from a time series. Mathematically equivalent to convolving the series with a rectangular kernel of length 12 whose frequency response has a zero at frequency 1/12 (annual cycle).
- **Formula**: `CMA(t) = (0.5*x(t-6) + x(t-5) + ... + x(t+5) + 0.5*x(t+6)) / 12`
- **Where used**: `backend/app/business_metrics/domain/services/seasonality.py` :: `compute_seasonal_indices()` -- two consecutive 12-point moving averages are computed and then averaged to produce the centred MA.
- **Why used**: Isolates the trend component from monthly revenue data, so that dividing actual values by CMA yields the seasonal-irregular ratio.
- **Dependencies**: Convolution, Fourier analysis (for understanding why 12-month window eliminates annual frequency), signal processing (low-pass filter concept).
- **Third-party libs**: None -- hand-implemented with Python arithmetic.

### 1.2 Ratio-to-Moving-Average Seasonal Decomposition

- **What it is**: Classical multiplicative time series decomposition. Assumes `x(t) = T(t) * S(t) * I(t)` (trend * seasonal * irregular). Divides actual values by CMA to get seasonal-irregular ratios, then averages ratios by calendar month across years to cancel the irregular component, leaving seasonal indices.
- **Formula**: `SI(t) = x(t) / CMA(t)`, then `raw_index(m) = mean(SI(t) for all t where month(t)=m)`, normalised so sum = 12.0.
- **Where used**: `backend/app/business_metrics/domain/services/seasonality.py` :: `compute_seasonal_indices()`. Also used with hardcoded fallback values in `backend/app/forecasting/domain/services/five_year/seasonality.py` :: `MONTHLY_SEASONALITY`.
- **Why used**: Extracts the seasonal revenue pattern for a specific business from paid invoice history. Applied as multipliers in the 5-year revenue projection and (dampened) to residual costs.
- **Dependencies**: CMA (1.1), multiplicative decomposition model.
- **Third-party libs**: None.
- **References**: Same mathematical core as X-12-ARIMA / X-13ARIMA-SEATS (US Census Bureau, ONS, Eurostat). Makridakis, Wheelwright & Hyndman textbook.

### 1.3 Seasonal Index Floor with Iterative Redistribution

- **What it is**: Clamps all seasonal indices to a minimum floor (0.20), then redistributes the surplus across unclamped months to preserve the sum-to-12 invariant. Iterates up to 5 times to handle cascading cases where redistribution pushes another index below the floor.
- **Formula**: For each floored month, `deficit += INDEX_FLOOR - value`. Free months are shrunk by `(free_total - deficit) / free_total`.
- **Where used**: `backend/app/business_metrics/domain/services/seasonality.py` :: `_apply_floor()`.
- **Why used**: Prevents zero-revenue months from producing a zero seasonal index that would project zero revenue for that month forever. The 0.20 floor means "even in the quietest month, revenue is at least 20% of average".
- **Dependencies**: Seasonal decomposition (1.2).
- **Third-party libs**: None.

### 1.4 Seasonal Normalisation

- **What it is**: Rescales 12 raw seasonal indices so they sum to exactly 12.0, ensuring no net seasonal effect over a full year.
- **Formula**: `normalised(m) = raw(m) * 12 / sum(raw)`
- **Where used**: `backend/app/business_metrics/domain/services/seasonality.py` :: `compute_seasonal_indices()`.
- **Why used**: Guarantees that applying seasonal multipliers doesn't inflate or deflate annual totals.
- **Dependencies**: None.

---

## 2. Growth Rate Methods

### 2.1 Revenue Growth Rate (Simplified CAGR)

- **What it is**: Year-over-year growth rate derived from comparing the average monthly revenue of the most recent 12 months against the prior period. Clamped to [-20%, +25%].
- **Formula**: `rate = (recent_12mo_avg / prior_12mo_avg) - 1`, clamped to `[-0.20, 0.25]`. Returns `None` if fewer than 6 months of data; returns 0 if fewer than 12 months.
- **Where used**: `backend/app/business_metrics/domain/services/revenue.py` :: `compute_revenue_growth_rate()`. Consumed by both the 5-year engine and the three-way engine.
- **Why used**: Provides a data-driven annual growth rate for projecting revenue over 5 years.
- **Dependencies**: Arithmetic mean, ratio comparison.
- **Third-party libs**: None.
- **Note**: The documentation describes full CAGR `(end/start)^(1/years) - 1` but the implementation uses a simpler ratio minus one, which is equivalent when years=1.

### 2.2 Continuous Compounding (Weekly Growth Factor)

- **What it is**: Applies the annual growth rate continuously across weeks rather than in discrete annual steps.
- **Formula**: `growth_factor(w) = (1 + g) ^ ((w-1) / 52)` where g is the annual growth rate.
- **Where used**: `backend/app/forecasting/domain/services/five_year/engine.py` :: `derive_five_year_baseline()` line 109. `backend/app/three_way/domain/services/pl_engine.py` :: `project_pl()` line 145.
- **Why used**: Produces smooth weekly growth without artificial step discontinuities at year boundaries. Identical annual totals to discrete compounding at year boundaries.
- **Dependencies**: Exponential functions, compound interest mathematics.
- **Third-party libs**: Python `Decimal.__pow__`.

### 2.3 Inflation Compounding

- **What it is**: Same continuous compounding formula applied to fixed costs (inflation rate) and variable costs (revenue growth rate).
- **Formula**: `inflation_factor(w) = (1 + inflation) ^ year_fraction`
- **Where used**: `backend/app/three_way/domain/services/pl_engine.py` :: `project_pl()`. `backend/app/forecasting/domain/services/five_year/engine.py` :: `derive_five_year_baseline()`.
- **Why used**: Fixed costs (rent, salaries, insurance) grow with inflation. Variable costs grow with revenue.
- **Dependencies**: Same as 2.2.

### 2.4 Blended Growth Rate for Residual Costs

- **What it is**: Arithmetic mean of inflation rate and revenue growth rate, used to project the unclassified "residual" cost bucket.
- **Formula**: `blended_rate = (inflation + growth) / 2`
- **Where used**: `backend/app/forecasting/domain/services/five_year/engine.py` :: `derive_five_year_baseline()` line 94. `backend/app/three_way/domain/services/pl_engine.py` :: `project_pl()` line 159.
- **Why used**: The residual is a mix of fixed and variable costs that couldn't be classified. A blended rate is the honest middle ground. See ADR-006.
- **Dependencies**: Arithmetic mean.

---

## 3. Uncertainty Quantification

### 3.1 Square Root of Time (Wiener Process) Uncertainty Decay

- **What it is**: Forecast uncertainty grows proportionally to the square root of time, derived from the mathematical properties of a Wiener process (Brownian motion). The standard deviation of a cumulative sum of independent random variables grows as sqrt(n).
- **Formula**: `uncertainty_rate(w) = min(BASE + k * sqrt(w-1), MAX)` where `k = (MAX - BASE) / sqrt(TOTAL_WEEKS - 1)`. BASE = 0.05, MAX = 0.40.
- **Where used**: `backend/app/forecasting/domain/services/five_year/engine.py` :: `calculate_weekly_uncertainty()` and module-level `UNCERTAINTY_SQRT_K`. `backend/app/three_way/domain/services/uncertainty.py` :: `calculate_three_way_uncertainty()`.
- **Why used**: Models the natural deceleration of forecast uncertainty -- near-term uncertainty grows quickly (things are genuinely uncertain week to week), but the growth rate diminishes over time because positive and negative deviations partially cancel.
- **Dependencies**: Wiener process / Brownian motion theory, variance of independent random variables, the central limit theorem.
- **Third-party libs**: `math.sqrt` (three_way), `Decimal.sqrt()` (five_year).
- **References**: Bank of England fan charts (Britton, Fisher & Whitley 1998). Black-Scholes option pricing model uses sigma*sqrt(T) for the same reason.

### 3.2 CV-Informed Base Uncertainty Rate

- **What it is**: The starting uncertainty rate (at week 1) is adjusted based on the coefficient of variation of the business's invoice amounts. More volatile invoice sizes = higher base uncertainty.
- **Formula**: If CV < 0.3: base = 0.03. If CV > 0.6: base = 0.08. Otherwise: base = 0.05.
- **Where used**: `backend/app/forecasting/domain/services/five_year/engine.py` :: `calculate_weekly_uncertainty()`. `backend/app/three_way/domain/services/uncertainty.py` :: `_select_base_rate()`.
- **Why used**: Adapts uncertainty to the specific business's revenue predictability.
- **Dependencies**: Coefficient of variation (3.3).

### 3.3 Quadrature Combination of Uncertainties

- **What it is**: Independent uncertainty sources are combined by adding their variances (sum of squares) and taking the square root. This is the standard error propagation formula for independent variables.
- **Formula**: `total_sigma = sqrt(sigma_1^2 + sigma_2^2 + ... + sigma_n^2)`
- **Where used**: `backend/app/forecasting/domain/services/uncertainty/heuristic.py` :: `_combine_quadrature()`, `_calculate_adjustment_sigma()`, `_calculate_fragment_sigma()`.
- **Why used**: Combines base forecast uncertainty with adjustment-specific uncertainty (from what-if scenarios) in a mathematically principled way.
- **Dependencies**: Variance addition for independent random variables, error propagation.
- **Third-party libs**: `math.sqrt`.

### 3.4 Normal Distribution Z-Scores for Confidence Intervals

- **What it is**: Uses z-scores from the standard normal distribution to convert a sigma (standard deviation) into confidence interval bounds.
- **Values**: 90% -> z=1.645, 95% -> z=1.96, 99% -> z=2.576.
- **Formula**: `half_width = z * sigma * |point_estimate|`, bounds = `point_estimate +/- half_width`.
- **Where used**: `backend/app/forecasting/domain/services/uncertainty/heuristic.py` :: `CONFIDENCE_Z_SCORES`, `_create_uncertain_value()`.
- **Why used**: Translates uncertainty (sigma) into user-facing confidence bands.
- **Dependencies**: Normal (Gaussian) distribution, probability theory.

### 3.5 Symmetric Spread Uncertainty (Simplified Fan Chart)

- **What it is**: Simplified version of Bank of England fan charts. Single confidence band computed as `spread = |balance| * uncertainty_rate`, applied symmetrically above and below the point forecast.
- **Formula**: `lower = closing_balance - spread`, `upper = closing_balance + spread`.
- **Where used**: Five-year engine and three-way engine uncertainty calculation (both sqrt-based, see 3.1).
- **Why used**: Communicates that predictions are less certain at longer horizons. Simplified from BoE approach (which uses probability densities, asymmetric bands, and historical error calibration).
- **Dependencies**: 3.1.

---

## 4. Statistical Measures

### 4.1 Median

- **What it is**: Middle value of an ordered dataset. More robust to outliers than the mean.
- **Where used**: DSO/DPO computation (`backend/app/business_metrics/domain/services/payment.py` :: `compute_dso()`, `compute_dpo()`). Recurring expense detection (`backend/app/recurring/domain/services/detector.py` :: `_source2_patterns()` for median interval and median amount). Quarterly DSO/DPO for trend analysis.
- **Why used**: A single 180-day-late invoice shouldn't dominate the DSO calculation. Median is the standard choice for payment timing metrics.
- **Third-party libs**: `statistics.median`.

### 4.2 Mean (Arithmetic Average)

- **What it is**: Sum of values divided by count.
- **Where used**: Base monthly revenue (`revenue.py` :: `compute_base_monthly_revenue()`), seasonal index averaging, monthly invoice count, expense-to-revenue ratio computation.
- **Why used**: Used to compute baselines and averages where outlier robustness is less critical.
- **Third-party libs**: `statistics.mean` (in detector), manual `sum/len` elsewhere.

### 4.3 Standard Deviation

- **What it is**: Square root of variance. Measures dispersion of a dataset from its mean.
- **Formula**: `stdev = sqrt(sum((x_i - mean)^2) / (n-1))` (sample standard deviation).
- **Where used**: `backend/app/business_metrics/domain/services/quality.py` :: `compute_invoice_distribution()` for computing CV. `backend/app/recurring/domain/services/detector.py` :: `_cv()`.
- **Why used**: Component of coefficient of variation. Measures how spread out invoice amounts or payment intervals are.
- **Third-party libs**: `statistics.stdev`.

### 4.4 Coefficient of Variation (CV)

- **What it is**: Ratio of standard deviation to mean. A dimensionless measure of relative variability. CV = stdev / mean.
- **Where used**: `backend/app/recurring/domain/services/detector.py` :: `_cv()` for interval and amount regularity checks. `backend/app/business_metrics/domain/services/quality.py` :: `compute_invoice_distribution()` for invoice amount volatility.
- **Why used**: Recurring expense detection: reject streams with CV > 0.35 (too irregular). Uncertainty calibration: CV informs the base uncertainty rate (3.2). Confidence scoring: CV < 0.20 = high confidence, CV < 0.35 = low confidence.
- **Dependencies**: Standard deviation, mean.
- **Third-party libs**: `statistics.stdev`, `statistics.mean`.

### 4.5 Percentiles / Quantiles

- **What it is**: Values below which a given percentage of observations fall. P25 = 25th percentile, P50 = median, P75 = 75th percentile, P90 = 90th percentile.
- **Where used**: `backend/app/business_metrics/domain/services/quality.py` :: `compute_invoice_distribution()`.
- **Why used**: Characterises the distribution of invoice amounts. Feeds the assumptions tab and LLM context for scenario interpretation.
- **Third-party libs**: `statistics.quantiles(amounts, n=100)`.

### 4.6 Simple Linear Regression (OLS Slope)

- **What it is**: Ordinary least squares regression to find the slope of a trend line through sequential data points. Specifically, the slope coefficient from regressing y on x where x is the time index.
- **Formula**: `slope = sum((x_i - x_mean)(y_i - y_mean)) / sum((x_i - x_mean)^2)`
- **Where used**: `backend/app/business_metrics/domain/services/payment.py` :: `_linear_slope()`, consumed by `compute_dso_trend()` and `compute_dpo_trend()`.
- **Why used**: Determines whether DSO or DPO is worsening (positive slope = customers taking longer to pay or business taking longer to pay suppliers) over the last several quarters.
- **Dependencies**: Least squares method, basic algebra.
- **Third-party libs**: None -- hand-implemented.

---

## 5. Financial Ratios and Accounting Methods

### 5.1 Days Sales Outstanding (DSO)

- **What it is**: Median number of days between invoice issuance and payment receipt. A key working capital metric.
- **Formula**: `DSO = median((paid_on - issued_on).days for each paid invoice)`
- **Where used**: `backend/app/business_metrics/domain/services/payment.py` :: `compute_dso()`. Used in three-way BS engine to compute trade receivables.
- **Why used**: Controls how quickly revenue converts to cash. Used in balance sheet projection (receivables = revenue * DSO / 7) and as a DSO drag on 5-year cash receipts.
- **Dependencies**: Median (4.1).
- **References**: CFA credit analysis curriculum, AFP working capital management.

### 5.2 Days Payable Outstanding (DPO)

- **What it is**: Median number of days between bill issuance and payment. Same concept as DSO but for payables.
- **Formula**: `DPO = median((paid_on - issued_on).days for each paid bill)`
- **Where used**: `backend/app/business_metrics/domain/services/payment.py` :: `compute_dpo()`. Used in three-way BS engine for trade payables.
- **Why used**: Controls how quickly costs translate to cash outflows. Trade payables = cost_of_sales * DPO / 7.
- **Dependencies**: Median (4.1).

### 5.3 Cash Conversion Cycle (CCC)

- **What it is**: The number of days cash is tied up in the operating cycle. Positive = cash locked up (you pay before getting paid). Negative = suppliers finance you.
- **Formula**: `CCC = DSO - DPO`
- **Where used**: `backend/app/business_metrics/domain/services/orchestrator.py` :: `compute_business_metrics()`.
- **Why used**: A single metric summarising working capital efficiency. Reported in business metrics.
- **Dependencies**: DSO (5.1), DPO (5.2).

### 5.4 DSO/DPO Trend (Linear Slope)

- **What it is**: Rate of change in quarterly median DSO or DPO, measured as days per quarter via linear regression.
- **Formula**: Linear regression slope on quarterly median DSO/DPO values (see 4.6).
- **Where used**: `backend/app/business_metrics/domain/services/payment.py` :: `compute_dso_trend()`, `compute_dpo_trend()`.
- **Why used**: Worsening DSO trend erodes future cash position. Used as DSO drag in the 5-year engine and to project effective DSO/DPO in the three-way BS engine.
- **Dependencies**: Linear regression (4.6), quarterly grouping.

### 5.5 DSO Drag on Cash Receipts

- **What it is**: Adjusts projected cash receipts downward when DSO is worsening, with a floor at 70%.
- **Formula**: `dso_annual_drag = dso_trend * 4 / 365`, `drag_factor = max(0.70, 1 - dso_annual_drag * year)`, `receipts *= drag_factor`. Only applied when `dso_trend > 1` day/quarter.
- **Where used**: `backend/app/forecasting/domain/services/five_year/engine.py` :: `derive_five_year_baseline()` lines 111-114.
- **Why used**: Captures the erosion of cash collection efficiency over time when customers increasingly delay payment.
- **Dependencies**: DSO trend (5.4).

### 5.6 Effective DSO/DPO with Trend Projection

- **What it is**: Projects the effective DSO/DPO at a given week by extrapolating the quarterly trend, clamped to [7, 120] days.
- **Formula**: `effective_dso(week) = clamp(base_dso + trend * (week / 13), 7, 120)`
- **Where used**: `backend/app/three_way/domain/services/bs_engine.py` :: `_effective_dso()`, `_effective_dpo()`.
- **Why used**: The three-way balance sheet needs DSO/DPO at each forecast week, accounting for ongoing trends.
- **Dependencies**: DSO trend (5.4), linear extrapolation.

### 5.7 Gross Margin

- **What it is**: Proportion of revenue remaining after cost of goods sold. `margin = 1 - (COGS / revenue)`.
- **Where used**: `backend/app/three_way/domain/services/assumptions.py` :: `_derive_gross_margin()`. Used throughout the three-way P&L engine.
- **Why used**: Determines how much of each pound of revenue is consumed by direct costs. Core driver of profitability projection.
- **Dependencies**: Basic ratio.

### 5.8 Expense-to-Revenue Ratio

- **What it is**: Total monthly recurring expenses divided by monthly income.
- **Formula**: `expense_to_revenue = total_monthly_recurring / (income / period_months)`
- **Where used**: `backend/app/recurring/domain/services/expense_analyser.py` :: `compute_expense_analysis()`.
- **Why used**: Measures operational efficiency. Fed to LLM for context enrichment.
- **Dependencies**: Period-normalisation (`period_months = days / 30.44`).

### 5.9 Customer Concentration

- **What it is**: Percentage of total revenue attributable to the top 1, 3, and 5 customers.
- **Formula**: Group invoices by customer, sort by revenue descending, compute cumulative share of top N.
- **Where used**: `backend/app/business_metrics/domain/services/quality.py` :: `compute_customer_concentration()`.
- **Why used**: Measures revenue risk. High concentration = losing one customer has severe cash flow impact.
- **Dependencies**: Sorting, cumulative summation.

### 5.10 Fixed Ratio (Fixed Cost Proportion)

- **What it is**: Proportion of total recurring expenses classified as fixed costs.
- **Formula**: `fixed_ratio = total_fixed / total_monthly_recurring`
- **Where used**: `backend/app/recurring/domain/services/expense_analyser.py` :: `compute_expense_analysis()`.
- **Why used**: Determines operating leverage. Used to dampen seasonal effects on costs (5.11) and calibrate the residual cost projection.
- **Dependencies**: CVP analysis (6.1).

### 5.11 Dampened Residual Seasonality

- **What it is**: Reduces the amplitude of seasonal variation on the residual cost bucket by the fixed cost ratio. Pure fixed costs have no seasonal variation; pure variable costs have full seasonal variation.
- **Formula**: `dampened_factor = 1 + (seasonal_index - 1) * (1 - fixed_ratio)`
- **Where used**: `backend/app/forecasting/domain/services/five_year/engine.py` line 116-117. `backend/app/three_way/domain/services/pl_engine.py` line 161.
- **Why used**: The residual cost bucket contains both fixed and variable costs. Applying full seasonality to rent (fixed) overstates seasonal cost swings. The dampening is proportional to the business's actual cost structure.
- **Dependencies**: Seasonal indices (1.2), fixed ratio (5.10), CVP analysis (6.1).
- **References**: CIMA CVP semi-variable cost modelling. ADR-014.

### 5.12 Capex Rate Derivation

- **What it is**: Capital expenditure as a percentage of revenue, derived from historical depreciation relative to income.
- **Formula**: `capex_pct = min(0.15, depreciation / income)`
- **Where used**: `backend/app/three_way/domain/services/assumptions.py` :: `_derive_capex()`.
- **Why used**: Proxy for ongoing capital investment. Depreciation approximates replacement capex.
- **Dependencies**: Basic ratio, proxy reasoning.

### 5.13 Dividend Payout Ratio

- **What it is**: Proportion of net profit distributed as dividends.
- **Formula**: `dividend_pct = min(1, dividends / (retained_profit + dividends))`
- **Where used**: `backend/app/three_way/domain/services/assumptions.py` :: `_derive_dividend_pct()`.
- **Why used**: Drives the split between retained earnings and dividend payments in the balance sheet.
- **Dependencies**: Basic ratio.

---

## 6. Cost Accounting Methods

### 6.1 Cost-Volume-Profit (CVP) Analysis

- **What it is**: Fundamental framework classifying costs by behaviour: fixed (independent of revenue), variable (proportional to revenue), or semi-variable (fixed base + variable component). `Total Cost = Fixed + (Variable per Unit * Volume)`.
- **Where used**: Category mapper (`backend/app/recurring/domain/services/category_mapper.py`), expense analysis (`expense_analyser.py`), the entire cost projection in both 5-year and three-way engines.
- **Why used**: Determines how each cost category should grow in projections. Fixed costs grow with inflation, variable costs grow with revenue.
- **Dependencies**: Management accounting fundamentals.
- **References**: CIMA P2 syllabus, Horngren's "Cost Accounting".

### 6.2 Residual Cost Calculation

- **What it is**: The unclassified cost residual computed by subtracting all identified recurring stream costs and COGS from total P&L expenses (after stripping depreciation).
- **Formula**: `residual = max(0, (|P&L expenses| - |depreciation|) / period_months - COGS_monthly - named_opex_total_monthly)`
- **Where used**: `backend/app/three_way/domain/services/pl_engine.py` :: `_compute_residual_monthly()`. `backend/app/forecasting/domain/services/five_year/engine.py` :: lines 91-93.
- **Why used**: Captures all expenses not attributable to specific categories. Projected at the blended growth rate.
- **Dependencies**: Depreciation stripping, CVP analysis (6.1).

### 6.3 Depreciation Stripping

- **What it is**: Removing non-cash depreciation charges from P&L expenses to produce a cash-basis cost figure.
- **Formula**: `cash_expenses = P&L_expenses - depreciation`
- **Where used**: `backend/app/ingestion/domain/ports/accounting_client.py` :: `weekly_operating_expense()`. `backend/app/three_way/domain/services/pl_engine.py` :: `_compute_residual_monthly()`. Depreciation identified from trial balance by nominal code prefix 606 or name keywords.
- **Why used**: Cash flow forecasts must be cash-basis. Depreciation is a non-cash charge that inflates residual costs if not stripped.
- **Dependencies**: Accounting classification.
- **References**: IAS 7, CIMA, AFP, Wall Street Prep. ADR-020.

### 6.4 Frequency Normalisation (Weekly/Monthly Conversion)

- **What it is**: Converting expense amounts between different payment frequencies using fixed multipliers.
- **Multipliers**: Weekly * 4.33 = monthly. Monthly * 1 = monthly. Quarterly * 1/3 = monthly. Annual * 1/12 = monthly. Monthly / 4.33 = weekly. Etc.
- **Where used**: `backend/app/forecasting/domain/services/five_year/engine.py` :: `FREQUENCY_TO_MONTHLY`, `FREQUENCY_TO_WEEKLY`. `backend/app/recurring/domain/services/expense_analyser.py` :: `_normalise_to_monthly()`.
- **Why used**: All recurring streams have different payment frequencies. They must be normalised to a common frequency for comparison and summation.
- **Dependencies**: Proportional reasoning.

---

## 7. Forecasting Frameworks

### 7.1 Direct Method Cash Flow Forecasting (13-Week)

- **What it is**: Transaction-level cash flow projection matching individual invoices and bills to the weeks they're expected to be paid, based on due dates.
- **Formula**: `receipts(w) = sum(invoice.amount where invoice.due_date in [w.start, w.end])`, `disbursements(w) = sum(bill.amount ...) + sum(recurring_stream.amount ...)`, `balance(w) = balance(w-1) + receipts(w) - disbursements(w)`.
- **Where used**: `backend/app/forecasting/domain/services/forecast_strategy.py` :: `DirectMethodForecastStrategy`.
- **Why used**: Highest accuracy for near-term forecasting where individual transaction data is available.
- **Dependencies**: Date matching, cumulative summation.
- **References**: IAS 7, AFP treasury guides.

### 7.2 Indirect Method Cash Flow Forecasting (5-Year)

- **What it is**: Rate-based projection using revenue baseline, growth rates, cost ratios, and seasonality rather than individual transactions.
- **Formula**: `receipts(w) = base_weekly_revenue * growth_factor(w) * seasonality(w) * drag_factor(w)`, `disbursements(w) = fixed_costs(w) + variable_costs(w) + residual_costs(w)`.
- **Where used**: `backend/app/forecasting/domain/services/five_year/engine.py` :: `derive_five_year_baseline()`.
- **Why used**: Works at any horizon. Individual transactions don't exist 5 years out; rate models project from trends.
- **Dependencies**: Growth compounding (2.2), seasonal indices (1.2), CVP cost classification (6.1).
- **References**: AFP, CFI, Wall Street Prep.

### 7.3 Three-Way Forecast (P&L -> Balance Sheet -> Cash Flow)

- **What it is**: A linked three-statement financial model. P&L is projected first, then the balance sheet is rolled forward using P&L outputs and working capital assumptions, and finally the cash flow statement is derived from changes in BS positions. Cash is the "plug" that forces the balance sheet to balance every week.
- **Where used**: `backend/app/three_way/domain/services/orchestrator.py` :: `compute_three_way_forecast()`. P&L: `pl_engine.py`. BS: `bs_engine.py`. CF: `cf_engine.py`.
- **Why used**: Produces internally consistent financial statements. The BS must balance (`total_assets == total_equity_and_liabilities`) every week, and CF closing cash must equal BS cash.
- **Dependencies**: All of the above -- this is the integration layer.
- **References**: Standard corporate financial modelling methodology.

### 7.4 Cash as Plug (Balance Sheet Balancing)

- **What it is**: After computing all non-cash balance sheet items, cash is determined as the residual that makes the balance sheet balance: `cash = total_equity_and_liabilities - non_cash_assets`.
- **Where used**: `backend/app/three_way/domain/services/bs_engine.py` :: `roll_forward_bs()` line 139. Also `backend/app/three_way/domain/services/orchestrator.py` :: `_recompute_cash_plug()`.
- **Why used**: Ensures the accounting identity `Assets = Liabilities + Equity` holds at every time step.
- **Dependencies**: Double-entry bookkeeping, accounting identity.

### 7.5 Indirect Cash Flow Statement Derivation

- **What it is**: Derives operating, investing, and financing cash flows by computing the changes (deltas) in balance sheet positions between periods, starting from net profit and adding back non-cash charges.
- **Formula**: `CFO = net_profit + depreciation - delta_receivables + delta_payables + delta_VAT + delta_corp_tax + delta_PAYE + delta_other_WC`. `CFI = -capex`. `CFF = new_borrowing + loan_repayments + dividends + equity_injections`. `Net CF = CFO + CFI + CFF`.
- **Where used**: `backend/app/three_way/domain/services/cf_engine.py` :: `derive_cf()`.
- **Why used**: Standard indirect method for cash flow statements. Reconciles the P&L to actual cash movement via working capital adjustments.
- **Dependencies**: Balance sheet roll-forward (7.4), all working capital metrics.
- **References**: IAS 7.

---

## 8. Loan and Debt Mathematics

### 8.1 Amortising Loan Payment (Present Value of Annuity)

- **What it is**: Calculates the fixed periodic payment for a fully amortising loan using the standard annuity formula.
- **Formula**: `payment = principal * r / (1 - (1+r)^(-n))` where r = periodic rate, n = number of periods.
- **Where used**: `backend/app/three_way/domain/services/event_injection.py` :: `_new_loan()` line 152.
- **Why used**: When a NEW_LOAN event is injected, the engine needs to compute the fixed weekly payment to split between interest and principal.
- **Dependencies**: Present value of annuity, geometric series.

### 8.2 Loan Amortisation Schedule (Interest/Principal Split)

- **What it is**: For each payment period, interest is computed on the remaining balance, and the remainder of the fixed payment goes to principal reduction.
- **Formula**: `interest_w = remaining * weekly_rate`, `principal_w = payment - interest_w`, `remaining -= principal_w`.
- **Where used**: `backend/app/three_way/domain/services/event_injection.py` :: `_new_loan()` lines 167-179.
- **Why used**: Determines how much of each loan payment hits the P&L (interest expense) vs the balance sheet (loan reduction).
- **Dependencies**: Annuity payment (8.1).

### 8.3 Interest Expense Calculation

- **What it is**: Periodic interest on outstanding loan balance using the BoE base rate plus a spread.
- **Formula**: `interest_expense = loan_balance * (boe_rate + loan_spread) / 52`
- **Where used**: `backend/app/three_way/domain/services/pl_engine.py` :: `project_pl()` line 171.
- **Why used**: Captures the ongoing cost of debt in the P&L projection.
- **Dependencies**: Simple interest calculation.

---

## 9. Tax and Regulatory Calculations

### 9.1 Corporation Tax

- **What it is**: Tax on profit before tax, applied as a flat rate.
- **Formula**: `corporation_tax = max(0, profit_before_tax * corp_tax_rate)`
- **Where used**: `backend/app/three_way/domain/services/pl_engine.py` :: `project_pl()` line 174. Also recalculated after event injection in `orchestrator.py`.
- **Why used**: Corporation tax is a material cash outflow. The three-way engine tracks it as a current liability that drains annually.
- **Dependencies**: None mathematically; derives rate from HMRC data.

### 9.2 VAT Calculation (Output - Input)

- **What it is**: Net VAT payable = output VAT (on sales) minus input VAT (on purchases). Accumulates quarterly and drains on the first week of each VAT quarter.
- **Formula**: `output_vat = revenue * vat_rate`, `input_vat = (COGS + cash_opex) * vat_rate`, `net_vat = output - input`.
- **Where used**: `backend/app/three_way/domain/services/bs_engine.py` :: `roll_forward_bs()` lines 98-104.
- **Why used**: VAT is a significant timing element in UK SMB cash flow. Quarterly VAT payments create predictable cash drains.
- **Dependencies**: Basic ratio, periodic accumulation and drainage.

### 9.3 PAYE/NI Accrual

- **What it is**: Payroll taxes accumulate monthly from staff costs and drain on each 4th week.
- **Formula**: `paye_charge = staff_costs * 0.25` (PAYE_RATE). Drains monthly (`week % 4 == 0`).
- **Where used**: `backend/app/three_way/domain/services/bs_engine.py` :: lines 113-117.
- **Why used**: Models the timing of payroll tax payments as a current liability.

### 9.4 Employer NI Contribution

- **What it is**: National Insurance paid by the employer on earnings above the secondary threshold.
- **Formula**: `employer_ni = max(0, salary - threshold) * ni_rate`
- **Where used**: `backend/app/forecasting/domain/services/employer_cost_calculator.py` :: `_calculate_employer_ni()`. Also `backend/app/three_way/domain/services/event_injection.py` :: `_hire_employee()`.
- **Why used**: True employer cost is salary + NI + pension. NI is a material above-salary cost.
- **Dependencies**: Threshold-based tax calculation.

### 9.5 Employer Pension Contribution

- **What it is**: Auto-enrollment minimum pension contribution applied as a flat percentage of salary.
- **Formula**: `pension = salary * pension_rate` (default 3%).
- **Where used**: `backend/app/forecasting/domain/services/employer_cost_calculator.py` :: `_calculate_employer_pension()`. Also event injection.
- **Dependencies**: Flat rate multiplication.

---

## 10. Pattern Detection and Classification

### 10.1 Recurring Expense Detection (Statistical Pattern Matching)

- **What it is**: Groups paid bills by (supplier, category) and detects regular payment patterns using median interval, interval CV, and amount CV. Requires >= 3 occurrences. Rejects if interval CV > 0.35 or amount CV > 0.35.
- **Where used**: `backend/app/recurring/domain/services/detector.py` :: `_source2_patterns()`.
- **Why used**: Automatically discovers recurring expenses (rent, subscriptions, etc.) from transaction history to feed the forecast cost model.
- **Dependencies**: Median (4.1), CV (4.4), frequency classification.
- **References**: Plaid recurring transaction detection methodology.

### 10.2 Frequency Classification from Median Interval

- **What it is**: Maps the median payment interval (in days) to a frequency category using defined ranges.
- **Ranges**: 5-10 days = weekly, 11-18 = fortnightly, 25-35 = monthly, 80-100 = quarterly, 170-200 = semi-annual, 340-400 = annual.
- **Where used**: `backend/app/recurring/domain/services/detector.py` :: `_classify_frequency()`.
- **Why used**: Converts continuous interval data into discrete frequency categories for projection.
- **Dependencies**: Median (4.1).

### 10.3 Confidence Scoring

- **What it is**: Assigns confidence levels based on CV thresholds. CV < 0.20 for both interval and amount = HIGH. Otherwise = LOW.
- **Where used**: `backend/app/recurring/domain/services/detector.py` :: `_source2_patterns()`.
- **Why used**: Communicates how reliable the detection is. High-confidence streams are more trustworthy for forecasting.
- **Dependencies**: CV (4.4).

### 10.4 Trial Balance Classification (Keyword + Nominal Code)

- **What it is**: Classifies trial balance accounts into P&L lines using a priority system: (1) FreeAgent category group lookup, (2) regex keyword matching on account names, (3) nominal code range fallback.
- **Where used**: `backend/app/three_way/domain/services/classification.py` :: `classify_trial_balance()`.
- **Why used**: The three-way engine needs classified accounts to derive gross margin, named opex lines, and depreciation.
- **Dependencies**: Regex pattern matching, accounting chart of accounts conventions.

---

## 11. Scenario and Adjustment Mathematics

### 11.1 Multiplier/Delta/Override Adjustment Model

- **What it is**: Three types of adjustments applied in a specific order: (1) multipliers scale the base value, (2) deltas add/subtract from the scaled value, (3) overrides replace entirely. Multiple adjustments of the same type combine (multipliers multiply, deltas sum).
- **Where used**: `backend/app/forecasting/domain/services/adjustment_engine.py` :: `apply_scenario_adjustments()`. `backend/app/forecasting/domain/services/five_year/engine.py` :: `apply_adjustments_to_projections()`.
- **Why used**: Provides a composable framework for what-if scenarios. Multipliers for percentage changes, deltas for absolute amounts, overrides for fixed values.

### 11.2 DELAY Adjustment (Temporal Shift)

- **What it is**: Shifts cash flows forward or backward in time by a specified number of weeks.
- **Formula**: Cash flow at week `i` is moved to week `i + offset`. Values shifted beyond the forecast window are lost.
- **Where used**: `backend/app/forecasting/domain/services/adjustment_engine.py` :: DELAY handling. `backend/app/forecasting/domain/services/five_year/engine.py` :: delay loop at line 278.
- **Why used**: Models payment timing changes (e.g. "customers start paying 4 weeks late", "negotiate 60-day terms with suppliers").

### 11.3 ImpactFragment Application (Independent Percentage)

- **What it is**: Each ImpactFragment's percentage is applied independently on the original baseline (not on the running total). This prevents compounding artifacts when multiple fragments affect the same component.
- **Formula**: For PERCENTAGE: `delta = baseline * (value / 100) * intensity`, applied independently. REPLACEMENT takes precedence over all other types.
- **Where used**: `backend/app/forecasting/domain/services/fragment_applicator.py` :: `apply_fragments_to_week()`.
- **Why used**: Ensures that macro signal impacts are additive rather than multiplicative, preventing unintended compounding.

### 11.4 Balance Cascade Recalculation

- **What it is**: After modifying any week's cash flows, all subsequent weeks' opening/closing balances must be recalculated since each week's opening balance equals the previous week's closing balance.
- **Where used**: `backend/app/forecasting/domain/services/adjustment_engine.py` :: `_recalculate_balances()`. `backend/app/forecasting/domain/services/fragment_applicator.py` :: `cascade_balances()`. `backend/app/forecasting/domain/services/five_year/engine.py` :: `_recalculate_week_balances()`.
- **Why used**: Maintains the cumulative sum invariant: `closing(w) = opening(w) + net(w)` and `opening(w+1) = closing(w)`.

### 11.5 Driver Override Resolution (Latest-Start-Week Wins)

- **What it is**: When multiple driver overrides overlap for the same driver at the same week, the one with the latest start_week takes precedence.
- **Where used**: `backend/app/three_way/domain/services/driver_overrides.py` :: `get_driver_value()`.
- **Why used**: Allows temporal layering of assumptions (e.g. "5% growth for year 1, then 3% from week 53").

---

## 12. Macro Impact Calculations

### 12.1 FX Rate Impact (Currency Exposure)

- **What it is**: Calculates the cash flow impact of exchange rate movements based on the business's currency exposure fraction.
- **Formula**: `rate_change = (current - baseline) / baseline`, `impact = exposed_amount * rate_change * (-1)` (GBP strengthening reduces GBP-equivalent of foreign revenue).
- **Where used**: `backend/app/forecasting/domain/services/macro_fragment_generator.py` :: `_generate_currency_fragment()`.
- **Why used**: Businesses with foreign currency revenue or costs are exposed to exchange rate movements.
- **Dependencies**: Relative change calculation, exposure weighting.

### 12.2 Interest Rate Pass-Through

- **What it is**: Calculates how BoE base rate changes affect debt service costs, assuming 70% of debt service is interest.
- **Formula**: `interest_change_factor = (current_rate / baseline_rate) - 1`, `impact = debt_baseline * 0.70 * interest_change_factor`.
- **Where used**: `backend/app/forecasting/domain/services/macro_fragment_generator.py` :: `_generate_base_rate_fragment()`.
- **Why used**: Variable-rate debt costs change with the base rate.
- **Dependencies**: Proportional change, exposure estimation.

### 12.3 Employer NI Impact Calculation

- **What it is**: Estimates the payroll cost impact of NI rate changes, assuming 60% of payroll is subject to NI.
- **Formula**: `rate_change_decimal = (current - baseline) / 100`, `impact = payroll * 0.60 * rate_change_decimal`.
- **Where used**: `backend/app/forecasting/domain/services/macro_fragment_generator.py` :: `_generate_employer_ni_fragment()`.
- **Dependencies**: Proportional approximation.

---

## 13. Aggregation Methods

### 13.1 Week-to-Month Aggregation (Week-Start Attribution)

- **What it is**: Groups weekly projections into months by assigning each week to the month of its start date. Flow variables (revenue, costs) are summed. Stock variables (closing balance, BS positions) use the last week's value.
- **Where used**: `backend/app/forecasting/domain/services/five_year/engine.py` :: `aggregate_weeks_to_months()`. `backend/app/three_way/domain/services/aggregation.py` :: all three aggregate functions.
- **Why used**: Monthly reporting is the accounting standard. Lenders expect monthly figures.
- **Dependencies**: Date grouping, summation vs last-value logic.

### 13.2 Period Months Calculation

- **What it is**: Converts a date range to months using 30.44 as the average days per month.
- **Formula**: `period_months = (to_date - from_date).days / 30.44`
- **Where used**: `backend/app/three_way/domain/services/pl_engine.py` :: `_compute_period_months()`. `backend/app/recurring/domain/services/expense_analyser.py`.
- **Why used**: Normalises P&L figures from arbitrary date ranges to monthly rates.

---

## 14. Event Injection Mathematics

### 14.1 Straight-Line Depreciation

- **What it is**: Depreciates an asset evenly over its useful life.
- **Formula**: `weekly_depreciation = cost / (useful_life_years * 52)`
- **Where used**: `backend/app/three_way/domain/services/event_injection.py` :: `_asset_purchase()`, `_asset_purchase_financed()`, `_investment_property()`.
- **Why used**: Allocates asset cost to the P&L over time. Also drives cumulative depreciation in BS (PPE reduction).

### 14.2 Employer Total Cost Calculation

- **What it is**: Converts gross salary to total employer cost: salary + employer NI + employer pension.
- **Formula**: `total_annual = count * (salary + max(0, salary - NI_threshold) * NI_rate + salary * pension_pct)`, `weekly = total_annual / 52`.
- **Where used**: `backend/app/three_way/domain/services/event_injection.py` :: `_hire_employee()`, `_lose_employee()`. `backend/app/forecasting/domain/services/employer_cost_calculator.py`.
- **Why used**: The true cash cost of an employee is significantly more than their gross salary.

### 14.3 Punctual Event BS Timing (Receivables/Payables Ledger)

- **What it is**: Converts punctual P&L events (like issuing a single invoice) into balance sheet effects with proper DSO/DPO timing. Revenue creates a receivable that clears after DSO days. Uses a mini-ledger that tracks when each receivable/payable was created and when it clears.
- **Formula**: `collection_lag = ceil(dso_days / 7)` weeks. AR balance at week w = sum of all uncollected receivables created before w.
- **Where used**: `backend/app/three_way/domain/services/punctual_bs.py` :: `compute_punctual_bs_deltas()`.
- **Why used**: Prevents punctual events from distorting the steady-state DSO-based receivables calculation in the main BS engine.

---

## Implicit Mathematics

Mathematical concepts used indirectly through library calls or architectural patterns where the developer might not explicitly recognise the underlying theory.

### Python `statistics.median`
- **Used in**: `payment.py`, `detector.py`
- **Mathematical concept**: Order statistics. The median is the 50th percentile, which for odd n is the middle element of the sorted list, and for even n is the average of the two middle elements. Resistant to outliers because it depends only on rank, not magnitude.

### Python `statistics.stdev`
- **Used in**: `detector.py`, `quality.py`
- **Mathematical concept**: Bessel's correction. `statistics.stdev` computes the sample standard deviation dividing by (n-1) rather than n. This is an unbiased estimator of the population standard deviation. The (n-1) denominator comes from the fact that the sample mean consumes one degree of freedom.

### Python `statistics.quantiles`
- **Used in**: `quality.py`
- **Mathematical concept**: Interpolation between order statistics. `quantiles(data, n=100)` produces 99 cut points using linear interpolation between adjacent sorted values. There are multiple quantile interpolation methods (e.g. R-1 through R-9); Python uses the "exclusive" method by default.

### Python `Decimal.sqrt()`
- **Used in**: `five_year/engine.py` (UNCERTAINTY_SQRT_K computation, weekly uncertainty)
- **Mathematical concept**: Newton's method / digit-by-digit algorithm for arbitrary-precision square root. The Decimal module computes sqrt to the current context precision.

### Python `math.sqrt`
- **Used in**: `uncertainty.py`, `heuristic.py`
- **Mathematical concept**: IEEE 754 double-precision square root, guaranteed correctly rounded.

### Python `math.ceil`
- **Used in**: `punctual_bs.py`
- **Mathematical concept**: Ceiling function. Maps a real number to the smallest integer greater than or equal to it.

### Cumulative Sum Pattern
- **Pattern**: `balance = balance + net` in every engine loop
- **Mathematical concept**: The forecast is fundamentally a cumulative sum (running total) of net cash flows. This is the discrete analogue of integration, and its stochastic properties (variance growing as n, i.e. sqrt(n) for standard deviation) are the foundation for the Wiener process uncertainty model.

### Compound Interest / Exponential Growth
- **Pattern**: `(1 + rate) ** year_fraction` throughout engines
- **Mathematical concept**: Exponential growth. The continuous compounding `(1+g)^(t/T)` is the discrete approximation of `e^(g*t/T)`. At annual resolution they're identical; intra-year, continuous compounding produces a smooth curve vs discrete steps.

### Annuity Formula (Time Value of Money)
- **Pattern**: `P * r / (1 - (1+r)^(-n))` in loan events
- **Mathematical concept**: Present value of an ordinary annuity. This formula derives from the geometric series: the sum of n discounted payments equals the principal. Rearranging gives the fixed payment amount. Underpins all fixed-rate amortising debt.

### Multiplicative Decomposition Model
- **Pattern**: `value = base * growth_factor * seasonality * drag_factor`
- **Mathematical concept**: Classical multiplicative time series decomposition `Y(t) = T(t) * S(t) * C(t) * I(t)` (trend, seasonal, cyclical, irregular). The entire 5-year revenue model is a multiplicative composition of independently estimated components.

### Double-Entry Accounting Identity
- **Pattern**: `total_assets == total_equity_and_liabilities` enforced every week
- **Mathematical concept**: The fundamental accounting equation `A = L + E` is a conservation law. Cash is the "plug" variable that absorbs all residual effects, similar to a Lagrange multiplier enforcing a constraint in optimisation.

### Error Propagation via Quadrature
- **Pattern**: `sqrt(sigma_1^2 + sigma_2^2)` in heuristic uncertainty
- **Mathematical concept**: Derives from the variance of a sum of independent random variables: `Var(X+Y) = Var(X) + Var(Y)`. This is the same principle used in physics for combining measurement uncertainties, and in finance for combining independent risk factors (assuming zero correlation).

---

## Summary of Third-Party Mathematical Libraries

| Library | Functions Used | Where | What They Compute |
|---------|---------------|-------|-------------------|
| `statistics` | `median` | `payment.py`, `detector.py` | Order statistic (50th percentile) |
| `statistics` | `mean` | `detector.py` | Arithmetic average |
| `statistics` | `stdev` | `detector.py`, `quality.py` | Sample standard deviation (Bessel-corrected) |
| `statistics` | `quantiles` | `quality.py` | Percentile cut points via interpolation |
| `math` | `sqrt` | `uncertainty.py`, `heuristic.py` | IEEE 754 square root |
| `math` | `ceil` | `punctual_bs.py` | Ceiling function |
| `decimal` | `Decimal.sqrt()` | `five_year/engine.py` | Arbitrary-precision square root |
| `openpyxl` | Workbook/formatting | `spreadsheet.py` | Excel file generation (no math) |

**Notable absence**: No numpy, scipy, statsmodels, sklearn, or pandas. All mathematical computations are hand-implemented using Python's `decimal.Decimal` for precision and the `statistics` stdlib module for basic descriptive statistics. The codebase explicitly chose not to use X-13ARIMA-SEATS or any parametric time series models, reasoning that non-parametric methods are more honest for the 12-24 month data lengths typical of their users.

---

## References Cited in Codebase and Documentation

### Academic Papers
- Black & Scholes (1973), "The Pricing of Options and Corporate Liabilities", Journal of Political Economy
- Britton, Fisher & Whitley (1998), "The Inflation Report projections: understanding the fan chart", BoE Quarterly Bulletin
- Mandelbrot & Van Ness (1968), "Fractional Brownian Motions, Fractional Noises and Applications", SIAM Review
- Hurst (1951), R/S analysis of Nile flood levels

### Textbooks
- Horngren, Datar & Rajan, "Cost Accounting: A Managerial Emphasis" (CVP, cost behaviour)
- Brealey, Myers & Allen, "Principles of Corporate Finance" (CAGR, growth)
- Damodaran, "Investment Valuation" (growth rates, seasonal business valuation)
- Makridakis, Wheelwright & Hyndman, "Forecasting: Methods and Applications" (seasonal decomposition, X-12)

### Standards and Curricula
- IAS 7 / FRS 102 Section 7 (direct and indirect cash flow methods)
- CIMA P2 (CVP analysis, cost behaviour)
- CFA Institute (credit analysis: DSO/DPO, corporate finance: CAGR)

### Professional Bodies
- AFP (Association for Financial Professionals) -- cash forecasting, hybrid direct+indirect
- ACT (Association of Corporate Treasurers) -- UK equivalent
- GFOA (Government Finance Officers Association) -- cash flow forecasting guidance

### Software/Methodology
- US Census Bureau X-13ARIMA-SEATS (referenced as context but deliberately not used)
- Plaid recurring transaction detection
