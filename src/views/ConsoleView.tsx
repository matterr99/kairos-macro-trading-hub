import { useState } from 'react';
import { NavigationTab, ToolSubTab, ResearchArticle, Language } from '../types';
import { RESEARCH_ARTICLES } from '../data/macroData';
import { RESEARCH_ARTICLES_ES, TRANSLATIONS } from '../locales/translations';

interface ConsoleViewProps {
  onSelectTab: (tab: NavigationTab, subTab?: ToolSubTab) => void;
  onOpenArticle: (article: ResearchArticle) => void;
  language?: Language;
}

export function ConsoleView({ onSelectTab, onOpenArticle, language = 'en' }: ConsoleViewProps) {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    entity: '',
    email: '',
    sector: language === 'es' ? 'Estrategia Macro / Divisas' : 'Macro Strategy / FX',
    details: ''
  });

  const t = TRANSLATIONS[language];
  const articlesSource = language === 'es' ? RESEARCH_ARTICLES_ES : RESEARCH_ARTICLES;
  const featuredArticle = articlesSource.find((a) => a.featured) || articlesSource[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const scrollToNext = () => {
    const nextSec = document.getElementById('philosophy-section');
    if (nextSec) {
      nextSec.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full flex flex-col selection:bg-cyan-900 selection:text-cyan-100">
      
      {/* FULLSCREEN HERO SECTION (Stretches across entire screen viewport on mobile, iPad, and 4K monitors) */}
      <section className="relative w-full min-h-[calc(100vh-140px)] min-h-[calc(100svh-140px)] flex flex-col justify-between pt-8 pb-6 sm:pt-14 sm:pb-8 lg:pt-18 lg:pb-10 border-b border-zinc-800/40 bg-[#040406] overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute inset-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[350px] sm:w-[600px] lg:w-[800px] h-[350px] sm:h-[500px] bg-cyan-500/10 rounded-none blur-[140px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(24,24,27,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.3)_1px,transparent_1px)] bg-[size:32px_32px] sm:bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_65%_65%_at_50%_50%,#000_10%,transparent_100%)]" />
        </div>

        {/* Top spacing placeholder */}
        <div className="hidden sm:block"></div>

        {/* Hero Core Content - Centered in viewport */}
        <div className="relative w-full max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 z-10 my-auto py-4 sm:py-6">
          <div className="max-w-3xl 2xl:max-w-4xl space-y-4 sm:space-y-6">
            
            <div className="inline-flex items-center gap-2.5 px-3 py-1 bg-cyan-950/60 border border-cyan-500/30">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-cyan-400 font-mono font-bold text-[11px] sm:text-xs tracking-wider uppercase">
                {t.console.badge}
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl 2xl:text-8xl font-black text-white tracking-tight uppercase leading-[1.08] sm:leading-[1.05]">
              {t.console.titleLine1} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500">
                {t.console.titleLine2}
              </span>
            </h1>
            
            <p className="text-sm sm:text-base md:text-lg text-zinc-300 font-sans max-w-2xl font-light leading-relaxed">
              {t.console.subtitle}
            </p>

            {/* Action Buttons */}
            <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto font-mono text-xs sm:text-sm">
              <button
                onClick={() => onSelectTab('tools', 'calendar-filter')}
                className="w-full sm:w-auto text-center bg-cyan-500 hover:bg-cyan-400 text-black px-6 sm:px-8 py-3.5 sm:py-4 font-bold tracking-wide uppercase transition-all shadow-[0_0_28px_rgba(6,182,212,0.45),0_8px_16px_rgba(0,0,0,0.5)] hover:shadow-[0_0_40px_rgba(6,182,212,0.65),0_12px_24px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 cursor-pointer min-h-[48px] flex items-center justify-center"
              >
                {t.console.launchCalendar}
              </button>
              <button
                onClick={() => onSelectTab('tools')}
                className="w-full sm:w-auto text-center macro-card text-zinc-200 hover:text-white px-6 sm:px-8 py-3.5 sm:py-4 font-bold tracking-wide uppercase transition-all cursor-pointer min-h-[48px] flex items-center justify-center"
              >
                {t.console.allTools}
              </button>
            </div>

          </div>
        </div>

        {/* Bottom Scroll Cue Indicator */}
        <div className="relative z-10 w-full flex items-center justify-center pt-4 sm:pt-6">
          <button
            onClick={scrollToNext}
            className="group flex flex-col items-center gap-1 font-mono text-[10px] sm:text-[11px] text-zinc-400 hover:text-cyan-400 uppercase tracking-widest cursor-pointer transition-colors select-none py-2"
            aria-label="Scroll down"
          >
            <span className="opacity-80 group-hover:opacity-100 transition-opacity">
              {language === 'es' ? 'Desplázate para explorar' : 'Scroll to explore'}
            </span>
            <span className="text-cyan-400 text-sm animate-bounce group-hover:translate-y-1 transition-transform">
              ↓
            </span>
          </button>
        </div>
      </section>

      {/* SECTION 01: CORE PHILOSOPHY */}
      <section id="philosophy-section" className="w-full py-16 sm:py-24 lg:py-28 bg-[#121316] border-b border-zinc-800/40 relative px-4 sm:px-6 lg:px-8 xl:px-12">
        <div className="max-w-4xl 2xl:max-w-5xl mx-auto text-center space-y-4 sm:space-y-6">
          <h2 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-white leading-relaxed sm:leading-tight">
            {t.console.quoteTitle}
            <span className="font-semibold text-cyan-400">{t.console.quoteBold}</span>"
          </h2>
          <p className="text-xs sm:text-sm md:text-base text-zinc-300 max-w-2xl mx-auto leading-relaxed font-light">
            {t.console.quoteDesc}
          </p>
        </div>
      </section>

      {/* SECTION 02: TRADING TOOLS */}
      <section className="w-full py-16 sm:py-24 lg:py-28 bg-[#040406] border-b border-zinc-800/40 relative">
        <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-8 sm:space-y-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-800/40">
            <div>
              <span className="text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider block mb-1">
                {t.console.toolsTitleBadge}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase tracking-tight">
                {t.console.toolsTitle}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md font-sans font-light">
              {t.console.toolsSubtitle}
            </p>
          </div>

          {/* 6 Tool Squared Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-7">
            
            {/* Tool 1: CALENDAR FILTER TOOL */}
            <div
              onClick={() => onSelectTab('tools', 'calendar-filter')}
              className="group macro-card p-6 sm:p-7 cursor-pointer flex flex-col justify-between relative overflow-hidden"
            >
              <div className="space-y-3.5 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-400 font-bold uppercase">{language === 'es' ? 'Calendario Macro' : 'Macro Calendar'}</span>
                  <span className="bg-cyan-950/70 text-cyan-300 border border-cyan-700/70 px-2.5 py-0.5 text-[10px] font-bold shadow-sm">
                    {language === 'es' ? 'Motor Principal' : 'Primary Engine'}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-wide">
                  {t.tools.hubCard1Title}
                </h3>

                <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed font-light">
                  {t.tools.hubCard1Desc}
                </p>
              </div>

              <div className="mt-6 sm:mt-7 pt-4 border-t border-zinc-800/80 flex items-center justify-between font-mono text-xs text-cyan-400 font-bold">
                <span>{t.tools.hubCard1Btn}</span>
                <span className="group-hover:translate-x-1.5 transition-transform">&rarr;</span>
              </div>
            </div>

            {/* Tool 2: CURRENCY STRENGTH */}
            <div
              onClick={() => onSelectTab('tools', 'currency-strength')}
              className="group macro-card p-6 sm:p-7 cursor-pointer flex flex-col justify-between relative overflow-hidden"
            >
              <div className="space-y-3.5 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 uppercase">{language === 'es' ? 'Valoración' : 'Valuation'}</span>
                  <span className="text-cyan-400 text-[10px] font-bold">{language === 'es' ? '28 Cruces' : '28 Cross Pairs'}</span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-wide">
                  {t.tools.hubCard2Title}
                </h3>

                <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed font-light">
                  {t.tools.hubCard2Desc}
                </p>
              </div>

              <div className="mt-6 sm:mt-7 pt-4 border-t border-zinc-800/80 flex items-center justify-between font-mono text-xs text-cyan-400 font-bold">
                <span>{t.tools.hubCard2Btn}</span>
                <span className="group-hover:translate-x-1.5 transition-transform">&rarr;</span>
              </div>
            </div>

            {/* Tool 3: VOLATILITY MATRIX */}
            <div
              onClick={() => onSelectTab('tools', 'volatility')}
              className="group macro-card p-6 sm:p-7 cursor-pointer flex flex-col justify-between relative overflow-hidden"
            >
              <div className="space-y-3.5 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 uppercase">{language === 'es' ? 'Volatilidad' : 'Volatility'}</span>
                  <span className="text-zinc-500 text-[10px]">{language === 'es' ? 'Promedio 70 Días' : '70-Day Average'}</span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-wide">
                  {t.tools.hubCard3Title}
                </h3>

                <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed font-light">
                  {t.tools.hubCard3Desc}
                </p>
              </div>

              <div className="mt-6 sm:mt-7 pt-4 border-t border-zinc-800/80 flex items-center justify-between font-mono text-xs text-cyan-400 font-bold">
                <span>{t.tools.hubCard3Btn}</span>
                <span className="group-hover:translate-x-1.5 transition-transform">&rarr;</span>
              </div>
            </div>

            {/* Tool 4: RISK & POSITION SIZING */}
            <div
              onClick={() => onSelectTab('tools', 'calculator')}
              className="group macro-card p-6 sm:p-7 cursor-pointer flex flex-col justify-between relative overflow-hidden"
            >
              <div className="space-y-3.5 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-emerald-400 uppercase">{language === 'es' ? 'Gestión de Riesgo' : 'Risk Management'}</span>
                  <span className="text-zinc-500 text-[10px]">{language === 'es' ? 'Modelo Exacto' : 'Exact Sizing'}</span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors uppercase tracking-wide">
                  {t.tools.hubCard4Title}
                </h3>

                <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed font-light">
                  {t.tools.hubCard4Desc}
                </p>
              </div>

              <div className="mt-6 sm:mt-7 pt-4 border-t border-zinc-800/80 flex items-center justify-between font-mono text-xs text-emerald-400 font-bold">
                <span>{t.tools.hubCard4Btn}</span>
                <span className="group-hover:translate-x-1.5 transition-transform">&rarr;</span>
              </div>
            </div>

            {/* Tool 5: CENTRAL BANKS */}
            <a
              href="https://central-bank-tool.onrender.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="group macro-card p-6 sm:p-7 cursor-pointer flex flex-col justify-between relative overflow-hidden"
            >
              <div className="space-y-3.5 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 uppercase">{language === 'es' ? 'Política Monetaria' : 'Monetary Policy'}</span>
                  <span className="text-cyan-400 text-[10px] font-bold">G10 Banks &nearr;</span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-wide flex items-center gap-1.5">
                  <span>{t.tools.hubCard5Title}</span>
                  <span className="text-cyan-400 text-xs font-mono">&nearr;</span>
                </h3>

                <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed font-light">
                  {t.tools.hubCard5Desc}
                </p>
              </div>

              <div className="mt-6 sm:mt-7 pt-4 border-t border-zinc-800/80 flex items-center justify-between font-mono text-xs text-cyan-400 font-bold">
                <span>{t.tools.hubCard5Btn}</span>
                <span className="group-hover:translate-x-1.5 transition-transform">&rarr;</span>
              </div>
            </a>

            {/* Tool 6: CONSENSUS ENGINE */}
            <div
              onClick={() => onSelectTab('tools', 'consensus')}
              className="group macro-card p-6 sm:p-7 cursor-pointer flex flex-col justify-between relative overflow-hidden"
            >
              <div className="space-y-3.5 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 uppercase">{language === 'es' ? 'Eventos Económicos' : 'Economic Releases'}</span>
                  <span className="text-zinc-500 text-[10px]">{language === 'es' ? 'Desviación vs Consenso' : 'Beat / Miss Engine'}</span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-wide">
                  {t.tools.hubCard6Title}
                </h3>

                <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed font-light">
                  {t.tools.hubCard6Desc}
                </p>
              </div>

              <div className="mt-6 sm:mt-7 pt-4 border-t border-zinc-800/80 flex items-center justify-between font-mono text-xs text-cyan-400 font-bold">
                <span>{t.tools.hubCard6Btn}</span>
                <span className="group-hover:translate-x-1.5 transition-transform">&rarr;</span>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* SECTION 03: FEATURED RESEARCH */}
      <section className="w-full py-16 sm:py-24 lg:py-28 bg-[#121316] border-b border-zinc-800/40 relative">
        <div className="max-w-7xl 2xl:max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-8 sm:space-y-10">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-800/40">
            <div>
              <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider block mb-1">
                {t.console.featuredResearchBadge}
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase tracking-tight">
                {t.console.featuredResearchTitle}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md font-sans font-light">
              {t.console.featuredResearchSubtitle}
            </p>
          </div>

          <div
            onClick={() => onOpenArticle(featuredArticle)}
            className="group macro-card p-6 sm:p-10 lg:p-12 cursor-pointer relative overflow-hidden"
          >
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="bg-cyan-950/70 text-cyan-300 border border-cyan-700/70 px-3 py-1 text-[10px] font-bold uppercase shadow-sm">
                  {featuredArticle.category}
                </span>
                <span className="text-zinc-400 text-[11px] sm:text-xs">{featuredArticle.date}</span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-400 text-[11px] sm:text-xs">{featuredArticle.readTime}</span>
              </div>

              <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight leading-snug">
                {featuredArticle.title}
              </h3>

              <p className="text-zinc-300 font-sans text-xs sm:text-sm md:text-base leading-relaxed font-light">
                {featuredArticle.summary}
              </p>

              <div className="pt-2 sm:pt-3 flex items-center gap-2 font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider">
                <span>{t.console.openDossier}</span>
                <span className="group-hover:translate-x-2 transition-transform">&rarr;</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* SECTION 04: INSTITUTIONAL CONSULTATION FORM */}
      <section className="w-full py-16 sm:py-24 lg:py-28 bg-[#040406] border-b border-zinc-800/40 relative">
        <div className="max-w-4xl 2xl:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 space-y-8 sm:space-y-10">
          
          <div className="text-center space-y-2 pb-6 border-b border-zinc-800/40 font-mono">
            <span className="text-cyan-400 text-xs font-bold uppercase tracking-wider block">
              {t.console.consultationBadge}
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase tracking-tight">
              {t.console.consultationTitle}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-sans font-light">
              {t.console.consultationSubtitle}
            </p>
          </div>

          <div className="macro-card p-6 sm:p-10 lg:p-12">
            {submitted ? (
              <div className="text-center py-10 sm:py-14 space-y-4 font-mono">
                <div className="w-14 h-14 mx-auto bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-2xl shadow-lg">
                  ✓
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white uppercase">
                  {language === 'es' ? 'Solicitud Transmitida con Éxito' : 'Request Successfully Transmitted'}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-400 font-sans max-w-md mx-auto">
                  {language === 'es'
                    ? 'Nuestro equipo de estrategia macroeconómica revisará tu consulta institucional y responderá a la brevedad.'
                    : 'Our macroeconomic strategy desk will review your mandate requirements and respond via authenticated channels.'}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 font-mono text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                  <div className="space-y-2">
                    <label className="text-zinc-400 uppercase tracking-wider block font-semibold">
                      {t.console.fieldEntity} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.entity}
                      onChange={(e) => setFormData({ ...formData, entity: e.target.value })}
                      placeholder="e.g. Apex Sovereign Macro LLC"
                      className="w-full bg-[#10121a] border border-zinc-700/60 focus:border-cyan-500 text-white p-3.5 outline-none font-sans text-sm sm:text-xs transition-colors shadow-inner min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-zinc-400 uppercase tracking-wider block font-semibold">
                      {t.console.fieldEmail} *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="desk@institution.com"
                      className="w-full bg-[#10121a] border border-zinc-700/60 focus:border-cyan-500 text-white p-3.5 outline-none font-sans text-sm sm:text-xs transition-colors shadow-inner min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-zinc-400 uppercase tracking-wider block font-semibold">
                    {t.console.fieldSector}
                  </label>
                  <select
                    value={formData.sector}
                    onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                    className="w-full bg-[#10121a] border border-zinc-700/60 focus:border-cyan-500 text-white p-3.5 outline-none font-mono text-sm sm:text-xs cursor-pointer transition-colors shadow-inner min-h-[44px]"
                  >
                    <option>{language === 'es' ? 'Estrategia Macro / Divisas' : 'Macro Strategy / FX'}</option>
                    <option>{language === 'es' ? 'Renta Fija y Tasas Soberanas' : 'Fixed Income & Sovereign Rates'}</option>
                    <option>{language === 'es' ? 'Asignación de Fondos y Liquidez' : 'Hedge Fund & Liquidity Allocation'}</option>
                    <option>{language === 'es' ? 'Prop Trading Cuantitativo' : 'Proprietary Quantitative Trading'}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-zinc-400 uppercase tracking-wider block font-semibold">
                    {t.console.fieldDetails}
                  </label>
                  <textarea
                    rows={4}
                    value={formData.details}
                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                    placeholder={language === 'es' ? 'Describe el mandato o modelo macro de tu interés...' : 'Specify mandate focus, cross-asset coverage, or bespoke model requests...'}
                    className="w-full bg-[#10121a] border border-zinc-700/60 focus:border-cyan-500 text-white p-3.5 outline-none font-sans text-sm sm:text-xs transition-colors shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-black py-4 font-bold uppercase tracking-wider transition shadow-[0_4px_20px_rgba(6,182,212,0.4)] hover:shadow-[0_6px_28px_rgba(6,182,212,0.6)] cursor-pointer min-h-[48px] flex items-center justify-center text-xs sm:text-sm"
                >
                  {t.console.btnSubmit}
                </button>
              </form>
            )}
          </div>

        </div>
      </section>

    </div>
  );
}
