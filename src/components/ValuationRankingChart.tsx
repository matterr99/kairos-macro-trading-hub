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
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[2px] p-5 font-mono">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 pb-3 border-b border-[var(--line)] gap-2">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 bg-[var(--accent)] shrink-0" aria-hidden="true" />
          <h3 className="text-[11px] font-semibold text-[var(--ink)] uppercase tracking-[0.08em]">
            Valuation Ranking Matrix
          </h3>
          <span className="text-[10px] text-[var(--ink-muted)] uppercase hidden sm:inline tracking-[0.08em]">
            // G8 Currencies
          </span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#10B981]" />
            <span className="text-[var(--ink-muted)]">Bullish</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#EF4444]" />
            <span className="text-[var(--ink-muted)]">Bearish</span>
          </div>
        </div>
      </div>

      {/* SVG / CSS Interactive Bar Chart Area */}
      <div className="relative w-full h-52 select-none">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40">
          <div className="border-b border-dashed border-[var(--line)] w-full" />
          <div className="border-b border-dashed border-[var(--line)] w-full" />
          <div className="border-b border-dashed border-[var(--line)] w-full" />
          <div className="border-b border-dashed border-[var(--line)] w-full" />
          <div className="border-b border-dashed border-[var(--line)] w-full" />
        </div>

        {/* Center Zero Baseline */}
        <div className="absolute left-0 right-0 top-1/2 border-b border-[var(--line-strong)] pointer-events-none z-10" />

        {/* Bars Columns Grid */}
        <div className="absolute inset-0 grid grid-cols-8 gap-2 sm:gap-4 px-2 sm:px-6">
          {currencies.map(curr => {
            const score = totals[curr] !== undefined ? totals[curr] : 0;
            const isSelected = selectedCurrency === curr;
            const isPositive = score > 0;
            const isNegative = score < 0;

            const heightPct = Math.min(100, Math.max(6, (Math.abs(score) / maxScore) * 100));

            return (
              <div
                key={curr}
                onClick={() => onSelectCurrency && onSelectCurrency(curr)}
                className={`relative h-full flex flex-col items-center cursor-pointer group transition-opacity ${
                  isSelected ? 'opacity-100' : 'opacity-85 hover:opacity-100'
                }`}
              >
                {/* Top Half (Positive / Bullish) */}
                <div className="w-full h-1/2 flex flex-col items-center justify-end relative pb-0.5">
                  {isPositive && (
                    <div
                      className="w-full flex flex-col items-center justify-end transition-all duration-300"
                      style={{ height: `${heightPct}%` }}
                    >
                      <span className="text-[10px] sm:text-[11px] font-semibold text-[#10B981] tabular-nums leading-none mb-1 shrink-0">
                        +{score}
                      </span>
                      <div className="w-4/5 max-w-[26px] flex-1 bg-[#10B981] group-hover:brightness-110 transition-all min-h-[4px]" />
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
                      <div className="w-4/5 max-w-[26px] flex-1 bg-[#EF4444] group-hover:brightness-110 transition-all min-h-[4px]" />
                      <span className="text-[10px] sm:text-[11px] font-semibold text-[#EF4444] tabular-nums leading-none mt-1 shrink-0">
                        {score}
                      </span>
                    </div>
                  )}
                  {score === 0 && (
                    <span className="text-[10px] font-semibold text-[var(--ink-muted)] leading-none mt-1 tabular-nums">0</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Currency Letters Axis */}
      <div className="grid grid-cols-8 gap-2 sm:gap-4 px-2 sm:px-6 pt-3 mt-1 border-t border-[var(--line)]">
        {currencies.map(curr => {
          const isSelected = selectedCurrency === curr;
          return (
            <button
              key={curr}
              onClick={() => onSelectCurrency && onSelectCurrency(curr)}
              className={`w-full h-9 rounded-[2px] flex items-center justify-center text-center text-[10px] sm:text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]'
                  : 'bg-[var(--surface-2)] text-[var(--ink-muted)] border-[var(--line)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]'
              }`}
            >
              {curr}
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--line)] flex justify-between items-center text-[10px] text-[var(--ink-muted)] font-sans">
        <span>Click any currency bar or code to inspect its indicator breakdown below</span>
        <span className="font-mono text-[var(--accent)] uppercase tabular-nums">Scale: &plusmn;{maxScore}</span>
      </div>
    </div>
  );
};
