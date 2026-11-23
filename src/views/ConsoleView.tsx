import { ArrowRight } from 'lucide-react';
import { NavigationTab, ToolSubTab, ResearchArticle, Language, Theme } from '../types';
import { TRANSLATIONS } from '../locales/translations';

interface ConsoleViewProps {
  onSelectTab: (tab: NavigationTab, subTab?: ToolSubTab) => void;
  onOpenArticle?: (article: ResearchArticle) => void;
  language?: Language;
  theme?: Theme;
}

export function ConsoleView({ onSelectTab, language = 'en', theme = 'dark' }: ConsoleViewProps) {
  const isLight = theme === 'light';
  const isEs = language === 'es';
  const t = TRANSLATIONS[language];

  const borderLine = isLight ? 'border-slate-900/15' : 'border-white/[0.08]';
  const divideLine = isLight ? 'divide-slate-900/15' : 'divide-white/[0.08]';
  const surfaceBg = isLight ? 'bg-[#FFFFFF]' : 'bg-[#11151B]';
  const subtleSurfaceBg = isLight ? 'bg-[#E2E6EE]' : 'bg-[#0E1217]';
  const primaryText = isLight ? 'text-[#0B0E11]' : 'text-[#F0F3F6]';
  const mutedText = isLight ? 'text-[#4B5565]' : 'text-[#8A94A6]';

  return (
    <div className={`w-full flex flex-col ${primaryText}`}>
      
      {/* =================================================================== */}
      {/* 1. INSTITUTIONAL HERO                                               */}
      {/* =================================================================== */}
      <section className="w-full">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-12 lg:pt-16 lg:pb-14">
          <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
            <div className="space-y-5 flex flex-col items-center">
              <h1 className="font-sans font-semibold text-3xl sm:text-4xl xl:text-[46px] tracking-[-0.03em] leading-[1.08]">
                {isEs
                  ? 'Modelos Cuantitativos de Valoración FX y Política Monetaria.'
                  : 'Quantitative FX Valuation & Monetary Policy Models.'}
              </h1>

              <p className={`text-sm sm:text-[15px] leading-relaxed max-w-2xl mx-auto ${mutedText}`}>
                {isEs
                  ? 'Filtros de riesgo de eventos en tiempo real, diferenciales de tasas de bancos centrales y analítica de regímenes cruzados para mesas macro discrecionales y sistemáticas.'
                  : 'Real-time event risk filters, central bank rate differentials, and cross-asset regime analytics built for discretionary and systematic macro desks.'}
              </p>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => onSelectTab('tools', 'calendar-filter')}
                  className={`h-10 px-5 rounded-[2px] text-xs font-semibold tracking-wide inline-flex items-center gap-2 transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-[#0B0E11] text-[#FFFFFF] hover:bg-[#1E293B]'
                      : 'bg-[#FFFFFF] text-[#0B0E11] hover:bg-[#E5E7EB]'
                  }`}
                >
                  <span>{isEs ? 'Abrir Consola' : 'Launch Console'}</span>
                  <ArrowRight size={13} />
                </button>

                <button
                  onClick={() => onSelectTab('research')}
                  className={`h-10 px-5 rounded-[2px] border text-xs font-semibold tracking-wide inline-flex items-center transition-colors cursor-pointer ${
                    isLight
                      ? 'border-slate-900/20 text-[#0B0E11] bg-white hover:bg-slate-100'
                      : 'border-white/[0.16] text-[#F0F3F6] bg-transparent hover:bg-white/[0.06]'
                  }`}
                >
                  <span>{isEs ? 'Ver Documentación' : 'View Documentation'}</span>
                </button>
              </div>
            </div>

            {/* Anchored Hairline Metadata Strip */}
            <div className={`mt-10 w-full max-w-md mx-auto border-t border-b ${borderLine} grid grid-cols-2 divide-x ${divideLine}`}>
              <div className="py-3 px-4">
                <div className="font-mono tabular-nums text-lg font-semibold">8</div>
                <div className={`font-mono text-[10px] tracking-[0.1em] uppercase mt-0.5 ${mutedText}`}>
                  {isEs ? 'BANCOS G10' : 'CENTRAL BANKS'}
                </div>
              </div>
              <div className="py-3 px-4">
                <div className="font-mono tabular-nums text-lg font-semibold">28</div>
                <div className={`font-mono text-[10px] tracking-[0.1em] uppercase mt-0.5 ${mutedText}`}>
                  {isEs ? 'PARES FX' : 'FX CROSS PAIRS'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 2. CORE THESIS / MACRO MARKET MECHANICS QUOTE                       */}
      {/* =================================================================== */}
      <section className={`w-full border-t ${borderLine} ${subtleSurfaceBg}`}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center space-y-4">
            <div className="w-10 h-0.5 bg-[#3B82F6]" aria-hidden="true" />
            <div className={`font-mono text-[11px] font-semibold uppercase tracking-[0.12em] ${mutedText}`}>
              {isEs ? 'TESIS CENTRAL // MECÁNICA DE MERCADO' : 'CORE THESIS // MARKET MECHANICS'}
            </div>
            <blockquote className="font-sans font-semibold text-2xl sm:text-3xl lg:text-4xl tracking-[-0.02em] leading-[1.18]">
              {isEs
                ? '"Las operaciones no fallan por trazar mal las líneas. Las líneas no mueven los mercados financieros."'
                : '"Chart setups don\'t fail because you drew lines wrong. Lines don\'t move financial markets."'}
            </blockquote>
            <p className={`text-sm sm:text-[15px] leading-relaxed max-w-2xl mx-auto ${mutedText}`}>
              {t.console.quoteDesc}
            </p>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 3. PLATFORM CAPABILITIES ARCHITECTURAL GRID                         */}
      {/* =================================================================== */}
      <section id="capabilities-section" className={`w-full border-t ${borderLine}`}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-4">
          <div className={`font-mono text-[10px] uppercase tracking-[0.12em] ${mutedText}`}>
            {isEs ? 'MÓDULOS DEL TERMINAL' : 'TERMINAL MODULES'}
          </div>

          <div className={`border ${borderLine} ${surfaceBg} rounded-[2px] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x ${divideLine}`}>
            
            <div className="p-6 flex flex-col justify-between gap-6">
              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#3B82F6]">
                  01 // CALENDAR ENGINE
                </div>
                <h3 className="font-sans font-semibold text-base tracking-tight">
                  {isEs ? 'Filtro de Calendario' : 'Calendar & Event Risk'}
                </h3>
                <p className={`text-xs leading-relaxed ${mutedText}`}>
                  {isEs
                    ? 'Reglas Core para G10, importación de Investing.com y categorización por nivel de impacto.'
                    : 'Tier-1 G10 rules, Investing.com spreadsheet ingestion, and real-time event risk evaluation.'}
                </p>
              </div>
              <button
                onClick={() => onSelectTab('tools', 'calendar-filter')}
                className="font-mono text-[11px] font-semibold text-[#3B82F6] hover:underline inline-flex items-center gap-1.5 cursor-pointer self-start"
              >
                <span>{isEs ? 'Abrir Módulo' : 'Open Module'}</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="p-6 flex flex-col justify-between gap-6">
              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#3B82F6]">
                  02 // VALUATION INDEX
                </div>
                <h3 className="font-sans font-semibold text-base tracking-tight">
                  {isEs ? 'Fuerza de Divisas' : 'Valuation Engine'}
                </h3>
                <p className={`text-xs leading-relaxed ${mutedText}`}>
                  {isEs
                    ? 'Evaluación fundamental en 28 pares cruzados para identificar divergencias sostenibles.'
                    : 'Fundamental bias scoring across 28 cross pairs to pinpoint actionable macroeconomic divergence.'}
                </p>
              </div>
              <button
                onClick={() => onSelectTab('tools', 'currency-strength')}
                className="font-mono text-[11px] font-semibold text-[#3B82F6] hover:underline inline-flex items-center gap-1.5 cursor-pointer self-start"
              >
                <span>{isEs ? 'Abrir Módulo' : 'Open Module'}</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="p-6 flex flex-col justify-between gap-6">
              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#3B82F6]">
                  03 // QUANT DESK
                </div>
                <h3 className="font-sans font-semibold text-base tracking-tight">
                  {isEs ? 'Mesa Cuantitativa' : 'Sentiment Definer'}
                </h3>
                <p className={`text-xs leading-relaxed ${mutedText}`}>
                  {isEs
                    ? 'Modelo de 5 pilares: noticias Tier-1, posicionamiento minorista (SSI), macro, riesgo y bancos centrales.'
                    : '5-pillar sentiment verification: Tier-1 news catalysts, retail SSI, macro weights, risk appetite, and central banks.'}
                </p>
              </div>
              <button
                onClick={() => onSelectTab('tools', 'quant-desk')}
                className="font-mono text-[11px] font-semibold text-[#3B82F6] hover:underline inline-flex items-center gap-1.5 cursor-pointer self-start"
              >
                <span>{isEs ? 'Abrir Módulo' : 'Open Module'}</span>
                <ArrowRight size={12} />
              </button>
            </div>

            <div className="p-6 flex flex-col justify-between gap-6">
              <div className="space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-widest text-[#3B82F6]">
                  04 // POSITION SIZER
                </div>
                <h3 className="font-sans font-semibold text-base tracking-tight">
                  {isEs ? 'Calculadora de Riesgo' : 'Risk Sizing Engine'}
                </h3>
                <p className={`text-xs leading-relaxed ${mutedText}`}>
                  {isEs
                    ? 'Dimensionamiento exacto de lotaje basado en invalidación de tesis macro y riesgo de cuenta.'
                    : 'Exact lot sizing based on macro thesis invalidation levels and percentage account equity risk.'}
                </p>
              </div>
              <button
                onClick={() => onSelectTab('tools', 'calculator')}
                className="font-mono text-[11px] font-semibold text-[#3B82F6] hover:underline inline-flex items-center gap-1.5 cursor-pointer self-start"
              >
                <span>{isEs ? 'Abrir Módulo' : 'Open Module'}</span>
                <ArrowRight size={12} />
              </button>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
}
