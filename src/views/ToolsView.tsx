import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import {
  Download,
  Upload,
  FileSpreadsheet,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Landmark,
  Calendar,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { ToolSubTab, MacroIndicator, Language } from '../types';
import {
  CENTRAL_BANKS,
  INITIAL_CONSENSUS_EVENTS,
  DEFAULT_CURRENCY_INDICATORS,
  PAIRS_LIST
} from '../data/macroData';
import { TRANSLATIONS } from '../locales/translations';
import { KairosMacroHub } from '../components/KairosMacroHub';
import { QuantDesk } from '../components/QuantDesk';
import { ValuationRankingChart } from '../components/ValuationRankingChart';
import { CurrencyIndicatorChart } from '../components/CurrencyIndicatorChart';
import { SectionDivider } from '../components/SectionDivider';
import { ToolGrid } from '../components/ToolGrid';
import { ToolHeader } from '../components/ToolHeader';
import { SpreadsheetDropZone } from '../components/SpreadsheetDropZone';
import {
  normalizeCurrencyCode,
  isG10Currency,
  G10_CURRENCIES,
  INVESTING_COUNTRY_TO_CURRENCY_MAP
} from '../utils/currencyUtils';

export interface CentralBankTerminalItem {
  code: string;
  name: string;
  rate: number;
  implied: number;
  nextMeeting: string;
  step: number;
  trajectory: number[];
}

const DEFAULT_RATES_DATA: Record<string, CentralBankTerminalItem> = {
  FED: { code: "FED", name: "Federal Reserve (FED)", rate: 3.63, nextMeeting: "2026-10-14T14:00:00", step: 0.25, implied: 3.78, trajectory: [3.63, 3.78, 3.91, 4.03, 3.88] },
  ECB: { code: "ECB", name: "European Central Bank (ECB)", rate: 2.40, nextMeeting: "2026-10-22T14:15:00", step: 0.25, implied: 2.63, trajectory: [2.40, 2.63, 2.85, 2.95, 2.80] },
  BOE: { code: "BOE", name: "Bank of England (BOE)", rate: 3.75, nextMeeting: "2026-11-05T12:00:00", step: 0.25, implied: 3.87, trajectory: [3.75, 3.87, 4.00, 4.10, 3.95] },
  RBA: { code: "RBA", name: "Reserve Bank of Australia (RBA)", rate: 4.35, nextMeeting: "2026-10-06T14:30:00", step: 0.25, implied: 4.53, trajectory: [4.35, 4.53, 4.70, 4.80, 4.65] },
  BOC: { code: "BOC", name: "Bank of Canada (BOC)", rate: 2.25, nextMeeting: "2026-10-28T10:00:00", step: 0.25, implied: 2.33, trajectory: [2.25, 2.33, 2.40, 2.50, 2.35] },
  RBNZ: { code: "RBNZ", name: "Reserve Bank of NZ (RBNZ)", rate: 2.50, nextMeeting: "2026-10-07T14:00:00", step: 0.25, implied: 2.64, trajectory: [2.50, 2.64, 2.78, 2.92, 2.75] },
  BOJ: { code: "BOJ", name: "Bank of Japan (BOJ)", rate: 1.00, nextMeeting: "2026-10-30T12:00:00", step: 0.10, implied: 1.20, trajectory: [1.00, 1.20, 1.35, 1.50, 1.60] },
  SNB: { code: "SNB", name: "Swiss National Bank (SNB)", rate: 0.00, nextMeeting: "2026-12-10T09:30:00", step: 0.25, implied: 0.05, trajectory: [0.00, 0.05, 0.10, 0.15, 0.05] }
};

interface ToolsViewProps {
  initialSubTab?: ToolSubTab;
  onSubTabChange?: (tab: ToolSubTab) => void;
  language?: Language;
}

export function ToolsView({ initialSubTab = 'all', onSubTabChange, language = 'en' }: ToolsViewProps) {
  const [activeTab, setActiveTab] = useState<ToolSubTab>(initialSubTab === 'central-banks' ? 'all' : initialSubTab);

  const t = TRANSLATIONS[language];

  const handleTabSwitch = (tab: ToolSubTab) => {
    if (tab === 'central-banks') {
      window.open('https://central-bank-tool.onrender.com/', '_blank');
      return;
    }
    setActiveTab(tab);
    onSubTabChange?.(tab);
  };

  // Risk Calculator state
  const [calcAcctCurr, setCalcAcctCurr] = useState<string>('USD');
  const [calcPair, setCalcPair] = useState<string>('EURUSD');
  const [calcBalance, setCalcBalance] = useState<number>(10000);
  const [calcRiskPct, setCalcRiskPct] = useState<number>(1.0);
  const [calcStopPips, setCalcStopPips] = useState<number>(25);

  // Central Banks state
  const [ratesData, setRatesData] = useState<Record<string, CentralBankTerminalItem>>(() => {
    try {
      const saved = localStorage.getItem('central_bank_terminal_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return DEFAULT_RATES_DATA;
  });
  const [selectedBankKey, setSelectedBankKey] = useState<string>('Overview');
  const [bankSortColumn, setBankSortColumn] = useState<'nextMeeting' | 'name' | 'rate' | 'implied' | 'deltaBps' | 'prob' | 'tone'>('nextMeeting');
  const [bankSortAsc, setBankSortAsc] = useState<boolean>(true);
  const [drillRate, setDrillRate] = useState<string>('');
  const [drillImplied, setDrillImplied] = useState<string>('');
  const [drillMeeting, setDrillMeeting] = useState<string>('');

  const bankJsonFileRef = useRef<HTMLInputElement>(null);
  const bankInvestingFileRef = useRef<HTMLInputElement>(null);
  const currencyInvestingFileRef = useRef<HTMLInputElement>(null);

  // Save ratesData to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('central_bank_terminal_v2', JSON.stringify(ratesData));
    } catch {}
  }, [ratesData]);

  // Consensus state
  const [consensusEvents, setConsensusEvents] = useState(INITIAL_CONSENSUS_EVENTS);
  const [consensusSearch, setConsensusSearch] = useState<string>('');

  // Currency Strength state
  const [currencyIndicators, setCurrencyIndicators] = useState<Record<string, MacroIndicator[]>>(() => {
    try {
      const saved = localStorage.getItem('forex_dashboard_data_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {}
    return DEFAULT_CURRENCY_INDICATORS;
  });
  const [currencyActiveTab, setCurrencyActiveTab] = useState<string>('dashboard');
  const [currencySort, setCurrencySort] = useState<'divergence' | 'bullish' | 'bearish' | 'default'>('divergence');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'strong' | 'bullish' | 'bearish'>('all');
  const [isValuationDragOver, setIsValuationDragOver] = useState<boolean>(false);
  const [valuationUpdateMode, setValuationUpdateMode] = useState<'incremental' | 'baseline'>('incremental');
  const [uploadModal, setUploadModal] = useState<{
    isOpen: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    updatedCount?: number;
    currencies?: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save currencyIndicators to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('forex_dashboard_data_v2', JSON.stringify(currencyIndicators));
    } catch {}
  }, [currencyIndicators]);

  // --- Risk Calculator Math ---
  const calculateRiskValues = () => {
    const cashRisk = calcBalance * (calcRiskPct / 100);
    const quoteCurr = calcPair.substring(3, 6);
    const pipSize = quoteCurr === 'JPY' ? 0.01 : 0.0001;
    const contractUnits = 100000;
    
    const rateToUSD: Record<string, number> = {
      USD: 1.0,
      EUR: 1.0845,
      GBP: 1.2982,
      AUD: 0.6588,
      NZD: 0.5974,
      CAD: 1 / 1.3615,
      CHF: 1 / 0.8842,
      JPY: 1 / 154.22
    };

    const quoteToUsdRate = rateToUSD[quoteCurr] || 1.0;
    const acctToUsdRate = rateToUSD[calcAcctCurr] || 1.0;
    const quoteToAcctFactor = quoteToUsdRate / acctToUsdRate;

    const pipValueInQuotePerLot = pipSize * contractUnits;
    const pipValueInAcctPerLot = pipValueInQuotePerLot * quoteToAcctFactor;

    let standardLots = 0;
    if (calcStopPips > 0 && pipValueInAcctPerLot > 0) {
      standardLots = cashRisk / (calcStopPips * pipValueInAcctPerLot);
    }
    const finalLots = Math.max(0.01, +(standardLots.toFixed(2)));
    const totalPipVal = finalLots * pipValueInAcctPerLot;

    return {
      cashRisk,
      standardLots: finalLots,
      pipValue: totalPipVal,
      standardPipValue: pipValueInAcctPerLot
    };
  };

  const riskResult = calculateRiskValues();

  // --- Central Bank Tone Classifier ---
  const classifyTone = (deltaBps: number, outcome: string) => {
    if (deltaBps >= 20) {
      return { label: "Strongly Hawkish", class: "text-emerald-300 bg-emerald-950/80 border-emerald-500/50" };
    } else if (deltaBps >= 10 && outcome === "HIKE") {
      return { label: "Hawkish / Hike Bias", class: "text-emerald-400 bg-emerald-950/50 border-emerald-500/30" };
    } else if (outcome === "HOLD" && deltaBps > 5) {
      return { label: "Hawkish Hold", class: "text-teal-300 bg-teal-950/50 border-teal-500/30" };
    } else if (Math.abs(deltaBps) <= 5) {
      return { label: "Neutral / Data-Dependent", class: "text-zinc-300 bg-zinc-800/60 border-zinc-700" };
    } else if (outcome === "HOLD" && deltaBps < -5) {
      return { label: "Dovish Hold", class: "text-amber-300 bg-amber-950/50 border-amber-500/30" };
    } else if (deltaBps <= -6 && deltaBps > -18) {
      return { label: "Dovish Pivot", class: "text-rose-300 bg-rose-950/50 border-rose-500/30" };
    } else {
      return { label: "Strongly Dovish", class: "text-rose-400 bg-rose-950/80 border-rose-500/50" };
    }
  };

  // Helper to format weights ("High" -> "5.0", "Med" -> "4.0", "Low" -> "3.0", or numeric strings)
  const formatWeight = (weight: any): string => {
    if (typeof weight === 'number' && !isNaN(weight) && weight > 0) return weight.toFixed(1);
    const s = String(weight || '').trim().toLowerCase();
    if (s === 'high' || s === 'h' || s === '5.0' || s === '5') return "5.0";
    if (s === 'med' || s === 'medium' || s === 'm' || s === '4.0' || s === '4') return "4.0";
    if (s === 'low' || s === 'l' || s === '3.0' || s === '3') return "3.0";
    const num = parseFloat(s);
    return (!isNaN(num) && num > 0) ? num.toFixed(1) : "4.0";
  };

  const parseWeight = (weight: any): number => {
    return parseFloat(formatWeight(weight));
  };

  const formatTimeTo24h = (val: any, fallback: string = "08:30:00"): string => {
    if (val === null || val === undefined || val === '') return fallback;
    if (typeof val === 'number' && !isNaN(val)) {
      if (val >= 0 && val < 1) {
        const totalSec = Math.round(val * 86400);
        const h = Math.floor(totalSec / 3600) % 24;
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
    }
    const s = String(val).trim();
    if (!s || s === '—' || s === '-' || s === 'N/A' || s === 'ND') return fallback;

    if (/^0\.\d+$/.test(s)) {
      const num = parseFloat(s);
      if (!isNaN(num)) {
        const totalSec = Math.round(num * 86400);
        const h = Math.floor(totalSec / 3600) % 24;
        const m = Math.floor((totalSec % 3600) / 60);
        const sec = totalSec % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      }
    }

    const ampmMatch = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)$/i);
    if (ampmMatch) {
      let h = parseInt(ampmMatch[1], 10);
      const m = ampmMatch[2];
      const sec = ampmMatch[3] || '00';
      const isPm = ampmMatch[4].toLowerCase() === 'pm';
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${m}:${sec}`;
    }

    const match24 = s.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
    if (match24) {
      const h = String(parseInt(match24[1], 10)).padStart(2, '0');
      const m = match24[2];
      const sec = match24[3] ? match24[3].padStart(2, '0') : '00';
      return `${h}:${m}:${sec}`;
    }

    return fallback;
  };

  // --- Strict Value Formatting & Display Helpers ---
  const isPercentType = (type: string) =>
    ["CPI", "UNEMP_RATE", "PCT_GROWTH", "EUR_UNEMP_FIXED", "CARD_TRANS", "GBP_RETAIL"].includes((type || '').toUpperCase());

  const isThousandsType = (type: string) =>
    ["NFP", "JOBS_K", "CAD_JOBS", "GBP_CLAIMANT", "GER_UNEMP_CHANGE", "CHF_UNEMP_CHANGE"].includes((type || '').toUpperCase());

  const formatIndicatorDisplay = (val: number | null | undefined, type: string): string => {
    if (val === null || val === undefined || (val as any) === '' || isNaN(val as any)) return '';
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return '';

    if (isPercentType(type)) {
      const pct = num * 100;
      return `${pct.toFixed(2)}%`;
    }
    if (isThousandsType(type)) {
      const rounded = Math.abs(num % 1) > 0.001 ? num.toFixed(1) : String(Math.round(num));
      return `${rounded}k`;
    }
    return String(num);
  };

  const formatNetChangeDisplay = (netChange: number | null | undefined, type: string): string => {
    if (netChange === null || netChange === undefined || (netChange as any) === '' || isNaN(netChange as any)) return '—';
    const num = typeof netChange === 'number' ? netChange : parseFloat(netChange);
    if (isNaN(num)) return '—';

    const prefix = num > 0 ? '+' : '';
    if (isPercentType(type)) {
      const pct = num * 100;
      return `${prefix}${pct.toFixed(2)}%`;
    }
    if (isThousandsType(type)) {
      const rounded = Math.abs(num % 1) > 0.001 ? num.toFixed(1) : String(Math.round(num));
      return `${prefix}${rounded}k`;
    }
    return `${prefix}${num}`;
  };

  // --- Currency Strength Input Parser ---
  const parseInputValue = (input: any, type: string, eventName: string = ''): number | null => {
    if (input === null || input === undefined || input === '') return null;
    let strVal = String(input).trim();
    if (strVal === '-' || strVal === '—' || strVal === 'N/A' || strVal === 'n/a' || strVal === 'ND' || strVal === '') return null;

    const isExplicitPercent = strVal.includes('%');
    const hasK = /k$/i.test(strVal) || /k\b/i.test(strVal);
    const typeUpper = (type || '').toUpperCase();

    // Thousand commas & European comma decimal sanitization
    if (strVal.includes(',') && !strVal.includes('.')) {
      const commaParts = strVal.split(',');
      if (commaParts.length === 2 && commaParts[1].replace(/[^0-9]/g, '').length === 3 && parseInt(commaParts[0], 10) > 0 && !isExplicitPercent) {
        strVal = strVal.replace(/,/g, '');
      } else {
        strVal = strVal.replace(',', '.');
      }
    } else if (strVal.includes(',') && strVal.includes('.')) {
      if (strVal.indexOf('.') < strVal.indexOf(',')) {
        strVal = strVal.replace(/\./g, '').replace(',', '.');
      } else {
        strVal = strVal.replace(/,/g, '');
      }
    }

    let cleanStr = strVal.replace(/[%+kK]/g, '').trim();
    let num = parseFloat(cleanStr);
    if (isNaN(num)) return null;

    if (isThousandsType(typeUpper)) {
      if (Math.abs(num) >= 500 && !hasK) {
        num = num / 1000;
      }
      return parseFloat(num.toFixed(1));
    }

    if (typeUpper === 'UNEMP_RATE' || typeUpper === 'EUR_UNEMP_FIXED') {
      if (isExplicitPercent || Math.abs(num) >= 0.20) {
        num = num / 100.0;
      }
      return parseFloat(num.toFixed(4));
    }

    if (isPercentType(typeUpper)) {
      if (isExplicitPercent || Math.abs(num) >= 0.05) {
        num = num / 100.0;
      }
      return parseFloat(num.toFixed(4));
    }

    const evLower = eventName.toLowerCase();
    if (evLower.includes('westpac') && isExplicitPercent) {
      num = parseFloat((83.5 * (1 + num / 100)).toFixed(1));
    }

    return parseFloat(num.toFixed(2));
  };

  // --- Mathematical Scoring Engine (Legacy Discrete Integer Engine) ---
  const evaluateIndicator = (ind: MacroIndicator): { netChange: number | null; score: number } => {
    // If actual or previous has not been released yet, prevent score/netChange evaluation
    if (ind.actual === null || ind.actual === undefined || (ind.actual as any) === '' || isNaN(ind.actual as any)) {
      return { netChange: null, score: 0 };
    }
    if (ind.previous === null || ind.previous === undefined || (ind.previous as any) === '' || isNaN(ind.previous as any)) {
      return { netChange: null, score: 0 };
    }

    // Safety protection for index-based surveys (PMI, Consumer Surveys, Confidence indices):
    // An actual of 0 or <= 0 when previous is a non-zero index level (e.g. 35.4) is an unreleased placeholder.
    const indexTypes = ["PMI", "AUD_SERVICES", "CONFIDENCE", "INDEX_SMALL", "SURVEY_5", "ANZ_BIZ"];
    if (indexTypes.includes(ind.type) && ind.actual === 0 && (ind.previous > 5 || ind.previous < -5)) {
      return { netChange: null, score: 0 };
    }

    const netChange = parseFloat((ind.actual - ind.previous).toFixed(4));
    let score = 0;
    switch(ind.type) {
      case "PMI":
      case "AUD_SERVICES":
        if (netChange >= 2.0) score = 2; else if (netChange >= 0.5) score = 1; else if (netChange > -0.5) score = 0; else if (netChange > -2.0) score = -1; else score = -2; break;
      case "CPI":
      case "PCT_GROWTH":
      case "GBP_RETAIL":
      case "CARD_TRANS":
        if (netChange >= 0.003) score = 2; else if (netChange >= 0.001) score = 1; else if (netChange > -0.001) score = 0; else if (netChange > -0.003) score = -1; else score = -2; break;
      case "UNEMP_RATE":
      case "EUR_UNEMP_FIXED":
        if (netChange <= -0.002) score = 2; else if (netChange <= -0.001) score = 1; else if (netChange === 0) score = 0; else if (netChange < 0.002) score = -1; else score = -2; break;
      case "GBP_CLAIMANT":
      case "GER_UNEMP_CHANGE":
      case "CHF_UNEMP_CHANGE":
        if (netChange <= -15.0) score = 2; else if (netChange <= -3.0) score = 1; else if (netChange < 3.0) score = 0; else if (netChange < 15.0) score = -1; else score = -2; break;
      case "JOBS_K":
      case "CAD_JOBS":
        if (netChange >= 40.0) score = 2; else if (netChange >= 10.0) score = 1; else if (netChange > -10.0) score = 0; else if (netChange > -40.0) score = -1; else score = -2; break;
      case "NFP":
        if (netChange >= 50) score = 2; else if (netChange >= 15) score = 1; else if (netChange > -15) score = 0; else if (netChange > -50) score = -1; else score = -2; break;
      case "CONFIDENCE":
      case "INDEX_SMALL":
      case "SURVEY_5":
      case "ANZ_BIZ":
        if (netChange >= 4.0) score = 2; else if (netChange >= 1.0) score = 1; else if (netChange > -1.0) score = 0; else if (netChange > -4.0) score = -1; else score = -2; break;
      default: score = netChange > 0 ? 1 : netChange < 0 ? -1 : 0;
    }
    return { netChange, score };
  };

  // Discrete Integer Total: sum of individual indicator scores
  const calculateCurrencyTotals = () => {
    const totals: Record<string, number> = {};
    for (const c in currencyIndicators) {
      let sum = 0;
      (currencyIndicators[c] || []).forEach(ind => {
        const evalResult = evaluateIndicator(ind);
        ind.netChange = evalResult.netChange;
        ind.score = evalResult.score;
        sum += (ind.score || 0);
      });
      totals[c] = sum;
    }
    return totals;
  };

  const currencyTotals = calculateCurrencyTotals();

  const getPairDivergence = (base: string, quote: string) => {
    const bScore = currencyTotals[base] !== undefined ? currencyTotals[base] : 0;
    const qScore = currencyTotals[quote] !== undefined ? currencyTotals[quote] : 0;
    const diff = bScore - qScore;

    let longPct = Math.max(5, Math.min(95, Math.round(50 + (diff * 2.5))));
    const shortPct = 100 - longPct;

    let biasText = 'NEUTRAL', badgeBg = 'bg-[#111116] text-zinc-500 border-zinc-800';
    if (diff >= 8) { biasText = 'STRONG BULL', badgeBg = 'bg-cyan-950/40 text-cyan-400 border-cyan-900/60'; }
    else if (diff >= 3) { biasText = 'BULLISH', badgeBg = 'bg-emerald-950/30 text-emerald-400 border-emerald-900/40'; }
    else if (diff <= -8) { biasText = 'STRONG BEAR', badgeBg = 'bg-rose-950/40 text-rose-400 border-rose-900/60'; }
    else if (diff <= -3) { biasText = 'BEARISH', badgeBg = 'bg-orange-950/30 text-orange-400 border-orange-900/40'; }

    return { diff, biasText, badgeBg, longPct, shortPct };
  };

  const sortedPairsData = PAIRS_LIST.map((pair) => {
    const base = pair.substring(0, 3);
    const quote = pair.substring(3, 6);
    const div = getPairDivergence(base, quote);
    return { pair, base, quote, ...div };
  }).sort((a, b) => {
    if (currencySort === 'divergence') return Math.abs(b.diff) - Math.abs(a.diff);
    if (currencySort === 'bullish') return b.diff - a.diff;
    if (currencySort === 'bearish') return a.diff - b.diff;
    return 0;
  });

  const filteredPairs = sortedPairsData.filter((p) => {
    if (currencyFilter === 'strong') return Math.abs(p.diff) >= 8;
    if (currencyFilter === 'bullish') return p.diff > 0;
    if (currencyFilter === 'bearish') return p.diff < 0;
    return true;
  });

  const updateIndicatorValue = (curr: string, idx: number, field: 'date' | 'previous' | 'forecast' | 'actual', rawVal: string) => {
    setCurrencyIndicators((prev) => {
      const currentList = [...(prev[curr] || [])];
      const item = { ...currentList[idx] };

      if (field === 'date') {
        item.date = rawVal;
      } else {
        item[field] = parseInputValue(rawVal, item.type, item.name);
      }

      currentList[idx] = item;
      return {
        ...prev,
        [curr]: currentList,
      };
    });
  };

  const validateAppData = (data: any): boolean => {
    const requiredCurrencies = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"];
    if (typeof data !== 'object' || data === null) return false;
    return requiredCurrencies.every(curr => Array.isArray(data[curr]));
  };

  const sanitizeImportedState = (rawObj: any): Record<string, MacroIndicator[]> | null => {
    let targetObj = rawObj;
    if (rawObj && typeof rawObj === 'object') {
      if (rawObj.data && validateAppData(rawObj.data)) targetObj = rawObj.data;
      else if (rawObj.appData && validateAppData(rawObj.appData)) targetObj = rawObj.appData;
    }
    if (!validateAppData(targetObj)) return null;

    const cleaned: Record<string, MacroIndicator[]> = JSON.parse(JSON.stringify(targetObj));
    Object.keys(cleaned).forEach(curr => {
      if (Array.isArray(cleaned[curr])) {
        cleaned[curr] = cleaned[curr].map((item: any) => {
          if (!item) return item;
          const defaultInd = (DEFAULT_CURRENCY_INDICATORS[curr] || []).find(d => d.name === item.name);
          const fallbackTime = defaultInd ? (defaultInd.time || "08:30:00") : "08:30:00";
          const cleanTime = formatTimeTo24h(item.time, fallbackTime);
          let cleanDate = item.date;
          if (typeof cleanDate === 'string' && (cleanDate.includes("1899") || cleanDate.includes("1900"))) {
            cleanDate = new Date().toISOString().slice(0, 10);
          }
          // 1. Scale normalization for MoM decimal percentage indicators
          if (item.name && String(item.name).toLowerCase().includes('cpi indicator') && String(item.name).toLowerCase().includes('mom')) {
            if (typeof item.previous === 'number' && Math.abs(item.previous) >= 0.015) {
              item.previous = parseFloat((item.previous / 10).toFixed(4));
            }
            if (typeof item.forecast === 'number' && Math.abs(item.forecast) >= 0.015) {
              item.forecast = parseFloat((item.forecast / 10).toFixed(4));
            }
            if (typeof item.actual === 'number' && Math.abs(item.actual) >= 0.015) {
              item.actual = parseFloat((item.actual / 10).toFixed(4));
            }
          }
          if (item.name && (String(item.name).toLowerCase().includes('card transaction') || String(item.name).toLowerCase().includes('card retail'))) {
            if (typeof item.previous === 'number' && Math.abs(item.previous) >= 0.02) {
              item.previous = parseFloat((item.previous / 10).toFixed(4));
            }
            if (typeof item.forecast === 'number' && Math.abs(item.forecast) >= 0.02) {
              item.forecast = parseFloat((item.forecast / 10).toFixed(4));
            }
            if (typeof item.actual === 'number' && Math.abs(item.actual) >= 0.02) {
              item.actual = parseFloat((item.actual / 10).toFixed(4));
            }
          }

          // 2. Unreleased actuals cleanup (prevent placeholder 0 from causing score distortion)
          const indexTypes = ["PMI", "AUD_SERVICES", "CONFIDENCE", "INDEX_SMALL", "SURVEY_5", "ANZ_BIZ"];
          if (indexTypes.includes(item.type) && item.actual === 0 && (item.previous > 5 || item.previous < -5)) {
            item.actual = null;
          }
          if (item.name && item.name.toLowerCase().includes('cpi') && curr === 'CHF' && item.actual === 0 && item.previous !== null && item.previous !== 0) {
            item.actual = null;
          }
          if (item.actual === '' || item.actual === undefined) {
            item.actual = null;
          }
          const cleanWeight = formatWeight(item.weight);
          const evalRes = evaluateIndicator(item);
          return {
            ...item,
            time: cleanTime,
            date: cleanDate !== undefined ? cleanDate : item.date,
            weight: cleanWeight,
            netChange: evalRes.netChange,
            score: evalRes.score
          };
        });
      }
    });
    return cleaned;
  };

  const handleExportData = () => {
    try {
      calculateCurrencyTotals();
      const cleanData = JSON.parse(JSON.stringify(currencyIndicators));
      Object.keys(cleanData).forEach(curr => {
        if (Array.isArray(cleanData[curr])) {
          cleanData[curr].forEach((ind: MacroIndicator) => {
            const evalRes = evaluateIndicator(ind);
            ind.netChange = evalRes.netChange;
            ind.score = evalRes.score;
            const defaultInd = (DEFAULT_CURRENCY_INDICATORS[curr] || []).find(d => d.name === ind.name);
            const fallbackTime = defaultInd ? (defaultInd.time || "08:30:00") : "08:30:00";
            ind.time = formatTimeTo24h(ind.time, fallbackTime);
            ind.weight = formatWeight(ind.weight);
          });
        }
      });
      const jsonStr = JSON.stringify(cleanData, null, 2);
      const fileName = `kairos_macro_valuation_data_${new Date().toISOString().split('T')[0]}.json`;
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });

      if ((window.navigator as any)?.msSaveOrOpenBlob) {
        (window.navigator as any).msSaveOrOpenBlob(blob, fileName);
        return;
      }

      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.style.position = 'fixed';
      downloadAnchor.style.top = '-9999px';
      downloadAnchor.style.left = '-9999px';
      downloadAnchor.style.opacity = '0';
      downloadAnchor.href = url;
      downloadAnchor.download = fileName;
      downloadAnchor.setAttribute("download", fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      setTimeout(() => {
        if (document.body.contains(downloadAnchor)) document.body.removeChild(downloadAnchor);
        URL.revokeObjectURL(url);
      }, 1500);
    } catch (err) {
      console.error("Valuation export error:", err);
      alert(language === 'es' ? "Error al exportar los datos de valoración." : "Failed to export valuation backup data.");
    }
  };

  const handleExportCSV = () => {
    try {
      let csv = "Currency,Indicator,Date,Time,Actual,Forecast,Previous,Type,Net Change,Score\n";
      Object.keys(currencyIndicators).forEach(curr => {
        const list = currencyIndicators[curr] || [];
        list.forEach(ind => {
          const evalRes = evaluateIndicator(ind);
          const name = `"${(ind.name || '').replace(/"/g, '""')}"`;
          const date = ind.date || '';
          const defaultInd = (DEFAULT_CURRENCY_INDICATORS[curr] || []).find(d => d.name === ind.name);
          const fallbackTime = defaultInd ? (defaultInd.time || "08:30:00") : "08:30:00";
          const time = formatTimeTo24h(ind.time, fallbackTime);
          const act = ind.actual !== null && ind.actual !== undefined ? ind.actual : '';
          const fcst = ind.forecast !== null && ind.forecast !== undefined ? ind.forecast : '';
          const prev = ind.previous !== null && ind.previous !== undefined ? ind.previous : '';
          const type = ind.type || '';
          csv += `${curr},${name},${date},${time},${act},${fcst},${prev},${type},${evalRes.netChange},${evalRes.score}\n`;
        });
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const fileName = `kairos_valuation_indicators_${new Date().toISOString().split('T')[0]}.csv`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (e: any) {
      alert("Error exporting CSV: " + (e?.message || 'Unknown error'));
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadModal(null);
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv') || lowerName.endsWith('.tsv')) {
      processCurrencySpreadsheet(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
      e.target.value = '';
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const sanitized = sanitizeImportedState(parsed);
        if (sanitized) {
          setCurrencyIndicators(sanitized);
          try {
            localStorage.setItem('forex_dashboard_data_v2', JSON.stringify(sanitized));
          } catch {}
          alert(language === 'es' ? "¡Copia de seguridad de valoración importada con éxito!" : "Macro Valuation Data Imported Successfully.");
        } else {
          alert(language === 'es' ? "Formato de archivo JSON inválido. Debe contener las 8 divisas G10." : "Invalid JSON data file format. Must contain valid G10 currency arrays.");
        }
      } catch (err) {
        alert(language === 'es' ? "Formato de archivo JSON inválido." : "Invalid JSON data file format.");
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
        e.target.value = '';
      }
    };
    fileReader.readAsText(file, "UTF-8");
  };

  const handleResetData = () => {
    const today = new Date().toISOString().slice(0, 10);
    const zeroIndicators: Record<string, MacroIndicator[]> = {};
    const currencyKeys = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];

    currencyKeys.forEach((curr) => {
      const sourceList = DEFAULT_CURRENCY_INDICATORS[curr] || [];
      zeroIndicators[curr] = sourceList.map((ind) => ({
        name: ind.name,
        date: today,
        time: ind.time || "08:30:00",
        previous: 0,
        forecast: 0,
        actual: null,
        type: ind.type,
        weight: formatWeight(ind.weight),
        score: 0,
        netChange: null,
      }));
    });

    setCurrencyIndicators(zeroIndicators);
    try {
      localStorage.setItem('forex_dashboard_data_v2', JSON.stringify(zeroIndicators));
    } catch {}

    setUploadModal({
      isOpen: true,
      type: 'success',
      title: language === 'es' ? "Valores Restablecidos a Cero (0)" : "Valuation Reset to Zero (0)",
      message: language === 'es'
        ? "Todos los indicadores macroeconómicos (actual, previo, previsión) de las 8 divisas G10 han sido reiniciados a 0. Todas las puntuaciones de divergencia y totales están en estado neutral."
        : "All macroeconomic indicators (actual, previous, forecast) across all 8 G10 currencies have been reset to 0. All divergence spreads and currency scores are now at neutral zero baseline.",
      currencies: currencyKeys,
    });
  };

  // --- Investing.com Country Mapping & Currency Helpers ---
  const COUNTRY_MAP: Record<string, string> = {
    'US': 'USD', 'USA': 'USD', 'UNITED STATES': 'USD', 'ESTADOS UNIDOS': 'USD', 'EEUU': 'USD', 'USD': 'USD',
    'DE': 'EUR', 'DEU': 'EUR', 'GERMANY': 'EUR', 'ALEMANIA': 'EUR',
    'FR': 'EUR', 'FRA': 'EUR', 'FRANCE': 'EUR', 'FRANCIA': 'EUR',
    'IT': 'EUR', 'ITA': 'EUR', 'ITALY': 'EUR', 'ITALIA': 'EUR',
    'ES': 'EUR', 'ESP': 'EUR', 'SPAIN': 'EUR', 'ESPAÑA': 'EUR',
    'EU': 'EUR', 'EMU': 'EUR', 'EURO ZONE': 'EUR', 'EUROZONE': 'EUR', 'ZONA EURO': 'EUR', 'EUR': 'EUR',
    'UK': 'GBP', 'GB': 'GBP', 'GBR': 'GBP', 'UNITED KINGDOM': 'GBP', 'REINO UNIDO': 'GBP', 'ENGLAND': 'GBP', 'INGLATERRA': 'GBP', 'GBP': 'GBP',
    'JP': 'JPY', 'JPN': 'JPY', 'JAPAN': 'JPY', 'JAPÓN': 'JPY', 'JAPON': 'JPY', 'NIPPON': 'JPY', 'JPY': 'JPY',
    'AU': 'AUD', 'AUS': 'AUD', 'AUSTRALIA': 'AUD', 'AUD': 'AUD',
    'NZ': 'NZD', 'NZL': 'NZD', 'NEW ZEALAND': 'NZD', 'NUEVA ZELANDA': 'NZD', 'NZD': 'NZD',
    'CA': 'CAD', 'CAN': 'CAD', 'CANADA': 'CAD', 'CANADÁ': 'CAD', 'CAD': 'CAD',
    'CH': 'CHF', 'CHE': 'CHF', 'SWITZERLAND': 'CHF', 'SUIZA': 'CHF', 'CONFEDERATION': 'CHF', 'CHF': 'CHF',
    'CN': 'CNH', 'CHN': 'CNH', 'CHINA': 'CNH', 'CNH': 'CNH', 'CNY': 'CNH'
  };

  const normalizeEventText = (str: string): string => {
    return (str || '')
      .toLowerCase()
      .replace(/\(.*?\)/g, ' ')
      .replace(/\[.*?\]/g, ' ')
      .replace(/\b(s&p global|s&p|hcob eurozone|hcob|jibun bank|judo bank|businessnz|busnz|procure\.ch|procure|the conference board|conference board|cb|ism|reuters|zdf|ifo|gfk|cbi|nfib|cfib|nab|aig|seco|kof|anz|westpac|jcer|atlanta fed)\b/g, ' ')
      .replace(/\bmanufacturing\b|\bmanufacturero\b/g, 'mfg')
      .replace(/\bnon-manufacturing\b|\bno manufacturero\b|\bservicios\b/g, 'services')
      .replace(/\bunemployment\b|\bdesempleo\b|\bparo\b|\bjobless\b/g, 'unemp')
      .replace(/\bnonfarm payrolls\b|\bnon-farm payrolls\b|\bnon farm payrolls\b|\bnóminas no agrícolas\b|\bnominas no agricolas\b/g, 'nfp')
      .replace(/\bconsumer price\b|\bprecios al consumidor\b|\bindice de precios\b/g, 'cpi')
      .replace(/\bretail sales\b|\bventas minoristas\b/g, 'retail')
      .replace(/\bgdp\b|\bpib\b|\bgross domestic\b/g, 'gdp')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const inferCurrencyFromText = (text: string): string | null => {
    const s = (text || '').toLowerCase();
    if (/\b(fed|fomc|ism|nfp|nonfarm|u\.s\.|united states|estados unidos|eeuu|atlanta fed|nfib)\b/.test(s)) return 'USD';
    if (/\b(ecb|bce|hcob|german|alemania|eurozone|zona euro|ifo|france|francia|italy|italia|spain|españa)\b/.test(s)) return 'EUR';
    if (/\b(boe|bank of england|banco de inglaterra|uk|u\.k\.|reino unido|claimant|gfk|cbi)\b/.test(s)) return 'GBP';
    if (/\b(boj|bank of japan|banco de japón|japan|japón|japon|tokyo|tokio|tankan|jibun)\b/.test(s)) return 'JPY';
    if (/\b(rba|australia|australian|judo|westpac|nab|aig)\b/.test(s)) return 'AUD';
    if (/\b(rbnz|new zealand|nueva zelanda|businessnz|food price)\b/.test(s)) return 'NZD';
    if (/\b(boc|bank of canada|banco de canadá|canada|canadá|ivey|cfib)\b/.test(s)) return 'CAD';
    if (/\b(snb|swiss|suiza|procure|kof|seco)\b/.test(s)) return 'CHF';
    return null;
  };

  const findIndicatorIndex = (targetCurr: string, rawEvent: string, indList: MacroIndicator[], rawCountryOrCur: string = ''): number => {
    if (!indList || !indList.length) return -1;
    const clean = rawEvent.toLowerCase().trim();
    const ev = clean;
    const ctry = (rawCountryOrCur || '').toLowerCase().trim();

    // Exclude non-indicator calendar noise (speeches, debt auctions, minutes, summits, trade balance, CFTC positions)
    if (/\b(speaks|speech|discurso|habla|auction|subasta|minutes|actas|summit|statement|press conference|monetary policy statement|meeting|reunion|bill auction|bond auction|gilt auction|oat auction|btf auction|jgb auction|bobl auction|crude oil|gasoline|refinery|heating oil|rig count|mortgage|m4 money|m3 money|m2 money|net lending|borrowing|budget balance|car registration|passenger cars|vehicle sales|redbook|commodity prices|milk auction|globaldairytrade|terms of trade|foreign reserves|foreign bonds|foreign investments|cftc|speculative|trade balance|balanza comercial)\b/i.test(ev)) {
      return -1;
    }

    for (let i = 0; i < indList.length; i++) {
      const ind = indList[i];
      const iname = ind.name.toLowerCase();

      // USD Indicators (9 slots)
      if (targetCurr === "USD") {
        if (iname === "ism mfg pmi") {
          if ((clean.includes("ism manufacturing pmi") || (clean.includes("ism") && clean.includes("manufacturing") && clean.includes("pmi"))) &&
              !clean.includes("employment") && !clean.includes("orders") && !clean.includes("prices") && !clean.includes("inventories")) return i;
        }
        if (iname === "ism services pmi") {
          if ((clean.includes("ism services") || clean.includes("ism non-manufacturing")) &&
              !clean.includes("employment") && !clean.includes("orders") && !clean.includes("prices")) return i;
        }
        if (iname === "cpi mom") {
          if (!clean.includes("core") && !clean.includes("yoy") && (clean === "cpi (mom)" || clean.startsWith("cpi (mom)") || clean.includes("consumer price index (mom)"))) return i;
        }
        if (iname === "unemployment rate") {
          if (!clean.includes("u6") && !clean.includes("claims") && (clean === "unemployment rate" || clean.startsWith("unemployment rate ("))) return i;
        }
        if (iname === "nfp") {
          if (!clean.includes("adp") && !clean.includes("private") && !clean.includes("manufacturing") &&
              (clean.includes("nonfarm payrolls") || clean.includes("non-farm payrolls") || clean.includes("non farm payrolls") || clean.includes("nóminas no agrícolas") || clean.includes("nominas no agricolas"))) return i;
        }
        if (iname === "retail sales mom") {
          if (!clean.includes("core") && !clean.includes("ex") && !clean.includes("control") && !clean.includes("yoy") &&
              (clean === "retail sales (mom)" || clean.startsWith("retail sales (mom)") || clean.includes("ventas minoristas (mom)"))) return i;
        }
        if (iname === "cb consumer confidence") {
          if (clean.includes("cb consumer confidence") || clean.includes("conference board consumer confidence")) return i;
        }
        if (iname === "nfib small business index") {
          if (clean.includes("nfib small business") || clean.includes("nfib")) return i;
        }
        if (iname === "atlanta fed gdpnow") {
          if (clean.includes("atlanta fed gdpnow") || clean.includes("gdpnow")) return i;
        }
      }

      // EUR Indicators (9 slots: Eurozone & Germany)
      if (targetCurr === "EUR") {
        const isEurozoneWide = clean.includes("eurozone") || clean.includes("euro zone") || clean.includes("zona euro") || clean.includes("ea") || clean.includes("emu") || ctry === 'eu' || ctry === 'eur' || ctry === 'eurozone' || ctry === 'zona euro';
        const isGerman = clean.includes("german") || clean.includes("germany") || clean.includes("alemania") || ctry === 'de' || ctry === 'germany' || ctry === 'alemania';
        const isOtherCountry = clean.includes("spanish") || clean.includes("spain") || clean.includes("españa") || clean.includes("french") || clean.includes("france") || clean.includes("francia") || clean.includes("italian") || clean.includes("italy") || clean.includes("italia") || ctry === 'es' || ctry === 'fr' || ctry === 'it';

        if (iname === "hcob mfg pmi") {
          // Strictly Eurozone HCOB Manufacturing PMI (NOT Spanish, French, Italian, or German)
          if (!isOtherCountry && !clean.includes("german") &&
              (clean.includes("eurozone manufacturing") || clean.includes("hcob eurozone") || (clean.includes("manufacturing pmi") && isEurozoneWide))) return i;
        }
        if (iname === "hcob services pmi") {
          // Strictly Eurozone HCOB Services PMI (NOT Spanish, French, Italian, or German)
          if (!isOtherCountry && !clean.includes("german") &&
              (clean.includes("eurozone services") || clean.includes("hcob eurozone") || (clean.includes("services pmi") && isEurozoneWide))) return i;
        }
        if (iname === "cpi mom") {
          // Eurozone CPI MoM (NOT German CPI, French CPI, Spanish CPI, Italian CPI)
          if (!isOtherCountry && !clean.includes("german") && !clean.includes("yoy") &&
              (clean === "cpi (mom)" || clean.startsWith("cpi (mom)") || clean.includes("eurozone cpi (mom)") || clean.includes("core cpi (mom)"))) return i;
        }
        if (iname === "unemployment rate") {
          // Eurozone Unemployment Rate (NOT Spanish, German, French, Italian)
          if (!isOtherCountry && !clean.includes("german") && !clean.includes("change") &&
              (clean === "unemployment rate" || clean.startsWith("unemployment rate (") || clean.includes("eurozone unemployment rate"))) return i;
        }
        if (iname === "germany unemp change") {
          // MUST BE German unemployment change (NOT Spanish unemployment change!)
          if ((isGerman || clean.includes("german") || clean.includes("germany") || clean.includes("alemania")) &&
              (clean.includes("unemployment change") || clean.includes("desempleo") || clean.includes("cambio del desempleo"))) return i;
        }
        if (iname === "retail sales mom") {
          // Eurozone Retail Sales MoM (or German Retail Sales MoM)
          if (!isOtherCountry && !clean.includes("yoy") &&
              (clean === "retail sales (mom)" || clean.startsWith("retail sales (mom)") || clean.includes("german retail sales (mom)"))) return i;
        }
        if (iname === "consumer confidence") {
          // Eurozone Consumer Confidence
          if (!isOtherCountry && !clean.includes("german") &&
              (clean === "consumer confidence" || clean.startsWith("consumer confidence (") || clean.includes("eurozone consumer confidence"))) return i;
        }
        if (iname === "ifo business climate") {
          if (clean.includes("ifo business climate") || clean.includes("ifo")) return i;
        }
        if (iname === "industrial production mom") {
          if (!isOtherCountry && !clean.includes("yoy") &&
              (clean.includes("industrial production (mom)") || clean.includes("german industrial production (mom)"))) return i;
        }
      }

      // GBP Indicators (9 slots: UK / GB)
      if (targetCurr === "GBP") {
        if (iname === "s&p mfg pmi" && clean.includes("manufacturing pmi")) return i;
        if (iname === "s&p services pmi" && clean.includes("services pmi")) return i;
        if (iname === "cpi mom" && !clean.includes("core") && !clean.includes("yoy") && (clean === "cpi (mom)" || clean.startsWith("cpi (mom)"))) return i;
        if (iname === "unemployment rate" && (clean === "unemployment rate" || clean.startsWith("unemployment rate ("))) return i;
        if (iname === "claimant count" && clean.includes("claimant count")) return i;
        if (iname === "retail sales mom" && !clean.includes("core") && !clean.includes("ex") && !clean.includes("yoy") && (clean === "retail sales (mom)" || clean.startsWith("retail sales (mom)"))) return i;
        if (iname === "gfk consumer confidence" && (clean.includes("gfk consumer confidence") || clean.includes("gfk"))) return i;
        if (iname === "cbi industrial trends" && (clean.includes("cbi industrial trends") || clean.includes("cbi industrial"))) return i;
        if (iname === "monthly gdp" && (clean.includes("monthly gdp") || clean.includes("monthly gdp tracker") || clean.startsWith("gdp (mom)") || clean === "gdp (mom)")) return i;
      }

      // JPY Indicators (9 slots: JP)
      if (targetCurr === "JPY") {
        if (iname === "jibun mfg pmi" && clean.includes("manufacturing pmi")) return i;
        if (iname === "jibun services pmi" && (clean.includes("services pmi") || clean.includes("manufacturing & services pmi"))) return i;
        if (iname === "tokyo cpi mom" && (clean.includes("tokyo cpi") || clean.includes("tokyo core cpi") || clean.includes("national cpi") || clean.includes("cpi, n.s.a") || clean.includes("cpi n.s.a") || (clean.includes("cpi") && clean.includes("mom")))) return i;
        if (iname === "unemployment rate" && (clean === "unemployment rate" || clean.startsWith("unemployment rate ("))) return i;
        if (iname === "cash earnings mom" && (clean.includes("cash earnings") || clean.includes("wage income") || clean.includes("overall wage") || clean.includes("labor cash earnings") || clean.includes("wage"))) return i;
        if (iname === "retail sales mom" && !clean.includes("large") && (clean.includes("retail sales (mom)") || clean.includes("retail sales") || clean.includes("retailers' sales (mom)"))) return i;
        if (iname === "consumer survey" && (clean.includes("household confidence") || clean.includes("consumer survey") || clean.includes("consumer confidence"))) return i;
        if (iname === "reuters tankan" && clean.includes("reuters tankan")) return i;
        if (iname === "jcer monthly gdp" && (clean.includes("jcer") || clean.includes("monthly gdp")) && !clean.includes("tertiary")) return i;
      }

      // AUD Indicators (9 slots: AU)
      if (targetCurr === "AUD") {
        if (iname === "judo mfg pmi" && clean.includes("manufacturing pmi")) return i;
        if (iname === "judo services pmi" && (clean.includes("services pmi") || clean.includes("manufacturing & services pmi"))) return i;
        if (iname === "cpi indicator mom" && (clean.includes("cpi indicator") || clean.includes("monthly cpi"))) return i;
        if (iname === "unemployment rate" && (clean === "unemployment rate" || clean.startsWith("unemployment rate ("))) return i;
        if (iname === "employment change" && (clean === "employment change" || clean.startsWith("employment change ("))) return i;
        if (iname === "retail sales mom" && (clean.includes("retail sales (mom)") || clean.includes("retail sales (yoy)") || clean.includes("retail sales") || clean.startsWith("retail sales"))) return i;
        if (iname === "westpac sentiment" && (clean.includes("westpac consumer sentiment") || clean.includes("westpac sentiment"))) return i;
        if (iname === "nab business confidence" && clean.includes("nab business confidence")) return i;
        if (iname === "aig industry index" && (clean.includes("aig industry index") || clean.includes("ai group industry") || (clean.includes("aig") && clean.includes("index")))) return i;
      }

      // NZD Indicators (9 slots: NZ)
      if (targetCurr === "NZD") {
        if (iname === "busnz mfg pmi" && (clean.includes("business nz pmi") || clean.includes("businessnz pmi") || clean.includes("business nz") || clean.includes("mfg pmi") || (clean.includes("manufacturing") && clean.includes("pmi")))) return i;
        if (iname === "busnz services pmi" && (clean.includes("performance of services index") || clean.includes("performance of services") || clean.includes("services index") || clean.includes("psi") || clean.includes("services pmi") || clean.includes("businessnz psi"))) return i;
        if (iname === "food prices mom" && (clean.includes("fpi (mom)") || clean.includes("fpi mom") || clean.includes("fpi") || clean.includes("food price index") || clean.includes("food price") || clean.includes("food prices"))) return i;
        if (iname === "unemployment rate" && (clean === "unemployment rate" || clean.startsWith("unemployment rate (") || clean.includes("hlfs unemployment") || clean.includes("unemployment"))) return i;
        if (iname === "mei jobs change" && !clean.includes("migration") && (clean.includes("mei jobs") || clean.includes("employment change") || clean.includes("filled jobs") || clean.includes("jobs change"))) return i;
        if (iname === "card transactions" && (clean.includes("electronic card retail sales (mom)") || clean.includes("card transactions") || clean.includes("card retail"))) return i;
        if (iname === "anz consumer confidence" && (clean.includes("anz consumer confidence") || clean.includes("westpac consumer sentiment") || clean.includes("westpac sentiment") || clean.includes("consumer confidence") || clean.includes("consumer sentiment"))) return i;
        if (iname === "anz business confidence" && (clean.includes("anz business confidence") || clean.includes("business confidence"))) return i;
        if (iname === "busnz activity index" && !clean.includes("terms of trade") && (clean.includes("nbnz own activity") || clean.includes("businessnz activity") || clean.includes("own activity"))) return i;
      }

      // CAD Indicators (9 slots: CA)
      if (targetCurr === "CAD") {
        if (iname === "s&p mfg pmi" && clean.includes("manufacturing pmi") && !clean.includes("ivey")) return i;
        if (iname === "ivey pmi" && clean.includes("ivey pmi") && !clean.includes("n.s.a")) return i;
        if (iname === "cpi mom" && !clean.includes("core") && !clean.includes("yoy") && (clean === "cpi (mom)" || clean.startsWith("cpi (mom)"))) return i;
        if (iname === "unemployment rate" && (clean === "unemployment rate" || clean.startsWith("unemployment rate ("))) return i;
        if (iname === "net employment change" && (clean === "employment change" || clean.startsWith("employment change (") || clean.includes("net change in employment"))) return i;
        if (iname === "retail sales mom" && !clean.includes("core") && !clean.includes("yoy") && (clean === "retail sales (mom)" || clean.startsWith("retail sales (mom)"))) return i;
        if (iname === "cb consumer survey" && (clean.includes("ipsos pcsi") || clean.includes("business outlook") || clean.includes("boc business outlook") || clean.includes("consumer confidence") || clean.includes("consumer survey") || clean.includes("leading index"))) return i;
        if (iname === "cfib business barometer" && !clean.includes("wholesale") && (clean.includes("business barometer") || clean.includes("cfib") || clean.includes("barometer"))) return i;
        if (iname === "monthly gdp mom" && (clean.startsWith("gdp (mom)") || clean === "gdp (mom)" || clean.includes("monthly gdp"))) return i;
      }

      // CHF Indicators (9 slots: CH)
      if (targetCurr === "CHF") {
        if (iname === "procure mfg pmi" && clean.includes("manufacturing pmi")) return i;
        if (iname === "procure services pmi" && (clean.includes("services pmi") || clean.includes("procure services") || clean.includes("procure.ch services"))) return i;
        if (iname === "cpi mom" && !clean.includes("core") && !clean.includes("yoy") && (clean === "cpi (mom)" || clean.startsWith("cpi (mom)"))) return i;
        if (iname === "unemp rate" && clean.includes("unemployment rate") && !clean.includes("change")) return i;
        if (iname === "unemp change" && (clean.includes("unemployment change") || clean.includes("unemployment rate s.a") || clean.includes("unemployment rate sa"))) return i;
        if (iname === "retail sales mom" && (clean.includes("retail sales (mom)") || clean.includes("real retail sales (mom)") || clean.includes("retail sales (yoy)") || clean.includes("real retail sales (yoy)") || clean.includes("retail sales"))) return i;
        if (iname === "consumer sentiment" && (clean.includes("consumer climate") || clean.includes("consumer sentiment"))) return i;
        if (iname === "kof indicator" && clean.includes("kof")) return i;
        if (iname === "seco economic indicators" && (clean.includes("seco") || clean.includes("consumer climate") || clean.includes("economic forecast"))) return i;
      }
    }

    // Direct name match fallback (exact string match only)
    for (let i = 0; i < indList.length; i++) {
      if (indList[i].name.toLowerCase() === clean) return i;
    }

    return -1;
  };

  const formatSpreadsheetDate = (dateVal: any): string | null => {
    if (dateVal === null || dateVal === undefined || dateVal === '') return null;
    if (dateVal instanceof Date) {
      if (dateVal.getFullYear() > 1905 && dateVal.getFullYear() < 2100) {
        const y = dateVal.getFullYear();
        const m = String(dateVal.getMonth() + 1).padStart(2, '0');
        const d = String(dateVal.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return null;
    }
    const str = String(dateVal).trim().replace(/[\u00A0\u200B\r\n\t]/g, ' ');
    if (str.includes('1899') || str.includes('1900')) return null;

    // ISO format: YYYY-MM-DD
    const isoMatch = str.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

    // Excel numeric serial date (e.g. 45000 - 55000)
    const num = typeof dateVal === 'number' ? dateVal : parseFloat(str);
    if (!isNaN(num) && num >= 25000 && num <= 65000 && !str.includes('/') && !str.includes('-') && !str.includes(' ')) {
      const epochDate = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(epochDate.getTime()) && epochDate.getUTCFullYear() > 1990 && epochDate.getUTCFullYear() < 2100) {
        return epochDate.toISOString().slice(0, 10);
      }
    }

    // Formats with slashes or dots: DD/MM/YYYY, DD.MM.YYYY, MM/DD/YYYY, YYYY/MM/DD
    const slashMatch = str.match(/\b(\d{1,4})[\/\.](\d{1,2})[\/\.](\d{1,4})\b/);
    if (slashMatch) {
      const p1 = slashMatch[1];
      const p2 = slashMatch[2];
      const p3 = slashMatch[3];
      let yr = 0, mo = 0, da = 0;
      if (p1.length === 4) {
        yr = parseInt(p1, 10);
        mo = parseInt(p2, 10);
        da = parseInt(p3, 10);
      } else if (p3.length === 4) {
        yr = parseInt(p3, 10);
        const n1 = parseInt(p1, 10);
        const n2 = parseInt(p2, 10);
        if (n1 > 12 && n2 <= 12) {
          da = n1; mo = n2;
        } else if (n2 > 12 && n1 <= 12) {
          mo = n1; da = n2;
        } else {
          // Standard international DD/MM/YYYY
          da = n1; mo = n2;
        }
      }
      if (yr >= 1990 && yr <= 2050 && mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
        return `${yr}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
      }
    }

    // Spanish natural dates: e.g. "Lunes, 2 de Noviembre de 2026" or "2 de noviembre 2026"
    const cleanLower = str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const SPANISH_MONTHS: Record<string, string> = {
      enero: '01', febrero: '02', marzo: '03', abril: '04',
      mayo: '05', junio: '06', julio: '07', agosto: '08',
      septiembre: '09', setiembre: '09', octubre: '10', noviembre: '11', diciembre: '12',
      ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06',
      jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12'
    };
    const spMatch = cleanLower.match(/(\d{1,2})\s+de\s+([a-z]+)(?:\s+de|\s*,)?\s*(\d{4})/);
    if (spMatch && SPANISH_MONTHS[spMatch[2]]) {
      const d = String(parseInt(spMatch[1], 10)).padStart(2, '0');
      const m = SPANISH_MONTHS[spMatch[2]];
      const y = spMatch[3];
      return `${y}-${m}-${d}`;
    }

    // English natural dates: e.g. "Monday, Nov 2, 2026" or "November 2, 2026"
    const ENGLISH_MONTHS: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
      jan: '01', feb: '02', mar: '03', abr: '04', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };
    const enMatch = cleanLower.match(/([a-z]{3,9})\s+(\d{1,2})(?:st|nd|rd|th)?[\s,]+(\d{4})/);
    if (enMatch && ENGLISH_MONTHS[enMatch[1]]) {
      const m = ENGLISH_MONTHS[enMatch[1]];
      const d = String(parseInt(enMatch[2], 10)).padStart(2, '0');
      const y = enMatch[3];
      return `${y}-${m}-${d}`;
    }

    // Standard Date fallback only if valid year between 1990 and 2050
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const yr = d.getFullYear();
      if (yr >= 1990 && yr <= 2050) {
        const mo = String(d.getMonth() + 1).padStart(2, '0');
        const da = String(d.getDate()).padStart(2, '0');
        return `${yr}-${mo}-${da}`;
      }
    }

    return null;
  };

  // 3. Normalizes Imp. (Importance): Maps "High", "Med", "Low" or star counts (1, 2, 3) to numerical weights (5.0, 4.0, 3.0)
  const normalizeImportance = (imp: any): string => {
    if (imp === null || imp === undefined) return "4.0";
    const s = String(imp).trim().toLowerCase();
    if (s === 'high' || s === 'alto' || s === 'alta' || s === '3' || s === '3.0' || s.includes('★★★') || s.includes('3 star') || s.includes('three')) return "5.0";
    if (s === 'med' || s === 'medium' || s === 'medio' || s === 'media' || s === '2' || s === '2.0' || s.includes('★★') || s.includes('2 star') || s.includes('two')) return "4.0";
    if (s === 'low' || s === 'bajo' || s === 'baja' || s === '1' || s === '1.0' || s.includes('★') || s.includes('1 star') || s.includes('one')) return "3.0";
    const num = parseFloat(s);
    if (!isNaN(num)) {
      if (num >= 3) return "5.0";
      if (num >= 2) return "4.0";
      return "3.0";
    }
    return "4.0";
  };

  // 3. DATA NORMALIZATION (INVESTING.COM DISCREPANCIES)
  const parseSpreadsheetValue = (input: any, type: string, eventName: string = ''): number | null => {
    if (input === null || input === undefined || input === '') return null;
    let strVal = String(input).trim().replace(/[\u00A0\u200B\r\n\t]/g, '');
    if (strVal === '-' || strVal === 'N/A' || strVal === 'n/a' || strVal === 'ND' || strVal === '' || strVal === 'NaN') return null;

    const isExplicitPercent = strVal.includes('%');
    const hasK = /k$/i.test(strVal) || /k\b/i.test(strVal);
    const hasM = /m$/i.test(strVal) || /m\b/i.test(strVal);
    const hasB = /b$/i.test(strVal) || /b\b/i.test(strVal);

    // Thousand commas & European comma decimal sanitization
    if (strVal.includes(',') && !strVal.includes('.')) {
      const commaParts = strVal.split(',');
      if (commaParts.length === 2 && commaParts[1].replace(/[^0-9]/g, '').length === 3 && parseInt(commaParts[0], 10) > 0 && !isExplicitPercent) {
        strVal = strVal.replace(/,/g, '');
      } else {
        strVal = strVal.replace(',', '.');
      }
    } else if (strVal.includes(',') && strVal.includes('.')) {
      if (strVal.indexOf('.') < strVal.indexOf(',')) {
        strVal = strVal.replace(/\./g, '').replace(',', '.');
      } else {
        strVal = strVal.replace(/,/g, '');
      }
    }

    // Clean alphabetical suffixes like "K", "M", "B", "%" and parse string to float
    let cleanStr = strVal.replace(/[%+a-zA-Z]/g, '').trim();
    let num = parseFloat(cleanStr);
    if (isNaN(num)) return null;

    const evLower = eventName.toLowerCase();
    const typeUpper = (type || '').toUpperCase();

    // Fix PMI scaling: If event includes "PMI" and value < 1.0 (e.g. 0.022 or 0.528)
    if (typeUpper === 'PMI' || typeUpper === 'AUD_SERVICES' || evLower.includes('pmi')) {
      if (Math.abs(num) < 1.0 && Math.abs(num) > 0) {
        if (Math.abs(num) >= 0.3) {
          num = num * 100;
        } else if (Math.abs(num) >= 0.03) {
          num = num * 1000;
        } else {
          num = 50 + (num * 100);
        }
      }
      return parseFloat(num.toFixed(1));
    }

    // Fix Unemployment scaling (rate vs change)
    if (typeUpper === 'UNEMP_RATE' || typeUpper === 'EUR_UNEMP_FIXED' || (evLower.includes('unemp') && (evLower.includes('rate') || evLower.includes('tasa') || evLower.includes('paro')))) {
      if (isExplicitPercent) {
        num = num / 100.0;
      } else {
        if (Math.abs(num) >= 1.0) {
          num = num / 100.0; // e.g. 4.1 -> 0.041
        } else if (Math.abs(num) >= 0.15) {
          num = num / 10.0; // e.g. 0.62 -> 0.062, 0.41 -> 0.041
        } else if (Math.abs(num) < 0.015 && Math.abs(num) > 0.001) {
          num = num * 10.0; // recover accidental 0.0062 -> 0.062 or 0.0041 -> 0.041
        }
      }
      return parseFloat(num.toFixed(4));
    }

    // Thousands types stored in thousands (NFP, Jobs changes, Claims, Unemployment change)
    const thousandsTypes = ["NFP", "JOBS_K", "CAD_JOBS", "GBP_CLAIMANT", "GER_UNEMP_CHANGE", "CHF_UNEMP_CHANGE"];
    if (thousandsTypes.includes(typeUpper) || evLower.includes('nfp') || evLower.includes('payrolls') || evLower.includes('claimant')) {
      if (Math.abs(num) >= 500 && !hasK) {
        return parseFloat((num / 1000).toFixed(1));
      }
      return parseFloat(num.toFixed(1));
    }

    // Percentage types stored as decimals (CPI, GDP, Retail Sales, Card Transactions)
    const percentTypes = ["CPI", "PCT_GROWTH", "CARD_TRANS", "GBP_RETAIL"];
    if (percentTypes.includes(typeUpper) || isExplicitPercent) {
      if (!isExplicitPercent && Math.abs(num) >= 20.0) return null;
      if (isExplicitPercent || Math.abs(num) >= 0.05) {
        num = num / 100.0;
      }
      return parseFloat(num.toFixed(4));
    }

    // Surveys & Confidence Indices (CONFIDENCE, INDEX_SMALL, SURVEY_5, ANZ_BIZ)
    if (evLower.includes('westpac') && isExplicitPercent) {
      num = parseFloat((83.5 * (1 + num / 100)).toFixed(1));
    }
    return parseFloat(num.toFixed(2));
  };

  // 2. REGION TO G10 CURRENCY MAPPING
  const INVESTING_COM_MAP: Record<string, string> = {
    'US': 'USD',
    'UK': 'GBP',
    'JP': 'JPY',
    'CH': 'CHF',
    'CA': 'CAD',
    'AU': 'AUD',
    'NZ': 'NZD',
    'DE': 'EUR',
    'FR': 'EUR',
    'IT': 'EUR',
    'ES': 'EUR',
    'EU': 'EUR',
    'EMU': 'EUR',
    // Standard 3-letter codes & aliases
    'USD': 'USD', 'USA': 'USD',
    'GBP': 'GBP', 'GB': 'GBP', 'GBR': 'GBP',
    'JPY': 'JPY', 'JPN': 'JPY',
    'CHF': 'CHF', 'CHE': 'CHF',
    'CAD': 'CAD', 'CAN': 'CAD',
    'AUD': 'AUD', 'AUS': 'AUD',
    'NZD': 'NZD', 'NZL': 'NZD',
    'EUR': 'EUR', 'EA': 'EUR', 'GER': 'EUR', 'FRA': 'EUR', 'ITA': 'EUR', 'ESP': 'EUR'
  };

  const G10_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];

  const processCurrencySpreadsheet = (file: File) => {
    if (!file) return;
    setUploadModal(null);
    const fileName = file.name.toLowerCase();

    // 1. JSON Backup Restore
    if (fileName.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = JSON.parse(evt.target?.result as string);
          const sanitized = sanitizeImportedState(imported);
          if (sanitized) {
            setCurrencyIndicators(sanitized);
            try {
              localStorage.setItem('forex_dashboard_data_v2', JSON.stringify(sanitized));
            } catch {}
            setUploadModal({
              isOpen: true,
              type: 'success',
              title: language === 'es' ? "Importación Exitosa" : "Backup Restored",
              message: language === 'es' ? "¡Copia de seguridad de Valoración restaurada con éxito!" : "Currency Indicators backup restored successfully!"
            });
          } else {
            setUploadModal({
              isOpen: true,
              type: 'error',
              title: language === 'es' ? "Error en Archivo" : "Invalid Backup",
              message: language === 'es' ? "Archivo JSON inválido. Debe contener las 8 divisas G10." : "Invalid backup JSON file. Must contain valid G10 currency arrays."
            });
          }
        } catch {
          setUploadModal({
            isOpen: true,
            type: 'error',
            title: language === 'es' ? "Error en Archivo" : "Invalid Backup",
            message: language === 'es' ? "Archivo JSON de copia de seguridad inválido." : "Invalid backup JSON file."
          });
        }
      };
      reader.readAsText(file);
      return;
    }

    // 2. Core Matrix Processor for CSV / XLSX / XLS
    const processMatrix = (rawRows: any[][]) => {
      // Clear any prior modal state immediately
      setUploadModal(null);

      if (!rawRows || rawRows.length === 0) {
        setUploadModal({
          isOpen: true,
          type: 'error',
          title: language === 'es' ? "Archivo Vacío" : "Empty File",
          message: language === 'es' ? "El archivo no contiene filas legibles." : "No readable data rows found in uploaded file."
        });
        return;
      }

      const mappedRows = rawRows.map(row => {
        if (!row) return [];
        const cleanRow = (Array.isArray(row) ? row : Object.values(row)).map((cell: any) => {
          if (cell === null || cell === undefined) return '';
          if (cell instanceof Date) {
            // Catch Excel time-only epoch dates (1899/1900)
            if (cell.getFullYear() <= 1905) {
              return String(cell.getHours()).padStart(2, '0') + ':' + String(cell.getMinutes()).padStart(2, '0');
            }
            // Safely convert real dates to YYYY-MM-DD
            const y = cell.getFullYear();
            const m = String(cell.getMonth() + 1).padStart(2, '0');
            const d = String(cell.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
          }
          return String(cell).trim();
        });
        return cleanRow;
      });
      const cleanRows = mappedRows.filter(r => r && r.some((c: any) => c !== ''));
      if (cleanRows.length === 0) {
        setUploadModal({
          isOpen: true,
          type: 'error',
          title: language === 'es' ? "Archivo Vacío" : "Empty File",
          message: language === 'es' ? "El archivo no contiene filas legibles." : "No readable data rows found in uploaded file."
        });
        return;
      }

      // Normalization helper for header detection (accent & case insensitive)
      const cleanHeaderStr = (s: any) => {
        return String(s || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      };

      // Column detection indices
      let headerRowIdx = -1;
      let eventCol = -1;
      let currCol = -1;
      let actualCol = -1;
      let forecastCol = -1;
      let prevCol = -1;
      let impCol = -1;
      let dateCol = -1;
      let timeCol = -1;

      const isEventHeader = (h: string) => /^(event|evento|indicator|indicador|release|acontecimiento|title|titulo|description|descripcion|headline|report|reporte|item|data|nombre)/.test(h) || h.includes('event') || h.includes('indicat') || h.includes('release');
      const isCcyHeader = (h: string) => /^(cur|div|currency|divisa|moneda|country|pais|zone|zona|ccy|iso)/.test(h) || h === 'cur' || h === 'div';
      const isActualHeader = (h: string) => /^(actual|act|dato actual|real|current|publicado|latest|valor actual|valor real)/.test(h) || h.includes('actual') || h.includes('real');
      const isForecastHeader = (h: string) => /^(forecast|fcst|prevision|previsto|pronostico|consenso|consensus|expected|est|estimado|median)/.test(h) || h.includes('forecast') || h.includes('previs') || h.includes('pronost') || h.includes('consen');
      const isPrevHeader = (h: string) => /^(previous|prev|prior|previo|anterior|revisado|last|previo valor)/.test(h) || h.includes('prev') || h.includes('prior') || h.includes('anter');
      const isImpHeader = (h: string) => /^(imp|importance|importancia|vol|volatilidad|impact|impacto)/.test(h) || h === 'imp' || h.includes('imp');
      const isDateHeader = (h: string) => /^(date|fecha|day|dia|release date|period|periodo)/.test(h) || h.includes('fecha') || h.includes('date');
      const isTimeHeader = (h: string) => /^(time|hora|hour)/.test(h) || h.includes('time') || h.includes('hora');

      // Scan rows to detect actual header row
      for (let r = 0; r < Math.min(cleanRows.length, 30); r++) {
        const row = cleanRows[r].map(cleanHeaderStr);
        const hasTime = row.some(isTimeHeader);
        const hasEvent = row.some(isEventHeader);
        const hasCcy = row.some(isCcyHeader);
        const hasNum = row.some(isActualHeader) || row.some(isForecastHeader) || row.some(isPrevHeader);

        // Check for exact Investing.com header row format ['Time', 'Cur.', 'Event', 'Imp.', 'Actual', 'Forecast', 'Previous']
        if ((hasCcy && hasEvent) || (hasEvent && hasNum) || (hasCcy && hasNum) || (hasTime && hasEvent)) {
          headerRowIdx = r;
          row.forEach((cell, idx) => {
            if (isDateHeader(cell) && dateCol === -1) dateCol = idx;
            else if (isTimeHeader(cell) && timeCol === -1) timeCol = idx;
            else if (isCcyHeader(cell) && currCol === -1) currCol = idx;
            else if (isEventHeader(cell) && eventCol === -1) eventCol = idx;
            else if (isImpHeader(cell) && impCol === -1) impCol = idx;
            else if (isActualHeader(cell) && actualCol === -1) actualCol = idx;
            else if (isForecastHeader(cell) && forecastCol === -1) forecastCol = idx;
            else if (isPrevHeader(cell) && prevCol === -1) prevCol = idx;
          });

          // Exact position fallback for standard Investing.com export headers ['Time', 'Cur.', 'Event', 'Imp.', 'Actual', 'Forecast', 'Previous']
          if (timeCol === -1 && row.length >= 7 && (row[0] === 'time' || cleanRows[r][0]?.toLowerCase().includes('time'))) {
            timeCol = 0;
          }
          if (currCol === -1 && row.length >= 7 && (row[1] === 'cur' || cleanRows[r][1]?.toLowerCase().includes('cur'))) {
            currCol = 1;
          }
          if (eventCol === -1 && row.length >= 7) {
            if (row[3] === 'event' || cleanRows[r][3]?.toLowerCase().includes('event') || cleanRows[r][3]?.toLowerCase().includes('evento') || cleanRows[r][3]?.toLowerCase().includes('indicat')) {
              eventCol = 3;
            } else if (row[2] === 'event' || cleanRows[r][2]?.toLowerCase().includes('event') || cleanRows[r][2]?.toLowerCase().includes('evento')) {
              eventCol = 2;
            }
          }
          if (impCol === -1 && row.length >= 7) {
            if (row[2] === 'imp' || cleanRows[r][2]?.toLowerCase().includes('imp')) impCol = 2;
            else if (row[3] === 'imp' || cleanRows[r][3]?.toLowerCase().includes('imp')) impCol = 3;
          }
          if (actualCol === -1 && row.length >= 7 && (row[4] === 'actual' || cleanRows[r][4]?.toLowerCase().includes('actual'))) {
            actualCol = 4;
          }
          if (forecastCol === -1 && row.length >= 7 && (row[5] === 'forecast' || cleanRows[r][5]?.toLowerCase().includes('forecast'))) {
            forecastCol = 5;
          }
          if (prevCol === -1 && row.length >= 7 && (row[6] === 'previous' || cleanRows[r][6]?.toLowerCase().includes('prev'))) {
            prevCol = 6;
          }
          break;
        }
      }

      // Smart column heuristic fallback if headers are missing or not fully identified
      const candidateDataRows = headerRowIdx !== -1 ? cleanRows.slice(headerRowIdx + 1) : cleanRows;
      const sampleRows = candidateDataRows.slice(0, 20);

      if (sampleRows.length > 0) {
        const numCols = Math.max(...sampleRows.map(r => r.length));

        // 1. Detect Currency Column
        if (currCol === -1) {
          for (let c = 0; c < numCols; c++) {
            let ccyMatches = 0;
            sampleRows.forEach(row => {
              const cellVal = row[c];
              const s = typeof cellVal === 'string' ? cellVal.trim().toUpperCase() : String(cellVal || '').trim().toUpperCase();
              const mappedVal = INVESTING_COM_MAP[s] || normalizeCurrencyCode(cellVal);
              if (isG10Currency(mappedVal) || mappedVal === 'CNH') {
                ccyMatches++;
              }
            });
            if (ccyMatches >= Math.max(2, Math.floor(sampleRows.length * 0.25))) {
              currCol = c;
              break;
            }
          }
        }

        // 2. Detect Event Column
        if (eventCol === -1) {
          let bestCol = -1;
          let bestScore = 0;
          for (let c = 0; c < numCols; c++) {
            if (c === currCol) continue;
            let textScore = 0;
            sampleRows.forEach(row => {
              const val = String(row[c] || '').toLowerCase();
              if (val.length >= 5 && isNaN(Number(val)) && !val.includes(':') && !/^\d{4}-\d{2}/.test(val)) {
                textScore += 2;
                if (/pmi|cpi|sales|unemp|payroll|gdp|sentiment|survey|rate|confidence|ipc|desempleo|ventas/i.test(val)) {
                  textScore += 5;
                }
              }
            });
            if (textScore > bestScore) {
              bestScore = textScore;
              bestCol = c;
            }
          }
          if (bestCol !== -1 && bestScore >= 4) {
            eventCol = bestCol;
          }
        }

        // 3. Detect Numeric Columns (Actual, Forecast, Previous)
        if (actualCol === -1 || forecastCol === -1 || prevCol === -1) {
          const numericCols: number[] = [];
          for (let c = 0; c < numCols; c++) {
            if (c === currCol || c === eventCol || c === dateCol || c === timeCol) continue;
            let numCount = 0;
            sampleRows.forEach(row => {
              const val = String(row[c] || '').trim().replace(/[%+]/g, '');
              if (val !== '' && val !== '-' && val !== 'N/A' && !isNaN(parseFloat(val)) && !val.includes(':') && !/^\d{4}-\d{2}/.test(val)) {
                numCount++;
              }
            });
            if (numCount >= Math.max(2, Math.floor(sampleRows.length * 0.2))) {
              numericCols.push(c);
            }
          }
          if (numericCols.length >= 3) {
            if (actualCol === -1) actualCol = numericCols[0];
            if (forecastCol === -1) forecastCol = numericCols[1];
            if (prevCol === -1) prevCol = numericCols[2];
          } else if (numericCols.length === 2) {
            if (actualCol === -1) actualCol = numericCols[0];
            if (prevCol === -1) prevCol = numericCols[1];
          } else if (numericCols.length === 1) {
            if (actualCol === -1) actualCol = numericCols[0];
          }
        }
      }

      const dataRows = headerRowIdx !== -1 ? cleanRows.slice(headerRowIdx + 1) : cleanRows;
      if (dataRows.length === 0) {
        setUploadModal({
          isOpen: true,
          type: 'error',
          title: language === 'es' ? "Sin Filas de Datos" : "No Data Rows",
          message: language === 'es' ? "No se encontraron filas de datos posteriores a los encabezados." : "No data rows found below headers."
        });
        return;
      }

      let currentDate: string | null = null;

      // Check if LocalStorage is empty or needs baseline load
      const isStorageEmpty = !localStorage.getItem('forex_dashboard_data_v2');
      const isBaselineMode = valuationUpdateMode === 'baseline' || isStorageEmpty;

      interface CandidateRelease {
        date: string;
        time: string;
        actual: number | null;
        forecast: number | null;
        previous: number | null;
        weight: string;
        hasActual: boolean;
        eventName: string;
      }
      const slotUpdates: Record<string, Record<number, CandidateRelease[]>> = {};

      dataRows.forEach((row) => {
        // Check for date row separator (e.g. "Monday, Nov 2, 2026", "Lunes, 2 de Noviembre de 2026", "2026-11-02", etc.)
        const nonBlankCells = row.filter((c: any) => String(c || '').trim() !== '');
        if (nonBlankCells.length <= 3) {
          for (const cell of nonBlankCells) {
            const parsedD = formatSpreadsheetDate(cell);
            if (parsedD) {
              currentDate = parsedD;
              return; // Header/separator row, skip to next row
            }
          }
        }

        if (dateCol !== -1 && row[dateCol]) {
          const parsedDate = formatSpreadsheetDate(row[dateCol]);
          if (parsedDate) currentDate = parsedDate;
        }

        // Extract raw event text
        let rawEvent = '';
        if (eventCol !== -1 && row[eventCol] !== undefined) {
          rawEvent = String(row[eventCol] || '').trim();
        } else {
          const textCells = row.map((c: any) => String(c || '').trim()).filter((s: string) => s.length > 4 && isNaN(Number(s)) && !s.includes(':'));
          if (textCells.length > 0) rawEvent = textCells[0];
        }

        if (!rawEvent || rawEvent.length < 3) return;

        // Extract raw currency value
        let rawCur: any = '';
        if (currCol !== -1 && row[currCol] !== undefined && row[currCol] !== '') {
          rawCur = row[currCol];
        } else if (typeof row === 'object' && row !== null && !Array.isArray(row)) {
          rawCur = (row as any)['Cur.'] || (row as any)['Currency'] || (row as any)['Cur'] || (row as any)['cur.'] || (row as any)['currency'] || (row as any)['Country'] || (row as any)['country'] || '';
        }

        const safeStr = typeof rawCur === 'string' ? rawCur.trim().toUpperCase() : String(rawCur || '').trim().toUpperCase();
        let normalizedCurrency = INVESTING_COM_MAP[safeStr] || safeStr;

        const G10_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];

        // Fallback scan ONLY if safeStr was empty or not in G10 (only match valid isolated currency codes or countries)
        if (!G10_CURRENCIES.includes(normalizedCurrency)) {
          const cells = Array.isArray(row) ? row : Object.values(row);
          for (const cell of cells) {
            const s = typeof cell === 'string' ? cell.trim().toUpperCase() : String(cell || '').trim().toUpperCase();
            if (G10_CURRENCIES.includes(s) || (s.length >= 3 && INVESTING_COM_MAP[s])) {
              const mapped = INVESTING_COM_MAP[s];
              if (mapped && G10_CURRENCIES.includes(mapped)) {
                normalizedCurrency = mapped;
                break;
              }
            }
          }
        }

        if (!G10_CURRENCIES.includes(normalizedCurrency)) {
          const inferred = inferCurrencyFromText(rawEvent);
          if (inferred && G10_CURRENCIES.includes(inferred)) {
            normalizedCurrency = inferred;
          }
        }

        if (!G10_CURRENCIES.includes(normalizedCurrency)) return;

        const targetCurr = normalizedCurrency;
        const indList = DEFAULT_CURRENCY_INDICATORS[targetCurr] || [];
        const matchedIdx = findIndicatorIndex(targetCurr, rawEvent, indList, safeStr || rawCur);

        if (matchedIdx !== -1) {
          const item = indList[matchedIdx];
          let actVal: number | null = null;
          let hasActual = false;

          if (actualCol !== -1 && row[actualCol] !== undefined && row[actualCol] !== '' && row[actualCol] !== '-' && row[actualCol] !== 'ND' && row[actualCol] !== 'N/A') {
            actVal = parseSpreadsheetValue(row[actualCol], item.type, item.name);
            const indexTypes = ["PMI", "AUD_SERVICES", "CONFIDENCE", "INDEX_SMALL", "SURVEY_5", "ANZ_BIZ"];
            if (actVal === 0 && indexTypes.includes(item.type)) {
              actVal = null;
            } else {
              hasActual = true;
            }
          }

          let fcVal: number | null = null;
          if (forecastCol !== -1 && row[forecastCol] !== undefined && row[forecastCol] !== '' && row[forecastCol] !== '-' && row[forecastCol] !== 'ND' && row[forecastCol] !== 'N/A') {
            fcVal = parseSpreadsheetValue(row[forecastCol], item.type, item.name);
          }

          let pvVal: number | null = null;
          if (prevCol !== -1 && row[prevCol] !== undefined && row[prevCol] !== '' && row[prevCol] !== '-' && row[prevCol] !== 'ND' && row[prevCol] !== 'N/A') {
            pvVal = parseSpreadsheetValue(row[prevCol], item.type, item.name);
          }

          // Scale normalization guards
          if (item.name && (item.name.toLowerCase().includes('card transaction') || item.name.toLowerCase().includes('card retail'))) {
            if (typeof pvVal === 'number' && Math.abs(pvVal) >= 0.02) pvVal = parseFloat((pvVal / 10).toFixed(4));
            if (typeof fcVal === 'number' && Math.abs(fcVal) >= 0.02) fcVal = parseFloat((fcVal / 10).toFixed(4));
            if (typeof actVal === 'number' && Math.abs(actVal) >= 0.02) actVal = parseFloat((actVal / 10).toFixed(4));
          }
          if (item.name && item.name.toLowerCase().includes('cpi indicator') && item.name.toLowerCase().includes('mom')) {
            if (typeof pvVal === 'number' && Math.abs(pvVal) >= 0.015) pvVal = parseFloat((pvVal / 10).toFixed(4));
            if (typeof fcVal === 'number' && Math.abs(fcVal) >= 0.015) fcVal = parseFloat((fcVal / 10).toFixed(4));
            if (typeof actVal === 'number' && Math.abs(actVal) >= 0.015) actVal = parseFloat((actVal / 10).toFixed(4));
          }

          let weightVal = item.weight;
          if (impCol !== -1 && row[impCol] !== undefined && row[impCol] !== '') {
            weightVal = formatWeight(row[impCol]);
          }

          let timeVal = item.time || "08:30:00";
          if (timeCol !== -1 && row[timeCol] !== undefined && row[timeCol] !== '') {
            timeVal = formatTimeTo24h(row[timeCol], timeVal);
          }

          let releaseDate = currentDate;
          if (dateCol !== -1 && row[dateCol]) {
            const parsedColDate = formatSpreadsheetDate(row[dateCol]);
            if (parsedColDate) releaseDate = parsedColDate;
          }
          if (!releaseDate) releaseDate = new Date().toISOString().split('T')[0];

          if (!slotUpdates[targetCurr]) slotUpdates[targetCurr] = {};
          if (!slotUpdates[targetCurr][matchedIdx]) slotUpdates[targetCurr][matchedIdx] = [];

          slotUpdates[targetCurr][matchedIdx].push({
            date: releaseDate,
            time: timeVal,
            actual: actVal,
            forecast: fcVal,
            previous: pvVal,
            weight: weightVal,
            hasActual,
            eventName: rawEvent
          });
        }
      });

      let updatedCount = 0;
      const updatedCurrencies = new Set<string>();

      setCurrencyIndicators((prev) => {
        // Baseline Mode starts with existing or default and establishes complete starting scores
        // Incremental Mode preserves all unaffected historical indicators in LocalStorage completely intact
        const baseSource = isBaselineMode && isStorageEmpty ? DEFAULT_CURRENCY_INDICATORS : prev;
        const nextState: Record<string, MacroIndicator[]> = JSON.parse(JSON.stringify(baseSource));

        for (const curr of Object.keys(slotUpdates)) {
          const slotMap = slotUpdates[curr];
          if (!nextState[curr]) nextState[curr] = JSON.parse(JSON.stringify(DEFAULT_CURRENCY_INDICATORS[curr] || []));
          const list = [...nextState[curr]];

          for (const slotStr of Object.keys(slotMap)) {
            const slotIdx = parseInt(slotStr, 10);
            const candidates = slotMap[slotIdx];
            if (!candidates || candidates.length === 0 || !list[slotIdx]) continue;

            let chosenCandidate: CandidateRelease | null = null;

            if (!isBaselineMode) {
              // Incremental Weekly Mode:
              // Only update indicators that were ACTUALLY RELEASED during this week!
              // Events pending release (actual === null) in the weekly table MUST NOT overwrite
              // or clear the existing baseline data in storage!
              const releasedCandidates = candidates.filter(c => c.hasActual && c.actual !== null && !isNaN(c.actual));
              if (releasedCandidates.length === 0) {
                // No release this week for this slot: keep baseline completely intact!
                continue;
              }
              releasedCandidates.sort((a, b) => a.date.localeCompare(b.date));
              chosenCandidate = releasedCandidates[releasedCandidates.length - 1];
            } else {
              // Baseline Mode (2-month history):
              // Pick the latest released candidate if available, else the latest candidate
              const releasedCandidates = candidates.filter(c => c.hasActual && c.actual !== null && !isNaN(c.actual));
              if (releasedCandidates.length > 0) {
                releasedCandidates.sort((a, b) => a.date.localeCompare(b.date));
                chosenCandidate = releasedCandidates[releasedCandidates.length - 1];
              } else {
                candidates.sort((a, b) => a.date.localeCompare(b.date));
                chosenCandidate = candidates[candidates.length - 1];
              }
            }

            if (!chosenCandidate) continue;

            const item = { ...list[slotIdx] };
            if (chosenCandidate.date) item.date = chosenCandidate.date;
            if (chosenCandidate.time) item.time = chosenCandidate.time;
            if (chosenCandidate.previous !== null) item.previous = chosenCandidate.previous;
            if (chosenCandidate.forecast !== null) item.forecast = chosenCandidate.forecast;
            item.actual = chosenCandidate.actual;
            if (chosenCandidate.weight) item.weight = chosenCandidate.weight;

            const evalRes = evaluateIndicator(item);
            item.netChange = evalRes.netChange;
            item.score = evalRes.score;

            list[slotIdx] = item;
            updatedCount++;
            updatedCurrencies.add(curr);
          }

          nextState[curr] = list;
        }

        try {
          localStorage.setItem('forex_dashboard_data_v2', JSON.stringify(nextState));
        } catch {}

        return nextState;
      });

      if (updatedCount > 0) {
        const unaffectedCount = 72 - updatedCount;
        setUploadModal({
          isOpen: true,
          type: 'success',
          title: isBaselineMode
            ? (language === 'es' ? "Línea Base Histórica Cargada" : "Historical Baseline Loaded")
            : (language === 'es' ? "Actualización Semanal Incremental" : "Incremental Weekly Update Applied"),
          message: isBaselineMode
            ? (language === 'es'
                ? `Se cargó la línea base histórica con éxito: ${updatedCount} indicadores actualizados en ${updatedCurrencies.size} divisa(s) (${Array.from(updatedCurrencies).join(', ')}). Puntuaciones iniciales establecidas.`
                : `Successfully established baseline data: ${updatedCount} indicators populated across ${updatedCurrencies.size} currencies (${Array.from(updatedCurrencies).join(', ')}). Starting scores established.`)
            : (language === 'es'
                ? `Actualización incremental exitosa: se actualizaron únicamente ${updatedCount} evento(s) de la semana en ${updatedCurrencies.size} divisa(s) (${Array.from(updatedCurrencies).join(', ')}). ${unaffectedCount} indicadores históricos permanecen intactos en almacenamiento local.`
                : `Incremental update applied: updated only the ${updatedCount} event(s) released this week across ${updatedCurrencies.size} currencies (${Array.from(updatedCurrencies).join(', ')}). ${unaffectedCount} unaffected historical indicators remain completely intact in storage.`),
          updatedCount,
          currencies: Array.from(updatedCurrencies)
        });
      } else {
        setUploadModal({
          isOpen: true,
          type: 'error',
          title: language === 'es' ? "Sin Indicadores Compatibles" : "No Matching Indicators",
          message: language === 'es'
            ? "Se procesó el archivo, pero no se encontraron indicadores compatibles con las 8 divisas G10 (USD, EUR, GBP, JPY, AUD, NZD, CAD, CHF). Asegúrese de que el archivo contenga eventos del calendario económico."
            : "Processed file, but no matching indicators were identified for G10 currencies (USD, EUR, GBP, JPY, AUD, NZD, CAD, CHF). Please ensure the export contains economic calendar events."
        });
      }
    };

    // Parse CSV / TSV / TXT
    if (fileName.endsWith('.csv') || fileName.endsWith('.tsv') || fileName.endsWith('.txt')) {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: 'greedy',
        complete: (res) => processMatrix(res.data as any[][]),
        error: (err) => {
          setUploadModal({
            isOpen: true,
            type: 'error',
            title: language === 'es' ? "Error al procesar CSV" : "CSV Parse Error",
            message: err.message
          });
        }
      });
    }
    // Parse XLSX / XLS
    else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          let workbook: any = null;
          try {
            workbook = XLSX.read(data, { type: 'array' });
          } catch (readErr) {
            // Check if HTML table disguised as .xls
            try {
              const textContent = new TextDecoder().decode(data);
              if (textContent.includes('<table') || textContent.includes('<html')) {
                const doc = new DOMParser().parseFromString(textContent, 'text/html');
                const table = doc.querySelector('table');
                if (table) {
                  const rows: any[][] = [];
                  table.querySelectorAll('tr').forEach(tr => {
                    const row: any[] = [];
                    tr.querySelectorAll('td, th').forEach(td => row.push(td.textContent?.trim() || ''));
                    if (row.length > 0) rows.push(row);
                  });
                  if (rows.length > 0) {
                    processMatrix(rows);
                    return;
                  }
                }
              }
            } catch {}
            throw readErr;
          }

          if (workbook && workbook.SheetNames && workbook.SheetNames.length > 0) {
            let bestSheet = workbook.Sheets[workbook.SheetNames[0]];
            let maxRows = 0;
            for (const sName of workbook.SheetNames) {
              const s = workbook.Sheets[sName];
              if (!s || !s['!ref']) continue;
              const testMatrix: any[][] = XLSX.utils.sheet_to_json(s, { header: 1, defval: "" });
              if (testMatrix.length > maxRows) {
                maxRows = testMatrix.length;
                bestSheet = s;
              }
            }

            const sheetMatrix: any[][] = XLSX.utils.sheet_to_json(bestSheet, { header: 1, defval: "" });
            processMatrix(sheetMatrix);
          }
        } catch (err: any) {
          setUploadModal({
            isOpen: true,
            type: 'error',
            title: language === 'es' ? "Error en Hoja Excel" : "Excel Reading Error",
            message: err.message || "Failed to parse Excel spreadsheet"
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      setUploadModal({
        isOpen: true,
        type: 'error',
        title: language === 'es' ? "Formato no compatible" : "Unsupported Format",
        message: language === 'es' ? "Por favor suba un archivo .xlsx, .xls o .csv." : "Please upload a .xlsx, .xls, or .csv file."
      });
    }
  };

  const handleCurrencyInvestingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadModal(null); // Explicitly reset error modal state
    if (file) processCurrencySpreadsheet(file);
    e.target.value = ''; // Clear file input so user can re-upload the same file
  };

  // --- Central Bank Calculations & Trajectory ---
  const calculateBankTrajectory = (rate: number, implied: number, step: number = 0.25): number[] => {
    const delta = implied - rate;
    const p0 = rate;
    const p1 = implied;
    const p2 = Number((p1 + delta * 0.75).toFixed(2));
    const p3 = Number((p2 + delta * 0.50).toFixed(2));
    const p4 = Number((p3 + delta * 0.20).toFixed(2));
    return [Number(p0.toFixed(2)), Number(p1.toFixed(2)), p2, p3, p4];
  };

  const getBankCountdown = (nextMeetingStr: string) => {
    const target = new Date(nextMeetingStr);
    const now = new Date();
    if (isNaN(target.getTime())) return { text: "--", badgeClass: "bg-zinc-800 text-zinc-500" };
    const diffMs = target.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 0) {
      return { text: "Passed", badgeClass: "bg-zinc-900 text-zinc-500 border border-zinc-800" };
    } else if (diffHours <= 24) {
      return { text: `<${diffHours}h left`, badgeClass: "bg-rose-950/80 text-rose-300 border border-rose-800 animate-pulse font-bold" };
    } else if (diffDays <= 7) {
      return { text: `${diffDays}d left`, badgeClass: "bg-amber-950/50 text-amber-300 border border-amber-700 font-bold" };
    } else {
      return { text: `${diffDays}d left`, badgeClass: "bg-cyan-950/40 text-cyan-300 border border-cyan-800 font-bold" };
    }
  };

  const getBankDetailedCountdown = (nextMeetingStr: string): string => {
    const target = new Date(nextMeetingStr);
    const now = new Date();
    if (isNaN(target.getTime())) return "--";
    const diffMs = target.getTime() - now.getTime();
    if (diffMs <= 0) return "Decision Concluded";
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h remaining`;
  };

  const classifyPolicyTone = (deltaBps: number, outcome: string) => {
    if (deltaBps >= 20) {
      return { label: "Strongly Hawkish", class: "text-emerald-300 bg-emerald-950/80 border-emerald-500/50", weight: 4 };
    } else if (deltaBps >= 10 && outcome === "HIKE") {
      return { label: "Hawkish / Hike Bias", class: "text-emerald-400 bg-emerald-950/50 border-emerald-500/30", weight: 3 };
    } else if (outcome === "HOLD" && deltaBps > 5) {
      return { label: "Hawkish Hold", class: "text-teal-300 bg-teal-950/50 border-teal-500/30", weight: 2 };
    } else if (Math.abs(deltaBps) <= 5) {
      return { label: "Neutral / Data-Dependent", class: "text-zinc-300 bg-zinc-800/60 border-zinc-700", weight: 1 };
    } else if (outcome === "HOLD" && deltaBps < -5) {
      return { label: "Dovish Hold", class: "text-amber-300 bg-amber-950/50 border-amber-500/30", weight: -1 };
    } else if (deltaBps <= -6 && deltaBps > -18) {
      return { label: "Dovish Pivot", class: "text-rose-300 bg-rose-950/50 border-rose-500/30", weight: -2 };
    } else {
      return { label: "Strongly Dovish", class: "text-rose-400 bg-rose-950/80 border-rose-500/50", weight: -3 };
    }
  };

  // --- Central Bank Export / Import ---
  const handleExportBankBackup = () => {
    try {
      const cleanData = JSON.parse(JSON.stringify(ratesData));
      const jsonStr = JSON.stringify(cleanData, null, 2);
      const fileName = `central_bank_rates_backup_${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });

      if ((window.navigator as any)?.msSaveOrOpenBlob) {
        (window.navigator as any).msSaveOrOpenBlob(blob, fileName);
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.position = 'fixed';
      a.style.top = '-9999px';
      a.style.left = '-9999px';
      a.style.opacity = '0';
      a.href = url;
      a.download = fileName;
      a.setAttribute('download', fileName);
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1500);
    } catch (err) {
      console.error("Central bank export error:", err);
      alert(language === 'es' ? "Error al exportar los datos del banco central." : "Failed to export Central Bank rates backup.");
    }
  };

  const handleImportBankBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target?.result as string);
        if (imported && typeof imported === 'object') {
          const cleanImported = JSON.parse(JSON.stringify(imported));
          setRatesData(cleanImported);
          try {
            localStorage.setItem('central_bank_terminal_v2', JSON.stringify(cleanImported));
          } catch {}
          alert(language === 'es' ? "¡Copia de seguridad de tasas del Banco Central restaurada con éxito!" : "Central Bank rates backup restored successfully!");
        } else {
          alert(language === 'es' ? "Archivo JSON de copia de seguridad inválido." : "Invalid backup JSON file.");
        }
      } catch {
        alert(language === 'es' ? "Archivo JSON de copia de seguridad inválido." : "Invalid backup JSON file.");
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleResetBankDefaults = () => {
    const confirmMsg = language === 'es'
      ? "¿Restablecer las tasas del Banco Central a los valores predeterminados?"
      : "Reset Central Bank rates to baseline defaults?";
    if (confirm(confirmMsg)) {
      const cleanDefaults = JSON.parse(JSON.stringify(DEFAULT_RATES_DATA));
      setRatesData(cleanDefaults);
      try {
        localStorage.removeItem('central_bank_terminal_v2');
      } catch {}
      alert(language === 'es' ? "Tasas del Banco Central restablecidas a los valores predeterminados." : "Central Bank rates reset to defaults.");
    }
  };

  // --- Central Bank Investing.com Upload Parser ---
  const cleanNum = (val: any): number | null => {
    if (val === null || val === undefined || val === '') return null;
    let s = String(val).trim();
    if (s === '-' || s === 'N/A' || s === '') return null;
    if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
    else if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '');
    s = s.replace(/[%+]/g, '').trim();
    const parsed = parseFloat(s);
    return isNaN(parsed) ? null : parsed;
  };
  const matchCentralBankEvent = (eventName: string, ccyOrCountry: string): string | null => {
    const ev = (eventName || '').toLowerCase();
    const normalizedCcy = normalizeCurrencyCode(ccyOrCountry);
    const ccy = normalizedCcy || (ccyOrCountry || '').toUpperCase();

    if (ev.includes('fomc') || ev.includes('fed interest rate') || ev.includes('fed funds') || ev.includes('federal reserve')) return 'FED';
    if (ev.includes('ecb interest rate') || ev.includes('ecb main refinancing') || ev.includes('deposit facility rate')) return 'ECB';
    if (ev.includes('boe interest rate') || ev.includes('bank of england') || ev.includes('boe bank rate')) return 'BOE';
    if (ev.includes('rba interest rate') || ev.includes('rba rate decision') || ev.includes('rba cash rate')) return 'RBA';
    if (ev.includes('boc interest rate') || ev.includes('boc rate decision') || ev.includes('bank of canada')) return 'BOC';
    if (ev.includes('rbnz interest rate') || ev.includes('rbnz rate decision') || ev.includes('reserve bank of nz')) return 'RBNZ';
    if (ev.includes('boj interest rate') || ev.includes('boj policy rate') || ev.includes('bank of japan')) return 'BOJ';
    if (ev.includes('snb interest rate') || ev.includes('snb policy rate') || ev.includes('swiss national bank')) return 'SNB';

    if (ev.includes('interest rate') || ev.includes('rate decision') || ev.includes('policy rate')) {
      if (ccy === 'USD' || ccy === 'US' || ev.includes('united states')) return 'FED';
      if (ccy === 'EUR' || ccy === 'EU' || ccy === 'DE' || ev.includes('eurozone') || ev.includes('euro zone')) return 'ECB';
      if (ccy === 'GBP' || ccy === 'UK' || ccy === 'GB' || ev.includes('united kingdom')) return 'BOE';
      if (ccy === 'AUD' || ccy === 'AU' || ev.includes('australia')) return 'RBA';
      if (ccy === 'CAD' || ccy === 'CA' || ev.includes('canada')) return 'BOC';
      if (ccy === 'NZD' || ccy === 'NZ' || ev.includes('new zealand')) return 'RBNZ';
      if (ccy === 'JPY' || ccy === 'JP' || ev.includes('japan')) return 'BOJ';
      if (ccy === 'CHF' || ccy === 'CH' || ev.includes('switzerland')) return 'SNB';
    }
    return null;
  };

  const processBankSpreadsheet = (file: File) => {
    if (!file) return;
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = JSON.parse(evt.target?.result as string);
          if (imported && typeof imported === 'object') {
            setRatesData(imported);
            alert("Central Bank rates backup restored successfully!");
          }
        } catch {
          alert("Invalid backup JSON file.");
        }
      };
      reader.readAsText(file);
      return;
    }

    const processBankRows = (rows: any[]) => {
      if (!rows || rows.length === 0) {
        alert("No data rows found in uploaded file.");
        return;
      }

      const first = rows[0];
      const keys = Object.keys(first);
      const findKey = (candidates: string[]) => keys.find(k => candidates.includes(k.trim().toLowerCase()));

      const eventKey = findKey(['event', 'indicator', 'event name', 'title']);
      const actualKey = findKey(['actual', 'act']);
      const forecastKey = findKey(['forecast', 'consensus', 'fcst', 'expected']);
      const prevKey = findKey(['previous', 'prev', 'prior']);
      const dateKey = findKey(['date', 'day', 'release date']);
      const timeKey = findKey(['time']);
      const currKey = findKey(['cur.', 'cur', 'currency', 'country', 'zone']);

      if (!eventKey) {
        alert("Could not identify an 'Event' column in the uploaded file.");
        return;
      }

      let updatedCount = 0;
      const updatedNames = new Set<string>();

      setRatesData((prev) => {
        const next = { ...prev };
        let currentDate: string | null = null;

        rows.forEach((row) => {
          if (dateKey && row[dateKey]) {
            currentDate = String(row[dateKey]).trim();
          }

          const rawEvent = String(row[eventKey] || '').trim();
          if (!rawEvent) return;

          const rawCurr = currKey && row[currKey] ? String(row[currKey]).trim() : '';
          const bankCode = matchCentralBankEvent(rawEvent, rawCurr);

          if (bankCode && next[bankCode]) {
            const bank = { ...next[bankCode] };
            let hasUpdated = false;

            if (prevKey && row[prevKey] !== undefined && row[prevKey] !== '' && row[prevKey] !== '-') {
              const parsedRate = cleanNum(row[prevKey]);
              if (parsedRate !== null) {
                bank.rate = parsedRate;
                hasUpdated = true;
              }
            }

            if (forecastKey && row[forecastKey] !== undefined && row[forecastKey] !== '' && row[forecastKey] !== '-') {
              const parsedForecast = cleanNum(row[forecastKey]);
              if (parsedForecast !== null) {
                bank.implied = parsedForecast;
                hasUpdated = true;
              }
            } else if (actualKey && row[actualKey] !== undefined && row[actualKey] !== '' && row[actualKey] !== '-') {
              const parsedAct = cleanNum(row[actualKey]);
              if (parsedAct !== null) {
                bank.implied = parsedAct;
                hasUpdated = true;
              }
            }

            const meetingDate = (dateKey && row[dateKey]) ? String(row[dateKey]).trim() : currentDate;
            if (meetingDate) {
              const d = new Date(meetingDate);
              if (!isNaN(d.getTime())) {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                let timeStr = "12:00:00";
                if (timeKey && row[timeKey] && /^\d{1,2}:\d{2}/.test(String(row[timeKey]).trim())) {
                  const parts = String(row[timeKey]).trim().split(':');
                  timeStr = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
                }
                bank.nextMeeting = `${y}-${m}-${day}T${timeStr}`;
                hasUpdated = true;
              }
            }

            if (hasUpdated) {
              bank.trajectory = calculateBankTrajectory(bank.rate, bank.implied, bank.step);
              next[bankCode] = bank;
              updatedCount++;
              updatedNames.add(bank.name);
            }
          }
        });

        return next;
      });

      if (updatedCount > 0) {
        alert(`Successfully updated ${updatedNames.size} central bank(s) from Investing.com export!\n(${Array.from(updatedNames).join(', ')})`);
      } else {
        alert("Processed export, but no matching G10 Central Bank interest rate decisions were found.");
      }
    };

    if (fileName.endsWith('.csv') || fileName.endsWith('.tsv') || fileName.endsWith('.txt')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => processBankRows(res.data),
        error: (err) => alert("CSV parse error: " + err.message)
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });
          processBankRows(rows);
        } catch (err: any) {
          alert("Error reading Excel spreadsheet: " + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Unsupported format. Please upload .csv, .xlsx, or .xls file.");
    }
  };

  const handleBankInvestingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processBankSpreadsheet(file);
    e.target.value = '';
  };

  // Drag and drop file loading for active tool views
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      if (activeTab === 'currency-strength' || activeTab === 'central-banks') {
        e.preventDefault();
      }
    };
    const handleDrop = (e: DragEvent) => {
      if (activeTab === 'currency-strength' || activeTab === 'central-banks') {
        e.preventDefault();
        const file = e.dataTransfer?.files?.[0];
        if (!file) return;
        if (activeTab === 'currency-strength') {
          processCurrencySpreadsheet(file);
        } else if (activeTab === 'central-banks') {
          processBankSpreadsheet(file);
        }
      }
    };
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [activeTab]);

  const handleApplyBankOverride = (bankCode: string) => {
    const r = parseFloat(drillRate);
    const imp = parseFloat(drillImplied);
    if (isNaN(r) || isNaN(imp)) {
      alert("Please enter valid numeric rates.");
      return;
    }
    setRatesData(prev => {
      const current = prev[bankCode];
      if (!current) return prev;
      const updated: CentralBankTerminalItem = {
        ...current,
        rate: r,
        implied: imp,
        nextMeeting: drillMeeting ? (drillMeeting.length === 16 ? drillMeeting + ':00' : drillMeeting) : current.nextMeeting,
        trajectory: calculateBankTrajectory(r, imp, current.step)
      };
      return { ...prev, [bankCode]: updated };
    });
    alert(`Applied rate override and recalculated trajectory for ${bankCode}.`);
  };

  // Sync drilldown inputs when selected bank changes
  useEffect(() => {
    if (selectedBankKey !== 'Overview' && ratesData[selectedBankKey]) {
      const b = ratesData[selectedBankKey];
      setDrillRate(b.rate.toString());
      setDrillImplied(b.implied.toString());
      setDrillMeeting(b.nextMeeting.slice(0, 16));
    }
  }, [selectedBankKey, ratesData]);

  return (
    <div className="w-full bg-[var(--bg)] text-[var(--ink)] font-sans antialiased min-h-screen transition-colors">
      
      {/* PAGE HEADER */}
      <section className="w-full border-b border-[var(--line)] py-8 sm:py-10 print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-2">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              // {t.tools.badge}
            </span>
            <h1 className="font-sans font-semibold text-2xl sm:text-3xl lg:text-4xl tracking-[-0.025em] leading-[1.1]">
              {t.tools.title}
            </h1>
            <p className="text-[var(--ink-muted)] text-sm leading-relaxed">
              {t.tools.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* ARCHITECTURAL STICKY TABS BAR (MATCHES HEADER) */}
      <div className="w-full bg-[var(--bg)] border-b border-[var(--line)] sticky top-12 z-30 print:hidden transition-colors">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-fit max-w-full h-11 flex items-stretch overflow-x-auto no-scrollbar touch-scroll divide-x divide-[var(--line)] border-x border-[var(--line)]">
            {[
              { id: 'all', label: t.tools.subTabs.all },
              { id: 'quant-desk', label: t.tools.subTabs.quantDesk },
              { id: 'calendar-filter', label: t.tools.subTabs.calendarFilter },
              { id: 'currency-strength', label: t.tools.subTabs.currencyStrength },
              { id: 'calculator', label: t.tools.subTabs.calculator },
              { id: 'central-banks', label: t.tools.subTabs.centralBanks, isExternal: true, href: 'https://central-bank-tool.onrender.com/' },
              { id: 'consensus', label: t.tools.subTabs.consensus },
            ].map((tab) => (
              (tab as any).isExternal ? (
                <a
                  key={tab.id}
                  href={(tab as any).href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 h-full flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] border-b-2 border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]/50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {tab.label}
                  <span aria-hidden className="text-xs">↗</span>
                </a>
              ) : (
                <button
                  key={tab.id}
                  onClick={() => handleTabSwitch(tab.id as ToolSubTab)}
                  className={`px-5 h-full flex items-center text-[11px] font-semibold uppercase tracking-[0.08em] border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === tab.id
                      ? 'border-[var(--ink)] text-[var(--ink)] bg-[var(--surface)]'
                      : 'border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface)]/50'
                  }`}
                >
                  {tab.label}
                </button>
              )
            ))}
          </div>
        </div>
      </div>

      {/* SUB-VIEW: SUITE HUB OVERVIEW */}
      {activeTab === 'all' && (
        <section className="w-full py-10 sm:py-12">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
            <ToolGrid language={language} onOpen={handleTabSwitch} />
          </div>
        </section>
      )}

      {/* SUB-VIEW: QUANT DESK / CURRENCY SENTIMENT DEFINER */}
      {activeTab === 'quant-desk' && (
        <div className="w-full space-y-0">
          <SectionDivider label={language === 'es' ? '// DIVISIÓN 01 • DEFINIDOR DE SENTIMIENTO DE DIVISAS (5 PILARES)' : '// DIVISION 01 • CURRENCY SENTIMENT DEFINER (5 PILLARS)'} />
          <QuantDesk onReturnToHub={() => handleTabSwitch('all')} language={language} />
        </div>
      )}

      {/* SUB-VIEW: CALENDAR FILTER TOOL */}
      {activeTab === 'calendar-filter' && (
        <div className="w-full space-y-0">
          <SectionDivider label={language === 'es' ? '// DIVISIÓN 01 • MOTOR UNIFICADO DE RIESGO Y DIVERGENCIAS' : '// DIVISION 01 • UNIFIED MACRO RISK & DIVERGENCES'} />
          <KairosMacroHub onReturnToHub={() => handleTabSwitch('all')} language={language} />
        </div>
      )}

      {/* SUB-VIEW: CURRENCY STRENGTH & VALUATION ENGINE */}
      {activeTab === 'currency-strength' && (
        <div className="w-full space-y-0">
          
          {/* UNIFIED TOOL HEADER */}
          <ToolHeader
            onReturnToHub={() => handleTabSwitch('all')}
            language={language}
            eyebrow="VALUATION ENGINE"
            tags={['G10 SCOREBOARD', '28 FX CROSSES']}
            title={language === 'es' ? 'Matriz de Fuerza de Divisas' : 'Currency Strength Matrix'}
            subtitle={
              language === 'es'
                ? 'Puntuación fundamental agregada en 8 divisas G10 y 28 pares cruzados con actualizaciones incrementales semanales o línea base histórica.'
                : 'Aggregate fundamental scoring across 8 G10 currencies and 28 cross pairs with weekly incremental updates or full historical baseline loading.'
            }
            actions={
              <>
                {/* Ingestion Mode Switcher: Incremental vs Full Baseline */}
                <div className="flex items-center border border-[var(--line)] bg-[var(--surface)] rounded-[2px] divide-x divide-[var(--line)] h-9 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setValuationUpdateMode('incremental')}
                    className={`flex-1 sm:flex-initial px-3 h-full text-[11px] uppercase tracking-[0.08em] font-semibold transition cursor-pointer ${
                      valuationUpdateMode === 'incremental'
                        ? 'bg-[var(--ink)] text-[var(--bg)]'
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                    }`}
                    title="Incremental Weekly Update: Ingests only current week events and updates their scores, leaving unaffected historical indicators in LocalStorage completely intact"
                  >
                    {language === 'es' ? 'Semanal' : 'Weekly'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setValuationUpdateMode('baseline')}
                    className={`flex-1 sm:flex-initial px-3 h-full text-[11px] uppercase tracking-[0.08em] font-semibold transition cursor-pointer ${
                      valuationUpdateMode === 'baseline'
                        ? 'bg-[var(--ink)] text-[var(--bg)]'
                        : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                    }`}
                    title="Baseline Load: Ingests full 2-month history to establish baseline indicators and starting scores across all currencies"
                  >
                    {language === 'es' ? 'Línea Base' : 'Baseline'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex-1 sm:flex-initial h-9 px-3.5 rounded-[2px] text-[11px] uppercase tracking-[0.08em] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--line-strong)] transition cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <FileSpreadsheet size={13} className="shrink-0" />
                  <span>Excel/CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportData}
                  className="flex-1 sm:flex-initial h-9 px-3.5 rounded-[2px] text-[11px] uppercase tracking-[0.08em] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--line-strong)] transition cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Download size={13} className="shrink-0" />
                  <span>JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 sm:flex-initial h-9 px-3.5 rounded-[2px] text-[11px] uppercase tracking-[0.08em] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--line-strong)] transition cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Upload size={13} className="shrink-0" />
                  <span>{language === 'es' ? 'Backup' : 'Import'}</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,.xlsx,.xls,.csv,.tsv,application/json"
                  onChange={handleImportData}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => currencyInvestingFileRef.current?.click()}
                  className="flex-1 sm:flex-initial h-9 px-3.5 rounded-[2px] text-[11px] uppercase tracking-[0.08em] bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 font-semibold transition cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <FileSpreadsheet size={13} className="shrink-0" />
                  <span>Investing.com</span>
                </button>
                <input
                  type="file"
                  ref={currencyInvestingFileRef}
                  accept=".csv,.xlsx,.xls,.tsv,.json"
                  onChange={handleCurrencyInvestingUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={handleResetData}
                  className="flex-1 sm:flex-initial h-9 px-3.5 rounded-[2px] text-[11px] uppercase tracking-[0.08em] bg-[var(--surface)] hover:bg-rose-500/10 text-[#EF4444] border border-[var(--line)] hover:border-[#EF4444]/40 transition cursor-pointer inline-flex items-center justify-center gap-1.5"
                  title={language === 'es' ? "Reiniciar todos los indicadores a 0" : "Reset all indicator values to 0"}
                >
                  <RotateCcw size={13} className="shrink-0" />
                  <span>{language === 'es' ? 'Reiniciar' : 'Reset'}</span>
                </button>
              </>
            }
          />

          {/* Section 1: Valuation Scorecards & Ranking */}
          <section className="w-full py-8 sm:py-10 border-b border-[var(--line)] bg-[var(--bg)] transition-colors">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6 font-mono">

              {/* Unified Valuation Spreadsheet Drop Zone */}
              <SpreadsheetDropZone
                title={language === 'es' ? 'Cargar Tabla de Indicadores Investing.com' : 'Load Investing.com Indicators Table'}
                badge={valuationUpdateMode === 'incremental' ? (language === 'es' ? 'Semanal Incremental' : 'Weekly Incremental') : (language === 'es' ? 'Línea Base Completa' : 'Full Baseline')}
                description={
                  valuationUpdateMode === 'incremental'
                    ? (language === 'es'
                        ? 'Modo Semanal Incremental: Solo actualiza los eventos de la semana actual. Los datos históricos en LocalStorage permanecen intactos.'
                        : 'Incremental Mode: Scans & updates only the releases for the current week, keeping all unaffected historical data in LocalStorage completely intact.')
                    : (language === 'es'
                        ? 'Modo Línea Base Completa: Ingiere archivo histórico de 2 meses de Investing.com para establecer la línea base y puntuaciones iniciales.'
                        : 'Baseline Mode: Ingests 2-month Investing.com calendar to populate starting indicators and establish baseline scores.')
                }
                onFileSelected={processCurrencySpreadsheet}
                externalInputRef={currencyInvestingFileRef}
              />

              {/* 8 Currency Scorecards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
                {Object.keys(currencyTotals).map((curr) => {
                  const score = currencyTotals[curr];
                  const isSelected = currencyActiveTab === curr;
                  return (
                    <div
                      key={curr}
                      onClick={() => setCurrencyActiveTab(curr)}
                      className={`p-3.5 border rounded-[2px] text-center transition-colors cursor-pointer group flex flex-col justify-between min-h-[100px] ${
                        isSelected
                          ? 'bg-[var(--surface-2)] border-[var(--accent)] text-[var(--ink)]'
                          : 'bg-[var(--surface)] border-[var(--line)] text-[var(--ink-muted)] hover:border-[var(--line-strong)]'
                      }`}
                    >
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">{curr}</div>
                        <div className={`text-xl sm:text-2xl font-bold mt-1 tabular-nums ${
                          score > 0 ? 'text-[#10B981]' : score < 0 ? 'text-[#EF4444]' : 'text-[var(--ink-muted)]'
                        }`}>
                          {score > 0 ? `+${score}` : score}
                        </div>
                      </div>

                      {/* Mini Bipolar Currency Strength Chart Meter */}
                      <div className="mt-2.5 w-full h-1.5 bg-[var(--bg)] flex border border-[var(--line)] relative">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[var(--line-strong)] z-10 -ml-px" />
                        <div className="w-1/2 flex justify-end">
                          {score < 0 && (
                            <div
                              className="bg-[#EF4444] h-full"
                              style={{ width: `${Math.min(100, (Math.abs(score) / 3.0) * 100)}%` }}
                            />
                          )}
                        </div>
                        <div className="w-1/2 flex justify-start">
                          {score > 0 && (
                            <div
                              className="bg-[#10B981] h-full"
                              style={{ width: `${Math.min(100, (score / 3.0) * 100)}%` }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CURRENCY VALUATION RANKING MATRIX BAR CHART */}
              <div className="pt-1">
                <ValuationRankingChart
                  totals={currencyTotals}
                  selectedCurrency={currencyActiveTab === 'dashboard' ? 'USD' : currencyActiveTab}
                  onSelectCurrency={(curr) => setCurrencyActiveTab(curr)}
                />
              </div>

            </div>
          </section>

          {/* Section 2: 28 Cross-Pair Directional Bias Engine */}
          <section className="w-full py-10 sm:py-12 border-b border-[var(--line)] bg-[var(--surface-2)]/35 transition-colors">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6 font-mono">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[var(--line)]">
                <div>
                  <span className="text-[var(--accent)] text-[10px] font-semibold uppercase tracking-[0.12em] block">
                    // SPREAD DIFFERENTIALS
                  </span>
                  <h2 className="font-sans text-xl sm:text-2xl font-semibold text-[var(--ink)] tracking-[-0.02em] mt-1">
                    Directional Bias Engine (28 Pairs)
                  </h2>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--line)] rounded-[2px] px-3 h-9 text-xs text-[var(--ink-muted)]">
                    <span className="uppercase text-[10px] tracking-wider">Sort:</span>
                    <select
                      value={currencySort}
                      onChange={(e) => setCurrencySort(e.target.value as any)}
                      className="bg-transparent text-[var(--ink)] font-semibold outline-none cursor-pointer"
                    >
                      <option value="divergence" className="bg-[var(--surface)] text-[var(--ink)]">Max Divergence (|Diff|)</option>
                      <option value="bullish" className="bg-[var(--surface)] text-[var(--ink)]">Most Bullish (+Diff)</option>
                      <option value="bearish" className="bg-[var(--surface)] text-[var(--ink)]">Most Bearish (-Diff)</option>
                      <option value="default" className="bg-[var(--surface)] text-[var(--ink)]">Default Pair Order</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 bg-[var(--surface)] border border-[var(--line)] rounded-[2px] px-3 h-9 text-xs text-[var(--ink-muted)]">
                    <span className="uppercase text-[10px] tracking-wider">Filter:</span>
                    <select
                      value={currencyFilter}
                      onChange={(e) => setCurrencyFilter(e.target.value as any)}
                      className="bg-transparent text-[var(--ink)] font-semibold outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-[var(--surface)] text-[var(--ink)]">All Pairs (28)</option>
                      <option value="strong" className="bg-[var(--surface)] text-[var(--ink)]">Strong Div (≥ 8)</option>
                      <option value="bullish" className="bg-[var(--surface)] text-[var(--ink)]">Bullish Only</option>
                      <option value="bearish" className="bg-[var(--surface)] text-[var(--ink)]">Bearish Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 28 Pairs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredPairs.map((p) => (
                  <div key={p.pair} className="bg-[var(--surface)] border border-[var(--line)] hover:border-[var(--line-strong)] rounded-[2px] p-4 space-y-2.5 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--ink)] text-sm tracking-wide">{p.pair}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-[2px] border uppercase tracking-wider ${
                          p.diff > 0
                            ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
                            : p.diff < 0
                            ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
                            : 'bg-[var(--surface-2)] text-[var(--ink-muted)] border-[var(--line)]'
                        }`}>
                          {p.biasText}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--ink-muted)] uppercase tabular-nums">
                        Spread: <span className={`font-semibold ${p.diff > 0 ? 'text-[#10B981]' : p.diff < 0 ? 'text-[#EF4444]' : 'text-[var(--ink)]'}`}>{p.diff > 0 ? `+${p.diff}` : p.diff}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[#EF4444] font-semibold w-8 text-right tabular-nums">{p.shortPct}%</span>
                      <div className="flex-1 h-1.5 bg-[var(--bg)] flex border border-[var(--line)]">
                        <div className="bg-[#EF4444] h-full" style={{ width: `${p.shortPct}%` }} />
                        <div className="bg-[#10B981] h-full" style={{ width: `${p.longPct}%` }} />
                      </div>
                      <span className="text-[#10B981] font-semibold w-8 tabular-nums">{p.longPct}%</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </section>

          {/* Section 3: Detailed Indicator Inputs & Breakdown Table */}
          <section className="w-full py-10 sm:py-12 border-b border-[var(--line)] bg-[var(--bg)] transition-colors">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6 font-mono">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[var(--line)]">
                <div className="space-y-1">
                  <span className="text-[var(--accent)] text-[10px] font-semibold uppercase tracking-[0.12em] block">
                    // MACROECONOMIC METRICS BREAKDOWN
                  </span>
                  <h2 className="font-sans text-xl sm:text-2xl font-semibold text-[var(--ink)] tracking-[-0.02em]">
                    {currencyActiveTab === 'dashboard' ? 'USD' : currencyActiveTab} Indicators (Editable Live)
                  </h2>
                </div>

                <div className="flex items-center border border-[var(--line)] rounded-[2px] divide-x divide-[var(--line)] overflow-x-auto no-scrollbar touch-scroll text-xs">
                  {['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setCurrencyActiveTab(c)}
                      className={`px-3.5 h-9 uppercase tracking-[0.08em] text-[11px] transition cursor-pointer flex items-center justify-center font-semibold ${
                        (currencyActiveTab === c || (currencyActiveTab === 'dashboard' && c === 'USD'))
                          ? 'bg-[var(--ink)] text-[var(--bg)]'
                          : 'bg-[var(--surface)] text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fundamental Factor Breakdown Chart for Selected Currency */}
              <CurrencyIndicatorChart
                currency={currencyActiveTab === 'dashboard' ? 'USD' : currencyActiveTab}
                indicators={(currencyIndicators[currencyActiveTab === 'dashboard' ? 'USD' : currencyActiveTab] || []).map(ind => {
                  const evalResult = evaluateIndicator(ind);
                  return {
                    ...ind,
                    score: evalResult.score,
                    netChange: evalResult.netChange
                  };
                })}
                totalScore={currencyTotals[currencyActiveTab === 'dashboard' ? 'USD' : currencyActiveTab] || 0}
              />

              {/* Indicator Table with responsive touch scrolling */}
              <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[2px] overflow-x-auto touch-scroll">
                <table className="w-full text-left font-mono text-xs min-w-[700px]">
                  <thead>
                    <tr className="text-[var(--ink-muted)] text-[10px] border-b border-[var(--line)] uppercase tracking-[0.08em] bg-[var(--surface-2)]">
                      <th className="p-3.5 pl-5 font-semibold">Indicator Name</th>
                      <th className="p-3.5 w-36 font-semibold">Release Date</th>
                      <th className="p-3.5 w-28 font-semibold">Previous</th>
                      <th className="p-3.5 w-28 font-semibold">Forecast</th>
                      <th className="p-3.5 w-28 font-semibold">Actual</th>
                      <th className="p-3.5 text-right font-semibold">Net Change</th>
                      <th className="p-3.5 text-center font-semibold">Score</th>
                      <th className="p-3.5 text-right pr-5 font-semibold">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {(currencyIndicators[currencyActiveTab === 'dashboard' ? 'USD' : currencyActiveTab] || []).map((ind, idx) => {
                      const evaluated = evaluateIndicator(ind);
                      const curr = currencyActiveTab === 'dashboard' ? 'USD' : currencyActiveTab;

                      return (
                        <tr key={ind.name} className="hover:bg-[var(--surface-2)]/60 transition-colors">
                          <td className="p-3 pl-5 font-semibold text-[var(--ink)]">{ind.name}</td>
                          <td className="p-3">
                            <input
                              type="date"
                              value={ind.date || ''}
                              onChange={(e) => updateIndicatorValue(curr, idx, 'date', e.target.value)}
                              className="w-full h-8 rounded-[2px] bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink)] text-xs px-2 outline-none focus:border-[var(--accent)] font-mono"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={formatIndicatorDisplay(ind.previous, ind.type)}
                              onChange={(e) => updateIndicatorValue(curr, idx, 'previous', e.target.value)}
                              className="w-full h-8 rounded-[2px] bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink)] text-xs px-2 outline-none focus:border-[var(--accent)] font-mono tabular-nums"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={formatIndicatorDisplay(ind.forecast, ind.type)}
                              onChange={(e) => updateIndicatorValue(curr, idx, 'forecast', e.target.value)}
                              className="w-full h-8 rounded-[2px] bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink)] text-xs px-2 outline-none focus:border-[var(--accent)] font-mono tabular-nums"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="text"
                              value={formatIndicatorDisplay(ind.actual, ind.type)}
                              onChange={(e) => updateIndicatorValue(curr, idx, 'actual', e.target.value)}
                              className="w-full h-8 rounded-[2px] bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink)] text-xs px-2 outline-none focus:border-[var(--accent)] font-mono tabular-nums"
                            />
                          </td>
                          <td className="p-3 text-right tabular-nums text-[var(--ink)] font-semibold">
                            {formatNetChangeDisplay(evaluated.netChange, ind.type)}
                          </td>
                          <td className="p-3 text-center font-semibold tabular-nums">
                            <span className={evaluated.score > 0 ? 'text-[#10B981]' : evaluated.score < 0 ? 'text-[#EF4444]' : 'text-[var(--ink-muted)]'}>
                              {evaluated.score > 0 ? `+${evaluated.score}` : evaluated.score}
                            </span>
                          </td>
                          <td className="p-3 text-right pr-5 text-[var(--ink-muted)] tabular-nums">{ind.weight}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          </section>

        </div>
      )}

      {/* SUB-VIEW: RISK CALCULATOR */}
      {activeTab === 'calculator' && (
        <div className="w-full space-y-0">
          <ToolHeader
            onReturnToHub={() => handleTabSwitch('all')}
            language={language}
            eyebrow="POSITION SIZING"
            tags={['EXACT MODEL', 'RISK CONTROL']}
            title={language === 'es' ? 'Calculadora de Riesgo y Tamaño de Posición' : 'Risk & Position Size Calculator'}
            subtitle={
              language === 'es'
                ? 'Dimensionamiento exacto de lotaje basado en divisa base de la cuenta, distancia de stop loss y porcentaje de riesgo.'
                : 'Exact lot and unit sizing calculated from account base currency, stop-loss distance in pips, and capital risk percentage.'
            }
          />
          <section className="w-full py-8 sm:py-10 border-b border-[var(--line)] bg-[var(--bg)] transition-colors">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6 font-mono">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[2px] p-5 sm:p-6 space-y-4">
                <span className="text-[var(--ink-muted)] text-[10px] font-semibold uppercase tracking-[0.12em] block pb-2.5 border-b border-[var(--line)]">
                  // INPUT PARAMETERS
                </span>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[var(--ink-muted)] uppercase tracking-[0.06em]">Account Base Currency</label>
                  <select
                    value={calcAcctCurr}
                    onChange={(e) => setCalcAcctCurr(e.target.value)}
                    className="w-full h-10 rounded-[2px] bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink)] text-xs px-3 outline-none focus:border-[var(--accent)]"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="AUD">AUD - Australian Dollar</option>
                    <option value="CAD">CAD - Canadian Dollar</option>
                    <option value="CHF">CHF - Swiss Franc</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[var(--ink-muted)] uppercase tracking-[0.06em]">Currency Pair</label>
                  <select
                    value={calcPair}
                    onChange={(e) => setCalcPair(e.target.value)}
                    className="w-full h-10 rounded-[2px] bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink)] text-xs px-3 outline-none focus:border-[var(--accent)]"
                  >
                    {PAIRS_LIST.map((p) => (
                      <option key={p} value={p}>{p.substring(0, 3)}/{p.substring(3, 6)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[var(--ink-muted)] uppercase tracking-[0.06em]">Account Balance ({calcAcctCurr})</label>
                  <input
                    type="number"
                    value={calcBalance}
                    onChange={(e) => setCalcBalance(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 rounded-[2px] bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink)] text-xs px-3 outline-none focus:border-[var(--accent)] tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[var(--ink-muted)] uppercase tracking-[0.06em]">Risk Allocation (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={calcRiskPct}
                    onChange={(e) => setCalcRiskPct(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 rounded-[2px] bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink)] text-xs px-3 outline-none focus:border-[var(--accent)] tabular-nums"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] text-[var(--ink-muted)] uppercase tracking-[0.06em]">Stop Loss Distance (Pips)</label>
                  <input
                    type="number"
                    value={calcStopPips}
                    onChange={(e) => setCalcStopPips(parseFloat(e.target.value) || 0)}
                    className="w-full h-10 rounded-[2px] bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink)] text-xs px-3 outline-none focus:border-[var(--accent)] tabular-nums"
                  />
                </div>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[2px] p-5 sm:p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-6">
                  <span className="text-[var(--ink-muted)] text-[10px] font-semibold uppercase tracking-[0.12em] block pb-2.5 border-b border-[var(--line)]">
                    // SIZING ALLOCATION OUTPUT
                  </span>

                  <div className="space-y-4 divide-y divide-[var(--line)] text-xs">
                    <div className="pt-1 flex justify-between items-center">
                      <span className="text-[var(--ink-muted)] uppercase">Absolute Cash Risk:</span>
                      <span className="text-lg sm:text-xl font-bold text-[#EF4444] tabular-nums">
                        ${riskResult.cashRisk.toFixed(2)} {calcAcctCurr}
                      </span>
                    </div>

                    <div className="pt-4 flex justify-between items-center">
                      <span className="text-[var(--ink-muted)] uppercase">Recommended Position Size:</span>
                      <span className="text-xl sm:text-2xl font-bold text-[var(--ink)] tabular-nums">
                        {riskResult.standardLots} <span className="text-xs font-normal text-[var(--ink-muted)]">Lots</span>
                      </span>
                    </div>

                    <div className="pt-4 flex justify-between items-center">
                      <span className="text-[var(--ink-muted)] uppercase">Running Pip Value:</span>
                      <span className="text-xs sm:text-sm font-semibold text-[var(--ink)] tabular-nums">
                        ${riskResult.pipValue.toFixed(2)} {calcAcctCurr} / pip
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-[var(--surface-2)] border border-[var(--line)] rounded-[2px] text-[11px] text-[var(--ink-muted)] leading-relaxed font-sans">
                  Standard contract assumes 100,000 units. Conversions dynamically reflect G10 currency parities.
                </div>
              </div>
            </div>
          </div>
        </section>
        </div>
      )}



      {/* SUB-VIEW: CONSENSUS ENGINE */}
      {activeTab === 'consensus' && (
        <div className="w-full space-y-0">
          <ToolHeader
            onReturnToHub={() => handleTabSwitch('all')}
            language={language}
            eyebrow="EXPECTATIONS MATRIX"
            tags={['BEAT / MISS', 'SURPRISE FILTER']}
            title={language === 'es' ? 'Motor de Consenso y Reacción' : 'Consensus Filter Hub'}
            subtitle={
              language === 'es'
                ? 'Filtros interactivos de expectativas, bandas de pronóstico de consenso y evaluación de sorpresas post-publicación.'
                : 'Interactive expectation filters, consensus forecast bands, and post-release outcome evaluation.'
            }
            actions={
              <input
                type="text"
                value={consensusSearch}
                onChange={(e) => setConsensusSearch(e.target.value)}
                placeholder={language === 'es' ? 'Buscar indicador...' : 'Search indicator...'}
                className="w-full sm:w-64 h-9 rounded-[2px] bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--accent)] text-[var(--ink)] placeholder:text-[var(--ink-muted)] text-xs px-3 outline-none font-mono transition-colors"
              />
            }
          />
          <section className="w-full py-8 sm:py-10 border-b border-[var(--line)] bg-[var(--bg)] transition-colors">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6 font-mono">

            <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[2px] overflow-x-auto touch-scroll">
              <table className="w-full text-left font-mono text-xs min-w-[720px]">
                <thead>
                  <tr className="text-[var(--ink-muted)] text-[10px] border-b border-[var(--line)] uppercase tracking-[0.08em] bg-[var(--surface-2)]">
                    <th className="p-3.5 pl-5 font-semibold">Time (UTC)</th>
                    <th className="p-3.5 font-semibold">Jurisdiction</th>
                    <th className="p-3.5 font-semibold">Economic Indicator</th>
                    <th className="p-3.5 text-center font-semibold">Consensus</th>
                    <th className="p-3.5 text-center font-semibold">Expectation Range</th>
                    <th className="p-3.5 text-center font-semibold">Prior</th>
                    <th className="p-3.5 text-center pr-5 font-semibold">Outcome Evaluator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {consensusEvents
                    .filter((e) =>
                      !consensusSearch.trim() ||
                      e.indicator.toLowerCase().includes(consensusSearch.toLowerCase()) ||
                      e.country.toLowerCase().includes(consensusSearch.toLowerCase())
                    )
                    .map((e) => (
                    <tr
                      key={e.id}
                      className={`transition-colors ${
                        e.status === 'green'
                          ? 'bg-[#10B981]/[0.07]'
                          : e.status === 'red'
                          ? 'bg-[#EF4444]/[0.07]'
                          : 'hover:bg-[var(--surface-2)]/60'
                      }`}
                    >
                      <td className="p-3.5 pl-5 text-[var(--ink-muted)] tabular-nums">{e.time}</td>
                      <td className="p-3.5 font-semibold text-[var(--accent)]">{e.country}</td>
                      <td className="p-3.5 font-sans font-medium text-[var(--ink)]">{e.indicator}</td>
                      <td className="p-3.5 text-center text-[var(--ink)] font-semibold tabular-nums">{e.consensus}</td>
                      <td className="p-3.5 text-center text-[var(--ink-muted)] tabular-nums">{e.range}</td>
                      <td className="p-3.5 text-center text-[var(--ink-muted)] tabular-nums">{e.prior}</td>
                      <td className="p-3.5 text-center pr-5">
                        <button
                          onClick={() => {
                            setConsensusEvents((prev) =>
                              prev.map((ev) =>
                                ev.id === e.id
                                   ? { ...ev, status: ev.status === 'none' ? 'green' : ev.status === 'green' ? 'red' : 'none' }
                                  : ev
                              )
                            );
                          }}
                          className={`h-8 px-3 rounded-[2px] text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors cursor-pointer border inline-flex items-center justify-center ${
                            e.status === 'green'
                              ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/40'
                              : e.status === 'red'
                              ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/40'
                              : 'bg-[var(--surface-2)] text-[var(--ink-muted)] border-[var(--line)] hover:text-[var(--ink)] hover:border-[var(--line-strong)]'
                          }`}
                        >
                          {e.status === 'green' ? 'BEAT' : e.status === 'red' ? 'MISS' : 'EVALUATE'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </section>
        </div>
      )}

      {/* Macro Calendar Upload Status Modal */}
      {uploadModal && uploadModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`max-w-md w-full bg-[var(--surface)] border ${uploadModal.type === 'success' ? 'border-[#10B981]/50' : 'border-[#EF4444]/50'} p-6 rounded-[2px] font-mono space-y-4 shadow-xl`}>
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 ${uploadModal.type === 'success' ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                <span className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${uploadModal.type === 'success' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  {uploadModal.type === 'success' ? '// CALENDAR INGESTION SUCCESS' : '// CALENDAR PARSING NOTICE'}
                </span>
              </div>
              <button
                onClick={() => setUploadModal(null)}
                className="text-[var(--ink-muted)] hover:text-[var(--ink)] text-xs font-mono transition cursor-pointer p-1"
                aria-label="Close modal"
              >
                [ ✕ ]
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-[var(--ink)] text-sm font-semibold uppercase tracking-wide">
                {uploadModal.title}
              </h3>
              <p className="text-[var(--ink-muted)] text-xs font-sans leading-relaxed">
                {uploadModal.message}
              </p>
            </div>

            {uploadModal.currencies && uploadModal.currencies.length > 0 && (
              <div className="pt-2">
                <div className="text-[10px] text-[var(--ink-muted)] uppercase tracking-wider mb-1.5 font-mono">
                  {language === 'es' ? 'Divisas Actualizadas:' : 'Updated Currencies:'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {uploadModal.currencies.map(c => (
                    <span key={c} className="px-2 py-0.5 rounded-[2px] bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--line)] text-[10px] font-semibold">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-[var(--line)] flex justify-end gap-2">
              <button
                onClick={() => setUploadModal(null)}
                className="h-9 px-4 rounded-[2px] text-xs font-semibold uppercase tracking-[0.08em] bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 transition cursor-pointer"
              >
                {language === 'es' ? 'Aceptar' : 'Dismiss'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
