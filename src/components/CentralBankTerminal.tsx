import { useState } from 'react';
import {
  Landmark,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Calendar,
  Clock,
  Activity,
  RotateCcw,
  RefreshCw,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';
import { CentralBankTerminalProps, CentralBankRateData } from '../types/centralBank';
import { useCentralBankRates } from '../hooks/useCentralBankRates';
import { getMeetingCountdown } from '../utils/centralBankUtils';
import { generateMacroAIContent } from '../services/geminiService';

type SortColumn = 'nextMeeting' | 'name' | 'rate' | 'implied' | 'deltaBps' | 'prob' | 'tone';

export function CentralBankTerminal({ language = 'en', onSelectBank, className = '' }: CentralBankTerminalProps) {
  const isEs = language === 'es';
  const { data, isLoading, isError, error, refetch, isLiveConnected, liveCount, lastUpdated } = useCentralBankRates();

  const [selectedBankKey, setSelectedBankKey] = useState<string>('Overview');
  const [sortColumn, setSortColumn] = useState<SortColumn>('nextMeeting');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Scenario Simulator overrides for drilldown
  const [simulatedOffsetBps, setSimulatedOffsetBps] = useState<number>(0);

  // Gemini AI Policy Synthesis state
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleGenerateAiBriefing = async () => {
    setIsAiLoading(true);
    setAiError(null);
    try {
      const bankSummary = Object.values(data)
        .map(
          (b) =>
            `${b.code} (${b.name}): Rate ${b.latestRate}%, Implied ${b.impliedRate}%, Spread ${b.forwardDeltaBps} bps, Stance ${b.policyTone.label}`
        )
        .join('\n');

      const prompt = `Based on the following G10 central bank interest rates, implied forward paths, and policy stances:\n${bankSummary}\n\nProvide an executive macro analysis for quantitative currency traders: identify the top 2 hawkish/dovish currency divergence pairs, and summarize institutional capital flow implications in 3 concise bullet points.`;

      const text = await generateMacroAIContent({
        prompt,
        systemInstruction: isEs
          ? 'Eres el estratega macroeconómico jefe de Kairos Macro Hub. Responde en español conciso, profesional e institucional.'
          : 'You are the chief macroeconomic strategist for Kairos Macro Hub. Provide concise, professional, institutional analysis.',
      });

      setAiAnalysis(text);
    } catch (err: any) {
      console.error('Failed to generate AI briefing:', err);
      setAiError(err.message || 'Unable to generate AI analysis at this moment.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const toggleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortColumn(col);
      setSortAsc(true);
    }
  };

  const renderSortIcon = (col: SortColumn) => {
    if (sortColumn !== col) return <ArrowUpDown className="w-3 h-3 inline ml-1 text-zinc-600" />;
    return sortAsc ? (
      <ArrowUp className="w-3 h-3 inline ml-1 text-cyan-400" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-1 text-cyan-400" />
    );
  };

  const handleBankSelect = (key: string) => {
    setSelectedBankKey(key);
    setSimulatedOffsetBps(0);
    onSelectBank?.(key);
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kairos-central-banks-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentBank: CentralBankRateData | undefined =
    selectedBankKey !== 'Overview' ? data[selectedBankKey] : undefined;

  // Process rows for overview table
  const bankRows = Object.values(data).sort((a, b) => {
    let valA: string | number;
    let valB: string | number;

    if (sortColumn === 'name') {
      valA = a.name;
      valB = b.name;
    } else if (sortColumn === 'rate') {
      valA = a.latestRate;
      valB = b.latestRate;
    } else if (sortColumn === 'implied') {
      valA = a.impliedRate;
      valB = b.impliedRate;
    } else if (sortColumn === 'deltaBps') {
      valA = a.forwardDeltaBps;
      valB = b.forwardDeltaBps;
    } else if (sortColumn === 'prob') {
      valA = a.prob;
      valB = b.prob;
    } else if (sortColumn === 'tone') {
      valA = a.policyTone.score;
      valB = b.policyTone.score;
    } else {
      valA = new Date(a.nextMeeting).getTime();
      valB = new Date(b.nextMeeting).getTime();
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  return (
    <div className={`space-y-6 font-mono ${className}`}>
      {/* 1. HERO CONTROLS & FRED STATUS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4 border-b border-zinc-900">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-cyan-500 text-[10px] font-bold uppercase tracking-widest block">
              // POLICY RADAR_V2
            </span>
            <span className="text-zinc-700">|</span>
            <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              G10 TERMINAL
            </span>
            <span className="text-zinc-700">|</span>

            {/* Live FRED Status Badge */}
            {isLoading ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-mono tracking-wider uppercase bg-cyan-950/40 border border-cyan-800/60 text-cyan-300">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                FRED API: SYNCING LIVE RATES...
              </span>
            ) : isLiveConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-mono tracking-wider uppercase bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                FRED LIVE CONNECTED ({liveCount}/8 BANKS)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-mono tracking-wider uppercase bg-zinc-900 border border-zinc-800 text-zinc-400">
                <Info className="w-3 h-3 text-amber-400" />
                INSTITUTIONAL BENCHMARK FALLBACK ACTIVE
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
            {isEs ? 'Terminal de Bancos Centrales G10' : 'G10 Central Bank Terminal'}
          </h2>
          <p className="text-xs text-zinc-400 font-sans max-w-xl font-light">
            {isEs
              ? 'Expectativas de política monetaria en tiempo real conectadas a la API de FRED (St. Louis Fed), curvas swap implícitas y clasificación de tono institucional.'
              : 'Real-time monetary policy expectations powered by St. Louis Fed FRED observations, implied swap curves, and automated tone classification.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 flex-wrap w-full lg:w-auto">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <button
              onClick={() => refetch()}
              disabled={isLoading}
              title="Refresh live FRED rates"
              className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-800/60 transition cursor-pointer font-bold min-h-[36px] flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {isEs ? 'Sincronizar FRED' : 'Sync FRED'}
            </button>

            <button
              onClick={handleGenerateAiBriefing}
              disabled={isAiLoading}
              title="Generate AI Policy Synthesis with Gemini"
              className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-800/60 transition cursor-pointer font-bold min-h-[36px] flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 text-purple-400 ${isAiLoading ? 'animate-spin' : ''}`} />
              {isAiLoading ? (isEs ? 'Analizando...' : 'Analyzing...') : (isEs ? 'Síntesis IA' : 'AI Policy Briefing')}
            </button>

            <button
              onClick={handleExportJSON}
              className="px-3.5 py-1.5 text-[10px] uppercase tracking-wider bg-[#0c0c12] hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition cursor-pointer min-h-[36px] flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {isEs ? 'Exportar JSON' : 'Export JSON'}
            </button>
          </div>

          {/* View Dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-zinc-500 uppercase">{isEs ? 'Vista:' : 'View:'}</span>
            <select
              value={selectedBankKey}
              onChange={(e) => handleBankSelect(e.target.value)}
              className="w-full sm:w-auto bg-[#0c0c12] border border-zinc-800 text-white text-xs px-3 py-2 outline-none focus:border-cyan-500 font-mono min-h-[38px] cursor-pointer"
            >
              <option value="Overview">{isEs ? 'Resumen (Todos los Bancos)' : 'Overview (All Banks)'}</option>
              {Object.values(data).map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* AI POLICY BRIEFING CARD */}
      {(aiAnalysis || isAiLoading || aiError) && (
        <div className="bg-[#080812] border border-purple-800/50 p-4 sm:p-5 rounded-sm space-y-2.5 font-mono shadow-[0_0_20px_rgba(168,85,247,0.1)]">
          <div className="flex items-center justify-between pb-2 border-b border-purple-900/40">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {isEs ? 'Síntesis de Política Monetaria IA (Gemini Proxy)' : 'AI Macro Policy Synthesis (Gemini Proxy)'}
              </span>
            </div>
            {aiAnalysis && (
              <button
                onClick={() => setAiAnalysis(null)}
                className="text-zinc-500 hover:text-zinc-300 text-xs uppercase"
              >
                &times; Close
              </button>
            )}
          </div>

          {isAiLoading ? (
            <div className="flex items-center gap-3 text-xs text-purple-300 py-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
              <span>{isEs ? 'Sintetizando diferenciales y flujos de capital a través del proxy backend...' : 'Synthesizing spreads and capital flow implications via backend proxy...'}</span>
            </div>
          ) : aiError ? (
            <div className="text-xs text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{aiError}</span>
            </div>
          ) : (
            <div className="text-xs text-zinc-300 font-sans leading-relaxed whitespace-pre-line">
              {aiAnalysis}
            </div>
          )}
        </div>
      )}

      {/* ERROR / FALLBACK NOTIFICATION BANNER */}
      {isError && (
        <div className="p-3 bg-amber-950/30 border border-amber-900/50 rounded-sm text-xs text-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{error || 'FRED API rate limit reached. Displaying institutional baseline rates.'}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="underline hover:text-white uppercase text-[10px] font-bold cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* VIEW 1: OVERVIEW MATRIX TABLE */}
      {selectedBankKey === 'Overview' && (
        <div className="bg-[#040406] border border-zinc-900 p-5 sm:p-6 space-y-5 rounded-sm">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Landmark className="w-4 h-4 text-cyan-400" />
                {isEs ? 'Matriz de Expectativas de Política Monetaria G10' : 'G10 Policy Rate Expectations Matrix'}
              </h3>
              <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
                {isEs
                  ? 'Haga clic en cualquier fila para ver la curva de trayectoria y el simulador de escenarios.'
                  : 'Click any central bank row for detailed trajectory curve and scenario simulator.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-[10px] text-zinc-500">
                  Last Sync: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold bg-cyan-950/40 px-2.5 py-1 border border-cyan-800/50 self-start sm:self-auto">
                8 G10 Central Banks
              </span>
            </div>
          </div>

          <div className="overflow-x-auto touch-scroll">
            <table className="w-full text-left font-mono text-xs min-w-[760px]">
              <thead>
                <tr className="text-zinc-500 text-[10px] border-b border-zinc-900 uppercase tracking-wider bg-[#07080d]">
                  <th
                    onClick={() => toggleSort('nextMeeting')}
                    className="p-3.5 pl-4 cursor-pointer hover:text-cyan-400 select-none"
                  >
                    Next Decision {renderSortIcon('nextMeeting')}
                  </th>
                  <th
                    onClick={() => toggleSort('name')}
                    className="p-3.5 cursor-pointer hover:text-cyan-400 select-none"
                  >
                    Central Bank {renderSortIcon('name')}
                  </th>
                  <th
                    onClick={() => toggleSort('rate')}
                    className="p-3.5 text-center cursor-pointer hover:text-cyan-400 select-none"
                  >
                    Benchmark Rate {renderSortIcon('rate')}
                  </th>
                  <th
                    onClick={() => toggleSort('implied')}
                    className="p-3.5 text-center cursor-pointer hover:text-cyan-400 select-none"
                  >
                    Implied Forward {renderSortIcon('implied')}
                  </th>
                  <th
                    onClick={() => toggleSort('deltaBps')}
                    className="p-3.5 text-center cursor-pointer hover:text-cyan-400 select-none"
                  >
                    Delta (bps) {renderSortIcon('deltaBps')}
                  </th>
                  <th
                    onClick={() => toggleSort('prob')}
                    className="p-3.5 text-center cursor-pointer hover:text-cyan-400 select-none"
                  >
                    Move Probability {renderSortIcon('prob')}
                  </th>
                  <th
                    onClick={() => toggleSort('tone')}
                    className="p-3.5 text-center cursor-pointer hover:text-cyan-400 select-none"
                  >
                    Evaluated Policy Tone {renderSortIcon('tone')}
                  </th>
                </tr>
              </thead>

              {/* SKELETON LOADER STATE */}
              {isLoading ? (
                <tbody className="divide-y divide-zinc-900/60">
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse bg-[#040406]">
                      <td className="p-3.5 pl-4">
                        <div className="h-4 bg-zinc-800/60 rounded w-28"></div>
                      </td>
                      <td className="p-3.5">
                        <div className="h-4 bg-zinc-800/60 rounded w-44"></div>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="h-4 bg-zinc-800/60 rounded w-16 mx-auto"></div>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="h-4 bg-zinc-800/60 rounded w-16 mx-auto"></div>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="h-4 bg-zinc-800/60 rounded w-12 mx-auto"></div>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="h-4 bg-zinc-800/60 rounded w-20 mx-auto"></div>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="h-6 bg-zinc-800/60 rounded w-28 mx-auto"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              ) : (
                /* DATA LOADED STATE */
                <tbody className="divide-y divide-zinc-900/60">
                  {bankRows.map((b) => {
                    const countdown = getMeetingCountdown(b.nextMeeting);
                    const deltaColor =
                      b.forwardDeltaBps > 0
                        ? 'text-emerald-400 font-bold'
                        : b.forwardDeltaBps < 0
                        ? 'text-rose-400 font-bold'
                        : 'text-zinc-400';
                    const probBarColor =
                      b.outcome === 'HIKE'
                        ? 'bg-emerald-500'
                        : b.outcome === 'CUT'
                        ? 'bg-rose-500'
                        : 'bg-cyan-500';

                    return (
                      <tr
                        key={b.code}
                        onClick={() => handleBankSelect(b.code)}
                        className="hover:bg-[#0c0c16] transition-colors cursor-pointer group"
                      >
                        {/* Next Meeting */}
                        <td className="p-3.5 pl-4 text-zinc-300 font-bold">
                          <div className="flex items-center gap-2">
                            <span>{b.nextMeeting.split('T')[0]}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider ${countdown.badgeClass}`}
                            >
                              {countdown.text}
                            </span>
                          </div>
                        </td>

                        {/* Bank Name & Series Indicator */}
                        <td className="p-3.5 font-bold text-white group-hover:text-cyan-400 transition-colors">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                b.isLive ? 'bg-emerald-400' : 'bg-zinc-600'
                              }`}
                              title={b.isLive ? `Live FRED Series: ${b.seriesId}` : 'Benchmark baseline'}
                            ></span>
                            <span>{b.name}</span>
                            {b.isLive && (
                              <span className="text-[9px] font-mono text-emerald-400/80 bg-emerald-950/40 px-1 py-0.2 rounded border border-emerald-900/40">
                                FRED
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Benchmark Rate */}
                        <td className="p-3.5 text-center text-zinc-200 tabular-nums">
                          {b.latestRate.toFixed(2)}%
                          {b.momDeltaBps !== 0 && (
                            <span
                              className={`block text-[9px] ${
                                b.momDeltaBps > 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {b.momDeltaBps > 0 ? '+' : ''}
                              {b.momDeltaBps} bps MoM
                            </span>
                          )}
                        </td>

                        {/* Implied Forward */}
                        <td className="p-3.5 text-center text-cyan-400 font-bold tabular-nums">
                          {b.impliedRate.toFixed(2)}%
                        </td>

                        {/* Delta */}
                        <td className={`p-3.5 text-center tabular-nums ${deltaColor}`}>
                          {b.forwardDeltaBps > 0 ? '+' : ''}
                          {b.forwardDeltaBps.toFixed(1)}
                        </td>

                        {/* Probability Bar */}
                        <td className="p-3.5 text-center tabular-nums">
                          <div className="flex flex-col items-center gap-1 w-24 mx-auto">
                            <span className="font-bold text-zinc-200">
                              {b.prob}%{' '}
                              <span className="text-[9px] text-zinc-500">{b.outcome}</span>
                            </span>
                            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${probBarColor}`}
                                style={{ width: `${b.prob}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* Policy Tone */}
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-bold border tracking-wide inline-block ${b.policyTone.badgeClass}`}
                          >
                            {b.policyTone.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: BANK DRILLDOWN DEEP DIVE */}
      {selectedBankKey !== 'Overview' && currentBank && (() => {
        const b = currentBank;
        const countdown = getMeetingCountdown(b.nextMeeting);

        // Effective simulated values
        const simulatedRate = Number((b.latestRate + simulatedOffsetBps / 100).toFixed(2));
        const simulatedImplied = Number((b.impliedRate + simulatedOffsetBps / 100).toFixed(2));
        const deltaBps = Number(((simulatedImplied - simulatedRate) * 100).toFixed(1));
        const prob = Math.min(100, Math.round((Math.abs(deltaBps) / (b.step * 100)) * 100));
        const outcome = deltaBps > b.step * 50 ? 'HIKE' : deltaBps < -b.step * 50 ? 'CUT' : 'HOLD';

        // Trajectory points for SVG rendering
        const yVals = b.trajectory.map((v) => Number((v + simulatedOffsetBps / 100).toFixed(2)));
        const minY = Math.min(...yVals) - 0.25;
        const maxY = Math.max(...yVals) + 0.25;
        const rangeY = maxY - minY || 1;
        const chartHeight = 160;
        const chartWidth = 560;
        const paddingX = 45;
        const paddingY = 25;
        const stepX = (chartWidth - paddingX * 2) / (yVals.length - 1);

        const points = yVals.map((val, idx) => {
          const x = paddingX + idx * stepX;
          const y = chartHeight - paddingY - ((val - minY) / rangeY) * (chartHeight - paddingY * 2);
          return { x, y, val };
        });

        const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
        const areaPoints = `${points[0].x},${chartHeight - paddingY} ${polylinePoints} ${
          points[points.length - 1].x
        },${chartHeight - paddingY}`;

        const xLabels = ['Current Rate', 'Decision (M1)', 'Meeting +2', 'Meeting +3', 'Meeting +4'];

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
              <div className="flex items-center gap-2">
                <span className="text-xs text-cyan-400 font-bold uppercase tracking-wider">
                  {b.name}
                </span>
                {b.isLive && (
                  <span className="text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded font-mono">
                    FRED: {b.seriesId}
                  </span>
                )}
              </div>
            </div>

            {/* 4 Primary Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Next Meeting */}
              <div className="bg-[#040406] border border-zinc-900 p-5 space-y-2 border-l-2 border-l-cyan-500 rounded-sm">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest">
                  <span>Next Meeting Decision</span>
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-xl font-bold text-white tracking-tight">
                  {b.nextMeeting.split('T')[0]}
                </div>
                <div className="text-xs text-cyan-400 font-bold flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-cyan-400" />
                  <span>{countdown.text}</span>
                </div>
              </div>

              {/* Metric 2: Current Benchmark Rate */}
              <div className="bg-[#040406] border border-zinc-900 p-5 space-y-2 border-l-2 border-l-emerald-500 rounded-sm">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest">
                  <span>Current Benchmark Rate</span>
                  <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-white tracking-tight">
                  {simulatedRate.toFixed(2)}%
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <span>Step: {b.step.toFixed(2)}%</span>
                  {b.momDeltaBps !== 0 && (
                    <span className={b.momDeltaBps > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      ({b.momDeltaBps > 0 ? '+' : ''}
                      {b.momDeltaBps} bps MoM)
                    </span>
                  )}
                </div>
              </div>

              {/* Metric 3: Implied Forward */}
              <div className="bg-[#040406] border border-zinc-900 p-5 space-y-2 border-l-2 border-l-purple-500 rounded-sm">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest">
                  <span>Implied Forward Rate</span>
                  <Activity className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-xl font-bold text-cyan-400 tracking-tight">
                  {simulatedImplied.toFixed(2)}%
                </div>
                <div className="text-[11px] text-zinc-400">
                  Spread: {deltaBps > 0 ? `+${deltaBps}` : deltaBps} bps
                </div>
              </div>

              {/* Metric 4: Move Probability & Tone */}
              <div className="bg-[#040406] border border-zinc-900 p-5 space-y-2 border-l-2 border-l-amber-500 rounded-sm">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest">
                  <span>Pricing & Policy Tone</span>
                  <span className={`px-1.5 py-0.5 text-[9px] font-bold border ${b.policyTone.badgeClass}`}>
                    {b.policyTone.label}
                  </span>
                </div>
                <div className="text-xl font-bold text-white tracking-tight">
                  {prob}% {outcome}
                </div>
                <div className="text-[11px] text-zinc-400 truncate" title={b.policyTone.description}>
                  {b.policyTone.description}
                </div>
              </div>
            </div>

            {/* Trajectory Curve & Scenario Simulator Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Trajectory Chart */}
              <div className="lg:col-span-2 bg-[#040406] border border-zinc-900 p-5 space-y-4 rounded-sm">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Implied Forward Policy Trajectory Curve
                  </h4>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Horizon: Next 4 Decisions
                  </span>
                </div>

                <div className="w-full bg-[#020203] border border-zinc-800/80 p-4 rounded-sm flex flex-col items-center justify-center">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-auto max-h-[220px]"
                  >
                    <defs>
                      <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal gridlines */}
                    {[0, 0.5, 1].map((pct, idx) => {
                      const y = paddingY + pct * (chartHeight - paddingY * 2);
                      const labelVal = (maxY - pct * rangeY).toFixed(2);
                      return (
                        <g key={idx}>
                          <line
                            x1={paddingX}
                            y1={y}
                            x2={chartWidth - paddingX}
                            y2={y}
                            stroke="#18181b"
                            strokeDasharray="3,3"
                          />
                          <text
                            x={paddingX - 6}
                            y={y + 3}
                            fill="#52525b"
                            fontSize="9"
                            fontFamily="monospace"
                            textAnchor="end"
                          >
                            {labelVal}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Gradient Area under curve */}
                    <polygon points={areaPoints} fill="url(#curveGradient)" />

                    {/* Polyline line */}
                    <polyline
                      points={polylinePoints}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="2.5"
                    />

                    {/* Data Points and values */}
                    {points.map((p, idx) => (
                      <g key={idx}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="4"
                          fill="#020203"
                          stroke="#22d3ee"
                          strokeWidth="2"
                        />
                        <text
                          x={p.x}
                          y={p.y - 8}
                          fill="#ffffff"
                          fontSize="10"
                          fontFamily="monospace"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {p.val.toFixed(2)}%
                        </text>
                        <text
                          x={p.x}
                          y={chartHeight - 6}
                          fill="#71717a"
                          fontSize="9"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {xLabels[idx]}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </div>

              {/* Right Col: Scenario Stress Simulator */}
              <div className="bg-[#040406] border border-zinc-900 p-5 space-y-4 rounded-sm">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-cyan-400" />
                  Scenario Stress Simulator
                </h4>
                <p className="text-[11px] text-zinc-400 font-sans">
                  Simulate shock adjustments to central bank rates to project transmission across currency pairs.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Shift Curve:</span>
                    <span
                      className={`font-bold ${
                        simulatedOffsetBps > 0
                          ? 'text-emerald-400'
                          : simulatedOffsetBps < 0
                          ? 'text-rose-400'
                          : 'text-zinc-300'
                      }`}
                    >
                      {simulatedOffsetBps > 0 ? `+${simulatedOffsetBps}` : simulatedOffsetBps} bps
                    </span>
                  </div>

                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="25"
                    value={simulatedOffsetBps}
                    onChange={(e) => setSimulatedOffsetBps(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <button
                      onClick={() => setSimulatedOffsetBps(-25)}
                      className="px-2 py-1.5 text-[10px] bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-sm font-bold transition cursor-pointer"
                    >
                      -25 bps (Cut)
                    </button>
                    <button
                      onClick={() => setSimulatedOffsetBps(0)}
                      className="px-2 py-1.5 text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-sm font-bold transition cursor-pointer"
                    >
                      0 bps (Hold)
                    </button>
                    <button
                      onClick={() => setSimulatedOffsetBps(25)}
                      className="px-2 py-1.5 text-[10px] bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 rounded-sm font-bold transition cursor-pointer"
                    >
                      +25 bps (Hike)
                    </button>
                  </div>

                  <div className="p-3 bg-[#020203] border border-zinc-800 rounded-sm space-y-1.5 text-[11px] text-zinc-400">
                    <div className="flex justify-between">
                      <span>Simulated Terminal Rate:</span>
                      <span className="text-white font-bold">{simulatedRate.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Simulated Implied Forward:</span>
                      <span className="text-cyan-400 font-bold">{simulatedImplied.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
