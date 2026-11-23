import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { ToolSubTab, Language } from '../types';
import { TRANSLATIONS } from '../locales/translations';

export const CENTRAL_BANK_URL = 'https://central-bank-tool.onrender.com/';

interface ToolEntry {
  id: ToolSubTab;
  tag: string;
  badge?: string;
  title: string;
  desc: string;
  cta: string;
  external?: boolean;
}

export function getToolCatalog(language: Language): ToolEntry[] {
  const es = language === 'es';
  const t = TRANSLATIONS[language].tools;

  return [
    {
      id: 'calendar-filter',
      tag: es ? 'Calendario & Flujos' : 'Calendar & Event Risk',
      badge: es ? 'Motor Principal' : 'Primary Engine',
      title: t.hubCard1Title,
      desc: t.hubCard1Desc,
      cta: es ? 'Abrir Calendario' : 'Launch Calendar'
    },
    {
      id: 'quant-desk',
      tag: es ? 'Mesa Cuantitativa' : 'Sentiment Definer',
      badge: es ? 'Modelo 5 Pilares' : '5-Pillar Model',
      title: es ? 'Definidor de Sentimiento de Divisas' : 'Currency Sentiment Definer',
      desc: es
        ? 'Mesa cuantitativa de cinco pilares: catalizadores de noticias, posicionamiento minorista contrario (SSI), ponderación macro, apetito por riesgo y bancos centrales.'
        : 'Quantitative multi-factor sentiment verification desk. Evaluates news catalysts, retail crowd positioning (SSI), macro multi-factor weights, risk appetite, and central bank trajectory.',
      cta: es ? 'Abrir Quant Desk' : 'Open Quant Desk'
    },
    {
      id: 'currency-strength',
      tag: es ? 'Valoración Fundamental' : 'Valuation Index',
      badge: es ? '28 Cruces G10' : '28 Cross Pairs',
      title: t.hubCard2Title,
      desc: t.hubCard2Desc,
      cta: es ? 'Explorar Fuerza' : 'View Valuation'
    },
    {
      id: 'calculator',
      tag: es ? 'Gestión de Capital' : 'Risk & Position Sizing',
      badge: es ? 'Modelo Exacto' : 'Exact Sizing',
      title: t.hubCard4Title,
      desc: t.hubCard4Desc,
      cta: es ? 'Calcular Riesgo' : 'Calculate Sizing'
    },
    {
      id: 'consensus',
      tag: es ? 'Desviación de Datos' : 'Expectations Radar',
      badge: es ? 'Beat / Miss' : 'Beat / Miss Engine',
      title: t.hubCard6Title,
      desc: t.hubCard6Desc,
      cta: es ? 'Ver Consenso' : 'Launch Radar'
    },
    {
      id: 'central-banks',
      tag: es ? 'Política Monetaria' : 'Monetary Policy',
      badge: 'G10 Central Banks',
      title: t.hubCard5Title,
      desc: t.hubCard5Desc,
      cta: es ? 'Abrir Terminal' : 'Open Terminal',
      external: true
    }
  ];
}

interface ToolGridProps {
  language: Language;
  onOpen: (tab: ToolSubTab) => void;
}

export function ToolGrid({ language, onOpen }: ToolGridProps) {
  const tools = getToolCatalog(language);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tools.map((tool) => {
        const cardClasses =
          'group macro-card p-6 flex flex-col justify-between text-left cursor-pointer h-full min-h-[240px]';

        const cardContent = (
          <>
            <div>
              {/* Card Header: Tag & Badge */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)] truncate">
                  {tool.tag}
                </span>
                {tool.badge && (
                  <span className="chip text-[10px] font-mono shrink-0">
                    {tool.badge}
                  </span>
                )}
              </div>

              {/* Title & Description */}
              <h3 className="font-sans font-semibold text-base text-[var(--ink)] group-hover:text-[#3B82F6] transition-colors tracking-tight leading-snug">
                {tool.title}
              </h3>
              <p className="mt-2.5 text-xs leading-relaxed text-[var(--ink-muted)] font-normal">
                {tool.desc}
              </p>
            </div>

            {/* Bottom Action Footer */}
            <div className="mt-6 pt-4 border-t border-[var(--line)] flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[#3B82F6] group-hover:underline">
                {tool.cta}
              </span>
              <span className="text-[#3B82F6] transition-transform group-hover:translate-x-0.5">
                {tool.external ? (
                  <ArrowUpRight size={14} />
                ) : (
                  <ArrowRight size={14} />
                )}
              </span>
            </div>
          </>
        );

        return tool.external ? (
          <a
            key={tool.id}
            href={CENTRAL_BANK_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cardClasses}
          >
            {cardContent}
          </a>
        ) : (
          <button
            key={tool.id}
            onClick={() => onOpen(tool.id)}
            className={cardClasses}
          >
            {cardContent}
          </button>
        );
      })}
    </div>
  );
}
