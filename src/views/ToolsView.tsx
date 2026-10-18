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
  VOLATILITY_DATA,
  CENTRAL_BANKS,
  INITIAL_CONSENSUS_EVENTS,
  DEFAULT_CURRENCY_INDICATORS,
  PAIRS_LIST
} from '../data/macroData';
import { TRANSLATIONS } from '../locales/translations';
import { KairosMacroHub } from '../components/KairosMacroHub';
import { ValuationRankingChart } from '../components/ValuationRankingChart';
import { CurrencyIndicatorChart } from '../components/CurrencyIndicatorChart';
import { SectionDivider } from '../components/SectionDivider';

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
  const [activeTab, setActiveTab] = useState<ToolSubTab>(initialSubTab);

  const t = TRANSLATIONS[language];

  const handleTabSwitch = (tab: ToolSubTab) => {
    setActiveTab(tab);
    onSubTabChange?.(tab);
  };

  // Volatility state
  const [volatilitySort, setVolatilitySort] = useState<'symbol' | 'pips' | 'cash' | 'range'>('pips');
  const [volatilitySortAsc, setVolatilitySortAsc] = useState<boolean>(false);
  const [volatilitySearch, setVolatilitySearch] = useState<string>('');

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save currencyIndicators to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('forex_dashboard_data_v2', JSON.stringify(currencyIndicators));
    } catch {}
  }, [currencyIndicators]);

  // --- Volatility table sorting logic ---
  const sortedVolatility = [...VOLATILITY_DATA]
    .filter((v) => v.symbol.toLowerCase().includes(volatilitySearch.toLowerCase()))
    .sort((a, b) => {
      const colMap = {
        symbol: 'symbol',
        pips: 'avgPips',
        cash: 'cashValue100k',
        range: 'rangePct',
      } as const;
      const key = colMap[volatilitySort];
      const valA = a[key];
      const valB = b[key];
      if (typeof valA === 'string') {
        return volatilitySortAsc ? (valA as string).localeCompare(valB as string) : (valB as string).localeCompare(valA as string);
      }
      return volatilitySortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

  const toggleVolSort = (col: 'symbol' | 'pips' | 'cash' | 'range') => {
    if (volatilitySort === col) {
      setVolatilitySortAsc(!volatilitySortAsc);
    } else {
      setVolatilitySort(col);
      setVolatilitySortAsc(false);
    }
  };

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

  // --- Currency Strength Mathematical Evaluator ---
  const parseInputValue = (input: any, type: string): number | null => {
    if (input === null || input === undefined || input === '') return null;
    const strVal = input.toString().trim().toUpperCase().replace('K', '');
    if (strVal === '-' || strVal === 'N/A') return null;
    const isExplicitPercent = strVal.includes('%');
    const num = parseFloat(strVal.replace('%', ''));
    if (isNaN(num)) return null;
    const percentTypes = ["CPI", "UNEMP_RATE", "PCT_GROWTH", "EUR_UNEMP_FIXED", "CARD_TRANS"];
    if (percentTypes.includes(type) && (isExplicitPercent || Math.abs(num) >= 0.08)) return num / 100.0;
    return num;
  };

  const evaluateIndicator = (ind: MacroIndicator) => {
    let netChange = 0;
    if (ind.actual !== null && ind.previous !== null) {
      netChange = ind.actual - ind.previous;
    }
    netChange = parseFloat(netChange.toFixed(4));
    let score = 0;

    switch (ind.type) {
      case "PMI":
      case "AUD_SERVICES":
        if (netChange >= 2.0) score = 2;
        else if (netChange >= 0.5) score = 1;
        else if (netChange > -0.5) score = 0;
        else if (netChange > -2.0) score = -1;
        else score = -2;
        break;
      case "CPI":
      case "PCT_GROWTH":
      case "GBP_RETAIL":
      case "CARD_TRANS":
        if (netChange >= 0.003) score = 2;
        else if (netChange >= 0.001) score = 1;
        else if (netChange > -0.001) score = 0;
        else if (netChange > -0.003) score = -1;
        else score = -2;
        break;
      case "UNEMP_RATE":
      case "EUR_UNEMP_FIXED":
        if (netChange <= -0.002) score = 2;
        else if (netChange <= -0.001) score = 1;
        else if (netChange === 0) score = 0;
        else if (netChange < 0.002) score = -1;
        else score = -2;
        break;
      case "GBP_CLAIMANT":
      case "GER_UNEMP_CHANGE":
      case "CHF_UNEMP_CHANGE":
        if (netChange <= -15.0) score = 2;
        else if (netChange <= -3.0) score = 1;
        else if (netChange < 3.0) score = 0;
        else if (netChange < 15.0) score = -1;
        else score = -2;
        break;
      case "JOBS_K":
      case "CAD_JOBS":
        if (netChange >= 40.0) score = 2;
        else if (netChange >= 10.0) score = 1;
        else if (netChange > -10.0) score = 0;
        else if (netChange > -40.0) score = -1;
        else score = -2;
        break;
      case "NFP":
        if (netChange >= 50) score = 2;
        else if (netChange >= 15) score = 1;
        else if (netChange > -15) score = 0;
        else if (netChange > -50) score = -1;
        else score = -2;
        break;
      case "CONFIDENCE":
      case "INDEX_SMALL":
      case "SURVEY_5":
      case "ANZ_BIZ":
        if (netChange >= 4.0) score = 2;
        else if (netChange >= 1.0) score = 1;
        else if (netChange > -1.0) score = 0;
        else if (netChange > -4.0) score = -1;
        else score = -2;
        break;
      default:
        score = netChange > 0 ? 1 : netChange < 0 ? -1 : 0;
    }
    return { netChange, score };
  };

  const calculateCurrencyTotals = () => {
    const totals: Record<string, number> = {};
    Object.keys(currencyIndicators).forEach((curr) => {
      const list = currencyIndicators[curr] || [];
      const sum = list.reduce((acc, ind) => {
        const { score } = evaluateIndicator(ind);
        return acc + score;
      }, 0);
      totals[curr] = sum;
    });
    return totals;
  };

  const currencyTotals = calculateCurrencyTotals();

  const getPairDivergence = (base: string, quote: string) => {
    const bScore = currencyTotals[base] !== undefined ? currencyTotals[base] : 0;
    const qScore = currencyTotals[quote] !== undefined ? currencyTotals[quote] : 0;
    const diff = bScore - qScore;

    let biasText = "NEUTRAL";
    let badgeBg = "bg-zinc-800 text-zinc-400 border-zinc-700";

    if (diff >= 6) {
      biasText = "STRONG BULLISH";
      badgeBg = "bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.3)]";
    } else if (diff >= 2) {
      biasText = "BULLISH";
      badgeBg = "bg-cyan-950/50 text-cyan-400 border-cyan-500/30";
    } else if (diff <= -6) {
      biasText = "STRONG BEARISH";
      badgeBg = "bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]";
    } else if (diff <= -2) {
      biasText = "BEARISH";
      badgeBg = "bg-rose-950/50 text-rose-400 border-rose-500/30";
    }

    const absMax = 12;
    const longPct = Math.round(Math.max(10, Math.min(90, 50 + (diff / absMax) * 40)));
    const shortPct = 100 - longPct;

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
        item[field] = parseInputValue(rawVal, item.type);
      }

      currentList[idx] = item;
      return {
        ...prev,
        [curr]: currentList,
      };
    });
  };

  const handleExportData = () => {
    try {
      const cleanData = JSON.parse(JSON.stringify(currencyIndicators));
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

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          const cleanParsed = JSON.parse(JSON.stringify(parsed));
          setCurrencyIndicators(cleanParsed);
          try {
            localStorage.setItem('forex_dashboard_data_v2', JSON.stringify(cleanParsed));
          } catch {}
          alert(language === 'es' ? "¡Copia de seguridad de valoración importada con éxito!" : "Macro Valuation Data Imported Successfully.");
        } else {
          alert(language === 'es' ? "Formato de archivo JSON inválido." : "Invalid JSON data file format.");
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
    const confirmMsg = language === 'es'
      ? "¿Restablecer todos los datos del panel de valoración a los valores iniciales?"
      : "Reset all valuation dashboard inputs to default baseline?";
    if (confirm(confirmMsg)) {
      const cleanDefaults = JSON.parse(JSON.stringify(DEFAULT_CURRENCY_INDICATORS));
      setCurrencyIndicators(cleanDefaults);
      try {
        localStorage.removeItem('forex_dashboard_data_v2');
      } catch {}
      alert(language === 'es' ? "Datos de valoración restablecidos a los valores predeterminados." : "Valuation data reset to baseline defaults.");
    }
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

  const findIndicatorIndex = (targetCurr: string, rawEvent: string, indList: MacroIndicator[]): number => {
    if (!indList || !indList.length) return -1;
    const clean = normalizeEventText(rawEvent);
    const ev = rawEvent.toLowerCase();

    // 1. Direct match on name or normalized string
    for (let i = 0; i < indList.length; i++) {
      const ind = indList[i];
      if (ind.name.toLowerCase() === ev) return i;
      if (normalizeEventText(ind.name) === clean) return i;
    }

    // 2. High-precision domain keyword matching per currency
    for (let i = 0; i < indList.length; i++) {
      const ind = indList[i];
      const iname = ind.name.toLowerCase();

      // PMIs
      if (iname.includes('mfg pmi') || iname.includes('manufacturing pmi')) {
        if ((ev.includes('manufacturing') || ev.includes('manufactur') || clean.includes('mfg')) && (ev.includes('pmi') || clean.includes('pmi'))) {
          return i;
        }
      }
      if (iname.includes('services pmi') || iname.includes('non-mfg') || iname.includes('aud_services')) {
        if ((ev.includes('services') || ev.includes('servicio') || ev.includes('non-manufacturing')) && (ev.includes('pmi') || clean.includes('pmi'))) {
          return i;
        }
      }
      if (iname.includes('ivey') && (ev.includes('ivey') || clean.includes('ivey'))) return i;

      // NFP & Labor Market
      if (iname === 'nfp' && (clean.includes('nfp') || ev.includes('nonfarm') || ev.includes('non-farm') || ev.includes('nóminas') || ev.includes('nominas'))) {
        return i;
      }
      if ((iname.includes('unemployment rate') || iname === 'unemp rate') && !iname.includes('change')) {
        if ((ev.includes('unemployment rate') || ev.includes('tasa de desempleo') || ev.includes('tasa de paro') || ev.includes('jobless rate')) && !ev.includes('change') && !ev.includes('cambio')) {
          return i;
        }
      }
      if (iname.includes('unemp change') || iname.includes('unemployment change')) {
        if (ev.includes('unemployment change') || ev.includes('cambio del desempleo') || ev.includes('jobless change')) {
          return i;
        }
      }
      if (iname.includes('claimant') && (ev.includes('claimant') || ev.includes('subsidio por desempleo'))) {
        return i;
      }
      if ((iname.includes('employment change') || iname.includes('net employment') || iname.includes('jobs change')) && !iname.includes('unemployment')) {
        if ((ev.includes('employment change') || ev.includes('net employment') || ev.includes('cambio del empleo') || ev.includes('creación de empleo') || ev.includes('jobs change')) && !ev.includes('unemployment') && !ev.includes('desempleo')) {
          return i;
        }
      }

      // Inflation / CPI
      if (iname.includes('cpi') || iname.includes('food prices')) {
        if (iname.includes('tokyo') && (ev.includes('tokyo') || ev.includes('tokio'))) return i;
        if (iname.includes('food') && (ev.includes('food') || ev.includes('alimento'))) return i;
        if (!iname.includes('tokyo') && !iname.includes('food')) {
          if (ev.includes('cpi') || ev.includes('ipc') || ev.includes('consumer price') || ev.includes('precios al consumidor') || ev.includes('inflation') || ev.includes('inflación')) {
            return i;
          }
        }
      }

      // Retail Sales
      if (iname.includes('retail sales') && (ev.includes('retail') || ev.includes('minorista') || ev.includes('ventas minoristas'))) {
        return i;
      }
      if (iname.includes('card transactions') && (ev.includes('card transaction') || ev.includes('tarjetas'))) {
        return i;
      }

      // GDP & Output
      if (iname.includes('gdpnow') && (ev.includes('gdpnow') || (ev.includes('atlanta') && ev.includes('gdp')))) {
        return i;
      }
      if (iname.includes('jcer') && ev.includes('jcer')) return i;
      if (iname.includes('gdp') && !iname.includes('gdpnow') && !iname.includes('jcer')) {
        if (ev.includes('gdp') || ev.includes('pib') || ev.includes('gross domestic') || ev.includes('producto interior')) {
          return i;
        }
      }

      // Business & Consumer Confidence Surveys
      if (iname.includes('consumer confidence') || iname.includes('consumer sentiment') || iname.includes('consumer survey')) {
        if (ev.includes('consumer confidence') || ev.includes('confianza del consumidor') || ev.includes('consumer sentiment') || ev.includes('sentimiento del consumidor') || ev.includes('consumer survey')) {
          return i;
        }
      }
      if (iname.includes('ifo') && (ev.includes('ifo') || ev.includes('business climate') || ev.includes('clima empresarial'))) return i;
      if (iname.includes('nfib') && (ev.includes('nfib') || ev.includes('small business'))) return i;
      if (iname.includes('cfib') && (ev.includes('cfib') || ev.includes('business barometer'))) return i;
      if (iname.includes('westpac') && (ev.includes('westpac') || ev.includes('sentiment'))) return i;
      if (iname.includes('nab') && (ev.includes('nab') || ev.includes('business confidence'))) return i;
      if (iname.includes('anz') && iname.includes('business') && (ev.includes('anz') && ev.includes('business'))) return i;
      if (iname.includes('tankan') && (ev.includes('tankan') || ev.includes('reuters'))) return i;
      if (iname.includes('cbi') && (ev.includes('cbi') || ev.includes('industrial trends'))) return i;
      if (iname.includes('gfk') && (ev.includes('gfk') || ev.includes('consumer confidence'))) return i;
      if (iname.includes('aig') && (ev.includes('aig') || ev.includes('industry index'))) return i;
      if (iname.includes('kof') && (ev.includes('kof') || ev.includes('leading indicator'))) return i;
      if (iname.includes('seco') && (ev.includes('seco') || ev.includes('economic indicators') || ev.includes('consumer climate'))) return i;
      if (iname.includes('industrial production') && (ev.includes('industrial production') || ev.includes('producción industrial') || ev.includes('produccion industrial'))) return i;
      if (iname.includes('cash earnings') && (ev.includes('cash earnings') || ev.includes('earnings') || ev.includes('salarios'))) return i;
      if (iname.includes('activity index') && (ev.includes('activity index') || ev.includes('busnz'))) return i;
    }

    // 3. Normalized substring inclusion
    for (let i = 0; i < indList.length; i++) {
      const inameNorm = normalizeEventText(indList[i].name);
      if (inameNorm.length >= 4 && (clean.includes(inameNorm) || inameNorm.includes(clean))) {
        return i;
      }
    }

    // 4. Token overlap matching
    let bestIdx = -1;
    let bestScore = 0;
    const cleanWords = clean.split(/\s+/).filter(w => w.length > 2);
    for (let i = 0; i < indList.length; i++) {
      const inameWords = normalizeEventText(indList[i].name).split(/\s+/).filter(w => w.length > 2);
      if (!inameWords.length) continue;
      const common = cleanWords.filter(w => inameWords.includes(w));
      const score = common.length / Math.max(cleanWords.length, inameWords.length);
      if (score > bestScore && score >= 0.35) {
        bestScore = score;
        bestIdx = i;
      }
    }

    return bestIdx;
  };

  // Excel Serial Date Converter (Fix Year +046300 Bug)
  const formatSpreadsheetDate = (dateVal: any): string => {
    if (dateVal === null || dateVal === undefined || dateVal === '') {
      return new Date().toISOString().slice(0, 10);
    }
    const str = String(dateVal).trim().replace(/[\u00A0\u200B\r\n]/g, '');
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    // Serial date numbers (e.g. 46300 or "46300")
    const num = typeof dateVal === 'number' ? dateVal : parseFloat(str);
    if (!isNaN(num) && num >= 25000 && num <= 60000) {
      const epochDate = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(epochDate.getTime())) {
        return epochDate.toISOString().slice(0, 10);
      }
    }
    // Formats with slashes or dots: DD/MM/YYYY, DD.MM.YYYY, MM/DD/YYYY
    if (/^\d{1,2}[\/\.]\d{1,2}[\/\.]\d{4}$/.test(str)) {
      const parts = str.split(/[\/\.]/);
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      const yr = parseInt(parts[2], 10);
      if (p2 <= 12 && p1 <= 31) {
        const mm = String(p2).padStart(2, '0');
        const dd = String(p1).padStart(2, '0');
        return `${yr}-${mm}-${dd}`;
      }
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const yr = d.getUTCFullYear();
      if (yr >= 1990 && yr <= 2050) {
        return d.toISOString().slice(0, 10);
      }
    }
    return new Date().toISOString().slice(0, 10);
  };

  const parseSpreadsheetValue = (input: any, type: string): number | null => {
    if (input === null || input === undefined || input === '') return null;
    let strVal = String(input).trim().replace(/[\u00A0\u200B\r\n]/g, '');
    if (strVal === '-' || strVal === 'N/A' || strVal === 'n/a' || strVal === 'ND' || strVal === '') return null;

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

    let cleanStr = strVal.replace(/[%+]/g, '').trim();

    // Thousands types stored in thousands (NFP, Jobs)
    const thousandsTypes = ["NFP", "JOBS_K", "CAD_JOBS", "GBP_CLAIMANT", "GER_UNEMP_CHANGE", "CHF_UNEMP_CHANGE"];
    if (thousandsTypes.includes(type)) {
      cleanStr = cleanStr.replace(/k/gi, '').trim();
      const num = parseFloat(cleanStr);
      if (isNaN(num)) return null;
      if (Math.abs(num) >= 1000 && !hasK) {
        return num / 1000;
      }
      return num;
    }

    // Percentage types stored as decimals (e.g. 0.041 for 4.1%, 0.002 for 0.2%)
    const percentTypes = ["CPI", "UNEMP_RATE", "PCT_GROWTH", "EUR_UNEMP_FIXED", "CARD_TRANS", "GBP_RETAIL"];
    if (percentTypes.includes(type)) {
      cleanStr = cleanStr.replace(/k/gi, '').trim();
      const num = parseFloat(cleanStr);
      if (isNaN(num)) return null;

      // Unit and Scale Normalization (Fix Decimal Shift Bug):
      if (isExplicitPercent) {
        // If already a tiny decimal with an accidental % attached, don't divide again
        if (Math.abs(num) < 0.08) {
          return num;
        }
        return num / 100.0;
      } else {
        // No % sign: if already a small decimal (0.041, 0.063, 0.002), don't divide by 100 again
        if (Math.abs(num) < 0.08) {
          return num;
        }
        return num / 100.0;
      }
    }

    // General index / survey / pmi / large suffix
    if (hasK) {
      const num = parseFloat(cleanStr.replace(/k/gi, ''));
      return isNaN(num) ? null : num * 1000;
    }
    if (hasM) {
      const num = parseFloat(cleanStr.replace(/m/gi, ''));
      return isNaN(num) ? null : num * 1000000;
    }
    if (hasB) {
      const num = parseFloat(cleanStr.replace(/b/gi, ''));
      return isNaN(num) ? null : num * 1000000000;
    }

    const num = parseFloat(cleanStr);
    return isNaN(num) ? null : num;
  };

  const processCurrencySpreadsheet = (file: File) => {
    if (!file) return;
    const fileName = file.name.toLowerCase();

    // 1. JSON Backup Restore
    if (fileName.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const imported = JSON.parse(evt.target?.result as string);
          if (imported && typeof imported === 'object') {
            setCurrencyIndicators(imported);
            alert(language === 'es' ? "¡Copia de seguridad de Valoración restaurada con éxito!" : "Currency Indicators backup restored successfully!");
          }
        } catch {
          alert(language === 'es' ? "Archivo JSON de copia de seguridad inválido." : "Invalid backup JSON file.");
        }
      };
      reader.readAsText(file);
      return;
    }

    // 2. Core Matrix Processor for CSV / XLSX / XLS
    const processMatrix = (rawRows: any[][]) => {
      const cleanRows = (rawRows || []).filter(r => r && r.some((c: any) => c !== null && c !== undefined && String(c).trim() !== ''));
      if (cleanRows.length === 0) {
        alert(language === 'es' ? "El archivo no contiene filas legibles." : "No readable data rows found in uploaded file.");
        return;
      }

      // Column detection indices
      let headerRowIdx = -1;
      let eventCol = -1;
      let currCol = -1;
      let actualCol = -1;
      let forecastCol = -1;
      let prevCol = -1;
      let dateCol = -1;

      // Scan first 25 rows to detect actual header row
      for (let r = 0; r < Math.min(cleanRows.length, 25); r++) {
        const row = cleanRows[r].map(c => String(c || '').trim().toLowerCase());
        const hasEventHeader = row.some(c => c === 'event' || c === 'indicator' || c === 'evento' || c === 'indicador' || c === 'acontecimiento' || c.includes('event'));
        const hasCcyHeader = row.some(c => c === 'cur.' || c === 'cur' || c === 'currency' || c === 'divisa' || c === 'moneda' || c === 'country' || c === 'pais' || c === 'país' || c === 'zone');
        const hasNumbersHeader = row.some(c => c === 'actual' || c === 'dato actual' || c === 'real' || c === 'forecast' || c === 'previsión' || c === 'prevision' || c === 'previous' || c === 'previo');

        if (hasEventHeader || (hasCcyHeader && hasNumbersHeader)) {
          headerRowIdx = r;
          row.forEach((cell, idx) => {
            if (['date', 'fecha', 'day', 'dia', 'día', 'release date'].some(h => cell === h || cell.includes(h))) {
              if (dateCol === -1) dateCol = idx;
            }
            if (['cur.', 'cur', 'currency', 'div.', 'div', 'divisa', 'moneda', 'country', 'pais', 'país', 'zone', 'zona', 'ccy'].some(h => cell === h || cell.startsWith(h))) {
              if (currCol === -1) currCol = idx;
            }
            if (['event', 'indicator', 'evento', 'indicador', 'acontecimiento', 'title', 'nombre', 'release'].some(h => cell === h || cell.includes(h))) {
              if (eventCol === -1) eventCol = idx;
            }
            if (['actual', 'act', 'dato actual', 'real', 'current'].some(h => cell === h || cell.includes(h))) {
              if (actualCol === -1) actualCol = idx;
            }
            if (['forecast', 'consensus', 'fcst', 'previsión', 'prevision', 'previsto', 'pronóstico', 'pronostico', 'consenso', 'expected', 'estimado'].some(h => cell === h || cell.includes(h))) {
              if (forecastCol === -1) forecastCol = idx;
            }
            if (['previous', 'prev', 'prior', 'previo', 'anterior', 'prev.'].some(h => cell === h || cell.includes(h))) {
              if (prevCol === -1) prevCol = idx;
            }
          });
          break;
        }
      }

      // Fallback heuristics if no explicit header row was identified
      if (headerRowIdx === -1) {
        headerRowIdx = 0;
        // Try to identify from first data row
        const sampleRow = cleanRows[0];
        sampleRow.forEach((c: any, idx: number) => {
          const s = String(c || '').trim();
          if (s.length >= 3 && /^[A-Z]{2,3}$/.test(s)) {
            if (currCol === -1) currCol = idx;
          } else if (s.length > 5 && isNaN(Number(s)) && !s.includes(':')) {
            if (eventCol === -1) eventCol = idx;
          }
        });
      }

      const dataRows = cleanRows.slice(headerRowIdx + 1);
      if (dataRows.length === 0) {
        alert(language === 'es' ? "No se encontraron filas de datos posteriores a los encabezados." : "No data rows found below headers.");
        return;
      }

      let updatedCount = 0;
      const updatedCurrencies = new Set<string>();
      let currentDate = new Date().toISOString().split('T')[0];

      setCurrencyIndicators((prev) => {
        const nextState = { ...prev };

        dataRows.forEach((row) => {
          // Check for date row separator (e.g. "Monday, Oct 12, 2026" or "2026-10-12" or Excel serial 46300)
          const fullRowText = row.map(c => String(c || '')).join(' ').trim();
          if (fullRowText.length > 0 && row.filter(c => String(c || '').trim() !== '').length <= 2) {
            const rawDateStr = row[0] || row[1] || '';
            const parsedD = formatSpreadsheetDate(rawDateStr);
            if (parsedD) {
              currentDate = parsedD;
              return;
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
            // Find longest text cell in row
            const textCells = row.map(c => String(c || '').trim()).filter(s => s.length > 4 && isNaN(Number(s)) && !s.includes(':'));
            if (textCells.length > 0) rawEvent = textCells[0];
          }

          if (!rawEvent || rawEvent.length < 3) return;

          // Determine target currency from column or infer from event text
          let targetCurr: string | null = null;
          if (currCol !== -1 && row[currCol]) {
            const cleanCcy = String(row[currCol]).trim().toUpperCase().replace(/[^A-Z]/g, '');
            targetCurr = COUNTRY_MAP[cleanCcy] || (nextState[cleanCcy] ? cleanCcy : null);
          }
          if (!targetCurr) {
            targetCurr = inferCurrencyFromText(rawEvent);
          }

          if (!targetCurr || !nextState[targetCurr]) return;

          const indList = [...nextState[targetCurr]];
          const matchedIdx = findIndicatorIndex(targetCurr, rawEvent, indList);

          if (matchedIdx !== -1) {
            const item = { ...indList[matchedIdx] };
            let hasChange = false;

            if (actualCol !== -1 && row[actualCol] !== undefined && row[actualCol] !== '' && row[actualCol] !== '-') {
              const actVal = parseSpreadsheetValue(row[actualCol], item.type);
              if (actVal !== null) {
                item.actual = actVal;
                hasChange = true;
              }
            }
            if (forecastCol !== -1 && row[forecastCol] !== undefined && row[forecastCol] !== '' && row[forecastCol] !== '-') {
              const fcVal = parseSpreadsheetValue(row[forecastCol], item.type);
              if (fcVal !== null) {
                item.forecast = fcVal;
                hasChange = true;
              }
            }
            if (prevCol !== -1 && row[prevCol] !== undefined && row[prevCol] !== '' && row[prevCol] !== '-') {
              const pvVal = parseSpreadsheetValue(row[prevCol], item.type);
              if (pvVal !== null) {
                item.previous = pvVal;
                hasChange = true;
              }
            }

            if (hasChange) {
              // Index & Survey Scale Matching (Westpac, IFO, NFIB, Sentiment)
              const indexTypes = ["PMI", "CONFIDENCE", "INDEX_SMALL", "SURVEY_5", "ANZ_BIZ", "AUD_SERVICES"];
              const isIndexIndicator = indexTypes.includes(item.type) ||
                /\b(index|sentiment|confidence|survey|climate|barometer|westpac|ifo|nfib|cfib|tankan|kof|seco|ivey|cbi|gfk|aig)\b/i.test(item.name);
              if (isIndexIndicator) {
                const fields: Array<'previous' | 'forecast' | 'actual'> = ['previous', 'forecast', 'actual'];
                let rawIndexBaseline: number | null = null;
                for (const f of fields) {
                  if (typeof item[f] === 'number' && Math.abs(item[f] as number) >= 15) {
                    rawIndexBaseline = item[f] as number;
                    break;
                  }
                }
                if (rawIndexBaseline !== null) {
                  for (const f of fields) {
                    const val = item[f];
                    if (typeof val === 'number' && Math.abs(val) > 0 && Math.abs(val) < 1.0) {
                      item[f] = parseFloat((rawIndexBaseline * (1 + val)).toFixed(1));
                    }
                  }
                }
              }

              item.date = (dateCol !== -1 && row[dateCol]) ? formatSpreadsheetDate(row[dateCol]) : currentDate;
              indList[matchedIdx] = item;
              nextState[targetCurr] = indList;
              updatedCount++;
              updatedCurrencies.add(targetCurr);
            }
          }
        });

        return nextState;
      });

      if (updatedCount > 0) {
        alert(
          language === 'es'
            ? `¡Se actualizaron con éxito ${updatedCount} indicador(es) macroeconómico(s) en ${updatedCurrencies.size} divisa(s) (${Array.from(updatedCurrencies).join(', ')})!`
            : `Successfully updated ${updatedCount} macroeconomic indicator(s) across ${updatedCurrencies.size} currency/currencies (${Array.from(updatedCurrencies).join(', ')})!`
        );
      } else {
        alert(
          language === 'es'
            ? "Se procesó el archivo, pero no se encontraron indicadores compatibles con las 8 divisas G10 (USD, EUR, GBP, JPY, AUD, NZD, CAD, CHF). Asegúrese de que el archivo contenga eventos del calendario económico."
            : "Processed file, but no matching indicators were identified for G10 currencies (USD, EUR, GBP, JPY, AUD, NZD, CAD, CHF). Please ensure the export contains economic calendar events."
        );
      }
    };

    // Parse CSV / TSV / TXT
    if (fileName.endsWith('.csv') || fileName.endsWith('.tsv') || fileName.endsWith('.txt')) {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: 'greedy',
        complete: (res) => processMatrix(res.data as any[][]),
        error: (err) => alert((language === 'es' ? "Error al procesar CSV: " : "CSV parse error: ") + err.message)
      });
    }
    // Parse XLSX / XLS
    else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const firstSheet = workbook.Sheets[firstSheetName];
          const rawMatrix: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: "" });
          processMatrix(rawMatrix);
        } catch (err: any) {
          alert((language === 'es' ? "Error al leer hoja de cálculo Excel: " : "Error reading Excel spreadsheet: ") + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert(language === 'es' ? "Formato no compatible. Por favor suba un archivo .xlsx, .xls o .csv." : "Unsupported format. Please upload .xlsx, .xls, or .csv file.");
    }
  };

  const handleCurrencyInvestingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processCurrencySpreadsheet(file);
    e.target.value = '';
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
    const ccy = (ccyOrCountry || '').toUpperCase();

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
    <div className="w-full bg-[#020203] text-zinc-300 font-sans antialiased min-h-screen">
      
      {/* HEADER HERO SECTION */}
      <section className="w-full border-b border-zinc-900 bg-[#07080d] py-10 sm:py-16">
        <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-cyan-400"></span>
            <span className="font-mono text-[10px] sm:text-xs text-cyan-400 font-bold uppercase tracking-widest">
              {language === 'es' ? '// ARQUITECTURA DE TRADING INSTITUCIONAL' : '// INSTITUTIONAL TRADING ARCHITECTURE'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl 2xl:text-6xl font-black text-white tracking-tight uppercase">
            {t.tools.title}
          </h1>
          <p className="text-xs sm:text-sm md:text-base text-zinc-400 max-w-3xl font-light leading-relaxed">
            {t.tools.subtitle}
          </p>
        </div>
      </section>

      {/* SUB-NAVIGATION BAR - STICKY FULL WIDTH (Touch-scrollable on mobile & iPad) */}
      <div className="w-full bg-[#040406] border-b border-zinc-900 py-3 sticky top-16 sm:top-18 z-30 shadow-md">
        <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex items-center gap-2 overflow-x-auto no-scrollbar touch-scroll font-mono text-xs">
          {[
            { id: 'all', label: t.tools.subTabs.all },
            { id: 'calendar-filter', label: t.tools.subTabs.calendarFilter, isPrimary: true },
            { id: 'currency-strength', label: t.tools.subTabs.currencyStrength },
            { id: 'volatility', label: t.tools.subTabs.volatility },
            { id: 'calculator', label: t.tools.subTabs.calculator },
            { id: 'central-banks', label: t.tools.subTabs.centralBanks },
            { id: 'consensus', label: t.tools.subTabs.consensus },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabSwitch(tab.id as ToolSubTab)}
              className={`px-3.5 py-2 uppercase tracking-wider text-[11px] transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 min-h-[36px] ${
                activeTab === tab.id
                  ? 'bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : tab.isPrimary
                  ? 'bg-cyan-950/40 text-cyan-300 border border-cyan-700/70 hover:border-cyan-400 hover:text-white font-semibold'
                  : 'bg-[#0c0c12] text-zinc-400 border border-zinc-800 hover:text-white'
              }`}
            >
              {tab.isPrimary && (
                <span className="w-1.5 h-1.5 bg-cyan-400 animate-ping"></span>
              )}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SUB-VIEW: SUITE HUB OVERVIEW */}
      {activeTab === 'all' && (
        <>
          <SectionDivider label="// DIVISION 01 • CALENDAR FILTERING & SENTIMENT" />

          {/* SECTION 1: MACRO RISK & CALENDAR ENGINES */}
          <section className="w-full py-12 sm:py-20 lg:py-24 border-b border-zinc-800/40 bg-[#121316]">
            <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-6 sm:space-y-8">
              
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-800/40">
                <div>
                  <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider block mb-1">
                    Event Risk & Pipeline
                  </span>
                  <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight">
                    Macro Filter & Sentiment Engines
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 font-sans max-w-md font-light leading-relaxed">
                  Real-time event filtering across G10 markets, country selection, and live currency strength divergence calculations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                
                {/* 1. CALENDAR FILTER TOOL */}
                <div
                  onClick={() => handleTabSwitch('calendar-filter')}
                  className="group macro-card border-2 border-cyan-500/60 hover:border-cyan-400 p-6 sm:p-8 cursor-pointer flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-4 font-mono relative z-10">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-cyan-400 font-bold uppercase tracking-widest">// CALENDAR_FILTER_V2</span>
                      <span className="bg-cyan-950 text-cyan-300 border border-cyan-700/80 px-2.5 py-0.5 font-bold uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-cyan-400 animate-ping"></span>
                        PRIMARY ENGINE
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-wide">
                      Kairos Macro Hub (Motor Unificado)
                    </h3>

                    <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed font-light">
                      Motor de análisis macro, calendario inteligente y escáner de divergencias. Incluye importación Excel (.xlsx) de Investing.com, reglas Core para G10, escáner de divergencias en pares aprobados, puntuación intermercado y reportes imprimibles.
                    </p>
                  </div>

                  <div className="mt-6 sm:mt-8 pt-4 border-t border-zinc-800 flex justify-between items-center font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider relative z-10">
                    <span>Abrir Motor de Riesgo y Divergencias</span>
                    <span className="group-hover:translate-x-2 transition-transform text-base">&rarr;</span>
                  </div>
                </div>

                {/* 2. CURRENCY STRENGTH ENGINE */}
                <div
                  onClick={() => handleTabSwitch('currency-strength')}
                  className="group macro-card p-6 sm:p-8 cursor-pointer flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-4 font-mono">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400 uppercase tracking-widest">// VALUATION_INDEX_V2</span>
                      <span className="bg-zinc-900 text-cyan-400 border border-cyan-900/50 px-2.5 py-0.5 font-bold uppercase">
                        28 CROSS PAIRS
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-wide">
                      Currency Strength & Valuation Engine
                    </h3>

                    <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed font-light">
                      Fundamental valuation dashboard tracking economic indicators across 8 major currencies. Computes directional bias ratios, divergence rankings, and editable actual/forecast values.
                    </p>
                  </div>

                  <div className="mt-6 sm:mt-8 pt-4 border-t border-zinc-800 flex justify-between items-center font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider">
                    <span>Open Valuation Console</span>
                    <span className="group-hover:translate-x-2 transition-transform text-base">&rarr;</span>
                  </div>
                </div>

              </div>

            </div>
          </section>

          <SectionDivider label="// DIVISION 02 • VOLATILITY & RISK SIZING" />

          {/* SECTION 2: VOLATILITY & SIZING EXECUTION */}
          <section className="w-full py-12 sm:py-20 lg:py-24 border-b border-zinc-800/40 bg-[#040406]">
            <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-6 sm:space-y-8">
              
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-800/40">
                <div>
                  <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider block mb-1">
                    Risk Management
                  </span>
                  <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight">
                    Volatility & Position Sizing
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 font-sans max-w-md font-light">
                  Statistical range realizations and mathematical invalidation positioning for capital preservation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                
                {/* Volatility Index */}
                <div
                  onClick={() => handleTabSwitch('volatility')}
                  className="group macro-card p-6 sm:p-8 cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3 font-mono">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400 uppercase">// MATRIX_V3</span>
                      <span className="text-cyan-400 font-bold uppercase">70-DAY CYCLE</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-400 transition-colors uppercase">
                      Volatility Index
                    </h3>
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed font-light">
                      Realized variance matrix calculating average daily pip ranges, 100k cash equivalencies, and % realized ranges for 28 currency pairs.
                    </p>
                  </div>
                  <div className="mt-6 sm:mt-8 pt-3 border-t border-zinc-800/80 flex justify-between font-mono text-xs text-cyan-500 font-bold uppercase">
                    <span>Open Volatility Grid</span>
                    <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                  </div>
                </div>

                {/* Risk Calculator */}
                <div
                  onClick={() => handleTabSwitch('calculator')}
                  className="group macro-card p-6 sm:p-8 cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3 font-mono">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400 uppercase">// RISK_MODEL_V1</span>
                      <span className="text-emerald-400 font-bold uppercase">PARITY SIZING</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors uppercase">
                      Risk & Position Size Calculator
                    </h3>
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed font-light">
                      Calculate standard lot sizes and pip cash values based on invalidation points, account equity, and dynamic cross-rate parities.
                    </p>
                  </div>
                  <div className="mt-6 sm:mt-8 pt-3 border-t border-zinc-800/80 flex justify-between font-mono text-xs text-emerald-400 font-bold uppercase">
                    <span>Launch Calculator</span>
                    <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                  </div>
                </div>

              </div>

            </div>
          </section>

          <SectionDivider label="// DIVISION 03 • POLICY & CONSENSUS RADAR" />

          {/* SECTION 3: CENTRAL BANK & CONSENSUS INTELLIGENCE */}
          <section className="w-full py-12 sm:py-20 lg:py-24 border-b border-zinc-800/40 bg-[#121316]">
            <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-6 sm:space-y-8">
              
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-800/40">
                <div>
                  <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider block mb-1">
                    Central Banks & Data
                  </span>
                  <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight">
                    Policy Expectations & Consensus
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-zinc-400 font-sans max-w-md font-light">
                  Implied forward rates, policy classification, and economic surprise indicators.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                
                {/* Central Bank Terminal */}
                <div
                  onClick={() => handleTabSwitch('central-banks')}
                  className="group macro-card p-6 sm:p-8 cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3 font-mono">
                    <span className="text-cyan-400 text-[10px] font-bold uppercase">// POLICY_RADAR_V2</span>
                    <h3 className="text-base font-bold text-white uppercase tracking-wide">
                      Central Bank Rate Terminal
                    </h3>
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed font-light">
                      Monetary policy rate expectations, automated Hawkish/Dovish classifications, and decision countdown timers.
                    </p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-zinc-800/80 flex justify-between font-mono text-xs text-cyan-500 font-bold uppercase">
                    <span>Open Bank Terminal</span>
                    <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                  </div>
                </div>

                {/* Consensus Engine */}
                <div
                  onClick={() => handleTabSwitch('consensus')}
                  className="group macro-card p-6 sm:p-8 cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3 font-mono">
                    <span className="text-cyan-400 text-[10px] font-bold uppercase">// EXPECTATIONS_V1</span>
                    <h3 className="text-base font-bold text-white uppercase tracking-wide">
                      Consensus Filter Hub
                    </h3>
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed font-light">
                      Macroeconomic expectation ranges, actual result deviations, and Beat/Miss surprise tracking.
                    </p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-zinc-800/80 flex justify-between font-mono text-xs text-cyan-500 font-bold uppercase">
                    <span>Open Consensus Hub</span>
                    <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                  </div>
                </div>

              </div>

            </div>
          </section>
        </>
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
          
          {/* Section 1: Valuation Scorecards & Ranking */}
          <section className="w-full py-10 sm:py-16 border-b border-zinc-900 bg-[#020203]">
            <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-6 font-mono">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-900">
                <div>
                  <span className="text-cyan-500 text-[10px] font-bold uppercase tracking-widest block">
                    // AGGREGATE G10 SCOREBOARD
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
                    Currency Strength Matrix
                  </h2>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <button
                    onClick={handleExportData}
                    className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-800/60 transition cursor-pointer font-bold min-h-[36px] flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Backup
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider bg-[#0c0c12] hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition cursor-pointer min-h-[36px] flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Import Backup
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json,application/json"
                    onChange={handleImportData}
                    className="hidden"
                  />
                  <button
                    onClick={() => currencyInvestingFileRef.current?.click()}
                    className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/60 transition cursor-pointer font-bold min-h-[36px] flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Import Investing.com Export
                  </button>
                  <input
                    type="file"
                    ref={currencyInvestingFileRef}
                    accept=".csv,.xlsx,.xls"
                    onChange={handleCurrencyInvestingUpload}
                    className="hidden"
                  />
                  <button
                    onClick={handleResetData}
                    className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider bg-[#0c0c12] hover:bg-zinc-800 text-rose-400 border border-zinc-800 transition cursor-pointer min-h-[36px] flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Defaults
                  </button>
                </div>
              </div>

              {/* Dedicated Valuation Spreadsheet Drop Zone */}
              <div
                onClick={() => currencyInvestingFileRef.current?.click()}
                onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsValuationDragOver(true); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsValuationDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsValuationDragOver(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsValuationDragOver(false);
                  const file = e.dataTransfer?.files?.[0];
                  if (file) processCurrencySpreadsheet(file);
                }}
                className={`border border-dashed rounded-xl p-5 sm:p-6 text-center transition-all cursor-pointer group select-none ${
                  isValuationDragOver
                    ? 'bg-cyan-950/70 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)] scale-[1.008]'
                    : 'bg-[#07080e] border-zinc-800 hover:border-cyan-500/60 hover:bg-[#0b0c14]'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
                  <div className="flex items-center gap-3.5 text-left">
                    <div className="w-10 h-10 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-xs sm:text-sm font-bold uppercase tracking-wider">
                          {language === 'es' ? 'Cargar Tabla de Indicadores Excel / CSV' : 'Load Indicators Excel / CSV Table'}
                        </span>
                        <span className="px-1.5 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 text-[9px] font-bold uppercase">
                          Auto-Detect
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                        {language === 'es'
                          ? 'Arrastre o haga clic para subir archivo de Investing.com (.xlsx, .xls, .csv). Se recalculará la matriz de valoración.'
                          : 'Drag & drop or click to upload Investing.com export (.xlsx, .xls, .csv). Valuation matrix will recalibrate automatically.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-700/80 text-[10px] text-zinc-300 font-mono font-bold uppercase">
                      .XLSX
                    </span>
                    <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-700/80 text-[10px] text-zinc-300 font-mono font-bold uppercase">
                      .XLS
                    </span>
                    <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-700/80 text-[10px] text-zinc-300 font-mono font-bold uppercase">
                      .CSV
                    </span>
                  </div>
                </div>
              </div>

              {/* 8 Currency Scorecards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 2xl:grid-cols-8 gap-2.5 sm:gap-3.5">
                {Object.keys(currencyTotals).map((curr) => {
                  const score = currencyTotals[curr];
                  const isSelected = currencyActiveTab === curr;
                  return (
                    <div
                      key={curr}
                      onClick={() => setCurrencyActiveTab(curr)}
                      className={`p-3 sm:p-3.5 border text-center transition-all cursor-pointer group flex flex-col justify-between min-h-[100px] ${
                        isSelected
                          ? 'bg-cyan-950/50 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                          : 'macro-panel text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">{curr}</div>
                        <div className={`text-xl sm:text-2xl font-black mt-0.5 sm:mt-1 ${
                          score > 0 ? 'text-cyan-400' : score < 0 ? 'text-rose-400' : 'text-zinc-500'
                        }`}>
                          {score > 0 ? `+${score}` : score}
                        </div>
                      </div>

                      {/* Mini Bipolar Currency Strength Chart Meter */}
                      <div className="mt-2 w-full h-1.5 bg-zinc-950 flex border border-zinc-800 relative">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-700 z-10 -ml-px" />
                        <div className="w-1/2 flex justify-end">
                          {score < 0 && (
                            <div
                              className="bg-rose-500 h-full shadow-[0_0_6px_rgba(244,63,94,0.7)]"
                              style={{ width: `${Math.min(100, (Math.abs(score) / 10) * 100)}%` }}
                            />
                          )}
                        </div>
                        <div className="w-1/2 flex justify-start">
                          {score > 0 && (
                            <div
                              className="bg-cyan-400 h-full shadow-[0_0_6px_rgba(34,211,238,0.7)]"
                              style={{ width: `${Math.min(100, (score / 10) * 100)}%` }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CURRENCY VALUATION RANKING MATRIX BAR CHART */}
              <div className="pt-2">
                <ValuationRankingChart
                  totals={currencyTotals}
                  selectedCurrency={currencyActiveTab === 'dashboard' ? 'USD' : currencyActiveTab}
                  onSelectCurrency={(curr) => setCurrencyActiveTab(curr)}
                />
              </div>

            </div>
          </section>

          {/* Section 2: 28 Cross-Pair Directional Bias Engine */}
          <section className="w-full py-10 sm:py-16 border-b border-zinc-800/40 bg-[#121316]">
            <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-6 font-mono">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-800/60">
                <div>
                  <span className="text-cyan-400 text-xs font-bold uppercase tracking-wider block">
                    Spread Differentials
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
                    Directional Bias Engine (28 Pairs)
                  </h2>
                </div>

                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <div className="flex items-center gap-1 bg-[#181920] border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400 min-h-[36px]">
                    <span>Sort:</span>
                    <select
                      value={currencySort}
                      onChange={(e) => setCurrencySort(e.target.value as any)}
                      className="bg-transparent text-zinc-200 font-bold outline-none cursor-pointer"
                    >
                      <option value="divergence" className="bg-[#181920]">Max Divergence (|Diff|)</option>
                      <option value="bullish" className="bg-[#181920]">Most Bullish (+Diff)</option>
                      <option value="bearish" className="bg-[#181920]">Most Bearish (-Diff)</option>
                      <option value="default" className="bg-[#181920]">Default Pair Order</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1 bg-[#181920] border border-zinc-800 px-2.5 py-1 text-xs text-zinc-400 min-h-[36px]">
                    <span>Filter:</span>
                    <select
                      value={currencyFilter}
                      onChange={(e) => setCurrencyFilter(e.target.value as any)}
                      className="bg-transparent text-zinc-200 font-bold outline-none cursor-pointer"
                    >
                      <option value="all" className="bg-[#181920]">All Pairs (28)</option>
                      <option value="strong" className="bg-[#181920]">Strong Div (≥ 8)</option>
                      <option value="bullish" className="bg-[#181920]">Bullish Only</option>
                      <option value="bearish" className="bg-[#181920]">Bearish Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 28 Pairs Grid */}
              <div className="grid grid-cols-1 gap-3 max-w-3xl 2xl:max-w-4xl mx-auto">
                {filteredPairs.map((p) => (
                  <div key={p.pair} className="macro-card p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm tracking-wide">{p.pair}</span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 border uppercase tracking-wider ${p.badgeBg}`}>
                          {p.biasText}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-400 uppercase">
                        Spread: <span className="font-bold text-white">{p.diff > 0 ? `+${p.diff}` : p.diff}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-rose-400 font-bold w-7 text-right tabular-nums">{p.shortPct}%</span>
                      <div className="flex-1 h-2 bg-zinc-900 flex border border-zinc-700/60">
                        <div className="bg-rose-500 h-full" style={{ width: `${p.shortPct}%` }} />
                        <div className="bg-cyan-500 h-full" style={{ width: `${p.longPct}%` }} />
                      </div>
                      <span className="text-cyan-400 font-bold w-7 tabular-nums">{p.longPct}%</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </section>

          {/* Section 3: Detailed Indicator Inputs & Breakdown Table */}
          <section className="w-full py-10 sm:py-16 border-b border-zinc-900 bg-[#020203]">
            <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-6 font-mono">
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-900">
                <div className="space-y-1">
                  <span className="text-cyan-500 text-[10px] font-bold uppercase tracking-widest block">
                    // MACROECONOMIC METRICS BREAKDOWN
                  </span>
                  <h2 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
                    {currencyActiveTab === 'dashboard' ? 'USD' : currencyActiveTab} Indicators (Editable Live)
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-scroll text-xs py-1">
                  {['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setCurrencyActiveTab(c)}
                      className={`px-3 py-1.5 uppercase tracking-wider text-[10px] sm:text-xs transition cursor-pointer min-h-[36px] flex items-center justify-center ${
                        (currencyActiveTab === c || (currencyActiveTab === 'dashboard' && c === 'USD'))
                          ? 'bg-cyan-500 text-black font-bold'
                          : 'bg-[#0c0c12] text-zinc-400 border border-zinc-800 hover:text-white'
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
              <div className="macro-panel overflow-x-auto touch-scroll">
                <table className="w-full text-left font-mono text-xs min-w-[700px]">
                  <thead>
                    <tr className="text-zinc-500 text-[10px] border-b border-zinc-900 uppercase tracking-wider bg-[#07080d]">
                      <th className="p-3.5 pl-6">Indicator Name</th>
                      <th className="p-3.5 w-36">Release Date</th>
                      <th className="p-3.5 w-28">Previous</th>
                      <th className="p-3.5 w-28">Forecast</th>
                      <th className="p-3.5 w-28">Actual</th>
                      <th className="p-3.5 text-right">Net Change</th>
                      <th className="p-3.5 text-center">Score</th>
                      <th className="p-3.5 text-right pr-6">Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900/60">
                    {(currencyIndicators[currencyActiveTab === 'dashboard' ? 'USD' : currencyActiveTab] || []).map((ind, idx) => {
                      const evaluated = evaluateIndicator(ind);
                      const isPercentType = ["CPI", "UNEMP_RATE", "PCT_GROWTH", "EUR_UNEMP_FIXED", "CARD_TRANS"].includes(ind.type);
                      const formatDisplay = (val: number | null) => (val === null ? '' : isPercentType ? (val * 100).toFixed(2) + '%' : val);
                      const curr = currencyActiveTab === 'dashboard' ? 'USD' : currencyActiveTab;

                      return (
                        <tr key={ind.name} className="hover:bg-[#08080f] transition-colors">
                          <td className="p-3.5 pl-6 font-bold text-white">{ind.name}</td>
                          <td className="p-3.5">
                            <input
                              type="date"
                              value={ind.date || ''}
                              onChange={(e) => updateIndicatorValue(curr, idx, 'date', e.target.value)}
                              className="w-full bg-[#0c0c12] border border-zinc-800 text-zinc-300 text-xs px-2 py-1 outline-none focus:border-cyan-500 font-mono min-h-[34px]"
                            />
                          </td>
                          <td className="p-3.5">
                            <input
                              type="text"
                              value={formatDisplay(ind.previous)}
                              onChange={(e) => updateIndicatorValue(curr, idx, 'previous', e.target.value)}
                              className="w-full bg-[#0c0c12] border border-zinc-800 text-zinc-300 text-xs px-2 py-1 outline-none focus:border-cyan-500 font-mono min-h-[34px]"
                            />
                          </td>
                          <td className="p-3.5">
                            <input
                              type="text"
                              value={formatDisplay(ind.forecast)}
                              onChange={(e) => updateIndicatorValue(curr, idx, 'forecast', e.target.value)}
                              className="w-full bg-[#0c0c12] border border-zinc-800 text-zinc-300 text-xs px-2 py-1 outline-none focus:border-cyan-500 font-mono min-h-[34px]"
                            />
                          </td>
                          <td className="p-3.5">
                            <input
                              type="text"
                              value={formatDisplay(ind.actual)}
                              onChange={(e) => updateIndicatorValue(curr, idx, 'actual', e.target.value)}
                              className="w-full bg-[#0c0c12] border border-zinc-800 text-zinc-300 text-xs px-2 py-1 outline-none focus:border-cyan-500 font-mono min-h-[34px]"
                            />
                          </td>
                          <td className="p-3.5 text-right tabular-nums text-zinc-300">
                            {evaluated.netChange > 0 ? `+${evaluated.netChange}` : evaluated.netChange}
                          </td>
                          <td className="p-3.5 text-center font-bold">
                            <span className={evaluated.score > 0 ? 'text-cyan-400' : evaluated.score < 0 ? 'text-rose-400' : 'text-zinc-500'}>
                              {evaluated.score > 0 ? `+${evaluated.score}` : evaluated.score}
                            </span>
                          </td>
                          <td className="p-3.5 text-right pr-6 text-zinc-500">{ind.weight}</td>
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

      {/* SUB-VIEW: VOLATILITY MATRIX */}
      {activeTab === 'volatility' && (
        <section className="w-full py-10 sm:py-16 border-b border-zinc-900 bg-[#020203]">
          <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-6 font-mono">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-900">
              <div>
                <span className="text-cyan-500 text-[10px] font-bold uppercase tracking-widest block">
                  // REALIZED VARIANCE TABLE
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
                  Currency Pair Daily Average Volatility
                </h2>
              </div>
              <input
                type="text"
                value={volatilitySearch}
                onChange={(e) => setVolatilitySearch(e.target.value)}
                placeholder="Filter by pair (e.g. JPY, EUR)..."
                className="w-full sm:w-64 bg-[#0c0c12] border border-zinc-800 text-white text-xs px-3 py-2 outline-none focus:border-cyan-500 font-mono min-h-[38px]"
              />
            </div>

            <div className="macro-panel overflow-x-auto touch-scroll">
              <table className="w-full text-left font-mono text-xs min-w-[620px]">
                <thead>
                  <tr className="text-zinc-500 text-[10px] border-b border-zinc-900 uppercase tracking-wider bg-[#07080d]">
                    <th onClick={() => toggleVolSort('symbol')} className="p-3.5 pl-4 cursor-pointer hover:text-cyan-400">
                      Pair Symbol {volatilitySort === 'symbol' && (volatilitySortAsc ? '▲' : '▼')}
                    </th>
                    <th onClick={() => toggleVolSort('pips')} className="p-3.5 text-right cursor-pointer hover:text-cyan-400">
                      Avg Daily Pips {volatilitySort === 'pips' && (volatilitySortAsc ? '▲' : '▼')}
                    </th>
                    <th onClick={() => toggleVolSort('cash')} className="p-3.5 text-right cursor-pointer hover:text-cyan-400">
                      $ Cash Value (100k) {volatilitySort === 'cash' && (volatilitySortAsc ? '▲' : '▼')}
                    </th>
                    <th onClick={() => toggleVolSort('range')} className="p-3.5 text-right pr-4 cursor-pointer hover:text-cyan-400">
                      % Realized Range {volatilitySort === 'range' && (volatilitySortAsc ? '▲' : '▼')}
                    </th>
                    <th className="p-3.5 text-center">Tier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60">
                  {sortedVolatility.map((p) => (
                    <tr key={p.symbol} className="hover:bg-[#08080f] transition-colors">
                      <td className="p-3.5 pl-4 font-bold text-zinc-100">{p.symbol}</td>
                      <td className="p-3.5 text-right tabular-nums text-zinc-300 font-semibold">{p.avgPips.toFixed(1)}</td>
                      <td className="p-3.5 text-right tabular-nums text-zinc-400">${p.cashValue100k.toFixed(2)}</td>
                      <td className="p-3.5 text-right pr-4 tabular-nums text-cyan-400 font-bold">{p.rangePct.toFixed(2)}%</td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                          p.tier === 'High'
                            ? 'bg-rose-950/40 text-rose-300 border-rose-900/50'
                            : p.tier === 'Medium'
                            ? 'bg-cyan-950/40 text-cyan-300 border-cyan-900/50'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                        }`}>
                          {p.tier}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* SUB-VIEW: RISK CALCULATOR */}
      {activeTab === 'calculator' && (
        <section className="w-full py-10 sm:py-16 border-b border-zinc-900 bg-[#020203]">
          <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-6 font-mono">
            <div className="pb-4 border-b border-zinc-900">
              <span className="text-cyan-500 text-[10px] font-bold uppercase tracking-widest block">
                // MATHEMATICAL SIZING ENGINE
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
                Risk & Position Size Calculator
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="macro-panel p-5 sm:p-6 space-y-4">
                <span className="text-zinc-500 text-[10px] uppercase tracking-widest block pb-2 border-b border-zinc-900">
                  // INPUT PARAMETERS
                </span>

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 uppercase">Account Base Currency</label>
                  <select
                    value={calcAcctCurr}
                    onChange={(e) => setCalcAcctCurr(e.target.value)}
                    className="w-full bg-[#0c0c12] border border-zinc-800 text-white text-xs p-3 outline-none focus:border-cyan-500 min-h-[44px]"
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
                  <label className="text-xs text-zinc-400 uppercase">Currency Pair</label>
                  <select
                    value={calcPair}
                    onChange={(e) => setCalcPair(e.target.value)}
                    className="w-full bg-[#0c0c12] border border-zinc-800 text-white text-xs p-3 outline-none focus:border-cyan-500 min-h-[44px]"
                  >
                    {PAIRS_LIST.map((p) => (
                      <option key={p} value={p}>{p.substring(0, 3)}/{p.substring(3, 6)}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 uppercase">Account Balance ({calcAcctCurr})</label>
                  <input
                    type="number"
                    value={calcBalance}
                    onChange={(e) => setCalcBalance(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0c0c12] border border-zinc-800 text-white text-xs p-3 outline-none focus:border-cyan-500 tabular-nums min-h-[44px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 uppercase">Risk Allocation (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={calcRiskPct}
                    onChange={(e) => setCalcRiskPct(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0c0c12] border border-zinc-800 text-white text-xs p-3 outline-none focus:border-cyan-500 tabular-nums min-h-[44px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 uppercase">Stop Loss Distance (Pips)</label>
                  <input
                    type="number"
                    value={calcStopPips}
                    onChange={(e) => setCalcStopPips(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#0c0c12] border border-zinc-800 text-white text-xs p-3 outline-none focus:border-cyan-500 tabular-nums min-h-[44px]"
                  />
                </div>
              </div>

              <div className="macro-panel p-5 sm:p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-6">
                  <span className="text-zinc-500 text-[10px] uppercase tracking-widest block pb-2 border-b border-zinc-800">
                    // SIZING ALLOCATION OUTPUT
                  </span>

                  <div className="space-y-4 divide-y divide-zinc-800/80 text-xs">
                    <div className="pt-1 flex justify-between items-center">
                      <span className="text-zinc-400 uppercase">Absolute Cash Risk:</span>
                      <span className="text-lg sm:text-xl font-bold text-rose-400 tabular-nums">
                        ${riskResult.cashRisk.toFixed(2)} {calcAcctCurr}
                      </span>
                    </div>

                    <div className="pt-3 flex justify-between items-center">
                      <span className="text-zinc-400 uppercase">Recommended Position Size:</span>
                      <span className="text-xl sm:text-2xl font-black text-cyan-400 tabular-nums">
                        {riskResult.standardLots} <span className="text-xs font-normal text-zinc-500">Lots</span>
                      </span>
                    </div>

                    <div className="pt-3 flex justify-between items-center">
                      <span className="text-zinc-400 uppercase">Running Pip Value:</span>
                      <span className="text-xs sm:text-sm font-semibold text-zinc-200 tabular-nums">
                        ${riskResult.pipValue.toFixed(2)} {calcAcctCurr} / pip
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-[#040406] border border-zinc-800 text-[10px] text-zinc-500 leading-relaxed font-sans font-light">
                  Standard contract assumes 100,000 units. Conversions dynamically reflect G10 currency parities.
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SUB-VIEW: CENTRAL BANK TERMINAL */}
      {activeTab === 'central-banks' && (() => {
        const toggleBankSort = (col: typeof bankSortColumn) => {
          if (bankSortColumn === col) {
            setBankSortAsc(!bankSortAsc);
          } else {
            setBankSortColumn(col);
            setBankSortAsc(true);
          }
        };

        const renderSortIcon = (col: typeof bankSortColumn) => {
          if (bankSortColumn !== col) return <ArrowUpDown className="w-3 h-3 inline ml-1 text-zinc-600" />;
          return bankSortAsc ? <ArrowUp className="w-3 h-3 inline ml-1 text-cyan-400" /> : <ArrowDown className="w-3 h-3 inline ml-1 text-cyan-400" />;
        };

        const currentBank = selectedBankKey !== 'Overview' ? ratesData[selectedBankKey] : null;

        return (
          <section className="w-full py-10 sm:py-16 border-b border-zinc-900 bg-[#020203]">
            <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-6 font-mono">
              
              {/* Central Bank Hero Action Controls */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-zinc-900">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-500 text-[10px] font-bold uppercase tracking-widest block">
                      // POLICY RADAR_V2
                    </span>
                    <span className="text-zinc-700">|</span>
                    <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                      G10 TERMINAL
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
                    G10 Central Bank Terminal
                  </h2>
                  <p className="text-xs text-zinc-400 font-sans max-w-xl font-light">
                    Real-time monetary policy expectations, automated tone classification, decision countdowns, and implied trajectory curves.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 flex-wrap w-full lg:w-auto">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <button
                      onClick={handleExportBankBackup}
                      className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-800/60 transition cursor-pointer font-bold min-h-[36px] flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export Backup
                    </button>
                    <button
                      onClick={() => bankJsonFileRef.current?.click()}
                      className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider bg-[#0c0c12] hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition cursor-pointer min-h-[36px] flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Import Backup
                    </button>
                    <input
                      type="file"
                      ref={bankJsonFileRef}
                      accept=".json,application/json"
                      onChange={handleImportBankBackup}
                      className="hidden"
                    />

                    <button
                      onClick={() => bankInvestingFileRef.current?.click()}
                      className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/60 transition cursor-pointer font-bold min-h-[36px] flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Import Investing.com Export
                    </button>
                    <input
                      type="file"
                      ref={bankInvestingFileRef}
                      accept=".csv,.xlsx,.xls"
                      onChange={handleBankInvestingUpload}
                      className="hidden"
                    />

                    <button
                      onClick={handleResetBankDefaults}
                      className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider bg-[#0c0c12] hover:bg-zinc-800 text-rose-400 border border-zinc-800 transition cursor-pointer min-h-[36px] flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Defaults
                    </button>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-xs text-zinc-500 uppercase">View:</span>
                    <select
                      value={selectedBankKey}
                      onChange={(e) => setSelectedBankKey(e.target.value)}
                      className="w-full sm:w-auto bg-[#0c0c12] border border-zinc-800 text-white text-xs px-3 py-2 outline-none focus:border-cyan-500 font-mono min-h-[38px] cursor-pointer"
                    >
                      <option value="Overview">Overview (All Banks)</option>
                      {Object.values(ratesData).map((b) => (
                        <option key={b.code} value={b.code}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* VIEW 1: OVERVIEW MATRIX TABLE */}
              {selectedBankKey === 'Overview' && (
                <div className="macro-panel p-5 sm:p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-cyan-400" />
                        G10 Policy Rate Expectations Matrix
                      </h3>
                      <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                        Click any central bank row for detailed trajectory curve and scenario simulator.
                      </p>
                    </div>
                    <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold bg-cyan-950/40 px-2.5 py-1 border border-cyan-800/50 self-start sm:self-auto">
                      Active Radar • 8 Central Banks
                    </span>
                  </div>

                  <div className="overflow-x-auto touch-scroll">
                    <table className="w-full text-left font-mono text-xs min-w-[760px]">
                      <thead>
                        <tr className="text-zinc-500 text-[10px] border-b border-zinc-900 uppercase tracking-wider bg-[#07080d]">
                          <th onClick={() => toggleBankSort('nextMeeting')} className="p-3.5 pl-4 cursor-pointer hover:text-cyan-400 select-none">
                            Next Decision {renderSortIcon('nextMeeting')}
                          </th>
                          <th onClick={() => toggleBankSort('name')} className="p-3.5 cursor-pointer hover:text-cyan-400 select-none">
                            Central Bank {renderSortIcon('name')}
                          </th>
                          <th onClick={() => toggleBankSort('rate')} className="p-3.5 text-center cursor-pointer hover:text-cyan-400 select-none">
                            Benchmark Rate {renderSortIcon('rate')}
                          </th>
                          <th onClick={() => toggleBankSort('implied')} className="p-3.5 text-center cursor-pointer hover:text-cyan-400 select-none">
                            Implied Forward {renderSortIcon('implied')}
                          </th>
                          <th onClick={() => toggleBankSort('deltaBps')} className="p-3.5 text-center cursor-pointer hover:text-cyan-400 select-none">
                            Delta (bps) {renderSortIcon('deltaBps')}
                          </th>
                          <th onClick={() => toggleBankSort('prob')} className="p-3.5 text-center cursor-pointer hover:text-cyan-400 select-none">
                            Move Probability {renderSortIcon('prob')}
                          </th>
                          <th onClick={() => toggleBankSort('tone')} className="p-3.5 text-center cursor-pointer hover:text-cyan-400 select-none">
                            Evaluated Policy Tone {renderSortIcon('tone')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/60">
                        {Object.values(ratesData).map(b => {
                          const deltaBps = Number(((b.implied - b.rate) * 100).toFixed(1));
                          const step = b.step || 0.25;
                          const prob = Math.min(100, Math.round(Math.abs(deltaBps) / (step * 100) * 100));
                          const outcome = deltaBps > (step * 50) ? "HIKE" : (deltaBps < -(step * 50) ? "CUT" : "HOLD");
                          const tone = classifyPolicyTone(deltaBps, outcome);
                          const countdown = getBankCountdown(b.nextMeeting);
                          return { ...b, deltaBps, prob, outcome, tone, countdown };
                        }).sort((a, b) => {
                          let valA: any, valB: any;
                          if (bankSortColumn === 'name') { valA = a.name; valB = b.name; }
                          else if (bankSortColumn === 'rate') { valA = a.rate; valB = b.rate; }
                          else if (bankSortColumn === 'implied') { valA = a.implied; valB = b.implied; }
                          else if (bankSortColumn === 'deltaBps') { valA = a.deltaBps; valB = b.deltaBps; }
                          else if (bankSortColumn === 'prob') { valA = a.prob; valB = b.prob; }
                          else if (bankSortColumn === 'tone') { valA = a.tone.weight; valB = b.tone.weight; }
                          else { valA = new Date(a.nextMeeting).getTime(); valB = new Date(b.nextMeeting).getTime(); }
                          if (valA < valB) return bankSortAsc ? -1 : 1;
                          if (valA > valB) return bankSortAsc ? 1 : -1;
                          return 0;
                        }).map((b) => {
                          const deltaColor = b.deltaBps > 0 ? 'text-emerald-400 font-bold' : (b.deltaBps < 0 ? 'text-rose-400 font-bold' : 'text-zinc-400');
                          const probBarColor = b.outcome === 'HIKE' ? 'bg-emerald-500' : (b.outcome === 'CUT' ? 'bg-rose-500' : 'bg-cyan-500');

                          return (
                            <tr
                              key={b.code}
                              onClick={() => setSelectedBankKey(b.code)}
                              className="hover:bg-[#0c0c16] transition-colors cursor-pointer group"
                            >
                              <td className="p-3.5 pl-4 text-zinc-300 font-bold">
                                <div className="flex items-center gap-2">
                                  <span>{b.nextMeeting.split('T')[0]}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider ${b.countdown.badgeClass}`}>
                                    {b.countdown.text}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3.5 font-bold text-white group-hover:text-cyan-400 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full ${b.deltaBps > 5 ? 'bg-emerald-500' : (b.deltaBps < -5 ? 'bg-rose-500' : 'bg-zinc-600')}`}></span>
                                  <span>{b.name}</span>
                                </div>
                              </td>
                              <td className="p-3.5 text-center text-zinc-200 tabular-nums">{b.rate.toFixed(2)}%</td>
                              <td className="p-3.5 text-center text-cyan-400 font-bold tabular-nums">{b.implied.toFixed(2)}%</td>
                              <td className={`p-3.5 text-center tabular-nums ${deltaColor}`}>
                                {b.deltaBps > 0 ? '+' : ''}{b.deltaBps.toFixed(1)}
                              </td>
                              <td className="p-3.5 text-center tabular-nums">
                                <div className="flex flex-col items-center gap-1 w-24 mx-auto">
                                  <span className="font-bold text-zinc-200">{b.prob}% <span className="text-[9px] text-zinc-500">{b.outcome}</span></span>
                                  <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <div className={`h-full ${probBarColor}`} style={{ width: `${b.prob}%` }}></div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3.5 text-center">
                                <span className={`px-2.5 py-1 text-[10px] font-bold border tracking-wide inline-block ${b.tone.class}`}>
                                  {b.tone.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW 2: BANK DRILLDOWN VIEW */}
              {selectedBankKey !== 'Overview' && currentBank && (() => {
                const b = currentBank;
                const deltaBps = Number(((b.implied - b.rate) * 100).toFixed(1));
                const step = b.step || 0.25;
                const prob = Math.min(100, Math.round(Math.abs(deltaBps) / (step * 100) * 100));
                const outcome = deltaBps > (step * 50) ? "HIKE" : (deltaBps < -(step * 50) ? "CUT" : "HOLD");
                const tone = classifyPolicyTone(deltaBps, outcome);
                const detailedCountdown = getBankDetailedCountdown(b.nextMeeting);
                const xLabels = ['Current Rate', 'Decision (M1)', 'Meeting +2', 'Meeting +3', 'Meeting +4'];

                // Trajectory chart math
                const yVals = b.trajectory && b.trajectory.length === 5 ? b.trajectory : calculateBankTrajectory(b.rate, b.implied, b.step);
                const minY = Math.min(...yVals) - 0.25;
                const maxY = Math.max(...yVals) + 0.25;
                const rangeY = maxY - minY || 1;
                const chartHeight = 180;
                const chartWidth = 560;
                const paddingX = 50;
                const paddingY = 30;
                const stepX = (chartWidth - paddingX * 2) / (yVals.length - 1);

                const points = yVals.map((val, idx) => {
                  const x = paddingX + idx * stepX;
                  const y = chartHeight - paddingY - ((val - minY) / rangeY) * (chartHeight - paddingY * 2);
                  return { x, y, val };
                });

                const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
                const areaPoints = `${points[0].x},${chartHeight - paddingY} ${polylinePoints} ${points[points.length - 1].x},${chartHeight - paddingY}`;

                return (
                  <div className="space-y-6">
                    {/* Header back button */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setSelectedBankKey('Overview')}
                        className="px-3.5 py-1.5 bg-[#0c0c12] hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs uppercase tracking-wider flex items-center gap-2 transition cursor-pointer font-bold"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        &larr; Return to Overview Matrix
                      </button>
                      <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider">
                        {b.name}
                      </span>
                    </div>

                    {/* 4 Primary Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Metric 1: Next Meeting */}
                      <div className="macro-panel p-5 space-y-2 border-l-2 border-l-cyan-500">
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest">
                          <span>Next Meeting Decision</span>
                          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                        <div className="text-xl font-bold text-white tracking-tight">
                          {b.nextMeeting.split('T')[0]}
                        </div>
                        <div className="text-xs text-cyan-400 font-bold flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-cyan-400" />
                          <span>{detailedCountdown}</span>
                        </div>
                      </div>

                      {/* Metric 2: Current Benchmark Rate */}
                      <div className="macro-panel p-5 space-y-2 border-l-2 border-l-zinc-600">
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest">
                          <span>Benchmark Rate</span>
                          <Landmark className="w-3.5 h-3.5 text-zinc-400" />
                        </div>
                        <div className="text-2xl font-black text-white tracking-tight">
                          {b.rate.toFixed(2)}%
                        </div>
                        <div className="text-xs text-zinc-400">
                          Policy Step: {b.step.toFixed(2)}%
                        </div>
                      </div>

                      {/* Metric 3: Implied Forward */}
                      <div className="macro-panel p-5 space-y-2 border-l-2 border-l-cyan-400">
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest">
                          <span>Market Implied Forward</span>
                          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                        <div className="text-2xl font-black text-cyan-400 tracking-tight">
                          {b.implied.toFixed(2)}%
                        </div>
                        <div className="text-xs text-zinc-300">
                          Spread: <span className={deltaBps > 0 ? 'text-emerald-400 font-bold' : deltaBps < 0 ? 'text-rose-400 font-bold' : 'text-zinc-400'}>
                            {deltaBps > 0 ? '+' : ''}{deltaBps.toFixed(1)} bps
                          </span> ({prob}% {outcome})
                        </div>
                      </div>

                      {/* Metric 4: Evaluated Policy Tone */}
                      <div className="macro-panel p-5 space-y-2 border-l-2 border-l-emerald-500">
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest">
                          <span>Evaluated Policy Tone</span>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        </div>
                        <div className="pt-1">
                          <span className={`px-2.5 py-1.5 text-xs font-bold border tracking-wide inline-block ${tone.class}`}>
                            {tone.label}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 font-sans">
                          Algorithmically weighted from yield curve & forecast delta
                        </div>
                      </div>
                    </div>

                    {/* Interactive Trajectory Curve & Override Form */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Trajectory Curve Chart Card */}
                      <div className="lg:col-span-2 macro-panel p-5 sm:p-6 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-zinc-900 pb-3">
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-cyan-400" />
                              Implied Rate Path & Forward Trajectory Curve
                            </h4>
                            <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                              5-Meeting forward rate expectation path derived from money market swaps & cash differentials.
                            </p>
                          </div>
                          <span className="text-[10px] text-zinc-400 font-mono bg-zinc-900 px-2 py-0.5 border border-zinc-800 self-start sm:self-auto">
                            Terminal: {yVals[yVals.length - 1].toFixed(2)}%
                          </span>
                        </div>

                        {/* Interactive SVG Chart */}
                        <div className="w-full overflow-x-auto touch-scroll">
                          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-52 select-none min-w-[500px]">
                            <defs>
                              <linearGradient id={`grad-${b.code}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>

                            {/* Horizontal guide lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                              const y = paddingY + pct * (chartHeight - paddingY * 2);
                              const rateLabel = (maxY - pct * rangeY).toFixed(2);
                              return (
                                <g key={idx}>
                                  <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="#18181b" strokeDasharray="3 3" />
                                  <text x={paddingX - 8} y={y + 3} fill="#71717a" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">
                                    {rateLabel}%
                                  </text>
                                </g>
                              );
                            })}

                            {/* Area fill */}
                            <polygon points={areaPoints} fill={`url(#grad-${b.code})`} />

                            {/* Path curve */}
                            <polyline
                              fill="none"
                              stroke="#06b6d4"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={polylinePoints}
                            />

                            {/* Data points & labels */}
                            {points.map((p, idx) => (
                              <g key={idx}>
                                <circle cx={p.x} cy={p.y} r="5" fill="#22d3ee" stroke="#0891b2" strokeWidth="2" />
                                <text
                                  x={p.x}
                                  y={p.y - 10}
                                  fill="#38bdf8"
                                  fontSize="10"
                                  fontWeight="bold"
                                  textAnchor="middle"
                                  fontFamily="JetBrains Mono"
                                >
                                  {p.val.toFixed(2)}%
                                </text>
                                <text
                                  x={p.x}
                                  y={chartHeight - 8}
                                  fill="#a1a1aa"
                                  fontSize="9"
                                  textAnchor="middle"
                                  fontFamily="JetBrains Mono"
                                >
                                  {xLabels[idx]}
                                </text>
                              </g>
                            ))}
                          </svg>
                        </div>
                      </div>

                      {/* Scenario Simulator & Override Card */}
                      <div className="macro-panel p-5 sm:p-6 space-y-4">
                        <div className="border-b border-zinc-900 pb-3">
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                            Rate Simulator & Overrides
                          </h4>
                          <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                            Simulate adjustments and recalibrate forward curve.
                          </p>
                        </div>

                        <div className="space-y-3.5 text-xs">
                          <div className="space-y-1">
                            <label className="text-zinc-400 uppercase text-[10px]">Benchmark Rate (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={drillRate}
                              onChange={(e) => setDrillRate(e.target.value)}
                              className="w-full bg-[#0c0c12] border border-zinc-800 text-white p-2.5 outline-none focus:border-cyan-400 font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-zinc-400 uppercase text-[10px]">Market Implied Forward (%)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={drillImplied}
                              onChange={(e) => setDrillImplied(e.target.value)}
                              className="w-full bg-[#0c0c12] border border-zinc-800 text-white p-2.5 outline-none focus:border-cyan-400 font-mono"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-zinc-400 uppercase text-[10px]">Next Decision Date / Time</label>
                            <input
                              type="datetime-local"
                              value={drillMeeting}
                              onChange={(e) => setDrillMeeting(e.target.value)}
                              className="w-full bg-[#0c0c12] border border-zinc-800 text-white p-2.5 outline-none focus:border-cyan-400 font-mono"
                            />
                          </div>

                          <button
                            onClick={() => handleApplyBankOverride(b.code)}
                            className="w-full mt-2 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold uppercase tracking-wider text-xs transition cursor-pointer flex items-center justify-center gap-2"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            Apply & Recalculate Trajectory
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()}

            </div>
          </section>
        );
      })()}

      {/* SUB-VIEW: CONSENSUS ENGINE */}
      {activeTab === 'consensus' && (
        <section className="w-full py-10 sm:py-16 border-b border-zinc-900 bg-[#020203]">
          <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-6 font-mono">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-zinc-900">
              <div>
                <span className="text-cyan-500 text-[10px] font-bold uppercase tracking-widest block">
                  // EXPECTATIONS & REACTION MATRIX
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
                  Consensus Filter Hub
                </h2>
              </div>
              <input
                type="text"
                value={consensusSearch}
                onChange={(e) => setConsensusSearch(e.target.value)}
                placeholder="Search indicator..."
                className="w-full sm:w-64 bg-[#0c0c12] border border-zinc-800 text-white text-xs px-3 py-2 outline-none focus:border-cyan-500 font-mono min-h-[38px]"
              />
            </div>

            <div className="macro-panel overflow-x-auto touch-scroll">
              <table className="w-full text-left font-mono text-xs min-w-[720px]">
                <thead>
                  <tr className="text-zinc-500 text-[10px] border-b border-zinc-900 uppercase tracking-wider bg-[#07080d]">
                    <th className="p-3.5 pl-4">Time (UTC)</th>
                    <th className="p-3.5">Jurisdiction</th>
                    <th className="p-3.5">Economic Indicator</th>
                    <th className="p-3.5 text-center">Consensus</th>
                    <th className="p-3.5 text-center">Expectation Range</th>
                    <th className="p-3.5 text-center">Prior</th>
                    <th className="p-3.5 text-center">Outcome Evaluator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900/60">
                  {consensusEvents.map((e) => (
                    <tr
                      key={e.id}
                      className={`transition-colors ${
                        e.status === 'green'
                          ? 'bg-emerald-950/20 text-emerald-100'
                          : e.status === 'red'
                          ? 'bg-rose-950/20 text-rose-100'
                          : 'hover:bg-[#08080f] text-zinc-300'
                      }`}
                    >
                      <td className="p-3.5 pl-4 text-zinc-400 tabular-nums">{e.time}</td>
                      <td className="p-3.5 font-bold text-cyan-400">{e.country}</td>
                      <td className="p-3.5 font-sans font-medium text-zinc-100">{e.indicator}</td>
                      <td className="p-3.5 text-center text-cyan-300 font-bold">{e.consensus}</td>
                      <td className="p-3.5 text-center text-zinc-400">{e.range}</td>
                      <td className="p-3.5 text-center text-zinc-500">{e.prior}</td>
                      <td className="p-3.5 text-center">
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
                          className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-all cursor-pointer border min-h-[32px] inline-flex items-center justify-center ${
                            e.status === 'green'
                              ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50'
                              : e.status === 'red'
                              ? 'bg-rose-500/30 text-rose-300 border-rose-500/50'
                              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
                          }`}
                        >
                          {e.status === 'green' ? '🟢 BEAT' : e.status === 'red' ? '🔴 MISS' : '⚪ EVALUATE'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
