---
name: g10-valuation-data-exporter
description: "Export G10 fundamental economic indicator valuation datasets into CSV or JSON files aligned with the normalized ±20 weighted Kairos Valuation Model. Use when the user asks for updated G10 economic data, full 80-indicator exports up to the requested date, weekly incremental data updates for the Forex valuation tool, or downloadable CSV/JSON files containing macroeconomic indicators (USD, EUR, GBP, JPY, AUD, NZD, CAD, CHF)."
---

# G10 Fundamental Valuation Data Exporter (v3 — ±20 Weighted Model)

## Summary

This skill enables the agent to process, extract, update, and format real macroeconomic data across all **80 G10 currency indicator slots** (aligned with the `USD_ENDO.xlsx`, `EURO_ENDO.xlsx`, `GBP_ENDO.xlsx` models and `Macro CEF.pdf` currency drivers) into downloadable CSV and JSON files for the Kairos Fundamental Valuation & Sentiment Dashboard.

Every currency leg is normalized to an identical **±20 maximum theoretical score**, using economic relevance multipliers:
- **`2.0x` (`±4` max):** Primary central bank mandate / structural driver (e.g., CPI/Trimmed Mean/BoC Core, CHF Trade Balance).
- **`1.0x` (`±2` max):** Core macro drivers (PMIs, Employment, Wages, Retail Sales, Trade Balance, GDP, China Proxy, GDT Dairy, Tankan, ZEW, KOF).
- **`0.5x` (`±1` max):** Secondary or lower-variance sentiment/activity indicators (e.g., Consumer Confidence, IFO, AUD/CAD PMIs, JPY/CHF Unemployment Rate).

-----

## When to Use

Use this skill when the user:

- Requests full historical or current macroeconomic data exports across all **80 G10 indicator slots**.
- Asks for a weekly incremental update CSV containing high-impact economic releases for the current week.
- Requests downloadable CSV or JSON state files matching the Kairos Valuation Tool v3 schema.
- Asks to backfill private surveys or quarterly releases not present in weekly calendar feeds (e.g., `ISM`, `GDT Dairy`, `NAB`, `Westpac`, `KOF`, `Tankan`, `Labor Productivity`, `WPI`).

-----

## The 80 G10 Fundamental Indicator Schema (±20 Scale per Currency)

| Currency | Count | Indicator Slots & Economic Weights (`Weight`) |
| :---: | :---: | :--- |
| **USD** | 11 | ISM Mfg PMI (`1.0x`), ISM Services PMI (`1.0x`), NFP (`1.0x`), Unemployment Rate (`1.0x`), Avg Hourly Earnings MoM (`1.0x`), **Core PCE MoM** (`1.0x`), CPI MoM (`1.0x`), PPI MoM (`1.0x`), Retail Sales MoM (`1.0x`), CB Consumer Confidence (`0.5x`), UoM Consumer Sentiment (`0.5x`) |
| **EUR** | 10 | **CPI MoM** (`2.0x`), HCOB Mfg PMI (`1.0x`), HCOB Services PMI (`1.0x`), Unemployment Rate (`1.0x`), Eurozone Wage Growth YoY (`1.0x`), Retail Sales MoM (`1.0x`), ZEW Economic Sentiment (`1.0x`), Industrial Production MoM (`1.0x`), Consumer Confidence (`0.5x`), IFO Business Climate (`0.5x`) |
| **GBP** | 9 | **CPI MoM** (`2.0x`), **Avg Earnings ex-Bonus YoY** (`1.0x`), S&P Mfg PMI (`1.0x`), S&P Services PMI (`1.0x`), Unemployment Rate (`1.0x`), Claimant Count Change (`1.0x`), Retail Sales MoM (`1.0x`), Labor Productivity QoQ (`1.0x`), GfK Consumer Confidence (`1.0x`) |
| **JPY** | 10 | **Tokyo CPI / National Core CPI** (`2.0x`), Labor Cash Earnings YoY (`1.0x`), Reuters / BoJ Tankan (`1.0x`), Jibun Mfg PMI (`1.0x`), Jibun Services PMI (`1.0x`), PPI / CGPI MoM (`1.0x`), Household Spending / Retail MoM (`1.0x`), Trade Balance (`1.0x`), Unemployment Rate (`0.5x`), Consumer Confidence (`0.5x`) |
| **AUD** | 11 | **Trimmed Mean / Monthly CPI** (`2.0x`), Employment Change (`1.0x`), Unemployment Rate (`1.0x`), Wage Price Index (WPI) (`1.0x`), Retail Sales / Spending MoM (`1.0x`), Trade Balance (`1.0x`), **China Mfg PMI / PPI Proxy** (`1.0x`), Judo Mfg PMI (`0.5x`), Judo Services PMI (`0.5x`), NAB Business Confidence (`0.5x`), Westpac Consumer Sentiment (`0.5x`) |
| **NZD** | 10 | **Quarterly CPI / Food Prices** (`2.0x`), **GDT Dairy Price Index** (`1.0x`), Trade Balance (`1.0x`), Unemployment Rate (`1.0x`), Employment Change / MEI Jobs (`1.0x`), BusNZ Mfg PMI (`1.0x`), BusNZ Services PMI (PSI) (`1.0x`), Card Transactions MoM (`1.0x`), ANZ Business Confidence (`0.5x`), ANZ Consumer Confidence (`0.5x`) |
| **CAD** | 10 | **CPI / BoC Core (Median/Trimmed)** (`2.0x`), Net Employment Change (`1.0x`), Unemployment Rate (`1.0x`), Avg Hourly Wages YoY (`1.0x`), Retail Sales MoM (`1.0x`), Monthly GDP MoM (`1.0x`), Trade Balance (`1.0x`), CFIB / BoC Business Outlook (`1.0x`), S&P Mfg PMI (`0.5x`), Ivey PMI (`0.5x`) |
| **CHF** | 9 | **CPI MoM** (`2.0x`), **Trade Balance** (`2.0x`), Procure Services PMI (`1.0x`), Procure Mfg PMI (`1.0x`), KOF Economic Barometer (`1.0x`), PPI MoM (`1.0x`), GDP QoQ (`1.0x`), Real Retail Sales YoY (`0.5x`), Unemployment Rate (`0.5x`) |

-----

## Standard Output Format (CSV Schema)

When generating a CSV file using Python (`ds_python_interpreter`), use these exact headers so the Kairos Valuation Tool auto-detects and maps every row cleanly:

```csv
Date,Time,Cur.,Event,Actual,Forecast,Previous,Weight,Status
```

- **Date:** Event release date in `YYYY-MM-DD` format.
- **Time:** Release time in 24h `HH:MM` format.
- **Cur.:** 3-letter currency code (`USD`, `EUR`, `GBP`, `JPY`, `AUD`, `NZD`, `CAD`, `CHF`). *(For AUD's `China Mfg PMI / PPI Proxy`, set `Cur.` to `AUD` and Event to `China Mfg PMI / PPI Proxy` so it maps directly into the AUD basket.)*
- **Event:** Exact indicator slot name from the table above (e.g., `Core PCE MoM`, `Avg Earnings ex-Bonus YoY`, `GDT Dairy Price Index`).
- **Actual / Forecast / Previous:** Formatted numeric string or percentage (e.g., `0.3%`, `52.6`, `130K`, `4.8B`). Always include **Forecast** whenever available, as the Valuation Tool scores `Actual - Forecast` (falling back to `Actual - Previous` only when Forecast is blank).
- **Weight:** Economic multiplier (`2.0`, `1.0`, or `0.5`).
- **Status:** `Populated` for released prints, `Pending` for upcoming prints (leave `Actual` blank `""` for upcoming events).

-----

## Key Rules & Guidelines

1. **Always Include Forecast (Consensus):**
   - The Valuation Tool scores surprises (`Actual - Forecast`, matching Excel `=D-C`). Omitting `Forecast` degrades scoring to `Actual - Previous`.
2. **Verify Metric Cadence (`MoM` vs. `QoQ` vs. `YoY`):**
   - Match the cadence specified in each slot name (e.g., `Avg Earnings ex-Bonus YoY`, `Labor Productivity QoQ`, `Core PCE MoM`, `Real Retail Sales YoY`).
3. **Weekly Incremental Updates:**
   - Only output events released or scheduled during the target week. Leave `Actual` blank (`""`) for unreleased events so Incremental Mode preserves existing stored baselines.
4. **Execution via Code Interpreter:**
   - Write and execute Python code to build the pandas DataFrame and output downloadable `.csv` (UTF-8, `index=False`) and `.json` files.
