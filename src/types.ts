export type Language = 'en' | 'es';

export type Theme = 'dark' | 'light';

export type NavigationTab = 'console' | 'research' | 'academy' | 'tools';

export type ToolSubTab = 'all' | 'quant-desk' | 'calendar-filter' | 'currency-strength' | 'volatility' | 'calculator' | 'central-banks' | 'consensus';

export interface ResearchArticle {
  id: string;
  title: string;
  category: string;
  date: string;
  readTime: string;
  summary: string;
  featured?: boolean;
  contentSections?: {
    heading: string;
    subheading?: string;
    paragraphs: string[];
    callout?: string;
    gridItems?: { title: string; desc: string }[];
  }[];
}

export interface CentralBankInfo {
  code: string;
  name: string;
  currentRate: number;
  impliedRate: number;
  nextMeeting: string;
  step: number;
  trajectory: number[];
  historicalPath1w: number[];
  historicalPath6w: number[];
  summary: string;
}

export interface VolatilityPair {
  symbol: string;
  avgPips: number;
  cashValue100k: number;
  rangePct: number;
  tier: 'High' | 'Medium' | 'Low';
  baseCurrency: string;
  quoteCurrency: string;
}

export interface ConsensusEvent {
  id: string;
  time: string;
  country: string;
  indicator: string;
  consensus: string;
  range: string;
  prior: string;
  status: 'none' | 'green' | 'red';
  dateIso: string;
  dayLabel: string;
}

export interface MacroIndicator {
  name: string;
  date: string;
  time?: string;
  previous: number | null;
  forecast: number | null;
  actual: number | null;
  type: string;
  weight: string;
  score?: number;
  netChange?: number;
}
