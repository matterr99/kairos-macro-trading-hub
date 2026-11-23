import React, { useState, useEffect } from 'react';
import { FileText, Download, Upload, RotateCcw } from 'lucide-react';
import { Language } from '../types';
import { ToolHeader } from './ToolHeader';

interface QuantDeskProps {
  onReturnToHub: () => void;
  language?: Language;
}

interface EventRow {
  id: string;
  type: string;
  bias: 'very_bullish' | 'bullish' | 'bearish' | 'very_bearish' | 'none';
  note: string;
}

interface PillarsState {
  p2: 'buy' | 'sell' | 'neutral';
  p3: 'buy' | 'sell' | 'neutral';
  p4: 'buy' | 'sell' | 'neutral';
  p5: 'buy' | 'sell' | 'neutral';
}

const G10_CURRENCIES = ['EUR', 'USD', 'GBP', 'AUD', 'NZD', 'CAD', 'CHF', 'JPY'];

export function QuantDesk({ onReturnToHub, language = 'en' }: QuantDeskProps) {
  const isEs = language === 'es';

  const [baseCurrency, setBaseCurrency] = useState<string>('EUR');
  const [quoteCurrency, setQuoteCurrency] = useState<string>('AUD');

  const [baseEvents, setBaseEvents] = useState<EventRow[]>([
    { id: 'b_1', type: 'none', bias: 'none', note: '' }
  ]);
  const [quoteEvents, setQuoteEvents] = useState<EventRow[]>([
    { id: 'q_1', type: 'none', bias: 'none', note: '' }
  ]);

  const [pillars, setPillars] = useState<PillarsState>({
    p2: 'neutral',
    p3: 'neutral',
    p4: 'neutral',
    p5: 'neutral'
  });

  const [p4Oil, setP4Oil] = useState<string>('');
  const [p4Gold, setP4Gold] = useState<string>('');
  const [p4Notes, setP4Notes] = useState<string>('');
  const [p5Notes, setP5Notes] = useState<string>('');
  const [noteCB, setNoteCB] = useState<string>('');
  const [noteGeo, setNoteGeo] = useState<string>('');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kairos_sentiment_definer_data');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.baseCurrency) setBaseCurrency(data.baseCurrency);
        if (data.quoteCurrency) setQuoteCurrency(data.quoteCurrency);
        if (data.noteCB !== undefined) setNoteCB(data.noteCB);
        if (data.noteGeo !== undefined) setNoteGeo(data.noteGeo);
        if (data.p4Oil !== undefined) setP4Oil(data.p4Oil);
        if (data.p4Gold !== undefined) setP4Gold(data.p4Gold);
        if (data.p4Notes !== undefined) setP4Notes(data.p4Notes);
        if (data.p5Notes !== undefined) setP5Notes(data.p5Notes);
        if (data.state) {
          setPillars({
            p2: data.state.p2 || 'neutral',
            p3: data.state.p3 || 'neutral',
            p4: data.state.p4 || 'neutral',
            p5: data.state.p5 || 'neutral'
          });
        }
        if (Array.isArray(data.baseEvents) && data.baseEvents.length > 0) {
          setBaseEvents(data.baseEvents.map((e: any, idx: number) => ({
            id: `b_${idx}_${Date.now()}`,
            type: e.type || 'none',
            bias: e.bias || 'none',
            note: e.note || ''
          })));
        }
        if (Array.isArray(data.quoteEvents) && data.quoteEvents.length > 0) {
          setQuoteEvents(data.quoteEvents.map((e: any, idx: number) => ({
            id: `q_${idx}_${Date.now()}`,
            type: e.type || 'none',
            bias: e.bias || 'none',
            note: e.note || ''
          })));
        }
      }
    } catch (e) {
      console.error('Failed to parse saved Quant Desk state', e);
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    const data = {
      baseCurrency,
      quoteCurrency,
      noteCB,
      noteGeo,
      p4Oil,
      p4Gold,
      p4Notes,
      p5Notes,
      state: pillars,
      baseEvents: baseEvents.map(e => ({ type: e.type, bias: e.bias, note: e.note })),
      quoteEvents: quoteEvents.map(e => ({ type: e.type, bias: e.bias, note: e.note }))
    };
    try {
      localStorage.setItem('kairos_sentiment_definer_data', JSON.stringify(data));
    } catch {
      // ignore
    }
  }, [baseCurrency, quoteCurrency, noteCB, noteGeo, p4Oil, p4Gold, p4Notes, p5Notes, pillars, baseEvents, quoteEvents]);

  // Mathematical Score Calculation
  let netWeight = 0;
  let activeEventsCount = 0;
  let hasGeopolitics = false;

  baseEvents.forEach(evt => {
    if (evt.type === 'Geopolitics') hasGeopolitics = true;
    if (evt.bias === 'very_bullish') { netWeight += 2; activeEventsCount++; }
    else if (evt.bias === 'bullish') { netWeight += 1; activeEventsCount++; }
    else if (evt.bias === 'bearish') { netWeight -= 1; activeEventsCount++; }
    else if (evt.bias === 'very_bearish') { netWeight -= 2; activeEventsCount++; }
  });

  quoteEvents.forEach(evt => {
    if (evt.type === 'Geopolitics') hasGeopolitics = true;
    if (evt.bias === 'very_bullish') { netWeight -= 2; activeEventsCount++; }
    else if (evt.bias === 'bullish') { netWeight -= 1; activeEventsCount++; }
    else if (evt.bias === 'bearish') { netWeight += 1; activeEventsCount++; }
    else if (evt.bias === 'very_bearish') { netWeight += 2; activeEventsCount++; }
  });

  const step1Direction = netWeight > 0 ? 'buy' : netWeight < 0 ? 'sell' : 'none';

  let matchCount = 0;
  if (step1Direction !== 'none') {
    (['p2', 'p3', 'p4', 'p5'] as const).forEach(pKey => {
      if (pillars[pKey] === step1Direction) matchCount++;
    });
  }

  const isApproved = activeEventsCount > 0 && netWeight !== 0 && matchCount >= 2;
  const isNoTrade = activeEventsCount > 0 && netWeight !== 0 && matchCount < 2;

  // Add / remove event rows
  const addBaseEvent = () => {
    setBaseEvents(prev => [...prev, { id: `b_${Date.now()}_${Math.random()}`, type: 'none', bias: 'none', note: '' }]);
  };

  const removeBaseEvent = (id: string) => {
    setBaseEvents(prev => prev.length > 1 ? prev.filter(e => e.id !== id) : [{ id: `b_${Date.now()}`, type: 'none', bias: 'none', note: '' }]);
  };

  const updateBaseEvent = (id: string, updates: Partial<EventRow>) => {
    setBaseEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const addQuoteEvent = () => {
    setQuoteEvents(prev => [...prev, { id: `q_${Date.now()}_${Math.random()}`, type: 'none', bias: 'none', note: '' }]);
  };

  const removeQuoteEvent = (id: string) => {
    setQuoteEvents(prev => prev.length > 1 ? prev.filter(e => e.id !== id) : [{ id: `q_${Date.now()}`, type: 'none', bias: 'none', note: '' }]);
  };

  const updateQuoteEvent = (id: string, updates: Partial<EventRow>) => {
    setQuoteEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  };

  const togglePillar = (pKey: keyof PillarsState, val: 'buy' | 'sell' | 'neutral') => {
    setPillars(prev => ({ ...prev, [pKey]: val }));
  };

  const handleSwapCurrencies = () => {
    const temp = baseCurrency;
    setBaseCurrency(quoteCurrency);
    setQuoteCurrency(temp);
  };

  // Reset
  const handleReset = () => {
    if (window.confirm(isEs ? '¿Reiniciar todos los datos de la Mesa Cuantitativa?' : 'Reset all Quant Desk sentiment data?')) {
      localStorage.removeItem('kairos_sentiment_definer_data');
      setBaseCurrency('EUR');
      setQuoteCurrency('AUD');
      setBaseEvents([{ id: `b_${Date.now()}`, type: 'none', bias: 'none', note: '' }]);
      setQuoteEvents([{ id: `q_${Date.now()}`, type: 'none', bias: 'none', note: '' }]);
      setPillars({ p2: 'neutral', p3: 'neutral', p4: 'neutral', p5: 'neutral' });
      setP4Oil('');
      setP4Gold('');
      setP4Notes('');
      setP5Notes('');
      setNoteCB('');
      setNoteGeo('');
    }
  };

  // Export Backup
  const handleExportBackup = () => {
    const data = {
      baseCurrency,
      quoteCurrency,
      noteCB,
      noteGeo,
      p4Oil,
      p4Gold,
      p4Notes,
      p5Notes,
      state: pillars,
      baseEvents: baseEvents.map(e => ({ type: e.type, bias: e.bias, note: e.note })),
      quoteEvents: quoteEvents.map(e => ({ type: e.type, bias: e.bias, note: e.note }))
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kairos_sentiment_${baseCurrency}_${quoteCurrency}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import Backup
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.baseCurrency) setBaseCurrency(data.baseCurrency);
        if (data.quoteCurrency) setQuoteCurrency(data.quoteCurrency);
        if (data.noteCB !== undefined) setNoteCB(data.noteCB);
        if (data.noteGeo !== undefined) setNoteGeo(data.noteGeo);
        if (data.p4Oil !== undefined) setP4Oil(data.p4Oil);
        if (data.p4Gold !== undefined) setP4Gold(data.p4Gold);
        if (data.p4Notes !== undefined) setP4Notes(data.p4Notes);
        if (data.p5Notes !== undefined) setP5Notes(data.p5Notes);
        if (data.state) {
          setPillars({
            p2: data.state.p2 || 'neutral',
            p3: data.state.p3 || 'neutral',
            p4: data.state.p4 || 'neutral',
            p5: data.state.p5 || 'neutral'
          });
        }
        if (Array.isArray(data.baseEvents)) {
          setBaseEvents(data.baseEvents.map((item: any, idx: number) => ({
            id: `b_${idx}_${Date.now()}`,
            type: item.type || 'none',
            bias: item.bias || 'none',
            note: item.note || ''
          })));
        }
        if (Array.isArray(data.quoteEvents)) {
          setQuoteEvents(data.quoteEvents.map((item: any, idx: number) => ({
            id: `q_${idx}_${Date.now()}`,
            type: item.type || 'none',
            bias: item.bias || 'none',
            note: item.note || ''
          })));
        }
      } catch {
        alert(isEs ? 'Archivo de respaldo no válido' : 'Invalid backup JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const getTradeDirectionLabel = () => {
    if (isApproved) {
      return step1Direction === 'buy' ? (isEs ? 'COMPRA' : 'BUY') : (isEs ? 'VENTA' : 'SELL');
    }
    if (isNoTrade) {
      return isEs ? 'SIN OPERACIÓN' : 'NO TRADE';
    }
    return isEs ? 'NEUTRAL' : 'NEUTRAL';
  };

  // Print PDF with dynamic trade idea document title
  const handlePrint = () => {
    const direction = getTradeDirectionLabel();
    const tradeTitle = `Trade Idea - ${baseCurrency}/${quoteCurrency} - ${direction}`;
    const previousTitle = document.title;

    document.title = tradeTitle;

    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };

    window.addEventListener('afterprint', restoreTitle);

    try {
      window.print();
    } finally {
      setTimeout(restoreTitle, 2500);
    }
  };

  const formatBiasLabel = (bias: string) => {
    if (bias === 'very_bullish') return isEs ? '🟢 Muy Alcista (+2)' : '🟢 Very Bullish (+2)';
    if (bias === 'bullish') return isEs ? '🟡 Alcista (+1)' : '🟡 Bullish (+1)';
    if (bias === 'bearish') return isEs ? '🟠 Bajista (-1)' : '🟠 Bearish (-1)';
    if (bias === 'very_bearish') return isEs ? '🔴 Muy Bajista (-2)' : '🔴 Very Bearish (-2)';
    return isEs ? '— Neutral' : '— Neutral';
  };

  return (
    <div className="w-full">
      {/* ========================================== */}
      {/* 💻 SCREEN VIEW */}
      {/* ========================================== */}
      <div className="space-y-0 print:hidden">
        
        {/* 1. UNIFIED TOOL HEADER */}
        <ToolHeader
          onReturnToHub={onReturnToHub}
          language={language}
          eyebrow="QUANT DESK"
          tags={[
            isEs ? 'MODELO 5 PILARES' : '5-PILLAR MODEL',
            isEs ? 'SENTIMIENTO G10' : 'G10 SENTIMENT',
          ]}
          title={isEs ? 'Definidor Cuantitativo de Sentimiento' : 'Currency Sentiment Definer'}
          subtitle={
            isEs
              ? 'Mesa cuantitativa de verificación de sentimiento. Evalúa catalizadores de noticias, filtro minorista contrario (SSI), ponderaciones macroeconómicas, sentimiento de riesgo y trayectoria de bancos centrales.'
              : 'Quantitative sentiment verification desk. Evaluates Tier-1 news catalysts, retail crowd positioning (SSI), macro multi-factor weights, risk appetite, and central bank trajectory into directional verdicts.'
          }
          actions={
            <>
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 sm:flex-initial h-9 px-3.5 rounded-[2px] text-[11px] uppercase tracking-[0.08em] bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 transition cursor-pointer inline-flex items-center justify-center gap-1.5 font-semibold"
              >
                <FileText size={13} />
                <span>{isEs ? 'Generar PDF' : 'Generate PDF'}</span>
              </button>
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex-1 sm:flex-initial h-9 px-3.5 rounded-[2px] text-[11px] uppercase tracking-[0.08em] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--line-strong)] transition cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Download size={13} />
                <span>{isEs ? 'Exportar Backup' : 'Export Backup'}</span>
              </button>
              <label className="flex-1 sm:flex-initial h-9 px-3.5 rounded-[2px] text-[11px] uppercase tracking-[0.08em] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--line-strong)] transition cursor-pointer inline-flex items-center justify-center gap-1.5">
                <Upload size={13} />
                <span>{isEs ? 'Cargar Backup' : 'Import Backup'}</span>
                <input type="file" accept=".json,application/json" className="hidden" onChange={handleImportBackup} />
              </label>
              <button
                type="button"
                onClick={handleReset}
                className="flex-1 sm:flex-initial h-9 px-3.5 rounded-[2px] text-[11px] uppercase tracking-[0.08em] bg-[var(--surface)] hover:bg-rose-500/10 text-[#EF4444] border border-[var(--line)] hover:border-[#EF4444]/40 transition cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={13} />
                <span>{isEs ? 'Reiniciar' : 'Reset'}</span>
              </button>
            </>
          }
        />

        {/* 2. MAIN WORKSPACE VIEW */}
        <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
          
          {/* TOP CONTROL PANEL: ASSET PAIR SELECTOR + VERDICT + NET WEIGHT */}
          <div className="bg-[var(--surface)] rounded-sm border border-[var(--line)] p-5 sm:p-6 shadow-2xl">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              
              {/* Left: Asset Selection */}
              <div className="space-y-2 font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--accent)] font-bold text-[10px] tracking-widest uppercase">
                    // {isEs ? 'PAR ACTIVO SELECCIONADO' : 'ACTIVE CURRENCY PAIR'}
                  </span>
                  <span className="text-[var(--ink-muted)]">|</span>
                  <span className="text-[10px] text-[var(--ink-muted)] uppercase">
                    {isEs ? 'CRUCE G10' : 'G10 CROSS'}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 bg-[var(--bg)] border border-[var(--line)] rounded-sm px-4 py-2 w-fit">
                  {/* Base Selector */}
                  <div className="flex flex-col">
                    <span className="text-[8px] text-[var(--ink-muted)] font-bold uppercase tracking-wider">
                      {isEs ? 'DIVISA BASE' : 'BASE LEG'}
                    </span>
                    <select 
                      value={baseCurrency} 
                      onChange={(e) => setBaseCurrency(e.target.value)} 
                      className="bg-transparent text-xl font-black text-[var(--ink)] hover:text-[var(--accent)] transition font-mono focus:outline-none cursor-pointer"
                    >
                      {G10_CURRENCIES.map(c => <option key={c} value={c} className="bg-[var(--surface)]">{c}</option>)}
                    </select>
                  </div>

                  {/* Swap Button */}
                  <button
                    onClick={handleSwapCurrencies}
                    title={isEs ? 'Invertir Par' : 'Invert Currency Pair'}
                    className="w-10 h-10 min-w-[40px] min-h-[40px] bg-[var(--surface-2)] hover:bg-[var(--accent)]/15 text-[var(--ink-muted)] hover:text-[var(--accent)] border border-[var(--line)] rounded-sm text-sm transition cursor-pointer flex items-center justify-center self-center mt-2 shadow-sm"
                  >
                    ⇄
                  </button>

                  {/* Quote Selector */}
                  <div className="flex flex-col">
                    <span className="text-[8px] text-[var(--ink-muted)] font-bold uppercase tracking-wider">
                      {isEs ? 'DIVISA COTIZADA' : 'QUOTE LEG'}
                    </span>
                    <select 
                      value={quoteCurrency} 
                      onChange={(e) => setQuoteCurrency(e.target.value)} 
                      className="bg-transparent text-xl font-black text-[var(--ink)] hover:text-[var(--accent)] transition font-mono focus:outline-none cursor-pointer"
                    >
                      {G10_CURRENCIES.map(c => <option key={c} value={c} className="bg-[var(--surface)]">{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Middle: Score Balance & Regime Badge */}
              <div className="flex flex-wrap items-center gap-4 font-mono">
                <div className="bg-[var(--bg)] border border-[var(--line)] rounded-sm p-3 min-w-[150px]">
                  <span className="text-[9px] text-[var(--ink-muted)] uppercase tracking-widest block font-bold">
                    {isEs ? 'PESO NETO CALENDARIO' : 'CALENDAR NET WEIGHT'}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-2xl font-black ${netWeight > 0 ? 'text-[var(--accent)]' : netWeight < 0 ? 'text-rose-400' : 'text-[var(--ink)]'}`}>
                      {netWeight > 0 ? `+${netWeight}` : netWeight}
                    </span>
                    <span className="text-[10px] text-[var(--ink-muted)] font-sans">
                      {isEs ? 'balance pts' : 'pts balance'}
                    </span>
                  </div>
                </div>

                <div className="bg-[var(--bg)] border border-[var(--line)] rounded-sm p-3 min-w-[180px]">
                  <span className="text-[9px] text-[var(--ink-muted)] uppercase tracking-widest block font-bold">
                    {isEs ? 'RÉGIMEN DE MERCADO' : 'REGIME CLASSIFICATION'}
                  </span>
                  <div className="mt-1">
                    {hasGeopolitics ? (
                      <span className="text-[10px] font-mono bg-rose-950/30 border border-rose-900/70 text-rose-400 px-2 py-0.5 rounded-sm inline-block font-bold">
                        ⚠️ {isEs ? 'Alto Riesgo Geopolítico' : 'High Geopolitical Hazard'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono bg-[var(--surface-2)] border border-[var(--line)] text-[var(--ink-muted)] px-2 py-0.5 rounded-sm inline-block">
                        {isEs ? 'Perfil de Volatilidad Normal' : 'Normal Volatility Profile'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Glowing Tactical Decision Panel */}
              <div className={`p-4 rounded-sm border flex flex-col items-center justify-center w-full lg:w-72 transition font-mono text-center ${
                isApproved 
                  ? 'bg-[var(--accent)]/10 border-[var(--accent)]/50' 
                  : isNoTrade 
                  ? 'bg-rose-950/20 border-rose-500/60' 
                  : 'bg-[var(--bg)] border-[var(--line)]'
              }`}>
                <span className="text-[10px] font-bold text-[var(--ink-muted)] uppercase tracking-widest">
                  // {isEs ? 'VEREDICTO TÁCTICO DEL SISTEMA' : 'SYSTEM TACTICAL VERDICT'}
                </span>
                
                {isApproved && (
                  <>
                    <span className="text-base font-black mt-1 text-[var(--accent)] tracking-wider">
                      {isEs ? `APROBADO (${step1Direction === 'buy' ? 'COMPRA' : 'VENTA'})` : `APPROVED (${step1Direction.toUpperCase()})`}
                    </span>
                    <span className="text-[10px] text-[var(--ink-muted)] mt-1 font-sans">
                      {isEs 
                        ? `Factores: ${matchCount}/4 confirman el sesgo para ${baseCurrency}/${quoteCurrency}.` 
                        : `Factors: ${matchCount}/4 agree with fundamental ${step1Direction.toUpperCase()} for ${baseCurrency}/${quoteCurrency}.`}
                    </span>
                  </>
                )}

                {isNoTrade && (
                  <>
                    <span className="text-base font-black mt-1 text-rose-400 tracking-wider">
                      {isEs ? 'SIN OPERACIÓN' : 'NO TRADE'}
                    </span>
                    <span className="text-[10px] text-[var(--ink-muted)] mt-1 font-sans">
                      {isEs 
                        ? `Alineación insuficiente (${matchCount}/4 coincidieron).` 
                        : `Insufficient factor agreement (${matchCount}/4 agreed).`}
                    </span>
                  </>
                )}

                {!isApproved && !isNoTrade && (
                  <>
                    <span className="text-base font-black mt-1 text-[var(--ink-muted)] tracking-wider">
                      {isEs ? 'SIN SESGO' : 'NO BIAS'}
                    </span>
                    <span className="text-[10px] text-[var(--ink-muted)] mt-1 font-sans">
                      {isEs ? 'Añade un evento económico debajo para evaluar sesgo.' : 'Add an economic event below to evaluate direction.'}
                    </span>
                  </>
                )}
              </div>

            </div>
          </div>

          {/* TWO-COLUMN WORKSPACE: POINT 1 CATALYSTS + 4 SUPPORTING PILLARS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT 7 COLS: POINT 1 ECONOMIC NEWS CATALYST GRID */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="bg-[var(--surface)] rounded-sm border border-[var(--line)] p-5 sm:p-6 shadow-2xl space-y-5">
                
                <div className="flex justify-between items-center border-b border-[var(--line)] pb-3 font-mono">
                  <div>
                    <span className="text-[var(--accent)] font-bold text-[10px] tracking-widest uppercase block">
                      // {isEs ? 'PUNTO 1: CATALIZADORES FUNDAMENTALES' : 'POINT 1: FUNDAMENTAL CATALYSTS'}
                    </span>
                    <h3 className="text-sm font-bold text-[var(--ink)] uppercase tracking-wider mt-0.5">
                      {isEs ? 'Calendario Económico y Noticias Clave' : 'Economic Calendar & News Feed'}
                    </h3>
                  </div>
                  <span className="text-[10px] text-[var(--ink-muted)] bg-[var(--bg)] border border-[var(--line)] px-2 py-1 rounded-sm">
                    {isEs ? 'Regla: Eventos Tier-1' : 'Rule Base: Tier-1 Events'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* BASE CURRENCY EVENTS PANEL */}
                  <div className="bg-[var(--bg)] p-4 rounded-sm border border-[var(--line)] space-y-3 font-mono">
                    <div className="flex justify-between items-center border-b border-[var(--line)] pb-2">
                      <span className="text-xs font-bold text-[var(--accent)] uppercase">
                        {isEs ? `Eventos ${baseCurrency} (Base)` : `${baseCurrency} Events (Base)`}
                      </span>
                      <button 
                        type="button" 
                        onClick={addBaseEvent} 
                        className="bg-[var(--surface-2)] hover:bg-[var(--accent)]/15 text-[var(--ink)] hover:text-[var(--accent)] border border-[var(--line)] hover:border-[var(--accent)]/50 text-[10px] font-bold px-2.5 py-1 rounded-sm transition cursor-pointer flex items-center gap-1"
                      >
                        <span>+</span> {isEs ? 'AÑADIR' : 'ADD'}
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {baseEvents.map((evt) => (
                        <div key={evt.id} className="bg-[var(--surface)] border border-[var(--line)] rounded-sm p-3 space-y-2 relative">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <select 
                              value={evt.type} 
                              onChange={(e) => updateBaseEvent(evt.id, { type: e.target.value })}
                              className="w-full sm:flex-grow bg-[var(--bg)] border border-[var(--line)] text-[10px] sm:text-xs p-2 sm:p-1.5 rounded-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]/50 cursor-pointer min-w-0 font-mono min-h-[38px] sm:min-h-[34px]"
                            >
                              <option value="none">-- {isEs ? 'SELECCIONAR EVENTO' : 'SELECT EVENT'} --</option>
                              <optgroup label={isEs ? "Bancos Centrales" : "Central Banks"} className="bg-[var(--bg)]">
                                <option value="CB Press">{isEs ? 'Decisión / Conferencia B.C.' : 'C.B. Decisions / Press Conf'}</option>
                                <option value="Central Bank">{isEs ? 'Minutas de Banco Central' : 'Central Bank Minutes'}</option>
                              </optgroup>
                              <optgroup label={isEs ? "Actividad Económica" : "Economic Activity & Growth"} className="bg-[var(--bg)]">
                                <option value="GDP">{isEs ? 'PIB (Crecimiento)' : 'GDP (Growth Rate)'}</option>
                                <option value="PMIs">{isEs ? 'PMIs (Mfg/Servicios)' : 'PMIs (Mfg/Services)'}</option>
                                <option value="Retail Sales">{isEs ? 'Ventas Minoristas' : 'Retail Sales'}</option>
                                <option value="Consumer Sentiment">{isEs ? 'Confianza Consumidor' : 'Consumer Sentiment'}</option>
                                <option value="Industrial Production">{isEs ? 'Producción Industrial' : 'Industrial Prod.'}</option>
                                <option value="Trade Balance">{isEs ? 'Balanza Comercial' : 'Trade Balance'}</option>
                              </optgroup>
                              <optgroup label={isEs ? "Inflación y Precios" : "Inflation & Prices"} className="bg-[var(--bg)]">
                                <option value="Inflation">{isEs ? 'Inflación (IPC/PCE)' : 'Inflation (CPI/PCE)'}</option>
                                <option value="PPI">{isEs ? 'IPP (Inflación Mayorista)' : 'PPI (Producer Inflation)'}</option>
                              </optgroup>
                              <optgroup label={isEs ? "Empleo y Salarios" : "Labor Market & Earnings"} className="bg-[var(--bg)]">
                                <option value="Employment">{isEs ? 'NFP / Desempleo' : 'Employment (NFP/UR)'}</option>
                                <option value="Jobless Claims">{isEs ? 'Peticiones Desempleo' : 'Jobless Claims'}</option>
                                <option value="Average Earnings">{isEs ? 'Salarios / Ingresos' : 'Average Earnings / Wages'}</option>
                              </optgroup>
                              <optgroup label={isEs ? "Geopolítica" : "Risk & Geopolitics"} className="bg-[var(--bg)]">
                                <option value="Geopolitics">{isEs ? 'Geopolítica / Guerra / Aranceles' : 'Geopolitics / War Risk'}</option>
                              </optgroup>
                            </select>

                            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                              <select 
                                value={evt.bias} 
                                onChange={(e) => updateBaseEvent(evt.id, { bias: e.target.value as any })}
                                className="flex-1 sm:w-36 bg-[var(--bg)] border border-[var(--line)] text-[10px] sm:text-xs p-2 sm:p-1.5 rounded-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]/50 font-bold cursor-pointer font-mono min-h-[38px] sm:min-h-[34px]"
                              >
                                <option value="none">-- {isEs ? 'SESGO' : 'BIAS'} --</option>
                                <option value="very_bullish" className="text-emerald-400">🟢 {isEs ? 'MUY ALCISTA (+2)' : 'VERY BULLISH (+2)'}</option>
                                <option value="bullish" className="text-yellow-400">🟡 {isEs ? 'ALCISTA (+1)' : 'BULLISH (+1)'}</option>
                                <option value="bearish" className="text-orange-400">🟠 {isEs ? 'BAJISTA (-1)' : 'BEARISH (-1)'}</option>
                                <option value="very_bearish" className="text-rose-400">🔴 {isEs ? 'MUY BAJISTA (-2)' : 'VERY BEARISH (-2)'}</option>
                              </select>

                              <button 
                                type="button" 
                                onClick={() => removeBaseEvent(evt.id)} 
                                className="text-[var(--ink-muted)] hover:text-rose-400 text-sm w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center font-bold shrink-0 transition cursor-pointer border border-[var(--line)] hover:border-rose-900/50"
                                title="Delete"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          <input 
                            type="text" 
                            value={evt.note} 
                            onChange={(e) => updateBaseEvent(evt.id, { note: e.target.value })}
                            placeholder={isEs ? "Objetivo de consenso, métricas real vs pronóstico..." : "Consensus targets, actual vs prior metrics..."}
                            className={`w-full text-[10px] sm:text-xs p-2 sm:p-1.5 rounded-sm font-mono focus:outline-none min-h-[36px] sm:min-h-[32px] ${
                              evt.type === 'Geopolitics' 
                                ? 'bg-rose-950/20 border border-rose-900/60 text-rose-300 placeholder-rose-700/60 focus:border-rose-400' 
                                : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] focus:border-[var(--accent)]/50'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* QUOTE CURRENCY EVENTS PANEL */}
                  <div className="bg-[var(--bg)] p-4 rounded-sm border border-[var(--line)] space-y-3 font-mono">
                    <div className="flex justify-between items-center border-b border-[var(--line)] pb-2">
                      <span className="text-xs font-bold text-[var(--accent)] uppercase">
                        {isEs ? `Eventos ${quoteCurrency} (Cotizada)` : `${quoteCurrency} Events (Quote)`}
                      </span>
                      <button 
                        type="button" 
                        onClick={addQuoteEvent} 
                        className="bg-[var(--surface-2)] hover:bg-[var(--accent)]/15 text-[var(--ink)] hover:text-[var(--accent)] border border-[var(--line)] hover:border-[var(--accent)]/50 text-[10px] font-bold px-2.5 py-1 rounded-sm transition cursor-pointer flex items-center gap-1"
                      >
                        <span>+</span> {isEs ? 'AÑADIR' : 'ADD'}
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {quoteEvents.map((evt) => (
                        <div key={evt.id} className="bg-[var(--surface)] border border-[var(--line)] rounded-sm p-3 space-y-2 relative">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <select 
                              value={evt.type} 
                              onChange={(e) => updateQuoteEvent(evt.id, { type: e.target.value })}
                              className="w-full sm:flex-grow bg-[var(--bg)] border border-[var(--line)] text-[10px] sm:text-xs p-2 sm:p-1.5 rounded-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]/50 cursor-pointer min-w-0 font-mono min-h-[38px] sm:min-h-[34px]"
                            >
                              <option value="none">-- {isEs ? 'SELECCIONAR EVENTO' : 'SELECT EVENT'} --</option>
                              <optgroup label={isEs ? "Bancos Centrales" : "Central Banks"} className="bg-[var(--bg)]">
                                <option value="CB Press">{isEs ? 'Decisión / Conferencia B.C.' : 'C.B. Decisions / Press Conf'}</option>
                                <option value="Central Bank">{isEs ? 'Minutas de Banco Central' : 'Central Bank Minutes'}</option>
                              </optgroup>
                              <optgroup label={isEs ? "Actividad Económica" : "Economic Activity & Growth"} className="bg-[var(--bg)]">
                                <option value="GDP">{isEs ? 'PIB (Crecimiento)' : 'GDP (Growth Rate)'}</option>
                                <option value="PMIs">{isEs ? 'PMIs (Mfg/Servicios)' : 'PMIs (Mfg/Services)'}</option>
                                <option value="Retail Sales">{isEs ? 'Ventas Minoristas' : 'Retail Sales'}</option>
                                <option value="Consumer Sentiment">{isEs ? 'Confianza Consumidor' : 'Consumer Sentiment'}</option>
                                <option value="Industrial Production">{isEs ? 'Producción Industrial' : 'Industrial Prod.'}</option>
                                <option value="Trade Balance">{isEs ? 'Balanza Comercial' : 'Trade Balance'}</option>
                              </optgroup>
                              <optgroup label={isEs ? "Inflación y Precios" : "Inflation & Prices"} className="bg-[var(--bg)]">
                                <option value="Inflation">{isEs ? 'Inflación (IPC/PCE)' : 'Inflation (CPI/PCE)'}</option>
                                <option value="PPI">{isEs ? 'IPP (Inflación Mayorista)' : 'PPI (Producer Inflation)'}</option>
                              </optgroup>
                              <optgroup label={isEs ? "Empleo y Salarios" : "Labor Market & Earnings"} className="bg-[var(--bg)]">
                                <option value="Employment">{isEs ? 'NFP / Desempleo' : 'Employment (NFP/UR)'}</option>
                                <option value="Jobless Claims">{isEs ? 'Peticiones Desempleo' : 'Jobless Claims'}</option>
                                <option value="Average Earnings">{isEs ? 'Salarios / Ingresos' : 'Average Earnings / Wages'}</option>
                              </optgroup>
                              <optgroup label={isEs ? "Geopolítica" : "Risk & Geopolitics"} className="bg-[var(--bg)]">
                                <option value="Geopolitics">{isEs ? 'Geopolítica / Guerra / Aranceles' : 'Geopolitics / War Risk'}</option>
                              </optgroup>
                            </select>

                            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                              <select 
                                value={evt.bias} 
                                onChange={(e) => updateQuoteEvent(evt.id, { bias: e.target.value as any })}
                                className="flex-1 sm:w-36 bg-[var(--bg)] border border-[var(--line)] text-[10px] sm:text-xs p-2 sm:p-1.5 rounded-sm text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]/50 font-bold cursor-pointer font-mono min-h-[38px] sm:min-h-[34px]"
                              >
                                <option value="none">-- {isEs ? 'SESGO' : 'BIAS'} --</option>
                                <option value="very_bullish" className="text-emerald-400">🟢 {isEs ? 'MUY ALCISTA (+2)' : 'VERY BULLISH (+2)'}</option>
                                <option value="bullish" className="text-yellow-400">🟡 {isEs ? 'ALCISTA (+1)' : 'BULLISH (+1)'}</option>
                                <option value="bearish" className="text-orange-400">🟠 {isEs ? 'BAJISTA (-1)' : 'BEARISH (-1)'}</option>
                                <option value="very_bearish" className="text-rose-400">🔴 {isEs ? 'MUY BAJISTA (-2)' : 'VERY BEARISH (-2)'}</option>
                              </select>

                              <button 
                                type="button" 
                                onClick={() => removeQuoteEvent(evt.id)} 
                                className="text-[var(--ink-muted)] hover:text-rose-400 text-sm w-9 h-9 sm:w-8 sm:h-8 flex items-center justify-center font-bold shrink-0 transition cursor-pointer border border-[var(--line)] hover:border-rose-900/50"
                                title="Delete"
                              >
                                ✕
                              </button>
                            </div>
                          </div>

                          <input 
                            type="text" 
                            value={evt.note} 
                            onChange={(e) => updateQuoteEvent(evt.id, { note: e.target.value })}
                            placeholder={isEs ? "Objetivo de consenso, métricas real vs pronóstico..." : "Consensus targets, actual vs prior metrics..."}
                            className={`w-full text-[10px] sm:text-xs p-2 sm:p-1.5 rounded-sm font-mono focus:outline-none min-h-[36px] sm:min-h-[32px] ${
                              evt.type === 'Geopolitics' 
                                ? 'bg-rose-950/20 border border-rose-900/60 text-rose-300 placeholder-rose-700/60 focus:border-rose-400' 
                                : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] focus:border-[var(--accent)]/50'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                <p className="text-[11px] text-[var(--ink-muted)] font-sans italic border-t border-[var(--line)] pt-3">
                  {isEs 
                    ? '* Nota: Datos alcistas en la divisa Base suman (+), mientras que en la Cotizada restan (-). La selección de Geopolítica activa el régimen de riesgo de cola.'
                    : '* Note: Base currency positive events add positive bias (+), while Quote currency positive events subtract from the pair ratio (-). Geopolitics flags high-volatility tail-risk regimes.'}
                </p>
              </div>

              {/* MACRO INTELLIGENCE DOSSIER (WEEKLY NOTES) */}
              <div className="bg-[var(--surface)] rounded-sm border border-[var(--line)] p-5 sm:p-6 shadow-2xl space-y-4 font-mono">
                <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                  <span className="text-[var(--accent)] font-bold text-[10px] tracking-widest uppercase">
                    // {isEs ? 'DOSSIER MACRO Y REGISTRO DE RIESGOS' : 'MACRO RISK & DOSSIER LOGS'}
                  </span>
                  <span className="text-[10px] text-[var(--ink-muted)]">
                    {isEs ? 'AUTO-GUARDADO ACTIVO' : 'AUTO-SAVED TO PERSISTENCE'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--ink-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span className="text-[var(--accent)]">🏛️</span> {isEs ? 'Política Monetaria y Bancos Centrales' : 'Central Bank Policy Trajectory'}
                    </label>
                    <textarea 
                      value={noteCB} 
                      onChange={(e) => setNoteCB(e.target.value)} 
                      rows={4}
                      className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-sm p-3 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]/50 font-mono leading-relaxed transition resize-none" 
                      placeholder={isEs ? "Registra expectativas de tasas de interés, forward guidance, conferencias de prensa y votos de gobernadores..." : "Track interest rate expectations, forward guidance, press conferences, and dissent counts..."}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[var(--ink-muted)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span className="text-rose-400">🛡️</span> {isEs ? 'Riesgo Geopolítico y Sucesos Extremos' : 'Geopolitical Risk & Tail Events'}
                    </label>
                    <textarea 
                      value={noteGeo} 
                      onChange={(e) => setNoteGeo(e.target.value)} 
                      rows={4}
                      className="w-full bg-[var(--bg)] border border-[var(--line)] rounded-sm p-3 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]/50 font-mono leading-relaxed transition resize-none" 
                      placeholder={isEs ? "Registra conflictos comerciales, aranceles, flujos a bonos refugio, escaladas y perturbaciones de suministro..." : "Track trade conflicts, tariffs, safe-haven bond flows, defense escalations, and supply chain shifts..."}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT 5 COLS: POINTS 2-5 SUPPORTING MARKET FACTORS */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="bg-[var(--surface)] rounded-sm border border-[var(--line)] p-5 sm:p-6 shadow-2xl space-y-4 font-mono">
                
                <div className="flex justify-between items-center border-b border-[var(--line)] pb-3">
                  <div>
                    <span className="text-[var(--accent)] font-bold text-[10px] tracking-widest uppercase block">
                      // {isEs ? 'PUNTOS 2–5: PILARES DE APOYO' : 'POINTS 2–5: SUPPORTING PILLARS'}
                    </span>
                    <h4 className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider mt-0.5">
                      {isEs ? 'Matriz de Consenso Multifactorial' : 'Multi-Factor Consensus Matrix'}
                    </h4>
                  </div>
                  <span className="text-[9px] bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/40 px-2 py-0.5 rounded-sm font-bold uppercase">
                    {isEs ? 'REQUIERE ≥ 2 COINCIDENCIAS' : 'NEED ≥ 2 TO AGREE'}
                  </span>
                </div>

                {/* PILLAR 2: RETAIL SENTIMENT (SSI) */}
                <div className="bg-[var(--bg)] border border-[var(--line)] p-4 rounded-sm space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[9px] text-[var(--ink-muted)] font-bold uppercase tracking-wider block">// {isEs ? 'PILAR 2' : 'PILLAR 2'}</span>
                      <h5 className="text-xs font-bold text-[var(--ink)] uppercase">{isEs ? 'Sentimiento Minorista (SSI)' : 'Retail Sentiment (SSI)'}</h5>
                      <p className="text-[11px] text-[var(--ink-muted)] font-sans mt-0.5">
                        {isEs ? 'Filtro contrario de posicionamiento minorista.' : 'Contrarian retail crowd positioning filter.'}
                      </p>
                    </div>
                    <div className="flex gap-1.5 w-full sm:w-auto shrink-0 justify-end">
                      <button 
                        onClick={() => togglePillar('p2', 'buy')} 
                        className={`flex-1 sm:flex-initial text-center sm:min-w-[76px] border text-[11px] sm:text-[10px] px-3 py-2 sm:py-1.5 rounded-sm font-bold transition cursor-pointer min-h-[38px] sm:min-h-[34px] flex items-center justify-center ${
                          pillars.p2 === 'buy' 
                            ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]' 
                            : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--accent)]'
                        }`}
                      >
                        {isEs ? 'COMPRA' : 'BUY'}
                      </button>
                      <button 
                        onClick={() => togglePillar('p2', 'sell')} 
                        className={`flex-1 sm:flex-initial text-center sm:min-w-[76px] border text-[11px] sm:text-[10px] px-3 py-2 sm:py-1.5 rounded-sm font-bold transition cursor-pointer min-h-[38px] sm:min-h-[34px] flex items-center justify-center ${
                          pillars.p2 === 'sell' 
                            ? 'bg-rose-950/40 text-rose-300 border-rose-500' 
                            : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--ink-muted)] hover:text-rose-400'
                        }`}
                      >
                        {isEs ? 'VENTA' : 'SELL'}
                      </button>
                      <button 
                        onClick={() => togglePillar('p2', 'neutral')} 
                        className={`flex-1 sm:flex-initial text-center sm:min-w-[56px] border text-[11px] sm:text-[10px] px-2.5 py-2 sm:py-1.5 rounded-sm font-bold transition cursor-pointer min-h-[38px] sm:min-h-[34px] flex items-center justify-center ${
                          pillars.p2 === 'neutral' 
                            ? 'bg-[var(--surface-2)] text-[var(--ink)] border-[var(--line-strong)]' 
                            : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                        }`}
                      >
                        NEUT
                      </button>
                    </div>
                  </div>
                </div>

                {/* PILLAR 3: CURRENCY WEIGHTING */}
                <div className="bg-[var(--bg)] border border-[var(--line)] p-4 rounded-sm space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[9px] text-[var(--ink-muted)] font-bold uppercase tracking-wider block">// {isEs ? 'PILAR 3' : 'PILLAR 3'}</span>
                      <h5 className="text-xs font-bold text-[var(--ink)] uppercase">{isEs ? 'Ponderación de Divisas' : 'Currency Weighting'}</h5>
                      <p className="text-[11px] text-[var(--ink-muted)] font-sans mt-0.5">
                        {isEs ? 'Puntuación macro: inflación, empleo y PIB.' : 'Macro score based on inflation, jobs & GDP.'}
                      </p>
                    </div>
                    <div className="flex gap-1.5 w-full sm:w-auto shrink-0 justify-end">
                      <button 
                        onClick={() => togglePillar('p3', 'buy')} 
                        className={`flex-1 sm:flex-initial text-center sm:min-w-[76px] border text-[11px] sm:text-[10px] px-3 py-2 sm:py-1.5 rounded-sm font-bold transition cursor-pointer min-h-[38px] sm:min-h-[34px] flex items-center justify-center ${
                          pillars.p3 === 'buy' 
                            ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]' 
                            : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--accent)]'
                        }`}
                      >
                        {isEs ? 'COMPRA' : 'BUY'}
                      </button>
                      <button 
                        onClick={() => togglePillar('p3', 'sell')} 
                        className={`flex-1 sm:flex-initial text-center sm:min-w-[76px] border text-[11px] sm:text-[10px] px-3 py-2 sm:py-1.5 rounded-sm font-bold transition cursor-pointer min-h-[38px] sm:min-h-[34px] flex items-center justify-center ${
                          pillars.p3 === 'sell' 
                            ? 'bg-rose-950/40 text-rose-300 border-rose-500' 
                            : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--ink-muted)] hover:text-rose-400'
                        }`}
                      >
                        {isEs ? 'VENTA' : 'SELL'}
                      </button>
                      <button 
                        onClick={() => togglePillar('p3', 'neutral')} 
                        className={`flex-1 sm:flex-initial text-center sm:min-w-[56px] border text-[11px] sm:text-[10px] px-2.5 py-2 sm:py-1.5 rounded-sm font-bold transition cursor-pointer min-h-[38px] sm:min-h-[34px] flex items-center justify-center ${
                          pillars.p3 === 'neutral' 
                            ? 'bg-[var(--surface-2)] text-[var(--ink)] border-[var(--line-strong)]' 
                            : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                        }`}
                      >
                        NEUT
                      </button>
                    </div>
                  </div>
                </div>

                {/* PILLAR 4: RISK SENTIMENT */}
                <div className="bg-[var(--bg)] border border-[var(--line)] p-4 rounded-sm space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[9px] text-[var(--ink-muted)] font-bold uppercase tracking-wider block">// {isEs ? 'PILAR 4' : 'PILLAR 4'}</span>
                      <h5 className="text-xs font-bold text-[var(--ink)] uppercase">{isEs ? 'Sentimiento de Riesgo (Intermercados)' : 'Risk Sentiment (Cross-Asset)'}</h5>
                      <p className="text-[11px] text-[var(--ink-muted)] font-sans mt-0.5">
                        {isEs ? 'Régimen general: bolsas, oro y materias primas.' : 'Market regime across equities, gold & commodities.'}
                      </p>
                    </div>
                    <div className="flex gap-1.5 w-full sm:w-auto shrink-0 justify-end">
                      <button 
                        onClick={() => togglePillar('p4', 'buy')} 
                        className={`flex-1 sm:flex-initial text-center sm:min-w-[76px] border text-[11px] sm:text-[10px] px-3 py-2 sm:py-1.5 rounded-sm font-bold transition cursor-pointer min-h-[38px] sm:min-h-[34px] flex items-center justify-center ${
                          pillars.p4 === 'buy' 
                            ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]' 
                            : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--accent)]'
                        }`}
                      >
                        {isEs ? 'COMPRA' : 'BUY'}
                      </button>
                      <button 
                        onClick={() => togglePillar('p4', 'sell')} 
                        className={`flex-1 sm:flex-initial text-center sm:min-w-[76px] border text-[11px] sm:text-[10px] px-3 py-2 sm:py-1.5 rounded-sm font-bold transition cursor-pointer min-h-[38px] sm:min-h-[34px] flex items-center justify-center ${
                          pillars.p4 === 'sell' 
                            ? 'bg-rose-950/40 text-rose-300 border-rose-500' 
                            : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--ink-muted)] hover:text-rose-400'
                        }`}
                      >
                        {isEs ? 'VENTA' : 'SELL'}
                      </button>
                      <button 
                        onClick={() => togglePillar('p4', 'neutral')} 
                        className={`flex-1 sm:flex-initial text-center sm:min-w-[56px] border text-[11px] sm:text-[10px] px-2.5 py-2 sm:py-1.5 rounded-sm font-bold transition cursor-pointer min-h-[38px] sm:min-h-[34px] flex items-center justify-center ${
                          pillars.p4 === 'neutral' 
                            ? 'bg-[var(--surface-2)] text-[var(--ink)] border-[var(--line-strong)]' 
                            : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                        }`}
                      >
                        NEUT
                      </button>
                    </div>
                  </div>

                  {/* Commodity & Risk Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[var(--line)]">
                    <div>
                      <label className="block text-[8px] font-bold text-[var(--ink-muted)] uppercase mb-1">
                        {isEs ? 'Petróleo Crudo (WTI)' : 'Crude Oil (WTI)'}
                      </label>
                      <input 
                        type="text" 
                        value={p4Oil} 
                        onChange={(e) => setP4Oil(e.target.value)} 
                        placeholder={isEs ? "ej. Rally $82/barril" : "e.g. Rallying $82/bbl"}
                        className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-sm p-2 sm:p-1.5 text-xs focus:outline-none focus:border-[var(--accent)]/50 text-[var(--ink)] font-mono min-h-[36px] sm:min-h-[32px]"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-[var(--ink-muted)] uppercase mb-1">
                        {isEs ? 'Oro (XAU/USD)' : 'Gold (XAU/USD)'}
                      </label>
                      <input 
                        type="text" 
                        value={p4Gold} 
                        onChange={(e) => setP4Gold(e.target.value)} 
                        placeholder={isEs ? "ej. Flujo refugio $2,680" : "e.g. Safe-haven bid $2,680"}
                        className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-sm p-2 sm:p-1.5 text-xs focus:outline-none focus:border-[var(--accent)]/50 text-[var(--ink)] font-mono min-h-[36px] sm:min-h-[32px]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[8px] font-bold text-[var(--ink-muted)] uppercase mb-1">
                        {isEs ? 'Impulsores de Apetito por Riesgo' : 'Risk Appetite Drivers'}
                      </label>
                      <input 
                        type="text" 
                        value={p4Notes} 
                        onChange={(e) => setP4Notes(e.target.value)} 
                        placeholder={isEs ? "ej. Rally en bolsas = Risk-ON que favorece divisas de alto beta..." : "e.g. Equity rally = Risk-ON environment favoring high-beta..."}
                        className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-sm p-2 sm:p-1.5 text-xs focus:outline-none focus:border-[var(--accent)]/50 text-[var(--ink)] font-mono min-h-[36px] sm:min-h-[32px]"
                      />
                    </div>
                  </div>
                </div>

                {/* PILLAR 5: CENTRAL BANKS & INTEREST RATES */}
                <div className="bg-[var(--bg)] border border-[var(--line)] p-4 rounded-sm space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[9px] text-[var(--ink-muted)] font-bold uppercase tracking-wider block">// {isEs ? 'PILAR 5' : 'PILLAR 5'}</span>
                      <h5 className="text-xs font-bold text-[var(--ink)] uppercase">{isEs ? 'Tasas de Interés y Bancos Centrales' : 'Interest Rates & Policy'}</h5>
                      <p className="text-[11px] text-[var(--ink-muted)] font-sans mt-0.5">
                        {isEs ? 'Divergencia Hawkish vs Dovish y diferenciales.' : 'Hawkish vs Dovish divergence & yield spreads.'}
                      </p>
                    </div>
                    <div className="flex gap-1.5 w-full sm:w-auto shrink-0 justify-end">
                      <button 
                        onClick={() => togglePillar('p5', 'buy')} 
                        className={`flex-1 sm:flex-initial text-center sm:min-w-[76px] border text-[11px] sm:text-[10px] px-3 py-2 sm:py-1.5 rounded-sm font-bold transition cursor-pointer min-h-[38px] sm:min-h-[34px] flex items-center justify-center ${
                          pillars.p5 === 'buy' 
                            ? 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]' 
                            : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--accent)]'
                        }`}
                      >
                        {isEs ? 'COMPRA' : 'BUY'}
                      </button>
                      <button 
                        onClick={() => togglePillar('p5', 'sell')} 
                        className={`flex-1 sm:flex-initial text-center sm:min-w-[76px] border text-[11px] sm:text-[10px] px-3 py-2 sm:py-1.5 rounded-sm font-bold transition cursor-pointer min-h-[38px] sm:min-h-[34px] flex items-center justify-center ${
                          pillars.p5 === 'sell' 
                            ? 'bg-rose-950/40 text-rose-300 border-rose-500' 
                            : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--ink-muted)] hover:text-rose-400'
                        }`}
                      >
                        {isEs ? 'VENTA' : 'SELL'}
                      </button>
                      <button 
                        onClick={() => togglePillar('p5', 'neutral')} 
                        className={`flex-1 sm:flex-initial text-center sm:min-w-[56px] border text-[11px] sm:text-[10px] px-2.5 py-2 sm:py-1.5 rounded-sm font-bold transition cursor-pointer min-h-[38px] sm:min-h-[34px] flex items-center justify-center ${
                          pillars.p5 === 'neutral' 
                            ? 'bg-[var(--surface-2)] text-[var(--ink)] border-[var(--line-strong)]' 
                            : 'bg-[var(--surface-2)] border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                        }`}
                      >
                        NEUT
                      </button>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-[var(--line)]">
                    <label className="block text-[8px] font-bold text-[var(--ink-muted)] uppercase mb-1">
                      {isEs ? 'Notas de Política Monetaria' : 'Central Bank Divergence Note'}
                    </label>
                    <input 
                      type="text" 
                      value={p5Notes} 
                      onChange={(e) => setP5Notes(e.target.value)} 
                      placeholder={isEs ? "ej. Pausa del BoE vs recorte de 25pb descontado por el BCE..." : "e.g. BoE pause vs ECB 25bp rate cut pricing..."}
                      className="w-full bg-[var(--surface)] border border-[var(--line)] rounded-sm p-1.5 text-xs focus:outline-none focus:border-[var(--accent)]/50 text-[var(--ink)] font-mono"
                    />
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* BOTTOM ACTION SECTION: GENERATE STRATEGY REPORT */}
          <div className="bg-[var(--surface)] rounded-sm border border-[var(--line)] p-6 font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl">
            <div className="space-y-1">
              <div className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider flex items-center gap-2">
                <span>📑</span> {isEs ? 'BRIEFING ESTRATÉGICO INSTITUCIONAL' : 'INSTITUTIONAL STRATEGY BRIEFING'}
              </div>
              <p className="text-[var(--ink-muted)] text-xs font-sans">
                {isEs 
                  ? 'Consolida los vectores de sentimiento, catalizadores de noticias y notas de dossier en un reporte ejecutivo profesional listo para imprimir en PDF.' 
                  : 'Compile active currency sentiment vectors, event catalysts, and dossier notes into an audit-ready print/PDF briefing report.'}
              </p>
            </div>
            <button 
              onClick={handlePrint}
              className="bg-[var(--accent)] hover:bg-[var(--ink)] text-[var(--bg)] px-6 py-2.5 rounded-sm text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <span>🖨️</span> {isEs ? 'GENERAR REPORTE.PDF →' : 'GENERATE REPORT.PDF →'}
            </button>
          </div>

        </main>

      </div>

      {/* ========================================================= */}
      {/* 📄 INSTITUTIONAL STRATEGY BRIEFING DOSSIER (PDF / PRINT)  */}
      {/* ========================================================= */}
      <div id="pdf-report-container" className="hidden print:block p-0 text-slate-950 bg-white max-w-4xl mx-auto font-sans leading-normal" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
        
        {/* TOP CLASSIFICATION ACCENT BAR */}
        <div className="h-1.5 bg-slate-900 w-full mb-4" />

        {/* INSTITUTIONAL MASTHEAD */}
        <div className="border-b-2 border-slate-900 pb-4 mb-5 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black tracking-widest bg-slate-900 text-white px-2 py-0.5 uppercase font-mono">
                {isEs ? 'IDEA DE TRADING // AUDITORÍA INSTITUCIONAL' : 'TRADE IDEA // INSTITUTIONAL AUDIT'}
              </span>
              <span className="text-[9px] font-bold text-slate-500 font-mono tracking-wider">
                DOC ID: KGR-QD-{baseCurrency}{quoteCurrency}-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950 uppercase font-sans">
              TRADE IDEA — {baseCurrency}/{quoteCurrency} // {getTradeDirectionLabel()}
            </h1>
            <p className="text-[10px] text-slate-600 font-medium font-mono uppercase tracking-wider mt-0.5">
              Kairos Global Research // {isEs ? 'Definidor de Sentimiento de Divisas · Modelo de 5 Pilares' : 'Currency Sentiment Definer · 5-Pillars Quantitative Macro Model'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black text-slate-900 font-mono tracking-tight">
              {baseCurrency}/{quoteCurrency}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {new Date().toLocaleDateString(isEs ? 'es-ES' : 'en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            <div className="text-[9px] text-slate-400 font-mono">EXECUTION TIME: {new Date().toTimeString().slice(0, 8)} UTC</div>
          </div>
        </div>

        {/* 1. EXECUTIVE STRATEGY VERDICT HERO CARD */}
        <div className="mb-5 border border-slate-300 bg-slate-50/80 p-4 rounded-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-200">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 font-mono block">
                {isEs ? '// VEREDICTO SISTÉMICO TÁCTICO' : '// SYSTEM TACTICAL VERDICT'}
              </span>
              <div className="flex items-center gap-2.5 mt-1">
                {isApproved ? (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-black uppercase tracking-wider ${
                    step1Direction === 'buy' ? 'bg-emerald-700 text-white' : 'bg-rose-700 text-white'
                  }`}>
                    <span>{step1Direction === 'buy' ? '▲' : '▼'}</span>
                    {isEs
                      ? `APROBADO: OPERACIÓN ${step1Direction === 'buy' ? 'COMPRA (LONG)' : 'VENTA (SHORT)'}`
                      : `APPROVED: ${step1Direction.toUpperCase()} POSITION`}
                  </span>
                ) : isNoTrade ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-black uppercase tracking-wider bg-slate-800 text-white">
                    <span>■</span> {isEs ? 'SIN OPERACIÓN (NO TRADE)' : 'NO TRADE (CRITERIA NOT MET)'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 text-sm font-black uppercase tracking-wider bg-slate-600 text-white">
                    <span>●</span> {isEs ? 'SIN SESGO DIRECCIONAL' : 'NEUTRAL / NO BIAS'}
                  </span>
                )}
                <span className="text-xs font-mono text-slate-600">
                  {isApproved
                    ? (isEs ? 'Confluencia direccional confirmada' : 'Directional confluence confirmed')
                    : (isEs ? 'Esperando convergencia de factores' : 'Awaiting factor convergence')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div className="border-l border-slate-300 pl-4">
                <span className="text-[9px] font-bold uppercase font-mono text-slate-500 block">
                  {isEs ? 'Peso Neto' : 'Net Weight'}
                </span>
                <span className={`text-xl font-black font-mono ${
                  netWeight > 0 ? 'text-emerald-700' : netWeight < 0 ? 'text-rose-700' : 'text-slate-800'
                }`}>
                  {netWeight > 0 ? `+${netWeight}` : netWeight} PTS
                </span>
              </div>
              <div className="border-l border-slate-300 pl-4">
                <span className="text-[9px] font-bold uppercase font-mono text-slate-500 block">
                  {isEs ? 'Sesgo Calendario' : 'Calendar Bias'}
                </span>
                <span className="text-sm font-black font-mono text-slate-900 uppercase">
                  {step1Direction}
                </span>
              </div>
            </div>
          </div>

          {/* Metric Cards Ribbon */}
          <div className="grid grid-cols-4 gap-2 pt-3 text-[10px] font-mono">
            <div className="bg-white border border-slate-200 p-2">
              <span className="text-slate-400 block text-[8px] uppercase">{isEs ? 'Par Base / Cotizada' : 'Base / Quote Pair'}</span>
              <span className="font-bold text-slate-900 text-xs">{baseCurrency} / {quoteCurrency}</span>
            </div>
            <div className="bg-white border border-slate-200 p-2">
              <span className="text-slate-400 block text-[8px] uppercase">{isEs ? 'Pilar 1 (Calendario)' : 'Pillar 1 (Calendar)'}</span>
              <span className="font-bold text-slate-900">{formatBiasLabel(step1Direction)} ({netWeight > 0 ? `+${netWeight}` : netWeight})</span>
            </div>
            <div className="bg-white border border-slate-200 p-2">
              <span className="text-slate-400 block text-[8px] uppercase">{isEs ? 'Sentimiento SSI (P2)' : 'Retail SSI (P2)'}</span>
              <span className="font-bold text-slate-900 uppercase">{pillars.p2}</span>
            </div>
            <div className="bg-white border border-slate-200 p-2">
              <span className="text-slate-400 block text-[8px] uppercase">{isEs ? 'Ponderación (P3)' : 'Weighting (P3)'}</span>
              <span className="font-bold text-slate-900 uppercase">{pillars.p3}</span>
            </div>
          </div>
        </div>

        {/* 2. SECTION: FUNDAMENTAL CALENDAR CORE CATALYST MATRIX */}
        <div className="mb-5">
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-1 mb-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-950 font-sans">
              1. {isEs ? 'Matriz de Catalizadores Fundamentales de Calendario' : 'Fundamental Calendar Catalyst Matrix'}
            </h2>
            <span className="text-[9px] font-mono text-slate-500 uppercase">
              {activeEventsCount} {isEs ? 'Eventos Analizados' : 'Events Analyzed'}
            </span>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-800 text-[10px] uppercase font-bold text-left font-mono">
                <th className="p-2 border border-slate-300 w-[16%]">{isEs ? 'Divisa' : 'Asset Focus'}</th>
                <th className="p-2 border border-slate-300 w-[34%]">{isEs ? 'Evento Económico' : 'Economic Event'}</th>
                <th className="p-2 border border-slate-300 w-[20%]">{isEs ? 'Sesgo Direccional' : 'Directional Bias'}</th>
                <th className="p-2 border border-slate-300 w-[30%]">{isEs ? 'Notas del Analista / Rango' : 'Analyst Execution Notes'}</th>
              </tr>
            </thead>
            <tbody>
              {baseEvents.filter(e => e.type !== 'none').map((e, idx) => (
                <tr key={`b_pr_${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="p-2 border border-slate-300 font-bold font-mono">
                    <span className="bg-slate-200 text-slate-900 px-1.5 py-0.5 text-[10px] mr-1">{baseCurrency}</span> (Base)
                  </td>
                  <td className="p-2 border border-slate-300 font-semibold text-slate-900">{e.type}</td>
                  <td className="p-2 border border-slate-300 font-mono text-[11px] font-bold">
                    <span className={e.bias.includes('bullish') ? 'text-emerald-700' : e.bias.includes('bearish') ? 'text-rose-700' : 'text-slate-600'}>
                      {formatBiasLabel(e.bias)}
                    </span>
                  </td>
                  <td className="p-2 border border-slate-300 text-slate-700 font-mono text-[10px]">{e.note || '—'}</td>
                </tr>
              ))}
              {quoteEvents.filter(e => e.type !== 'none').map((e, idx) => (
                <tr key={`q_pr_${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="p-2 border border-slate-300 font-bold font-mono">
                    <span className="bg-slate-200 text-slate-900 px-1.5 py-0.5 text-[10px] mr-1">{quoteCurrency}</span> (Quote)
                  </td>
                  <td className="p-2 border border-slate-300 font-semibold text-slate-900">{e.type}</td>
                  <td className="p-2 border border-slate-300 font-mono text-[11px] font-bold">
                    <span className={e.bias.includes('bullish') ? 'text-emerald-700' : e.bias.includes('bearish') ? 'text-rose-700' : 'text-slate-600'}>
                      {formatBiasLabel(e.bias)}
                    </span>
                  </td>
                  <td className="p-2 border border-slate-300 text-slate-700 font-mono text-[10px]">{e.note || '—'}</td>
                </tr>
              ))}
              {activeEventsCount === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                    {isEs ? 'Sin eventos de catalizadores registrados para este par.' : 'No catalyst events registered for this asset pair.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 3. SECTION: 5-PILLARS QUANTITATIVE SCORECARD VECTORS */}
        <div className="mb-5">
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-1 mb-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-950 font-sans">
              2. {isEs ? 'Alineación de Factores del Modelo (5 Pilares Estratégicos)' : 'Strategic Quantitative Factor Alignment (5 Pillars)'}
            </h2>
            <span className="text-[9px] font-mono text-slate-500 uppercase">
              {isEs ? 'Matriz de Confluencia Multivariada' : 'Multivariate Confluence Matrix'}
            </span>
          </div>

          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-800 text-[10px] uppercase font-bold text-left font-mono">
                <th className="p-2 border border-slate-300 w-[65%]">{isEs ? 'Pilar Estratégico Cuantitativo' : 'Strategic Pillar Factor'}</th>
                <th className="p-2 border border-slate-300 text-right w-[35%]">{isEs ? 'Estado / Alineación' : 'Pillar Alignment'}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-slate-300">
                  <span className="font-bold text-slate-900 font-mono text-[11px]">{isEs ? 'Pilar 1: Calendario Fundamental' : 'Pillar 1: Fundamental Calendar'}</span>
                  <span className="text-[10px] text-slate-500 block">{isEs ? 'Catalizadores económicos semanales y diferenciales de datos' : 'Weekly economic catalysts and net scoring differential'}</span>
                </td>
                <td className="p-2 border border-slate-300 text-right font-mono font-bold uppercase text-slate-900">
                  {formatBiasLabel(step1Direction)} ({netWeight > 0 ? `+${netWeight}` : netWeight})
                </td>
              </tr>
              <tr className="bg-slate-50/40">
                <td className="p-2 border border-slate-300">
                  <span className="font-bold text-slate-900 font-mono text-[11px]">{isEs ? 'Pilar 2: Sentimiento Minorista (Filtro Contrarian SSI)' : 'Pillar 2: Retail SSI Sentiment (Contrarian)'}</span>
                  <span className="text-[10px] text-slate-500 block">{isEs ? 'Posicionamiento especulativo y sesgo en contra de la multitud' : 'Speculative crowd positioning against extreme retail bias'}</span>
                </td>
                <td className="p-2 border border-slate-300 text-right font-mono font-bold uppercase text-slate-900">
                  {pillars.p2}
                </td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-300">
                  <span className="font-bold text-slate-900 font-mono text-[11px]">{isEs ? 'Pilar 3: Matriz de Ponderación de Divisas (Fuerza Macro)' : 'Pillar 3: Currency Weighting Scorecard (Macro Metrics)'}</span>
                  <span className="text-[10px] text-slate-500 block">{isEs ? 'Salud económica subyacente, empleo, inflación y manufactura' : 'Underlying macro strength, labor market, inflation and PMIs'}</span>
                </td>
                <td className="p-2 border border-slate-300 text-right font-mono font-bold uppercase text-slate-900">
                  {pillars.p3}
                </td>
              </tr>
              <tr className="bg-slate-50/40">
                <td className="p-2 border border-slate-300">
                  <span className="font-bold text-slate-900 font-mono text-[11px]">{isEs ? 'Pilar 4: Sentimiento de Riesgo y Materias Primas' : 'Pillar 4: Risk Sentiment & Commodities'}</span>
                  <span className="text-[10px] text-slate-500 block">
                    {isEs ? 'Entorno Risk-On / Risk-Off' : 'Risk-On / Risk-Off Regimes'} · {isEs ? 'Petróleo WTI' : 'WTI Crude'}: {p4Oil || '—'} · {isEs ? 'Oro' : 'Gold'}: {p4Gold || '—'}
                  </span>
                </td>
                <td className="p-2 border border-slate-300 text-right font-mono font-bold uppercase text-slate-900">
                  {pillars.p4}
                </td>
              </tr>
              <tr>
                <td className="p-2 border border-slate-300">
                  <span className="font-bold text-slate-900 font-mono text-[11px]">{isEs ? 'Pilar 5: Bancos Centrales y Trayectoria de Tipos' : 'Pillar 5: Central Banks & Rate Trajectories'}</span>
                  <span className="text-[10px] text-slate-500 block">
                    {isEs ? 'Divergencia Hawkish / Dovish' : 'Hawkish / Dovish Divergence'} · {p5Notes ? `${isEs ? 'Nota' : 'Note'}: ${p5Notes}` : (isEs ? 'Sin divergencia crítica' : 'No critical divergence')}
                  </span>
                </td>
                <td className="p-2 border border-slate-300 text-right font-mono font-bold uppercase text-slate-900">
                  {pillars.p5}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. SECTION: CORE MACRO REGIME RISK INTELLIGENCE DOSSIER */}
        <div className="mb-6">
          <div className="flex justify-between items-center border-b-2 border-slate-900 pb-1 mb-2">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-950 font-sans">
              3. {isEs ? 'Dossier de Inteligencia y Régimen Macro' : 'Core Macro Regime Risk Intelligence Dossier'}
            </h2>
            <span className="text-[9px] font-mono text-slate-500 uppercase">
              {isEs ? 'Evaluación Cualitativa de Riesgos de Cola' : 'Qualitative Tail-Risk Evaluation'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="border border-slate-300 p-3 bg-slate-50/50">
              <div className="font-bold text-slate-900 uppercase font-mono text-[10px] pb-1 border-b border-slate-200 mb-2 flex items-center gap-1.5">
                <span>🏛️</span> {isEs ? 'Trayectorias de Política Monetaria' : 'Monetary Policy Trajectories'}
              </div>
              <p className="text-slate-700 text-[11px] font-serif leading-relaxed whitespace-pre-wrap">
                {noteCB || (isEs ? 'Perfiles monetarios consolidados dentro de las bandas de guía institucionales.' : 'Monetary tracking profiles consolidated within official guidance bands.')}
              </p>
            </div>

            <div className="border border-slate-300 p-3 bg-slate-50/50">
              <div className="font-bold text-slate-900 uppercase font-mono text-[10px] pb-1 border-b border-slate-200 mb-2 flex items-center gap-1.5">
                <span>🌐</span> {isEs ? 'Riesgos Geopolíticos y Eventos de Cola' : 'Geopolitical Hazards & Tail Risks'}
              </div>
              <p className="text-slate-700 text-[11px] font-serif leading-relaxed whitespace-pre-wrap">
                {noteGeo || (isEs ? 'Sin parámetros de riesgo geopolítico material registrados para este ciclo.' : 'No material geopolitical tail risk logged for the current trading cycle.')}
              </p>
            </div>
          </div>
        </div>

        {/* INSTITUTIONAL AUDIT FOOTER */}
        <div className="border-t border-slate-300 pt-3 flex justify-between items-center text-[9px] text-slate-400 font-mono">
          <span>KAIROS QUANTITATIVE TRADING INTELLIGENCE SYSTEM™</span>
          <span>RESTRICTED DISTRIBUTION // INSTITUTIONAL AUDIT COPY</span>
          <span>PAGE 1 OF 1</span>
        </div>

      </div>

    </div>
  );
}
