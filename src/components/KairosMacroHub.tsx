import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Printer, Download, Copy, Check, X, AlertTriangle, AlertCircle, CheckCircle2, Info, FileText } from 'lucide-react';
import { Language } from '../types';
import { normalizeCurrencyCode, isG10Currency } from '../utils/currencyUtils';

interface MacroEvent {
  time: string;
  ccy: string;
  event: string;
  actual: string;
  forecast: string;
  previous: string;
  coreRuleId?: string | null;
  isCore?: boolean;
}

interface CategoryScore {
  ccy: string;
  score: number;
  title: string;
  eventsSummary: string;
}

interface PrevBreakdownItem {
  label: string;
  score: number;
}

interface MacroHubState {
  daysData: Record<string, MacroEvent[]>;
  categoryScores: Record<string, CategoryScore>;
  matrixEvents: Record<string, number>;
  matrixTotals: Record<string, number>;
  matrixPrev: Record<string, number>;
  matrixPrevBreakdown: Record<string, PrevBreakdownItem[]>;
  intermarketScores: Record<string, number>;
  dailyNotes: Record<string, string>;
}

export interface KairosMacroHubProps {
  onReturnToHub?: () => void;
  language?: Language;
}

const CORE_INDICATOR_RULES = [
  // USD - 9 Indicators
  { id: 'USD_ISM_MFG', ccy: 'USD', match: ['ism manufacturing pmi', 'ism mfg', 'ism manufacturing', 'pmi manufacturero del ism'], avoid: ['prices', 'employment', 'orders', 'services', 'non-manufacturing'] },
  { id: 'USD_ISM_SERVICES', ccy: 'USD', match: ['ism non-manufacturing pmi', 'ism services pmi', 'ism services', 'pmi del sector servicios del ism', 'pmi no manufacturero'], avoid: ['prices', 'employment', 'orders'] },
  { id: 'USD_CPI', ccy: 'USD', match: ['cpi', 'consumer price index', 'ipc'], avoid: ['core', 'ex food', 'subyacente'] },
  { id: 'USD_UNEMP', ccy: 'USD', match: ['unemployment rate', 'tasa de desempleo'], avoid: ['youth', 'underemployment'] },
  { id: 'USD_NFP', ccy: 'USD', match: ['nonfarm payrolls', 'non-farm payrolls', 'nfp', 'nominas no agricolas', 'empleo no agricola'], avoid: ['private', 'manufacturing', 'government'] },
  { id: 'USD_RETAIL', ccy: 'USD', match: ['retail sales', 'ventas minoristas'], avoid: ['core', 'ex gas', 'control group', 'subyacente'] },
  { id: 'USD_CB_CONF', ccy: 'USD', match: ['cb consumer confidence', 'confianza del consumidor de the conference board', 'confianza del consumidor de cb'], avoid: ['michigan'] },
  { id: 'USD_NFIB', ccy: 'USD', match: ['nfib small business optimism', 'nfib small business index', 'nfib'], avoid: [] },
  { id: 'USD_GDPNOW', ccy: 'USD', match: ['atlanta fed gdpnow', 'gdpnow', 'atlanta fed gdp'], avoid: [] },

  // EUR - 9 Indicators
  { id: 'EUR_HCOB_MFG', ccy: 'EUR', match: ['hcob euro zone manufacturing pmi', 'hcob eurozone manufacturing', 'euro zone manufacturing pmi', 'pmi manufacturero de la zona euro'], avoid: ['services', 'composite', 'construction', 'italy', 'france', 'spain', 'german'] },
  { id: 'EUR_HCOB_SERV', ccy: 'EUR', match: ['hcob euro zone services pmi', 'hcob eurozone services', 'euro zone services pmi', 'pmi servicios de la zona euro'], avoid: ['mfg', 'manufacturing', 'composite', 'construction', 'italy', 'france', 'spain', 'german'] },
  { id: 'EUR_CPI', ccy: 'EUR', match: ['cpi', 'hicp', 'ipc'], avoid: ['core', 'subyacente', 'tokyo', 'german', 'french', 'spanish', 'italian'] },
  { id: 'EUR_UNEMP', ccy: 'EUR', match: ['euro zone unemployment rate', 'eurozone unemployment rate', 'tasa de desempleo de la zona euro'], avoid: ['youth', 'germany', 'german', 'french', 'spanish', 'italian', 'change', 'cambio'] },
  { id: 'EUR_GER_UNEMP_CHG', ccy: 'EUR', match: ['german unemployment change', 'germany unemployment change', 'cambio del desempleo en alemania'], avoid: ['rate', 'tasa'] },
  { id: 'EUR_RETAIL', ccy: 'EUR', match: ['euro zone retail sales', 'eurozone retail sales', 'ventas minoristas de la zona euro'], avoid: ['german', 'french', 'spanish', 'italian', 'core', 'subyacente'] },
  { id: 'EUR_CONS_CONF', ccy: 'EUR', match: ['euro zone consumer confidence', 'eurozone consumer confidence', 'confianza del consumidor en la zona euro'], avoid: ['business', 'germany', 'german', 'french', 'spanish', 'gfk'] },
  { id: 'EUR_IFO', ccy: 'EUR', match: ['german ifo business climate', 'ifo business climate', 'indice ifo de confianza empresarial'], avoid: ['current assessment', 'expectations'] },
  { id: 'EUR_IND_PROD', ccy: 'EUR', match: ['euro zone industrial production', 'eurozone industrial production', 'produccion industrial de la zona euro'], avoid: ['german', 'french', 'spanish', 'italian'] },

  // GBP - 9 Indicators
  { id: 'GBP_SP_MFG', ccy: 'GBP', match: ['s&p global/cips uk manufacturing pmi', 's&p global uk manufacturing', 'pmi manufacturero reino unido', 'pmi del sector manufacturero de gran bretaña'], avoid: ['services', 'composite', 'construction'] },
  { id: 'GBP_SP_SERV', ccy: 'GBP', match: ['s&p global/cips uk services pmi', 's&p global uk services', 'pmi servicios reino unido', 'pmi del sector servicios de gran bretaña'], avoid: ['mfg', 'manufacturing', 'composite', 'construction'] },
  { id: 'GBP_CPI', ccy: 'GBP', match: ['cpi', 'uk cpi', 'ipc'], avoid: ['core', 'subyacente'] },
  { id: 'GBP_UNEMP', ccy: 'GBP', match: ['unemployment rate', 'tasa de desempleo'], avoid: ['youth', 'claimant'] },
  { id: 'GBP_CLAIMANT', ccy: 'GBP', match: ['claimant count change', 'claimant count', 'evolucion del desempleo (claimant count)'], avoid: ['rate'] },
  { id: 'GBP_RETAIL', ccy: 'GBP', match: ['retail sales', 'ventas minoristas'], avoid: ['ex fuel', 'core', 'subyacente'] },
  { id: 'GBP_GFK', ccy: 'GBP', match: ['gfk consumer confidence', 'confianza del consumidor de gfk'], avoid: [] },
  { id: 'GBP_CBI', ccy: 'GBP', match: ['cbi industrial trends orders', 'pedidos de tendencias industriales segun el cbi'], avoid: ['distributive', 'selling prices'] },
  { id: 'GBP_GDP', ccy: 'GBP', match: ['monthly gdp', 'gdp', 'pib mensual', 'pib'], avoid: ['3m/3m', 'qoq', 'yoy', 'annualized'] },

  // JPY - 9 Indicators
  { id: 'JPY_JIBUN_MFG', ccy: 'JPY', match: ['au jibun bank japan manufacturing', 'jibun bank manufacturing', 'jibun mfg', 'pmi del sector manufacturero de japon'], avoid: ['services', 'composite', 'construction'] },
  { id: 'JPY_JIBUN_SERV', ccy: 'JPY', match: ['au jibun bank japan services', 'jibun bank services', 'jibun services', 'pmi del sector servicios de japon'], avoid: ['mfg', 'manufacturing', 'composite', 'construction'] },
  { id: 'JPY_TOKYO_CPI', ccy: 'JPY', match: ['tokyo cpi', 'tokyo core cpi', 'ipc de tokio'], avoid: ['ex fresh food', 'national'] },
  { id: 'JPY_UNEMP', ccy: 'JPY', match: ['unemployment rate', 'tasa de desempleo'], avoid: [] },
  { id: 'JPY_EARNINGS', ccy: 'JPY', match: ['labor cash earnings', 'cash earnings', 'ingresos salariales en efectivo'], avoid: [] },
  { id: 'JPY_RETAIL', ccy: 'JPY', match: ['retail sales', 'ventas minoristas'], avoid: [] },
  { id: 'JPY_CONS_SURVEY', ccy: 'JPY', match: ['consumer survey', 'consumer confidence', 'confianza del consumidor'], avoid: [] },
  { id: 'JPY_TANKAN', ccy: 'JPY', match: ['reuters tankan index', 'reuters tankan', 'tankan large manufacturers', 'indice tankan de grandes fabricantes'], avoid: ['non-manufacturers'] },
  { id: 'JPY_JCER_GDP', ccy: 'JPY', match: ['jcer monthly gdp', 'jcer gdp', 'pib mensual de jcer'], avoid: [] },

  // AUD - 9 Indicators
  { id: 'AUD_JUDO_MFG', ccy: 'AUD', match: ['judo bank australia manufacturing', 'judo bank manufacturing', 'judo mfg', 'pmi del sector manufacturero de australia'], avoid: ['services', 'composite', 'construction'] },
  { id: 'AUD_JUDO_SERV', ccy: 'AUD', match: ['judo bank australia services', 'judo bank services', 'judo services', 'pmi del sector servicios de australia'], avoid: ['mfg', 'manufacturing', 'composite', 'construction'] },
  { id: 'AUD_CPI_IND', ccy: 'AUD', match: ['monthly cpi indicator', 'cpi indicator', 'indicador mensual del ipc'], avoid: ['trimmed'] },
  { id: 'AUD_UNEMP', ccy: 'AUD', match: ['unemployment rate', 'tasa de desempleo'], avoid: [] },
  { id: 'AUD_EMP_CHG', ccy: 'AUD', match: ['employment change', 'variacion del empleo', 'cambio en el empleo'], avoid: ['full time', 'part time'] },
  { id: 'AUD_RETAIL', ccy: 'AUD', match: ['retail sales', 'ventas minoristas'], avoid: [] },
  { id: 'AUD_WESTPAC', ccy: 'AUD', match: ['westpac consumer sentiment', 'westpac sentiment', 'confianza del consumidor de westpac'], avoid: [] },
  { id: 'AUD_NAB', ccy: 'AUD', match: ['nab business confidence', 'confianza empresarial de nab'], avoid: ['business conditions'] },
  { id: 'AUD_AIG', ccy: 'AUD', match: ['ai group industry index', 'aig industry index', 'indice de la industria de ai group'], avoid: ['construction', 'services', 'manufacturing'] },

  // NZD - 9 Indicators
  { id: 'NZD_BNZ_MFG', ccy: 'NZD', match: ['businessnz manufacturing pmi', 'businessnz pmi', 'pmi manufacturero de businessnz'], avoid: ['services', 'performance of services'] },
  { id: 'NZD_BNZ_SERV', ccy: 'NZD', match: ['businessnz performance of services', 'businessnz psi', 'indice del rendimiento del sector servicios'], avoid: ['manufacturing'] },
  { id: 'NZD_CPI', ccy: 'NZD', match: ['cpi', 'ipc'], avoid: ['food', 'tradeable', 'non-tradeable'] },
  { id: 'NZD_UNEMP', ccy: 'NZD', match: ['unemployment rate', 'tasa de desempleo'], avoid: [] },
  { id: 'NZD_EMP_CHG', ccy: 'NZD', match: ['employment change', 'variacion del empleo', 'cambio en el empleo'], avoid: ['full time', 'part time'] },
  { id: 'NZD_CARD_TRANS', ccy: 'NZD', match: ['electronic card retail transactions', 'card spending', 'transacciones con tarjeta electronica', 'gasto minorista con tarjeta'], avoid: ['core'] },
  { id: 'NZD_ANZ_CONF', ccy: 'NZD', match: ['anz-roy morgan consumer confidence', 'anz consumer confidence', 'confianza del consumidor de anz-roy morgan'], avoid: ['business'] },
  { id: 'NZD_ANZ_BIZ', ccy: 'NZD', match: ['anz business confidence', 'confianza empresarial de anz'], avoid: ['own activity'] },
  { id: 'NZD_GDT', ccy: 'NZD', match: ['globaldairytrade price index', 'gdt price index', 'indice de precios de gdt', 'lacteos gdt'], avoid: [] },

  // CAD - 9 Indicators
  { id: 'CAD_SP_MFG', ccy: 'CAD', match: ['s&p global canada manufacturing pmi', 's&p global canada manufacturing', 'pmi manufacturero de canada de s&p global'], avoid: ['services', 'composite'] },
  { id: 'CAD_IVEY_PMI', ccy: 'CAD', match: ['ivey pmi', 'pmi de ivey'], avoid: [] },
  { id: 'CAD_CPI', ccy: 'CAD', match: ['cpi', 'ipc'], avoid: ['core', 'median', 'trimmed', 'common', 'subyacente'] },
  { id: 'CAD_UNEMP', ccy: 'CAD', match: ['unemployment rate', 'tasa de desempleo'], avoid: [] },
  { id: 'CAD_NET_EMP', ccy: 'CAD', match: ['net change in employment', 'employment change', 'variacion del empleo'], avoid: ['full time', 'part time'] },
  { id: 'CAD_RETAIL', ccy: 'CAD', match: ['retail sales', 'ventas minoristas'], avoid: ['core', 'subyacente'] },
  { id: 'CAD_BOSED', ccy: 'CAD', match: ['business outlook survey', 'bos indicator', 'boc business outlook', 'encuesta de perspectivas empresariales'], avoid: [] },
  { id: 'CAD_CFIB', ccy: 'CAD', match: ['cfib business barometer', 'cfib', 'barometro empresarial de cfib'], avoid: [] },
  { id: 'CAD_GDP', ccy: 'CAD', match: ['monthly gdp', 'real gdp', 'gdp', 'pib mensual', 'pib'], avoid: ['annualized'] },

  // CHF - 9 Indicators
  { id: 'CHF_PROCURA_MFG', ccy: 'CHF', match: ['procure.ch manufacturing pmi', 'procure.ch pmi', 'pmi manufacturero de procure.ch'], avoid: ['services'] },
  { id: 'CHF_PROCURA_SERV', ccy: 'CHF', match: ['procure.ch services pmi', 'procure.ch services', 'pmi servicios de procure.ch'], avoid: ['manufacturing', 'mfg'] },
  { id: 'CHF_CPI', ccy: 'CHF', match: ['cpi', 'ipc'], avoid: ['core', 'subyacente'] },
  { id: 'CHF_UNEMP', ccy: 'CHF', match: ['unemployment rate', 'tasa de desempleo'], avoid: ['change', 'cambio'] },
  { id: 'CHF_RETAIL', ccy: 'CHF', match: ['real retail sales', 'retail sales', 'ventas minoristas reales'], avoid: [] },
  { id: 'CHF_SECO_CONF', ccy: 'CHF', match: ['seco consumer climate', 'consumer confidence', 'clima de consumo seco', 'confianza del consumidor'], avoid: [] },
  { id: 'CHF_KOF', ccy: 'CHF', match: ['kof leading indicator', 'kof economic barometer', 'indicador kof', 'barometro economico kof'], avoid: [] },
  { id: 'CHF_ZEW_CS', ccy: 'CHF', match: ['cs-cfas economic expectations', 'cs cfas', 'zew', 'expectativas economicas de cs-cfas'], avoid: [] },
  { id: 'CHF_GDP', ccy: 'CHF', match: ['quarterly gdp', 'gdp', 'pib trimestral', 'pib'], avoid: [] },

  // CNH - 9 Indicators
  { id: 'CNH_NBS_MFG', ccy: 'CNH', match: ['nbs manufacturing pmi', 'official manufacturing pmi', 'pmi manufacturero oficial', 'pmi manufacturero del nbs'], avoid: ['non-manufacturing', 'services'] },
  { id: 'CNH_NBS_NON_MFG', ccy: 'CNH', match: ['nbs non-manufacturing pmi', 'official non-manufacturing pmi', 'pmi no manufacturero', 'pmi no manufacturero del nbs'], avoid: [] },
  { id: 'CNH_CAIXIN_MFG', ccy: 'CNH', match: ['caixin manufacturing pmi', 'caixin mfg', 'pmi manufacturero de caixin'], avoid: ['services', 'composite'] },
  { id: 'CNH_CAIXIN_SERV', ccy: 'CNH', match: ['caixin services pmi', 'caixin services', 'pmi de servicios de caixin'], avoid: ['mfg', 'manufacturing'] },
  { id: 'CNH_CPI', ccy: 'CNH', match: ['cpi', 'ipc'], avoid: ['core', 'subyacente'] },
  { id: 'CNH_PPI', ccy: 'CNH', match: ['ppi', 'producer price index', 'ipp'], avoid: [] },
  { id: 'CNH_RETAIL', ccy: 'CNH', match: ['retail sales', 'ventas minoristas'], avoid: [] },
  { id: 'CNH_IND_PROD', ccy: 'CNH', match: ['industrial production', 'produccion industrial'], avoid: [] },
  { id: 'CNH_GDP', ccy: 'CNH', match: ['gdp', 'pib'], avoid: [] }
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NZD', 'CHF', 'CNH'];

const APPROVED_PAIRS = [
  'EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDCAD', 'USDCHF', 'USDJPY',
  'EURGBP', 'EURAUD', 'EURNZD', 'EURCAD', 'EURCHF', 'EURJPY',
  'GBPAUD', 'GBPNZD', 'GBPCAD', 'GBPCHF', 'GBPJPY',
  'AUDNZD', 'AUDCAD', 'AUDCHF', 'AUDJPY',
  'NZDCAD', 'NZDCHF', 'NZDJPY',
  'CADCHF', 'CADJPY', 'CHFJPY',
  'USDCNH', 'EURCNH'
];

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCoreRuleId(ccy: string, eventName: string): string | null {
  const normEvent = normalizeText(eventName);
  const matchingRules = CORE_INDICATOR_RULES.filter(r => r.ccy === ccy);

  for (const rule of matchingRules) {
    const hasMatch = rule.match.some(m => normEvent.includes(normalizeText(m)));
    if (hasMatch) {
      const hasAvoid = rule.avoid.some(a => normEvent.includes(normalizeText(a)));
      if (!hasAvoid) {
        return rule.id;
      }
    }
  }
  return null;
}

function isWhitelisted(ccy: string, eventName: string): boolean {
  if (!CURRENCIES.includes(ccy)) return false;
  const norm = normalizeText(eventName);
  const discardWords = [
    'holiday', 'bank holiday', 'auction', 'bill', 'bond', 'note',
    'fomc member', 'ecb member', 'boe member', 'speaks', 'speech',
    'feriado', 'festivo', 'subasta', 'discurso', 'comparecencia', 'miembro del fomc', 'miembro del bce'
  ];
  if (discardWords.some(w => norm.includes(w))) return false;
  return true;
}

function getCategorySentimentTitle(ccy: string, eventName: string, isEs: boolean): string {
  const norm = normalizeText(eventName);

  if (norm.includes('pmi') || norm.includes('manufacturing') || norm.includes('services') || norm.includes('manufacturero') || norm.includes('servicios') || norm.includes('ifo') || norm.includes('tankan') || norm.includes('industry') || norm.includes('industria')) {
    return isEs ? `Actividad Económica y PMI (${ccy})` : `Economic Activity & PMIs (${ccy})`;
  }
  if (norm.includes('cpi') || norm.includes('ipc') || norm.includes('inflation') || norm.includes('inflacion') || norm.includes('ppi') || norm.includes('ipp') || norm.includes('price') || norm.includes('precios') || norm.includes('hicp')) {
    return isEs ? `Inflación y Presión de Precios (${ccy})` : `Inflation & Price Pressures (${ccy})`;
  }
  if (norm.includes('employment') || norm.includes('payroll') || norm.includes('unemployment') || norm.includes('desempleo') || norm.includes('empleo') || norm.includes('claimant') || norm.includes('jobs') || norm.includes('nominas') || norm.includes('earnings') || norm.includes('salarial')) {
    return isEs ? `Mercado Laboral y Empleo (${ccy})` : `Labor Market & Employment (${ccy})`;
  }
  if (norm.includes('retail') || norm.includes('ventas') || norm.includes('sales') || norm.includes('consumer') || norm.includes('consumidor') || norm.includes('spending') || norm.includes('gasto') || norm.includes('card') || norm.includes('tarjeta')) {
    return isEs ? `Consumo y Ventas Minoristas (${ccy})` : `Consumer Spending & Retail (${ccy})`;
  }
  if (norm.includes('rate') || norm.includes('tasa') || norm.includes('central bank') || norm.includes('banco central') || norm.includes('interest') || norm.includes('interes') || norm.includes('policy') || norm.includes('politica')) {
    return isEs ? `Decisión de Tasas y Política (${ccy})` : `Rate Decision & Policy (${ccy})`;
  }
  if (norm.includes('confidence') || norm.includes('confianza') || norm.includes('sentiment') || norm.includes('sentimiento') || norm.includes('optimism') || norm.includes('optimismo') || norm.includes('barometer') || norm.includes('barometro')) {
    return isEs ? `Confianza Empresarial / Consumidor (${ccy})` : `Business / Consumer Confidence (${ccy})`;
  }
  if (norm.includes('gdp') || norm.includes('pib') || norm.includes('growth') || norm.includes('crecimiento')) {
    return isEs ? `Crecimiento del PIB (${ccy})` : `GDP & Economic Growth (${ccy})`;
  }
  return isEs ? `Indicadores Generales (${ccy})` : `General Indicators (${ccy})`;
}

function getSmartGroupTitle(ccy: string, events: MacroEvent[], isEs: boolean): string {
  if (events.length === 1) {
    return `${events[0].event} (${ccy})`;
  }
  const baseCategory = getCategorySentimentTitle(ccy, events[0].event, isEs);
  const coreEvent = events.find(e => e.isCore);
  if (coreEvent) {
    return `${coreEvent.event} + Bloque de Datos (${ccy})`;
  }
  return `${baseCategory} [${events.length} ${isEs ? 'indicadores' : 'indicators'}]`;
}

function formatDayLabel(dayKey: string, isEs: boolean): string {
  if (!dayKey) return '';
  const parts = dayKey.split(',');
  if (parts.length >= 2) {
    const rawDay = parts[0].trim().toUpperCase();
    const dateRest = parts.slice(1).join(',').trim();

    const enToEs: Record<string, string> = {
      SUNDAY: 'DOMINGO', MONDAY: 'LUNES', TUESDAY: 'MARTES',
      WEDNESDAY: 'MIÉRCOLES', THURSDAY: 'JUEVES', FRIDAY: 'VIERNES', SATURDAY: 'SÁBADO'
    };
    const esToEn: Record<string, string> = {
      DOMINGO: 'SUNDAY', LUNES: 'MONDAY', MARTES: 'TUESDAY',
      'MIÉRCOLES': 'WEDNESDAY', MIERCOLES: 'WEDNESDAY', JUEVES: 'THURSDAY', VIERNES: 'FRIDAY', 'SÁBADO': 'SATURDAY', SABADO: 'SATURDAY'
    };

    if (isEs) {
      const dayEs = enToEs[rawDay] || rawDay;
      return `${dayEs}, ${dateRest}`;
    } else {
      const dayEn = esToEn[rawDay] || rawDay;
      return `${dayEn}, ${dateRest}`;
    }
  }
  return dayKey;
}

export const KairosMacroHub: React.FC<KairosMacroHubProps> = ({
  onReturnToHub,
  language = 'en'
}) => {
  const isEs = language === 'es';

  // Persistence State
  const [globalState, setGlobalState] = useState<MacroHubState>(() => {
    try {
      const saved = localStorage.getItem('kairos_macro_engine_state_v16');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const rawDaysData = parsed.daysData || {};
          const repairedDaysData: Record<string, MacroEvent[]> = {};
          Object.keys(rawDaysData).forEach(day => {
            repairedDaysData[day] = (rawDaysData[day] || []).map((item: any) => {
              let cleanTime = item.time || "—";
              if (typeof cleanTime === 'string' && (cleanTime.includes("1899") || cleanTime.includes("1900"))) {
                const timeMatch = cleanTime.match(/\b(\d{1,2}:\d{2})(:\d{2})?\b/);
                if (timeMatch) cleanTime = timeMatch[1];
                else cleanTime = "—";
              }
              return { ...item, time: cleanTime };
            });
          });

          return {
            daysData: repairedDaysData,
            categoryScores: parsed.categoryScores || {},
            matrixEvents: parsed.matrixEvents || {},
            matrixTotals: parsed.matrixTotals || {},
            matrixPrev: Object.assign({ USD: 0, EUR: 0, GBP: 0, JPY: 0, CAD: 0, AUD: 0, NZD: 0, CHF: 0, CNH: 0, VIX: 0, Oil: 0, Gold: 0 }, parsed.matrixPrev || {}),
            matrixPrevBreakdown: Object.assign({ USD: [], EUR: [], GBP: [], JPY: [], CAD: [], AUD: [], NZD: [], CHF: [], CNH: [], VIX: [], Oil: [], Gold: [] }, parsed.matrixPrevBreakdown || {}),
            intermarketScores: Object.assign({ VIX: 0, Oil: 0, Gold: 0 }, parsed.intermarketScores || {}),
            dailyNotes: parsed.dailyNotes || {}
          };
        }
      }
    } catch (e) {
      console.error(e);
    }
    return {
      daysData: {},
      categoryScores: {},
      matrixEvents: { USD: 0, EUR: 0, GBP: 0, JPY: 0, CAD: 0, AUD: 0, NZD: 0, CHF: 0, CNH: 0, VIX: 0, Oil: 0, Gold: 0 },
      matrixTotals: { USD: 0, EUR: 0, GBP: 0, JPY: 0, CAD: 0, AUD: 0, NZD: 0, CHF: 0, CNH: 0, VIX: 0, Oil: 0, Gold: 0 },
      matrixPrev: { USD: 0, EUR: 0, GBP: 0, JPY: 0, CAD: 0, AUD: 0, NZD: 0, CHF: 0, CNH: 0, VIX: 0, Oil: 0, Gold: 0 },
      matrixPrevBreakdown: { USD: [], EUR: [], GBP: [], JPY: [], CAD: [], AUD: [], NZD: [], CHF: [], CNH: [], VIX: [], Oil: [], Gold: [] },
      intermarketScores: { VIX: 0, Oil: 0, Gold: 0 },
      dailyNotes: {}
    };
  });

  const [activeCurrencyFilter, setActiveCurrencyFilter] = useState<string>('ALL');
  const [filterCoreOnly, setFilterCoreOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDivergenceExpanded, setIsDivergenceExpanded] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmStyle?: 'danger' | 'warning' | 'primary';
    onConfirm: () => void;
  } | null>(null);

  const [toast, setToast] = useState<{
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [copiedReportText, setCopiedReportText] = useState<boolean>(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast(prev => (prev?.id === id ? null : prev));
    }, 4000);
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmStyle: 'danger' | 'warning' | 'primary' = 'primary',
    confirmText?: string,
    cancelText?: string
  ) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      confirmStyle,
      confirmText: confirmText || (isEs ? 'Confirmar' : 'Confirm'),
      cancelText: cancelText || (isEs ? 'Cancelar' : 'Cancel'),
      onConfirm: () => {
        setConfirmModal(null);
        onConfirm();
      }
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Sync state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('kairos_macro_engine_state_v16', JSON.stringify(globalState));
    } catch (err) {
      console.error('Storage sync error:', err);
    }
  }, [globalState]);

  // Compute live matrix events & totals
  const computedMatrix = useMemo(() => {
    const events: Record<string, number> = {
      USD: 0, EUR: 0, GBP: 0, JPY: 0, CAD: 0, AUD: 0, NZD: 0, CHF: 0, CNH: 0
    };

    Object.values(globalState.categoryScores).forEach((entry: CategoryScore) => {
      if (entry && entry.ccy && events[entry.ccy] !== undefined) {
        events[entry.ccy] += entry.score;
      }
    });

    const totals: Record<string, number> = {};
    CURRENCIES.forEach(ccy => {
      const prev = globalState.matrixPrev[ccy] !== undefined ? globalState.matrixPrev[ccy] : 0;
      const ev = events[ccy] || 0;
      totals[ccy] = prev + ev;
    });

    ['VIX', 'Oil', 'Gold'].forEach(asset => {
      const prev = globalState.matrixPrev[asset] !== undefined ? globalState.matrixPrev[asset] : 0;
      const rating = globalState.intermarketScores[asset] || 0;
      totals[asset] = prev + rating;
    });

    return { events, totals };
  }, [globalState.categoryScores, globalState.matrixPrev, globalState.intermarketScores]);

  // Evaluated events helper
  const getCurrencyEvaluatedEventsList = (ccy: string): PrevBreakdownItem[] => {
    const list: PrevBreakdownItem[] = [];
    if (['VIX', 'Oil', 'Gold'].includes(ccy)) {
      const score = globalState.intermarketScores[ccy] || 0;
      if (score !== 0) {
        list.push({
          label: isEs ? `Evaluación de ${ccy}` : `${ccy} Assessment`,
          score
        });
      }
      return list;
    }

    Object.values(globalState.categoryScores).forEach(entry => {
      if (entry && entry.ccy === ccy && entry.score !== 0) {
        list.push({
          label: entry.title || entry.eventsSummary || (isEs ? 'Evento evaluado' : 'Evaluated event'),
          score: entry.score
        });
      }
    });
    return list;
  };

  const getFullCurrencyBreakdownGrouped = (ccy: string) => {
    const prevList = globalState.matrixPrevBreakdown?.[ccy] || [];
    const prevTotal = globalState.matrixPrev?.[ccy] !== undefined ? globalState.matrixPrev[ccy] : 0;

    const currList: PrevBreakdownItem[] = [];
    Object.values(globalState.categoryScores).forEach(entry => {
      if (entry.ccy === ccy && entry.score !== 0) {
        currList.push({
          label: entry.title || entry.eventsSummary || isEs ? 'Evento evaluado' : 'Evaluated event',
          score: entry.score
        });
      }
    });

    return { prevList, prevTotal, currList };
  };

  // Divergence Calculation
  const divergences = useMemo(() => {
    const results: Array<{
      pair: string;
      actionBadge: string;
      strong: string;
      weak: string;
      strongScore: number;
      weakScore: number;
      diff: number;
    }> = [];

    for (let i = 0; i < CURRENCIES.length; i++) {
      for (let j = 0; j < CURRENCIES.length; j++) {
        if (i === j) continue;
        const c1 = CURRENCIES[i];
        const c2 = CURRENCIES[j];
        const s1 = computedMatrix.totals[c1] || 0;
        const s2 = computedMatrix.totals[c2] || 0;
        const diff = s1 - s2;

        if (diff >= 3) {
          const strong = c1;
          const weak = c2;
          let base = '';
          let quote = '';
          let actionText = '';

          const pairCandidate = `${strong}${weak}`;
          const reverseCandidate = `${weak}${strong}`;

          if (!APPROVED_PAIRS.includes(pairCandidate)) {
            if (APPROVED_PAIRS.includes(reverseCandidate)) {
              base = weak;
              quote = strong;
              actionText = isEs ? `VENTA ${base}/${quote}` : `SELL ${base}/${quote}`;
            } else {
              base = strong;
              quote = weak;
              actionText = (base === 'EUR' || base === 'GBP' || base === 'AUD' || base === 'NZD')
                ? (isEs ? `COMPRA ${base}/${quote}` : `BUY ${base}/${quote}`)
                : (isEs ? `VENTA ${base}/${quote}` : `SELL ${base}/${quote}`);
            }
          } else {
            base = strong;
            quote = weak;
            actionText = isEs ? `COMPRA ${base}/${quote}` : `BUY ${base}/${quote}`;
          }

          results.push({
            pair: `${base}/${quote}`,
            actionBadge: actionText,
            strong,
            weak,
            strongScore: computedMatrix.totals[strong] || 0,
            weakScore: computedMatrix.totals[weak] || 0,
            diff
          });
        }
      }
    }

    results.sort((a, b) => b.diff - a.diff);
    return results;
  }, [computedMatrix.totals, isEs]);

  // Handlers for Score Buttons
  const setCategoryScore = (categoryId: string, ccy: string, scoreVal: number, title: string, eventsSummary: string) => {
    setGlobalState(prev => ({
      ...prev,
      categoryScores: {
        ...prev.categoryScores,
        [categoryId]: {
          ccy,
          score: scoreVal,
          title,
          eventsSummary
        }
      }
    }));
  };

  const setIntermarketScore = (asset: string, scoreVal: number) => {
    setGlobalState(prev => ({
      ...prev,
      intermarketScores: {
        ...prev.intermarketScores,
        [asset]: scoreVal
      }
    }));
  };

  const updatePrevMatrix = (asset: string, val: string) => {
    const num = parseInt(val, 10) || 0;
    setGlobalState(prev => ({
      ...prev,
      matrixPrev: {
        ...prev.matrixPrev,
        [asset]: num
      }
    }));
  };

  const updateDailyNote = (day: string, note: string) => {
    setGlobalState(prev => ({
      ...prev,
      dailyNotes: {
        ...prev.dailyNotes,
        [day]: note
      }
    }));
  };

  // Lock Current as Previous Week
  const lockCurrentAsPreviousWeek = () => {
    const hasCategoryScores = Object.values(globalState.categoryScores || {}).some(entry => entry && entry.score !== 0);
    const hasIntermarket = Object.values(globalState.intermarketScores || {}).some(v => v !== 0);
    const hasDaysData = Object.values(globalState.daysData || {}).some(events => Array.isArray(events) && events.length > 0);
    const hasMatrixEvents = Object.values(computedMatrix.events || {}).some(v => v !== 0);

    if (!hasCategoryScores && !hasIntermarket && !hasDaysData && !hasMatrixEvents) {
      showToast(
        isEs
          ? '⚠️ No hay eventos ni evaluaciones para congelar. Evalúa eventos (+2, +1, -1, -2) o carga un calendario primero.'
          : '⚠️ No evaluated events or scores found to lock. Please score events (+2, +1, -1, -2) or upload a calendar first.',
        'error'
      );
      return;
    }

    const title = isEs ? 'Fijar como Semana Previa' : 'Lock as Prior Week Baseline';
    const msg = isEs
      ? '¿Deseas fijar la semana actual como "Semana Previa"?\n\nEsto congelará todas las evaluaciones actuales como base histórica de la matriz, y limpiará el calendario activo para que cargues el archivo de la SEMANA NUEVA.'
      : 'Lock current week as "Previous Week Baseline"?\n\nThis will freeze current evaluated scores as historical baseline factors, and reset the active calendar for your new week file.';

    showConfirm(
      title,
      msg,
      () => {
        const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NZD', 'CHF', 'CNH', 'VIX', 'Oil', 'Gold'];
        const newPrevBreakdown: Record<string, PrevBreakdownItem[]> = {};
        const newPrevTotals: Record<string, number> = {};

        currencies.forEach(ccy => {
          const eventsList = getCurrencyEvaluatedEventsList(ccy);
          newPrevBreakdown[ccy] = eventsList;
          newPrevTotals[ccy] = eventsList.reduce((acc, item) => acc + item.score, 0);
        });

        setGlobalState(prev => ({
          ...prev,
          matrixPrev: newPrevTotals,
          matrixPrevBreakdown: newPrevBreakdown,
          daysData: {},
          categoryScores: {},
          dailyNotes: {}
        }));

        showToast(
          isEs
            ? '📌 ¡Semana anterior congelada con éxito como Base Previa! Ya puedes cargar el archivo de la SEMANA ACTUAL.'
            : '📌 Prior week successfully locked as baseline! You can now upload the active trading week calendar.',
          'success'
        );
      },
      'warning',
      isEs ? 'Sí, Fijar como Base Previa' : 'Yes, Lock as Baseline'
    );
  };

  // Reset Everything
  const resetAllScores = () => {
    const title = isEs ? 'Reiniciar Todo el Tablero' : 'Reset Entire Dashboard';
    const msg = isEs
      ? '¿Reiniciar todo el tablero? Esto borrará los datos cargados, puntuaciones asignadas, base previa y notas.'
      : 'Reset entire dashboard? This will clear all uploaded data, scored event factors, prior baseline, and session notes.';

    showConfirm(
      title,
      msg,
      () => {
        try {
          localStorage.removeItem('kairos_macro_engine_state_v16');
        } catch (e) {
          console.error(e);
        }
        setGlobalState({
          daysData: {},
          categoryScores: {},
          matrixEvents: { USD: 0, EUR: 0, GBP: 0, JPY: 0, CAD: 0, AUD: 0, NZD: 0, CHF: 0, CNH: 0, VIX: 0, Oil: 0, Gold: 0 },
          matrixTotals: { USD: 0, EUR: 0, GBP: 0, JPY: 0, CAD: 0, AUD: 0, NZD: 0, CHF: 0, CNH: 0, VIX: 0, Oil: 0, Gold: 0 },
          matrixPrev: { USD: 0, EUR: 0, GBP: 0, JPY: 0, CAD: 0, AUD: 0, NZD: 0, CHF: 0, CNH: 0, VIX: 0, Oil: 0, Gold: 0 },
          matrixPrevBreakdown: { USD: [], EUR: [], GBP: [], JPY: [], CAD: [], AUD: [], NZD: [], CHF: [], CNH: [], VIX: [], Oil: [], Gold: [] },
          intermarketScores: { VIX: 0, Oil: 0, Gold: 0 },
          dailyNotes: {}
        });
        showToast(
          isEs ? '🗑️ Tablero macro restablecido a valores iniciales.' : '🗑️ Macro dashboard reset to clean baseline.',
          'info'
        );
      },
      'danger',
      isEs ? 'Sí, Reiniciar Todo' : 'Yes, Reset All'
    );
  };

  // Export JSON Backup
  const exportStateJSON = () => {
    try {
      const fullState = {
        ...globalState,
        matrixEvents: computedMatrix.events,
        matrixTotals: computedMatrix.totals
      };
      const cleanState = JSON.parse(JSON.stringify(fullState));
      const dataStr = JSON.stringify(cleanState, null, 2);
      const fileName = `kairos_macro_hub_backup_${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8;' });

      if ((window.navigator as any)?.msSaveOrOpenBlob) {
        (window.navigator as any).msSaveOrOpenBlob(blob, fileName);
        showToast(isEs ? 'Respaldo JSON descargado con éxito.' : 'JSON backup downloaded successfully.', 'success');
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
      showToast(isEs ? 'Respaldo JSON generado con éxito.' : 'JSON backup generated successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast(isEs ? 'Error al exportar el archivo JSON.' : 'Error exporting JSON backup file.', 'error');
    }
  };

  // Import JSON Backup
  const importStateJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          if (parsed.daysData && Object.keys(parsed.daysData).length > 0) {
            const reevaluatedDaysData: Record<string, MacroEvent[]> = {};
            Object.keys(parsed.daysData).forEach(day => {
              const events = parsed.daysData[day] || [];
              reevaluatedDaysData[day] = events.map((item: any) => {
                let cleanTime = item.time || "—";
                if (typeof cleanTime === 'string' && (cleanTime.includes("1899") || cleanTime.includes("1900"))) {
                   const timeMatch = cleanTime.match(/\b(\d{1,2}:\d{2})(:\d{2})?\b/);
                   if (timeMatch) cleanTime = timeMatch[1];
                   else cleanTime = "—";
                }

                const ruleId = getCoreRuleId(item.ccy, item.event);
                return {
                  ...item,
                  time: cleanTime,
                  coreRuleId: ruleId,
                  isCore: Boolean(ruleId)
                };
              });
            });

            setGlobalState({
              daysData: reevaluatedDaysData,
              categoryScores: parsed.categoryScores || {},
              matrixEvents: parsed.matrixEvents || {},
              matrixTotals: parsed.matrixTotals || {},
              matrixPrev: Object.assign({ USD: 0, EUR: 0, GBP: 0, JPY: 0, CAD: 0, AUD: 0, NZD: 0, CHF: 0, CNH: 0, VIX: 0, Oil: 0, Gold: 0 }, parsed.matrixPrev || {}),
              matrixPrevBreakdown: Object.assign({ USD: [], EUR: [], GBP: [], JPY: [], CAD: [], AUD: [], NZD: [], CHF: [], CNH: [], VIX: [], Oil: [], Gold: [] }, parsed.matrixPrevBreakdown || {}),
              intermarketScores: Object.assign({ VIX: 0, Oil: 0, Gold: 0 }, parsed.intermarketScores || {}),
              dailyNotes: parsed.dailyNotes || {}
            });
            showToast(
              isEs
                ? '¡Respaldo cargado con éxito! Todos los eventos fueron re-evaluados con las reglas actuales.'
                : 'Backup loaded successfully! All events re-evaluated under current macro rules.',
              'success'
            );
          } else {
            showToast(isEs ? 'El archivo JSON no contiene un calendario estructurado válido.' : 'JSON file does not contain a valid calendar structure.', 'error');
          }
        }
      } catch (err) {
        console.error(err);
        showToast(isEs ? 'Archivo JSON inválido o corrupto.' : 'Invalid JSON file.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Generate Institutional Printable HTML Report
  const generateReportHTML = () => {
    const title = isEs ? "CALENDARIO ECONÓMICO SEMANAL — REPORTE INSTITUCIONAL DE RIESGO" : "WEEKLY ECONOMIC CALENDAR — INSTITUTIONAL RISK REPORT";
    const subtitle = isEs ? "Kairos Global Research · Motor Cuantitativo Integrado de Inteligencia Macro" : "Kairos Global Research · Integrated Quantitative Macro Intelligence Engine";
    const dateStr = new Date().toLocaleDateString(isEs ? 'es-ES' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let daysHtml = '';
    const dayKeys = Object.keys(globalState.daysData || {});
    if (dayKeys.length === 0) {
      daysHtml = `<p style="padding: 20px; text-align: center; color: #64748b; font-style: italic;">${isEs ? 'No hay eventos evaluados cargados en el calendario activo.' : 'No evaluated events loaded in active calendar.'}</p>`;
    } else {
      dayKeys.forEach(day => {
        let events = (globalState.daysData[day] || []).filter(e => isWhitelisted(e.ccy, e.event));
        if (filterCoreOnly) events = events.filter(e => e.isCore);
        if (events.length === 0) return;

        let rowsHtml = '';
        let currentBlock: MacroEvent[] = [];

        events.forEach((item, idx) => {
          currentBlock.push(item);
          const nextItem = events[idx + 1];
          const currentCategory = getCategorySentimentTitle(item.ccy, item.event, isEs);
          const nextCategory = nextItem ? getCategorySentimentTitle(nextItem.ccy, nextItem.event, isEs) : null;

          const isCore = item.isCore;
          rowsHtml += `
            <tr style="border-bottom: 1px solid #e2e8f0; ${isCore ? 'background-color: #fef3c7;' : ''}">
              <td style="padding: 5px 6px; font-family: monospace; font-size: 10px;">${item.time}</td>
              <td style="padding: 5px 6px; font-weight: bold; font-size: 10px;">${item.ccy}</td>
              <td style="padding: 5px 6px; font-size: 10px; ${isCore ? 'font-weight: bold; color: #92400e;' : 'color: #0f172a;'}">${item.event} ${isCore ? '🎯' : ''}</td>
              <td style="padding: 5px 6px; font-weight: bold; font-size: 10px; text-align: right;">${item.actual || '—'}</td>
              <td style="padding: 5px 6px; font-size: 10px; text-align: right; color: #64748b;">${item.forecast || '—'}</td>
              <td style="padding: 5px 6px; font-size: 10px; text-align: right; color: #64748b;">${item.previous || '—'}</td>
            </tr>
          `;

          if (!nextItem || nextItem.ccy !== item.ccy || nextCategory !== currentCategory) {
            const smartTitle = getSmartGroupTitle(item.ccy, currentBlock, isEs);
            const matchingScore = Object.values(globalState.categoryScores || {}).find(
              cs => cs.ccy === item.ccy && (cs.title === smartTitle || cs.eventsSummary.includes(item.event))
            );
            const scoreVal = matchingScore ? matchingScore.score : 0;
            const scoreColor = scoreVal > 0 ? '#166534' : (scoreVal < 0 ? '#991b1b' : '#475569');
            const scoreBg = scoreVal > 0 ? '#dcfce7' : (scoreVal < 0 ? '#fee2e2' : '#f1f5f9');
            const formattedVal = scoreVal > 0 ? `+${scoreVal}` : `${scoreVal}`;

            rowsHtml += `
              <tr style="background-color: #fefce8; border-top: 1px solid #e2e8f0; border-bottom: 2px solid #cbd5e1;">
                <td colspan="5" style="padding: 6px 8px; font-weight: bold; font-size: 10px; color: #854d0e; font-style: italic;">
                  📊 ${smartTitle}
                </td>
                <td style="padding: 4px; text-align: center;">
                  <span style="display: inline-block; padding: 2px 6px; border-radius: 3px; font-weight: bold; font-size: 10px; font-family: monospace; color: ${scoreColor}; background-color: ${scoreBg};">
                    ${formattedVal}
                  </span>
                </td>
              </tr>
            `;
            currentBlock = [];
          }
        });

        const dayNote = globalState.dailyNotes[day] || '';
        daysHtml += `
          <div style="margin-top: 18px; page-break-inside: avoid;">
            <div style="background-color: #0f172a; color: white; padding: 6px 10px; font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">
              ${day}
            </div>
            <table style="width: 100%; border-collapse: collapse; font-family: sans-serif;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 2px solid #0f172a; text-align: left; font-size: 10px; color: #475569;">
                  <th style="padding: 6px; width: 10%;">${isEs ? 'HORA' : 'TIME'}</th>
                  <th style="padding: 6px; width: 8%;">${isEs ? 'DIVISA' : 'CCY'}</th>
                  <th style="padding: 6px; width: 44%;">${isEs ? 'CATALIZADOR / EVENTO' : 'CATALYST / EVENT'}</th>
                  <th style="padding: 6px; width: 12%; text-align: right;">${isEs ? 'ACTUAL' : 'ACTUAL'}</th>
                  <th style="padding: 6px; width: 13%; text-align: right;">${isEs ? 'PRONÓSTICO' : 'FORECAST'}</th>
                  <th style="padding: 6px; width: 13%; text-align: center;">${isEs ? 'PREV / EVAL' : 'PREV / SCORE'}</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
            ${dayNote ? `
              <div style="border: 1px dashed #cbd5e1; background: #fafafa; padding: 6px 10px; margin-top: 6px; border-radius: 4px; font-size: 10px; color: #334155;">
                <strong>${isEs ? 'Notas del Analista:' : 'Analyst Notes:'}</strong> ${dayNote}
              </div>
            ` : ''}
          </div>
        `;
      });
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #ffffff; color: #0f172a; margin: 0; padding: 20px; line-height: 1.4; }
    .report-card { max-width: 900px; margin: 0 auto; }
    h1 { font-size: 16px; margin: 0; color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
    h2 { font-size: 10px; color: #64748b; margin: 4px 0 16px 0; font-weight: normal; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th, td { padding: 4px 6px; }
    .matrix-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px; margin-bottom: 16px; }
    .matrix-title { font-weight: bold; font-size: 11px; color: #0f172a; margin-bottom: 6px; text-transform: uppercase; }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      .page-break { page-break-before: always; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>
  <div class="report-card">
    <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 12px;">
      <div>
        <h1 style="border: none; padding: 0;">${title}</h1>
        <h2>${subtitle}</h2>
      </div>
      <div style="font-size: 9px; color: #64748b; font-family: monospace; text-align: right;">
        ${dateStr}
      </div>
    </div>

    <!-- Matrix Summary Table -->
    <div class="matrix-box">
      <div class="matrix-title">${isEs ? 'MATRIZ DE FUERZA CUANTITATIVA RELATIVA (G10 + INTERMERCADO)' : 'RELATIVE QUANTITATIVE STRENGTH MATRIX (G10 + INTERMARKET)'}</div>
      <table>
        <thead>
          <tr style="background-color: #0f172a; color: white;">
            <th style="text-align: left; width: 40%;">${isEs ? 'ACTIVO / DIVISA' : 'ASSET / CURRENCY'}</th>
            <th style="text-align: center; width: 20%;">${isEs ? 'BASE PREVIA' : 'PRIOR BASELINE'}</th>
            <th style="text-align: center; width: 20%;">${isEs ? 'ESTA SEMANA' : 'ACTIVE WEEK'}</th>
            <th style="text-align: center; width: 20%;">${isEs ? 'TOTAL COMBINADO' : 'NET TOTAL'}</th>
          </tr>
        </thead>
        <tbody>
          <tr style="background-color: #e2e8f0; font-weight: bold;"><td colspan="4" style="color: #0f172a; font-size: 9px;">${isEs ? 'SECCIÓN A: DIVISAS G10 FOREX CORE' : 'SECTION A: G10 FOREX CORE CURRENCIES'}</td></tr>
          ${['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NZD', 'CHF', 'CNH'].map(ccy => {
            const prev = globalState.matrixPrev[ccy] || 0;
            const active = computedMatrix.events[ccy] || 0;
            const net = computedMatrix.totals[ccy] || 0;
            return `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="font-weight: bold;">${ccy}</td>
                <td style="text-align: center; color: #64748b;">${prev > 0 ? '+' : ''}${prev}</td>
                <td style="text-align: center; color: #0f172a;">${active > 0 ? '+' : ''}${active}</td>
                <td style="text-align: center; font-weight: bold; color: ${net > 0 ? '#166534' : (net < 0 ? '#991b1b' : '#475569')};">${net > 0 ? '+' : ''}${net}</td>
              </tr>
            `;
          }).join('')}
          <tr style="background-color: #e2e8f0; font-weight: bold;"><td colspan="4" style="color: #0f172a; font-size: 9px;">${isEs ? 'SECCIÓN B: CATALIZADORES INTERMERCADO Y RIESGO' : 'SECTION B: INTERMARKET CATALYSTS & RISK'}</td></tr>
          ${[
            ['VIX', isEs ? 'VIX (Índice de Volatilidad)' : 'VIX (Volatility Index)'],
            ['Oil', isEs ? 'Petróleo (Crudo WTI)' : 'Crude Oil (WTI)'],
            ['Gold', isEs ? 'Oro (XAU/USD)' : 'Gold (XAU/USD)']
          ].map(([asset, label]) => {
            const prev = globalState.matrixPrev[asset] || 0;
            const active = globalState.intermarketScores[asset] || 0;
            const net = (globalState.matrixTotals[asset] !== undefined) ? globalState.matrixTotals[asset] : (prev + active);
            return `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="font-weight: bold;">${label}</td>
                <td style="text-align: center; color: #64748b;">${prev > 0 ? '+' : ''}${prev}</td>
                <td style="text-align: center; color: #0f172a;">${active > 0 ? '+' : ''}${active}</td>
                <td style="text-align: center; font-weight: bold; color: ${net > 0 ? '#166534' : (net < 0 ? '#991b1b' : '#475569')};">${net > 0 ? '+' : ''}${net}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Day Events Breakdown -->
    ${daysHtml}

    <div style="margin-top: 30px; border-top: 1px solid #cbd5e1; padding-top: 8px; text-align: center; font-size: 8px; color: #94a3b8; font-family: monospace;">
      ${isEs ? 'Inteligencia Institucional de Riesgo Macro · Kairos Global Research Engine' : 'Institutional Macro Risk Intelligence · Kairos Global Research Engine'}
    </div>
  </div>
</body>
</html>`;
  };

  const handleDownloadHTMLReport = () => {
    try {
      const htmlContent = generateReportHTML();
      const fileName = `kairos_macro_report_${new Date().toISOString().slice(0, 10)}.html`;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        if (document.body.contains(a)) document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1500);
      showToast(isEs ? 'Reporte HTML descargado con éxito.' : 'HTML report downloaded successfully.', 'success');
    } catch (err) {
      console.error(err);
      showToast(isEs ? 'Error al generar descarga de reporte.' : 'Failed to download report file.', 'error');
    }
  };

  const handleCopyReportText = () => {
    try {
      const textLines: string[] = [];
      textLines.push(isEs ? '=== REPORTE SEMANAL MACRO KAIROS ===' : '=== KAIROS WEEKLY MACRO REPORT ===');
      textLines.push(`Date: ${new Date().toISOString().slice(0, 10)}`);
      textLines.push('');
      textLines.push(isEs ? '--- MATRIZ DE FUERZA G10 FOREX ---' : '--- G10 FOREX STRENGTH MATRIX ---');
      ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NZD', 'CHF', 'CNH'].forEach(ccy => {
        const net = computedMatrix.totals[ccy] || 0;
        const prev = globalState.matrixPrev[ccy] || 0;
        const act = computedMatrix.events[ccy] || 0;
        textLines.push(`${ccy}: Prior ${prev >= 0 ? '+' : ''}${prev} | Active ${act >= 0 ? '+' : ''}${act} | Net Total: ${net >= 0 ? '+' : ''}${net}`);
      });
      textLines.push('');
      textLines.push(isEs ? '--- INTERMERCADO ---' : '--- INTERMARKET ---');
      ['VIX', 'Oil', 'Gold'].forEach(asset => {
        const net = (globalState.matrixTotals[asset] !== undefined) ? globalState.matrixTotals[asset] : (globalState.matrixPrev[asset] || 0) + (globalState.intermarketScores[asset] || 0);
        textLines.push(`${asset}: Net Score ${net >= 0 ? '+' : ''}${net}`);
      });

      if (divergences.length > 0) {
        textLines.push('');
        textLines.push(isEs ? '--- DIVERGENCIAS DETECTADAS ---' : '--- DETECTED DIVERGENCES ---');
        divergences.forEach(d => {
          textLines.push(`${d.actionBadge} (Spread: +${d.diff}) [${d.strong}: +${d.strongScore} vs ${d.weak}: ${d.weakScore}]`);
        });
      }

      navigator.clipboard.writeText(textLines.join('\n'));
      setCopiedReportText(true);
      showToast(isEs ? 'Resumen copiado al portapapeles.' : 'Summary copied to clipboard.', 'success');
      setTimeout(() => setCopiedReportText(false), 2500);
    } catch (err) {
      console.error(err);
      showToast(isEs ? 'Error al copiar al portapapeles.' : 'Failed to copy summary to clipboard.', 'error');
    }
  };

  const handlePrintReport = () => {
    try {
      window.print();
    } catch (err) {
      console.warn('window.print() prevented, falling back to HTML download:', err);
      handleDownloadHTMLReport();
    }
  };

  // Process Spreadsheet Files (CSV, XLSX, XLS)
  const COUNTRY_MAP: Record<string, string> = {
    'US': 'USD', 'USA': 'USD', 'UNITED STATES': 'USD', 'ESTADOS UNIDOS': 'USD',
    'DE': 'EUR', 'DEU': 'EUR', 'GERMANY': 'EUR', 'ALEMANIA': 'EUR',
    'FR': 'EUR', 'FRA': 'EUR', 'FRANCE': 'EUR', 'FRANCIA': 'EUR',
    'IT': 'EUR', 'ITA': 'EUR', 'ITALY': 'EUR', 'ITALIA': 'EUR',
    'ES': 'EUR', 'ESP': 'EUR', 'SPAIN': 'EUR', 'ESPAÑA': 'EUR',
    'EU': 'EUR', 'EMU': 'EUR', 'EURO ZONE': 'EUR', 'EUROZONE': 'EUR', 'ZONA EURO': 'EUR',
    'UK': 'GBP', 'GB': 'GBP', 'GBR': 'GBP', 'UNITED KINGDOM': 'GBP', 'REINO UNIDO': 'GBP',
    'JP': 'JPY', 'JPN': 'JPY', 'JAPAN': 'JPY', 'JAPON': 'JPY', 'JAPÓN': 'JPY',
    'AU': 'AUD', 'AUS': 'AUD', 'AUSTRALIA': 'AUD',
    'NZ': 'NZD', 'NZL': 'NZD', 'NEW ZEALAND': 'NZD', 'NUEVA ZELANDA': 'NZD',
    'CA': 'CAD', 'CAN': 'CAD', 'CANADA': 'CAD', 'CANADÁ': 'CAD',
    'CH': 'CHF', 'CHE': 'CHF', 'SWITZERLAND': 'CHF', 'SUIZA': 'CHF',
    'CN': 'CNH', 'CHN': 'CNH', 'CNY': 'CNH', 'CHINA': 'CNH',
    'USD': 'USD', 'EUR': 'EUR', 'GBP': 'GBP', 'JPY': 'JPY',
    'AUD': 'AUD', 'NZD': 'NZD', 'CAD': 'CAD', 'CHF': 'CHF', 'CNH': 'CNH'
  };

  const processSpreadsheetRows = (rawRows: any[][]) => {
    if (!rawRows || rawRows.length === 0) {
      showToast(isEs ? 'El archivo no contiene filas legibles.' : 'No readable data rows found in the file.', 'error');
      return;
    }

    const parsedDaysData: Record<string, MacroEvent[]> = {};
    let currentDay = isEs ? 'LUNES (GENERAL)' : 'MONDAY (GENERAL)';

    // 1. Detect Header Column Indices if present
    const colIdx = {
      date: -1,
      time: -1,
      ccy: -1,
      event: -1,
      actual: -1,
      forecast: -1,
      previous: -1
    };

    let headerRowIdx = -1;
    for (let r = 0; r < Math.min(rawRows.length, 5); r++) {
      const row = (rawRows[r] || []).map(c => String(c || '').trim().toLowerCase());
      const hasEventHeader = row.some(c => c === 'event' || c === 'indicator' || c === 'evento' || c === 'indicador');
      const hasCcyHeader = row.some(c => c === 'cur.' || c === 'cur' || c === 'currency' || c === 'divisa' || c === 'moneda' || c === 'country' || c === 'pais');
      if (hasEventHeader || hasCcyHeader) {
        headerRowIdx = r;
        row.forEach((cell, idx) => {
          if (['date', 'fecha', 'day', 'dia'].includes(cell)) colIdx.date = idx;
          if (['time', 'hora', 'time (et)', 'time (utc)'].includes(cell)) colIdx.time = idx;
          if (['cur.', 'cur', 'currency', 'divisa', 'moneda', 'country', 'pais', 'zone'].includes(cell)) colIdx.ccy = idx;
          if (['event', 'indicator', 'evento', 'indicador', 'economic calendar'].includes(cell)) colIdx.event = idx;
          if (['actual', 'act', 'actual value'].includes(cell)) colIdx.actual = idx;
          if (['forecast', 'consensus', 'fcst', 'prevision', 'previsión', 'expected'].includes(cell)) colIdx.forecast = idx;
          if (['previous', 'prior', 'prev', 'anterior'].includes(cell)) colIdx.previous = idx;
        });
        break;
      }
    }

    // Helper to format a Date into standardized day header
    const formatDayString = (d: Date): string => {
      const dayNames = isEs
        ? ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO']
        : ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const dayName = dayNames[d.getUTCDay()];
      const dateStr = d.toLocaleDateString(isEs ? 'es-ES' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).toUpperCase();
      return `${dayName}, ${dateStr}`;
    };

    rawRows.forEach((row, rowIndex) => {
      if (!row || row.length === 0 || rowIndex === headerRowIdx) return;
      const cleanRow = row.map((cell: any) => {
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
      const fullRowText = cleanRow.join(' ').toLowerCase();
      if (!fullRowText) return;

      // 2. Date Detection
      let detectedDay = '';
      const dayNameRegex = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)[,\s]+([a-z]+|\d{1,2})[,\s]+(\d{1,2}|\d{4})/i;
      const dateMatch = fullRowText.match(dayNameRegex);

      if (dateMatch) {
        detectedDay = dateMatch[0].toUpperCase();
      } else {
        const dateCandidates = colIdx.date !== -1 && cleanRow[colIdx.date]
          ? [cleanRow[colIdx.date]]
          : cleanRow.slice(0, 3);

        for (const cell of dateCandidates) {
          if (!cell) continue;
          if (cell.includes('/') || cell.includes('-') || cell.includes('.') || /^\d{5}(\.\d+)?$/.test(cell)) {
            let d: Date | null = null;
            if (/^\d{5}(\.\d+)?$/.test(cell)) {
              const serial = parseFloat(cell);
              if (serial > 40000 && serial < 60000) {
                d = new Date(Math.round((serial - 25569) * 86400 * 1000));
              }
            } else {
              const tryDate = new Date(cell);
              if (!isNaN(tryDate.getTime()) && tryDate.getFullYear() > 2000 && tryDate.getFullYear() < 2100) {
                d = tryDate;
              } else {
                const parts = cell.split(/[/.-]/);
                if (parts.length === 3) {
                  const p0 = parseInt(parts[0], 10);
                  const p1 = parseInt(parts[1], 10);
                  const p2 = parseInt(parts[2], 10);
                  const year = p2 < 100 ? p2 + 2000 : p2;
                  let month = 0;
                  let day = 1;
                  if (p0 > 12) {
                    day = p0;
                    month = p1 - 1;
                  } else {
                    month = p0 - 1;
                    day = p1;
                  }
                  d = new Date(Date.UTC(year, month, day));
                }
              }
            }
            if (d && !isNaN(d.getTime())) {
              detectedDay = formatDayString(d);
              break;
            }
          }
        }
      }

      if (detectedDay) {
        currentDay = detectedDay;
        if (!parsedDaysData[currentDay]) parsedDaysData[currentDay] = [];
      }

      // Check if this row is ONLY a date header with no indicator data
      // Check if this row is ONLY a date header with no indicator data
      const hasAnyCcy = cleanRow.some(c => {
        const norm = normalizeCurrencyCode(c);
        return isG10Currency(norm) || CURRENCIES.includes(norm) || COUNTRY_MAP[c.toUpperCase()] !== undefined;
      });
      const nonEmptyCells = cleanRow.filter(Boolean);
      if (detectedDay && !hasAnyCcy && nonEmptyCells.length <= 2) {
        return; // Date header only
      }

      // 3. Extract Event Fields
      let time = '';
      let ccy = '';
      let event = '';
      let actual = '';
      let forecast = '';
      let previous = '';

      if (colIdx.event !== -1 && cleanRow[colIdx.event]) {
        event = cleanRow[colIdx.event];
        if (colIdx.time !== -1) time = cleanRow[colIdx.time] || '';
        if (colIdx.ccy !== -1) {
          const rawC = cleanRow[colIdx.ccy];
          const norm = normalizeCurrencyCode(rawC);
          ccy = isG10Currency(norm) || CURRENCIES.includes(norm) ? norm : (COUNTRY_MAP[rawC.toUpperCase()] || '');
        }
        if (colIdx.actual !== -1) actual = cleanRow[colIdx.actual] || '';
        if (colIdx.forecast !== -1) forecast = cleanRow[colIdx.forecast] || '';
        if (colIdx.previous !== -1) previous = cleanRow[colIdx.previous] || '';
      }

      // Fallback: heuristic positional scanning if column headers not matched or incomplete
      if (!event || !ccy) {
        let foundCcyIdx = -1;
        for (let i = 0; i < Math.min(cleanRow.length, 6); i++) {
          const cellVal = cleanRow[i];
          const norm = normalizeCurrencyCode(cellVal);
          if (isG10Currency(norm) || CURRENCIES.includes(norm) || COUNTRY_MAP[cellVal.toUpperCase()]) {
            foundCcyIdx = i;
            ccy = isG10Currency(norm) || CURRENCIES.includes(norm) ? norm : (COUNTRY_MAP[cellVal.toUpperCase()] || cellVal);
            break;
          }
        }

        if (foundCcyIdx !== -1) {
          for (let i = 0; i < foundCcyIdx; i++) {
            if (/^\d{1,2}:\d{2}/.test(cleanRow[i]) || /^\d{1,2}\.\d{2}/.test(cleanRow[i])) {
              time = cleanRow[i];
              break;
            }
          }

          let eventIdx = -1;
          for (let i = foundCcyIdx + 1; i < cleanRow.length; i++) {
            const val = cleanRow[i].trim();
            if (/^(high|medium|low|vol\.|bull|\d|★|\s*)$/i.test(val)) continue;
            eventIdx = i;
            event = val;
            break;
          }

          if (eventIdx !== -1) {
            const postEvent = cleanRow.slice(eventIdx + 1).filter(c => c.trim() !== '');
            if (postEvent.length >= 3) {
              actual = postEvent[0];
              forecast = postEvent[1];
              previous = postEvent[2];
            } else if (postEvent.length === 2) {
              actual = postEvent[0];
              forecast = postEvent[1];
            } else if (postEvent.length === 1) {
              actual = postEvent[0];
            }
          }
        }
      }

      if (!ccy || !event) return;
      const normalizedCcy = normalizeCurrencyCode(ccy);
      if (isG10Currency(normalizedCcy) || CURRENCIES.includes(normalizedCcy)) {
        ccy = normalizedCcy;
      } else if (COUNTRY_MAP[ccy]) {
        ccy = COUNTRY_MAP[ccy];
      }
      if (!CURRENCIES.includes(ccy)) return;

      if (isWhitelisted(ccy, event)) {
        if (!parsedDaysData[currentDay]) parsedDaysData[currentDay] = [];
        const ruleId = getCoreRuleId(ccy, event);
        parsedDaysData[currentDay].push({
          time,
          ccy,
          event,
          actual,
          forecast,
          previous,
          coreRuleId: ruleId,
          isCore: Boolean(ruleId)
        });
      }
    });

    const totalEvents = Object.values(parsedDaysData).reduce((sum, evs) => sum + evs.length, 0);
    const dayCount = Object.keys(parsedDaysData).filter(k => parsedDaysData[k].length > 0).length;

    if (totalEvents > 0) {
      // Clean up empty days
      const filteredDaysData: Record<string, MacroEvent[]> = {};
      Object.keys(parsedDaysData).forEach(k => {
        if (parsedDaysData[k].length > 0) filteredDaysData[k] = parsedDaysData[k];
      });

      setGlobalState(prev => ({
        ...prev,
        daysData: filteredDaysData,
        categoryScores: {}
      }));
      showToast(
        isEs
          ? `✅ ¡Carga exitosa! Se importaron ${totalEvents} eventos macroeconómicos distribuidos en ${dayCount} jornadas.`
          : `✅ Upload successful! Imported ${totalEvents} macroeconomic events across ${dayCount} sessions.`,
        'success'
      );
    } else {
      showToast(
        isEs
          ? 'No se pudieron extraer eventos con formato macro. Verifica que el archivo provenga de Investing.com (.csv o .xlsx).'
          : 'Could not extract macroeconomic events. Please ensure the file is from Investing.com (.csv or .xlsx).',
        'error'
      );
    }
  };

  const processUploadedFile = (file: File) => {
    if (!file) return;
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv') || fileName.endsWith('.tsv') || fileName.endsWith('.txt')) {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          processSpreadsheetRows(results.data as any[][]);
        },
        error: (err) => {
          showToast((isEs ? 'Error al procesar archivo CSV: ' : 'Error parsing CSV file: ') + err.message, 'error');
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          processSpreadsheetRows(json);
        } catch (err: any) {
          console.error('Excel parse error:', err);
          showToast(
            isEs
              ? 'Error al procesar el archivo Excel. Verifica que sea un archivo válido (.xlsx o .xls).'
              : 'Error parsing Excel spreadsheet. Please ensure it is a valid .xlsx or .xls file.',
            'error'
          );
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const getScoreScaleStyle = (score: number) => {
    if (score >= 4) return 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/60 font-black shadow-[0_0_8px_rgba(16,185,129,0.2)]';
    if (score >= 1) return 'bg-yellow-950/70 text-yellow-300 border border-yellow-500/50 font-bold';
    if (score === 0) return 'bg-zinc-800/80 text-zinc-300 border border-zinc-700/60 font-medium';
    if (score >= -3) return 'bg-orange-950/70 text-orange-300 border border-orange-500/50 font-bold';
    return 'bg-rose-950/80 text-rose-300 border border-rose-500/60 font-black shadow-[0_0_8px_rgba(244,63,94,0.2)]';
  };

  const getCurrencyBadgeClass = (ccy: string) => {
    switch (ccy) {
      case 'USD': return 'bg-[#D9E1F2] text-[#0f172a]';
      case 'EUR': return 'bg-[#FFF2CC] text-[#0f172a]';
      case 'GBP': return 'bg-[#E2EFDA] text-[#0f172a]';
      case 'JPY': return 'bg-[#FCE4D6] text-[#0f172a]';
      case 'CAD': return 'bg-[#E1D5E7] text-[#0f172a]';
      case 'AUD': return 'bg-[#D5E8D4] text-[#0f172a]';
      case 'NZD': return 'bg-[#DAE8FC] text-[#0f172a]';
      case 'CHF': return 'bg-[#F8CECC] text-[#0f172a]';
      case 'CNH':
      case 'CNY': return 'bg-[#FFE6CC] text-[#0f172a]';
      default: return 'bg-[#E2E8F0] text-[#0f172a]';
    }
  };

  const forexCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NZD', 'CHF', 'CNH'];
  const intermarketAssets = [
    { id: 'VIX', name: isEs ? 'VIX (Volatilidad)' : 'VIX Volatility' },
    { id: 'Oil', name: isEs ? 'Petróleo (Crudo WTI)' : 'Crude Oil (WTI)' },
    { id: 'Gold', name: isEs ? 'Oro (XAU/USD)' : 'Gold (XAU/USD)' }
  ];

  return (
    <div className="w-full bg-[#020203] text-zinc-300 font-sans antialiased min-h-screen space-y-6 pb-16 selection:bg-cyan-900 selection:text-cyan-100">
      
      {/* 1. TOP HERO / HEADER SECTION */}
      <section className="relative w-full py-10 sm:py-12 border-b border-zinc-900 bg-[#020203]">
        <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex flex-col md:flex-row md:items-end justify-between gap-6 font-mono">
          <div className="space-y-3">
            {onReturnToHub && (
              <button 
                type="button"
                onClick={onReturnToHub} 
                className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-cyan-400 transition-colors uppercase cursor-pointer"
              >
                &larr; {isEs ? 'Volver al Centro de Herramientas' : 'Return to Tools Hub'}
              </button>
            )}
            <div className="flex items-center gap-3">
              <span className="text-cyan-500 font-bold text-[10px] tracking-widest uppercase">// CALENDAR FILTER_V2</span>
              <span className="text-zinc-700">|</span>
              <span className="text-emerald-400 font-bold text-[10px] tracking-wider uppercase">11 ECONOMIES</span>
              <span className="text-zinc-700">|</span>
              <span className="text-cyan-400 font-bold text-[10px] tracking-wider uppercase">TIER-1 MACRO</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
              {isEs ? 'Herramienta de Filtrado de Calendario' : 'Calendar Filtering Tool'}
            </h1>
            <p className="text-xs text-zinc-400 font-sans max-w-2xl font-light leading-relaxed">
              {isEs 
                ? 'Filtro programático de canales por país a través de 11 economías principales. Filtra dinámicamente eventos Tier-1, periodos de silencio y desviaciones del consenso.'
                : 'Programmatic country channel filter across 11 major global economies. Dynamically filters high-impact tier-1 releases, blackout windows, and consensus deviations.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
            <button
              type="button"
              onClick={lockCurrentAsPreviousWeek}
              className="px-3 py-1.5 text-[10px] uppercase tracking-wider bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 rounded-sm border border-amber-600/60 transition font-bold cursor-pointer min-h-[36px] flex items-center gap-1.5"
              title={isEs ? 'Congelar semana actual como base previa' : 'Lock current week as baseline factors'}
            >
              <span>📌</span> {isEs ? 'Fijar como Semana Previa' : 'Lock as Prior Week'}
            </button>
            
            <button
              type="button"
              onClick={exportStateJSON}
              className="px-3 py-1.5 text-[10px] uppercase tracking-wider bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 rounded-sm border border-cyan-800/80 transition cursor-pointer min-h-[36px] flex items-center gap-1.5 font-bold"
            >
              <span>📥</span> {isEs ? 'Exportar Backup' : 'Export JSON'}
            </button>
            
            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className="px-3 py-1.5 text-[10px] uppercase tracking-wider bg-[#0c0c12] hover:bg-zinc-900 text-zinc-300 rounded-sm border border-zinc-800 transition cursor-pointer min-h-[36px] flex items-center gap-1.5"
            >
              <span>📤</span> {isEs ? 'Cargar Backup' : 'Load JSON'}
            </button>
            <input
              type="file"
              ref={jsonInputRef}
              accept=".json"
              className="hidden"
              onChange={importStateJSON}
            />

            <button
              type="button"
              onClick={resetAllScores}
              className="px-3 py-1.5 text-[10px] uppercase tracking-wider bg-[#0c0c12] hover:bg-zinc-900 text-rose-400 rounded-sm border border-zinc-800 transition cursor-pointer min-h-[36px] flex items-center gap-1.5"
            >
              <span>🗑️</span> {isEs ? 'Reiniciar' : 'Reset'}
            </button>

            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider bg-cyan-500 hover:bg-cyan-400 text-black rounded-sm font-black transition cursor-pointer min-h-[36px] flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
            >
              <span>📄</span> {isEs ? 'Exportar PDF →' : 'Export PDF →'}
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-6">

        {/* 2. DROP ZONE FOR EXCEL & CSV UPLOAD */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={e => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(true);
          }}
          onDragOver={e => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(true);
          }}
          onDragLeave={e => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
          }}
          onDrop={e => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);
            if (e.dataTransfer?.files?.length) {
              processUploadedFile(e.dataTransfer.files[0]);
            }
          }}
          className={`macro-panel border-2 border-dashed p-6 sm:p-8 text-center transition cursor-pointer group ${
            isDragOver ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_25px_rgba(6,182,212,0.3)]' : 'border-zinc-800 hover:border-cyan-500/60'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv, .xlsx, .xls, .tsv, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="hidden"
            onChange={e => {
              if (e.target.files?.length) {
                processUploadedFile(e.target.files[0]);
                e.target.value = '';
              }
            }}
          />
          <div className="space-y-2">
            <div className="w-12 h-12 mx-auto bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-xs sm:text-sm font-medium text-zinc-200">
              {isEs ? (
                <>Arrastra tu archivo <span className="text-cyan-400 font-bold">Excel o CSV de Investing.com (.xlsx, .xls, .csv) aquí</span> o haz clic para explorar</>
              ) : (
                <>Drop your <span className="text-cyan-400 font-bold">Investing.com Excel or CSV (.xlsx, .xls, .csv) file here</span> or click to browse</>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 font-mono">
              {isEs 
                ? 'Filtrado cuantitativo automático de eventos Tier-1 para USD, EUR, GBP, JPY, CAD, AUD, NZD, CHF, CNH'
                : 'Automated quantitative Tier-1 event parsing for USD, EUR, GBP, JPY, CAD, AUD, NZD, CHF, CNH'}
            </p>
          </div>
        </div>

        {/* 3. DIVERGENCE SCANNER */}
        <div className="macro-panel p-4 sm:p-5 font-mono space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-zinc-800 pb-3 gap-2">
            <div>
              <span className="text-cyan-400 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                <span>⚡</span> {isEs ? 'Escáner de Divergencias Macro Detectadas' : 'Macro Divergence Opportunities Scanner'}
              </span>
              <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                {isEs ? 'Pares de divisas con asimetría direccional ≥ 3 puntos' : 'Currency crosses with directional score differential ≥ 3 pts'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 px-2.5 py-1 font-bold">
                {divergences.length} {isEs ? 'Pares Aprobados' : 'Approved Pairs'}
              </span>
              {divergences.length > 2 && (
                <button
                  type="button"
                  onClick={() => setIsDivergenceExpanded(!isDivergenceExpanded)}
                  className="bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 text-[11px] px-3 py-1 font-bold transition flex items-center gap-1 shadow-sm cursor-pointer min-h-[32px]"
                >
                  {isDivergenceExpanded 
                    ? (isEs ? '↑ Mostrar Menos (Top 2)' : '↑ Show Less (Top 2)') 
                    : (isEs ? `↕️ Ver todos (${divergences.length} Pares)` : `↕️ View All (${divergences.length} Pairs)`)}
                </button>
              )}
            </div>
          </div>

          {divergences.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs items-start">
              {(isDivergenceExpanded ? divergences : divergences.slice(0, 2)).map(d => {
                const strongData = getFullCurrencyBreakdownGrouped(d.strong);
                const weakData = getFullCurrencyBreakdownGrouped(d.weak);
                const isBuy = d.actionBadge.includes('COMPRA') || d.actionBadge.includes('BUY');

                return (
                  <div key={d.pair} className="macro-card p-4 sm:p-5 space-y-3 flex flex-col justify-start h-full">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                      <div>
                        <span className="text-[9px] text-zinc-500 uppercase font-mono block">
                          {isEs ? 'Oportunidad Macro' : 'Macro Opportunity'}
                        </span>
                        <span className="font-black text-cyan-400 text-lg font-mono tracking-tight">{d.pair}</span>
                      </div>
                      <div className="text-right font-mono">
                        <span className={`${isBuy ? 'bg-emerald-950/90 text-emerald-400 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'bg-rose-950/90 text-rose-400 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.2)]'} border px-3 py-1 text-xs font-black block mb-1`}>
                          {d.actionBadge}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {isEs ? 'Diferencial:' : 'Spread:'} <strong className="text-white">{d.diff} pts</strong>
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-sans">
                      {/* STRONG CURRENCY CARD */}
                      <div className="bg-[#090b12] border border-emerald-500/30 p-3 space-y-2">
                        <div className="flex justify-between items-center border-b border-emerald-500/20 pb-1 font-mono">
                          <span className="font-bold text-emerald-400 text-xs">
                            {d.strong} (+{d.strongScore})
                          </span>
                          <span className="text-[9px] text-emerald-500 font-bold uppercase">{isEs ? 'Fuerte' : 'Strong'}</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="space-y-1">
                            <span className="text-[9px] text-amber-300 font-mono font-bold uppercase tracking-wider block">
                              📌 {isEs ? 'Sem. Previa' : 'Prior Week'} ({strongData.prevTotal > 0 ? '+' : ''}{strongData.prevTotal}):
                            </span>
                            {strongData.prevList.length > 0 ? (
                              strongData.prevList.map((b, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[10px] text-zinc-300 bg-zinc-900/60 px-2 py-0.5 border border-zinc-800/60">
                                  <span className="pr-1 truncate">{b.label}</span>
                                  <span className={`font-mono font-bold ${b.score > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {b.score > 0 ? '+' : ''}{b.score}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-[9px] text-zinc-600 italic block pl-1">{isEs ? 'Sin eventos previos' : 'No prior events'}</span>
                            )}
                          </div>

                          <div className="space-y-1 pt-1 border-t border-zinc-800/60">
                            <span className="text-[9px] text-cyan-300 font-mono font-bold uppercase tracking-wider block">
                              ⚡ {isEs ? 'Esta Semana:' : 'This Week:'}
                            </span>
                            {strongData.currList.length > 0 ? (
                              strongData.currList.map((b, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[10px] text-zinc-100 bg-zinc-900/90 px-2 py-0.5 border border-zinc-700/60">
                                  <span className="pr-1 truncate">{b.label}</span>
                                  <span className={`font-mono font-bold ${b.score > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {b.score > 0 ? '+' : ''}{b.score}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-[9px] text-zinc-600 italic block pl-1">{isEs ? 'Pendiente evaluar' : 'Pending evaluation'}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* WEAK CURRENCY CARD */}
                      <div className="bg-[#090b12] border border-rose-500/30 p-3 space-y-2">
                        <div className="flex justify-between items-center border-b border-rose-500/20 pb-1 font-mono">
                          <span className="font-bold text-rose-400 text-xs">
                            {d.weak} ({d.weakScore})
                          </span>
                          <span className="text-[9px] text-rose-500 font-bold uppercase">{isEs ? 'Débil' : 'Weak'}</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="space-y-1">
                            <span className="text-[9px] text-amber-300 font-mono font-bold uppercase tracking-wider block">
                              📌 {isEs ? 'Sem. Previa' : 'Prior Week'} ({weakData.prevTotal > 0 ? '+' : ''}{weakData.prevTotal}):
                            </span>
                            {weakData.prevList.length > 0 ? (
                              weakData.prevList.map((b, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[10px] text-zinc-300 bg-zinc-900/60 px-2 py-0.5 border border-zinc-800/60">
                                  <span className="pr-1 truncate">{b.label}</span>
                                  <span className={`font-mono font-bold ${b.score > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {b.score > 0 ? '+' : ''}{b.score}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-[9px] text-zinc-600 italic block pl-1">{isEs ? 'Sin eventos previos' : 'No prior events'}</span>
                            )}
                          </div>

                          <div className="space-y-1 pt-1 border-t border-zinc-800/60">
                            <span className="text-[9px] text-cyan-300 font-mono font-bold uppercase tracking-wider block">
                              ⚡ {isEs ? 'Esta Semana:' : 'This Week:'}
                            </span>
                            {weakData.currList.length > 0 ? (
                              weakData.currList.map((b, idx) => (
                                <div key={idx} className="flex items-center justify-between text-[10px] text-zinc-100 bg-zinc-900/90 px-2 py-0.5 border border-zinc-700/60">
                                  <span className="pr-1 truncate">{b.label}</span>
                                  <span className={`font-mono font-bold ${b.score > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {b.score > 0 ? '+' : ''}{b.score}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-[9px] text-zinc-600 italic block pl-1">{isEs ? 'Pendiente evaluar' : 'Pending evaluation'}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-zinc-500 bg-[#05060a] border border-zinc-800 space-y-1">
              <span className="text-xl block mb-1">⚖️</span>
              <p className="text-xs font-semibold text-zinc-300">
                {isEs 
                  ? 'No hay divergencias macro ≥ 3 puntos detectadas actualmente'
                  : 'No macro divergences ≥ 3 points currently detected'}
              </p>
              <p className="text-[11px] text-zinc-500">
                {isEs
                  ? 'Evalúa los eventos económicos en las secciones inferiores para alimentar las puntuaciones en vivo.'
                  : 'Evaluate economic releases in the sessions below to feed live scoring parameters.'}
              </p>
            </div>
          )}
        </div>

        {/* 4. CONSOLIDATED QUANTITATIVE MATRIX */}
        <div className="macro-panel p-4 sm:p-5 space-y-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-800 pb-3 gap-2">
            <div>
              <span className="text-cyan-400 font-bold text-xs uppercase tracking-wider block font-mono">
                {isEs ? 'Matriz Cuantitativa Consolidada' : 'Consolidated Quantitative Score Matrix'}
              </span>
              <p className="text-[10px] text-zinc-500 font-sans mt-0.5">
                {isEs 
                  ? 'Base histórica fija combinada con catalizadores evaluados de la semana'
                  : 'Fixed prior baseline combined with live evaluated event catalysts'}
              </p>
            </div>

            {/* Score scale legend */}
            <div className="flex items-center gap-1.5 text-[9px] font-mono flex-wrap">
              <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 font-bold">+4 a +10</span>
              <span className="px-2 py-0.5 bg-yellow-950/70 text-yellow-300 border border-yellow-500/50 font-bold">+1 a +3</span>
              <span className="px-2 py-0.5 bg-zinc-800/80 text-zinc-300 border border-zinc-700/50 font-bold">0</span>
              <span className="px-2 py-0.5 bg-orange-950/70 text-orange-300 border border-orange-500/50 font-bold">-1 a -3</span>
              <span className="px-2 py-0.5 bg-rose-950/80 text-rose-300 border border-rose-500/50 font-bold">-4 a -10</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 2xl:gap-8">
            {/* Section A: Forex Core */}
            <div className="table-touch-wrapper overflow-x-auto touch-scroll bg-[#05060a] p-3.5 sm:p-4 border border-zinc-800/80">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-2.5 font-mono">
                {isEs ? '// SECCIÓN A: DIVISAS FOREX CORE' : '// SECTION A: G10 CORE FOREX'}
              </span>
              <table className="w-full text-xs text-left min-w-[320px]">
                <thead>
                  <tr className="text-zinc-500 text-[10px] border-b border-zinc-800 font-mono uppercase">
                    <th className="p-2">{isEs ? 'Divisa' : 'Currency'}</th>
                    <th className="p-2 text-center">{isEs ? 'Previo (Fijo)' : 'Prior (Fixed)'}</th>
                    <th className="p-2 text-center">{isEs ? 'Eventos (Auto)' : 'Events (Auto)'}</th>
                    <th className="p-2 text-center">{isEs ? 'Total Combinado' : 'Combined Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {forexCurrencies.map(asset => {
                    const prev = globalState.matrixPrev[asset] !== undefined ? globalState.matrixPrev[asset] : 0;
                    const ev = computedMatrix.events[asset] || 0;
                    const tot = computedMatrix.totals[asset] || 0;
                    return (
                      <tr key={asset} className="border-b border-zinc-800/40 hover:bg-[#0a0a0f] transition">
                        <td className="p-2 font-bold text-white flex items-center gap-2">
                          <span className={`${getCurrencyBadgeClass(asset)} text-[10px] px-2.5 py-0.5 font-mono font-bold`}>
                            {asset}
                          </span>
                        </td>
                        <td className="p-2 text-center text-zinc-400 font-mono">
                          <input
                            type="number"
                            value={prev}
                            onChange={e => updatePrevMatrix(asset, e.target.value)}
                            className="w-14 bg-[#020203] border border-zinc-700/80 px-1.5 py-1 text-center text-xs text-white focus:outline-none focus:border-cyan-400 font-mono font-bold"
                          />
                        </td>
                        <td className="p-2 text-center font-mono text-xs text-zinc-300 font-bold">
                          {ev > 0 ? `+${ev}` : ev}
                        </td>
                        <td className="p-2 text-center font-mono text-xs">
                          <span className={`px-2.5 py-1 inline-block ${getScoreScaleStyle(tot)}`}>
                            {tot > 0 ? `+${tot}` : tot}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Section B: Commodities & Cross-Asset Risk */}
            <div className="table-touch-wrapper overflow-x-auto touch-scroll bg-[#05060a] p-3.5 sm:p-4 border border-zinc-800/80">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-2.5 font-mono">
                {isEs ? '// SECCIÓN B: MATERIAS PRIMAS Y RIESGO' : '// SECTION B: COMMODITIES & CROSS-ASSET RISK'}
              </span>
              <table className="w-full text-xs text-left min-w-[340px]">
                <thead>
                  <tr className="text-zinc-500 text-[10px] border-b border-zinc-800 font-mono uppercase">
                    <th className="p-2">{isEs ? 'Activo' : 'Asset'}</th>
                    <th className="p-2 text-center">{isEs ? 'Previo (Fijo)' : 'Prior (Fixed)'}</th>
                    <th className="p-2 text-center">{isEs ? 'Evaluación' : 'Rating'}</th>
                    <th className="p-2 text-center">{isEs ? 'Total Combinado' : 'Combined Total'}</th>
                  </tr>
                </thead>
                <tbody>
                  {intermarketAssets.map(item => {
                    const prev = globalState.matrixPrev[item.id] !== undefined ? globalState.matrixPrev[item.id] : 0;
                    const curScore = globalState.intermarketScores[item.id] || 0;
                    const tot = computedMatrix.totals[item.id] || 0;

                    return (
                      <tr key={item.id} className="border-b border-zinc-800/40 hover:bg-[#0a0a0f] transition">
                        <td className="p-2 font-bold text-white text-xs">{item.name}</td>
                        <td className="p-2 text-center text-zinc-400 font-mono">
                          <input
                            type="number"
                            value={prev}
                            onChange={e => updatePrevMatrix(item.id, e.target.value)}
                            className="w-14 bg-[#020203] border border-zinc-700/80 px-1.5 py-1 text-center text-xs text-white focus:outline-none focus:border-cyan-400 font-mono font-bold"
                          />
                        </td>
                        <td className="p-2 text-center font-mono">
                          <div className="flex items-center justify-center gap-1">
                            {[2, 1, 0, -1, -2].map(scoreOption => {
                              const isActive = curScore === scoreOption;
                              const activeClass =
                                scoreOption === 2
                                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                                  : scoreOption === 1
                                  ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                                  : scoreOption === 0
                                  ? 'bg-zinc-700 text-white border-zinc-500 shadow-sm'
                                  : scoreOption === -1
                                  ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                                  : 'bg-rose-700 text-white border-rose-500 shadow-sm';

                              return (
                                <button
                                  key={scoreOption}
                                  type="button"
                                  onClick={() => setIntermarketScore(item.id, scoreOption)}
                                  className={`w-7 h-7 sm:w-8 sm:h-7 inline-flex items-center justify-center text-[10px] font-bold border transition cursor-pointer ${
                                    isActive
                                      ? activeClass
                                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                  }`}
                                >
                                  {scoreOption > 0 ? `+${scoreOption}` : scoreOption}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="p-2 text-center font-mono text-xs">
                          <span className={`px-2.5 py-1 inline-block ${getScoreScaleStyle(tot)}`}>
                            {tot > 0 ? `+${tot}` : tot}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 5. CALENDAR FILTER BAR */}
        <div className="macro-panel p-3.5 flex flex-col md:flex-row gap-3 justify-between items-center text-xs font-mono">
          <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
            <span className="text-zinc-500 text-[10px] font-bold uppercase mr-1">
              {isEs ? 'Filtrar:' : 'Filter:'}
            </span>
            {['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NZD', 'CHF', 'CNH'].map(c => {
              const isSelected = activeCurrencyFilter === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setActiveCurrencyFilter(c)}
                  className={`px-2.5 py-1.5 font-bold cursor-pointer transition text-xs min-h-[32px] flex items-center justify-center ${
                    isSelected
                      ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {c === 'ALL' ? (isEs ? 'TODAS' : 'ALL') : c}
                </button>
              );
            })}

          </div>

          <div className="w-full md:w-auto flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={isEs ? '🔍 Buscar evento...' : '🔍 Search event...'}
              className="w-full md:w-56 bg-[#030305] border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono min-h-[36px]"
            />
          </div>
        </div>

        {/* 6. INTERACTIVE WEEKLY CALENDAR & SENTIMENT GRADING */}
        <div className="space-y-6">
          {Object.keys(globalState.daysData).map(day => {
            const rawEvents = globalState.daysData[day] || [];
            let events = rawEvents.filter(e => isWhitelisted(e.ccy, e.event));

            if (filterCoreOnly) events = events.filter(e => e.isCore);
            if (activeCurrencyFilter !== 'ALL') events = events.filter(e => e.ccy === activeCurrencyFilter);
            if (searchQuery) {
              const q = searchQuery.toLowerCase();
              events = events.filter(e => (e.event || '').toLowerCase().includes(q) || (e.ccy || '').toLowerCase().includes(q));
            }

            if (events.length === 0) return null;

            const coreCount = events.filter(e => e.isCore).length;
            const formattedDayTitle = formatDayLabel(day, isEs);

            // Group events for sentiment blocks
            const blocks: Array<{ events: MacroEvent[]; smartTitle: string; categoryId: string; ccy: string }> = [];
            let currentBlock: MacroEvent[] = [];

            events.forEach((item, idx) => {
              currentBlock.push(item);
              const nextItem = events[idx + 1];
              const currentCategory = getCategorySentimentTitle(item.ccy, item.event, isEs);
              const nextCategory = nextItem ? getCategorySentimentTitle(nextItem.ccy, nextItem.event, isEs) : null;

              if (!nextItem || nextItem.ccy !== item.ccy || nextCategory !== currentCategory) {
                const smartTitle = getSmartGroupTitle(item.ccy, currentBlock, isEs);
                const blockIdx = blocks.length;
                const categoryId = `${day}-${item.ccy}-${currentCategory}-${blockIdx}`.replace(/[^a-zA-Z0-9]/g, '-');
                blocks.push({
                  events: [...currentBlock],
                  smartTitle,
                  categoryId,
                  ccy: item.ccy
                });
                currentBlock = [];
              }
            });

            return (
              <div
                key={day}
                className="day-card space-y-4 overflow-hidden"
              >
                {/* Day Header */}
                <div className="bg-[#0b0f19] border-b border-zinc-800/80 px-4 sm:px-5 py-3.5 flex justify-between items-center">
                  <div className="flex items-center gap-2 bg-cyan-950/60 border border-cyan-500/40 px-3 py-1.5 text-cyan-300 font-bold font-mono text-xs shadow-sm">
                    <span>📅</span>
                    <span className="tracking-wider">{formattedDayTitle}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    {coreCount > 0 && (
                      <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 font-bold">
                        🎯 {coreCount} {isEs ? 'Core' : 'Core'}
                      </span>
                    )}
                    <span className="text-cyan-200/80 bg-zinc-900/80 px-2.5 py-0.5 border border-zinc-700/60 font-bold">
                      {events.length} {isEs ? 'Eventos' : 'Events'}
                    </span>
                  </div>
                </div>

                {/* Day Table with touch scroll */}
                <div className="table-touch-wrapper px-3 sm:px-4 overflow-x-auto touch-scroll">
                  <table className="w-full text-left text-xs font-mono border-collapse table-fixed min-w-[620px]">
                    <thead>
                      <tr className="text-zinc-500 text-[10px] border-b border-zinc-800 uppercase tracking-wider">
                        <th className="p-2.5 w-[10%]">{isEs ? 'Hora' : 'Time (UTC)'}</th>
                        <th className="p-2.5 w-[10%]">{isEs ? 'Divisa' : 'Currency'}</th>
                        <th className="p-2.5 w-[44%]">{isEs ? 'Evento Económico' : 'Economic Indicator'}</th>
                        <th className="p-2.5 w-[12%]">{isEs ? 'Actual' : 'Actual'}</th>
                        <th className="p-2.5 w-[12%]">{isEs ? 'Pronóstico' : 'Forecast'}</th>
                        <th className="p-2.5 w-[12%]">{isEs ? 'Previo' : 'Previous'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blocks.map(block => {
                        const scoreObj = globalState.categoryScores[block.categoryId];
                        const currentScore = scoreObj ? scoreObj.score : 0;
                        const summaryText = Array.from(new Set(block.events.map(e => e.event))).join(' / ');

                        return (
                          <React.Fragment key={block.categoryId}>
                            {block.events.map((item, itemIdx) => {
                              const isCore = item.isCore;
                              const rowClass = isCore
                                ? 'bg-gradient-to-r from-amber-500/10 via-cyan-500/5 to-transparent border-l-3 border-l-amber-500 border-b border-amber-500/20 text-zinc-100'
                                : itemIdx % 2 === 0
                                ? 'bg-transparent border-b border-zinc-800/30'
                                : 'bg-zinc-900/20 border-b border-zinc-800/30';

                              return (
                                <tr key={`${item.event}-${itemIdx}`} className={`${rowClass} hover:bg-zinc-800/40 transition`}>
                                  <td className="p-2.5 text-zinc-400 font-mono text-[11px] font-bold">{item.time || '—'}</td>
                                  <td className="p-2.5">
                                    <span className={`${getCurrencyBadgeClass(item.ccy)} px-2 py-0.5 font-bold text-[9px] tracking-wide`}>
                                      {item.ccy}
                                    </span>
                                  </td>
                                  <td className="p-2.5 font-sans text-xs font-medium truncate pr-2">
                                    <div className="flex items-center justify-between gap-2 overflow-hidden">
                                      <span className={`${isCore ? 'text-amber-200 font-bold' : 'text-zinc-200'} truncate`}>
                                        {item.event}
                                      </span>
                                      {isCore && (
                                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] px-1.5 py-0.5 font-bold font-mono tracking-wider shrink-0">
                                          🎯 CORE
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-2.5 font-bold text-white font-mono truncate">{item.actual || '—'}</td>
                                  <td className="p-2.5 text-zinc-400 font-mono truncate">{item.forecast || '—'}</td>
                                  <td className="p-2.5 text-zinc-500 font-mono truncate">{item.previous || '—'}</td>
                                </tr>
                              );
                            })}

                            {/* Group Sentiment Assessment Box */}
                            <tr>
                              <td colSpan={6} className="py-2.5 px-1">
                                <div className="bg-gradient-to-r from-amber-950/20 via-zinc-900/40 to-zinc-900/20 border border-amber-500/30 p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 my-1">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-amber-400 text-xs shrink-0">📊</span>
                                    <span className="text-xs font-bold text-amber-200 tracking-wide truncate">
                                      {block.smartTitle}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 font-mono shrink-0 self-end sm:self-auto">
                                    <span className="text-[10px] text-zinc-400 mr-1 uppercase">
                                      {isEs ? 'Puntuación:' : 'Score:'}
                                    </span>
                                    {[2, 1, 0, -1, -2].map(scoreVal => {
                                      const isScoreActive = currentScore === scoreVal;
                                      const activeColor =
                                        scoreVal === 2
                                          ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                                          : scoreVal === 1
                                          ? 'bg-emerald-500 text-white border-emerald-300 shadow-sm'
                                          : scoreVal === 0
                                          ? 'bg-zinc-700 text-white border-zinc-500 shadow-sm'
                                          : scoreVal === -1
                                          ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                                          : 'bg-rose-700 text-white border-rose-500 shadow-sm';

                                      return (
                                        <button
                                          key={scoreVal}
                                          type="button"
                                          onClick={() => setCategoryScore(block.categoryId, block.ccy, scoreVal, block.smartTitle, summaryText)}
                                          className={`w-8 h-7 sm:w-8 sm:h-6 inline-flex items-center justify-center text-[10px] font-bold border transition cursor-pointer ${
                                            isScoreActive
                                              ? activeColor
                                              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                                          }`}
                                        >
                                          {scoreVal > 0 ? `+${scoreVal}` : scoreVal}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Day Notes Textarea */}
                <div className="px-3 sm:px-4 pb-4">
                  <textarea
                    value={globalState.dailyNotes[day] || ''}
                    onChange={e => updateDailyNote(day, e.target.value)}
                    rows={1.5}
                    placeholder={isEs
                      ? `Notas de la jornada para ${formattedDayTitle} (noticias inesperadas, eventos geopolíticos)...`
                      : `Session notes for ${formattedDayTitle} (unscheduled speeches, geopolitical breaking events)...`}
                    className="w-full bg-[#030305] border border-zinc-800 p-2.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500/60 font-mono transition placeholder-zinc-600"
                  />
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* IN-APP CONFIRMATION MODAL (Reliable inside iframes & mobile) */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b0c10] border border-zinc-800 rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 font-sans text-left">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${confirmModal.confirmStyle === 'danger' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                {confirmModal.title}
              </h3>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line font-mono bg-[#050608] border border-zinc-800 p-3.5 rounded-lg">
              {confirmModal.message}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-2 text-xs text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition cursor-pointer min-h-[36px]"
              >
                {confirmModal.cancelText}
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 text-xs font-bold rounded transition cursor-pointer min-h-[36px] ${
                  confirmModal.confirmStyle === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-black'
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP NOTIFICATION TOAST */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-2xl text-xs font-mono border backdrop-blur-md animate-in slide-in-from-bottom duration-300 bg-[#0c0d12]/95 border-cyan-500/50 text-cyan-200">
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-cyan-400 shrink-0" />}
          <span className="leading-tight">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* WEEKLY MACRO RISK REPORT MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/90 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#0b0c10] border border-zinc-800 rounded-xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-800 bg-[#07080c] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  {isEs ? 'Exportación de Reporte Semanal Macro (PDF / Impresión)' : 'Weekly Macro Risk Report Export (PDF / Print)'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold rounded flex items-center gap-1.5 transition cursor-pointer shadow-sm min-h-[34px]"
                >
                  <Printer className="w-3.5 h-3.5" />
                  {isEs ? 'Imprimir / Guardar PDF' : 'Print / Save PDF'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadHTMLReport}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs rounded flex items-center gap-1.5 transition cursor-pointer min-h-[34px]"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isEs ? 'Descargar HTML' : 'Download HTML'}
                </button>
                <button
                  type="button"
                  onClick={handleCopyReportText}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs rounded flex items-center gap-1.5 transition cursor-pointer min-h-[34px]"
                >
                  {copiedReportText ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {isEs ? (copiedReportText ? 'Copiado' : 'Copiar Texto') : (copiedReportText ? 'Copied' : 'Copy Text')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Preview Body */}
            <div className="p-4 sm:p-8 overflow-y-auto bg-white text-slate-900 font-sans text-xs flex-grow">
              <div dangerouslySetInnerHTML={{ __html: generateReportHTML() }} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
