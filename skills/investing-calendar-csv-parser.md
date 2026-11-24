---
name: investing-calendar-csv-parser
description: "Parse raw copy-pasted Investing.com economic calendar text into a clean, downloadable CSV file formatted with exact Investing.com columns (Date, Time, Cur., Event, Imp., Actual, Forecast, Previous) compatible with both the Kairos Calendar Filtering Tool and the ±20 Weighted Valuation Tool. Use when the user pastes raw Investing.com economic calendar data and asks to convert, format, or export it as a CSV."
---

# Investing.com Economic Calendar CSV Parser (Kairos v3 Compatible)

Convert raw copy-pasted text from the Investing.com Economic Calendar webpage into a structured, downloadable `.csv` file matching Investing.com's exact table layout (`Date`, `Time`, `Cur.`, `Event`, `Imp.`, `Actual`, `Forecast`, `Previous`).

## When to Use

- The user pastes raw text copied directly from the Investing.com Economic Calendar webpage.
- The user asks for the data in CSV format matching the structure of the Investing.com economic calendar (all events preserved, exact column headers) for upload into the Kairos Calendar Filter or Valuation Desk.
- Do not pre-filter out events unless the user explicitly asks — the Kairos Calendar Filter applies its own `Macro CEF.pdf` whitelist, speaker filter ("Los Ruidosos" vs. "Los Monolitos"), and EUR peripheral noise filter automatically on import.

## Parsing & Formatting Rules

1. **Exact Output Columns:**
   Generate a CSV file using these exact headers in order:
   `Date,Time,Cur.,Event,Imp.,Actual,Forecast,Previous`

2. **Date, Time & Country Code (`Cur.`) Extraction:**
   - Capture date section headers (e.g., `Sunday, November 15, 2026`) and apply that date (`YYYY-MM-DD` or original header format) to every subsequent event until the next date header appears.
   - Extract the 24-hour `Time` (`HH:MM`) and currency/country code (`Cur.`, e.g., `US`, `EU`, `DE`, `FR`, `IT`, `ES`, `UK`, `JP`, `CN`, `CA`, `AU`, `NZ`, `CH`).
   - **Preserve `DE` vs. `EU` vs. peripheral codes (`IT`, `ES`, etc.)** — do NOT collapse them into generic `EUR`, because the Kairos tools use the country prefix to keep Eurozone/Germany prints while filtering out peripheral noise.
   - Preserve **`CN` / `CNY` / `CNH`** rows (China PPI, Manufacturing PMI, GDP, Trade Balance, Industrial Production) — they are key catalysts for `AUD` and `NZD`.
   - Ignore the banner timestamp line (`Current Time:HH:MM(GMT-4:00)`) and trailing cutoff timestamps at the bottom of the paste.
   - If an imminent event shows a relative countdown (e.g., `3m` or `12m`) instead of `HH:MM`, calculate its release time by adding the countdown minutes to the `Current Time` shown at the top of the paste.

3. **Splitting Concatenated Values (`Actual`, `Forecast`, `Previous`):**
   - When copied from HTML tables, adjacent cells often concatenate without spaces (e.g., `0.0%0.1%0.4%`, `-8.1%-7.0%-7.2%`, `7.8017.6025.50`, `28.1K30.3K`, `-35.0-35.9`, `2929`).
   - Extract numeric tokens matching `-?\d[\d,]*\.?\d*(?:%|B|M|K|T)?` in order.
   - Determine whether an event has already occurred by comparing its date/time against the `Current Time` banner at the top of the paste:
     - **3 tokens:** Assign to `Actual`, `Forecast`, `Previous` in order.
     - **2 tokens (past event, at or before `Current Time`):** `Forecast` was omitted on Investing.com; assign to `Actual` and `Previous`, leave `Forecast` blank (`""`).
     - **2 tokens (upcoming event, after `Current Time`):** `Actual` has not been released yet; leave `Actual` blank (`""`) and assign to `Forecast` and `Previous`.
     - **1 token:** Leave `Actual` and `Forecast` blank (`""`) and assign to `Previous`.
     - **0 tokens (speeches, press conferences, reports):** Leave `Actual`, `Forecast`, and `Previous` blank (`""`).

4. **Event Title & Importance (`Imp.`):**
   - Normalize multiple consecutive spaces inside event names to a single space.
   - Preserve exact event suffixes like `(MoM)`, `(YoY)`, `(QoQ)`, `(Prelim)`, `(Final)`, `Core`, `Trimmed Mean`, `Median`, `Common`, `ex-Bonus` — the Kairos Calendar Filter and Valuation Desk rely on these exact qualifiers to match indicators and filter out redundant `Final` revisions.
   - Leave `Imp.` blank (`""`) because Investing.com's bull icons do not carry over into plain-text web pastes (the Kairos Valuation Tool preserves its own curated `±20` economic weights automatically).

## Execution Workflow

1. Run Python in Code Interpreter to parse the raw pasted text according to the rules above.
2. Verify row counts, date boundaries, and the past-vs-upcoming cutoff split between `Actual`/`Previous` and `Forecast`/`Previous`.
3. Write the DataFrame to a `.csv` file (`index=False`, UTF-8 encoding) so the user can download it directly.
4. Confirm the total event count, date range, and column mapping concisely.
