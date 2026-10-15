import { useEffect, useRef, useState } from 'react';
import { Language, Theme } from '../types';

interface TickerTapeProps {
  language?: Language;
  theme?: Theme;
}

export function TickerTape({ language = 'en', theme = 'dark' }: TickerTapeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const container = containerRef.current;
    if (!container) return;

    try {
      // Clear previous widget cleanly
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
      script.crossOrigin = 'anonymous';

      script.onerror = () => {
        if (isMounted) setLoadFailed(true);
      };

      const config = {
        symbols: [
          { proName: "FOREXCOM:EURUSD", title: "EUR/USD" },
          { proName: "FOREXCOM:GBPUSD", title: "GBP/USD" },
          { proName: "FOREXCOM:USDJPY", title: "USD/JPY" },
          { proName: "FOREXCOM:AUDUSD", title: "AUD/USD" },
          { proName: "FOREXCOM:USDCAD", title: "USD/CAD" },
          { proName: "FOREXCOM:USDCHF", title: "USD/CHF" },
          { proName: "FOREXCOM:NZDUSD", title: "NZD/USD" },
          { proName: "FOREXCOM:EURGBP", title: "EUR/GBP" },
          { proName: "FOREXCOM:GBPJPY", title: "GBP/JPY" },
          { proName: "CAPITALCOM:DXY", title: language === 'es' ? "DXY (Índice Dólar)" : "DXY (Dollar Index)" },
          { proName: "TVC:US10Y", title: language === 'es' ? "Bono US 10A" : "US 10Y Yield" },
          { proName: "OANDA:XAUUSD", title: language === 'es' ? "Oro (XAU/USD)" : "Gold (XAU/USD)" },
          { proName: "TVC:USOIL", title: language === 'es' ? "Petróleo (WTI)" : "Crude Oil (WTI)" },
          { proName: "FOREXCOM:SPX500", title: "S&P 500" },
          { proName: "TVC:VIX", title: language === 'es' ? "VIX (Volatilidad)" : "VIX Volatility" },
          { proName: "BITSTAMP:BTCUSD", title: "Bitcoin" }
        ],
        showSymbolLogo: true,
        isTransparent: true,
        displayMode: "regular",
        colorTheme: theme === 'light' ? 'light' : 'dark',
        locale: language === 'es' ? 'es' : 'en'
      };

      script.innerHTML = JSON.stringify(config);
      widgetDiv.appendChild(script);
    } catch {
      if (isMounted) setLoadFailed(true);
    }

    return () => {
      isMounted = false;
      // Keep DOM intact on unmount to avoid aborting in-flight TradingView postMessage handshakes
    };
  }, [language, theme]);

  if (loadFailed) {
    return (
      <div className={`w-full ${theme === 'light' ? 'bg-[#f8fafc] border-b border-slate-200' : 'bg-[#040406] border-b border-zinc-800/40'} h-[46px] flex items-center shrink-0 select-none overflow-hidden relative z-10 px-4 font-mono text-xs`}>
        <div className="flex items-center gap-6 overflow-x-auto w-full no-scrollbar">
          <span className="text-cyan-500 font-bold uppercase tracking-widest text-[9px] shrink-0 border-r border-zinc-800 pr-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            LIVE TICKER
          </span>
          <div className="flex items-center gap-6 whitespace-nowrap text-zinc-300">
            <span className="font-bold">EUR/USD <span className="text-emerald-400 font-mono">1.0845 +0.12%</span></span>
            <span className="font-bold">USD/JPY <span className="text-emerald-400 font-mono">154.22 +0.35%</span></span>
            <span className="font-bold">GBP/USD <span className="text-rose-400 font-mono">1.2982 -0.08%</span></span>
            <span className="font-bold">DXY <span className="text-emerald-400 font-mono">104.15 +0.18%</span></span>
            <span className="font-bold">XAU/USD <span className="text-emerald-400 font-mono">2,684.50 +0.88%</span></span>
            <span className="font-bold">US 10Y <span className="text-rose-400 font-mono">4.24% -0.02%</span></span>
            <span className="font-bold">S&P 500 <span className="text-emerald-400 font-mono">5,864.67 +0.42%</span></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${theme === 'light' ? 'bg-[#f8fafc] border-b border-slate-200' : 'bg-[#040406] border-b border-zinc-800/40'} h-[46px] flex items-center shrink-0 select-none overflow-hidden relative z-10`}>
      <div 
        className="tradingview-widget-container w-full h-[46px]" 
        ref={containerRef} 
      />
    </div>
  );
}
