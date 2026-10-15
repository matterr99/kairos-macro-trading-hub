import { useEffect, useState, useMemo } from 'react';
import { Language, Theme } from '../types';

interface TickerTapeProps {
  language?: Language;
  theme?: Theme;
}

interface TickerItem {
  id: string;
  symbol: string;
  nameEn: string;
  nameEs: string;
  category: 'fx' | 'rates' | 'indices' | 'commodities' | 'crypto';
  price: number;
  change: number; // percentage
  decimals: number;
  prefix?: string;
  suffix?: string;
  lastUpdateDirection?: 'up' | 'down' | null;
}

const INITIAL_TICKER_DATA: TickerItem[] = [
  { id: 'eurusd', symbol: 'EUR/USD', nameEn: 'Euro / US Dollar', nameEs: 'Euro / Dólar EE.UU.', category: 'fx', price: 1.0845, change: 0.14, decimals: 4 },
  { id: 'usdjpy', symbol: 'USD/JPY', nameEn: 'US Dollar / Yen', nameEs: 'Dólar EE.UU. / Yen', category: 'fx', price: 154.25, change: 0.32, decimals: 2 },
  { id: 'gbpusd', symbol: 'GBP/USD', nameEn: 'British Pound / USD', nameEs: 'Libra Esterlina / Dólar', category: 'fx', price: 1.2982, change: -0.09, decimals: 4 },
  { id: 'audusd', symbol: 'AUD/USD', nameEn: 'Aussie / USD', nameEs: 'Dólar Australiano', category: 'fx', price: 0.6542, change: 0.21, decimals: 4 },
  { id: 'usdcad', symbol: 'USD/CAD', nameEn: 'USD / Canadian Dollar', nameEs: 'Dólar / Dólar Canadiense', category: 'fx', price: 1.3892, change: -0.15, decimals: 4 },
  { id: 'usdchf', symbol: 'USD/CHF', nameEn: 'USD / Swiss Franc', nameEs: 'Dólar / Franco Suizo', category: 'fx', price: 0.8654, change: -0.06, decimals: 4 },
  { id: 'nzdusd', symbol: 'NZD/USD', nameEn: 'Kiwi / USD', nameEs: 'Dólar Neozelandés', category: 'fx', price: 0.5984, change: 0.18, decimals: 4 },
  { id: 'eurgbp', symbol: 'EUR/GBP', nameEn: 'Euro / British Pound', nameEs: 'Euro / Libra', category: 'fx', price: 0.8354, change: 0.23, decimals: 4 },
  { id: 'gbpjpy', symbol: 'GBP/JPY', nameEn: 'British Pound / Yen', nameEs: 'Libra / Yen Japonés', category: 'fx', price: 200.25, change: 0.28, decimals: 2 },
  { id: 'dxy', symbol: 'DXY', nameEn: 'US Dollar Index', nameEs: 'Índice Dólar (DXY)', category: 'indices', price: 104.18, change: 0.16, decimals: 2 },
  { id: 'us10y', symbol: 'US 10Y', nameEn: 'US 10Y Benchmark', nameEs: 'Bono US 10 Años', category: 'rates', price: 4.24, change: -0.03, decimals: 2, suffix: '%' },
  { id: 'xauusd', symbol: 'XAU/USD', nameEn: 'Gold Spot', nameEs: 'Oro al Contado', category: 'commodities', price: 2684.50, change: 0.85, decimals: 2, prefix: '$' },
  { id: 'usoil', symbol: 'WTI CRUDE', nameEn: 'WTI Crude Oil', nameEs: 'Petróleo WTI', category: 'commodities', price: 71.45, change: -0.68, decimals: 2, prefix: '$' },
  { id: 'spx', symbol: 'S&P 500', nameEn: 'S&P 500 Index', nameEs: 'Índice S&P 500', category: 'indices', price: 5864.75, change: 0.44, decimals: 2 },
  { id: 'vix', symbol: 'VIX', nameEn: 'CBOE Volatility', nameEs: 'Índice de Volatilidad', category: 'indices', price: 14.82, change: -3.15, decimals: 2 },
  { id: 'btcusd', symbol: 'BTC/USD', nameEn: 'Bitcoin Spot', nameEs: 'Bitcoin al Contado', category: 'crypto', price: 68450.00, change: 1.82, decimals: 2, prefix: '$' },
];

export function TickerTape({ language = 'en', theme = 'dark' }: TickerTapeProps) {
  const [tickerData, setTickerData] = useState<TickerItem[]>(INITIAL_TICKER_DATA);
  const isLight = theme === 'light';

  // Live real-time tick pulse simulation (runs client-side with zero external scripts or iframes)
  useEffect(() => {
    const interval = setInterval(() => {
      setTickerData((prev) => {
        // Pick one or two random symbols to update micro-tick
        const randomIndex = Math.floor(Math.random() * prev.length);
        const item = prev[randomIndex];
        
        // Minor micro-tick volatility
        const multiplier = item.category === 'fx' ? 0.0002 : item.category === 'crypto' ? 0.002 : 0.0008;
        const tickDelta = (Math.random() - 0.49) * multiplier * item.price;
        const newPrice = Math.max(0.0001, item.price + tickDelta);
        const direction: 'up' | 'down' = tickDelta >= 0 ? 'up' : 'down';
        
        const newChangeDelta = (tickDelta / item.price) * 10;
        const newChange = Number((item.change + newChangeDelta).toFixed(2));

        return prev.map((t, idx) => {
          if (idx === randomIndex) {
            return {
              ...t,
              price: Number(newPrice.toFixed(t.decimals)),
              change: newChange,
              lastUpdateDirection: direction,
            };
          }
          return t.lastUpdateDirection ? { ...t, lastUpdateDirection: null } : t;
        });
      });
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  const renderedItems = useMemo(() => {
    return tickerData.map((item) => {
      const isPositive = item.change >= 0;
      const formattedPrice = item.price.toLocaleString('en-US', {
        minimumFractionDigits: item.decimals,
        maximumFractionDigits: item.decimals,
      });

      return (
        <div
          key={item.id}
          className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 transition-colors duration-200 select-none cursor-default group border-r ${
            isLight ? 'border-slate-200 hover:bg-slate-100/80' : 'border-zinc-800/60 hover:bg-zinc-900/60'
          } ${
            item.lastUpdateDirection === 'up'
              ? 'ticker-flash-up'
              : item.lastUpdateDirection === 'down'
              ? 'ticker-flash-down'
              : ''
          }`}
          title={`${language === 'es' ? item.nameEs : item.nameEn} • ${item.symbol}`}
        >
          {/* Symbol */}
          <span className={`font-mono text-[11px] font-bold tracking-tight ${
            isLight ? 'text-slate-800' : 'text-zinc-200'
          }`}>
            {item.symbol}
          </span>

          {/* Price */}
          <span className={`font-mono text-[11px] font-semibold tabular-nums ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}>
            {item.prefix || ''}{formattedPrice}{item.suffix || ''}
          </span>

          {/* Change */}
          <span
            className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 tabular-nums ${
              isPositive
                ? isLight
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                : isLight
                ? 'bg-rose-100 text-rose-800'
                : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
            }`}
          >
            <span>{isPositive ? '▲' : '▼'}</span>
            <span>{isPositive ? '+' : ''}{item.change.toFixed(2)}%</span>
          </span>
        </div>
      );
    });
  }, [tickerData, isLight, language]);

  return (
    <div
      className={`w-full h-[46px] flex items-center shrink-0 overflow-hidden relative z-10 border-b select-none ${
        isLight
          ? 'bg-[#f8fafc] border-slate-200/90 text-slate-800'
          : 'bg-[#040406] border-zinc-800/50 text-zinc-300'
      }`}
    >
      {/* Live Feed Institutional Badge (Fixed on Left) */}
      <div
        className={`flex items-center gap-2 px-3 h-full shrink-0 border-r z-20 font-mono text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${
          isLight
            ? 'bg-slate-100/95 border-slate-200 text-cyan-700 shadow-sm'
            : 'bg-[#06080e]/95 border-zinc-800/80 text-cyan-400 shadow-lg'
        }`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="hidden sm:inline">
          {language === 'es' ? 'MERCADO EN VIVO' : 'LIVE MARKET FEED'}
        </span>
        <span className="sm:hidden">LIVE</span>
      </div>

      {/* Infinite Smooth Scrolling Marquee Track (Double Render for Seamless Continuous Loop) */}
      <div className="relative flex-1 overflow-hidden h-full flex items-center">
        <div className="animate-marquee items-center flex whitespace-nowrap">
          {renderedItems}
          {/* Duplicate set for gapless seamless loop */}
          {renderedItems}
        </div>
      </div>
    </div>
  );
}
