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
import { QuantDesk } from '../components/QuantDesk';
import { ValuationRankingChart } from '../components/ValuationRankingChart';
import { CurrencyIndicatorChart } from '../components/CurrencyIndicatorChart';
import { SectionDivider } from '../components/SectionDivider';
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

  // Helper to parse weights ("High" -> 5.0, "Med" -> 4.0, "Low" -> 3.0, or numeric strings)
  const parseWeight = (weight: any): number => {
    if (typeof weight === 'number' && !isNaN(weight) && weight > 0) return weight;
    const s = String(weight || '').trim().toLowerCase();
    if (s === 'high' || s === 'h' || s === '5.0' || s === '5') return 5.0;
    if (s === 'med' || s === 'medium' || s === 'm' || s === '4.0' || s === '4') return 4.0;
    if (s === 'low' || s === 'l' || s === '3.0' || s === '3') return 3.0;
    const num = parseFloat(s);
    return !isNaN(num) && num > 0 ? num : 4.0;
  };

  // --- Mathematical Scoring Engine (Legacy Discrete Integer Engine) ---
  const evaluateIndicator = (ind: MacroIndicator) => {
    let netChange = 0;
    if (ind.actual !== null && ind.actual !== undefined && ind.previous !== null && ind.previous !== undefined) {
      netChange = ind.actual - ind.previous;
    }
    netChange = parseFloat(netChange.toFixed(4));
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
        sum += ind.score;
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
        item[field] = parseInputValue(rawVal, item.type);
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
    Object.keys(cleaned).forEach(k => {
      if (Array.isArray(cleaned[k])) {
        cleaned[k] = cleaned[k].map((item: any) => {
          if (!item) return item;
          let cleanTime = item.time || "—";
          if (typeof cleanTime === 'string' && (cleanTime.includes("1899") || cleanTime.includes("1900"))) {
            const timeMatch = cleanTime.match(/\b(\d{1,2}:\d{2})(:\d{2})?\b/);
            cleanTime = timeMatch ? timeMatch[1] : "—";
          }
          let cleanDate = item.date;
          if (typeof cleanDate === 'string' && (cleanDate.includes("1899") || cleanDate.includes("1900"))) {
            cleanDate = new Date().toISOString().slice(0, 10);
          }
          const evalRes = evaluateIndicator(item);
          return {
            ...item,
            time: cleanTime,
            date: cleanDate !== undefined ? cleanDate : item.date,
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
          const time = ind.time || '';
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

    const isYoYEvent = /\b(yoy|y\/y|year on year|interanual|anual|año sobre año)\b/i.test(ev) || /\(yoy\)/i.test(ev);
    const isMoMEvent = /\b(mom|m\/m|month on month|mensual|mes sobre mes)\b/i.test(ev) || /\(mom\)/i.test(ev);
    const isCoreEvent = /\b(core|subyacente|ex food|sin alimentos)\b/i.test(ev);
    const isServicesEvent = /\b(services|servicios|non-manufacturing|no manufacturero)\b/i.test(ev);
    const isMfgEvent = /\b(mfg|manufacturing|manufacturero|manufactura)\b/i.test(ev);
    const isChangeJobEvent = /\b(change|cambio|claimant|subsidio|creation|creacion|payrolls|nominas)\b/i.test(ev);
    const isRateJobEvent = /\b(rate|tasa|paro|jobless rate)\b/i.test(ev) && !isChangeJobEvent;

    const isCompatible = (ind: MacroIndicator) => {
      const iname = ind.name.toLowerCase();
      if (iname.includes('mom') && isYoYEvent && !iname.includes('yoy')) return false;
      if (iname.includes('yoy') && isMoMEvent && !iname.includes('mom')) return false;
      if (isCoreEvent && !iname.includes('core') && !iname.includes('subyacente')) return false;
      if (isServicesEvent && !isMfgEvent && (iname.includes('mfg') || iname.includes('manufacturing'))) return false;
      if (isMfgEvent && !isServicesEvent && (iname.includes('services') || iname.includes('non-mfg'))) return false;
      if (isChangeJobEvent && (iname.includes('unemployment rate') || iname === 'unemp rate')) return false;
      if (isRateJobEvent && (iname.includes('change') || iname.includes('claimant'))) return false;
      return true;
    };

    // 1. Direct match on name or normalized string
    for (let i = 0; i < indList.length; i++) {
      const ind = indList[i];
      if (!isCompatible(ind)) continue;
      if (ind.name.toLowerCase() === ev) return i;
      if (normalizeEventText(ind.name) === clean) return i;
    }

    // 2. High-precision domain keyword matching per currency
    for (let i = 0; i < indList.length; i++) {
      const ind = indList[i];
      if (!isCompatible(ind)) continue;
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

      // Business & Consumer Confidence Surveys (including Household Confidence for JPY)
      if (iname.includes('consumer confidence') || iname.includes('consumer sentiment') || iname.includes('consumer survey') || iname.includes('confidence') || iname.includes('survey')) {
        if (
          ev.includes('consumer confidence') ||
          ev.includes('confianza del consumidor') ||
          ev.includes('consumer sentiment') ||
          ev.includes('sentimiento del consumidor') ||
          ev.includes('consumer survey') ||
          ev.includes('household confidence') ||
          ev.includes('confianza de los hogares') ||
          ev.includes('household spending') ||
          ev.includes('gasto de los hogares') ||
          ev.includes('consumer climate') ||
          ev.includes('clima del consumidor')
        ) {
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
      if (!isCompatible(indList[i])) continue;
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
      if (!isCompatible(indList[i])) continue;
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

  const formatSpreadsheetDate = (dateVal: any): string => {
    if (dateVal === null || dateVal === undefined || dateVal === '') {
      return new Date().toISOString().slice(0, 10);
    }
    if (dateVal instanceof Date) {
      if (dateVal.getFullYear() <= 1905) {
        return new Date().toISOString().slice(0, 10);
      }
      const y = dateVal.getFullYear();
      const m = String(dateVal.getMonth() + 1).padStart(2, '0');
      const d = String(dateVal.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const str = String(dateVal).trim().replace(/[\u00A0\u200B\r\n]/g, '');
    if (str.includes('1899') || str.includes('1900')) {
      return new Date().toISOString().slice(0, 10);
    }
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

    // Fix PMI scaling: If event includes "PMI" and value < 1.0 (e.g. 0.022 or 0.528)
    if (type === 'PMI' || type === 'AUD_SERVICES' || evLower.includes('pmi')) {
      if (Math.abs(num) < 1.0 && Math.abs(num) > 0) {
        if (Math.abs(num) >= 0.3) {
          num = num * 100;
        } else if (Math.abs(num) >= 0.03) {
          num = num * 1000;
        } else {
          // Normalize tiny decimal offset around baseline 50
          num = 50 + (num * 100);
        }
      }
      return parseFloat(num.toFixed(1));
    }

    // Fix Unemployment scaling: If event includes "Unemp" and parsed value is a tiny decimal
    if (evLower.includes('unemp') && (evLower.includes('rate') || evLower.includes('tasa') || type === 'UNEMP_RATE' || type === 'EUR_UNEMP_FIXED')) {
      // In this dashboard, UNEMP_RATE is stored as a decimal: 0.041 for 4.1%, 0.063 for 6.3%
      // If parsed value was a tiny decimal (e.g. 0.0065 or 0.00065), scale it to align with percentage display
      if (Math.abs(num) < 0.01 && Math.abs(num) > 0) {
        num = num * 10;
      } else if (Math.abs(num) >= 1.0) {
        num = num / 100.0;
      }
      return parseFloat(num.toFixed(4));
    }

    // Thousands types stored in thousands (NFP, Jobs)
    const thousandsTypes = ["NFP", "JOBS_K", "CAD_JOBS", "GBP_CLAIMANT", "GER_UNEMP_CHANGE", "CHF_UNEMP_CHANGE"];
    if (thousandsTypes.includes(type) || evLower.includes('nfp') || evLower.includes('payrolls') || evLower.includes('claimant')) {
      if (Math.abs(num) >= 1000 && !hasK) {
        return parseFloat((num / 1000).toFixed(1));
      }
      return parseFloat(num.toFixed(1));
    }

    // Percentage types stored as decimals (CPI, GDP, Retail Sales)
    const percentTypes = ["CPI", "PCT_GROWTH", "CARD_TRANS", "GBP_RETAIL"];
    if (percentTypes.includes(type) || isExplicitPercent) {
      if (isExplicitPercent) {
        if (Math.abs(num) >= 0.08) num = num / 100.0;
      } else {
        if (Math.abs(num) >= 0.08) num = num / 100.0;
      }
      return parseFloat(num.toFixed(4));
    }

    // Large suffix multipliers for non-index numbers
    if (hasK) return num * 1000;
    if (hasM) return num * 1000000;
    if (hasB) return num * 1000000000;

    return num;
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

      // Step 1: Skip the first 3 rows of the Excel file so it targets the correct header row
      // Actual file structure:
      // - First 3 rows are empty or contain metadata
      // - Row 4 contains column headers: ['Time', 'Cur.', 'Event', 'Imp.', 'Actual', 'Forecast', 'Previous']
      // - Data rows start from row 5
      let effectiveRows = rawRows;
      if (effectiveRows.length >= 4) {
        const row4 = effectiveRows[3] || [];
        const row4Str = (Array.isArray(row4) ? row4 : Object.values(row4))
          .map((c: any) => String(c || '').trim().toLowerCase())
          .join(' ');

        // Check if row 4 (index 3) is the designated header row
        const hasCurHeader = row4Str.includes('cur') || row4Str.includes('ccy') || row4Str.includes('div');
        const hasEventHeader = row4Str.includes('event') || row4Str.includes('indicat') || row4Str.includes('title');
        const hasTimeHeader = row4Str.includes('time') || row4Str.includes('hora');
        const hasMetricHeader = row4Str.includes('actual') || row4Str.includes('forecast') || row4Str.includes('imp');

        if ((hasCurHeader && (hasEventHeader || hasMetricHeader)) || (hasTimeHeader && hasEventHeader)) {
          // Explicitly skip the first 3 metadata rows to target row 4 headers
          effectiveRows = effectiveRows.slice(3);
        }
      }

      const mappedRows = effectiveRows.map(row => {
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
          if (eventCol === -1 && row.length >= 7 && (row[2] === 'event' || cleanRows[r][2]?.toLowerCase().includes('event'))) {
            eventCol = 2;
          }
          if (impCol === -1 && row.length >= 7 && (row[3] === 'imp' || cleanRows[r][3]?.toLowerCase().includes('imp'))) {
            impCol = 3;
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

          // 2. Extract raw currency value (from column index or object properties)
          let rawCur: any = '';
          if (currCol !== -1 && row[currCol] !== undefined && row[currCol] !== '') {
            rawCur = row[currCol];
          } else if (typeof row === 'object' && row !== null && !Array.isArray(row)) {
            rawCur = (row as any)['Cur.'] || (row as any)['Currency'] || (row as any)['Cur'] || (row as any)['cur.'] || (row as any)['currency'] || (row as any)['Country'] || (row as any)['country'] || '';
          }

          // 3. Immediately after extracting that raw value, aggressively normalize it BEFORE the G10 check:
          const safeStr = typeof rawCur === 'string' ? rawCur.trim().toUpperCase() : String(rawCur || '').trim().toUpperCase();
          let normalizedCurrency = INVESTING_COM_MAP[safeStr] || safeStr;

          const G10_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];

          // Fallback if currCol missed or cell was empty: scan row cells for a recognized country/currency
          if (!G10_CURRENCIES.includes(normalizedCurrency)) {
            const cells = Array.isArray(row) ? row : Object.values(row);
            for (const cell of cells) {
              const s = typeof cell === 'string' ? cell.trim().toUpperCase() : String(cell || '').trim().toUpperCase();
              const mapped = INVESTING_COM_MAP[s];
              if (mapped && G10_CURRENCIES.includes(mapped)) {
                normalizedCurrency = mapped;
                break;
              }
            }
          }

          if (!G10_CURRENCIES.includes(normalizedCurrency)) {
            const inferred = inferCurrencyFromText(rawEvent);
            if (inferred && G10_CURRENCIES.includes(inferred)) {
              normalizedCurrency = inferred;
            }
          }

          // 4. Update the subsequent if statement (checking if currency is in G10 list) and state assignment using normalizedCurrency
          if (!G10_CURRENCIES.includes(normalizedCurrency) || !nextState[normalizedCurrency]) return;

          const targetCurr = normalizedCurrency;
          const indList = [...nextState[targetCurr]];
          const matchedIdx = findIndicatorIndex(targetCurr, rawEvent, indList);

          if (matchedIdx !== -1) {
            const item = { ...indList[matchedIdx] };
            let hasChange = false;

            if (actualCol !== -1 && row[actualCol] !== undefined && row[actualCol] !== '' && row[actualCol] !== '-') {
              const actVal = parseSpreadsheetValue(row[actualCol], item.type, item.name);
              if (actVal !== null) {
                item.actual = actVal;
                hasChange = true;
              }
            }
            if (forecastCol !== -1 && row[forecastCol] !== undefined && row[forecastCol] !== '' && row[forecastCol] !== '-') {
              const fcVal = parseSpreadsheetValue(row[forecastCol], item.type, item.name);
              if (fcVal !== null) {
                item.forecast = fcVal;
                hasChange = true;
              }
            }
            if (prevCol !== -1 && row[prevCol] !== undefined && row[prevCol] !== '' && row[prevCol] !== '-') {
              const pvVal = parseSpreadsheetValue(row[prevCol], item.type, item.name);
              if (pvVal !== null) {
                item.previous = pvVal;
                hasChange = true;
              }
            }
            if (impCol !== -1 && row[impCol] !== undefined && row[impCol] !== '') {
              item.weight = normalizeImportance(row[impCol]);
              hasChange = true;
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

      // Clear the error modal state properly on a successful read
      if (updatedCount > 0) {
        setUploadModal({
          isOpen: true,
          type: 'success',
          title: language === 'es' ? "Actualización de Calendario Exitosa" : "Macro Calendar Ingested",
          message: language === 'es'
            ? `¡Se actualizaron con éxito ${updatedCount} indicador(es) macroeconómico(s) en ${updatedCurrencies.size} divisa(s) (${Array.from(updatedCurrencies).join(', ')})!`
            : `Successfully updated ${updatedCount} macroeconomic indicator(s) across ${updatedCurrencies.size} currency/currencies (${Array.from(updatedCurrencies).join(', ')})!`,
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

            // 1. DYNAMIC HEADER PARSING
            // Scan first 15 rows to find the row containing the header "Cur." dynamically
            const peekMatrix: any[][] = XLSX.utils.sheet_to_json(bestSheet, { header: 1, defval: "" });
            let headerRowIndex = -1;
            for (let r = 0; r < Math.min(peekMatrix.length, 15); r++) {
              const row = peekMatrix[r] || [];
              const cells = (Array.isArray(row) ? row : Object.values(row)).map((c: any) => String(c || '').toLowerCase().trim());
              const hasCur = cells.some(c => c === 'cur.' || c === 'cur' || c === 'currency' || c === 'ccy');
              const hasEvent = cells.some(c => c === 'event' || c === 'evento' || c === 'indicator');
              if (hasCur && (hasEvent || cells.includes('actual') || cells.includes('time') || cells.includes('imp.'))) {
                headerRowIndex = r;
                break;
              }
            }

            // Fallback: Skip first 3 rows if headers are on Row 4 (0-indexed 3)
            const skipRange = headerRowIndex !== -1 ? headerRowIndex : (peekMatrix.length >= 4 ? 3 : 0);
            const targetMatrix: any[][] = XLSX.utils.sheet_to_json(bestSheet, { header: 1, defval: "", range: skipRange });
            processMatrix(targetMatrix);
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
            { id: 'quant-desk', label: t.tools.subTabs.quantDesk },
            { id: 'calendar-filter', label: t.tools.subTabs.calendarFilter },
            { id: 'currency-strength', label: t.tools.subTabs.currencyStrength },
            { id: 'volatility', label: t.tools.subTabs.volatility },
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
                className="px-3.5 py-2 uppercase tracking-wider text-[11px] transition-all cursor-pointer whitespace-nowrap flex items-center shrink-0 min-h-[36px] bg-[#0c0c12] text-zinc-400 border border-zinc-800 hover:text-white"
              >
                {tab.label}
              </a>
            ) : (
              <button
                key={tab.id}
                onClick={() => handleTabSwitch(tab.id as ToolSubTab)}
                className={`px-3.5 py-2 uppercase tracking-wider text-[11px] transition-all cursor-pointer whitespace-nowrap flex items-center shrink-0 min-h-[36px] ${
                  activeTab === tab.id
                    ? 'bg-cyan-500 text-black font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                    : 'bg-[#0c0c12] text-zinc-400 border border-zinc-800 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            )
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                
                {/* 0. QUANT DESK / SENTIMENT DEFINER */}
                <div
                  className="group macro-card p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden border border-zinc-800 hover:border-cyan-500/50"
                >
                  <div className="space-y-4 font-mono">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400 uppercase tracking-widest">// QUANT_DESK_V2</span>
                      <span className="bg-zinc-900 text-cyan-400 border border-cyan-900/50 px-2.5 py-0.5 font-bold uppercase">
                        5-PILLAR MODEL
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-wide cursor-pointer" onClick={() => handleTabSwitch('quant-desk')}>
                      Currency Sentiment Definer
                    </h3>

                    <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed font-light">
                      {language === 'es' 
                        ? 'Mesa de definición cuantitativa de sentimiento. Evalúa catalizadores de noticias, filtro minorista contrario (SSI), ponderación macro, apetito por riesgo y bancos centrales.'
                        : 'Quantitative multi-factor sentiment verification desk. Evaluates Tier-1 news catalysts, retail crowd positioning (SSI), macro multi-factor weights, risk appetite, and central bank trajectory.'}
                    </p>
                  </div>

                  <div className="mt-6 sm:mt-8 pt-4 border-t border-zinc-800 flex items-center font-mono text-xs">
                    <button onClick={() => handleTabSwitch('quant-desk')} className="text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer">
                      <span>{language === 'es' ? 'Abrir Quant Desk' : 'Open Quant Desk'}</span>
                      <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </button>
                  </div>
                </div>

                {/* 1. CALENDAR FILTER TOOL */}
                <div
                  className="group macro-card border-2 border-cyan-500/60 hover:border-cyan-400 p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-4 font-mono relative z-10">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-cyan-400 font-bold uppercase tracking-widest">// CALENDAR_FILTER_V2</span>
                      <span className="bg-cyan-950 text-cyan-300 border border-cyan-700/80 px-2.5 py-0.5 font-bold uppercase flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-cyan-400 animate-ping"></span>
                        PRIMARY ENGINE
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-wide cursor-pointer" onClick={() => handleTabSwitch('calendar-filter')}>
                      Kairos Macro Hub (Motor Unificado)
                    </h3>

                    <p className="text-xs sm:text-sm text-zinc-300 font-sans leading-relaxed font-light">
                      Motor de análisis macro, calendario inteligente y escáner de divergencias. Incluye importación Excel (.xlsx) de Investing.com, reglas Core para G10, escáner de divergencias en pares aprobados, puntuación intermercado y reportes imprimibles.
                    </p>
                  </div>

                  <div className="mt-6 sm:mt-8 pt-4 border-t border-zinc-800 flex items-center font-mono text-xs relative z-10">
                    <button onClick={() => handleTabSwitch('calendar-filter')} className="text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer">
                      <span>{language === 'es' ? 'Abrir Motor' : 'Open Engine'}</span>
                      <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </button>
                  </div>
                </div>

                {/* 2. CURRENCY STRENGTH ENGINE */}
                <div
                  className="group macro-card p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="space-y-4 font-mono">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400 uppercase tracking-widest">// VALUATION_INDEX_V2</span>
                      <span className="bg-zinc-900 text-cyan-400 border border-cyan-900/50 px-2.5 py-0.5 font-bold uppercase">
                        28 CROSS PAIRS
                      </span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-wide cursor-pointer" onClick={() => handleTabSwitch('currency-strength')}>
                      Currency Strength & Valuation Engine
                    </h3>

                    <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed font-light">
                      Fundamental valuation dashboard tracking economic indicators across 8 major currencies. Computes directional bias ratios, divergence rankings, and editable actual/forecast values.
                    </p>
                  </div>

                  <div className="mt-6 sm:mt-8 pt-4 border-t border-zinc-800 flex items-center font-mono text-xs">
                    <button onClick={() => handleTabSwitch('currency-strength')} className="text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer">
                      <span>{language === 'es' ? 'Abrir Consola' : 'Open Console'}</span>
                      <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </button>
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
                  className="group macro-card p-6 sm:p-8 flex flex-col justify-between"
                >
                  <div className="space-y-3 font-mono">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400 uppercase">// MATRIX_V3</span>
                      <span className="text-cyan-400 font-bold uppercase">70-DAY CYCLE</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-400 transition-colors uppercase cursor-pointer" onClick={() => handleTabSwitch('volatility')}>
                      Volatility Index
                    </h3>
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed font-light">
                      Realized variance matrix calculating average daily pip ranges, 100k cash equivalencies, and % realized ranges for 28 currency pairs.
                    </p>
                  </div>
                  <div className="mt-6 sm:mt-8 pt-3 border-t border-zinc-800/80 flex items-center font-mono text-xs">
                    <button onClick={() => handleTabSwitch('volatility')} className="text-cyan-500 hover:text-cyan-400 font-bold uppercase flex items-center gap-1 cursor-pointer">
                      <span>Open Volatility Grid</span>
                      <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </button>
                  </div>
                </div>

                {/* Risk Calculator */}
                <div
                  className="group macro-card p-6 sm:p-8 flex flex-col justify-between"
                >
                  <div className="space-y-3 font-mono">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-400 uppercase">// RISK_MODEL_V1</span>
                      <span className="text-emerald-400 font-bold uppercase">PARITY SIZING</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors uppercase cursor-pointer" onClick={() => handleTabSwitch('calculator')}>
                      Risk & Position Size Calculator
                    </h3>
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed font-light">
                      Calculate standard lot sizes and pip cash values based on invalidation points, account equity, and dynamic cross-rate parities.
                    </p>
                  </div>
                  <div className="mt-6 sm:mt-8 pt-3 border-t border-zinc-800/80 flex items-center font-mono text-xs">
                    <button onClick={() => handleTabSwitch('calculator')} className="text-emerald-400 hover:text-emerald-300 font-bold uppercase flex items-center gap-1 cursor-pointer">
                      <span>Launch Calculator</span>
                      <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </button>
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
                  className="group macro-card p-6 sm:p-8 flex flex-col justify-between"
                >
                  <div className="space-y-3 font-mono">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-cyan-400 font-bold uppercase">// POLICY_RADAR_V2</span>
                      <span className="bg-cyan-950/70 text-cyan-300 border border-cyan-700/60 px-2 py-0.5 text-[9px] font-bold uppercase flex items-center gap-1">
                        <span>EXTERNAL APP</span>
                        <span className="text-[10px]">&nearr;</span>
                      </span>
                    </div>
                    <a
                      href="https://central-bank-tool.onrender.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-wide flex items-center gap-2 cursor-pointer block"
                    >
                      <span>Central Bank Rate Terminal</span>
                      <span className="text-cyan-400 text-xs font-mono">&nearr;</span>
                    </a>
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed font-light">
                      Monetary policy rate expectations, automated Hawkish/Dovish classifications, and decision countdown timers.
                    </p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-zinc-800/80 flex items-center font-mono text-xs">
                    <a
                      href="https://central-bank-tool.onrender.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-500 hover:text-cyan-400 font-bold uppercase flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Bank Terminal</span>
                      <span className="group-hover:translate-x-1 transition-transform">&nearr;</span>
                    </a>
                  </div>
                </div>

                {/* Consensus Engine */}
                <div
                  className="group macro-card p-6 sm:p-8 flex flex-col justify-between"
                >
                  <div className="space-y-3 font-mono">
                    <span className="text-cyan-400 text-[10px] font-bold uppercase">// EXPECTATIONS_V1</span>
                    <h3 className="text-base font-bold text-white uppercase tracking-wide cursor-pointer" onClick={() => handleTabSwitch('consensus')}>
                      Consensus Filter Hub
                    </h3>
                    <p className="text-xs text-zinc-400 font-sans leading-relaxed font-light">
                      Macroeconomic expectation ranges, actual result deviations, and Beat/Miss surprise tracking.
                    </p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-zinc-800/80 flex items-center font-mono text-xs">
                    <button onClick={() => handleTabSwitch('consensus')} className="text-cyan-500 hover:text-cyan-400 font-bold uppercase flex items-center gap-1 cursor-pointer">
                      <span>Open Consensus Hub</span>
                      <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </section>
        </>
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
                    onClick={handleExportCSV}
                    className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/60 transition cursor-pointer font-bold min-h-[36px] flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Export Excel/CSV
                  </button>
                  <button
                    onClick={handleExportData}
                    className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-800/60 transition cursor-pointer font-bold min-h-[36px] flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export JSON
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider bg-[#0c0c12] hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition cursor-pointer min-h-[36px] flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Import Backup / Excel
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json,.xlsx,.xls,.csv,.tsv,application/json"
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
                    accept=".csv,.xlsx,.xls,.tsv,.json"
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
                              style={{ width: `${Math.min(100, (Math.abs(score) / 3.0) * 100)}%` }}
                            />
                          )}
                        </div>
                        <div className="w-1/2 flex justify-start">
                          {score > 0 && (
                            <div
                              className="bg-cyan-400 h-full shadow-[0_0_6px_rgba(34,211,238,0.7)]"
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

      {/* Macro Calendar Upload Status Modal */}
      {uploadModal && uploadModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-[#020203]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`max-w-md w-full bg-[#07080e] border ${uploadModal.type === 'success' ? 'border-emerald-500/50 shadow-[0_0_35px_rgba(16,185,129,0.25)]' : 'border-rose-500/50 shadow-[0_0_35px_rgba(244,63,94,0.25)]'} p-6 rounded-xl font-mono space-y-4`}>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${uploadModal.type === 'success' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                <span className={`text-[11px] font-bold uppercase tracking-wider ${uploadModal.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {uploadModal.type === 'success' ? '// CALENDAR INGESTION SUCCESS' : '// CALENDAR PARSING NOTICE'}
                </span>
              </div>
              <button
                onClick={() => setUploadModal(null)}
                className="text-zinc-500 hover:text-white text-xs font-mono transition cursor-pointer p-1"
                aria-label="Close modal"
              >
                [ ✕ ]
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-white text-sm font-bold uppercase tracking-wide">
                {uploadModal.title}
              </h3>
              <p className="text-zinc-300 text-xs font-sans leading-relaxed">
                {uploadModal.message}
              </p>
            </div>

            {uploadModal.currencies && uploadModal.currencies.length > 0 && (
              <div className="pt-2">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 font-mono">
                  {language === 'es' ? 'Divisas Actualizadas:' : 'Updated Currencies:'}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {uploadModal.currencies.map(c => (
                    <span key={c} className="px-2 py-0.5 bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 text-[10px] font-bold">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-zinc-900 flex justify-end gap-2">
              <button
                onClick={() => setUploadModal(null)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                  uploadModal.type === 'success'
                    ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700'
                }`}
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
