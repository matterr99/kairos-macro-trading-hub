import { CentralBankInfo, VolatilityPair, ResearchArticle, ConsensusEvent, MacroIndicator } from '../types';

export const VOLATILITY_DATA: VolatilityPair[] = [
  { symbol: "AUDCAD", avgPips: 47.9, cashValue100k: 340.60, rangePct: 0.48, tier: "Medium", baseCurrency: "AUD", quoteCurrency: "CAD" },
  { symbol: "AUDCHF", avgPips: 30.3, cashValue100k: 369.32, rangePct: 0.52, tier: "Low", baseCurrency: "AUD", quoteCurrency: "CHF" },
  { symbol: "AUDJPY", avgPips: 82.2, cashValue100k: 522.35, rangePct: 0.73, tier: "High", baseCurrency: "AUD", quoteCurrency: "JPY" },
  { symbol: "AUDNZD", avgPips: 55.0, cashValue100k: 314.83, rangePct: 0.44, tier: "Medium", baseCurrency: "AUD", quoteCurrency: "NZD" },
  { symbol: "AUDUSD", avgPips: 40.5, cashValue100k: 404.54, rangePct: 0.57, tier: "Medium", baseCurrency: "AUD", quoteCurrency: "USD" },
  { symbol: "CADCHF", avgPips: 28.1, cashValue100k: 342.22, rangePct: 0.48, tier: "Low", baseCurrency: "CAD", quoteCurrency: "CHF" },
  { symbol: "CADJPY", avgPips: 82.0, cashValue100k: 520.83, rangePct: 0.73, tier: "High", baseCurrency: "CAD", quoteCurrency: "JPY" },
  { symbol: "CHFJPY", avgPips: 133.8, cashValue100k: 849.83, rangePct: 0.70, tier: "High", baseCurrency: "CHF", quoteCurrency: "JPY" },
  { symbol: "EURAUD", avgPips: 66.4, cashValue100k: 472.65, rangePct: 0.41, tier: "Medium", baseCurrency: "EUR", quoteCurrency: "AUD" },
  { symbol: "EURCAD", avgPips: 54.1, cashValue100k: 385.00, rangePct: 0.34, tier: "Medium", baseCurrency: "EUR", quoteCurrency: "CAD" },
  { symbol: "EURCHF", avgPips: 33.7, cashValue100k: 410.84, rangePct: 0.36, tier: "Low", baseCurrency: "EUR", quoteCurrency: "CHF" },
  { symbol: "EURGBP", avgPips: 22.1, cashValue100k: 294.87, rangePct: 0.26, tier: "Low", baseCurrency: "EUR", quoteCurrency: "GBP" },
  { symbol: "EURJPY", avgPips: 112.6, cashValue100k: 714.88, rangePct: 0.62, tier: "High", baseCurrency: "EUR", quoteCurrency: "JPY" },
  { symbol: "EURNZD", avgPips: 97.2, cashValue100k: 556.77, rangePct: 0.49, tier: "High", baseCurrency: "EUR", quoteCurrency: "NZD" },
  { symbol: "EURUSD", avgPips: 47.9, cashValue100k: 478.80, rangePct: 0.42, tier: "Medium", baseCurrency: "EUR", quoteCurrency: "USD" },
  { symbol: "GBPAUD", avgPips: 85.7, cashValue100k: 609.78, rangePct: 0.46, tier: "High", baseCurrency: "GBP", quoteCurrency: "AUD" },
  { symbol: "GBPCAD", avgPips: 74.6, cashValue100k: 530.20, rangePct: 0.40, tier: "Medium", baseCurrency: "GBP", quoteCurrency: "CAD" },
  { symbol: "GBPCHF", avgPips: 49.0, cashValue100k: 596.98, rangePct: 0.45, tier: "Medium", baseCurrency: "GBP", quoteCurrency: "CHF" },
  { symbol: "GBPJPY", avgPips: 142.2, cashValue100k: 903.29, rangePct: 0.68, tier: "High", baseCurrency: "GBP", quoteCurrency: "JPY" },
  { symbol: "GBPNZD", avgPips: 118.5, cashValue100k: 678.65, rangePct: 0.51, tier: "High", baseCurrency: "GBP", quoteCurrency: "NZD" },
  { symbol: "GBPUSD", avgPips: 62.9, cashValue100k: 629.08, rangePct: 0.47, tier: "Medium", baseCurrency: "GBP", quoteCurrency: "USD" },
  { symbol: "NZDCAD", avgPips: 46.5, cashValue100k: 330.81, rangePct: 0.58, tier: "Medium", baseCurrency: "NZD", quoteCurrency: "CAD" },
  { symbol: "NZDCHF", avgPips: 25.6, cashValue100k: 311.81, rangePct: 0.54, tier: "Low", baseCurrency: "NZD", quoteCurrency: "CHF" },
  { symbol: "NZDJPY", avgPips: 73.6, cashValue100k: 467.42, rangePct: 0.82, tier: "High", baseCurrency: "NZD", quoteCurrency: "JPY" },
  { symbol: "NZDUSD", avgPips: 42.3, cashValue100k: 422.76, rangePct: 0.74, tier: "Medium", baseCurrency: "NZD", quoteCurrency: "USD" },
  { symbol: "USDCAD", avgPips: 55.8, cashValue100k: 396.94, rangePct: 0.40, tier: "Medium", baseCurrency: "USD", quoteCurrency: "CAD" },
  { symbol: "USDCHF", avgPips: 51.1, cashValue100k: 623.08, rangePct: 0.62, tier: "Medium", baseCurrency: "USD", quoteCurrency: "CHF" },
  { symbol: "USDJPY", avgPips: 118.7, cashValue100k: 753.67, rangePct: 0.75, tier: "High", baseCurrency: "USD", quoteCurrency: "JPY" }
];

export const CENTRAL_BANKS: Record<string, CentralBankInfo> = {
  FED: {
    code: "FED",
    name: "Federal Reserve (FED)",
    currentRate: 3.63,
    impliedRate: 3.78,
    nextMeeting: "2026-11-04T14:00:00",
    step: 0.25,
    trajectory: [3.63, 3.78, 3.91, 4.03, 3.88],
    historicalPath1w: [3.63, 3.73, 3.86, 3.98, 3.83],
    historicalPath6w: [3.63, 3.65, 3.72, 3.80, 3.70],
    summary: "FOMC dot plot leans cautious on terminal rate, pricing in moderate forward tightness."
  },
  ECB: {
    code: "ECB",
    name: "European Central Bank (ECB)",
    currentRate: 2.40,
    impliedRate: 2.63,
    nextMeeting: "2026-10-22T14:15:00",
    step: 0.25,
    trajectory: [2.40, 2.63, 2.85, 2.95, 2.80],
    historicalPath1w: [2.40, 2.58, 2.80, 2.90, 2.75],
    historicalPath6w: [2.40, 2.45, 2.60, 2.70, 2.60],
    summary: "Lagarde reiterates data-dependency amidst sticky wage growth and weak manufacturing in core economies."
  },
  BOE: {
    code: "BOE",
    name: "Bank of England (BOE)",
    currentRate: 3.75,
    impliedRate: 3.87,
    nextMeeting: "2026-11-05T12:00:00",
    step: 0.25,
    trajectory: [3.75, 3.87, 4.00, 4.10, 3.95],
    historicalPath1w: [3.75, 3.82, 3.95, 4.05, 3.90],
    historicalPath6w: [3.75, 3.75, 3.80, 3.85, 3.80],
    summary: "MPC divided on services inflation trajectory; gilt issuance dynamics constrain aggressive tightening."
  },
  RBA: {
    code: "RBA",
    name: "Reserve Bank of Australia (RBA)",
    currentRate: 4.35,
    impliedRate: 4.53,
    nextMeeting: "2026-11-03T14:30:00",
    step: 0.25,
    trajectory: [4.35, 4.53, 4.70, 4.80, 4.65],
    historicalPath1w: [4.35, 4.48, 4.65, 4.75, 4.60],
    historicalPath6w: [4.35, 4.40, 4.50, 4.55, 4.45],
    summary: "Hawkish bias persistent due to high domestic unit labor costs and resilient household consumption."
  },
  BOC: {
    code: "BOC",
    name: "Bank of Canada (BOC)",
    currentRate: 2.25,
    impliedRate: 2.33,
    nextMeeting: "2026-10-28T10:00:00",
    step: 0.25,
    trajectory: [2.25, 2.33, 2.40, 2.50, 2.35],
    historicalPath1w: [2.25, 2.30, 2.38, 2.45, 2.30],
    historicalPath6w: [2.25, 2.25, 2.30, 2.35, 2.25],
    summary: "Housing mortgage resets driving economic slowdown, leaving Macklem neutral with dovish lean."
  },
  RBNZ: {
    code: "RBNZ",
    name: "Reserve Bank of NZ (RBNZ)",
    currentRate: 2.50,
    impliedRate: 2.64,
    nextMeeting: "2026-11-25T14:00:00",
    step: 0.25,
    trajectory: [2.50, 2.64, 2.78, 2.92, 2.75],
    historicalPath1w: [2.50, 2.60, 2.72, 2.85, 2.70],
    historicalPath6w: [2.50, 2.52, 2.60, 2.68, 2.55],
    summary: "Aggressive recalibration cycle ongoing as output gap contracts faster than initial projections."
  },
  BOJ: {
    code: "BOJ",
    name: "Bank of Japan (BOJ)",
    currentRate: 1.00,
    impliedRate: 1.20,
    nextMeeting: "2026-10-30T12:00:00",
    step: 0.10,
    trajectory: [1.00, 1.20, 1.35, 1.50, 1.60],
    historicalPath1w: [1.00, 1.15, 1.30, 1.45, 1.55],
    historicalPath6w: [1.00, 1.05, 1.15, 1.25, 1.30],
    summary: "Governor Ueda signals steady normalization path as real wages turn decisively positive across major syndicates."
  },
  SNB: {
    code: "SNB",
    name: "Swiss National Bank (SNB)",
    currentRate: 0.00,
    impliedRate: 0.05,
    nextMeeting: "2026-12-10T09:30:00",
    step: 0.25,
    trajectory: [0.00, 0.05, 0.10, 0.15, 0.05],
    historicalPath1w: [0.00, 0.02, 0.08, 0.12, 0.02],
    historicalPath6w: [0.00, 0.00, 0.05, 0.08, 0.00],
    summary: "Zero rate floor maintained; active FX market interventions to curb deflationary franc appreciation."
  }
};

export const RESEARCH_ARTICLES: ResearchArticle[] = [
  {
    id: "lines-dont-move-capital",
    title: "Why Your Lines and Indicators Don't Move Capital: The Harsh Truth About Technical Analysis",
    category: "Macro vs. Technical",
    date: "Current Cycle",
    readTime: "6 min read",
    featured: true,
    summary: "Chart setups don't fail because you drew lines wrong—they fail because lines don't move financial markets. An examination of macroeconomics, interest rate mechanics, and institutional capital flow over retail technical analysis.",
    contentSections: [
      {
        heading: "The Retail Illusion",
        subheading: "Scenario: The Perfect Setup Shattered",
        paragraphs: [
          "Imagine sitting at your computer for hours, tweaking the settings on your RSI, plotting Fibonacci retracements, and drawing trendlines across your chart. You find what looks like a flawless setup. Price touches your support line, three indicators flash green, and you enter a leveraged buy position.",
          "Ten minutes later, a tier-1 economic release or geopolitical headline hits the tape. Within seconds, price plummets like a stone, smashing right through your support line as if it did not exist. Your stop-loss is triggered instantly.",
          "You are left wondering: What did I do wrong? Was my trendline off by three pixels? Was my moving average period suboptimal?"
        ],
        callout: "THE BRUTAL TRUTH: Your setup did not fail because you drew the line wrong. It failed because lines and indicators have zero mechanical force over financial markets."
      },
      {
        heading: "01. The Coincidence Trap: Why Pure Technical Analysis Fails Long-Term",
        paragraphs: [
          "If you rely 100% on technical analysis (TA), you might win three, five, or even ten trades in a row. But that isn't a persistent statistical edge—it's short-term variance.",
          "Relying solely on TA to preserve capital long-term is like trying to navigate a dark highway by looking only at your rearview mirror. You can see where price has been, but you have zero foresight into whether you are about to drive off a liquidity cliff.",
          "When a chart appears to 'respect' your support line, it is almost always an illusion of quiet liquidity. Price bounced because, at that exact millisecond, institutional order flow was dormant. The moment real institutional capital enters the room, retail chart geometry turns into wet paper."
        ]
      },
      {
        heading: "02. What Actually Moves Markets? (Macroeconomics Made Simple)",
        paragraphs: [
          "Macroeconomics sounds like an academic textbook, but in practice it is the raw story of where institutional trillions migrate and why.",
          "Billion-dollar sovereign wealth funds, multi-strat hedge funds, and primary central bank dealers never allocate capital because an oscillator crossed on a 15-minute timeframe. They rebalance balance sheets based on structural realities:"
        ],
        gridItems: [
          {
            title: "Interest Rates (The Price of Money)",
            desc: "Interest rates are the cost of borrowing capital. When a central bank tightens, capital seeks yield and safety in that sovereign bond market. When liquidity is loose, capital floods risk assets and carry crosses."
          },
          {
            title: "Inflation Expectations & Real Yields",
            desc: "Real yield = Nominal bond yield minus inflation expectations. Currencies with expanding real yield differentials consistently appreciate against low-yielding counterparts over multi-month horizons."
          },
          {
            title: "Labor Market & Economic Activity",
            desc: "Unemployment rates and payroll figures dictate the forward guidance of monetary authorities. Hot employment numbers delay rate cuts, repricing swap curves instantly."
          },
          {
            title: "Cross-Border Trade & Geopolitics",
            desc: "Tariffs, sovereign sanctions, trade balance surpluses, and energy dependencies reconfigure fundamental terms of trade that no retail chart indicator can counter."
          }
        ]
      },
      {
        heading: "03. The Operational Framework: Roadmap vs. Sensor",
        paragraphs: [
          "Does this mean technical analysis is completely obsolete? No. But its functional scope must be strictly disciplined:",
          "Macroeconomics and central bank policy dictate the ENGINE and the ROADMAP: they establish WHAT asset to trade, WHICH direction institutional capital is flowing, and WHY.",
          "Technical analysis serves only as the PARKING SENSOR: providing tactical entry execution, spread assessment, and risk parameterization."
        ],
        callout: "Rule of Engagement: Never allow the parking sensor to overrule the navigational roadmap. When macro context is aligned, charts stop feeling like random noise."
      }
    ]
  },
  {
    id: "g10-rate-path-divergence",
    title: "Divergence in the G10: Tracking the ECB vs. Fed Rate Path Timeline",
    category: "Central Bank Policy",
    date: "2 days ago",
    readTime: "8 min read",
    featured: false,
    summary: "Yield spreads between 2-year Bunds and US Treasuries reveal widening term premia asymmetries as European services momentum softens while US labor resilience holds."
  },
  {
    id: "yen-carry-mechanics",
    title: "The Mechanics of the Yen Carry Trade and Global Liquidity Reversal",
    category: "Yield & Carry Dynamics",
    date: "2 weeks ago",
    readTime: "11 min read",
    featured: false,
    summary: "Deconstructing how zero-interest-rate funding currencies fuel asset speculation in high-beta G10 pairs, and why sudden volatility spikes force rapid deleveraging cycles."
  }
];

export const INITIAL_CONSENSUS_EVENTS: ConsensusEvent[] = [
  { id: "c1", time: "08:30", country: "US", indicator: "Non-Farm Employment Change (NFP)", consensus: "+145K", range: "120K to 175K", prior: "+57K", status: "none", dateIso: "2026-10-02", dayLabel: "FRIDAY, OCT 02, 2026" },
  { id: "c2", time: "08:30", country: "US", indicator: "Unemployment Rate", consensus: "4.1%", range: "4.0% to 4.2%", prior: "4.2%", status: "none", dateIso: "2026-10-02", dayLabel: "FRIDAY, OCT 02, 2026" },
  { id: "c3", time: "10:00", country: "US", indicator: "ISM Manufacturing PMI", consensus: "54.5", range: "53.8 to 55.2", prior: "53.3", status: "none", dateIso: "2026-10-01", dayLabel: "THURSDAY, OCT 01, 2026" },
  { id: "c4", time: "05:00", country: "EUR", indicator: "Eurozone Core CPI MoM", consensus: "0.2%", range: "0.1% to 0.3%", prior: "0.2%", status: "none", dateIso: "2026-09-30", dayLabel: "WEDNESDAY, SEP 30, 2026" },
  { id: "c5", time: "04:30", country: "GB", indicator: "UK S&P Global Services PMI", consensus: "51.6", range: "51.0 to 52.2", prior: "52.1", status: "none", dateIso: "2026-09-29", dayLabel: "TUESDAY, SEP 29, 2026" },
  { id: "c6", time: "09:30", country: "AU", indicator: "RBA Cash Rate Decision", consensus: "4.35%", range: "4.35% to 4.35%", prior: "4.35%", status: "none", dateIso: "2026-10-06", dayLabel: "TUESDAY, OCT 06, 2026" },
  { id: "c7", time: "08:30", country: "CA", indicator: "Net Change in Employment", consensus: "+22.0K", range: "15.0K to 30.0K", prior: "-1.4K", status: "none", dateIso: "2026-10-09", dayLabel: "FRIDAY, OCT 09, 2026" },
  { id: "c8", time: "03:30", country: "CH", indicator: "Swiss Consumer Price Index (CPI) MoM", consensus: "0.1%", range: "0.0% to 0.2%", prior: "-0.2%", status: "none", dateIso: "2026-10-05", dayLabel: "MONDAY, OCT 05, 2026" },
  { id: "c9", time: "21:45", country: "NZ", indicator: "NZ Food Price Index MoM", consensus: "0.1%", range: "-0.1% to 0.3%", prior: "-0.2%", status: "none", dateIso: "2026-10-08", dayLabel: "THURSDAY, OCT 08, 2026" },
  { id: "c10", time: "19:30", country: "JP", indicator: "Tokyo Core CPI YoY", consensus: "2.1%", range: "2.0% to 2.3%", prior: "2.2%", status: "none", dateIso: "2026-09-29", dayLabel: "TUESDAY, SEP 29, 2026" }
];

export const DEFAULT_CURRENCY_INDICATORS: Record<string, MacroIndicator[]> = {
  USD: [
    { name: "ISM Mfg PMI", date: "2026-08-03", time: "10:00:00", previous: 53.3, forecast: 54.5, actual: 55.6, type: "PMI", weight: "5.0" },
    { name: "ISM Services PMI", date: "2026-08-05", time: "10:00:00", previous: 54.0, forecast: 54.6, actual: 54.1, type: "PMI", weight: "5.0" },
    { name: "CPI MoM", date: "2026-08-12", time: "08:30:00", previous: 0.002, forecast: 0.002, actual: 0.001, type: "CPI", weight: "5.0" },
    { name: "Unemployment Rate", date: "2026-08-07", time: "08:30:00", previous: 0.042, forecast: 0.041, actual: 0.041, type: "UNEMP_RATE", weight: "5.0" },
    { name: "NFP", date: "2026-08-07", time: "08:30:00", previous: 57, forecast: 145, actual: -23, type: "NFP", weight: "5.0" },
    { name: "Retail Sales MoM", date: "2026-08-14", time: "08:30:00", previous: 0.002, forecast: 0.004, actual: 0.005, type: "PCT_GROWTH", weight: "4.0" },
    { name: "CB Consumer Confidence", date: "2026-07-28", time: "10:00:00", previous: 99.5, forecast: 100.2, actual: 100.8, type: "CONFIDENCE", weight: "4.0" },
    { name: "NFIB Small Business Index", date: "2026-08-11", time: "06:00:00", previous: 93.1, forecast: 93.5, actual: 93.9, type: "INDEX_SMALL", weight: "3.0" },
    { name: "Atlanta Fed GDPNow", date: "2026-08-19", time: "11:50:00", previous: 0.021, forecast: 0.024, actual: 0.025, type: "PCT_GROWTH", weight: "4.0" }
  ],
  EUR: [
    { name: "HCOB Mfg PMI", date: "2026-08-21", time: "04:00:00", previous: 51.9, forecast: 51.8, actual: 52.8, type: "PMI", weight: "5.0" },
    { name: "HCOB Services PMI", date: "2026-08-05", time: "04:00:00", previous: 52.0, forecast: 51.5, actual: 51.7, type: "PMI", weight: "5.0" },
    { name: "CPI MoM", date: "2026-08-18", time: "05:00:00", previous: 0.002, forecast: 0.002, actual: 0.002, type: "CPI", weight: "5.0" },
    { name: "Unemployment Rate", date: "2026-08-03", time: "05:00:00", previous: 0.063, forecast: 0.063, actual: 0.063, type: "EUR_UNEMP_FIXED", weight: "4.0" },
    { name: "Germany Unemp Change", date: "2026-08-04", time: "03:55:00", previous: 17, forecast: 15, actual: 18, type: "GER_UNEMP_CHANGE", weight: "4.0" },
    { name: "Retail Sales MoM", date: "2026-08-06", time: "05:00:00", previous: -0.003, forecast: 0.001, actual: 0.003, type: "PCT_GROWTH", weight: "4.0" },
    { name: "Consumer Confidence", date: "2026-08-20", time: "10:00:00", previous: -13.0, forecast: -12.5, actual: -12.2, type: "CONFIDENCE", weight: "3.0" },
    { name: "IFO Business Climate", date: "2026-08-26", time: "04:00:00", previous: 85.5, forecast: 86.0, actual: 86.5, type: "INDEX_SMALL", weight: "4.0" },
    { name: "Industrial Production MoM", date: "2026-08-13", time: "05:00:00", previous: -0.006, forecast: 0.002, actual: 0.005, type: "PCT_GROWTH", weight: "3.0" }
  ],
  GBP: [
    { name: "S&P Mfg PMI", date: "2026-08-21", time: "04:30:00", previous: 52.1, forecast: 51.4, actual: 52.5, type: "PMI", weight: "5.0" },
    { name: "S&P Services PMI", date: "2026-08-21", time: "04:30:00", previous: 52.1, forecast: 51.6, actual: 52.8, type: "PMI", weight: "5.0" },
    { name: "CPI MoM", date: "2026-08-19", time: "02:00:00", previous: 0.001, forecast: 0.002, actual: 0.002, type: "CPI", weight: "5.0" },
    { name: "Unemployment Rate", date: "2026-08-11", time: "02:00:00", previous: 0.044, forecast: 0.044, actual: 0.044, type: "UNEMP_RATE", weight: "5.0" },
    { name: "Claimant Count", date: "2026-08-11", time: "02:00:00", previous: 13.5, forecast: 22.0, actual: 23.7, type: "GBP_CLAIMANT", weight: "4.0" },
    { name: "Retail Sales MoM", date: "2026-08-21", time: "02:00:00", previous: 0.005, forecast: -0.002, actual: -0.001, type: "GBP_RETAIL", weight: "4.0" },
    { name: "GfK Consumer Confidence", date: "2026-08-21", time: "19:01:00", previous: -13, forecast: -12, actual: -11, type: "CONFIDENCE", weight: "4.0" },
    { name: "CBI Industrial Trends", date: "2026-08-20", time: "06:00:00", previous: -20, forecast: -18, actual: -15, type: "SURVEY_5", weight: "3.0" },
    { name: "Monthly GDP", date: "2026-08-14", time: "02:00:00", previous: 0.002, forecast: 0.001, actual: 0.001, type: "PCT_GROWTH", weight: "5.0" }
  ],
  JPY: [
    { name: "Jibun Mfg PMI", date: "2026-08-21", time: "20:30:00", previous: 49.1, forecast: 49.5, actual: 49.8, type: "PMI", weight: "5.0" },
    { name: "Jibun Services PMI", date: "2026-08-21", time: "20:30:00", previous: 53.7, forecast: 54.0, actual: 54.1, type: "PMI", weight: "5.0" },
    { name: "Tokyo CPI MoM", date: "2026-07-31", time: "19:30:00", previous: 0.002, forecast: 0.001, actual: 0.002, type: "CPI", weight: "5.0" },
    { name: "Unemployment Rate", date: "2026-07-31", time: "19:30:00", previous: 0.025, forecast: 0.025, actual: 0.025, type: "UNEMP_RATE", weight: "5.0" },
    { name: "Cash Earnings MoM", date: "2026-08-06", time: "19:30:00", previous: 0.045, forecast: 0.023, actual: 0.021, type: "PCT_GROWTH", weight: "5.0" },
    { name: "Retail Sales MoM", date: "2026-07-30", time: "19:50:00", previous: 0.006, forecast: 0.002, actual: 0.004, type: "PCT_GROWTH", weight: "4.0" },
    { name: "Consumer Survey", date: "2026-08-05", time: "01:00:00", previous: 36.7, forecast: 37.0, actual: 36.4, type: "CONFIDENCE", weight: "4.0" },
    { name: "Reuters Tankan", date: "2026-08-19", time: "19:00:00", previous: 7, forecast: 9, actual: 10, type: "SURVEY_5", weight: "4.0" },
    { name: "JCER Monthly GDP", date: "2026-08-17", time: "19:50:00", previous: 0.002, forecast: -0.001, actual: 0.001, type: "PCT_GROWTH", weight: "4.0" }
  ],
  AUD: [
    { name: "Judo Mfg PMI", date: "2026-08-21", time: "19:00:00", previous: 47.5, forecast: 48.0, actual: 48.2, type: "PMI", weight: "5.0" },
    { name: "Judo Services PMI", date: "2026-08-21", time: "19:00:00", previous: 50.4, forecast: 50.6, actual: 50.8, type: "AUD_SERVICES", weight: "5.0" },
    { name: "CPI Indicator MoM", date: "2026-07-31", time: "21:30:00", previous: 0.0049, forecast: 0.0036, actual: 0.0005, type: "CPI", weight: "5.0" },
    { name: "Unemployment Rate", date: "2026-08-20", time: "21:30:00", previous: 0.044, forecast: 0.044, actual: 0.045, type: "UNEMP_RATE", weight: "5.0" },
    { name: "Employment Change", date: "2026-08-20", time: "21:30:00", previous: 80.3, forecast: 15.0, actual: -15.8, type: "JOBS_K", weight: "5.0" },
    { name: "Retail Sales MoM", date: "2026-08-04", time: "21:30:00", previous: 0.005, forecast: 0.003, actual: 0.005, type: "PCT_GROWTH", weight: "4.0" },
    { name: "Westpac Sentiment", date: "2026-08-11", time: "19:30:00", previous: 82.7, forecast: 83.5, actual: 84.1, type: "CONFIDENCE", weight: "4.0" },
    { name: "NAB Business Confidence", date: "2026-08-11", time: "20:30:00", previous: 4, forecast: 5, actual: 6, type: "SURVEY_5", weight: "4.0" },
    { name: "AIG Industry Index", date: "2026-08-17", time: "18:00:00", previous: -6.1, forecast: -5.0, actual: -4.2, type: "SURVEY_5", weight: "3.0" }
  ],
  NZD: [
    { name: "BusNZ Mfg PMI", date: "2026-08-14", time: "18:30:00", previous: 41.1, forecast: 42.5, actual: 43.0, type: "PMI", weight: "5.0" },
    { name: "BusNZ Services PMI", date: "2026-08-17", time: "17:30:00", previous: 40.2, forecast: 42.0, actual: 41.5, type: "PMI", weight: "5.0" },
    { name: "Food Prices MoM", date: "2026-08-13", time: "17:45:00", previous: -0.002, forecast: 0.001, actual: 0.002, type: "CPI", weight: "4.0" },
    { name: "Unemployment Rate", date: "2026-08-05", time: "17:45:00", previous: 0.046, forecast: 0.047, actual: 0.046, type: "UNEMP_RATE", weight: "5.0" },
    { name: "MEI Jobs Change", date: "2026-07-29", time: "17:45:00", previous: 0.001, forecast: 0.001, actual: 0.001, type: "PCT_GROWTH", weight: "4.0" },
    { name: "Card Transactions", date: "2026-08-11", time: "17:45:00", previous: -0.003, forecast: 0.001, actual: 0.002, type: "CARD_TRANS", weight: "4.0" },
    { name: "ANZ Consumer Confidence", date: "2026-07-31", time: "21:00:00", previous: 87.9, forecast: 89.0, actual: 88.2, type: "CONFIDENCE", weight: "4.0" },
    { name: "ANZ Business Confidence", date: "2026-07-30", time: "20:00:00", previous: 27.1, forecast: 30.0, actual: 29.5, type: "ANZ_BIZ", weight: "4.0" },
    { name: "BusNZ Activity Index", date: "2026-08-18", time: "17:30:00", previous: -0.002, forecast: 0.001, actual: 0.001, type: "PCT_GROWTH", weight: "4.0" }
  ],
  CAD: [
    { name: "S&P Mfg PMI", date: "2026-08-04", time: "09:30:00", previous: 47.8, forecast: 48.5, actual: 48.1, type: "PMI", weight: "5.0" },
    { name: "Ivey PMI", date: "2026-08-07", time: "10:00:00", previous: 57.6, forecast: 56.5, actual: 57.1, type: "PMI", weight: "5.0" },
    { name: "CPI MoM", date: "2026-08-18", time: "08:30:00", previous: -0.001, forecast: 0.002, actual: 0.001, type: "CPI", weight: "5.0" },
    { name: "Unemployment Rate", date: "2026-08-07", time: "08:30:00", previous: 0.064, forecast: 0.064, actual: 0.064, type: "UNEMP_RATE", weight: "5.0" },
    { name: "Net Employment Change", date: "2026-08-07", time: "08:30:00", previous: -1.4, forecast: 22.0, actual: -2.8, type: "CAD_JOBS", weight: "5.0" },
    { name: "Retail Sales MoM", date: "2026-08-21", time: "08:30:00", previous: -0.008, forecast: 0.004, actual: 0.003, type: "PCT_GROWTH", weight: "4.0" },
    { name: "CB Consumer Survey", date: "2026-08-11", time: "11:00:00", previous: 50.15, forecast: 51.0, actual: 50.8, type: "CONFIDENCE", weight: "4.0" },
    { name: "CFIB Business Barometer", date: "2026-08-06", time: "10:00:00", previous: 55.4, forecast: 56.0, actual: 55.9, type: "CONFIDENCE", weight: "3.0" },
    { name: "Monthly GDP MoM", date: "2026-07-31", time: "08:30:00", previous: 0.003, forecast: 0.002, actual: 0.002, type: "PCT_GROWTH", weight: "5.0" }
  ],
  CHF: [
    { name: "Procure Mfg PMI", date: "2026-08-04", time: "03:30:00", previous: 43.1, forecast: 44.5, actual: 43.9, type: "PMI", weight: "5.0" },
    { name: "Procure Services PMI", date: "2026-08-05", time: "03:30:00", previous: 52.4, forecast: 53.0, actual: 52.7, type: "PMI", weight: "5.0" },
    { name: "CPI MoM", date: "2026-08-04", time: "02:30:00", previous: -0.002, forecast: 0.001, actual: -0.001, type: "CPI", weight: "5.0" },
    { name: "Unemp Rate", date: "2026-08-07", time: "03:00:00", previous: 0.024, forecast: 0.024, actual: 0.025, type: "UNEMP_RATE", weight: "5.0" },
    { name: "Unemp Change", date: "2026-08-07", time: "03:00:00", previous: 1.2, forecast: 1.0, actual: 1.1, type: "CHF_UNEMP_CHANGE", weight: "4.0" },
    { name: "Retail Sales MoM", date: "2026-07-31", time: "02:30:00", previous: 0.003, forecast: 0.002, actual: 0.001, type: "PCT_GROWTH", weight: "4.0" },
    { name: "Consumer Sentiment", date: "2026-08-06", time: "03:00:00", previous: -34.0, forecast: -32.0, actual: -33.0, type: "CONFIDENCE", weight: "4.0" },
    { name: "KOF Indicator", date: "2026-07-30", time: "03:00:00", previous: 101.0, forecast: 101.5, actual: 101.2, type: "CONFIDENCE", weight: "4.0" },
    { name: "SECO Economic Indicators", date: "2026-08-18", time: "03:00:00", previous: 0.012, forecast: 0.013, actual: 0.013, type: "PCT_GROWTH", weight: "5.0" }
  ]
};

export const PAIRS_LIST = [
  "EURUSD", "GBPUSD", "AUDUSD", "NZDUSD", "USDCAD", "USDCHF", "USDJPY",
  "EURGBP", "EURAUD", "EURNZD", "EURCAD", "EURCHF", "EURJPY",
  "GBPAUD", "GBPNZD", "GBPCAD", "GBPCHF", "GBPJPY",
  "AUDNZD", "AUDCAD", "AUDCHF", "AUDJPY",
  "NZDCAD", "NZDCHF", "NZDJPY",
  "CADCHF", "CADJPY", "CHFJPY"
];
