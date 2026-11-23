import { ArrowRight } from 'lucide-react';
import { NavigationTab, Language, Theme } from '../types';
import { TRANSLATIONS } from '../locales/translations';

interface FooterProps {
  onSelectTab: (tab: NavigationTab) => void;
  language?: Language;
  theme?: Theme;
}

export function Footer({ onSelectTab, language = 'en', theme = 'dark' }: FooterProps) {
  const isLight = theme === 'light';
  const t = TRANSLATIONS[language];

  const borderLine = isLight ? 'border-slate-900/15' : 'border-white/[0.08]';
  const mutedText = isLight ? 'text-[#4B5565]' : 'text-[#8A94A6]';
  const linkClass = isLight
    ? 'text-[#4B5565] hover:text-[#0B0E11] transition-colors cursor-pointer text-left'
    : 'text-[#8A94A6] hover:text-[#F0F3F6] transition-colors cursor-pointer text-left';

  return (
    <footer
      className={`w-full shrink-0 mt-auto border-t transition-colors ${
        isLight
          ? 'bg-[#E2E6EE] border-slate-900/15 text-[#4B5565]'
          : 'bg-[#0B0E11] border-white/[0.08] text-[#8A94A6]'
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">

        {/* Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 sm:gap-10 text-xs">
          
          {/* Brand Column */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`h-6 w-6 rounded-[2px] flex items-center justify-center font-mono font-bold text-xs ${
                  isLight
                    ? 'bg-[#0B0E11] text-white'
                    : 'bg-[#F0F3F6] text-[#0B0E11]'
                }`}
              >
                K
              </div>
              <span
                className={`font-sans font-semibold text-xs uppercase tracking-[0.08em] ${
                  isLight ? 'text-[#0B0E11]' : 'text-[#F0F3F6]'
                }`}
              >
                KAIROS GLOBAL RESEARCH
              </span>
            </div>
            <p className={`text-xs leading-relaxed max-w-md ${mutedText}`}>
              {t.footer.brandDesc}
            </p>
          </div>

          {/* Navigation Column 1 */}
          <div className="space-y-3">
            <h3
              className={`font-mono font-semibold uppercase tracking-[0.1em] text-[11px] ${
                isLight ? 'text-[#0B0E11]' : 'text-[#F0F3F6]'
              }`}
            >
              {language === 'es' ? 'Soluciones' : 'Solutions & Tools'}
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => { onSelectTab('tools'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={linkClass}
                >
                  {language === 'es' ? 'Calendario Económico' : 'Economic Calendar'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => { onSelectTab('tools'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={linkClass}
                >
                  {language === 'es' ? 'Fuerza de Divisas' : 'Currency Strength'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => { onSelectTab('tools'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={linkClass}
                >
                  {language === 'es' ? 'Mesa Cuantitativa (Quant Desk)' : 'Quant Desk'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => { onSelectTab('tools'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={linkClass}
                >
                  {language === 'es' ? 'Calculadora de Riesgo' : 'Risk Sizing Engine'}
                </button>
              </li>
            </ul>
          </div>

          {/* Navigation Column 2 */}
          <div className="space-y-3">
            <h3
              className={`font-mono font-semibold uppercase tracking-[0.1em] text-[11px] ${
                isLight ? 'text-[#0B0E11]' : 'text-[#F0F3F6]'
              }`}
            >
              {language === 'es' ? 'Recursos & Marco' : 'Resources & Hub'}
            </h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => { onSelectTab('research'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={linkClass}
                >
                  {language === 'es' ? 'Investigación Institucional' : 'Macro Research'}
                </button>
              </li>
              <li>
                <button
                  onClick={() => { onSelectTab('academy'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={linkClass}
                >
                  {language === 'es' ? 'Academia Cuantitativa' : 'Macro Academy'}
                </button>
              </li>
              <li>
                <a
                  href="https://central-bank-tool.onrender.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${linkClass} inline-flex items-center gap-1`}
                >
                  <span>{language === 'es' ? 'Terminal Bancos Centrales' : 'Central Bank Terminal'}</span>
                  <ArrowRight size={11} className="-rotate-45" />
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div
          className={`pt-6 border-t ${borderLine} flex items-center justify-center text-[11px] font-mono ${mutedText}`}
        >
          <div className="text-center">
            © {new Date().getFullYear()} Kairos Global Research. {language === 'es' ? 'Todos los derechos reservados.' : 'All rights reserved.'}
          </div>
        </div>

      </div>
    </footer>
  );
}
