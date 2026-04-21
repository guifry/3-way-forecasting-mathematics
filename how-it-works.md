# Three-way forecasts from your accounting data.

Weekly P&L, balance sheet and cash flow projections over five years, built on standard accounting practice.

---

## How your forecast is built

Your accounting data is synced from your bookkeeping software. The engine derives a set of forecasting assumptions from your historical figures — revenue baseline, growth rate, seasonal pattern, gross margin, working-capital ratios, recurring cost streams — then projects them forward week by week to produce a complete profit and loss statement, balance sheet and cash flow statement.

Each assumption carries a source tag. You can see at a glance which figures were derived from your data and which fall back to defaults — for instance, days sales outstanding defaults to thirty days when fewer than ten paid invoices are available to compute it from.

---

## Enriched with real-world data

Your forecast doesn't only project from your own figures. It's enriched with live external data — Bank of England base rates, HMRC tax and pension updates, foreign exchange rates, fuel and commodity prices, and the macroeconomic and geopolitical shifts that touch your business.

When the world moves, your forecast moves with it.

---

## What sits behind each part

### Three-statement integration

P&L flows into the balance sheet, and the cash flow statement is derived from balance-sheet movements using the indirect method. Cash is the residual that makes the balance sheet balance.

*IAS 7 · FRS 102 s.7 · FAST modelling standards*

### Revenue projection

Weekly revenue projects forward at your historical growth rate, modulated by twelve monthly seasonal indices extracted from the past two years of paid invoices.

*Classical multiplicative decomposition; Makridakis, Wheelwright & Hyndman*

### Cost behaviour

Costs are classified as fixed, variable or residual. Fixed costs grow with inflation, variable costs grow with revenue, residual costs at a blended rate.

*Cost-volume-profit framework, CIMA P2; Horngren*

### Working capital

DSO and DPO are computed as the median days between invoice or bill issuance and payment — robust to outliers. Trade receivables and payables on the balance sheet derive from these.

*CFA Institute credit analysis · AFP · ACT*

### Tax timing

VAT accrues weekly and drains on each quarter end. PAYE and NI drain monthly. Corporation tax drains nine months after your financial year end.

*HMRC VAT Notice 700 series; PAYE; Corporation Tax Manual*

### Forecast uncertainty

Confidence bands widen with the forecast horizon at the square root of time — the same rule used in Bank of England fan charts.

*Britton, Fisher & Whitley, BoE 1998*

---

## Internal consistency

- **Total assets equal total liabilities plus equity** at every weekly close.
- **Closing cash on the cash flow statement equals cash on the balance sheet**, week by week.
- **Net profit flows into retained earnings.** Depreciation reduces fixed assets. Working-capital changes reconcile to cash flow movements.

---

## Where AI fits in

You can describe scenarios in plain English. *"What if I hire two engineers in June and lose my biggest customer in September."* A language model parses this into structured driver overrides and accounting events.

The procedural engine then projects the consequences. **Numbers come from code.** The AI translates intent.

---

## Built on

IAS 7 · FRS 102 · IAS 16 · IFRS 9 · HMRC tax rules · CIMA P2 · CFA Institute · AFP · ACT · FAST modelling standards · ICAEW Financial Modelling Code · Bank of England fan-chart methodology
