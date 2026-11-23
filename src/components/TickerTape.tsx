import { useEffect, useRef, useState } from 'react';
import { Language, Theme } from '../types';

interface TickerTapeProps {
  language?: Language;
  theme?: Theme;
}

export function TickerTape({ language = 'en', theme = 'dark' }: TickerTapeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const isLight = theme === 'light';

  useEffect(() => {
    let isMounted = true;
    const container = containerRef.current;
    if (!container) return;

    setLoadFailed(false);

    try {
      container.innerHTML = '';

      const widgetDiv = document.createElement('div');
      widgetDiv.className = 'tradingview-widget-container__widget';
      widgetDiv.style.width = '100%';
      widgetDiv.style.height = '46px';
      container.appendChild(widgetDiv);

      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
      script.type = 'text/javascript';
      script.async = true;

      script.onerror = () => {
        if (isMounted) setLoadFailed(true);
      };

      const config = {
        symbols: [
          { proName: 'FOREXCOM:EURUSD', title: 'EUR/USD' },
          { proName: 'FOREXCOM:GBPUSD', title: 'GBP/USD' },
          { proName: 'FOREXCOM:USDJPY', title: 'USD/JPY' },
          { proName: 'FOREXCOM:AUDUSD', title: 'AUD/USD' },
          { proName: 'FOREXCOM:USDCAD', title: 'USD/CAD' },
          { proName: 'FOREXCOM:USDCHF', title: 'USD/CHF' },
          { proName: 'FOREXCOM:NZDUSD', title: 'NZD/USD' },
          { proName: 'FOREXCOM:EURGBP', title: 'EUR/GBP' },
          { proName: 'FOREXCOM:GBPJPY', title: 'GBP/JPY' },
          { proName: 'CAPITALCOM:DXY', title: language === 'es' ? 'DXY (Índice Dólar)' : 'DXY' },
          { proName: 'TVC:US10Y', title: language === 'es' ? 'US 10Y' : 'US 10Y Yield' },
          { proName: 'OANDA:XAUUSD', title: 'XAU/USD' },
          { proName: 'TVC:USOIL', title: 'WTI Oil' },
          { proName: 'FOREXCOM:SPX500', title: 'S&P 500' },
          { proName: 'TVC:VIX', title: 'VIX' },
          { proName: 'BITSTAMP:BTCUSD', title: 'BTC/USD' }
        ],
        showSymbolLogo: true,
        isTransparent: false,
        displayMode: 'regular',
        colorTheme: isLight ? 'light' : 'dark',
        locale: language === 'es' ? 'es' : 'en'
      };

      script.innerHTML = JSON.stringify(config);
      widgetDiv.appendChild(script);
    } catch {
      if (isMounted) setLoadFailed(true);
    }

    return () => {
      isMounted = false;
    };
  }, [language, isLight]);

  if (loadFailed) {
    return (
      <div
        className={`w-full h-[46px] flex items-center border-b select-none overflow-hidden relative z-10 font-mono text-[11px] tabular-nums ${
          isLight
            ? 'bg-[#FFFFFF] border-slate-900/10 text-[#0B0E11]'
            : 'bg-[#131722] border-white/[0.08] text-[#F0F3F6]'
        }`}
      >
        <div
          className={`shrink-0 flex items-center gap-2 px-4 h-full border-r ${
            isLight ? 'border-slate-900/10' : 'border-white/[0.08]'
          }`}
        >
          <span className="h-1.5 w-1.5 bg-[#10B981]" />
          <span className="text-[10px] font-semibold uppercase tracking-widest">
            {language === 'es' ? 'MERCADO' : 'LIVE FEED'}
          </span>
        </div>
        <div className="flex items-center gap-6 px-4 overflow-x-auto no-scrollbar whitespace-nowrap">
          <span>EUR/USD 1.0845 <strong className="text-[#10B981]">+0.12%</strong></span>
          <span>USD/JPY 154.22 <strong className="text-[#10B981]">+0.35%</strong></span>
          <span>GBP/USD 1.2982 <strong className="text-[#EF4444]">-0.08%</strong></span>
          <span>DXY 104.15 <strong className="text-[#10B981]">+0.18%</strong></span>
          <span>XAU/USD 2,684.50 <strong className="text-[#10B981]">+0.88%</strong></span>
          <span>US 10Y 4.24% <strong className="text-[#EF4444]">-2.1bps</strong></span>
          <span>SPX 5,864.67 <strong className="text-[#10B981]">+0.42%</strong></span>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ colorScheme: isLight ? 'light' : 'dark' }}
      className={`w-full h-[46px] flex items-center border-b select-none overflow-hidden relative z-10 transition-colors ${
        isLight
          ? 'bg-[#FFFFFF] border-slate-900/10'
          : 'bg-[#131722] border-white/[0.08]'
      }`}
    >
      <div
        className="tradingview-widget-container w-full h-[46px]"
        ref={containerRef}
      />
    </div>
  );
}
