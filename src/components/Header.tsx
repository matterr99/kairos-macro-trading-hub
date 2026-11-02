import { useState, useEffect } from 'react';
import { NavigationTab, ToolSubTab, Language, Theme } from '../types';
import { TRANSLATIONS } from '../locales/translations';

interface HeaderProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab, subTab?: ToolSubTab) => void;
  language: Language;
  onToggleLanguage: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({
  currentTab,
  onSelectTab,
  language,
  onToggleLanguage,
  theme,
  onToggleTheme
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clocks, setClocks] = useState({
    ny: '--:--:--',
    lon: '--:--:--',
    tyo: '--:--:--',
    utc: '--:--:--'
  });

  const t = TRANSLATIONS[language];

  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      const timeOpts: Intl.DateTimeFormatOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      };

      try {
        setClocks({
          ny: new Intl.DateTimeFormat('en-US', { ...timeOpts, timeZone: 'America/New_York' }).format(date),
          lon: new Intl.DateTimeFormat('en-GB', { ...timeOpts, timeZone: 'Europe/London' }).format(date),
          tyo: new Intl.DateTimeFormat('ja-JP', { ...timeOpts, timeZone: 'Asia/Tokyo' }).format(date),
          utc: new Intl.DateTimeFormat('en-GB', { ...timeOpts, timeZone: 'UTC' }).format(date)
        });
      } catch {
        // fallback
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems: { id: NavigationTab; label: string }[] = [
    { id: 'console', label: t.nav.console },
    { id: 'research', label: t.nav.research },
    { id: 'academy', label: t.nav.academy },
    { id: 'tools', label: t.nav.tools }
  ];

  return (
    <>
      {/* Tier 1: World Clocks Bar */}
      <div className="w-full bg-[#040406] border-b border-zinc-800/40 py-1.5 px-3 sm:px-6 lg:px-8 xl:px-12 select-none">
        <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto flex items-center justify-between sm:justify-end overflow-x-auto no-scrollbar touch-scroll font-mono text-[10px] sm:text-[11px] tracking-wider uppercase">
          <div className="flex items-center gap-3.5 sm:gap-8 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-zinc-500 font-bold">NY</span>
              <span className="text-zinc-300 tabular-nums">{clocks.ny}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-zinc-500 font-bold">LON</span>
              <span className="text-zinc-300 tabular-nums">{clocks.lon}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-zinc-500 font-bold">TYO</span>
              <span className="text-zinc-300 tabular-nums">{clocks.tyo}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-cyan-500 font-bold">UTC</span>
              <span className="text-cyan-400 font-bold tabular-nums">{clocks.utc}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tier 2: Main Sticky Navigation */}
      <header className="w-full bg-[#07080c]/95 backdrop-blur-md border-b border-zinc-800/40 sticky top-0 z-40">
        <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-16 sm:h-18 flex items-center justify-between">
          
          {/* Brand Logo */}
          <button 
            onClick={() => onSelectTab('console')}
            className="flex items-center gap-2.5 sm:gap-3 group text-left cursor-pointer focus:outline-none"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 border-2 border-cyan-500 flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-cyan-500 animate-pulse"></span>
            </div>
            <div className="flex flex-col">
              <span className="font-black tracking-wider text-white uppercase leading-none text-sm sm:text-lg">
                KAIROS GLOBAL
              </span>
              <span className="font-mono text-[9px] sm:text-[10px] text-cyan-400 tracking-wider uppercase mt-0.5 sm:mt-1">
                {language === 'es' ? 'Terminal Macro' : 'Macro Terminal'}
              </span>
            </div>
          </button>

          {/* Desktop Nav Links & Controls */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            <nav className="flex items-center gap-4 lg:gap-7 font-mono text-xs tracking-wider uppercase">
              {navItems.map((item) => {
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`transition-colors py-2 relative cursor-pointer focus:outline-none ${
                      isActive
                        ? 'text-white font-bold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 w-full h-[2px] bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 lg:gap-2.5 pl-2 lg:pl-3 border-l border-zinc-800">
              {/* Theme Toggle Button (Dark / Light) */}
              <button
                onClick={onToggleTheme}
                className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider border border-zinc-700/60 bg-[#0c0d11] text-zinc-300 hover:text-white hover:border-cyan-400 transition-all cursor-pointer shadow-sm"
                title={theme === 'dark' ? (language === 'es' ? 'Cambiar a Modo Claro' : 'Switch to Light Mode') : (language === 'es' ? 'Cambiar a Modo Oscuro' : 'Switch to Dark Mode')}
              >
                <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
                <span>{theme === 'dark' ? (language === 'es' ? 'Claro' : 'Light') : (language === 'es' ? 'Oscuro' : 'Dark')}</span>
              </button>

              {/* Language Toggle Button */}
              <button
                onClick={onToggleLanguage}
                className="flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 font-mono text-xs font-bold uppercase tracking-wider border border-cyan-500/40 bg-[#0c0d11] text-cyan-300 hover:bg-cyan-950/40 hover:border-cyan-400 transition-all cursor-pointer shadow-sm"
                title={language === 'en' ? 'Cambiar a versión en Español' : 'Switch to English version'}
              >
                <span className="text-sm">🌐</span>
                <span>{t.nav.langButton}</span>
              </button>
            </div>
          </div>

          {/* Mobile Actions: Theme + Language + Toggle Menu (<768px) */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="flex items-center justify-center min-w-[42px] min-h-[42px] font-mono text-xs border border-zinc-700/60 bg-[#0c0d11] text-zinc-300 hover:text-white transition cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
            >
              <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
            </button>

            {/* Mobile Language Toggle */}
            <button
              onClick={onToggleLanguage}
              className="flex items-center gap-1 px-3 min-h-[42px] font-mono text-xs font-bold uppercase tracking-wider border border-cyan-500/40 bg-[#0c0d11] text-cyan-300 hover:bg-cyan-950/40 transition cursor-pointer"
              aria-label="Toggle language"
            >
              <span>🌐</span>
              <span>{t.nav.langCode}</span>
            </button>

            {/* Mobile Nav Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-zinc-400 hover:text-white p-2 min-w-[42px] min-h-[42px] flex items-center justify-center hover:bg-zinc-800/60 transition-colors cursor-pointer border border-zinc-800/60"
              aria-label="Toggle navigation menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-zinc-800 bg-[#07080c] shadow-2xl font-mono text-xs tracking-wider uppercase">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-6 py-4 min-h-[48px] border-b border-zinc-800/60 transition-colors cursor-pointer flex items-center justify-between ${
                  currentTab === item.id
                    ? 'bg-zinc-900/90 text-cyan-400 font-bold border-l-4 border-l-cyan-500'
                    : 'text-zinc-300 hover:bg-zinc-900/50 hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {currentTab === item.id && <span className="text-cyan-400 text-sm">&bull;</span>}
              </button>
            ))}
            
            {/* Theme & Language row inside Mobile Menu */}
            <div className="p-4 bg-[#0a0b10] border-t border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-[11px]">
                  {language === 'es' ? 'Tema / Theme:' : 'Theme / Tema:'}
                </span>
                <button
                  onClick={onToggleTheme}
                  className="px-4 py-2 min-h-[40px] border border-zinc-700 bg-zinc-800 text-white font-bold uppercase text-[11px] flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{theme === 'dark' ? '☀️' : '🌙'}</span>
                  <span>{theme === 'dark' ? (language === 'es' ? 'Modo Claro' : 'Light Mode') : (language === 'es' ? 'Modo Oscuro' : 'Dark Mode')}</span>
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-400 text-[11px]">
                  {language === 'es' ? 'Idioma / Language:' : 'Language / Idioma:'}
                </span>
                <button
                  onClick={() => {
                    onToggleLanguage();
                    setMobileMenuOpen(false);
                  }}
                  className="px-4 py-2 min-h-[40px] bg-cyan-500 text-black font-bold uppercase text-[11px] cursor-pointer"
                >
                  {t.nav.langButton}
                </button>
              </div>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
