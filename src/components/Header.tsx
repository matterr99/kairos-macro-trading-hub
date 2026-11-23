import { useState, useEffect } from 'react';
import { Sun, Moon, Menu, X, ArrowRight } from 'lucide-react';
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

const CLOCK_ZONES = [
  { key: 'tyo', label: 'TYO', locale: 'ja-JP', timeZone: 'Asia/Tokyo' },
  { key: 'lon', label: 'LON', locale: 'en-GB', timeZone: 'Europe/London' },
  { key: 'ny', label: 'NY', locale: 'en-US', timeZone: 'America/New_York' },
  { key: 'utc', label: 'UTC', locale: 'en-GB', timeZone: 'UTC' }
] as const;

const PREDETERMINED_ZONES = new Set([
  'Asia/Tokyo',
  'Europe/London',
  'America/New_York',
  'UTC',
  'Etc/UTC',
  'GMT'
]);

export function Header({
  currentTab,
  onSelectTab,
  language,
  onToggleLanguage,
  theme,
  onToggleTheme
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clocks, setClocks] = useState<{
    tyo: string;
    lon: string;
    ny: string;
    utc: string;
    local: string | null;
    localTz: string;
  }>({
    tyo: '--:--',
    lon: '--:--',
    ny: '--:--',
    utc: '--:--',
    local: null,
    localTz: ''
  });

  const isLight = theme === 'light';
  const t = TRANSLATIONS[language];

  useEffect(() => {
    const updateTime = () => {
      const date = new Date();
      try {
        const next: Record<string, string> = {};
        for (const z of CLOCK_ZONES) {
          next[z.key] = new Intl.DateTimeFormat(z.locale, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: z.timeZone
          }).format(date);
        }

        const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        const localFormatted = new Intl.DateTimeFormat('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(date);

        const matchesPresetZone = PREDETERMINED_ZONES.has(localTz);
        const matchesPresetTime =
          localFormatted === next.tyo ||
          localFormatted === next.lon ||
          localFormatted === next.ny ||
          localFormatted === next.utc;

        setClocks({
          tyo: next.tyo,
          lon: next.lon,
          ny: next.ny,
          utc: next.utc,
          local: !matchesPresetZone && !matchesPresetTime ? localFormatted : null,
          localTz
        });
      } catch {
        // fallback
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems: { id: NavigationTab; label: string; subTab?: ToolSubTab }[] = [
    { id: 'console', label: t.nav.console },
    { id: 'tools', label: t.nav.tools },
    { id: 'research', label: t.nav.research },
    { id: 'academy', label: t.nav.academy }
  ];

  const dividerClass = isLight ? 'divide-slate-900/15' : 'divide-white/[0.08]';
  const borderClass = isLight ? 'border-slate-900/15' : 'border-white/[0.08]';

  return (
    <header
      className={`w-full sticky top-0 z-40 border-b print:hidden transition-colors duration-150 ${
        isLight
          ? 'bg-[#FFFFFF] border-slate-900/15 text-[#0B0E11]'
          : 'bg-[#0B0E11] border-white/[0.08] text-[#F0F3F6]'
      }`}
    >
      <div className={`w-full h-12 flex items-stretch justify-between divide-x ${dividerClass}`}>
        
        {/* Left Architectural Cluster: Brand Mark + Flush Navigation */}
        <div className={`flex items-stretch divide-x ${dividerClass}`}>
          <button
            onClick={() => onSelectTab('console')}
            className="px-4 sm:px-5 h-full flex items-center gap-3 text-left cursor-pointer focus:outline-none hover:bg-white/[0.02] transition-colors shrink-0"
            aria-label="Kairos Global Research"
          >
            <span
              className={`h-6 w-6 shrink-0 rounded-[2px] flex items-center justify-center font-mono font-bold text-xs tracking-tighter ${
                isLight
                  ? 'bg-[#0B0E11] text-white'
                  : 'bg-[#F0F3F6] text-[#0B0E11]'
              }`}
            >
              K
            </span>
            <span className="font-sans font-semibold tracking-[0.06em] uppercase text-xs whitespace-nowrap">
              KAIROS GLOBAL RESEARCH
            </span>
          </button>

          <nav className={`hidden lg:flex items-stretch divide-x ${dividerClass}`}>
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id, item.subTab)}
                  className={`px-5 h-full flex items-center text-[11px] font-semibold uppercase tracking-[0.08em] border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? isLight
                        ? 'border-[#0B0E11] text-[#0B0E11] bg-[#F6F7F9]'
                        : 'border-[#F0F3F6] text-[#F0F3F6] bg-[#11151B]'
                      : isLight
                      ? 'border-transparent text-[#5B6577] hover:text-[#0B0E11] hover:bg-slate-900/[0.03]'
                      : 'border-transparent text-[#8A94A6] hover:text-[#F0F3F6] hover:bg-white/[0.03]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Architectural Cluster: Session Clocks + Theme + Lang + Primary CTA */}
        <div className={`flex items-stretch divide-x ${dividerClass}`}>
          
          {/* Live Session Clocks: TYO / LON / NY / UTC (+ Local if distinct) */}
          <div
            className={`hidden xl:flex items-center gap-2.5 px-4 font-mono text-[11px] tabular-nums whitespace-nowrap ${
              isLight ? 'text-[#5B6577]' : 'text-[#8A94A6]'
            }`}
          >
            <span className="h-1.5 w-1.5 bg-[#10B981] shrink-0" aria-hidden="true" />
            <span>
              <span className="opacity-65">TYO</span>{' '}
              <strong className={isLight ? 'text-[#0B0E11] font-medium' : 'text-[#F0F3F6] font-medium'}>
                {clocks.tyo}
              </strong>
            </span>
            <span className="opacity-30">/</span>
            <span>
              <span className="opacity-65">LON</span>{' '}
              <strong className={isLight ? 'text-[#0B0E11] font-medium' : 'text-[#F0F3F6] font-medium'}>
                {clocks.lon}
              </strong>
            </span>
            <span className="opacity-30">/</span>
            <span>
              <span className="opacity-65">NY</span>{' '}
              <strong className={isLight ? 'text-[#0B0E11] font-medium' : 'text-[#F0F3F6] font-medium'}>
                {clocks.ny}
              </strong>
            </span>
            <span className="opacity-30">/</span>
            <span>
              <span className="opacity-65">UTC</span>{' '}
              <strong className="text-[#3B82F6] font-semibold">{clocks.utc}</strong>
            </span>
            {clocks.local && (
              <>
                <span className="opacity-30">/</span>
                <span title={clocks.localTz ? `Local (${clocks.localTz})` : 'Local time'}>
                  <span className="opacity-65">LOC</span>{' '}
                  <strong className={isLight ? 'text-[#0B0E11] font-medium' : 'text-[#F0F3F6] font-medium'}>
                    {clocks.local}
                  </strong>
                </span>
              </>
            )}
          </div>

          {/* Theme Toggle Cell */}
          <button
            onClick={onToggleTheme}
            className={`w-12 h-full flex items-center justify-center transition-colors cursor-pointer ${
              isLight
                ? 'text-[#5B6577] hover:text-[#0B0E11] hover:bg-slate-900/[0.04]'
                : 'text-[#8A94A6] hover:text-[#F0F3F6] hover:bg-white/[0.04]'
            }`}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Language Toggle Cell */}
          <button
            onClick={onToggleLanguage}
            className={`px-4 h-full flex items-center justify-center font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              isLight
                ? 'text-[#5B6577] hover:text-[#0B0E11] hover:bg-slate-900/[0.04]'
                : 'text-[#8A94A6] hover:text-[#F0F3F6] hover:bg-white/[0.04]'
            }`}
            title="Toggle language"
          >
            {language.toUpperCase()}
          </button>

          {/* Primary Flush Rectangular CTA -> Launch Tools */}
          <button
            onClick={() => onSelectTab('tools')}
            className={`hidden md:flex items-center gap-2 px-5 h-full rounded-none text-xs font-semibold tracking-wide transition-colors cursor-pointer whitespace-nowrap ${
              isLight
                ? 'bg-[#0B0E11] text-[#FFFFFF] hover:bg-[#1E293B]'
                : 'bg-[#FFFFFF] text-[#0B0E11] hover:bg-[#E5E7EB]'
            }`}
          >
            <span>{language === 'es' ? 'Abrir Herramientas' : 'Launch Tools'}</span>
            <ArrowRight size={13} />
          </button>

          {/* Mobile Drawer Toggle (<lg) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`lg:hidden w-12 h-full flex items-center justify-center transition-colors cursor-pointer ${
              isLight
                ? 'text-[#0B0E11] hover:bg-slate-900/[0.04]'
                : 'text-[#F0F3F6] hover:bg-white/[0.04]'
            }`}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>

      </div>

      {/* Mobile Navigation Drawer (<lg) */}
      {mobileMenuOpen && (
        <div
          className={`lg:hidden border-t ${borderClass} divide-y ${dividerClass} ${
            isLight ? 'bg-[#FFFFFF] text-[#0B0E11]' : 'bg-[#0B0E11] text-[#F0F3F6]'
          }`}
        >
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id, item.subTab);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-5 h-11 rounded-none text-xs font-semibold uppercase tracking-[0.08em] transition-colors cursor-pointer flex items-center justify-between ${
                  isActive
                    ? isLight
                      ? 'bg-[#F6F7F9] text-[#0B0E11]'
                      : 'bg-[#11151B] text-[#F0F3F6]'
                    : isLight
                    ? 'text-[#5B6577] hover:text-[#0B0E11]'
                    : 'text-[#8A94A6] hover:text-[#F0F3F6]'
                }`}
              >
                <span>{item.label}</span>
                <ArrowRight size={13} />
              </button>
            );
          })}

          <div className="p-3">
            <button
              onClick={() => {
                onSelectTab('tools');
                setMobileMenuOpen(false);
              }}
              className={`w-full h-10 rounded-[2px] flex items-center justify-center gap-2 text-xs font-semibold tracking-wide cursor-pointer transition-colors ${
                isLight
                  ? 'bg-[#0B0E11] text-[#FFFFFF] hover:bg-[#1E293B]'
                  : 'bg-[#FFFFFF] text-[#0B0E11] hover:bg-[#E5E7EB]'
              }`}
            >
              <span>{language === 'es' ? 'Abrir Herramientas' : 'Launch Tools'}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
