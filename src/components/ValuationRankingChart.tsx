import React from 'react';

interface ValuationRankingChartProps {
  totals: Record<string, number>;
  selectedCurrency?: string;
  onSelectCurrency?: (ccy: string) => void;
}

export const ValuationRankingChart: React.FC<ValuationRankingChartProps> = ({
  totals,
  selectedCurrency,
  onSelectCurrency
}) => {
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF'];
  const scores = currencies.map(c => totals[c] !== undefined ? totals[c] : 0);

  // Compute dynamic scale boundaries for normalized scores
  const maxAbs = Math.max(...scores.map(s => Math.abs(s)), 0.5);
  const maxScore = Math.max(3.0, parseFloat((maxAbs * 1.25).toFixed(1)));

  return (
    <div className="macro-panel p-5 font-mono">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-3 border-b border-zinc-800/60 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400 font-bold text-sm">📊</span>
          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Valuation Ranking Matrix
          </h3>
          <span className="text-[11px] text-zinc-500 uppercase hidden sm:inline">
            // G8 Currencies
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.6)]"></span>
            <span className="text-zinc-400">Bullish</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]"></span>
            <span className="text-zinc-400">Bearish</span>
          </div>
        </div>
      </div>

      {/* SVG / CSS Interactive Bar Chart Area */}
      <div className="relative w-full h-52 select-none">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="border-b border-dashed border-zinc-700 w-full" />
          <div className="border-b border-dashed border-zinc-700 w-full" />
          <div className="border-b border-dashed border-zinc-700 w-full" />
          <div className="border-b border-dashed border-zinc-700 w-full" />
          <div className="border-b border-dashed border-zinc-700 w-full" />
        </div>

        {/* Center Zero Baseline */}
        <div className="absolute left-0 right-0 top-1/2 border-b border-zinc-600/70 pointer-events-none z-10" />

        {/* Bars Columns Grid */}
        <div className="absolute inset-0 grid grid-cols-8 gap-2 sm:gap-4 px-2 sm:px-6">
          {currencies.map(curr => {
            const score = totals[curr] !== undefined ? totals[curr] : 0;
            const isSelected = selectedCurrency === curr;
            const isPositive = score > 0;
            const isNegative = score < 0;

            // Height % from 0 (middle) to score (top or bottom)
            const heightPct = Math.min(100, Math.max(6, (Math.abs(score) / maxScore) * 100));

            return (
              <div
                key={curr}
                onClick={() => onSelectCurrency && onSelectCurrency(curr)}
                className={`relative h-full flex flex-col items-center cursor-pointer group transition-all ${
                  isSelected ? 'scale-105' : 'hover:opacity-100 opacity-90'
                }`}
              >
                {/* Top Half (Positive / Bullish) */}
                <div className="w-full h-1/2 flex flex-col items-center justify-end relative pb-0.5">
                  {isPositive && (
                    <div 
                      className="w-full flex flex-col items-center justify-end transition-all duration-300"
                      style={{ height: `${heightPct}%` }}
                    >
                      <span className="text-[10px] sm:text-[11px] font-bold text-cyan-400 tabular-nums leading-none mb-1 shrink-0 drop-shadow-sm">
                        +{score}
                      </span>
                      <div
                        className="w-4/5 max-w-[28px] flex-1 bg-gradient-to-t from-cyan-600 to-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.6)] group-hover:brightness-125 transition-all min-h-[4px]"
                      />
                    </div>
                  )}
                </div>

                {/* Bottom Half (Negative / Bearish) */}
                <div className="w-full h-1/2 flex flex-col items-center justify-start relative pt-0.5">
                  {isNegative && (
                    <div 
                      className="w-full flex flex-col items-center justify-start transition-all duration-300"
                      style={{ height: `${heightPct}%` }}
                    >
                      <div
                        className="w-4/5 max-w-[28px] flex-1 bg-gradient-to-b from-rose-600 to-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.6)] group-hover:brightness-125 transition-all min-h-[4px]"
                      />
                      <span className="text-[10px] sm:text-[11px] font-bold text-rose-400 tabular-nums leading-none mt-1 shrink-0 drop-shadow-sm">
                        {score}
                      </span>
                    </div>
                  )}
                  {score === 0 && (
                    <span className="text-[10px] font-bold text-zinc-500 leading-none mt-1">0</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Currency Letters Axis */}
      <div className="grid grid-cols-8 gap-2 sm:gap-4 px-2 sm:px-6 pt-3 mt-1 border-t border-zinc-800/80">
        {currencies.map(curr => {
          const isSelected = selectedCurrency === curr;
          return (
            <button
              key={curr}
              onClick={() => onSelectCurrency && onSelectCurrency(curr)}
              className={`w-full py-1.5 text-center text-[10px] sm:text-xs font-mono font-bold border transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'bg-[#090b12] text-zinc-300 border-zinc-800 hover:border-cyan-500/50 hover:text-white'
              }`}
            >
              {curr}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-900 flex justify-between items-center text-[10px] text-zinc-500 font-sans">
        <span>Click any currency letter or bar to filter breakdown tables below</span>
        <span className="font-mono text-cyan-500 uppercase">Normalized Dynamic Scale: &plusmn;{maxScore}</span>
      </div>
    </div>
  );
};
