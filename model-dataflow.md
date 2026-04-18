# Forecast Data Flow Specification

Complete data flow map across all forecast engines: 13-week direct method, 5-year indirect method, smart causal forecast, and three-way (P&L -> BS -> CF).

---

## Section 1: Raw Inputs

### 1.1 FreeAgent Accounting Data (sync_handler.py)

| Input | Key Fields | Entry Point |
|-------|-----------|-------------|
| **Contacts** | external_id, name | `accounting_client.fetch_contacts()` |
| **Invoices (outstanding)** | amount, due_date, contact_id, currency | `accounting_client.fetch_invoices()` |
| **Invoices (paid)** | paid_on, issued_on, total_value, contact_name | `accounting_client.fetch_paid_invoices()` |
| **Bills (all)** | amount, due_date, category, contact_url, recurring flag, recurring_end_date, supplier_name, status | `accounting_client.fetch_bills()` |
| **Bills (paid, 24 months)** | paid_on, issued_on, total_value | `accounting_client.fetch_paid_bills(from_date)` |
| **Bank accounts** | current_balance, currency | `accounting_client.fetch_bank_accounts()` |
| **Profit & Loss** | income, expenses, depreciation, dividends, retained_profit, from_date, to_date | `accounting_client.fetch_profit_and_loss()` |
| **Trial balance** | category_url, nominal_code, name, total (per account) | `accounting_client.fetch_trial_balance()` |
| **Trial balance depreciation** | depreciation total stripped from TB | `accounting_client.fetch_trial_balance_depreciation()` |
| **Balance sheet** | current_assets[], current_liabilities[], owners_equity_accounts[], capital_assets_net_value, as_at_date | `accounting_client.fetch_balance_sheet()` |
| **Categories** | url, description | `accounting_client.fetch_categories()` |
| **Categories with groups** | url, description, nominal_code, group | `accounting_client.fetch_categories_with_groups()` |
| **Company details** | company_details blob | `accounting_client.fetch_company_details()` |
| **Company registration number** | registration number string | `accounting_client.fetch_company_registration_number()` |

### 1.2 Companies House Data

| Input | Key Fields | Entry Point |
|-------|-----------|-------------|
| **Company info** | industry, SIC codes | `companies_house.fetch_company_info(reg_number)` |

### 1.3 External Macro Factors (separate Cloud Run jobs)

| Input | Source | Key Factor Types |
|-------|--------|-----------------|
| **BoE base rate** | Bank of England API | `REG_BOE_BASE_RATE` |
| **Corp tax rate** | HMRC | `REG_CORP_TAX_MAIN` |
| **Employer NI rate/threshold** | HMRC | `REG_EMPLOYER_NI_RATE`, `REG_EMPLOYER_NI_THRESHOLD` |
| **CPI/RPI** | FRED/ONS | `REG_CPI` |
| **Living wage** | HMRC | `REG_LIVING_WAGE` |
| **FX rates** | Frankfurter API | `CUR_GBP_USD`, `CUR_GBP_EUR`, etc. |
| **Commodity prices** | FRED | `COM_BRENT_CRUDE`, `COM_STEEL`, etc. |

Each factor: `ExternalFactor(factor_type, value, unit, effective_date, source)`.

### 1.4 User Inputs (API requests)

| Input | Fields | Entry Point |
|-------|--------|-------------|
| **Driver overrides** | driver (DriverType), value, start_week, duration_weeks | POST `/api/v1/forecast/three-way` |
| **Event injections** | event_type (17 EventTypes), start_week, parameters{} | POST `/api/v1/forecast/three-way` |
| **Slider values** | dict[DriverType, Decimal] (9 sliders) | POST `/sliders` |
| **What-if scenario text** | natural language string | POST `/scenarios` |
| **Scenario adjustments (13w)** | component, adjustment_type, value, period, start_week, duration_weeks | POST via LLM translation |

---

## Section 2: Derivation Layer

### 2.1 Business Metrics (`business_metrics/domain/services/orchestrator.py`)

Computed during sync from paid invoices/bills. One row per user.

| Derived Metric | Inputs | Formula | File |
|---------------|--------|---------|------|
| **Monthly revenue series** | paid_invoices | Group by paid_on month, sum amounts | `revenue.py` |
| **Base monthly revenue** | monthly_revenue_series | Average of most recent 12 months | `revenue.py` |
| **Annualised revenue** | base_monthly_revenue | base * 12 | orchestrator |
| **Revenue growth rate (CAGR)** | monthly_revenue_series | `(last_12mo_avg / prior_12mo_avg)^(1/years) - 1`, clamped [-0.20, +0.25], needs 6+ months | `revenue.py` |
| **Seasonal indices (12)** | monthly_revenue_series | Ratio-to-moving-average: `actual / centred_12mo_MA`, normalised to sum=12, needs 12+ months else flat 1.0 | `seasonality.py` |
| **DSO days** | paid_invoices | `median(paid_on - issued_on)` over trailing 12 months, needs 10+ invoices | `payment.py` |
| **DPO days** | paid_bills | `median(paid_on - issued_on)`, needs 10+ bills | `payment.py` |
| **DSO trend** | paid_invoices | Linear slope of quarterly DSO, days/quarter, needs 3+ quarters | `payment.py` |
| **DPO trend** | paid_bills | Same for DPO | `payment.py` |
| **Cash conversion cycle** | DSO, DPO | `DSO - DPO` | orchestrator |
| **Invoice distribution** | paid_invoices | p25, p50, p75, p90, CV (stdev/mean), needs 10+ invoices | `quality.py` |
| **Monthly invoice count** | monthly_revenue_series | Average invoices per month | `quality.py` |
| **Customer concentration** | paid_invoices | Revenue share of top 1/3/5 customers, active count, needs 10+ with contact data | `quality.py` |

### 2.2 Recurring Streams (`recurring/domain/services/detector.py`)

Detected during sync from bills. Fully replaced each sync.

| Derived Output | Inputs | Formula | File |
|---------------|--------|---------|------|
| **Recurring streams** | bills (all) | Two sources: (1) FreeAgent `recurring=True` bills -> high confidence, (2) Pattern detection: group by supplier+category, need 3+ paid bills, reject if interval CV > 0.35 or amount CV > 0.35, infer frequency from median interval | `detector.py` |

Each stream: supplier_name, category, component (mapped by `category_mapper.py`), cost_behaviour (FIXED/VARIABLE), frequency, median_amount, next_expected_date.

### 2.3 Expense Analysis (`recurring/domain/services/expense_analyser.py`)

One row per user, computed during sync.

| Derived Output | Inputs | Formula |
|---------------|--------|---------|
| **Total monthly recurring** | recurring streams | Sum of (median_amount * frequency_to_monthly_multiplier) |
| **Total fixed / total variable** | recurring streams | Sum by cost_behaviour |
| **Fixed ratio** | total_fixed, total_monthly | total_fixed / total_monthly (0 if no streams) |
| **Expense-to-revenue ratio** | total_monthly, P&L income | total_monthly / (monthly_income), None if no P&L |
| **Component breakdown** | recurring streams | Per-component monthly totals (rent, payroll, utilities, etc.) |

### 2.4 Trial Balance Classification (`three_way/domain/services/classification.py`)

Classifies each trial balance entry into P&L line or BS section. Three-tier classification:

1. **Category group** (highest priority): FreeAgent group -> classification. income->REVENUE, cost_of_sales->COST_OF_SALES, admin_expenses/general -> keyword match or OTHER_OPEX.
2. **Keyword match**: regex patterns on account name (salary/wages->STAFF_COSTS, rent/lease->PREMISES, marketing->MARKETING, insurance->INSURANCE, legal/accounting->PROFESSIONAL_FEES, depreciation->DEPRECIATION, interest->INTEREST).
3. **Nominal code range** (fallback): 1-99->REVENUE, 100-199->COST_OF_SALES, 200-499->keyword match or OTHER_OPEX, 500-599->COST_OF_SALES, 600-699->DEPRECIATION.

Output: `ClassifiedAccount(nominal_code, account_name, total, classification, pl_line, confidence)`.

### 2.5 BS Opening Positions (`three_way/domain/services/bs_parser.py`)

Parsed from FreeAgent balance sheet. Pattern-matching on account names:

| BS Line | Pattern Match |
|---------|--------------|
| cash_and_bank | "bank", "cash", "current account" |
| trade_receivables | "trade debtor", "accounts receivable" |
| trade_payables | "trade creditor", "accounts payable" |
| vat_payable | "vat" |
| corp_tax_payable | "corporation tax", "ct" |
| paye_ni_payable | "paye", "national insurance" |
| bank_loans | "loan", "hp", "hire purchase", "finance lease" |
| share_capital | "share capital", "issued capital" |
| ppe | `bs.capital_assets_net_value` |
| retained_earnings | `-bs.owners_equity_retained_profit` |

### 2.6 Three-Way Assumptions (`three_way/domain/services/assumptions.py`)

Derived at forecast time. Each assumption has source tag (derived/default).

| Assumption | Derived From | Default | Formula |
|-----------|-------------|---------|---------|
| **revenue_growth_rate** | business_metrics.revenue_growth_rate | 0.05 (5%) | Direct from metrics |
| **gross_margin** | classified accounts | 1.0 (100%) | `1 - abs(COGS_total) / abs(REVENUE_total)`, clamped [0,1] |
| **inflation_rate** | external_factors["cpi"] | 0.03 (3%) | Direct from CPI factor |
| **dso_days** | business_metrics.dso_days | 30 | Direct from metrics |
| **dso_trend** | business_metrics.dso_trend | None | Direct from metrics |
| **dpo_days** | business_metrics.dpo_days | 30 | Direct from metrics |
| **dpo_trend** | business_metrics.dpo_trend | None | Direct from metrics |
| **corp_tax_rate** | external_factors["corp_tax_rate"] | 0.25 (25%) | From REG_CORP_TAX_MAIN factor (converted from % to decimal) |
| **vat_rate** | hardcoded | 0.20 (20%) | Always default |
| **capex_pct_revenue** | P&L depreciation, P&L income | 0 | `min(0.15, depreciation / income)` |
| **dividend_pct_profit** | P&L dividends, P&L retained_profit | 0 | `min(1, dividends / (retained_profit + dividends))` |
| **boe_base_rate** | external_factors["boe_base_rate"] | 0.05 (5%) | From REG_BOE_BASE_RATE factor |
| **loan_spread** | hardcoded | 0.03 (3%) | Always default |
| **fixed_ratio** | expense_analysis.fixed_ratio | 0 | Direct from expense analysis |
| **financial_year_end_month** | hardcoded | 3 (March) | Always default |
| **vat_quarter_months** | hardcoded | [1,4,7,10] | Always default |

### 2.7 Business Profile (`forecasting/domain/services/business_profile_extractor.py`)

Extracted during sync from invoices, bills, bank accounts, P&L, Companies House. Used by smart forecast for signal relevance and macro fragment generation.

---

## Section 3: Engine Inputs (Assumptions Bundle)

### 3.1 Thirteen-Week Engine (Direct Method)

| Input | Source | Used For |
|-------|--------|----------|
| opening_balance | Sum of bank_accounts.current_balance | Starting cash |
| outstanding_invoices | Invoice repo (amount, due_date) | AR collections by due week |
| outstanding_bills | Bill repo (amount, due_date) | AP payments by due week |
| weekly_opex | P&L.weekly_operating_expense() | Residual opex baseline |
| recurring_streams | RecurringStream repo | Per-component per-week projected expenses |

### 3.2 Five-Year Engine (Indirect Method)

| Input | Source | Used For |
|-------|--------|----------|
| thirteen_week forecast | Output of 13-week engine | Avg weekly receipts/disbursements baseline |
| business_metrics | BusinessMetrics repo | base_monthly_revenue, growth_rate, seasonal_indices, invoice_cv, dso_trend |
| recurring_streams | RecurringStream repo | Fixed/variable cost projection |
| inflation_rate | Assumption or default 3% | Fixed cost growth |
| revenue_growth_rate | Assumption or default 5% | Variable cost + revenue growth |
| fixed_ratio | ExpenseAnalysis.fixed_ratio | Residual cost seasonality dampening |
| adjustments | LLM-translated ScenarioAdjustments | What-if modifications |

### 3.3 Three-Way Engine (P&L -> BS -> CF)

Full `ThreeWayInputs` bundle:

| Input | Source | Feeds |
|-------|--------|-------|
| forecast_start | API param or date.today() | Week date computation |
| assumptions (ThreeWayAssumptions) | derive_assumptions() from metrics + classified + P&L + external factors + expense analysis | All engines |
| bs_opening (BSOpeningPositions) | BS parser from FreeAgent balance sheet | BS roll-forward starting positions |
| classified_accounts | Classification engine from trial balance + categories | P&L baseline opex by line, gross margin derivation |
| recurring_streams | RecurringStream repo | (currently in inputs but not used by three-way engine directly) |
| driver_overrides | User API / slider conversion / LLM extraction | Override assumption values at specific weeks |
| event_injections | User API / LLM extraction | Accounting events (hire, asset purchase, loan, etc.) |
| pl_cache | P&L from FreeAgent | Residual opex computation, depreciation baseline |
| seasonal_indices (12 values) | business_metrics.seasonal_indices or flat [1]*12 | Weekly revenue seasonality |
| base_monthly_revenue | business_metrics.base_monthly_revenue or 0 | Revenue baseline for projection |

### 3.4 Smart Causal Forecast

| Input | Source | Used For |
|-------|--------|----------|
| baseline_forecast | 13-week forecast output | Base to apply macro fragments on |
| profile | BusinessProfile | Signal relevance determination |
| current_factors | ExternalFactorSet from DB | Current macro values |
| baseline_factors | Previous ExternalFactorSet | Delta calculation for fragments |

---

## Section 4: Engine Internals

### 4.1 Thirteen-Week Direct Method Engine

**File**: `forecasting/domain/services/forecast_strategy.py` -> `DirectMethodForecastStrategy`

**Per-week loop** (weeks 1-13):

```
for week in 1..13:
    week_start = today + (week-1)*7 days
    week_end = week_start + 6 days

    1. customer_collections = sum(invoice.amount for invoices due in [week_start, week_end])
       + if week==1: sum overdue invoices (due_date < today)

    2. supplier_payments = sum(bill.amount for bills due in [week_start, week_end])
       + if week==1: sum overdue bills

    3. recurring_stream_expenses:
       for each stream:
         if stream.next_expected in [week_start, week_end]:
           add stream.median_amount to component bucket (rent, payroll, utilities, etc.)
           advance stream.next_expected by frequency_days

    4. residual_opex = max(weekly_opex - total_recurring_this_week, 0)
       other_disbursements = residual_opex + other_disbursements_from_streams

    5. total_receipts = customer_collections + other_receipts
    6. total_disbursements = supplier_payments + payroll + rent + utilities + taxes + debt_service + other_disbursements
    7. net_cash_flow = total_receipts - total_disbursements
    8. closing_balance = opening_balance + net_cash_flow
    9. opening_balance = closing_balance  (for next week)
```

**Output**: `ThirteenWeekForecast(projections=[WeekProjection], metrics=ForecastMetrics)`

### 4.2 Five-Year Indirect Method Engine

**File**: `forecasting/domain/services/five_year/engine.py`

**Baseline derivation** (`derive_five_year_baseline`):

```
weekly_receipts = business_metrics.base_monthly_revenue / 4.33
                  (fallback: avg_weekly_receipts from 13-week)
growth = business_metrics.revenue_growth_rate (fallback: 5%)
seasonal_indices = business_metrics.seasonal_indices (fallback: MONTHLY_SEASONALITY hardcoded)

residual_monthly = max(avg_weekly_disbursements * 4.33 - total_recurring_monthly, 0)
residual_weekly = residual_monthly / 4.33
blended_rate = (inflation + growth) / 2

for week in 1..260:
    year = (week-1) / 52
    month_index = week_start.month - 1
    seasonality = seasonal_indices[month_index]

    receipts = weekly_receipts * (1 + growth)^year * seasonality
    if dso_trend > 1 day/quarter:
        drag = max(0.70, 1 - dso_trend*4/365 * year)
        receipts *= drag

    residual_seasonality = 1 + (seasonality - 1) * (1 - fixed_ratio)
    disbursements = residual_weekly * (1 + blended_rate)^year * residual_seasonality

    for each stream:
        weekly_amount = stream.median_amount * frequency_to_weekly
        if FIXED: disbursements += weekly_amount * (1 + inflation)^year
        if VARIABLE: disbursements += weekly_amount * (1 + growth)^year

    net = receipts - disbursements
    closing = opening + net
```

**Adjustment application** (`apply_adjustments_to_projections`):
1. Non-delay adjustments: per week, accumulate DELTA and MULTIPLIER per component (inflow/outflow).
2. `receipts = baseline_receipts * receipts_multiplier + receipts_delta`
3. DELAY adjustments: shift component values by N weeks (zero source, add to target).
4. Recalculate cascading balances.

**Uncertainty** (`calculate_weekly_uncertainty`):
- Base rate: 0.03 (CV<0.3), 0.05 (default), 0.08 (CV>0.6)
- `rate(w) = min(base + k * sqrt(w-1), 0.40)` where `k = (0.40 - base) / sqrt(259)`
- `spread = |closing_balance| * rate`
- `bounds = [closing - spread, closing + spread]`

**Output**: `FiveYearForecast(weekly_projections=[260], monthly_projections=[60], weekly_uncertainty, monthly_uncertainty, weekly_metrics, monthly_metrics)`

### 4.3 Three-Way Engine: P&L -> BS -> CF

**Orchestrator**: `three_way/domain/services/orchestrator.py` -> `compute_three_way_forecast(inputs, total_weeks=260)`

**Step-by-step computation order**:

#### Step 0: Partition events
```python
recurring_events, punctual_events = partition(events)
# Punctual: ISSUE_INVOICE, DIVIDEND_PAYMENT, EQUITY_INJECTION, LOAN_REPAYMENT, CUSTOM
# Recurring: all others (HIRE_EMPLOYEE, NEW_CUSTOMER, ASSET_PURCHASE, etc.)
```

#### Step 1: Expand events into weekly effects
```python
recurring_effects = expand_events(recurring_events, total_weeks)
punctual_effects = expand_events(punctual_events, total_weeks)
# Each EventEffect: week, pl_effects{field: delta}, bs_effects{field: delta}
```

17 event type handlers, each producing `list[EventEffect]`:

| Event Type | P&L Effects | BS Effects |
|-----------|-------------|------------|
| HIRE_EMPLOYEE | +staff_costs (salary + employer NI + pension, weekly) | - |
| HIRE_CONTRACTOR | +other_opex (monthly_cost / 4.33, weekly) | - |
| LOSE_EMPLOYEE | -staff_costs | - |
| NEW_CUSTOMER | +revenue (monthly_amount / 4.33, weekly) | - |
| LOSE_CUSTOMER | -revenue | - |
| PRICE_CHANGE | +revenue (monthly_amount * multiplier / 4.33) | - |
| ASSET_PURCHASE | +depreciation (cost / useful_life / 52) | +ppe (week 1 only) |
| ASSET_PURCHASE_FINANCED | +depreciation + loan effects | +ppe + loan BS effects |
| NEW_LOAN | +interest_expense (amortisation schedule) | +bank_loans (drawdown), -bank_loans (repayment each week) |
| LOAN_REPAYMENT | - | -bank_loans (one-off) |
| NEW_RECURRING_COST | +pl_line (monthly_amount / 4.33) | - |
| CANCEL_RECURRING_COST | -pl_line | - |
| DIVIDEND_PAYMENT | - | -retained_earnings (one-off) |
| EQUITY_INJECTION | - | +share_capital (one-off) |
| INVESTMENT_PROPERTY | +revenue (rental), +depreciation, +premises (maintenance) | +ppe (week 1) |
| ISSUE_INVOICE | +revenue (one-off, full amount in one week) | - |
| CUSTOM | user-specified recurring_pl_effects, initial_bs_effects, recurring_bs_effects | user-specified |

#### Step 2: Project P&L (260 weeks)
**File**: `three_way/domain/services/pl_engine.py` -> `project_pl(inputs)`

```
Per-week loop (w = 1..total_weeks):
    global_week = start_week + w - 1
    year_fraction = (global_week - 1) / 52
    seasonal = seasonal_indices[month_of_year - 1]

    # Resolve driver overrides (latest-start-week wins)
    growth = get_driver_value(REVENUE_GROWTH_RATE, w, base, overrides)
    margin = get_driver_value(GROSS_MARGIN, w, base, overrides)
    inflation = get_driver_value(INFLATION_RATE, w, base, overrides)
    boe_rate = get_driver_value(BOE_BASE_RATE, w, base, overrides)
    corp_tax_rate = get_driver_value(CORP_TAX_RATE, w, base, overrides)

    growth_factor = max(0, 1 + growth) ^ year_fraction
    inflation_factor = max(0, 1 + inflation) ^ year_fraction

    revenue = base_monthly_revenue / 4.33 * growth_factor * seasonal
    cost_of_sales = revenue * (1 - margin)
    gross_profit = revenue - cost_of_sales

    # Named opex: from classified accounts, annualised then weekly
    staff_costs = named_opex["staff_costs"] / 4.33 * inflation_factor       # FIXED
    premises = named_opex["premises"] / 4.33 * inflation_factor              # FIXED
    marketing = named_opex["marketing"] / 4.33 * growth_factor               # VARIABLE
    insurance = named_opex["insurance"] / 4.33 * inflation_factor            # FIXED
    professional_fees = named_opex["professional_fees"] / 4.33 * inflation_factor  # FIXED

    # Residual opex (everything not captured by named opex or COGS)
    # residual = (P&L expenses - depreciation) / period_months - COGS_monthly - named_opex_total
    # Grows at blended rate with dampened seasonality
    other_opex = residual_monthly / 4.33 * blended_factor * seasonal_dampened
    # where blended_factor = (1 + (inflation+growth)/2) ^ year_fraction
    # seasonal_dampened = 1 + (seasonal - 1) * (1 - fixed_ratio)

    depreciation = depreciation_monthly / 4.33  (flat, no growth)

    total_opex = staff + premises + marketing + insurance + prof_fees + other + depreciation
    operating_profit = gross_profit - total_opex
    interest_expense = loan_balance * (boe_rate + loan_spread) / 52
    profit_before_tax = operating_profit - interest_expense
    corporation_tax = max(0, PBT * corp_tax_rate)
    net_profit = PBT - corporation_tax
```

#### Step 3: Apply event P&L effects
```python
pl = apply_event_pl_effects(pl, recurring_effects, corp_tax_rate)
pl = apply_event_pl_effects(pl, punctual_effects, corp_tax_rate)
# For each week with event deltas:
#   Add deltas to each P&L line (revenue, staff_costs, etc.)
#   Recompute gross_profit, total_opex, operating_profit, PBT, tax, net_profit
```

#### Step 4: Compute punctual BS deltas
```python
punctual_pl_deltas = collect_pl_deltas(punctual_effects)
punctual_bs_deltas = compute_punctual_bs_deltas(punctual_pl_deltas, dso_days, dpo_days)
# For each punctual revenue event: create receivable, clear after DSO days
# For each punctual cost event: create payable, clear after DPO days
# Accumulate retained earnings from net profit delta
```

#### Step 5: Roll forward BS (260 weeks)
**File**: `three_way/domain/services/bs_engine.py` -> `roll_forward_bs(pl, inputs, exclude_revenue=punctual_revenue)`

```
Per-week loop:
    # Resolve driver overrides
    dso = get_driver_value(DSO_DAYS, w, base_dso, overrides)
    dpo = get_driver_value(DPO_DAYS, w, base_dpo, overrides)
    capex_pct = get_driver_value(CAPEX_PCT_REVENUE, w, base, overrides)
    div_pct = get_driver_value(DIVIDEND_PCT_PROFIT, w, base, overrides)

    # Apply DSO/DPO trends (projected from base, clamped 7-120 days)
    effective_dso = base + trend * (week / 13)   # if |trend| > 1
    effective_dpo = base + trend * (week / 13)

    # ASSETS
    trade_receivables = (revenue - excluded_punctual_revenue) * dso / 7
    other_current_assets = opening.other_current_assets  (flat)
    capex_this_week = revenue * capex_pct
    cumulative_capex += capex_this_week
    cumulative_depreciation += pl.depreciation
    ppe = max(0, opening.ppe + cumulative_capex - cumulative_depreciation)

    # LIABILITIES
    trade_payables = cost_of_sales * dpo / 7

    # Tax liabilities (draining schedules):
    # VAT: accumulates net_vat (output_vat - input_vat), drains quarterly
    # Corp tax: accumulates from P&L, drains annually (9 months after FY end)
    # PAYE/NI: 25% of staff_costs, drains monthly (every 4 weeks)
    output_vat = revenue * vat_rate
    input_vat = (cost_of_sales + cash_opex) * vat_rate
    net_vat = output_vat - input_vat
    vat_running += net_vat; if quarterly_drain: vat_running = 0

    corp_tax_running += pl.corporation_tax; if annual_drain: reset to 0
    paye_charge = staff_costs * 0.25; paye_running += charge; if monthly_drain: reset

    other_current_liabilities = opening value (flat)
    bank_loans = opening.bank_loans (flat, modified by events)

    # EQUITY
    share_capital = opening.share_capital (flat, modified by events)
    dividend = net_profit * div_pct if net_profit > 0 else 0
    retained_earnings = prev_retained + net_profit - dividend

    # CASH AS PLUG
    total_equity = share_capital + retained_earnings
    total_current_liabilities = trade_payables + vat + corp_tax + paye + other
    total_liabilities = total_current_liabilities + bank_loans
    total_equity_and_liabilities = total_liabilities + total_equity
    non_cash_assets = trade_receivables + other_current_assets + ppe
    cash_and_bank = total_equity_and_liabilities - non_cash_assets  # <-- THE PLUG

    # Verification
    total_assets = cash + trade_receivables + other_current + ppe
    balance_check = total_assets - total_equity_and_liabilities  # should be ~0
```

#### Step 6: Apply event BS effects
```python
bs = apply_event_bs_effects(bs, recurring_effects + punctual_effects)
# BS effects are CUMULATIVE (stock variables)
# Tracked fields: ppe, bank_loans, share_capital
# Delta added at event week, persists for all subsequent weeks

bs = merge_punctual_bs_deltas(bs, punctual_bs_deltas)
# Adds punctual trade_receivables, trade_payables, retained_earnings
```

#### Step 7: Recompute cash plug
```python
bs = recompute_cash_plug(bs)
# For every week: recalculate equity, liabilities, cash_and_bank = E&L - non_cash_assets
# Ensures BS balances after event injection modifications
```

#### Step 8: Derive CF (indirect method, 260 weeks)
**File**: `three_way/domain/services/cf_engine.py` -> `derive_cf(pl, bs, inputs)`

```
Per-week loop:
    prev = bs[w-1] or opening positions (week 0)

    # OPERATING
    net_profit = pl.net_profit
    depreciation_addback = pl.depreciation
    delta_trade_receivables = bs.trade_receivables - prev.trade_receivables
    delta_trade_payables = bs.trade_payables - prev.trade_payables
    delta_vat = bs.vat_payable - prev.vat_payable
    delta_corp_tax = bs.corp_tax_payable - prev.corp_tax_payable
    delta_paye = bs.paye_ni_payable - prev.paye_ni_payable
    delta_other_wc = -(bs.other_current_assets - prev.other_current_assets)
                     + (bs.other_current_liabilities - prev.other_current_liabilities)
    total_cfo = net_profit + depreciation - delta_TR + delta_TP + delta_vat + delta_ct + delta_paye + delta_other

    # INVESTING
    capex = -(revenue * capex_pct)
    total_cfi = capex

    # FINANCING
    delta_loans = bs.bank_loans - prev.bank_loans
    new_borrowing = max(0, delta_loans)
    loan_repayments = min(0, delta_loans)
    dividends_paid = -(prev_retained + net_profit - bs.retained_earnings)
    equity_injections = max(0, bs.share_capital - prev.share_capital)
    total_cff = new_borrowing + loan_repayments + dividends_paid + equity_injections

    # NET
    net_cash_flow = total_cfo + total_cfi + total_cff
    opening_cash = prev.cash_and_bank
    closing_cash = opening_cash + net_cash_flow
    bs_cash_check = closing_cash - bs.cash_and_bank  # should be ~0
```

#### Step 9: Aggregate to monthly (capped at 60 months)
```python
monthly_pl = aggregate_weeks_to_months_pl(pl)   # sum all P&L lines
monthly_bs = aggregate_weeks_to_months_bs(bs)   # take last week of each month (snapshot)
monthly_cf = aggregate_weeks_to_months_cf(cf)   # sum all CF lines, opening=first week, closing=last week
```

### 4.4 Unified Forecast (Two-Phase)

**File**: `three_way/domain/services/orchestrator.py` -> `compute_unified_forecast(inputs, total_weeks=260)`

```
Phase 1: compute_three_way_forecast(inputs, total_weeks=13)
    -> full P&L/BS/CF for weeks 1-13

Phase 2:
    opening = weekly_bs_to_opening(phase1.weekly_bs[-1])
    forecast_start = phase1.weekly_pl[-1].week_end
    event_start_weeks shifted by -13
    compute_three_way_forecast(phase2_inputs, total_weeks=remaining, start_week=14)

Combine: concatenate weekly arrays, renumber, re-aggregate to monthly
```

### 4.5 Smart Causal Forecast Engine

**File**: `forecasting/domain/services/smart_forecast_assembler.py`

```
1. Determine relevant signals for business profile
2. For each relevant signal where current != baseline factor:
     generate ImpactFragment (absolute or percentage delta on a cash flow component)
     Generators: employer NI, pension, base rate, living wage, FX, commodities
3. Apply fragments to 13-week baseline:
     For each week, for each component:
       REPLACEMENT takes precedence
       else: result = baseline + sum(absolute * intensity) + sum(baseline * pct/100 * intensity)
     Recascade balances
4. Calculate uncertainty from fragments (HeuristicUncertaintyStrategy)
5. Return SmartCausalForecast(baseline, adjusted, uncertainty, fragments)
```

---

## Section 5: Outputs

### 5.1 Thirteen-Week Forecast Output

`ThirteenWeekForecast`:
- `projections`: list of 13 `WeekProjection`, each containing:
  - week_number, week_start, week_end
  - opening_balance, closing_balance
  - customer_collections, other_receipts, total_receipts
  - supplier_payments, payroll, rent, utilities, taxes, debt_service, other_disbursements, total_disbursements
  - net_cash_flow
- `metrics`: ForecastMetrics(minimum_cash_position, minimum_cash_week, cash_runway_weeks, average_weekly_net, total_receipts, total_disbursements)

### 5.2 Five-Year Forecast Output

`FiveYearForecast`:
- `weekly_projections`: 260 x `FiveYearWeekProjection(week_number, week_start, week_end, opening_balance, total_receipts, total_disbursements, net_cash_flow, closing_balance)`
- `projections` (monthly): 60 x `MonthProjection` (same shape as weekly but monthly)
- `weekly_uncertainty`: 260 x `FiveYearWeekUncertainty(week_number, lower_bound, upper_bound)`
- `uncertainty` (monthly): 60 x `MonthUncertainty`
- `weekly_metrics`: FiveYearWeeklyMetrics
- `metrics` (monthly): FiveYearForecastMetrics (min_cash, runway, avg_net, year_end_balances)

### 5.3 Three-Way Forecast Output

`ThreeWayForecast`:
- `weekly_pl`: 260 x `WeeklyPL` (18 fields: revenue through net_margin_pct)
- `weekly_bs`: 260 x `WeeklyBS` (21 fields: cash through is_balanced)
- `weekly_cf`: 260 x `WeeklyCF` (21 fields: net_profit through bs_cash_check)
- `monthly_pl`: up to 60 x `MonthlyPL`
- `monthly_bs`: up to 60 x `MonthlyBS`
- `monthly_cf`: up to 60 x `MonthlyCF`
- `assumptions`: the `ThreeWayAssumptions` used

### 5.4 Smart Causal Forecast Output

`SmartCausalForecast`:
- `baseline_forecast`: the unmodified 13-week forecast
- `adjusted_forecast`: 13-week forecast with macro fragments applied
- `uncertainty`: uncertainty bounds from fragments
- `macro_fragments`: list of ImpactFragment (toggleable assumptions)
- `total_macro_impact_week13`: cumulative cash impact
- `factors_considered`: list of factor type names

### 5.5 Three-Way Uncertainty Output

`ThreeWayCashUncertainty` (per week): week_number, closing_cash, lower_bound, upper_bound, uncertainty_rate
`ThreeWayMonthlyUncertainty` (per month): same fields monthly

Formula: same sqrt(t) Wiener process as 5-year, same CV-informed base rate selection.

### 5.6 Spreadsheet Export

4-sheet XLSX:
1. Assumptions sheet (all derived metrics + macro factors)
2. 260-week cash flow (P&L/CF data)
3. 60-month cash flow (monthly aggregation)
4. Business health + recurring streams

---

## Section 6: Cross-cutting Flows

### 6.1 Scenarios / Adjustments

**13-week what-if flow**:
```
User text -> LLM (Claude/OpenAI/Gemini via resilient chain)
  -> ScenarioAdjustment[](component, type, value, period, start_week, duration_weeks)
  -> AdjustmentEngine.apply_scenario_adjustments(baseline, adjustments)
  -> Modified 13-week forecast
  -> 5-year extension via generate_five_year_forecast(modified_13w, adjustments)
```

Entry: `forecasting/domain/services/adjustment_engine.py`. Order: multipliers -> deltas -> overrides -> delays.

**Three-way what-if flow**:
```
User text -> ThreeWayWhatIfService.translate_scenario()
  -> LLM (Claude via Instructor, structured extraction)
  -> ThreeWayExtractionResponse(driver_overrides[], named_events[], custom_events[])
  -> compute_three_way_primitives(extraction, forecast_start)
  -> DriverOverride[] + AccountingEvent[]
  -> compute_three_way_forecast(inputs_with_overrides_and_events)
```

Entry: `three_way/application/services/whatif_service.py` -> `three_way/domain/services/scenario_translation.py`.

**Three-way sliders (no LLM)**:
```
Slider values {driver_type: display_value}
  -> sliders_to_driver_overrides(): convert display % to engine decimal, start_week=1, duration=None
  -> DriverOverride[]
  -> compute_three_way_forecast(inputs_with_overrides)
```

Entry: `three_way/domain/services/sliders.py`. 9 sliders: revenue_growth, gross_margin, inflation, DSO, DPO, corp_tax, capex, dividends, BoE_rate.

### 6.2 Macro Signals

**Where they enter**: `forecasting/domain/services/macro_fragment_generator.py`

```
BusinessProfile + ExternalFactorSet(current) + ExternalFactorSet(baseline)
  -> determine_relevant_signals(profile): filters by industry/SIC/exposure
  -> For each relevant signal with changed value:
       Generator function computes ImpactFragment
       (employer_NI, pension, base_rate, living_wage, FX, commodities each have custom generators)
  -> Fragments applied to 13-week baseline via apply_scenario()
```

Macro factors enter the **three-way engine** differently: only BoE base rate and corp tax rate flow into `ThreeWayAssumptions` via `derive_assumptions()` -> `_extract_factor_values()`. CPI feeds inflation_rate assumption.

### 6.3 Event Injection

**Where it modifies three-way output**: The orchestrator (`compute_three_way_forecast`) applies events in a specific order:

1. Events are **partitioned** into recurring (ongoing P&L effects) and punctual (one-off BS events).
2. Events are **expanded** into per-week `EventEffect(week, pl_effects, bs_effects)`.
3. **P&L effects** applied after `project_pl()` — modify revenue, costs, recompute all derived P&L lines including tax.
4. **Punctual BS deltas** computed separately with direct timing (no DSO/DPO smoothing) — receivables/payables tracked as a mini-ledger.
5. **BS roll-forward** runs on the event-modified P&L. Punctual revenue is excluded from DSO-based receivables to avoid double-counting.
6. **BS effects** (ppe, bank_loans, share_capital) applied cumulatively post-roll-forward.
7. **Punctual BS deltas** merged additively (trade_receivables, trade_payables, retained_earnings).
8. **Cash plug recomputed** to re-balance the BS after all modifications.
9. **CF derived** from the final P&L and BS.

### 6.4 Uncertainty

**Where it wraps the point forecast**:

For **13-week/smart forecast**: `HeuristicUncertaintyStrategy.calculate_from_fragments()` — applied after macro fragment application, based on fragment certainty levels and count.

For **5-year forecast**: `calculate_weekly_uncertainty()` in the five-year engine — sqrt(t) Wiener process, CV-informed base rate (0.03/0.05/0.08 based on invoice_distribution.cv).

For **three-way forecast**: `calculate_three_way_uncertainty()` in `three_way/domain/services/uncertainty.py` — same sqrt(t) model applied to CF closing_cash. Monthly aggregation takes last-week-of-month uncertainty. Both are computed **outside** the main orchestrator, called by the handler/API layer.

### 6.5 Driver Override Resolution

**File**: `three_way/domain/services/driver_overrides.py`

All 9 assumption drivers support week-level overrides. Resolution rule:
- Filter to overrides matching driver type where `start_week <= week` and within duration.
- If multiple match, **latest start_week wins**.
- If none match, return base assumption value.

Used by P&L engine (growth, margin, inflation, BoE, corp_tax) and BS engine (DSO, DPO, capex, dividends).

### 6.6 Sync Pipeline (Data Ingestion Orchestration)

**File**: `ingestion/application/handlers/sync_handler.py`

Two-phase atomic sync:

**Phase 1 — Fetch** (all from FreeAgent, plus Companies House):
```
contacts, invoices, bills, bank_accounts, P&L, trial_balance_depreciation (best-effort),
balance_sheet, categories, paid_invoices, paid_bills (24 months),
company_registration_number + Companies House info (best-effort),
company_details (best-effort)
```

**Phase 2 — Write + Derive** (single DB transaction):
```
1. Upsert contacts, invoices, bills, bank_accounts
2. Save P&L, balance_sheet
3. Extract & save business_profile
4. Detect recurring_streams, compute expense_analysis
5. Compute business_metrics from paid invoices/bills
6. Classify trial_balance -> classified_accounts
7. Parse balance_sheet -> bs_opening_positions
8. Generate & cache 13-week forecast
```

Each derivation step (4-8) is wrapped in try/except -- failure doesn't abort sync.
