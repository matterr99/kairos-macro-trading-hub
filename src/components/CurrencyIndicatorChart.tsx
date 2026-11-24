import React from 'react';
import { MacroIndicator } from '../types';

interface CurrencyIndicatorChartProps {
  currency: string;
  indicators: MacroIndicator[];
  totalScore: number;
}

export const CurrencyIndicatorChart: React.FC<CurrencyIndicatorChartProps> = ({
  currency,
  indicators,
  totalScore
}) => {
  return (
    <div className="bg-[var(--surface)] border border-[var(--line)] rounded-[2px] p-5 font-mono">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 mb-4 border-b border-[var(--line)] gap-2">
        <div className="flex items-center gap-2.5">
          <span className="h-1.5 w-1.5 bg-[var(--accent)] shrink-0" aria-hidden="true" />
          <h3 className="text-[11px] font-semibold text-[var(--ink)] uppercase tracking-[0.08em]">
            {currency} Fundamental Factor Breakdown
          </h3>
          <span className="text-[10px] text-[var(--ink-muted)] uppercase hidden sm:inline tracking-[0.08em]">
            // Indicator Contributions
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[var(--ink-muted)] text-[11px]">Net Valuation:</span>
          <span className={`font-semibold px-2.5 py-0.5 rounded-[2px] text-xs tabular-nums border ${
            totalScore > 0
              ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30'
              : totalScore < 0
              ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
              : 'bg-[var(--surface-2)] text-[var(--ink-muted)] border-[var(--line)]'
          }`}>
            {totalScore > 0 ? `+${totalScore}` : totalScore} PTS
          </span>
        </div>
      </div>

      {/* Indicator Bars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {indicators.map((ind) => {
          const score = ind.score ?? 0;
          const isPositive = score > 0;
          const isNegative = score < 0;
          const absScore = Math.abs(score);
          const maxScale = 4;
          const barWidthPct = Math.min(100, (absScore / maxScale) * 100);

          return (
            <div key={ind.name} className="flex flex-col space-y-1.5 bg-[var(--surface-2)] border border-[var(--line)] rounded-[2px] p-3 hover:border-[var(--line-strong)] transition-colors">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--ink)] font-semibold truncate flex-1 min-w-0 pr-2" title={ind.name}>
                  {ind.name}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-[var(--ink-muted)] tabular-nums">wt: {ind.weight}</span>
                  <span className={`font-semibold tabular-nums text-xs px-2 py-0.5 rounded-[2px] ${
                    isPositive
                      ? 'text-[#10B981] bg-[#10B981]/10'
                      : isNegative
                      ? 'text-[#EF4444] bg-[#EF4444]/10'
                      : 'text-[var(--ink-muted)] bg-[var(--surface)]'
                  }`}>
                    {score > 0 ? `+${score}` : score}
                  </span>
                </div>
              </div>

              {/* Bipolar Visual Bar */}
              <div className="flex items-center gap-2 pt-0.5">
                <div className="flex-1 h-1.5 bg-[var(--bg)] flex border border-[var(--line)] relative">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[var(--line-strong)] z-10 -ml-px" />

                  {/* Left (Bearish / Negative) */}
                  <div className="w-1/2 flex justify-end">
                    {isNegative && (
                      <div
                        className="bg-[#EF4444] h-full transition-all duration-300"
                        style={{ width: `${barWidthPct}%` }}
                      />
                    )}
                  </div>

                  {/* Right (Bullish / Positive) */}
                  <div className="w-1/2 flex justify-start">
                    {isPositive && (
                      <div
                        className="bg-[#10B981] h-full transition-all duration-300"
                        style={{ width: `${barWidthPct}%` }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
