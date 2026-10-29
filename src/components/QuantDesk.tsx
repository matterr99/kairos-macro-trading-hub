import React, { useState, useEffect } from 'react';
import { Language } from '../types';

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

  // Print PDF
  const handlePrint = () => {
    window.print();
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
        
        {/* 1. HERO / HEADER SECTION */}
        <section className="relative w-full py-10 sm:py-12 border-b border-zinc-900 bg-[#020203]">
          <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex flex-col md:flex-row md:items-end justify-between gap-6 font-mono">
            <div className="space-y-3">
              <button 
                onClick={onReturnToHub} 
                className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-cyan-400 transition-colors uppercase cursor-pointer"
              >
                &larr; {isEs ? 'Volver al Centro de Herramientas' : 'Return to Tools Hub'}
              </button>
              <div className="flex items-center gap-3">
                <span className="text-cyan-500 font-bold text-[10px] tracking-widest uppercase">// QUANT DESK_V2</span>
                <span className="text-zinc-700">|</span>
                <span className="text-emerald-400 font-bold text-[10px] tracking-wider uppercase">
                  {isEs ? 'MODELO 5 PILARES' : '5-PILLAR MODEL'}
                </span>
                <span className="text-zinc-700">|</span>
                <span className="text-cyan-400 font-bold text-[10px] tracking-wider uppercase">
                  {isEs ? 'DEFINIDOR DE SENTIMIENTO' : 'SENTIMENT DEFINER'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
                {isEs ? 'Definidor Cuantitativo de Sentimiento' : 'Currency Sentiment Definer'}
              </h1>
              <p className="text-xs text-zinc-400 font-sans max-w-2xl font-light leading-relaxed">
                {isEs 
                  ? 'Mesa cuantitativa de verificación de sentimiento. Evalúa catalizadores de noticias, filtro minorista contrario (SSI), ponderaciones macroeconómicas, sentimiento de riesgo y trayectoria de bancos centrales.'
                  : 'Quantitative sentiment verification desk. Evaluates Tier-1 news catalysts, retail crowd positioning (SSI), macro multi-factor weights, risk appetite, and central bank trajectory into high-probability directional verdicts.'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap font-mono text-xs">
              <button 
                onClick={handlePrint}
                className="px-3.5 py-1.5 text-[11px] uppercase tracking-wider bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 rounded-sm border border-cyan-800/80 transition cursor-pointer flex items-center gap-1.5 font-bold shadow-sm"
              >
                <span>📄</span> {isEs ? 'Generar PDF' : 'Generate PDF'}
              </button>
              <button 
                onClick={handleExportBackup}
                className="px-3 py-1.5 text-[11px] uppercase tracking-wider bg-[#0c0c12] hover:bg-zinc-900 text-zinc-300 rounded-sm border border-zinc-800 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>📥</span> {isEs ? 'Exportar Backup' : 'Export Backup'}
              </button>
              <label className="px-3 py-1.5 text-[11px] uppercase tracking-wider bg-[#0c0c12] hover:bg-zinc-900 text-zinc-300 rounded-sm border border-zinc-800 transition cursor-pointer flex items-center gap-1.5">
                <span>📤</span> {isEs ? 'Cargar Backup' : 'Import Backup'}
                <input type="file" accept=".json,application/json" className="hidden" onChange={handleImportBackup} />
              </label>
              <button 
                onClick={handleReset}
                className="px-3 py-1.5 text-[11px] uppercase tracking-wider bg-[#0c0c12] hover:bg-zinc-900 text-rose-400 rounded-sm border border-zinc-800 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>🔄</span> {isEs ? 'Reiniciar' : 'Reset'}
              </button>
            </div>
          </div>
        </section>

        {/* 2. MAIN WORKSPACE VIEW */}
        <main className="w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 sm:py-10 space-y-8">
          
          {/* TOP CONTROL PANEL: ASSET PAIR SELECTOR + VERDICT + NET WEIGHT */}
          <div className="bg-[#040406] rounded-sm border border-zinc-900 p-5 sm:p-6 shadow-2xl">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              
              {/* Left: Asset Selection */}
              <div className="space-y-2 font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold text-[10px] tracking-widest uppercase">
                    // {isEs ? 'PAR ACTIVO SELECCIONADO' : 'ACTIVE CURRENCY PAIR'}
                  </span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-[10px] text-zinc-500 uppercase">
                    {isEs ? 'CRUCE G10' : 'G10 CROSS'}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 bg-[#020203] border border-zinc-800 rounded-sm px-4 py-2 w-fit">
                  {/* Base Selector */}
                  <div className="flex flex-col">
                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">
                      {isEs ? 'DIVISA BASE' : 'BASE LEG'}
                    </span>
                    <select 
                      value={baseCurrency} 
                      onChange={(e) => setBaseCurrency(e.target.value)} 
                      className="bg-transparent text-xl font-black text-white hover:text-cyan-400 transition font-mono focus:outline-none cursor-pointer"
                    >
                      {G10_CURRENCIES.map(c => <option key={c} value={c} className="bg-[#040406]">{c}</option>)}
                    </select>
                  </div>

                  {/* Swap Button */}
                  <button
                    onClick={handleSwapCurrencies}
                    title={isEs ? 'Invertir Par' : 'Invert Currency Pair'}
                    className="px-2 py-1 bg-zinc-900 hover:bg-cyan-950/60 text-zinc-400 hover:text-cyan-400 border border-zinc-800 rounded-sm text-xs transition cursor-pointer self-center mt-2"
                  >
                    ⇄
                  </button>

                  {/* Quote Selector */}
                  <div className="flex flex-col">
                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">
                      {isEs ? 'DIVISA COTIZADA' : 'QUOTE LEG'}
                    </span>
                    <select 
                      value={quoteCurrency} 
                      onChange={(e) => setQuoteCurrency(e.target.value)} 
                      className="bg-transparent text-xl font-black text-white hover:text-cyan-400 transition font-mono focus:outline-none cursor-pointer"
                    >
                      {G10_CURRENCIES.map(c => <option key={c} value={c} className="bg-[#040406]">{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Middle: Score Balance & Regime Badge */}
              <div className="flex flex-wrap items-center gap-4 font-mono">
                <div className="bg-[#020203] border border-zinc-800 rounded-sm p-3 min-w-[150px]">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-bold">
                    {isEs ? 'PESO NETO CALENDARIO' : 'CALENDAR NET WEIGHT'}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-2xl font-black ${netWeight > 0 ? 'text-cyan-400' : netWeight < 0 ? 'text-rose-400' : 'text-white'}`}>
                      {netWeight > 0 ? `+${netWeight}` : netWeight}
                    </span>
                    <span className="text-[10px] text-zinc-500 font-sans">
                      {isEs ? 'balance pts' : 'pts balance'}
                    </span>
                  </div>
                </div>

                <div className="bg-[#020203] border border-zinc-800 rounded-sm p-3 min-w-[180px]">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-widest block font-bold">
                    {isEs ? 'RÉGIMEN DE MERCADO' : 'REGIME CLASSIFICATION'}
                  </span>
                  <div className="mt-1">
                    {hasGeopolitics ? (
                      <span className="text-[10px] font-mono bg-rose-950/30 border border-rose-900/70 text-rose-400 px-2 py-0.5 rounded-sm inline-block font-bold">
                        ⚠️ {isEs ? 'Alto Riesgo Geopolítico' : 'High Geopolitical Hazard'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-sm inline-block">
                        {isEs ? 'Perfil de Volatilidad Normal' : 'Normal Volatility Profile'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Glowing Tactical Decision Panel */}
              <div className={`p-4 rounded-sm border flex flex-col items-center justify-center w-full lg:w-72 transition font-mono text-center ${
                isApproved 
                  ? 'bg-cyan-950/20 border-cyan-500/60 shadow-[0_0_16px_rgba(6,182,212,0.25)]' 
                  : isNoTrade 
                  ? 'bg-rose-950/20 border-rose-500/60 shadow-[0_0_16px_rgba(244,63,94,0.2)]' 
                  : 'bg-[#020203] border-zinc-800'
              }`}>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                  // {isEs ? 'VEREDICTO TÁCTICO DEL SISTEMA' : 'SYSTEM TACTICAL VERDICT'}
                </span>
                
                {isApproved && (
                  <>
                    <span className="text-base font-black mt-1 text-cyan-400 tracking-wider">
                      {isEs ? `APROBADO (${step1Direction === 'buy' ? 'COMPRA' : 'VENTA'})` : `APPROVED (${step1Direction.toUpperCase()})`}
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-1 font-sans">
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
                    <span className="text-[10px] text-zinc-400 mt-1 font-sans">
                      {isEs 
                        ? `Alineación insuficiente (${matchCount}/4 coincidieron).` 
                        : `Insufficient factor agreement (${matchCount}/4 agreed).`}
                    </span>
                  </>
                )}

                {!isApproved && !isNoTrade && (
                  <>
                    <span className="text-base font-black mt-1 text-zinc-500 tracking-wider">
                      {isEs ? 'SIN SESGO' : 'NO BIAS'}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1 font-sans">
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
              
              <div className="bg-[#040406] rounded-sm border border-zinc-900 p-5 sm:p-6 shadow-2xl space-y-5">
                
                <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3 font-mono">
                  <div>
                    <span className="text-cyan-400 font-bold text-[10px] tracking-widest uppercase block">
                      // {isEs ? 'PUNTO 1: CATALIZADORES FUNDAMENTALES' : 'POINT 1: FUNDAMENTAL CATALYSTS'}
                    </span>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">
                      {isEs ? 'Calendario Económico y Noticias Clave' : 'Economic Calendar & News Feed'}
                    </h3>
                  </div>
                  <span className="text-[10px] text-zinc-500 bg-[#020203] border border-zinc-800 px-2 py-1 rounded-sm">
                    {isEs ? 'Regla: Eventos Tier-1' : 'Rule Base: Tier-1 Events'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* BASE CURRENCY EVENTS PANEL */}
                  <div className="bg-[#020203] p-4 rounded-sm border border-zinc-800/90 space-y-3 font-mono">
                    <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
                      <span className="text-xs font-bold text-cyan-400 uppercase">
                        {isEs ? `Eventos ${baseCurrency} (Base)` : `${baseCurrency} Events (Base)`}
                      </span>
                      <button 
                        type="button" 
                        onClick={addBaseEvent} 
                        className="bg-zinc-900 hover:bg-cyan-950/60 text-zinc-300 hover:text-cyan-400 border border-zinc-800 hover:border-cyan-500/50 text-[10px] font-bold px-2.5 py-1 rounded-sm transition cursor-pointer flex items-center gap-1"
                      >
                        <span>+</span> {isEs ? 'AÑADIR' : 'ADD'}
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {baseEvents.map((evt) => (
                        <div key={evt.id} className="bg-[#040406] border border-zinc-800 rounded-sm p-3 space-y-2 relative">
                          <div className="flex items-center gap-2">
                            <select 
                              value={evt.type} 
                              onChange={(e) => updateBaseEvent(evt.id, { type: e.target.value })}
                              className="flex-grow bg-[#020203] border border-zinc-800 text-[10px] p-1.5 rounded-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer min-w-0 font-mono"
                            >
                              <option value="none">-- {isEs ? 'SELECCIONAR EVENTO' : 'SELECT EVENT'} --</option>
                              <optgroup label={isEs ? "Bancos Centrales" : "Central Banks"} className="bg-[#020203]">
                                <option value="CB Press">{isEs ? 'Decisión / Conferencia B.C.' : 'C.B. Decisions / Press Conf'}</option>
                                <option value="Central Bank">{isEs ? 'Minutas de Banco Central' : 'Central Bank Minutes'}</option>
                              </optgroup>
                              <optgroup label={isEs ? "Actividad Económica" : "Economic Activity & Growth"} className="bg-[#020203]">
                                <option value="GDP">{isEs ? 'PIB (Crecimiento)' : 'GDP (Growth Rate)'}</option>
                                <option value="PMIs">{isEs ? 'PMIs (Mfg/Servicios)' : 'PMIs (Mfg/Services)'}</option>
                                <option value="Retail Sales">{isEs ? 'Ventas Minoristas' : 'Retail Sales'}</option>
                                <option value="Consumer Sentiment">{isEs ? 'Confianza Consumidor' : 'Consumer Sentiment'}</option>
                                <option value="Industrial Production">{isEs ? 'Producción Industrial' : 'Industrial Prod.'}</option>
                                <option value="Trade Balance">{isEs ? 'Balanza Comercial' : 'Trade Balance'}</option>
                              </optgroup>
                              <optgroup label={isEs ? "Inflación y Precios" : "Inflation & Prices"} className="bg-[#020203]">
                                <option value="Inflation">{isEs ? 'Inflación (IPC/PCE)' : 'Inflation (CPI/PCE)'}</option>
                                <option value="PPI">{isEs ? 'IPP (Inflación Mayorista)' : 'PPI (Producer Inflation)'}</option>
                              </optgroup>
                              <optgroup label={isEs ? "Empleo y Salarios" : "Labor Market & Earnings"} className="bg-[#020203]">
                                <option value="Employment">{isEs ? 'NFP / Desempleo' : 'Employment (NFP/UR)'}</option>
                                <option value="Jobless Claims">{isEs ? 'Peticiones Desempleo' : 'Jobless Claims'}</option>
                                <option value="Average Earnings">{isEs ? 'Salarios / Ingresos' : 'Average Earnings / Wages'}</option>
                              </optgroup>
                              <optgroup label={isEs ? "Geopolítica" : "Risk & Geopolitics"} className="bg-[#020203]">
                                <option value="Geopolitics">{isEs ? 'Geopolítica / Guerra / Aranceles' : 'Geopolitics / War Risk'}</option>
                              </optgroup>
                            </select>

                            <select 
                              value={evt.bias} 
                              onChange={(e) => updateBaseEvent(evt.id, { bias: e.target.value as any })}
                              className="w-36 shrink-0 bg-[#020203] border border-zinc-800 text-[10px] p-1.5 rounded-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50 font-bold cursor-pointer font-mono"
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
                              className="text-zinc-600 hover:text-rose-500 text-xs px-1 font-bold shrink-0 transition cursor-pointer"
                              title="Delete"
                            >
                              ✕
                            </button>
                          </div>

                          <input 
                            type="text" 
                            value={evt.note} 
                            onChange={(e) => updateBaseEvent(evt.id, { note: e.target.value })}
                            placeholder={isEs ? "Objetivo de consenso, métricas real vs pronóstico..." : "Consensus targets, actual vs prior metrics..."}
                            className={`w-full text-[10px] p-1.5 rounded-sm font-mono focus:outline-none ${
                              evt.type === 'Geopolitics' 
                                ? 'bg-rose-950/20 border border-rose-900/60 text-rose-300 placeholder-rose-700/60 focus:border-rose-400' 
                                : 'bg-[#020203] border border-zinc-800 text-zinc-300 focus:border-cyan-500/50'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* QUOTE CURRENCY EVENTS PANEL */}
                  <div className="bg-[#020203] p-4 rounded-sm border border-zinc-800/90 space-y-3 font-mono">
                    <div className="flex justify-between items-center border-b border-zinc-800/80 pb-2">
                      <span className="text-xs font-bold text-cyan-400 uppercase">
                        {isEs ? `Eventos ${quoteCurrency} (Cotizada)` : `${quoteCurrency} Events (Quote)`}
                      </span>
                      <button 
                        type="button" 
                        onClick={addQuoteEvent} 
                        className="bg-zinc-900 hover:bg-cyan-950/60 text-zinc-300 hover:text-cyan-400 border border-zinc-800 hover:border-cyan-500/50 text-[10px] font-bold px-2.5 py-1 rounded-sm transition cursor-pointer flex items-center gap-1"
                      >
                        <span>+</span> {isEs ? 'AÑADIR' : 'ADD'}
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {quoteEvents.map((evt) => (
                        <div key={evt.id} className="bg-[#040406] border border-zinc-800 rounded-sm p-3 space-y-2 relative">
                          <div className="flex items-center gap-2">
                            <select 
                              value={evt.type} 
                              onChange={(e) => updateQuoteEvent(evt.id, { type: e.target.value })}
                              className="flex-grow bg-[#020203] border border-zinc-800 text-[10px] p-1.5 rounded-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer min-w-0 font-mono"
                            >
                              <option value="none">-- {isEs ? 'SELECCIONAR EVENTO' : 'SELECT EVENT'} --</option>
                              <optgroup label={isEs ? "Bancos Centrales" : "Central Banks"} className="bg-[#020203]">
                                <option value="CB Press">{isEs ? 'Decisión / Conferencia B.C.' : 'C.B. Decisions / Press Conf'}</option>
                                <option value="Central Bank">{isEs ? 'Minutas de Banco Central' : 'Central Bank Minutes'}</option>
                              </optgroup>
                              <optgroup label={isEs ? "Actividad Económica" : "Economic Activity & Growth"} className="bg-[#020203]">
                                <option value="GDP">{isEs ? 'PIB (Crecimiento)' : 'GDP (Growth Rate)'}</option>
                                <option value="PMIs">{isEs ? 'PMIs (Mfg/Servicios)' : 'PMIs (Mfg/Services)'}</option>
                                <option value="Retail Sales">{isEs ? 'Ventas Minoristas' : 'Retail Sales'}</option>
                                <option value="Consumer Sentiment">{isEs ? 'Confianza Consumidor' : 'Consumer Sentiment'}</option>
                                <option value="Industrial Production">{isEs ? 'Producción Industrial' : 'Industrial Prod.'}</option>
                                <option value="Trade Balance">{isEs ? 'Balanza Comercial' : 'Trade Balance'}</option>
                              </optgroup>
                              <optgroup label={isEs ? "Inflación y Precios" : "Inflation & Prices"} className="bg-[#020203]">
                                <option value="Inflation">{isEs ? 'Inflación (IPC/PCE)' : 'Inflation (CPI/PCE)'}</option>
                                <option value="PPI">{isEs ? 'IPP (Inflación Mayorista)' : 'PPI (Producer Inflation)'}</option>
                              </optgroup>
                              <optgroup label={isEs ? "Empleo y Salarios" : "Labor Market & Earnings"} className="bg-[#020203]">
                                <option value="Employment">{isEs ? 'NFP / Desempleo' : 'Employment (NFP/UR)'}</option>
                                <option value="Jobless Claims">{isEs ? 'Peticiones Desempleo' : 'Jobless Claims'}</option>
                                <option value="Average Earnings">{isEs ? 'Salarios / Ingresos' : 'Average Earnings / Wages'}</option>
                              </optgroup>
                              <optgroup label={isEs ? "Geopolítica" : "Risk & Geopolitics"} className="bg-[#020203]">
                                <option value="Geopolitics">{isEs ? 'Geopolítica / Guerra / Aranceles' : 'Geopolitics / War Risk'}</option>
                              </optgroup>
                            </select>

                            <select 
                              value={evt.bias} 
                              onChange={(e) => updateQuoteEvent(evt.id, { bias: e.target.value as any })}
                              className="w-36 shrink-0 bg-[#020203] border border-zinc-800 text-[10px] p-1.5 rounded-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50 font-bold cursor-pointer font-mono"
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
                              className="text-zinc-600 hover:text-rose-500 text-xs px-1 font-bold shrink-0 transition cursor-pointer"
                              title="Delete"
                            >
                              ✕
                            </button>
                          </div>

                          <input 
                            type="text" 
                            value={evt.note} 
                            onChange={(e) => updateQuoteEvent(evt.id, { note: e.target.value })}
                            placeholder={isEs ? "Objetivo de consenso, métricas real vs pronóstico..." : "Consensus targets, actual vs prior metrics..."}
                            className={`w-full text-[10px] p-1.5 rounded-sm font-mono focus:outline-none ${
                              evt.type === 'Geopolitics' 
                                ? 'bg-rose-950/20 border border-rose-900/60 text-rose-300 placeholder-rose-700/60 focus:border-rose-400' 
                                : 'bg-[#020203] border border-zinc-800 text-zinc-300 focus:border-cyan-500/50'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                <p className="text-[11px] text-zinc-500 font-sans italic border-t border-zinc-900 pt-3">
                  {isEs 
                    ? '* Nota: Datos alcistas en la divisa Base suman (+), mientras que en la Cotizada restan (-). La selección de Geopolítica activa el régimen de riesgo de cola.'
                    : '* Note: Base currency positive events add positive bias (+), while Quote currency positive events subtract from the pair ratio (-). Geopolitics flags high-volatility tail-risk regimes.'}
                </p>
              </div>

              {/* MACRO INTELLIGENCE DOSSIER (WEEKLY NOTES) */}
              <div className="bg-[#040406] rounded-sm border border-zinc-900 p-5 sm:p-6 shadow-2xl space-y-4 font-mono">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                  <span className="text-cyan-400 font-bold text-[10px] tracking-widest uppercase">
                    // {isEs ? 'DOSSIER MACRO Y REGISTRO DE RIESGOS' : 'MACRO RISK & DOSSIER LOGS'}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    {isEs ? 'AUTO-GUARDADO ACTIVO' : 'AUTO-SAVED TO PERSISTENCE'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span className="text-cyan-400">🏛️</span> {isEs ? 'Política Monetaria y Bancos Centrales' : 'Central Bank Policy Trajectory'}
                    </label>
                    <textarea 
                      value={noteCB} 
                      onChange={(e) => setNoteCB(e.target.value)} 
                      rows={4}
                      className="w-full bg-[#020203] border border-zinc-800 rounded-sm p-3 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500/60 font-mono leading-relaxed transition resize-none" 
                      placeholder={isEs ? "Registra expectativas de tasas de interés, forward guidance, conferencias de prensa y votos de gobernadores..." : "Track interest rate expectations, forward guidance, press conferences, and dissent counts..."}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <span className="text-rose-400">🛡️</span> {isEs ? 'Riesgo Geopolítico y Sucesos Extremos' : 'Geopolitical Risk & Tail Events'}
                    </label>
                    <textarea 
                      value={noteGeo} 
                      onChange={(e) => setNoteGeo(e.target.value)} 
                      rows={4}
                      className="w-full bg-[#020203] border border-zinc-800 rounded-sm p-3 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500/60 font-mono leading-relaxed transition resize-none" 
                      placeholder={isEs ? "Registra conflictos comerciales, aranceles, flujos a bonos refugio, escaladas y perturbaciones de suministro..." : "Track trade conflicts, tariffs, safe-haven bond flows, defense escalations, and supply chain shifts..."}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT 5 COLS: POINTS 2-5 SUPPORTING MARKET FACTORS */}
            <div className="lg:col-span-5 space-y-6">
              
              <div className="bg-[#040406] rounded-sm border border-zinc-900 p-5 sm:p-6 shadow-2xl space-y-4 font-mono">
                
                <div className="flex justify-between items-center border-b border-zinc-800/80 pb-3">
                  <div>
                    <span className="text-cyan-400 font-bold text-[10px] tracking-widest uppercase block">
                      // {isEs ? 'PUNTOS 2–5: PILARES DE APOYO' : 'POINTS 2–5: SUPPORTING PILLARS'}
                    </span>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider mt-0.5">
                      {isEs ? 'Matriz de Consenso Multifactorial' : 'Multi-Factor Consensus Matrix'}
                    </h4>
                  </div>
                  <span className="text-[9px] bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 px-2 py-0.5 rounded-sm font-bold uppercase">
                    {isEs ? 'REQUIERE ≥ 2 COINCIDENCIAS' : 'NEED ≥ 2 TO AGREE'}
                  </span>
                </div>

                {/* PILLAR 2: RETAIL SENTIMENT (SSI) */}
                <div className="bg-[#020203] border border-zinc-800 p-4 rounded-sm space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">// {isEs ? 'PILAR 2' : 'PILLAR 2'}</span>
                      <h5 className="text-xs font-bold text-white uppercase">{isEs ? 'Sentimiento Minorista (SSI)' : 'Retail Sentiment (SSI)'}</h5>
                      <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                        {isEs ? 'Filtro contrario de posicionamiento minorista.' : 'Contrarian retail crowd positioning filter.'}
                      </p>
                    </div>
                    <div className="flex gap-1.5 w-full sm:w-auto shrink-0 justify-end">
                      <button 
                        onClick={() => togglePillar('p2', 'buy')} 
                        className={`text-center min-w-[76px] border text-[10px] px-2 py-1.5 rounded-sm font-bold transition cursor-pointer ${
                          pillars.p2 === 'buy' 
                            ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.25)]' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-cyan-400'
                        }`}
                      >
                        {isEs ? 'COMPRA' : 'BUY'}
                      </button>
                      <button 
                        onClick={() => togglePillar('p2', 'sell')} 
                        className={`text-center min-w-[76px] border text-[10px] px-2 py-1.5 rounded-sm font-bold transition cursor-pointer ${
                          pillars.p2 === 'sell' 
                            ? 'bg-rose-950/40 text-rose-300 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.25)]' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-rose-400'
                        }`}
                      >
                        {isEs ? 'VENTA' : 'SELL'}
                      </button>
                      <button 
                        onClick={() => togglePillar('p2', 'neutral')} 
                        className={`text-center min-w-[56px] border text-[10px] px-2 py-1.5 rounded-sm font-bold transition cursor-pointer ${
                          pillars.p2 === 'neutral' 
                            ? 'bg-[#0c0c12] text-zinc-300 border-zinc-700' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        NEUT
                      </button>
                    </div>
                  </div>
                </div>

                {/* PILLAR 3: CURRENCY WEIGHTING */}
                <div className="bg-[#020203] border border-zinc-800 p-4 rounded-sm space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">// {isEs ? 'PILAR 3' : 'PILLAR 3'}</span>
                      <h5 className="text-xs font-bold text-white uppercase">{isEs ? 'Ponderación de Divisas' : 'Currency Weighting'}</h5>
                      <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                        {isEs ? 'Puntuación macro: inflación, empleo y PIB.' : 'Macro score based on inflation, jobs & GDP.'}
                      </p>
                    </div>
                    <div className="flex gap-1.5 w-full sm:w-auto shrink-0 justify-end">
                      <button 
                        onClick={() => togglePillar('p3', 'buy')} 
                        className={`text-center min-w-[76px] border text-[10px] px-2 py-1.5 rounded-sm font-bold transition cursor-pointer ${
                          pillars.p3 === 'buy' 
                            ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.25)]' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-cyan-400'
                        }`}
                      >
                        {isEs ? 'COMPRA' : 'BUY'}
                      </button>
                      <button 
                        onClick={() => togglePillar('p3', 'sell')} 
                        className={`text-center min-w-[76px] border text-[10px] px-2 py-1.5 rounded-sm font-bold transition cursor-pointer ${
                          pillars.p3 === 'sell' 
                            ? 'bg-rose-950/40 text-rose-300 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.25)]' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-rose-400'
                        }`}
                      >
                        {isEs ? 'VENTA' : 'SELL'}
                      </button>
                      <button 
                        onClick={() => togglePillar('p3', 'neutral')} 
                        className={`text-center min-w-[56px] border text-[10px] px-2 py-1.5 rounded-sm font-bold transition cursor-pointer ${
                          pillars.p3 === 'neutral' 
                            ? 'bg-[#0c0c12] text-zinc-300 border-zinc-700' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        NEUT
                      </button>
                    </div>
                  </div>
                </div>

                {/* PILLAR 4: RISK SENTIMENT */}
                <div className="bg-[#020203] border border-zinc-800 p-4 rounded-sm space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">// {isEs ? 'PILAR 4' : 'PILLAR 4'}</span>
                      <h5 className="text-xs font-bold text-white uppercase">{isEs ? 'Sentimiento de Riesgo (Intermercados)' : 'Risk Sentiment (Cross-Asset)'}</h5>
                      <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                        {isEs ? 'Régimen general: bolsas, oro y materias primas.' : 'Market regime across equities, gold & commodities.'}
                      </p>
                    </div>
                    <div className="flex gap-1.5 w-full sm:w-auto shrink-0 justify-end">
                      <button 
                        onClick={() => togglePillar('p4', 'buy')} 
                        className={`text-center min-w-[76px] border text-[10px] px-2 py-1.5 rounded-sm font-bold transition cursor-pointer ${
                          pillars.p4 === 'buy' 
                            ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.25)]' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-cyan-400'
                        }`}
                      >
                        {isEs ? 'COMPRA' : 'BUY'}
                      </button>
                      <button 
                        onClick={() => togglePillar('p4', 'sell')} 
                        className={`text-center min-w-[76px] border text-[10px] px-2 py-1.5 rounded-sm font-bold transition cursor-pointer ${
                          pillars.p4 === 'sell' 
                            ? 'bg-rose-950/40 text-rose-300 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.25)]' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-rose-400'
                        }`}
                      >
                        {isEs ? 'VENTA' : 'SELL'}
                      </button>
                      <button 
                        onClick={() => togglePillar('p4', 'neutral')} 
                        className={`text-center min-w-[56px] border text-[10px] px-2 py-1.5 rounded-sm font-bold transition cursor-pointer ${
                          pillars.p4 === 'neutral' 
                            ? 'bg-[#0c0c12] text-zinc-300 border-zinc-700' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        NEUT
                      </button>
                    </div>
                  </div>

                  {/* Commodity & Risk Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80">
                    <div>
                      <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-1">
                        {isEs ? 'Petróleo Crudo (WTI)' : 'Crude Oil (WTI)'}
                      </label>
                      <input 
                        type="text" 
                        value={p4Oil} 
                        onChange={(e) => setP4Oil(e.target.value)} 
                        placeholder={isEs ? "ej. Rally $82/barril" : "e.g. Rallying $82/bbl"}
                        className="w-full bg-[#040406] border border-zinc-800 rounded-sm p-1.5 text-xs focus:outline-none focus:border-cyan-500/60 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-1">
                        {isEs ? 'Oro (XAU/USD)' : 'Gold (XAU/USD)'}
                      </label>
                      <input 
                        type="text" 
                        value={p4Gold} 
                        onChange={(e) => setP4Gold(e.target.value)} 
                        placeholder={isEs ? "ej. Flujo refugio $2,680" : "e.g. Safe-haven bid $2,680"}
                        className="w-full bg-[#040406] border border-zinc-800 rounded-sm p-1.5 text-xs focus:outline-none focus:border-cyan-500/60 text-white font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-1">
                        {isEs ? 'Impulsores de Apetito por Riesgo' : 'Risk Appetite Drivers'}
                      </label>
                      <input 
                        type="text" 
                        value={p4Notes} 
                        onChange={(e) => setP4Notes(e.target.value)} 
                        placeholder={isEs ? "ej. Rally en bolsas = Risk-ON que favorece divisas de alto beta..." : "e.g. Equity rally = Risk-ON environment favoring high-beta..."}
                        className="w-full bg-[#040406] border border-zinc-800 rounded-sm p-1.5 text-xs focus:outline-none focus:border-cyan-500/60 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* PILLAR 5: CENTRAL BANKS & INTEREST RATES */}
                <div className="bg-[#020203] border border-zinc-800 p-4 rounded-sm space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block">// {isEs ? 'PILAR 5' : 'PILLAR 5'}</span>
                      <h5 className="text-xs font-bold text-white uppercase">{isEs ? 'Tasas de Interés y Bancos Centrales' : 'Interest Rates & Policy'}</h5>
                      <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                        {isEs ? 'Divergencia Hawkish vs Dovish y diferenciales.' : 'Hawkish vs Dovish divergence & yield spreads.'}
                      </p>
                    </div>
                    <div className="flex gap-1.5 w-full sm:w-auto shrink-0 justify-end">
                      <button 
                        onClick={() => togglePillar('p5', 'buy')} 
                        className={`text-center min-w-[76px] border text-[10px] px-2 py-1.5 rounded-sm font-bold transition cursor-pointer ${
                          pillars.p5 === 'buy' 
                            ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.25)]' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-cyan-400'
                        }`}
                      >
                        {isEs ? 'COMPRA' : 'BUY'}
                      </button>
                      <button 
                        onClick={() => togglePillar('p5', 'sell')} 
                        className={`text-center min-w-[76px] border text-[10px] px-2 py-1.5 rounded-sm font-bold transition cursor-pointer ${
                          pillars.p5 === 'sell' 
                            ? 'bg-rose-950/40 text-rose-300 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.25)]' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-rose-400'
                        }`}
                      >
                        {isEs ? 'VENTA' : 'SELL'}
                      </button>
                      <button 
                        onClick={() => togglePillar('p5', 'neutral')} 
                        className={`text-center min-w-[56px] border text-[10px] px-2 py-1.5 rounded-sm font-bold transition cursor-pointer ${
                          pillars.p5 === 'neutral' 
                            ? 'bg-[#0c0c12] text-zinc-300 border-zinc-700' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        NEUT
                      </button>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-zinc-800/80">
                    <label className="block text-[8px] font-bold text-zinc-500 uppercase mb-1">
                      {isEs ? 'Notas de Política Monetaria' : 'Central Bank Divergence Note'}
                    </label>
                    <input 
                      type="text" 
                      value={p5Notes} 
                      onChange={(e) => setP5Notes(e.target.value)} 
                      placeholder={isEs ? "ej. Pausa del BoE vs recorte de 25pb descontado por el BCE..." : "e.g. BoE pause vs ECB 25bp rate cut pricing..."}
                      className="w-full bg-[#040406] border border-zinc-800 rounded-sm p-1.5 text-xs focus:outline-none focus:border-cyan-500/60 text-white font-mono"
                    />
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* BOTTOM ACTION SECTION: GENERATE STRATEGY REPORT */}
          <div className="bg-[#040406] rounded-sm border border-zinc-900 p-6 font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl">
            <div className="space-y-1">
              <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <span>📑</span> {isEs ? 'BRIEFING ESTRATÉGICO INSTITUCIONAL' : 'INSTITUTIONAL STRATEGY BRIEFING'}
              </div>
              <p className="text-zinc-400 text-xs font-sans">
                {isEs 
                  ? 'Consolida los vectores de sentimiento, catalizadores de noticias y notas de dossier en un reporte ejecutivo profesional listo para imprimir en PDF.' 
                  : 'Compile active currency sentiment vectors, event catalysts, and dossier notes into an audit-ready print/PDF briefing report.'}
              </p>
            </div>
            <button 
              onClick={handlePrint}
              className="bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-2.5 rounded-sm text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0 cursor-pointer"
            >
              <span>🖨️</span> {isEs ? 'GENERAR REPORTE.PDF →' : 'GENERATE REPORT.PDF →'}
            </button>
          </div>

        </main>

      </div>

      {/* ========================================================= */}
      {/* 📄 INSTITUTIONAL STRATEGY BRIEFING DOSSIER (PDF / PRINT)  */}
      {/* ========================================================= */}
      <div id="pdf-report-container" className="hidden print:block p-0 text-slate-950 bg-white max-w-4xl mx-auto font-sans leading-normal">
        
        {/* TOP CLASSIFICATION ACCENT BAR */}
        <div className="h-1.5 bg-slate-900 w-full mb-4" />

        {/* INSTITUTIONAL MASTHEAD */}
        <div className="border-b-2 border-slate-900 pb-4 mb-5 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black tracking-widest bg-slate-900 text-white px-2 py-0.5 uppercase font-mono">
                CONFIDENTIAL // TRADING DESK AUDIT
              </span>
              <span className="text-[9px] font-bold text-slate-500 font-mono tracking-wider">
                DOC ID: KGR-QD-{baseCurrency}{quoteCurrency}-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 uppercase font-sans">
              KAIROS GLOBAL RESEARCH
            </h1>
            <p className="text-[10px] text-slate-600 font-medium font-mono uppercase tracking-wider mt-0.5">
              Currency Sentiment Definer // 5-Pillars Quantitative Macro Risk Dossier
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
